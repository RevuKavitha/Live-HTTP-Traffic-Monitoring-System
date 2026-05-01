import { RequestLog } from "@/lib/types";

type Props = {
  logs: RequestLog[];
};

export default function RequestTable({ logs }: Props) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-card/90 p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-white">Request History</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-700">
              <th className="px-3 py-2">Time (UTC)</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Latency</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice().reverse().slice(0, 20).map((log, index) => {
              const isError = log.status >= 400;

              return (
                <tr key={`${log.timestamp}-${index}`} className="border-b border-slate-800 text-slate-200">
                  <td className="px-3 py-2">{new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19)}</td>
                  <td className="px-3 py-2 font-semibold">{log.method}</td>
                  <td className="px-3 py-2">{log.path}</td>
                  <td className={`px-3 py-2 font-semibold ${isError ? "text-danger" : "text-success"}`}>
                    {log.status}
                  </td>
                  <td className="px-3 py-2">{log.latency_ms} ms</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
