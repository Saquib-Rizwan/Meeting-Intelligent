import { formatSpeakerLabel, formatTimeRange, formatTimeSlot } from "../lib/display.js";

const TranscriptContextInline = ({ contextDetails, citation, title = "Transcript context" }) => {
  const focus = contextDetails?.focus || null;
  const surrounding = contextDetails?.surrounding || [];

  if (!citation) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#d8e4dc] bg-[#f5f7f4] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Read the quoted moment with the nearby discussion right below.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-white bg-white px-3 py-1 font-semibold text-slate-900">
            {formatSpeakerLabel(focus?.speaker || citation.speaker, "Meeting segment")}
          </span>
          <span>{focus?.utteranceId || citation.utteranceId || "Transcript citation"}</span>
          <span>
            {formatTimeRange(
              focus?.startTimeMs ?? citation.startTimeMs,
              focus?.endTimeMs ?? citation.endTimeMs
            )}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {(surrounding.length ? surrounding : [focus]).filter(Boolean).map((utterance) => {
          const isFocus = utterance.utteranceId === focus?.utteranceId;

          return (
            <div
              key={utterance.utteranceId || `${utterance.speaker}-${utterance.startTimeMs}`}
              className={`rounded-2xl border px-4 py-3 text-sm ${
                isFocus
                  ? "border-emerald-300 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(5,150,105,0.06)]"
                  : "border-[#dde4de] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">
                  {formatSpeakerLabel(utterance.speaker, "Meeting segment")}
                </span>
                <span>{formatTimeSlot(utterance.startTimeMs)}</span>
                {isFocus ? (
                  <span className="rounded-full bg-emerald-700 px-2 py-1 font-bold uppercase tracking-[0.12em] text-white">
                    Focus
                  </span>
                ) : null}
              </div>
              <div className="mt-2 leading-6 text-slate-700">{utterance.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TranscriptContextInline;
