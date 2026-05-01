"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MetricsResponse } from "@/lib/types";

type Props = {
  metrics: MetricsResponse;
};

export default function TrafficCharts({ metrics }: Props) {
  const statusData = Object.entries(metrics.status_distribution).map(([status, count]) => ({
    status,
    count,
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-700 bg-card/90 p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-white">Requests Over Time</h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={metrics.requests_over_time}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="time" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-card/90 p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-white">Status Code Distribution</h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="status" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#34d399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
