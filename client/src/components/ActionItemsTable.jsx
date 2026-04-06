import SectionCard from "./SectionCard.jsx";

const ActionItemsTable = ({ actionItems = [] }) => {
  return (
    <SectionCard title="Action Items" description="Owners, tasks, and deadlines from the meeting.">
      {actionItems.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                <th className="pb-3 pr-4">Who</th>
                <th className="pb-3 pr-4">What</th>
                <th className="pb-3 pr-4">Deadline</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {actionItems.map((item, index) => (
                <tr key={`${item.task}-${index}`} className="border-b border-slate-100 align-top last:border-none">
                  <td className="py-4 pr-4 text-slate-700">{item.owner || "Unassigned"}</td>
                  <td className="py-4 pr-4 text-slate-900">
                    <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">{item.task}</span>
                  </td>
                  <td className="py-4 pr-4 text-slate-700">{item.deadline || "-"}</td>
                  <td className="py-4 text-slate-700">{item.status || "open"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No action items extracted yet.</p>
      )}
    </SectionCard>
  );
};

export default ActionItemsTable;
