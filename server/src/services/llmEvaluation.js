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
  if (/\/v1$/i.test(value)) return `${value}/chat/completions`;
  return `${value}/v1/chat/completions`;
}

function getAiConfig() {
  return {
    url: process.env.AI_API_URL || process.env.OPENAI_BASE_URL || defaultAiConfig.url,
    key: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "",
    model: process.env.AI_API_MODEL || process.env.OPENAI_MODEL || defaultAiConfig.model,
    systemPrompt: process.env.AI_SYSTEM_PROMPT || defaultAiConfig.systemPrompt
  };
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
  const config = getAiConfig();

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
