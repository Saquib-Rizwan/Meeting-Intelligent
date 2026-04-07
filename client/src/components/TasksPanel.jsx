import SectionCard from "./SectionCard.jsx";
import { formatSpeakerLabel } from "../lib/display.js";

const TasksPanel = ({ actionItems = [], onViewContext }) => {
  return (
    <SectionCard title="Tasks" description="Follow-ups pulled from this meeting.">
      {actionItems.length ? (
        <div className="space-y-3">
          {actionItems.slice(0, 6).map((item, index) => (
            <div key={`${item.task}-${index}`} className="border-b border-[#edf1ed] pb-3 last:border-none last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#edf1ed] text-[10px] font-bold text-slate-600">
                    {formatSpeakerLabel(item.owner, "NA").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-xs font-semibold text-slate-600">
                    {formatSpeakerLabel(item.owner, "Not assigned")}
                  </div>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                  {item.status || "open"}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium text-slate-900">{item.task}</div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                <span>{item.deadline || "No deadline"}</span>
                {(item.citations || []).length ? (
                  <button
                    className="font-semibold text-emerald-800 hover:underline"
                    type="button"
                    onClick={() => onViewContext?.(item.citations?.[0] || null)}
                  >
                    View below
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          No action items extracted yet.
        </div>
      )}
    </SectionCard>
  );
};

export default TasksPanel;
