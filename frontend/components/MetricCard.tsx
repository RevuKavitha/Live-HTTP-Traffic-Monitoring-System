type Props = {
  label: string;
  value: string;
  helper?: string;
};

export default function MetricCard({ label, value, helper }: Props) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-card/90 p-5 shadow-soft">
      <p className="text-sm font-medium text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-400">{helper}</p> : null}
    </div>
  );
}
