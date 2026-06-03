import crypto from "node:crypto";
import express from "express";
import { dbAll, dbGet, dbRun } from "../db/db.js";
import { adminAuth } from "../middleware/adminAuth.js";

export const apiRouter = express.Router();

const profileLabels = {
  energy: "Энергетика",
  manufacturing: "Производство",
  ecology: "Экология",
  science: "Лаборатории",
  engineering: "Инженерия",
  logistics: "Логистика",
  digital: "Цифровые задачи"
};

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function addTags(profile, tags) {
  for (const [tag, value] of Object.entries(tags || {})) {
    profile[tag] = (profile[tag] || 0) + Number(value || 0);
  }
}

function topTags(profile, limit = 4) {
  return Object.entries(profile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

function getProfileTitle(profile) {
  const tags = topTags(profile, 2);
  if (tags.includes("energy")) return "Инженерно-энергетический профиль";
  if (tags.includes("manufacturing")) return "Производственно-технологический профиль";
  if (tags.includes("ecology")) return "Эколого-лабораторный профиль";
  if (tags.includes("logistics")) return "Организационно-диспетчерский профиль";
  return "Смешанный технический профиль";
}

async function getTest() {
  const test = await dbGet("SELECT * FROM global_orientation_tests WHERE is_active = 1 ORDER BY id LIMIT 1");
  if (!test) return null;

  const questions = await dbAll(
    "SELECT * FROM global_test_questions WHERE test_id = ? ORDER BY position",
    [test.id]
  );

  for (const question of questions) {
    const answers = await dbAll(
      "SELECT id, text, points, tags_json FROM global_test_answers WHERE question_id = ? ORDER BY id",
      [question.id]
    );
    question.answers = answers.map((answer) => ({
      id: answer.id,
      text: answer.text,
      points: answer.points,
      tags: parseJson(answer.tags_json, {})
    }));
  }

  return { id: test.id, title: test.title, description: test.description, questions };
}

async function getEnterprises() {
  const rows = await dbAll("SELECT * FROM enterprises ORDER BY id");
  const result = [];
  for (const row of rows) {
    const professions = await dbAll(
      "SELECT title, description, competencies_json FROM enterprise_professions WHERE enterprise_id = ? ORDER BY id",
      [row.id]
    );
    const scenario = await dbGet(
      "SELECT id, title, description FROM enterprise_game_scenarios WHERE enterprise_id = ? ORDER BY id LIMIT 1",
      [row.id]
    );
    const tasks = scenario
      ? await dbAll(
          "SELECT * FROM enterprise_game_questions WHERE scenario_id = ? ORDER BY position",
          [scenario.id]
        )
      : [];
    for (const task of tasks) {
      const answers = await dbAll(
        "SELECT id, text, points, is_preferred FROM enterprise_game_answers WHERE question_id = ? ORDER BY id",
        [task.id]
      );
      task.visual = parseJson(task.visual_json, []);
      task.answers = answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        points: answer.points,
        isPreferred: Boolean(answer.is_preferred)
      }));
    }
    result.push({
      id: row.id,
      code: row.code,
      name: row.name,
      sector: row.sector,
      city: row.city,
      description: row.description,
      reason: row.reason_template,
      tags: parseJson(row.tags_json, {}),
      professions: professions.map((profession) => ({
        title: profession.title,
        description: profession.description,
        competencies: parseJson(profession.competencies_json, [])
      })),
      scenario: scenario ? { ...scenario, tasks } : null
    });
  }
  return result;
}

function rankEnterprises(profile, enterprises) {
  return enterprises
    .map((enterprise) => {
      const totalWeight = Object.values(enterprise.tags).reduce((sum, value) => sum + Number(value), 0);
      const matchedWeight = Object.entries(enterprise.tags).reduce((sum, [tag, weight]) => {
        return sum + Math.min(profile[tag] || 0, Number(weight));
      }, 0);
      return {
        ...enterprise,
        match: totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0
      };
    })
    .sort((a, b) => b.match - a.match);
}

async function calculatePreview(answerIds) {
  const profile = {};
  if (!Array.isArray(answerIds)) return { profile, topTags: [], title: getProfileTitle(profile), enterprises: [] };

  for (const id of answerIds) {
    const answer = await dbGet("SELECT tags_json FROM global_test_answers WHERE id = ?", [id]);
    if (answer) addTags(profile, parseJson(answer.tags_json, {}));
  }

  const enterprises = rankEnterprises(profile, await getEnterprises());
  const tags = topTags(profile);
  return {
    profile,
    topTags: tags.map((tag) => ({ code: tag, label: profileLabels[tag] || tag })),
    title: getProfileTitle(profile),
    enterprises
  };
}

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.get("/bootstrap", async (_req, res, next) => {
  try {
    res.json({
      test: await getTest(),
      enterprises: await getEnterprises()
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/results/preview", async (req, res, next) => {
  try {
    const result = await calculatePreview(req.body.answerIds || []);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/results/final", async (req, res, next) => {
  try {
    const { answerIds = [], enterpriseId, scenarioAnswers = [], sessionKey } = req.body;
    const preview = await calculatePreview(answerIds);
    const enterprise = (await getEnterprises()).find((item) => item.id === Number(enterpriseId));
    const scenarioScore = scenarioAnswers.reduce((sum, answer) => sum + Number(answer.points || 0), 0);
    const key = sessionKey || crypto.randomUUID();

    let session = await dbGet("SELECT id FROM user_sessions WHERE session_key = ?", [key]);
    if (!session) {
      const inserted = await dbRun("INSERT INTO user_sessions (session_key) VALUES (?)", [key]);
      session = { id: inserted.id };
    }

    const enterpriseResult = {
      score: scenarioScore,
      answers: scenarioAnswers,
      recommendation: enterprise?.professions?.[0] || null
    };

    await dbRun(
      "INSERT INTO user_results (session_id, enterprise_id, global_profile_json, enterprise_result_json) VALUES (?, ?, ?, ?)",
      [session.id, enterprise?.id || null, JSON.stringify(preview), JSON.stringify(enterpriseResult)]
    );

    res.json({
      sessionKey: key,
      profile: preview,
      enterprise,
      enterpriseResult
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/email-results", async (req, res) => {
  res.json({
    ok: true,
    message: `Демо-отправка результата${req.body.email ? ` на ${req.body.email}` : ""}. В production подключается email-провайдер.`
  });
});

apiRouter.get("/admin/summary", adminAuth, async (_req, res, next) => {
  try {
    const [questions, enterprises, results] = await Promise.all([
      dbGet("SELECT COUNT(*) AS count FROM global_test_questions"),
      dbGet("SELECT COUNT(*) AS count FROM enterprises"),
      dbGet("SELECT COUNT(*) AS count FROM user_results")
    ]);
    res.json({
      globalTestQuestions: questions.count,
      enterprises: enterprises.count,
      userResults: results.count
    });
  } catch (error) {
    next(error);
  }
});
