export type RequestLog = {
  path: string;
  timestamp: string;
  status: number;
  latency_ms: number;
  method: "GET" | "POST" | string;
};

export type MetricsResponse = {
  total_requests: number;
  average_latency: number;
  success_rate: number;
  error_count: number;
  status_distribution: Record<string, number>;
  requests_over_time: Array<{ time: string; count: number }>;
};

export type LogsResponse = {
  count: number;
  logs: RequestLog[];
};

export type LiveUpdatePayload = {
  type: "traffic_update";
  metrics: MetricsResponse;
  recent_logs: RequestLog[];
};
