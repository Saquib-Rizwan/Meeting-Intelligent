import SectionCard from "./SectionCard.jsx";

const InsightsSummaryPanel = ({ meeting }) => {
  const topDecisions = (meeting?.insight?.decisions || []).slice(0, 3);
  const topActionItems = (meeting?.insight?.actionItems || []).slice(0, 3);
  const highlights = meeting?.highlights || [];

  return (
    <SectionCard title="Insights Summary" description="Top decisions, action items, and highlights.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-slate-500">Decisions</h3>
          <div className="space-y-3 text-sm text-slate-700">
            {topDecisions.length ? topDecisions.map((decision, index) => <p key={index} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-950">{decision.text}</p>) : <p className="text-slate-500">No decisions yet.</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-slate-500">Action Items</h3>
          <div className="space-y-3 text-sm text-slate-700">
            {topActionItems.length ? topActionItems.map((item, index) => <p key={index} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950">{item.task}</p>) : <p className="text-slate-500">No action items yet.</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-slate-500">Key Highlights</h3>
          <div className="space-y-3 text-sm text-slate-700">
            {highlights.length ? highlights.map((highlight, index) => <p key={index} className="rounded-xl border border-[#e1e6e2] bg-[#f3f4f2] px-3 py-3">{highlight}</p>) : <p className="text-slate-500">No highlights yet.</p>}
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default InsightsSummaryPanel;
