"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import MetricCard from "@/components/MetricCard";
import RequestTable from "@/components/RequestTable";
import TrafficCharts from "@/components/TrafficCharts";
import { fetchLogs, fetchMetrics, simulateTraffic } from "@/lib/api";
import { LiveUpdatePayload, LogsResponse, MetricsResponse } from "@/lib/types";

const EMPTY_METRICS: MetricsResponse = {
  total_requests: 0,
  average_latency: 0,
  success_rate: 0,
  error_count: 0,
  status_distribution: {},
  requests_over_time: [],
};

const EMPTY_LOGS: LogsResponse = {
  count: 0,
  logs: [],
};

export default function HomePage() {
  const [metrics, setMetrics] = useState<MetricsResponse>(EMPTY_METRICS);
  const [logs, setLogs] = useState<LogsResponse>(EMPTY_LOGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<"ALL" | "GET" | "POST">("ALL");
  const [path, setPath] = useState("/portfolio-demo");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [status, setStatus] = useState(200);
  const [count, setCount] = useState(3);
  const [isSending, setIsSending] = useState(false);
  const [liveMode, setLiveMode] = useState<"websocket" | "polling">("polling");
  const wsRef = useRef<WebSocket | null>(null);

  const activeMethodFilter = useMemo(() => {
    return methodFilter === "ALL" ? undefined : methodFilter;
  }, [methodFilter]);

  const loadDashboard = useCallback(async () => {
    try {
      const [metricsData, logsData] = await Promise.all([
        fetchMetrics(activeMethodFilter),
        fetchLogs(activeMethodFilter),
      ]);

      setMetrics(metricsData);
      setLogs(logsData);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeMethodFilter]);

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard();
    }, 4000);

    return () => clearInterval(interval);
  }, [loadDashboard]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
    const wsUrl = apiBase.replace(/^http/, "ws") + "/ws";

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveMode("websocket");
      };

      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data) as LiveUpdatePayload;
        if (payload.type !== "traffic_update") return;

        if (activeMethodFilter) return;

        setMetrics(payload.metrics);
        setLogs({ count: payload.recent_logs.length, logs: payload.recent_logs });
        setLoading(false);
      };

      ws.onerror = () => {
        setLiveMode("polling");
      };

      ws.onclose = () => {
        setLiveMode("polling");
      };
    } catch {
      setLiveMode("polling");
    }

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [activeMethodFilter]);

  async function handleSimulate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSending(true);

    try {
      await simulateTraffic({
        path,
        method,
        status,
        count,
      });
      await loadDashboard();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to simulate traffic";
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-6 lg:p-10">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
            HTTP Server + Real-Time Traffic Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Live observability for request-response lifecycle, latency, and status behavior.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Live mode: <span className="font-semibold text-accent">{liveMode}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-card/70 p-2">
          {(["ALL", "GET", "POST"] as const).map((option) => (
            <button
              key={option}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                methodFilter === option
                  ? "bg-accent text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
              onClick={() => setMethodFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </header>

      <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Requests" value={String(metrics.total_requests)} />
        <MetricCard label="Avg Latency" value={`${metrics.average_latency} ms`} />
        <MetricCard label="Success Rate" value={`${metrics.success_rate}%`} />
        <MetricCard label="Error Count" value={String(metrics.error_count)} helper="HTTP 4xx + 5xx" />
      </section>

      <section className="mb-8 rounded-2xl border border-slate-700 bg-card/90 p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-white">Generate Simulated Traffic</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={handleSimulate}>
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-accent focus:ring-1"
            placeholder="Path (e.g. /api/demo)"
            value={path}
            onChange={(event) => setPath(event.target.value)}
          />

          <select
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-accent focus:ring-1"
            value={method}
            onChange={(event) => setMethod(event.target.value as "GET" | "POST")}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>

          <input
            type="number"
            min={100}
            max={599}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-accent focus:ring-1"
            value={status}
            onChange={(event) => setStatus(Number(event.target.value))}
          />

          <input
            type="number"
            min={1}
            max={100}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-accent focus:ring-1"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />

          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-slate-900 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSending}
          >
            {isSending ? "Sending..." : "Send /simulate"}
          </button>
        </form>
      </section>

      {loading ? <p className="text-slate-300">Loading dashboard...</p> : null}
      {error ? <p className="mb-6 rounded-lg bg-red-950/70 p-3 text-sm text-red-200">{error}</p> : null}

      <div className="space-y-8">
        <TrafficCharts metrics={metrics} />
        <RequestTable logs={logs.logs} />
      </div>
    </main>
  );
}
