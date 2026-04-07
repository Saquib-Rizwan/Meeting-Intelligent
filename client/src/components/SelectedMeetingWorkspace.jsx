import { Link } from "react-router-dom";

import DecisionsTable from "./DecisionsTable.jsx";
import MeetingSummaryCard from "./MeetingSummaryCard.jsx";
import ProcessSection from "./ProcessSection.jsx";
import SectionCard from "./SectionCard.jsx";

const SelectedMeetingWorkspace = ({ meeting, loading, error, onReprocessed }) => {
  if (loading) {
    return (
      <SectionCard title="Meeting Workspace" description="Loading selected meeting...">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Loading selected meeting...
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Meeting Workspace" description="There was a problem loading this meeting.">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      </SectionCard>
    );
  }

  if (!meeting) {
    return (
      <SectionCard title="Meeting Workspace" description="Choose a meeting from the list to continue.">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Select a meeting to view its summary, run processing, and ask meeting-specific questions.
        </div>
      </SectionCard>
    );
  }

  const topActions = (meeting.actionItems || meeting.insight?.actionItems || []).slice(0, 3);

  return (
    <div className="space-y-5">
      <SectionCard
        title={meeting.title}
        description="A focused workspace for the currently selected meeting."
        actions={
          <Link
            className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white"
            to={`/meetings/${meeting._id}`}
          >
            Open Full Detail
          </Link>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[#e1e6e2] bg-[#f7f8f6] px-4 py-4">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Status</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{meeting.processingStatus}</div>
          </div>
          <div className="rounded-xl border border-[#e1e6e2] bg-[#f7f8f6] px-4 py-4">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Decisions</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{meeting.metrics?.decisionsCount || 0}</div>
          </div>
          <div className="rounded-xl border border-[#e1e6e2] bg-[#f7f8f6] px-4 py-4">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Action Items</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{meeting.metrics?.actionItemsCount || 0}</div>
          </div>
          <div className="rounded-xl border border-[#e1e6e2] bg-[#f7f8f6] px-4 py-4">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Speakers</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{meeting.transcript?.speakers?.length || 0}</div>
          </div>
        </div>
      </SectionCard>

      <MeetingSummaryCard meeting={meeting} />

      <ProcessSection initialMeetingId={meeting._id} onProcessed={onReprocessed} />

      <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
        <DecisionsTable decisions={meeting.insight?.decisions || meeting.decisions || []} />
        <SectionCard title="Top Action Items" description="Most important follow-ups for this meeting.">
          {topActions.length ? (
            <div className="space-y-3">
              {topActions.map((item, index) => (
                <div key={`${item.task}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="text-sm font-semibold text-amber-950">{item.task}</div>
                  <div className="mt-2 text-xs text-amber-800">
                    Owner: {item.owner || "Unassigned"}{item.deadline ? ` | Deadline: ${item.deadline}` : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              No action items available for this meeting yet.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default SelectedMeetingWorkspace;
