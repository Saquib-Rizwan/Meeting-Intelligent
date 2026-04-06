import { Link } from "react-router-dom";

const formatSentiment = (value) => {
  if (value > 0) {
    return `+${value.toFixed(2)}`;
  }

  return value.toFixed(2);
};

const MeetingsOverview = ({ meetings, loading, error, onRefresh }) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
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

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      {!loading && !meetings.length ? (
        <p className="text-sm text-slate-500">Upload transcripts to get started.</p>
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
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${meeting.processingStatus === "processed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
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
                <div className="mt-1 font-semibold text-slate-900">{formatSentiment(meeting.averageSentiment || 0)}</div>
              </div>
            </div>

            {meeting.summary ? <p className="mt-4 text-sm leading-6 text-slate-600">{meeting.summary}</p> : null}

            <div className="mt-4">
              <Link className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" to={`/meetings/${meeting._id}`}>
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
