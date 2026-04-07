import { Link } from "react-router-dom";

import { formatSentimentRating } from "../lib/display.js";

const MeetingsOverview = ({ meetings, loading, error, onRefresh }) => {
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-white p-8 shadow-[var(--panel-shadow)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Recent Meetings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Browse recently uploaded meetings and open the full detail view.
          </p>
        </div>
        <button
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading && !meetings.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Upload and process a transcript to populate the meeting workspace.
        </div>
      ) : null}

      <div className="space-y-5">
        {meetings.map((meeting) => (
          <article key={meeting._id} className="border-b border-slate-100 pb-5 last:border-none last:pb-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{meeting.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>ID: {meeting._id}</span>
                  <span>{meeting.transcriptStats?.durationMs ? `${Math.round(meeting.transcriptStats.durationMs / 60000)}m` : "No duration"}</span>
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${meeting.processingStatus === "processed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-700"}`}>
                {meeting.processingStatus}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Transcripts</div>
                <div className="mt-1 font-semibold text-slate-900">{meeting.transcriptCount || 0}</div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Action Items</div>
                <div className="mt-1 font-semibold text-slate-900">{meeting.actionItemsCount || 0}</div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Decisions</div>
                <div className="mt-1 font-semibold text-slate-900">{meeting.decisionsCount || 0}</div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Sentiment</div>
                <div className="mt-1 font-semibold text-slate-900">{formatSentimentRating(meeting.averageSentiment || 0)}</div>
              </div>
            </div>

            {meeting.summary ? <p className="mt-4 text-sm leading-6 text-slate-600">{meeting.summary}</p> : null}

            <div className="mt-4">
              <Link className="inline-flex rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white" to={`/meetings/${meeting._id}`}>
                Open Details
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default MeetingsOverview;
