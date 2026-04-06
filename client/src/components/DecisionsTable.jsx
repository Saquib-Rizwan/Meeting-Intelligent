import SectionCard from "./SectionCard.jsx";

const DecisionsTable = ({ decisions = [] }) => {
  return (
    <SectionCard title="Decisions" description="Structured decisions extracted from the meeting.">
      {decisions.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Decision</th>
                <th className="pb-3">Citations</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((decision, index) => (
                <tr key={`${decision.text}-${index}`} className="border-b border-slate-100 align-top last:border-none">
                  <td className="py-4 pr-4 text-slate-500">{index + 1}</td>
                  <td className="py-4 pr-4 text-slate-900">
                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-700">{decision.text}</span>
                  </td>
                  <td className="py-4 text-slate-500">
                    {(decision.citations || []).map((citation) => citation.utteranceId).filter(Boolean).join(", ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No decisions extracted yet.</p>
      )}
    </SectionCard>
  );
};

export default DecisionsTable;
