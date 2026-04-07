import dotenv from "dotenv";

import app from "./app.js";
import { connectToDatabase } from "./config/db.js";
import { env } from "./config/env.js";

dotenv.config();

const startServer = async () => {
  await connectToDatabase();

  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

