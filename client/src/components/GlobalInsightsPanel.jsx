import SectionCard from "./SectionCard.jsx";

const categoryStyles = {
  Topics: "border-indigo-500",
  Concerns: "border-slate-400",
  Actions: "border-indigo-300"
};

const InsightList = ({ title, items }) => {
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <div className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={`${title}-${item.label}`} className={`rounded-xl border-l-4 bg-slate-50 px-4 py-4 ${categoryStyles[title] || "border-slate-300"}`}>
              <div className="font-semibold text-slate-900">{item.label}</div>
              <div className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Appeared in {item.meetingCount} meetings
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No {title.toLowerCase()} yet.</p>
        )}
      </div>
    </div>
  );
};

const GlobalInsightsPanel = ({ insights, loading, error, onRefresh }) => {
  return (
    <SectionCard
      title="Core Themes"
      description="Cross-meeting patterns across recurring topics, concerns, and common actions."
      actions={
        <button
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <InsightList title="Topics" items={insights?.recurringTopics || []} />
        <InsightList title="Concerns" items={insights?.repeatedConcerns || []} />
        <InsightList title="Actions" items={insights?.commonActions || []} />
      </div>
    </SectionCard>
  );
};

export default GlobalInsightsPanel;
