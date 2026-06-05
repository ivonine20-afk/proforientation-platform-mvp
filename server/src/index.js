import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiRouter } from "./routes/api.js";
import { initDb } from "./db/init-db.js";
import { ensureFreshSeed } from "./db/seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const clientDist = process.env.CLIENT_DIST
  ? path.resolve(process.cwd(), process.env.CLIENT_DIST)
  : path.resolve(__dirname, "../../../client/dist");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/api", apiRouter);
app.use(express.static(clientDist));

app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  await initDb();
  await ensureFreshSeed({ force: process.env.FORCE_RESEED_ON_START === "true" });

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server started on port ${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
