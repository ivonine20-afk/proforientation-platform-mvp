export function adminAuth(req, res, next) {
  const expectedLogin = process.env.ADMIN_LOGIN || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "secure-pass";
  const header = req.headers.authorization || "";
  const [, encoded] = header.split(" ");

  if (!encoded) {
    res.setHeader("WWW-Authenticate", "Basic realm=\"Admin\"");
    return res.status(401).json({ error: "Admin credentials required" });
  }

  const [login, password] = Buffer.from(encoded, "base64").toString("utf8").split(":");
  if (login !== expectedLogin || password !== expectedPassword) {
    return res.status(403).json({ error: "Invalid admin credentials" });
  }

  next();
}
