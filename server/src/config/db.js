import mongoose from "mongoose";
import { env } from "./env.js";

export const connectToDatabase = async () => {
  const mongoUri = env.mongoUri;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
};

