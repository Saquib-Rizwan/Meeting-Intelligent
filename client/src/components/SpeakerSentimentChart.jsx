import SectionCard from "./SectionCard.jsx";
import {
  formatSpeakerLabel,
  formatSentimentRating,
  sentimentToRating,
  sentimentToToneLabel
} from "../lib/display.js";

const SpeakerSentimentChart = ({ speakerSentiments = [] }) => {
  const maxValue = Math.max(
    ...speakerSentiments.map((item) => Math.abs(item.averageSentiment || 0)),
    1
  );

  return (
    <SectionCard
      title="Speaker Analytics"
      description="Average tone by speaker based on the extracted transcript sentiment."
    >
      <div className="space-y-4">
        {speakerSentiments.length ? (
          speakerSentiments.map((item) => {
            const width = `${Math.max((Math.abs(item.averageSentiment || 0) / maxValue) * 100, 4)}%`;
            const barColor =
              item.averageSentiment > 0.2
                ? "bg-emerald-500"
                : item.averageSentiment < -0.2
                  ? "bg-rose-500"
                  : "bg-amber-400";

            return (
              <div key={item.speaker} className="rounded-2xl border border-[#e1e6e2] bg-[#f3f4f2] p-4">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{formatSpeakerLabel(item.speaker)}</span>
                  <span>{formatSentimentRating(item.averageSentiment || 0)} ({item.utteranceCount} utterances)</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {sentimentToToneLabel(item.averageSentiment || 0)} speaker tone
                </div>
                <div className="mt-3 h-3 rounded-full bg-white">
                  <div className={`h-3 rounded-full ${barColor}`} style={{ width }} />
                </div>
                <div className="mt-2 text-right text-xs text-slate-500">
                  Relative intensity: {sentimentToRating(item.averageSentiment || 0)}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">No speaker sentiment available yet.</p>
        )}
      </div>
    </SectionCard>
  );
};

export default SpeakerSentimentChart;
