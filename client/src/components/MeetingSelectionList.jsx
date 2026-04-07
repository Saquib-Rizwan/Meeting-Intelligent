import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteMeeting } from "../lib/api.js";
import { formatSentimentRating } from "../lib/display.js";

const getDateGroupLabel = (value) => {
  const parsed = value ? new Date(value) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "Undated";
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfValue = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.round((startOfToday - startOfValue) / 86400000);

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays <= 7) {
    return "This Week";
  }

  return parsed.toLocaleString(undefined, { month: "long", year: "numeric" });
};

const MeetingSelectionList = ({
  meetings,
  loading,
  error,
  selectedMeetingId,
  onRefresh,
  onSelect,
  onDeleted
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleDelete = async (event, meetingId) => {
    event.stopPropagation();

    const confirmed = window.confirm("Delete this meeting and its extracted insights?");

    if (!confirmed) {
      return;
    }

    await deleteMeeting(meetingId);
    onDeleted?.(meetingId);
  };

  const filteredMeetings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return meetings.filter((meeting) => {
      const matchesSearch =
        !normalizedSearch ||
        [meeting.title, meeting.sourceFileName, meeting._id]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      const matchesStatus =
        statusFilter === "all" ? true : String(meeting.processingStatus || "") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [meetings, searchTerm, statusFilter]);

  const groupedMeetings = useMemo(() => {
    const groups = new Map();

    filteredMeetings.forEach((meeting) => {
      const label = getDateGroupLabel(meeting.createdAt);
      const current = groups.get(label) || [];
      current.push(meeting);
      groups.set(label, current);
    });

    return [...groups.entries()];
  }, [filteredMeetings]);

  return (
    <section className="rounded-3xl border border-[var(--panel-border)] bg-white p-7 shadow-[var(--panel-shadow)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Meetings</h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
            Select one meeting and work against that meeting only.
          </p>
        </div>
        <button
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr,auto]">
        <label className="block">
          <span className="sr-only">Search meetings</span>
          <input
            className="w-full rounded-2xl border border-[#dbe2dc] bg-[#f8faf8] px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500"
            type="text"
            placeholder="Search by title, file name, or ID"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <div className="inline-flex rounded-2xl border border-[#dbe2dc] bg-[#f8faf8] p-1">
          {[
            ["all", "All"],
            ["processed", "Processed"],
            ["failed", "Failed"]
          ].map(([value, label]) => (
            <button
              key={value}
              className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                statusFilter === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
              type="button"
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-[#f8faf8] px-4 py-4">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Meetings</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{filteredMeetings.length}</div>
        </div>
        <div className="rounded-2xl bg-[#f8faf8] px-4 py-4">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Action Items</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {filteredMeetings.reduce((sum, meeting) => sum + (meeting.actionItemsCount || 0), 0)}
          </div>
        </div>
        <div className="rounded-2xl bg-[#f8faf8] px-4 py-4">
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Avg Sentiment</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {filteredMeetings.length
              ? formatSentimentRating(
                  filteredMeetings.reduce((sum, meeting) => sum + (meeting.averageSentiment || 0), 0) /
                    filteredMeetings.length
                )
              : "50/100"}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading && !meetings.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Upload a transcript to create your first meeting.
        </div>
      ) : null}

      {!loading && meetings.length && !filteredMeetings.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          No meetings match the current search or status filter.
        </div>
      ) : null}

      <div className="space-y-6">
        {groupedMeetings.map(([groupLabel, groupMeetings]) => (
          <div key={groupLabel}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                {groupLabel}
              </div>
              <div className="text-xs text-slate-400">{groupMeetings.length} meetings</div>
            </div>
            <div className="space-y-4">
              {groupMeetings.map((meeting) => {
                const selected = selectedMeetingId === meeting._id;

                return (
                  <button
                    key={meeting._id}
                    className={`w-full rounded-3xl border px-5 py-5 text-left transition-all ${
                      selected
                        ? "border-emerald-300 bg-emerald-50 shadow-[0_14px_28px_rgba(5,150,105,0.08)]"
                        : "border-[#e3e7e4] bg-[#f7f8f6] hover:border-emerald-200 hover:bg-emerald-50/50"
                    }`}
                    type="button"
                    onClick={() => onSelect(meeting._id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-base font-bold text-slate-900">{meeting.title}</div>
                        <div className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          {meeting.transcriptStats?.durationMs
                            ? `${Math.round(meeting.transcriptStats.durationMs / 60000)} min`
                            : "No duration"}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                          meeting.processingStatus === "processed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {meeting.processingStatus}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3 text-xs text-slate-600">
                      <div className="rounded-2xl bg-white/80 px-3 py-3">
                        <div className="font-bold text-slate-900">{meeting.decisionsCount || 0}</div>
                        <div className="mt-1">decisions</div>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-3">
                        <div className="font-bold text-slate-900">{meeting.actionItemsCount || 0}</div>
                        <div className="mt-1">actions</div>
                      </div>
                      <div className="rounded-2xl bg-white/80 px-3 py-3">
                        <div className="font-bold text-slate-900">{formatSentimentRating(meeting.averageSentiment || 0)}</div>
                        <div className="mt-1">sentiment</div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-200/80 pt-4">
                      <div className="min-w-0 text-xs text-slate-500">
                        <div className="uppercase tracking-[0.12em] text-slate-400">Meeting ID</div>
                        <div className="mt-1 truncate">{meeting._id}</div>
                      </div>
                      <Link
                        className="rounded-xl bg-emerald-900 px-3 py-1.5 text-xs font-bold text-white"
                        to={`/meetings/${meeting._id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Open
                      </Link>
                    </div>
                    <div className="mt-4 text-right">
                      <button
                        className="text-xs font-semibold text-rose-700 hover:underline"
                        type="button"
                        onClick={(event) => handleDelete(event, meeting._id)}
                      >
                        Delete meeting
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MeetingSelectionList;
