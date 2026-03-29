import dotenv from "dotenv";

import app from "./app.js";
import { connectToDatabase } from "./config/db.js";

dotenv.config();

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

