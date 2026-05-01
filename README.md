# HTTP Server + Real-Time Traffic Dashboard

A portfolio-ready full-stack monitoring project that demonstrates:

- HTTP request-response lifecycle tracking with middleware
- Real-time metrics aggregation on the backend
- Live dashboard visualization with modern frontend tooling
- End-to-end backend/frontend integration

## Tech Stack

### Backend
- Python
- FastAPI
- Uvicorn

### Frontend
- Next.js (App Router)
- Tailwind CSS
- Recharts

## Project Structure

```text
project-root/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── ...
└── README.md
```

## Backend Features

- Automatic request logging via FastAPI middleware
- SQLite persistence (`backend/traffic.db`) so logs survive backend restart
- WebSocket stream endpoint (`/ws`) for near real-time dashboard updates
- Captures:
  - endpoint path
  - timestamp
  - response status
  - latency in milliseconds
  - HTTP method
- APIs:
  - `GET /logs` (supports optional `?method=GET|POST` filter)
  - `GET /metrics` (supports optional `?method=GET|POST` filter)
  - `POST /simulate` (generates synthetic traffic)
  - `DELETE /logs` (reset logs)
- CORS enabled for frontend access

## Frontend Features

- Metric cards:
  - Total Requests
  - Avg Latency
  - Success Rate
  - Error Count
- Charts:
  - Line chart: requests over time
  - Bar chart: status code distribution
- Live auto-refresh every 4 seconds
- Method filter (ALL / GET / POST)
- Traffic simulation form posting to `/simulate`
- Error-highlighted request history table

## Run Locally

## 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`.

## 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000` and calls backend at `http://localhost:8000`.

### Optional Environment Variable

Create `frontend/.env.local` if needed:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## API Examples

### Fetch metrics
```bash
curl http://localhost:8000/metrics
```

### Simulate traffic
```bash
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{"path":"/api/orders","method":"POST","status":201,"count":5}'
```

## Deployment Guidance

## Backend on Render

1. Create a new **Web Service** in Render and connect your repo.
2. Set root directory to `backend`.
3. Build command:
   ```bash
   pip install -r requirements.txt
   ```
4. Start command:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
5. Copy deployed backend URL (e.g. `https://your-api.onrender.com`).
6. Add Render environment variable for CORS:
   - `CORS_ORIGINS=https://your-frontend.vercel.app`
   - For multiple origins, use comma-separated values.

## Frontend on Vercel

1. Import your repo in Vercel.
2. Set root directory to `frontend`.
3. Add environment variable:
   - `NEXT_PUBLIC_API_BASE=https://your-api.onrender.com`
4. Deploy.

## Production Environment Variables

### Backend (`backend`)
- `CORS_ORIGINS`
  - Local dev example: `http://localhost:3000`
  - Production example: `https://your-frontend.vercel.app`
  - Multiple origins: `https://app1.vercel.app,https://app2.vercel.app`

### Frontend (`frontend`)
- `NEXT_PUBLIC_API_BASE`
  - Local dev: `http://127.0.0.1:8000`
  - Production: `https://your-api.onrender.com`

## Screenshots

Add screenshots after running locally:

- `docs/dashboard-overview.png`
- `docs/charts-live.png`
- `docs/request-table.png`

Then embed:

```md
![Dashboard Overview](docs/dashboard-overview.png)
```

## Future Improvements

- WebSocket push instead of polling
- SQLite persistence layer for long-term analytics
- Authentication + rate limiting
- Endpoint-level drill-down analytics
- Export metrics/logs as CSV

## Interview Talking Points

- Middleware design for transparent logging across all routes
- Measuring backend latency with minimal overhead
- Aggregating request health metrics (success rate/error count)
- Real-time frontend polling + visualization architecture
- Scalability path: in-memory logs -> persistent storage + stream pipeline
