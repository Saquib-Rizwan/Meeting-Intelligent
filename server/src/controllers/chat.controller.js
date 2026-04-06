import { chatService } from "../services/chat-v2.service.js";
import { AppError } from "../utils/app-error.js";

export const queryChat = async (req, res, next) => {
  try {
    const question = String(req.body.question || "").trim();

    if (!question) {
      throw new AppError("question is required", 400);
    }

    const result = await chatService.answerQuestion({
      question,
      meetingId: req.body.meetingId,
      meetingIds: Array.isArray(req.body.meetingIds) ? req.body.meetingIds : undefined
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
