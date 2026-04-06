const MetricCard = ({ label, value, tone = "default", hint = "" }) => {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-rose-700"
        : "text-slate-900";

  return (
    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-6 shadow-sm">
      <div className="text-[0.6875rem] font-extrabold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className={`mt-3 text-3xl font-bold ${toneClass}`}>{value}</div>
      {hint ? <div className="mt-2 text-xs font-medium text-slate-400">{hint}</div> : null}
    </div>
  );
};

export default MetricCard;
