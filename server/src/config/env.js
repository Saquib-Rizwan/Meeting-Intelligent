import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || "",
  cacheTtlMs: toNumber(process.env.CACHE_TTL_MS, 5 * 60 * 1000),
  huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY || "",
  huggingFaceChatModel: process.env.HUGGINGFACE_CHAT_MODEL || "google/flan-t5-large",
  clientOrigin: process.env.CLIENT_ORIGIN || "*",
  nodeEnv: process.env.NODE_ENV || "development"
};
