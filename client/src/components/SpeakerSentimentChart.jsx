import SectionCard from "./SectionCard.jsx";

const SpeakerSentimentChart = ({ speakerSentiments = [] }) => {
  const maxValue = Math.max(
    ...speakerSentiments.map((item) => Math.abs(item.averageSentiment || 0)),
    1
  );

  return (
    <SectionCard
      title="Speaker Sentiment"
      description="Average sentiment score by speaker based on extracted transcript sentiment."
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
              <div key={item.speaker} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{item.speaker}</span>
                  <span>{item.averageSentiment?.toFixed(2)} ({item.utteranceCount} utterances)</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className={`h-3 rounded-full ${barColor}`} style={{ width }} />
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
