import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    sourceFileName: { type: String, trim: true },
    transcriptFormat: { type: String, enum: ["txt", "vtt"], required: true },
    processingStatus: {
      type: String,
      enum: ["uploaded", "parsed", "processed", "failed"],
      default: "uploaded"
    },
    transcriptRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transcript"
    },
    insightRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Insight"
    }
  },
  {
    timestamps: true
  }
);

meetingSchema.index({ title: "text", sourceFileName: "text" });

export const Meeting = mongoose.model("Meeting", meetingSchema);
