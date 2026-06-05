import crypto from "node:crypto";
import express from "express";
import OpenAI from "openai";
import { dbAll, dbGet, dbRun } from "../db/db.js";
import { adminAuth } from "../middleware/adminAuth.js";

export const apiRouter = express.Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const openAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

const roleMeta = {
  production_engineer: {
    title: "Инженер-производственник",
    competencies: ["производственное мышление", "работа со схемами", "поиск узких мест"]
  },
  quality_technologist: {
    title: "Технолог-контролер",
    competencies: ["контроль качества", "нормативы", "точность измерений"]
  },
  logistics_coordinator: {
    title: "Логист-координатор",
    competencies: ["маршрутизация", "планирование", "координация сроков"]
  },
  marketing_designer: {
    title: "Маркетолог-дизайнер",
    competencies: ["визуальная коммуникация", "презентация продукта", "клиентский взгляд"]
  },
  automation_operator: {
    title: "Оператор автоматизированных систем",
    competencies: ["dashboard-анализ", "датчики", "цифровой контроль"]
  },
  hr_safety_coach: {
    title: "Наставник по безопасности и HR",
    competencies: ["безопасность", "обучение", "командная коммуникация"]
  }
};

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function clampString(value, maxLength = 1200) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function validateAiPreview(value, fallback) {
  const source = value && typeof value === "object" ? value : {};
  const roles = new Set(Object.keys(roleMeta));
  const selectedPrimary = roles.has(source.primaryRoleCode) ? source.primaryRoleCode : fallback.primaryRole?.code;
  const auxiliaryRoleCodes = Array.isArray(source.auxiliaryRoleCodes)
    ? source.auxiliaryRoleCodes.filter((code) => roles.has(code) && code !== selectedPrimary).slice(0, 2)
    : fallback.auxiliaryRoles.map((role) => role.code).slice(0, 2);

  return {
    enabled: true,
    source: "openai",
    model: clampString(source.model || openAiModel, 80),
    confidence: Math.max(0, Math.min(100, Number(source.confidence || 0))),
    primaryRoleCode: selectedPrimary,
    auxiliaryRoleCodes,
    summary: clampString(source.summary, 700),
    strengths: Array.isArray(source.strengths) ? source.strengths.map((item) => clampString(item, 160)).filter(Boolean).slice(0, 5) : [],
    recommendedDirections: Array.isArray(source.recommendedDirections) ? source.recommendedDirections.map((item) => clampString(item, 160)).filter(Boolean).slice(0, 5) : [],
    enterpriseMatchingComment: clampString(source.enterpriseMatchingComment, 500),
    nextStep: clampString(source.nextStep, 300)
  };
}

function buildAiPrompt({ answers, roleMapping, enterprises }) {
  return [
    {
      role: "system",
      content: [
        "Ты профориентационный аналитик платформы Промакадемия.",
        "Нужно интерпретировать ответы школьника/студента и вернуть только валидный JSON.",
        "Не придумывай роли вне списка. Не добавляй markdown. Не добавляй пояснения вне JSON.",
        "Тон: понятный, поддерживающий, практичный, без медицинских или психологических диагнозов."
      ].join(" ")
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Сформируй интерпретацию результата входного профориентационного теста.",
        outputSchema: {
          model: "string",
          confidence: "number 0..100",
          primaryRoleCode: "one of allowedRoles.code",
          auxiliaryRoleCodes: "array of up to 2 allowedRoles.code",
          summary: "short student-facing result text",
          strengths: "array of 3-5 strengths",
          recommendedDirections: "array of 3-5 professional directions",
          enterpriseMatchingComment: "why these enterprises should be shown",
          nextStep: "what to do next on the platform"
        },
        allowedRoles: Object.entries(roleMeta).map(([code, meta]) => ({ code, title: meta.title, competencies: meta.competencies })),
        deterministicMapping: {
          primaryRole: roleMapping.primaryRole,
          auxiliaryRoles: roleMapping.auxiliaryRoles,
          roleScores: roleMapping.roleScores
        },
        selectedAnswers: answers,
        availableEnterprises: enterprises.map((enterprise) => ({
          code: enterprise.code,
          name: enterprise.name,
          sector: enterprise.sector,
          match: enterprise.match,
          tags: enterprise.tags
        }))
      })
    }
  ];
}

