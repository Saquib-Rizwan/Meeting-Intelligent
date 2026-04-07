import { Fragment } from "react";

import SectionCard from "./SectionCard.jsx";
import TranscriptContextInline from "./TranscriptContextInline.jsx";

const ActionItemsTable = ({
  actionItems = [],
  onViewContext,
  activeCitationId = null,
  contextDetails = null
}) => {
  return (
    <SectionCard title="Action Items" description="Owners, tasks, and deadlines from the meeting.">
      {actionItems.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e7e3] text-left text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                <th className="pb-3 pr-4">Who</th>
                <th className="pb-3 pr-4">What</th>
                <th className="pb-3 pr-4">Deadline</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Context</th>
              </tr>
            </thead>
            <tbody>
              {actionItems.map((item, index) => {
                const citation = item.citations?.[0] || null;
                const isActive = citation?.utteranceId && citation.utteranceId === activeCitationId;

                return (
                  <Fragment key={`${item.task}-${index}`}>
                    <tr
                      className={`align-top ${index !== actionItems.length - 1 || isActive ? "border-b border-[#edf1ed]" : ""}`}
                    >
                      <td className="py-4 pr-4 text-slate-700">{item.owner || "Unassigned"}</td>
                      <td className="py-4 pr-4 text-slate-900">
                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950">
                          {item.task}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-slate-700">{item.deadline || "-"}</td>
                      <td className="py-4 text-slate-700">
                        <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                          {item.status || "open"}
                        </span>
                      </td>
                      <td className="py-4 text-right text-slate-700">
                        {citation ? (
                          <button
                            className="text-xs font-semibold text-emerald-800 hover:underline"
                            type="button"
                            onClick={() => onViewContext?.(isActive ? null : citation)}
                          >
                            {isActive ? "Hide context" : "View context"}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                    {isActive ? (
                      <tr>
                        <td className="pb-4 pt-1" colSpan={5}>
                          <TranscriptContextInline
                            citation={citation}
                            contextDetails={contextDetails}
                            title="Action item evidence"
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
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
