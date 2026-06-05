import { dbAll, dbRun } from "../db/db.js";

const defaultAiConfig = {
  url: "https://api.openai.com/v1/chat/completions",
  model: "gpt-3.5-turbo",
  systemPrompt:
    "Ты оцениваешь результаты профориентационного квеста предприятия для платформы «Промакадемия». Отвечай только валидным JSON без пояснений вне JSON."
};

function clampString(value, fallback = "", maxLength = 700) {
  return String(value || fallback).trim().slice(0, maxLength);
}

function normalizeStringArray(value, fallback, maxItems = 4) {
  const source = Array.isArray(value) ? value : fallback;
  return source
    .map((item) => clampString(item, "", 220))
    .filter(Boolean)
    .slice(0, maxItems);
}

function resolveChatCompletionsUrl(apiUrl) {
  const value = String(apiUrl || defaultAiConfig.url).trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(value)) return value;
  return `${value}/chat/completions`;
}

function maskToken(token) {
  if (!token) return "";
  if (token.length <= 10) return `${token.slice(0, 2)}***`;
  return `${token.slice(0, 6)}***${token.slice(-4)}`;
}

async function readStoredLlmSettings() {
  try {
    const rows = await dbAll("SELECT key, value FROM llm_settings");
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  } catch {
    return {};
  }
}

async function getAiConfig() {
  const stored = await readStoredLlmSettings();
  return {
    url: stored.llm_url || process.env.AI_API_URL || process.env.OPENAI_BASE_URL || defaultAiConfig.url,
    key: stored.llm_token || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "",
    model: stored.llm_model || process.env.AI_API_MODEL || process.env.OPENAI_MODEL || defaultAiConfig.model,
    systemPrompt: stored.llm_system_prompt || process.env.AI_SYSTEM_PROMPT || defaultAiConfig.systemPrompt,
    source: {
      url: stored.llm_url ? "database" : "env/default",
      token: stored.llm_token ? "database" : (process.env.AI_API_KEY || process.env.OPENAI_API_KEY ? "env" : "empty"),
      model: stored.llm_model ? "database" : "env/default"
    }
  };
}

export async function getPublicLlmSettings() {
  const config = await getAiConfig();
  return {
    llm_url: config.url,
    llm_model: config.model,
    llm_system_prompt: config.systemPrompt === defaultAiConfig.systemPrompt ? "" : config.systemPrompt,
    has_token: Boolean(config.key),
    token_masked: maskToken(config.key),
    source: config.source
  };
}