async function getSelectedAnswerContext(answerIds) {
  if (!Array.isArray(answerIds) || answerIds.length === 0) return [];
  const result = [];
  for (const id of answerIds) {
    const row = await dbGet(
      `SELECT gq.position, gq.text AS question, gta.text AS answer, gta.points, gta.tags_json
       FROM global_test_answers gta
       JOIN global_test_questions gq ON gq.id = gta.question_id
       WHERE gta.id = ?`,
      [id]
    );
    if (row) {
      result.push({
        position: row.position,
        question: row.question,
        answer: row.answer,
        points: row.points,
        tags: parseJson(row.tags_json, {})
      });
    }
  }
  return result.sort((a, b) => a.position - b.position);
}

async function getAiPreviewInterpretation({ answerIds, roleMapping, enterprises }) {
  if (!openai) return { enabled: false, source: "fallback", reason: "OPENAI_API_KEY is not configured" };
  try {
    const answers = await getSelectedAnswerContext(answerIds);
    const response = await openai.chat.completions.create({
      model: openAiModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: buildAiPrompt({ answers, roleMapping, enterprises })
    });
    const parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    return validateAiPreview({ ...parsed, model: response.model || openAiModel }, roleMapping);
  } catch (error) {
    return {
      enabled: false,
      source: "fallback",
      reason: "AI preview failed validation or request",
      message: error?.message || "unknown error"
    };
  }
}

function addTags(profile, tags) {
  for (const [tag, value] of Object.entries(tags || {})) {
    profile[tag] = (profile[tag] || 0) + Number(value || 0);
  }
}

function roleScores(profile) {
  return Object.entries(roleMeta)
    .map(([code, meta]) => ({
      code,
      title: meta.title,
      score: Number(profile[code] || 0),
      competencies: meta.competencies
    }))
    .sort((a, b) => b.score - a.score);
}

function assignRoles(profile) {
  const scores = roleScores(profile);
  const maxScore = Math.max(1, scores[0]?.score || 1);
  const normalized = scores.map((role) => ({
    ...role,
    percent: Math.round((role.score / maxScore) * 100)
  }));

  return {
    primaryRole: normalized[0],
    auxiliaryRoles: normalized.slice(1, 3).filter((role) => role.score > 0),
    roleScores: normalized,
    mappedAt: new Date().toISOString()
  };
}

function getReadinessLevel(score) {
  if (score >= 85) return "Готов к практике";
  if (score >= 65) return "Готов после короткой подготовки";
  if (score >= 45) return "Нужна вводная стажировка";
  return "Рекомендуется пройти базовый трек";
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
    question.visualType = question.hint?.match(/тип[а-я ]+«(.+)»/i)?.[1] || "визуальный выбор";
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
      ? await dbAll("SELECT * FROM enterprise_game_questions WHERE scenario_id = ? ORDER BY position", [scenario.id])
      : [];

    for (const task of tasks) {
      const gameTask = await dbGet(
        "SELECT task_type, payload_json FROM enterprise_game_tasks WHERE question_id = ? ORDER BY id LIMIT 1",
        [task.id]
      );
      const answers = await dbAll(
        "SELECT id, text, points, is_preferred FROM enterprise_game_answers WHERE question_id = ? ORDER BY id",
        [task.id]
      );
      task.visual = parseJson(task.visual_json, []);
      task.gameType = gameTask?.task_type || "visual_choice";
      task.gamePayload = parseJson(gameTask?.payload_json, {});
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
      return { ...enterprise, match: totalWeight ? Math.round((matchedWeight / totalWeight) * 100) : 0 };
    })
    .sort((a, b) => b.match - a.match);
}

async function calculatePreview(answerIds) {
  const profile = {};
  if (Array.isArray(answerIds)) {
    for (const id of answerIds) {
      const answer = await dbGet("SELECT tags_json FROM global_test_answers WHERE id = ?", [id]);
      if (answer) addTags(profile, parseJson(answer.tags_json, {}));
    }
  }

  const roleMapping = assignRoles(profile);
  const enterprises = rankEnterprises(profile, await getEnterprises());
  const aiInterpretation = await getAiPreviewInterpretation({ answerIds, roleMapping, enterprises });
  return {
    profile,
    title: roleMapping.primaryRole?.title || "Профессия на заводе",
    primaryRole: roleMapping.primaryRole,
    auxiliaryRoles: roleMapping.auxiliaryRoles,
    roleScores: roleMapping.roleScores,
    aiInterpretation,
    enterprises,
    portfolioSeed: {
      headline: roleMapping.primaryRole?.title,
      competencies: [
        ...(roleMapping.primaryRole?.competencies || []),
        ...roleMapping.auxiliaryRoles.flatMap((role) => role.competencies.slice(0, 1))
      ]
    }
  };
}

