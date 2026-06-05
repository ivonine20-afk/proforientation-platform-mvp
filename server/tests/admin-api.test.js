import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "promacademy-test-"));
const dbPath = path.join(tempDir, "test.db");
const port = 3927;
const baseUrl = `http://127.0.0.1:${port}`;
const authHeader = `Basic ${Buffer.from("admin:secure-pass").toString("base64")}`;

function runNode(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        ...extraEnv
      },
      stdio: "pipe"
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("exit", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output));
    });
  });
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Server did not become healthy");
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { text };
  }
  return { response, body };
}

await runNode(["src/db/init-db.js"]);
await runNode(["src/db/seed.js"]);

const server = spawn(process.execPath, ["src/index.js"], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(port),
    DATABASE_PATH: dbPath,
    CLIENT_DIST: path.resolve(rootDir, "../client/dist"),
    OPENAI_API_KEY: ""
  },
  stdio: "pipe"
});

try {
  await waitForHealth();

  const bootstrap = await request("/api/bootstrap");
  assert.equal(bootstrap.response.status, 200);
  assert.equal(bootstrap.body.test.questions.length, 24);
  assert.equal(Object.keys(bootstrap.body.roles).length, 6);
  assert.ok(bootstrap.body.enterprises.length >= 2);

  const denied = await request("/api/admin/summary");
  assert.equal(denied.response.status, 401);

  const summary = await request("/api/admin/summary", {
    headers: { Authorization: authHeader }
  });
  assert.equal(summary.response.status, 200);
  assert.equal(summary.body.globalTestQuestions, 24);
  assert.equal(summary.body.enterprises, 2);

  const answerIds = bootstrap.body.test.questions.map((question) => question.answers[0].id);
  const preview = await request("/api/results/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answerIds })
  });
  assert.equal(preview.response.status, 200);
  assert.equal(preview.body.primaryRole.title, "Инженер-производственник");
  assert.ok(preview.body.auxiliaryRoles.length <= 2);
  assert.equal(preview.body.aiInterpretation.source, "fallback");

  const enterprise = preview.body.enterprises[0];
  const scenarioAnswers = enterprise.scenario.tasks.map((task) => task.answers[0]);
  const finalResult = await request("/api/results/final", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      answerIds,
      enterpriseId: enterprise.id,
      scenarioAnswers
    })
  });
  assert.equal(finalResult.response.status, 200);
  assert.ok(finalResult.body.enterpriseResult.certificate.id.startsWith("PA-"));
  assert.equal(finalResult.body.enterpriseResult.hrProfile.practiceReadiness, 100);
  assert.ok(finalResult.body.enterpriseResult.badges.length > 0);

  const dashboard = await request("/api/hr/dashboard", {
    headers: { Authorization: authHeader }
  });
  assert.equal(dashboard.response.status, 200);
  assert.ok(dashboard.body.items.length >= 1);
  assert.equal(dashboard.body.items[0].readinessScore, 100);

  console.log("Admin and HR API tests passed");
} finally {
  server.kill();
  await fs.rm(tempDir, { recursive: true, force: true });
}
