import { globalInsightsService } from "../services/insights/global-insights.service.js";

export const getGlobalInsights = async (_req, res, next) => {
  try {
    const insights = await globalInsightsService.getGlobalInsights();
    res.json(insights);
  } catch (error) {
    next(error);
  }
};
