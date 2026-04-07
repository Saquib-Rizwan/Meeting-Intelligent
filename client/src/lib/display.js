export const formatSpeakerLabel = (speaker, fallback = "Speaker not tagged") => {
  const normalized = String(speaker || "").trim();

  if (!normalized || normalized.toLowerCase() === "unknown") {
    return fallback;
  }

  return normalized;
};

export const formatTimeSlot = (timeMs) => {
  if (timeMs == null || Number.isNaN(timeMs)) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor(timeMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const formatTimeRange = (startTimeMs, endTimeMs) => {
  const start = formatTimeSlot(startTimeMs);
  const end = formatTimeSlot(endTimeMs ?? startTimeMs);
  return `${start} - ${end}`;
};

export const sentimentToRating = (value) =>
  Math.max(1, Math.min(100, Math.round(((Number(value) || 0) + 1) * 50)));

export const sentimentToToneLabel = (value) => {
  if (value > 0.45) {
    return "Strongly Positive";
  }

  if (value > 0.15) {
    return "Positive";
  }

  if (value < -0.45) {
    return "High Concern";
  }

  if (value < -0.15) {
    return "Concerned";
  }

  return "Balanced";
};

export const formatSentimentRating = (value) => `${sentimentToRating(value)}/100`;
