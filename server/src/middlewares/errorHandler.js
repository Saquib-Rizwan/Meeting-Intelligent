export const errorHandler = (error, _req, res, _next) => {
  console.error(error);

  res.status(error.statusCode || 500).json({
    error: {
      message: error.message || "Internal server error",
      details: error.details || undefined
    }
  });
};
