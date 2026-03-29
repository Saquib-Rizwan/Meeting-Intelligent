import { Router } from "express";

import meetingRoutes from "./meeting.routes.js";

const router = Router();

router.use("/meetings", meetingRoutes);

export default router;

