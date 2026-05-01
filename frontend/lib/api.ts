import { LogsResponse, MetricsResponse } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function fetchMetrics(methodFilter?: "GET" | "POST") {
  const url = new URL(`${API_BASE}/metrics`);
  if (methodFilter) {
    url.searchParams.set("method", methodFilter);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Metrics fetch failed with status ${response.status}`);
  }

  return (await response.json()) as MetricsResponse;
}

export async function fetchLogs(methodFilter?: "GET" | "POST") {
  const url = new URL(`${API_BASE}/logs`);
  if (methodFilter) {
    url.searchParams.set("method", methodFilter);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Logs fetch failed with status ${response.status}`);
  }

  return (await response.json()) as LogsResponse;
}

export async function simulateTraffic(payload: {
  path: string;
  method: "GET" | "POST";
  status: number;
  count: number;
}) {
  const response = await fetch(`${API_BASE}/simulate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Simulate request failed with status ${response.status}`);
  }

  return response.json();
}
