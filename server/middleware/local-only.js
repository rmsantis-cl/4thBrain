// Story 9.1 — Local-only access enforcement middleware
// Ensures that sensitive endpoints (ingestion, search, dashboard, admin)
// are only reachable from localhost.

function isLocalAddress(ip) {
  // IPv4 loopback: 127.x.x.x
  // IPv6 loopback: ::1, ::ffff:127.0.0.1
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.startsWith("127.")
  );
}

function localOnlyMiddleware(req, res, next) {
  const clientIp = req.ip || req.connection.remoteAddress;
  if (!isLocalAddress(clientIp)) {
    return res.status(403).json({
      error: "Access denied. This endpoint is only available from localhost.",
    });
  }
  next();
}

module.exports = { localOnlyMiddleware, isLocalAddress };
