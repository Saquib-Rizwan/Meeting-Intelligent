import SectionCard from "./SectionCard.jsx";

const MeetingSummaryCard = ({ meeting }) => {
  const topDecision = meeting?.decisions?.[0] || meeting?.insight?.decisions?.[0];
  const topActionItem = meeting?.actionItems?.[0] || meeting?.insight?.actionItems?.[0];
  const summaryText =
    meeting?.summary ||
    meeting?.insight?.summary ||
    "Upload and process a meeting to see a concise summary here.";

  return (
    <SectionCard
      title="Meeting Summary"
      description="A quick snapshot of the main outcome, top decision, and top action item."
    >
      <div className="space-y-5">
        <p className="rounded-2xl bg-[#f3f4f2] px-5 py-5 text-sm italic leading-7 text-slate-600">
          {summaryText}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
            <div className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-emerald-800">
              Top Decision
            </div>
            <div className="mt-2 font-semibold">{topDecision?.text || "Decision will appear after processing."}</div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <div className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-amber-700">
              Top Action Item
            </div>
            <div className="mt-2 font-semibold">{topActionItem?.task || "Action item will appear after processing."}</div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default MeetingSummaryCard;
