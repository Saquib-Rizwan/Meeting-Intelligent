import { Router } from "express";

import chatRoutes from "./chat.routes.js";
import insightsRoutes from "./insights.routes.js";
import meetingRoutes from "./meeting.routes.js";

const router = Router();

router.use("/chat", chatRoutes);
router.use("/insights", insightsRoutes);
router.use("/meetings", meetingRoutes);

export default router;
