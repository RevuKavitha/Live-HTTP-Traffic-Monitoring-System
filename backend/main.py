from __future__ import annotations

import json
import os
import random
import sqlite3
import time
from collections import Counter
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Literal, Optional

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

DB_PATH = Path(__file__).parent / "traffic.db"


class RequestLog(BaseModel):
    path: str
    timestamp: datetime
    status: int
    latency_ms: float
    method: str


class SimulatePayload(BaseModel):
    path: str = Field(default="/demo", description="Endpoint path to log")
    method: Literal["GET", "POST"] = "GET"
    status: int = 200
    count: int = Field(default=1, ge=1, le=200)
    min_latency_ms: float = Field(default=20, ge=1)
    max_latency_ms: float = Field(default=250, ge=1)


app = FastAPI(title="HTTP Traffic Monitoring API", version="1.1.0")

cors_origins_env = os.getenv("CORS_ORIGINS", "*").strip()
if cors_origins_env == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
    if not cors_origins:
        cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logs: list[RequestLog] = []
log_lock = Lock()
clients: set[WebSocket] = set()
clients_lock = Lock()


@contextmanager
def db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    with db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS request_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status INTEGER NOT NULL,
                latency_ms REAL NOT NULL,
                method TEXT NOT NULL
            )
            """
        )
        conn.commit()


def persist_log(entry: RequestLog) -> None:
    with db_connection() as conn:
        conn.execute(
            "INSERT INTO request_logs (path, timestamp, status, latency_ms, method) VALUES (?, ?, ?, ?, ?)",
            (entry.path, entry.timestamp.isoformat(), entry.status, entry.latency_ms, entry.method),
        )
        conn.commit()


def load_logs_from_db() -> None:
    with db_connection() as conn:
        rows = conn.execute(
            "SELECT path, timestamp, status, latency_ms, method FROM request_logs ORDER BY id ASC"
        ).fetchall()

    with log_lock:
        logs.clear()
        for row in rows:
            logs.append(
                RequestLog(
                    path=row["path"],
                    timestamp=datetime.fromisoformat(row["timestamp"]),
                    status=row["status"],
                    latency_ms=row["latency_ms"],
                    method=row["method"],
                )
            )


def compute_metrics(data: list[RequestLog]) -> dict[str, Any]:
    total = len(data)
    if total == 0:
        return {
            "total_requests": 0,
            "average_latency": 0,
            "success_rate": 0,
            "error_count": 0,
            "status_distribution": {},
            "requests_over_time": [],
        }

    success = sum(1 for entry in data if 200 <= entry.status < 300)
    errors = sum(1 for entry in data if entry.status >= 400)
    avg_latency = sum(entry.latency_ms for entry in data) / total

    status_distribution = Counter(str(entry.status) for entry in data)

    timeline: dict[str, int] = {}
    for entry in data:
        minute_key = entry.timestamp.astimezone(timezone.utc).strftime("%H:%M")
        timeline[minute_key] = timeline.get(minute_key, 0) + 1

    requests_over_time = [{"time": t, "count": timeline[t]} for t in sorted(timeline.keys())]

    return {
        "total_requests": total,
        "average_latency": round(avg_latency, 2),
        "success_rate": round((success / total) * 100, 2),
        "error_count": errors,
        "status_distribution": dict(status_distribution),
        "requests_over_time": requests_over_time,
    }


async def broadcast_update() -> None:
    with log_lock:
        payload = {
            "type": "traffic_update",
            "metrics": compute_metrics(logs),
            "recent_logs": [entry.model_dump(mode="json") for entry in logs[-20:]],
        }

    message = json.dumps(payload)
    disconnected: list[WebSocket] = []

    with clients_lock:
        ws_clients = list(clients)

    for ws in ws_clients:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)

    if disconnected:
        with clients_lock:
            for ws in disconnected:
                clients.discard(ws)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    load_logs_from_db()


class TrafficLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response: Response

        try:
            response = await call_next(request)
        except Exception:
            latency_ms = (time.perf_counter() - start) * 1000
            entry = RequestLog(
                path=request.url.path,
                timestamp=datetime.now(timezone.utc),
                status=500,
                latency_ms=round(latency_ms, 2),
                method=request.method,
            )
            with log_lock:
                logs.append(entry)
            persist_log(entry)
            await broadcast_update()
            raise

        latency_ms = (time.perf_counter() - start) * 1000
        entry = RequestLog(
            path=request.url.path,
            timestamp=datetime.now(timezone.utc),
            status=response.status_code,
            latency_ms=round(latency_ms, 2),
            method=request.method,
        )
        with log_lock:
            logs.append(entry)
        persist_log(entry)
        await broadcast_update()
        return response


app.add_middleware(TrafficLoggingMiddleware)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "HTTP Traffic Monitoring API is running"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/logs")
async def get_logs(method: Optional[Literal["GET", "POST"]] = Query(default=None)) -> dict[str, Any]:
    with log_lock:
        filtered = [entry for entry in logs if method is None or entry.method == method]
        data = [entry.model_dump(mode="json") for entry in filtered]
    return {"count": len(data), "logs": data}


@app.get("/metrics")
async def get_metrics(method: Optional[Literal["GET", "POST"]] = Query(default=None)) -> dict[str, Any]:
    with log_lock:
        filtered = [entry for entry in logs if method is None or entry.method == method]
    return compute_metrics(filtered)


@app.post("/simulate")
async def simulate_traffic(payload: SimulatePayload) -> dict[str, Any]:
    if payload.min_latency_ms > payload.max_latency_ms:
        payload.min_latency_ms, payload.max_latency_ms = payload.max_latency_ms, payload.min_latency_ms

    synthetic: list[dict[str, Any]] = []
    created_entries: list[RequestLog] = []
    for _ in range(payload.count):
        latency = random.uniform(payload.min_latency_ms, payload.max_latency_ms)
        entry = RequestLog(
            path=payload.path,
            timestamp=datetime.now(timezone.utc),
            status=payload.status,
            latency_ms=round(latency, 2),
            method=payload.method,
        )
        created_entries.append(entry)

    with log_lock:
        logs.extend(created_entries)

    for entry in created_entries:
        persist_log(entry)
        synthetic.append(entry.model_dump(mode="json"))

    await broadcast_update()

    return {
        "message": "Synthetic traffic generated",
        "generated": len(synthetic),
        "entries": synthetic,
    }


@app.delete("/logs")
async def clear_logs() -> dict[str, str]:
    with log_lock:
        logs.clear()

    with db_connection() as conn:
        conn.execute("DELETE FROM request_logs")
        conn.commit()

    await broadcast_update()
    return {"message": "Logs cleared"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    with clients_lock:
        clients.add(websocket)

    with log_lock:
        initial = {
            "type": "traffic_update",
            "metrics": compute_metrics(logs),
            "recent_logs": [entry.model_dump(mode="json") for entry in logs[-20:]],
        }
    await websocket.send_text(json.dumps(initial))

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        with clients_lock:
            clients.discard(websocket)
