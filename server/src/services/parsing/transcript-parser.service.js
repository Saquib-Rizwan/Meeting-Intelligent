import { AppError } from "../../utils/app-error.js";

const timestampToMs = (timestamp) => {
  const normalized = timestamp.replace(",", ".");
  const parts = normalized.split(":").map(Number);

  if (parts.some(Number.isNaN)) {
    return undefined;
  }

  const [hours, minutes, seconds] =
    parts.length === 3 ? parts : [0, parts[0], parts[1]];

  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
};

const parseSpeakerLine = (line, fallbackId) => {
  const speakerMatch = line.match(/^([^:\]]{2,40}):\s+(.*)$/);

  if (!speakerMatch) {
    return {
      utteranceId: fallbackId,
      speaker: "Unknown",
      text: line.trim()
    };
  }

  return {
    utteranceId: fallbackId,
    speaker: speakerMatch[1].trim(),
    text: speakerMatch[2].trim()
  };
};

export const transcriptParserService = {
  parseTranscript({ transcriptFormat, transcriptText }) {
    if (!transcriptText?.trim()) {
      throw new AppError("Transcript text cannot be empty", 400);
    }

    if (transcriptFormat === "txt") {
      return this.parseTxt(transcriptText);
    }

    if (transcriptFormat === "vtt") {
      return this.parseVtt(transcriptText);
    }

    throw new AppError(`Unsupported transcript format: ${transcriptFormat}`, 400);
  },

  parseTxt(transcriptText) {
    const utterances = transcriptText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => parseSpeakerLine(line, `txt-${index + 1}`));

    return {
      utterances,
      speakers: [...new Set(utterances.map((item) => item.speaker).filter(Boolean))]
    };
  },

  parseVtt(transcriptText) {
    const lines = transcriptText.split(/\r?\n/);
    const utterances = [];

    let index = 0;
    let cueNumber = 1;

    while (index < lines.length) {
      const line = lines[index].trim();

      if (!line || line === "WEBVTT") {
        index += 1;
        continue;
      }

      if (/^\d+$/.test(line)) {
        index += 1;
      }

      const timingLine = lines[index]?.trim();

      if (!timingLine || !timingLine.includes("-->")) {
        index += 1;
        continue;
      }

      const [rawStart, rawEnd] = timingLine.split("-->").map((value) => value.trim());
      index += 1;

      const textLines = [];

      while (index < lines.length && lines[index].trim()) {
        textLines.push(lines[index].trim());
        index += 1;
      }

      const combinedText = textLines
        .join(" ")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (!combinedText) {
        continue;
      }

      const baseUtterance = parseSpeakerLine(combinedText, `vtt-${cueNumber}`);

      utterances.push({
        ...baseUtterance,
        startTimeMs: timestampToMs(rawStart.split(" ")[0]),
        endTimeMs: timestampToMs(rawEnd.split(" ")[0])
      });

      cueNumber += 1;
    }

    return {
      utterances,
      speakers: [...new Set(utterances.map((item) => item.speaker).filter(Boolean))]
    };
  }
};
