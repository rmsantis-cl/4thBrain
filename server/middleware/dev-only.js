function devOnly(req, res, next) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Not available in production" });
  }
  next();
}

module.exports = devOnly;
