import { Fragment } from "react";

import SectionCard from "./SectionCard.jsx";
import TranscriptContextInline from "./TranscriptContextInline.jsx";

const DecisionsTable = ({
  decisions = [],
  onViewContext,
  activeCitationId = null,
  contextDetails = null
}) => {
  return (
    <SectionCard title="Decisions" description="Cleaned decision takeaways from the meeting.">
      {decisions.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e7e3] text-left text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Decision</th>
                <th className="pb-3 text-right">Citations</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((decision, index) => {
                const citation = decision.citations?.[0] || null;
                const isActive = citation?.utteranceId && citation.utteranceId === activeCitationId;

                return (
                  <Fragment key={`${decision.text}-${index}`}>
                    <tr
                      className={`align-top ${index !== decisions.length - 1 || isActive ? "border-b border-[#edf1ed]" : ""}`}
                    >
                      <td className="py-4 pr-4 text-slate-500">{String(index + 1).padStart(2, "0")}</td>
                      <td className="py-4 pr-4 text-slate-900">
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-950">
                          {decision.text}
                        </span>
                      </td>
                      <td className="py-4 text-right text-slate-500">
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
                        <td className="pb-4 pt-1" colSpan={3}>
                          <TranscriptContextInline
                            citation={citation}
                            contextDetails={contextDetails}
                            title="Decision evidence"
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
        <p className="text-sm text-slate-500">No decisions extracted yet.</p>
      )}
    </SectionCard>
  );
};

export default DecisionsTable;
