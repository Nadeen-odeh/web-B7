export function requireAdmin(req, res, next) {
  const serverKey = process.env.ADMIN_KEY;

  if (!serverKey) {
    return res.status(500).json({
      error: "ADMIN_KEY is not configured on the server",
    });
  }

  const clientKey = req.headers["x-admin-key"];
  if (!clientKey || String(clientKey) !== String(serverKey)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
