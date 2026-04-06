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
      title="Meeting Summary Card"
      description="A quick meeting snapshot for demos and fast review."
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
          {summaryText}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-indigo-50 px-4 py-4 text-sm text-indigo-900">
            <div className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-indigo-700">
              Top Decision
            </div>
            <div className="mt-2">{topDecision?.text || "Decision will appear after processing."}</div>
          </div>
          <div className="rounded-xl bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <div className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-amber-700">
              Top Action Item
            </div>
            <div className="mt-2">{topActionItem?.task || "Action item will appear after processing."}</div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default MeetingSummaryCard;
