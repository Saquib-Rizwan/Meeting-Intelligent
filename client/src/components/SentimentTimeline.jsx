import SectionCard from "./SectionCard.jsx";

const toneStyles = {
  positive: "bg-emerald-400",
  neutral: "bg-amber-300",
  negative: "bg-rose-400"
};

const formatRange = (segment) => {
  if (segment.startTimeMs == null && segment.endTimeMs == null) {
    return "No timestamp";
  }

  return `${segment.startTimeMs ?? 0}ms - ${segment.endTimeMs ?? segment.startTimeMs ?? 0}ms`;
};

const SentimentTimeline = ({ segments = [], selectedSegment, onSelect }) => {
  return (
    <SectionCard
      title="Sentiment Timeline"
      description="Click a segment to inspect the underlying transcript chunk and jump target."
    >
      {segments.length ? (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {segments.map((segment) => (
              <button
                key={segment.chunkId}
                className={`min-h-16 rounded-xl px-3 py-3 text-left text-sm text-slate-900 transition-transform hover:scale-[1.01] ${toneStyles[segment.tone] || toneStyles.neutral} ${selectedSegment?.chunkId === segment.chunkId ? "ring-2 ring-slate-900" : ""}`}
                type="button"
                onClick={() => onSelect(segment)}
              >
                <div className="font-semibold">{segment.speaker || "Multiple"}</div>
                <div className="mt-1 text-xs text-slate-800">{formatRange(segment)}</div>
              </button>
            ))}
          </div>

          {selectedSegment ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="mb-1 font-semibold text-slate-900">
                {selectedSegment.speaker || "Multiple speakers"}
              </div>
              <div className="mb-2 text-xs text-slate-500">{formatRange(selectedSegment)}</div>
              <div className="whitespace-pre-wrap leading-6">{selectedSegment.text}</div>
              {selectedSegment.utteranceIds?.length ? (
                <div className="mt-3 text-xs text-slate-500">
                  Jump IDs: {selectedSegment.utteranceIds.join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-500">No sentiment timeline available yet.</p>
      )}
    </SectionCard>
  );
};

export default SentimentTimeline;