function makeFinalResult(preview, enterprise, scenarioAnswers) {
  const score = scenarioAnswers.reduce((sum, answer) => sum + Number(answer.points || 0), 0);
  const maxScore = enterprise?.scenario?.tasks?.reduce((sum, task) => {
    return sum + Math.max(...task.answers.map((answer) => Number(answer.points || 0)));
  }, 0) || 1;
  const readinessScore = Math.min(100, Math.round((score / maxScore) * 100));
  const badges = scenarioAnswers
    .filter((answer) => answer.isPreferred)
    .map((answer, index) => ["Командный старт", "Системное мышление", "Качество без компромиссов", "Готов к практике"][index] || "Производственный выбор");

  const portfolio = {
    title: `Цифровое портфолио: ${preview.primaryRole?.title}`,
    primaryRole: preview.primaryRole,
    auxiliaryRoles: preview.auxiliaryRoles,
    competencies: preview.portfolioSeed.competencies,
    badges,
    score,
    readinessScore,
    readinessLevel: getReadinessLevel(readinessScore),
    enterprise: enterprise?.name
  };

  const certificate = {
    id: `PA-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    title: "Сертификат Промакадемии",
    issuedAt: new Date().toISOString(),
    text: `Подтверждает прохождение производственного симулятора по роли «${preview.primaryRole?.title}».`
  };

  const hrProfile = {
    studentRole: preview.primaryRole,
    auxiliaryRoles: preview.auxiliaryRoles,
    competencyProfile: preview.roleScores,
    practiceReadiness: readinessScore,
    readinessLevel: getReadinessLevel(readinessScore),
    recommendedPracticeTrack: enterprise?.professions?.find((profession) => profession.title === preview.primaryRole?.title) || enterprise?.professions?.[0] || null,
    riskNotes: readinessScore < 65 ? ["Нужен вводный инструктаж и наставник на первые задания"] : []
  };

  return { score, maxScore, readinessScore, badges, portfolio, certificate, hrProfile };
}

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, product: "Промакадемия" });
});

apiRouter.get("/bootstrap", async (_req, res, next) => {
  try {
    res.json({ test: await getTest(), enterprises: await getEnterprises(), roles: roleMeta });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/results/preview", async (req, res, next) => {
  try {
    res.json(await calculatePreview(req.body.answerIds || []));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/results/final", async (req, res, next) => {
  try {
    const { answerIds = [], enterpriseId, scenarioAnswers = [], sessionKey } = req.body;
    const preview = await calculatePreview(answerIds);
    const enterprise = (await getEnterprises()).find((item) => item.id === Number(enterpriseId));
    const key = sessionKey || crypto.randomUUID();

    let session = await dbGet("SELECT id FROM user_sessions WHERE session_key = ?", [key]);
    if (!session) {
      const inserted = await dbRun("INSERT INTO user_sessions (session_key) VALUES (?)", [key]);
      session = { id: inserted.id };
    }

    const enterpriseResult = makeFinalResult(preview, enterprise, scenarioAnswers);

    await dbRun(
      "INSERT INTO user_results (session_id, enterprise_id, global_profile_json, enterprise_result_json) VALUES (?, ?, ?, ?)",
      [session.id, enterprise?.id || null, JSON.stringify(preview), JSON.stringify(enterpriseResult)]
    );

    res.json({ sessionKey: key, profile: preview, enterprise, enterpriseResult });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/email-results", async (req, res) => {
  res.json({
    ok: true,
    message: `Демо-отправка цифрового портфолио${req.body.email ? ` на ${req.body.email}` : ""}. В production подключается email-провайдер.`
  });
});

apiRouter.get("/hr/dashboard", adminAuth, async (_req, res, next) => {
  try {
    const rows = await dbAll(
      `SELECT ur.id, ur.created_at, e.name AS enterprise_name, ur.global_profile_json, ur.enterprise_result_json
       FROM user_results ur
       LEFT JOIN enterprises e ON e.id = ur.enterprise_id
       ORDER BY ur.id DESC
       LIMIT 50`
    );
    res.json({
      items: rows.map((row) => {
        const profile = parseJson(row.global_profile_json, {});
        const result = parseJson(row.enterprise_result_json, {});
        return {
          id: row.id,
          createdAt: row.created_at,
          enterprise: row.enterprise_name,
          role: profile.primaryRole,
          auxiliaryRoles: profile.auxiliaryRoles,
          readinessScore: result.readinessScore,
          readinessLevel: result.hrProfile?.readinessLevel,
          badges: result.badges,
          certificate: result.certificate
        };
      })
    });
  } catch (error) {
    next(error);
  }
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
      userResults: results.count,
      logic: "24 visual questions, dynamic role mapping, portfolio, certificate, HR dashboard"
    });
  } catch (error) {
    next(error);
  }
});
