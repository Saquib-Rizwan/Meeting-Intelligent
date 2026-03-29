import mongoose from "mongoose";

const citationSchema = new mongoose.Schema(
  {
    utteranceId: { type: String, trim: true },
    startTimeMs: { type: Number },
    endTimeMs: { type: Number },
    speaker: { type: String, trim: true },
    snippet: { type: String, trim: true }
  },
  { _id: false }
);

const actionItemSchema = new mongoose.Schema(
  {
    owner: { type: String, trim: true },
    task: { type: String, trim: true, required: true },
    deadline: { type: String, trim: true },
    citations: [citationSchema],
    status: {
      type: String,
      enum: ["open", "done", "blocked"],
      default: "open"
    }
  },
  { _id: false }
);

const decisionSchema = new mongoose.Schema(
  {
    text: { type: String, trim: true, required: true },
    citations: [citationSchema]
  },
  { _id: false }
);

const sentimentPointSchema = new mongoose.Schema(
  {
    timestampMs: { type: Number },
    speaker: { type: String, trim: true },
    sentimentScore: { type: Number }
  },
  { _id: false }
);

const speakerSentimentSchema = new mongoose.Schema(
  {
    speaker: { type: String, trim: true, required: true },
    averageSentiment: { type: Number, default: 0 },
    utteranceCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const transcriptChunkSchema = new mongoose.Schema(
  {
    chunkId: { type: String, trim: true, required: true },
    meetingId: { type: String, trim: true, required: true },
    text: { type: String, trim: true, required: true },
    startTimeMs: { type: Number },
    endTimeMs: { type: Number },
    speaker: { type: String, trim: true },
    keywords: [{ type: String, trim: true }],
    utteranceIds: [{ type: String, trim: true }]
  },
  { _id: false }
);

const insightSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      unique: true,
      index: true
    },
    summary: { type: String, trim: true },
    decisions: [decisionSchema],
    actionItems: [actionItemSchema],
    sentimentTimeline: [sentimentPointSchema],
    speakerSentiments: [speakerSentimentSchema],
    transcriptChunks: [transcriptChunkSchema],
    metadata: {
      processingTimeMs: { type: Number, default: 0 },
      chunkCount: { type: Number, default: 0 },
      provider: { type: String, trim: true },
      fallbackUsed: { type: Boolean, default: false }
    },
    pipelineVersion: { type: String, trim: true, default: "v1" }
  },
  {
    timestamps: true
  }
);

export const Insight = mongoose.model("Insight", insightSchema);
