const MetricCard = ({ label, value, tone = "default", hint = "", progressPercent = 72 }) => {
  const toneClass =
    tone === "positive"
      ? "text-emerald-800"
      : tone === "negative"
        ? "text-rose-700"
        : "text-slate-900";

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-white p-6 shadow-[var(--panel-shadow)]">
      <div className="text-[0.65rem] font-extrabold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className={`mt-3 text-3xl font-bold tracking-tight ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-2 text-xs font-medium text-slate-400">{hint}</div> : null}
      <div className="mt-4 h-1.5 rounded-full bg-[#edf1ed]">
        <div
          className={`h-1.5 rounded-full ${tone === "negative" ? "bg-rose-400" : tone === "positive" ? "bg-emerald-700" : "bg-emerald-500"}`}
          style={{ width: `${Math.max(8, Math.min(progressPercent, 100))}%` }}
        />
      </div>
    </div>
  );
};

export default MetricCard;
