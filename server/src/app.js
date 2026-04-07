import cors from "cors";
import express from "express";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "meeting-intelligence-hub-api"
  });
});

app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

