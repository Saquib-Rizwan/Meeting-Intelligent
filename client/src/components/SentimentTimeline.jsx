import SectionCard from "./SectionCard.jsx";
import {
  formatSpeakerLabel,
  formatTimeSlot,
  formatSentimentRating,
  sentimentToToneLabel
} from "../lib/display.js";
import TranscriptContextInline from "./TranscriptContextInline.jsx";

const getToneStyles = (score) => {
  if (score > 0.2) {
    return {
      chip: "bg-emerald-100 text-emerald-900 border-emerald-200",
      bar: "from-emerald-500 to-emerald-300"
    };
  }

  if (score < -0.2) {
    return {
      chip: "bg-rose-100 text-rose-900 border-rose-200",
      bar: "from-rose-500 to-orange-300"
    };
  }

  return {
    chip: "bg-slate-100 text-slate-800 border-slate-200",
    bar: "from-slate-500 to-slate-300"
  };
};

const SentimentTimeline = ({
  segments = [],
  selectedSegment,
  onSelect,
  segmentContextDetails = null,
  segmentCitation = null
}) => {
  const validSegments = segments.filter((segment) => segment.startTimeMs != null);
  const maxEndTime = Math.max(...validSegments.map((segment) => segment.endTimeMs ?? segment.startTimeMs ?? 0), 1);

  return (
    <SectionCard
      title="Transcript Timeline"
      description="A visual read of how the discussion moved over time."
    >
      {validSegments.length ? (
        <>
          <div className="mb-6 rounded-3xl border border-[#dce4de] bg-[linear-gradient(180deg,#fafcf9_0%,#f1f5f1_100%)] p-5">
            <div className="flex items-center justify-between gap-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>Timeline graph</span>
              <span>{validSegments.length} segments</span>
            </div>
            <div className="relative mt-5 h-20">
              <div className="absolute left-0 right-0 top-10 h-px bg-[#cfd8d1]" />
              <div className="flex h-full items-center gap-3 overflow-x-auto pb-2">
                {validSegments.map((segment) => {
                  const score = segment.sentimentScore || 0;
                  const left = `${((segment.startTimeMs || 0) / maxEndTime) * 100}%`;
                  const width = `${Math.max((((segment.endTimeMs ?? segment.startTimeMs ?? 0) - (segment.startTimeMs || 0)) / maxEndTime) * 100, 8)}%`;
                  const styles = getToneStyles(score);

                  return (
                    <button
                      key={segment.chunkId}
                      className={`absolute top-1/2 min-w-[88px] -translate-y-1/2 rounded-full border px-3 py-2 text-left shadow-sm transition-all ${
                        selectedSegment?.chunkId === segment.chunkId
                          ? "z-10 scale-[1.02] border-slate-900 bg-white"
                          : "border-white/80 bg-white/90 hover:border-emerald-300"
                      }`}
                      style={{ left, width }}
                      type="button"
                      onClick={() => onSelect(segment)}
                    >
                      <div className={`h-1 rounded-full bg-gradient-to-r ${styles.bar}`} />
                      <div className="mt-2 text-[11px] font-bold text-slate-700">
                        {formatTimeSlot(segment.startTimeMs)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {validSegments.map((segment) => (
              <button
                key={segment.chunkId}
                className={`w-full rounded-3xl border px-4 py-4 text-left text-sm transition-all ${
                  selectedSegment?.chunkId === segment.chunkId
                    ? "border-emerald-700 bg-emerald-50 shadow-[0_14px_40px_rgba(16,185,129,0.12)]"
                    : "border-[#dfe5e0] bg-[#f8f8f6] hover:-translate-y-0.5 hover:border-emerald-300"
                }`}
                type="button"
                onClick={() => onSelect(segment)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    {formatTimeSlot(segment.startTimeMs)}
                  </div>
                  <div
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      getToneStyles(segment.sentimentScore || 0).chip
                    }`}
                  >
                    {sentimentToToneLabel(segment.sentimentScore || 0)}
                  </div>
                </div>
                <div className="mt-3 font-semibold text-slate-900">
                  {formatSpeakerLabel(segment.speaker, "Conversation")}
                </div>
                <div className="mt-2 max-h-24 overflow-hidden leading-6 text-slate-700">
                  {segment.text}
                </div>
              </button>
            ))}
          </div>

          {selectedSegment ? (
            <div className="mt-5 rounded-3xl border border-[#dfe5e0] bg-[#f3f4f2] p-5 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">
                    {formatSpeakerLabel(selectedSegment.speaker, "Conversation")}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatTimeSlot(selectedSegment.startTimeMs)}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Sentiment: {formatSentimentRating(selectedSegment.sentimentScore || 0)}
                </div>
              </div>
              <div className="mt-4 whitespace-pre-wrap leading-6">{selectedSegment.text}</div>
              {selectedSegment.utteranceIds?.length ? (
                <div className="mt-3 text-xs text-slate-500">
                  Jump IDs: {selectedSegment.utteranceIds.join(", ")}
                </div>
              ) : null}
              {segmentCitation ? (
                <div className="mt-4">
                  <TranscriptContextInline
                    citation={segmentCitation}
                    contextDetails={segmentContextDetails}
                    title="Flagged segment transcript"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-500">No valid timestamped transcript segments are available yet.</p>
      )}
    </SectionCard>
  );
};

export default SentimentTimeline;
