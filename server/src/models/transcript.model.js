import mongoose from "mongoose";

const utteranceSchema = new mongoose.Schema(
  {
    utteranceId: { type: String, trim: true, required: true },
    speaker: { type: String, trim: true },
    text: { type: String, trim: true, required: true },
    startTimeMs: { type: Number },
    endTimeMs: { type: Number },
    sentimentScore: { type: Number }
  },
  { _id: false }
);

const transcriptSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true
    },
    transcriptFormat: { type: String, enum: ["txt", "vtt"], required: true },
    transcriptText: { type: String, required: true },
    utterances: [utteranceSchema],
    speakers: [{ type: String, trim: true }],
    stats: {
      utteranceCount: { type: Number, default: 0 },
      speakerCount: { type: Number, default: 0 },
      durationMs: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

transcriptSchema.index({ meetingId: 1 });
transcriptSchema.index({ transcriptText: "text" });

export const Transcript = mongoose.model("Transcript", transcriptSchema);