export async function updateLlmSettings(settings) {
  const updates = {
    llm_url: clampString(settings.llm_url || settings.AI_API_URL, "", 500),
    llm_model: clampString(settings.llm_model || settings.AI_API_MODEL, "", 120),
    llm_system_prompt: clampString(settings.llm_system_prompt || settings.AI_SYSTEM_PROMPT, "", 2000)
  };

  if (Object.prototype.hasOwnProperty.call(settings, "llm_token") || Object.prototype.hasOwnProperty.call(settings, "AI_API_KEY")) {
    updates.llm_token = clampString(settings.llm_token || settings.AI_API_KEY, "", 1000);
  }

  for (const [key, value] of Object.entries(updates)) {
    if (key !== "llm_token" && !value) continue;
    if (key === "llm_token" && !value) continue;
    await dbRun(
      `INSERT INTO llm_settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  }

  return getPublicLlmSettings();
}

function getAiResponseContent(data) {
  return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";
}

function extractJson(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function fallbackEvaluation({ preview, enterprise, scenarioAnswers, baseResult }) {
  const readiness = Number(baseResult.readinessScore || 0);
  const preferredCount = scenarioAnswers.filter((answer) => answer?.isPreferred).length;
  const primaryRole = preview?.primaryRole?.title || "производственная роль";
  const enterpriseName = enterprise?.name || "предприятие";
  const level =
    readiness >= 85
      ? "сильная готовность к практике"
      : readiness >= 65
        ? "хорошая база с точками роста"
        : readiness >= 45
          ? "нужна вводная стажировка"
          : "рекомендуется базовый трек";

  return {
    summary: `Пользователь показал результат ${readiness}% в сценарии «${enterpriseName}» и ближе всего к роли «${primaryRole}».`,
    strengths: [
      preferredCount > 0
        ? `Выбрано ${preferredCount} приоритетных решений в квесте предприятия.`
        : "Пользователь завершил сценарий и получил первичный опыт принятия решений.",
      `Профиль теста связан с направлением «${primaryRole}».`
    ],
    growthZones:
      readiness >= 75
        ? ["Закрепить результат на более сложных производственных кейсах."]
        : ["Разобрать ошибки сценария с наставником.", "Повторить ключевые правила безопасности и приоритизации."],
    nextSteps:
      readiness >= 75
        ? ["Предложить углубленный квест предприятия.", "Показать практику или стажировку по близкой профессии."]
        : ["Назначить вводный трек.", "Дать короткий разбор решений и повторный сценарий."],
    hrComment: `${level}: результат можно использовать для предварительного профиля компетенций HR.`,
    studentFeedback: `Ваш результат: ${readiness}%. Следующий шаг — посмотреть профессии предприятия и выбрать задание посложнее.`,
    recommendedProfessions: [primaryRole, enterprise?.professions?.[0]?.title].filter(Boolean).slice(0, 3),
    readinessLevel: level,
    scoreAdjustment: 0,
    confidence: 0.7
  };
}

function validateEvaluation(value, fallback) {
  if (!value || typeof value !== "object") return fallback;
  const scoreAdjustment = Number(value.scoreAdjustment);
  const confidence = Number(value.confidence);
  return {
    summary: clampString(value.summary, fallback.summary, 700),
    strengths: normalizeStringArray(value.strengths, fallback.strengths),
    growthZones: normalizeStringArray(value.growthZones, fallback.growthZones),
    nextSteps: normalizeStringArray(value.nextSteps, fallback.nextSteps),
    hrComment: clampString(value.hrComment, fallback.hrComment, 700),
    studentFeedback: clampString(value.studentFeedback, fallback.studentFeedback, 700),
    recommendedProfessions: normalizeStringArray(value.recommendedProfessions, fallback.recommendedProfessions, 3),
    readinessLevel: clampString(value.readinessLevel, fallback.readinessLevel, 120),
    scoreAdjustment: Number.isFinite(scoreAdjustment) ? Math.max(-5, Math.min(5, Math.round(scoreAdjustment))) : 0,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : fallback.confidence
  };
}

function buildUserPrompt({ preview, enterprise, scenarioAnswers, baseResult }) {
  const tasks = enterprise?.scenario?.tasks || [];
  const answers = scenarioAnswers.map((answer, index) => {
    const task = tasks[index] || {};
    return {
      taskTitle: task.title,
      taskPrompt: task.prompt,
      answerText: answer?.text,
      points: Number(answer?.points || 0),
      isPreferred: Boolean(answer?.isPreferred)
    };
  });

  return JSON.stringify(
    {
      instruction:
        "Оцени результат сценария предприятия. Верни только JSON строго по схеме: summary, strengths[], growthZones[], nextSteps[], hrComment, studentFeedback, recommendedProfessions[], readinessLevel, scoreAdjustment, confidence.",
      rules: [
        "Не меняй базовые баллы радикально: scoreAdjustment от -5 до 5.",
        "Пиши по-русски, понятно школьнику и HR.",
        "Учитывай общий тест, предприятие, профессии, выбранные ответы и readinessScore.",
        "Не выдумывай факты вне переданного контекста."
      ],
      globalProfile: {
        primaryRole: preview?.primaryRole,
        auxiliaryRoles: preview?.auxiliaryRoles,
        roleScores: preview?.roleScores
      },
      enterprise: {
        name: enterprise?.name,
        sector: enterprise?.sector,
        city: enterprise?.city,
        professions: enterprise?.professions
      },
      scenario: {
        title: enterprise?.scenario?.title,
        description: enterprise?.scenario?.description,
        answers
      },
      baseResult: {
        score: baseResult.score,
        maxScore: baseResult.maxScore,
        readinessScore: baseResult.readinessScore,
        badges: baseResult.badges
      }
    },
    null,
    2
  );
}

export async function evaluateEnterpriseResult(input) {
  const fallback = fallbackEvaluation(input);
  const config = await getAiConfig();

  if (!config.key) {
    return {
      evaluation: fallback,
      diagnostic: {
        mode: "fallback",
        reason: "AI_API_KEY/OPENAI_API_KEY не задан, использована локальная оценка по правилам."
      }
    };
  }

  const messages = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: buildUserPrompt(input) }
  ];

  try {
    const response = await fetch(resolveChatCompletionsUrl(config.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.2,
        max_tokens: 1600,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        evaluation: fallback,
        diagnostic: {
          mode: "fallback",
          reason: `LLM API вернул HTTP ${response.status}`,
          errorPreview: errorText.slice(0, 240)
        }
      };
    }

    const data = await response.json();
    const content = getAiResponseContent(data);
    const parsed = extractJson(content);
    if (!parsed) {
      return {
        evaluation: fallback,
        diagnostic: {
          mode: "fallback",
          reason: "LLM ответила, но ответ не удалось разобрать как JSON.",
          errorPreview: content.slice(0, 240)
        }
      };
    }

    return {
      evaluation: validateEvaluation(parsed, fallback),
      diagnostic: {
        mode: "llm",
        reason: "LLM вернула валидную JSON-оценку.",
        model: config.model
      }
    };
  } catch (error) {
    return {
      evaluation: fallback,
      diagnostic: {
        mode: "fallback",
        reason: "LLM недоступна, использована локальная оценка по правилам.",
        errorPreview: String(error.message || error).slice(0, 240)
      }
    };
  }
}
