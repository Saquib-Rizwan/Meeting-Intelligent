import { Router } from "express";

import { getGlobalInsights } from "../controllers/insights.controller.js";

const router = Router();

router.get("/global", getGlobalInsights);

export default router;
