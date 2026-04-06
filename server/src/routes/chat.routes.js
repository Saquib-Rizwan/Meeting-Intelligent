import { Router } from "express";

import { queryChat } from "../controllers/chat.controller.js";

const router = Router();

router.post("/query", queryChat);

export default router;
