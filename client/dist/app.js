const state = {
  screen: "home",
  questions: [],
  enterprises: [],
  roles: {},
  answers: [],
  preview: null,
  enterprise: null,
  step: 0,
  scenarioAnswers: [],
  questState: {},
  feedback: "",
  finalResult: null
};

const roleLabels = {
  production_engineer: "Инженер-производственник",
  quality_technologist: "Технолог-контролер",
  logistics_coordinator: "Логист-координатор",
  marketing_designer: "Маркетолог-дизайнер",
  automation_operator: "Оператор автоматизированных систем",
  hr_safety_coach: "Наставник по безопасности и HR"
};

async function api(path, body) {
  const response = await fetch(`/api${path}`, body ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  } : {});
  if (!response.ok) throw new Error(path);
  return response.json();
}

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function aiPreviewBlock(ai) {
  if (!ai?.enabled) return "";
  return `
    <div class="panel pad" style="margin-top:18px">
      <div class="meta"><span>ИИ-интерпретация результата</span><span>${escapeHtml(ai.model || "OpenAI")}</span></div>
      <p class="lead">${escapeHtml(ai.summary)}</p>
      <div class="grid cols">
        <div>
          <h3>Сильные стороны</h3>
          <div class="taglist">${(ai.strengths || []).map((item) => `<span class="tag teal">${escapeHtml(item)}</span>`).join("")}</div>
        </div>
        <div>
          <h3>Рекомендованные направления</h3>
          <div class="taglist">${(ai.recommendedDirections || []).map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>
        </div>
      </div>
      <p>${escapeHtml(ai.enterpriseMatchingComment)}</p>
      <p><strong>Следующий шаг:</strong> ${escapeHtml(ai.nextStep)}</p>
    </div>
  `;
}

function shell(content) {
  $("#app").innerHTML = `
    <header class="top">
      <div class="brand"><span class="mark">П</span><span>Промакадемия</span></div>
      <nav class="nav">
        ${[["home", "Старт"], ["test", "Тест"], ["result", "Профессии"], ["admin", "HR"]].map(([id, title]) => `
          <button class="${state.screen === id ? "active" : ""}" data-nav="${id}">${title}</button>
        `).join("")}
      </nav>
    </header>
    ${content}
    <footer class="footer">Промакадемия: 24 визуальных вопроса → профессии на заводе → производственный симулятор → портфолио и HR-скоринг.</footer>
  `;
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.onclick = () => go(button.dataset.nav);
  });
}

function go(screen) {
  if (screen === "result" && state.answers.length < state.questions.length) screen = "test";
  state.screen = screen;
  render();
  scrollTo(0, 0);
}

function status() {
  const items = [
    ["24 визуальных вопроса", state.answers.length === state.questions.length],
    ["Маппинг ролей", Boolean(state.preview?.primaryRole)],
    ["Предприятие", Boolean(state.enterprise)],
    ["Квест и бейджи", state.scenarioAnswers.length > 0],
    ["Портфолио / HR", state.screen === "final"]
  ];
  return `
    <aside class="panel side">
      <h3>Прогресс-трек</h3>
      <div class="status">
        ${items.map(([title, done], index) => `
          <div class="${done ? "done" : ""}">
            <span class="dot">${done ? "✓" : index + 1}</span>
            <span>${title}</span>
          </div>
        `).join("")}
      </div>
    </aside>
  `;
}

function home() {
  shell(`
    <section class="hero">
      <div class="hero-content">
        <div class="eyebrow">онлайн-профориентация</div>
        <h1>Промакадемия</h1>
        <p class="lead">Пройдите входной профориентационный тест, чтобы получить предварительный профиль интересов и подборку подходящих предприятий, профессий и квестов.</p>
        <div class="start-time"><strong>Ориентировочное время:</strong> 7-10 минут</div>
        <div class="actions">
          <button class="btn" id="start">Начать тест</button>
        </div>
      </div>
      <div class="strip">
        ${[["24", "визуальных вопроса"], ["7-10", "минут"], ["1+2", "роль и дополнительные направления"], ["квест", "после теста"]].map((item) => `
          <div class="metric"><strong>${item[0]}</strong><span>${item[1]}</span></div>
        `).join("")}
      </div>
    </section>
  `);
  $("#start").onclick = () => {
    state.answers = [];
    state.preview = null;
    state.enterprise = null;
    state.scenarioAnswers = [];
    state.finalResult = null;
    state.step = 0;
    go("test");
  };
}

function test() {
  const question = state.questions[state.step];
  if (!question) return shell(`<main class="main">Тест не загружен</main>`);
  const selected = state.answers[state.step];
  shell(`
    <main class="main">
      <section class="wrap grid route">
        ${status()}
        <div class="panel pad">
          <div class="progress"><span style="width:${(state.step / state.questions.length) * 100}%"></span></div>
          <div class="qhead">
            <span>Вопрос ${state.step + 1} из ${state.questions.length}</span>
            <span>${question.visualType || question.hint || "визуальный выбор"}</span>
          </div>
          <h2>${question.text}</h2>
          <div class="visual">
            <div class="nodes">
              ${["Схема", "Фото", "Пульт", "Карта", "Чек-лист", "Роль"].map((item, index) => `<div class="node ${index % 3 === 0 ? "hot" : ""}">${item}</div>`).join("")}
            </div>
          </div>
          <div class="options">
            ${question.answers.map((answer) => `
              <button class="option ${selected?.id === answer.id ? "selected" : ""}" data-answer="${answer.id}">
                <span class="radio"></span><span>${answer.text}</span>
              </button>
            `).join("")}
          </div>
          <div class="actions">
            <button class="btn ghost" id="prev" ${state.step === 0 ? "disabled" : ""}>← Назад</button>
            <button class="btn" id="next" ${!selected ? "disabled" : ""}>${state.step === state.questions.length - 1 ? "Показать профессии" : "Дальше →"}</button>
          </div>
        </div>
      </section>
    </main>
  `);
  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.onclick = () => {
      state.answers[state.step] = question.answers.find((answer) => answer.id == button.dataset.answer);
      test();
    };
  });
  $("#prev").onclick = () => {
    state.step -= 1;
    test();
  };
  $("#next").onclick = () => state.step === state.questions.length - 1 ? go("result") : (state.step += 1, test());
}

async function result() {
  state.preview = await api("/results/preview", { answerIds: state.answers.map((answer) => answer.id) }).catch(() => state.preview);
  const enterprises = state.preview?.enterprises || state.enterprises;
  const primary = state.preview?.primaryRole;
  const ai = state.preview?.aiInterpretation;
  shell(`
    <main class="main">
      <section class="wrap grid route">
        ${status()}
        <div>
          <h2>${primary?.title || "Профессия на заводе"}</h2>
          <p class="lead">Система присвоила основную профессию и до двух вспомогательных ролей на основе динамического маппинга ответов.</p>
          <div class="grid cols">
            <div class="panel pad">
              <h3>Основная профессия</h3>
              <p><strong>${primary?.title || ""}</strong></p>
              <p>${(primary?.competencies || []).join(", ")}</p>
            </div>
            <div class="panel pad">
              <h3>Вспомогательные роли</h3>
              <div class="taglist">
                ${(state.preview?.auxiliaryRoles || []).map((role) => `<span class="tag teal">${role.title}</span>`).join("")}
              </div>
            </div>
          </div>
          ${aiPreviewBlock(ai)}
          <h2 style="margin-top:28px">Предприятия и симуляторы</h2>
          <div class="cards">
            ${enterprises.map((enterprise) => `
              <article class="panel card">
                <div>
                  <div class="meta"><span>${enterprise.sector} · ${enterprise.city}</span><span class="score">${enterprise.match || 0}%</span></div>
                  <h3>${enterprise.name}</h3>
                  <p>${enterprise.description}</p>
                  <div class="taglist">${Object.keys(enterprise.tags || {}).slice(0, 4).map((tag) => `<span class="tag">${roleLabels[tag] || tag}</span>`).join("")}</div>
                </div>
                <button class="btn" data-enterprise="${enterprise.id}">Открыть квест →</button>
              </article>
            `).join("")}
          </div>
        </div>
      </section>
    </main>
  `);
  document.querySelectorAll("[data-enterprise]").forEach((button) => {
    button.onclick = () => {
      state.enterprise = enterprises.find((enterprise) => enterprise.id == button.dataset.enterprise);
      state.step = 0;
      state.scenarioAnswers = [];
      state.questState = {};
      state.feedback = "";
      state.finalResult = null;
      go("enterprise");
    };
  });
}

function enterprise() {
  const enterprise = state.enterprise;
  shell(`
    <main class="main">
      <section class="wrap grid route">
        ${status()}
        <div class="panel pad">
          <div class="grid cols">
            <div>
              <div class="meta"><span>${enterprise.sector} · ${enterprise.city}</span><span>квест предприятия</span></div>
              <h2>${enterprise.name}</h2>
              <p class="lead">${enterprise.description}</p>
              <ul class="list">
                ${[enterprise.reason, "Квест начисляет баллы, бейджи и прогресс готовности к практике.", "После прохождения формируются цифровое портфолио, сертификат и HR-профиль."].map((item) => `<li><span class="check">✓</span><span>${item}</span></li>`).join("")}
              </ul>
              <div class="actions">
                <button class="btn" id="startScenario">▶ Запустить производственный симулятор</button>
                <button class="btn ghost" onclick="go('result')">← К профессиям</button>
              </div>
            </div>
            <div>
              <h3>Релевантные профессии</h3>
              ${enterprise.professions.map((profession) => `<div class="profession"><strong>${profession.title}</strong><span>${profession.description}</span></div>`).join("")}
            </div>
          </div>
        </div>
      </section>
    </main>
  `);
  $("#startScenario").onclick = () => go("scenario");
}

function detectGameType(task) {
  const title = task.title.toLowerCase();
  if (title.includes("подключ") || title.includes("приоритет")) return "priority";
  if (title.includes("найди") || title.includes("потер")) return "heatmap";
  if (title.includes("nox") || title.includes("технолог")) return "technology";
  if (title.includes("100") || title.includes("влож")) return "budget";
  if (title.includes("смен") || title.includes("контроль") || title.includes("сбой")) return "factory";
  return task.gameType || "factory";
}

function questKey(task) {
  return `task_${task.id}`;
}

function getQuestState(task) {
  const key = questKey(task);
  if (!state.questState[key]) state.questState[key] = {};
  return state.questState[key];
}

function completeQuest(task, answerIndex, feedback) {
  const answer = task.answers[Math.min(answerIndex, task.answers.length - 1)] || task.answers[0];
  state.scenarioAnswers[state.step] = answer;
  state.feedback = feedback || task.feedback;
}

function gameActionButtons(task) {
  return `
    <div class="game-actions">
      ${task.answers.map((answer, index) => `
        <button class="game-action ${answer.isPreferred ? "preferred" : ""}" data-scenario-answer="${answer.id}">
          <span>${index + 1}</span>
          <strong>${answer.isPreferred ? "Оптимальное действие" : "Альтернативный ход"}</strong>
          <small>${answer.text}</small>
        </button>
      `).join("")}
    </div>
  `;
}

function renderPriorityGame(task) {
  const objects = task.visual.slice(0, 5);
  return `
    <div class="game-board priority-board">
      <div class="dispatch-panel">
        <div class="dispatch-head">
          <strong>Диспетчерский пульт</strong>
          <span>Мощность доступна: 65%</span>
        </div>
        <div class="priority-lanes">
          ${objects.map((item, index) => `
            <div class="priority-item">
              <span class="rank">${index + 1}</span>
              <span>${item}</span>
              <small>${index < 2 ? "соцобъект / жизнеобеспечение" : index < 4 ? "жилой контур" : "промышленная нагрузка"}</small>
            </div>
          `).join("")}
        </div>
      </div>
      <p class="game-hint">Игровая механика: расставить объекты по приоритету подключения и подтвердить график.</p>
      ${gameActionButtons(task)}
    </div>
  `;
}

function renderHeatmapGame(task) {
  return `
    <div class="game-board">
      <div class="heatmap-toolbar">
        <strong>Тепловизор включен</strong>
        <span class="heat-scale">норма → перегрев</span>
      </div>
      <div class="heatmap">
        ${task.visual.map((item, index) => `
          <button class="heat-node ${index === 0 || index === 2 || index === 3 ? "risk" : ""}">
            <span>${item}</span>
            <small>${index === 0 || index === 2 || index === 3 ? "аномалия ?" : "норма"}</small>
          </button>
        `).join("")}
      </div>
      <p class="game-hint">Игровая механика: найти 3 зоны аномальных потерь на схеме сети.</p>
      ${gameActionButtons(task)}
    </div>
  `;
}

function renderTechnologyGame(task) {
  const cards = [
    ["SCR-катализатор", "-55%", "дорого / 2 месяца"],
    ["Ступенчатое горение", "-28%", "быстро / дешево"],
    ["Комбо + реагенты", "-41%", "оптимально"]
  ];
  return `
    <div class="game-board">
      <div class="emission-dashboard">
        <strong>NOx: 180 мг/м³</strong>
        <span>Цель: ≤108 мг/м³ (-40%)</span>
      </div>
      <div class="tech-cards">
        ${cards.map((card, index) => `
          <div class="tech-card ${index === 2 ? "best" : ""}">
            <strong>${card[0]}</strong>
            <span>${card[1]}</span>
            <small>${card[2]}</small>
          </div>
        `).join("")}
      </div>
      <p class="game-hint">Игровая механика: сравнить технологии, увидеть trade-off «экология / бюджет / срок» и применить решение.</p>
      ${gameActionButtons(task)}
    </div>
  `;
}

function renderBudgetGame(task) {
  return `
    <div class="game-board">
      <div class="budget-total"><strong>Инвестплан: 100 млн ₽</strong><span>распределите направления</span></div>
      <div class="sliders">
        ${["Автоматизация", "Замена труб", "Экология/фильтры", "Обучение/кадры"].map((item, index) => `
          <label>
            <span>${item}</span>
            <input type="range" min="0" max="60" value="${[25, 35, 25, 15][index]}" disabled />
          </label>
        `).join("")}
      </div>
      <p class="game-hint">Игровая механика: слайдерами собрать инвестиционный план ровно на 100 млн ₽ и получить фидбек наставника.</p>
      ${gameActionButtons(task)}
    </div>
  `;
}

function renderFactoryGame(task) {
  return `
    <div class="game-board">
      <div class="factory-map">
        ${task.visual.map((item, index) => `
          <div class="factory-zone ${index % 2 === 0 ? "active" : ""}">
            <strong>${item}</strong>
            <small>${["зона действия", "контроль", "ресурс", "риск"][index % 4]}</small>
          </div>
        `).join("")}
      </div>
      <p class="game-hint">Игровая механика: выполнить производственное действие на карте участка, а не ответить на тестовый вопрос.</p>
      ${gameActionButtons(task)}
    </div>
  `;
}

function renderGame(task) {
  const type = detectGameType(task);
  if (type === "priority") return renderPriorityQuest(task);
  if (type === "heatmap") return renderHeatmapQuest(task);
  if (type === "technology") return renderTechnologyQuest(task);
  if (type === "budget") return renderBudgetQuest(task);
  return renderFactoryGame(task);
}

function renderPriorityQuest(task) {
  const qs = getQuestState(task);
  const objects = ["Больница", "Жилой квартал Северный", "Школа", "Промзона Альфа", "Водозаборная станция"];
  const order = qs.order || [];
  const remaining = objects.map((label, index) => ({ label, index })).filter((item) => !order.includes(item.index));
  return `
    <div class="game-board priority-board" data-game="priority">
      <div class="dispatch-panel">
        <div class="dispatch-head"><strong>Диспетчерский пульт</strong><span>Мощность доступна: 65%</span></div>
        <div class="quest-layout">
          <div>
            <h3>Список объектов</h3>
            <div class="object-pool">
              ${remaining.map((item) => `<button class="quest-chip" data-priority-object="${item.index}">${item.label}</button>`).join("") || `<span class="quest-muted">Все объекты расставлены</span>`}
            </div>
          </div>
          <div>
            <h3>Приоритет подключения 1→5</h3>
            <div class="priority-lanes">
              ${order.map((itemIndex, index) => `
                <div class="priority-item">
                  <span class="rank">${index + 1}</span>
                  <span>${objects[itemIndex]}</span>
                  <small>${itemIndex === 0 || itemIndex === 2 || itemIndex === 4 ? "соцсфера / жизнеобеспечение" : itemIndex === 1 ? "жилой контур" : "промышленная нагрузка"}</small>
                </div>
              `).join("")}
              ${Array.from({ length: 5 - order.length }).map((_, index) => `<div class="priority-empty">${order.length + index + 1}. Перетащите или кликните объект</div>`).join("")}
            </div>
          </div>
        </div>
        <div class="quest-actions">
          <button class="btn secondary" data-priority-reset ${order.length ? "" : "disabled"}>Сбросить порядок</button>
          <button class="btn" data-priority-confirm ${order.length === 5 && !qs.confirmed ? "" : "disabled"}>Подтвердить график подключения</button>
        </div>
      </div>
      ${qs.confirmed ? `
        <div class="quest-case">
          <strong>Мини-кейс</strong>
          <p>Промзона требует 30% мощности, но без воды остановится насосная. Что делать?</p>
          <div class="quest-choice-grid">
            ${["Отложить промзону", "Временно снизить давление в жилом секторе", "Запустить резервную подкачку"].map((label, index) => `<button class="quest-choice ${qs.caseChoice === index ? "selected" : ""}" data-priority-case="${index}">${label}</button>`).join("")}
          </div>
          ${qs.caseChoice !== undefined ? `<div class="system-reaction">Согласно регламентам, первыми подключаются объекты жизнеобеспечения и соцсферы. Система показывает последствия выбора: давление стабильно, жалобы жителей не растут, производство получает отложенный график.</div>` : ""}
        </div>
      ` : `<p class="game-hint">Кликайте объекты в нужном порядке. Эталон: соцобъекты и критическая инфраструктура → жилье → промышленность.</p>`}
    </div>
  `;
}

function renderHeatmapQuest(task) {
  const qs = getQuestState(task);
  const found = qs.found || [];
  const thermal = Boolean(qs.thermal);
  const zones = [
    ["Старый стык 1987", true, "Участок №1. Год укладки: 1987. Изоляция: износ 78%. Температура стенки: 42°C."],
    ["Новая труба", false, "Температура в норме. Ищите места коррозии, отсутствия изоляции или конденсата."],
    ["Камера 12", true, "Участок №2. Камера с перегревом. Здесь теряется до 12% энергии."],
    ["Изоляция 78%", true, "Участок №3. Изоляция изношена, поверхность перегрета."],
    ["Теплопункт", false, "Теплопункт работает штатно."],
    ["Уклон трассы", false, "Уклон требует контроля, но это не зона текущей утечки."]
  ];
  return `
    <div class="game-board" data-game="heatmap">
      <div class="heatmap-toolbar">
        <strong>Изометрическая схема тепловой сети</strong>
        <span class="heat-scale">синий: норма → красный: перегрев/утечка</span>
        <button class="btn secondary" data-thermal-toggle>${thermal ? "Тепловизор включен" : "Включить тепловизор"}</button>
      </div>
      <div class="heatmap">
        ${zones.map((zone, index) => `
          <button class="heat-node ${thermal && zone[1] ? "risk" : ""} ${found.includes(index) ? "found" : ""}" data-heat-zone="${index}">
            <span>${zone[0]}</span>
            <small>${found.includes(index) ? "зафиксировано" : thermal && zone[1] ? "? зона риска" : "нет данных"}</small>
          </button>
        `).join("")}
      </div>
      <div class="quest-panel">
        <strong>Счетчик диагностики: ${found.length}/3</strong>
        <p>${qs.lastCard || "Включите тепловизор, исследуйте карту и кликните 3 участка с аномальными потерями."}</p>
      </div>
      ${found.length >= 3 ? `<div class="system-reaction">Анимация ремонта: бригада меняет изоляцию и ставит датчики протечки.</div><button class="btn" data-heat-finish>Завершить диагностику</button>` : ""}
    </div>
  `;
}

function renderTechnologyQuest(task) {
  const qs = getQuestState(task);
  const selected = qs.tech;
  const air = Number(qs.air ?? 45);
  const reagent = Number(qs.reagent ?? 35);
  const cards = [
    ["scr", "Каталитический нейтрализатор", "-55%", "2 месяца / дорого", 55],
    ["burn", "Ступенчатое горение", "-28%", "быстро / дешево", 28],
    ["combo", "Комбо: горение + реагенты", "-41%", "оптимально", 41]
  ];
  const chosen = cards.find((card) => card[0] === selected);
  const reduction = selected === "combo" ? Math.min(48, 34 + Math.round((air + reagent) / 14)) : chosen?.[4] || 0;
  const currentNox = selected ? Math.round(180 * (1 - reduction / 100)) : 180;
  return `
    <div class="game-board" data-game="technology">
      <div class="emission-dashboard"><strong>Текущие выбросы NOx: ${currentNox} мг/м3</strong><span>Цель: ≤108 мг/м3 (-40%)</span></div>
      <div class="tech-cards">
        ${cards.map((card) => `
          <button class="tech-card ${selected === card[0] ? "best" : ""}" data-tech-card="${card[0]}">
            <strong>${card[1]}</strong><span>${card[2]}</span><small>${card[3]}</small>
          </button>
        `).join("")}
      </div>
      ${selected ? `
        <div class="simulator">
          <strong>Симуляция горелки/фильтра</strong>
          <div class="nox-meter"><span style="width:${Math.min(100, currentNox / 1.8)}%"></span></div>
          <p>Баланс: экология vs бюджет vs время. ${currentNox <= 108 ? "Цель достигнута." : "Цель не достигнута, скорректируйте параметры."}</p>
          <label>Доля вторичного воздуха: <strong data-tech-value="air">${air}%</strong><input data-tech-slider="air" type="range" min="20" max="70" value="${air}"></label>
          <label>Дозировка реагентов: <strong data-tech-value="reagent">${reagent}%</strong><input data-tech-slider="reagent" type="range" min="10" max="70" value="${reagent}"></label>
          <button class="btn" data-tech-apply ${currentNox <= 108 ? "" : "disabled"}>Применить технологию</button>
        </div>
      ` : `<p class="game-hint">Кликните технологию, раскройте параметры и добейтесь снижения NOx минимум на 40%.</p>`}
    </div>
  `;
}

function renderBudgetQuest(task) {
  const qs = getQuestState(task);
  const values = qs.budget || [0, 0, 0, 0];
  const total = values.reduce((sum, value) => sum + Number(value), 0);
  const left = 100 - total;
  const reliability = Math.min(100, 45 + Math.round(values[0] * 0.35 + values[1] * 0.55 + values[3] * 0.15));
  const risk = Math.max(5, 70 - Math.round(values[1] * 0.45 + values[2] * 0.5 + values[3] * 0.25));
  const payback = Math.max(2, 9 - Math.round((values[0] + values[1]) / 25));
  return `
    <div class="game-board" data-game="budget">
      <div class="budget-total"><strong data-budget-left>Осталось: ${left} млн ₽</strong><span data-budget-total>Сумма плана: ${total} / 100 млн ₽</span></div>
      <div class="sliders">
        ${["Автоматизация", "Замена труб", "Экология/Фильтры", "Обучение/Кадры"].map((item, index) => `
          <label><span>${item}: <strong data-budget-value="${index}">${values[index]} млн ₽</strong></span><input data-budget-slider="${index}" type="range" min="0" max="70" value="${values[index]}" /></label>
        `).join("")}
      </div>
      <div class="forecast">
        <div><strong data-forecast="reliability">${reliability}%</strong><span>Надежность сети</span></div>
        <div><strong data-forecast="payback">${payback} лет</strong><span>Срок окупаемости</span></div>
        <div><strong data-forecast="risk">${risk}%</strong><span>Остаточные риски</span></div>
      </div>
      <button class="btn" data-budget-submit ${total === 100 ? "" : "disabled"}>Сформировать инвестиционный план</button>
      ${qs.submitted ? `<div class="system-reaction">AI-наставник: хороший план связывает найденные утечки, экологические требования и устойчивость команды. Бейдж: Инвест-план.</div>` : `<p class="game-hint">Двигайте ползунки. Кнопка активна только при точном равенстве 100 млн ₽.</p>`}
    </div>
  `;
}

function updateTechSimulator(qs) {
  const air = Number(qs.air ?? 45);
  const reagent = Number(qs.reagent ?? 35);
  const reduction = qs.tech === "combo" ? Math.min(48, 34 + Math.round((air + reagent) / 14)) : qs.tech === "scr" ? 55 : qs.tech === "burn" ? 28 : 0;
  const currentNox = qs.tech ? Math.round(180 * (1 - reduction / 100)) : 180;
  const airValue = document.querySelector('[data-tech-value="air"]');
  const reagentValue = document.querySelector('[data-tech-value="reagent"]');
  const title = document.querySelector(".emission-dashboard strong");
  const meter = document.querySelector(".nox-meter span");
  const apply = document.querySelector("[data-tech-apply]");
  if (airValue) airValue.textContent = `${air}%`;
  if (reagentValue) reagentValue.textContent = `${reagent}%`;
  if (title) title.textContent = `Текущие выбросы NOx: ${currentNox} мг/м3`;
  if (meter) meter.style.width = `${Math.min(100, currentNox / 1.8)}%`;
  if (apply) apply.disabled = currentNox > 108;
}

function updateBudgetSimulator(qs) {
  const values = qs.budget || [0, 0, 0, 0];
  const total = values.reduce((sum, value) => sum + Number(value), 0);
  const left = 100 - total;
  const reliability = Math.min(100, 45 + Math.round(values[0] * 0.35 + values[1] * 0.55 + values[3] * 0.15));
  const risk = Math.max(5, 70 - Math.round(values[1] * 0.45 + values[2] * 0.5 + values[3] * 0.25));
  const payback = Math.max(2, 9 - Math.round((values[0] + values[1]) / 25));
  values.forEach((value, index) => {
    const label = document.querySelector(`[data-budget-value="${index}"]`);
    if (label) label.textContent = `${value} млн ₽`;
  });
  const leftNode = document.querySelector("[data-budget-left]");
  const totalNode = document.querySelector("[data-budget-total]");
  const submit = document.querySelector("[data-budget-submit]");
  const reliabilityNode = document.querySelector('[data-forecast="reliability"]');
  const paybackNode = document.querySelector('[data-forecast="payback"]');
  const riskNode = document.querySelector('[data-forecast="risk"]');
  if (leftNode) leftNode.textContent = `Осталось: ${left} млн ₽`;
  if (totalNode) totalNode.textContent = `Сумма плана: ${total} / 100 млн ₽`;
  if (submit) submit.disabled = total !== 100;
  if (reliabilityNode) reliabilityNode.textContent = `${reliability}%`;
  if (paybackNode) paybackNode.textContent = `${payback} лет`;
  if (riskNode) riskNode.textContent = `${risk}%`;
}

function bindQuestGame(task) {
  const type = detectGameType(task);
  const qs = getQuestState(task);
  document.querySelectorAll("[data-priority-object]").forEach((button) => {
    button.onclick = () => {
      qs.order = [...(qs.order || []), Number(button.dataset.priorityObject)];
      scenario();
    };
  });
  const priorityReset = document.querySelector("[data-priority-reset]");
  if (priorityReset) priorityReset.onclick = () => {
    qs.order = [];
    qs.confirmed = false;
    delete qs.caseChoice;
    state.scenarioAnswers[state.step] = null;
    state.feedback = "";
    scenario();
  };
  const priorityConfirm = document.querySelector("[data-priority-confirm]");
  if (priorityConfirm) priorityConfirm.onclick = () => {
    qs.confirmed = true;
    state.feedback = "Согласно регламентам, первоочередно подключаются объекты жизнеобеспечения и соцсферы.";
    scenario();
  };
  document.querySelectorAll("[data-priority-case]").forEach((button) => {
    button.onclick = () => {
      qs.caseChoice = Number(button.dataset.priorityCase);
      completeQuest(task, qs.caseChoice === 2 ? 0 : 1, task.feedback);
      scenario();
    };
  });
  const thermalToggle = document.querySelector("[data-thermal-toggle]");
  if (thermalToggle) thermalToggle.onclick = () => {
    qs.thermal = true;
    scenario();
  };
  document.querySelectorAll("[data-heat-zone]").forEach((button) => {
    button.onclick = () => {
      if (!qs.thermal) {
        qs.lastCard = "Сначала включите тепловизор: без цветовой шкалы нельзя подтвердить аномальные потери.";
        scenario();
        return;
      }
      const index = Number(button.dataset.heatZone);
      const risk = [0, 2, 3].includes(index);
      qs.found = qs.found || [];
      if (risk && !qs.found.includes(index)) qs.found.push(index);
      qs.lastCard = risk
        ? `Участок №${index + 1}. Температура стенки выше нормы, зона фиксируется в диагностике.`
        : "Температура в норме. Ищите места коррозии, отсутствия изоляции или конденсата.";
      scenario();
    };
  });
  const heatFinish = document.querySelector("[data-heat-finish]");
  if (heatFinish) heatFinish.onclick = () => {
    completeQuest(task, 0, task.feedback);
    scenario();
  };
  document.querySelectorAll("[data-tech-card]").forEach((button) => {
    button.onclick = () => {
      qs.tech = button.dataset.techCard;
      scenario();
    };
  });
  document.querySelectorAll("[data-tech-slider]").forEach((input) => {
    input.oninput = () => {
      qs[input.dataset.techSlider] = Number(input.value);
      state.scenarioAnswers[state.step] = null;
      state.feedback = "";
      const next = document.querySelector("#scenarioNext");
      if (next) next.disabled = true;
      updateTechSimulator(qs);
    };
  });
  const techApply = document.querySelector("[data-tech-apply]");
  if (techApply) techApply.onclick = () => {
    completeQuest(task, qs.tech === "combo" ? 0 : 1, task.feedback);
    scenario();
  };
  document.querySelectorAll("[data-budget-slider]").forEach((input) => {
    input.oninput = () => {
      const values = qs.budget || [0, 0, 0, 0];
      values[Number(input.dataset.budgetSlider)] = Number(input.value);
      qs.budget = values;
      qs.submitted = false;
      state.scenarioAnswers[state.step] = null;
      state.feedback = "";
      const next = document.querySelector("#scenarioNext");
      if (next) next.disabled = true;
      updateBudgetSimulator(qs);
    };
  });
  const budgetSubmit = document.querySelector("[data-budget-submit]");
  if (budgetSubmit) budgetSubmit.onclick = () => {
    qs.submitted = true;
    const values = qs.budget || [0, 0, 0, 0];
    const goodPlan = values[1] >= 25 && values[2] >= 15 && values[3] >= 10;
    completeQuest(task, goodPlan ? 0 : 2, task.feedback);
    scenario();
  };
  if (type === "factory") {
    document.querySelectorAll("[data-scenario-answer]").forEach((button) => {
      button.onclick = () => {
        state.scenarioAnswers[state.step] = task.answers.find((answer) => answer.id == button.dataset.scenarioAnswer);
        state.feedback = task.feedback;
        scenario();
      };
    });
  }
}

function scenario() {
  const enterprise = state.enterprise;
  const tasks = enterprise.scenario.tasks;
  const task = tasks[state.step];
  const selected = state.scenarioAnswers[state.step];
  const total = state.scenarioAnswers.reduce((sum, answer) => sum + (answer?.points || 0), 0);
  shell(`
    <main class="main">
      <section class="wrap grid route">
        ${status()}
        <div class="grid scenario">
          <div class="panel pad">
            <div class="progress"><span style="width:${(state.step / tasks.length) * 100}%"></span></div>
            <div class="qhead"><span>${enterprise.name}: этап ${state.step + 1} из ${tasks.length}</span><span>${selected ? `+${selected.points} баллов` : "ожидает решения"}</span></div>
            <h2>${task.title}</h2>
            <p class="lead">${task.prompt}</p>
            ${renderGame(task)}
            <div class="actions">
              <button class="btn ghost" id="scenarioPrev" ${state.step === 0 ? "disabled" : ""}>← Назад</button>
              <button class="btn" id="scenarioNext" ${!selected ? "disabled" : ""}>${state.step === tasks.length - 1 ? "Сформировать портфолио" : "Следующий этап →"}</button>
            </div>
          </div>
          <aside class="panel pad">
            <h3>Баллы и бейджи</h3>
            <div class="scorebig">${total}</div>
            <div class="feedback">${state.feedback || "После выбора ответа появится обратная связь и бейдж этапа."}</div>
          </aside>
        </div>
      </section>
    </main>
  `);
  document.querySelectorAll("[data-scenario-answer]").forEach((button) => {
    button.onclick = () => {
      state.scenarioAnswers[state.step] = task.answers.find((answer) => answer.id == button.dataset.scenarioAnswer);
      state.feedback = task.feedback;
      scenario();
    };
  });
  bindQuestGame(task);
  $("#scenarioPrev").onclick = () => {
    state.step -= 1;
    state.feedback = "";
    scenario();
  };
  $("#scenarioNext").onclick = () => state.step === tasks.length - 1 ? go("final") : (state.step += 1, state.feedback = "", scenario());
}

async function final() {
  const enterprise = state.enterprise;
  state.finalResult = state.finalResult || await api("/results/final", {
    answerIds: state.answers.map((answer) => answer.id),
    enterpriseId: enterprise.id,
    scenarioAnswers: state.scenarioAnswers
  }).catch(() => null);

  const result = state.finalResult?.enterpriseResult;
  const portfolio = result?.portfolio || {};
  const certificate = result?.certificate || {};
  const hr = result?.hrProfile || {};

  shell(`
    <main class="main">
      <section class="wrap grid route">
        ${status()}
        <div class="panel pad">
          <div class="meta"><span>цифровое портфолио и сертификат</span><span>${result?.readinessScore || 0}% готовности</span></div>
          <h2>${portfolio.title || state.preview?.primaryRole?.title}</h2>
          <p class="lead">${certificate.text || "Производственный симулятор завершен."}</p>
          <div class="grid cols">
            <div class="panel pad">
              <h3>Портфолио пользователя</h3>
              <p><strong>Основная роль:</strong> ${portfolio.primaryRole?.title || ""}</p>
              <p><strong>Вспомогательные роли:</strong> ${(portfolio.auxiliaryRoles || []).map((role) => role.title).join(", ")}</p>
              <p><strong>Компетенции:</strong> ${(portfolio.competencies || []).join(", ")}</p>
              <div class="taglist">${(portfolio.badges || []).map((badge) => `<span class="tag teal">${badge}</span>`).join("")}</div>
            </div>
            <div class="panel pad">
              <h3>HR-дашборд предприятия</h3>
              <p><strong>Скоринг готовности:</strong> ${hr.practiceReadiness || 0}%</p>
              <p><strong>Уровень:</strong> ${hr.readinessLevel || ""}</p>
              <p><strong>Рекомендованный трек:</strong> ${hr.recommendedPracticeTrack?.title || "Практика с наставником"}</p>
            </div>
          </div>
          <div class="panel pad" style="margin-top:18px">
            <h3>${certificate.title || "Сертификат Промакадемии"}</h3>
            <p><strong>Номер:</strong> ${certificate.id || "PA-DEMO"}</p>
            <p><strong>Предприятие:</strong> ${portfolio.enterprise || enterprise.name}</p>
          </div>
          <div class="actions">
            <button class="btn" id="mail">✉ Отправить портфолио на email</button>
            <button class="btn secondary" onclick="go('result')">⌖ Другие предприятия</button>
            <button class="btn ghost" onclick="state.answers=[];state.enterprise=null;state.scenarioAnswers=[];state.questState={};state.preview=null;go('home')">↺ Пройти заново</button>
          </div>
          <p id="note"></p>
        </div>
      </section>
    </main>
  `);
  $("#mail").onclick = async () => {
    $("#note").textContent = (await api("/email-results", { email: "demo@example.com" })).message;
  };
}

function admin() {
  shell(`
    <main class="main">
      <section class="wrap">
        <h2>HR-логика Промакадемии</h2>
        <p class="lead">После квеста предприятие получает профиль компетенций, итоговые баллы, бейджи, сертификат и скоринг готовности к практике.</p>
        <div class="grid admin">
          ${["24 визуальных вопроса", "Динамический маппинг ролей", "Цифровое портфолио", "HR-дашборд"].map((title, index) => `
            <article class="panel pad"><h3>${title}</h3><ul><li>${["По 4 вопроса на каждый из 6 профтипов.", "Одна основная и до двух вспомогательных профессий.", "Компетенции, баллы, бейджи и сертификат.", "Скоринг готовности к практике и рекомендуемый трек."][index]}</li></ul></article>
          `).join("")}
        </div>
      </section>
    </main>
  `);
}

function render() {
  if (state.screen === "home") home();
  if (state.screen === "test") test();
  if (state.screen === "result") result();
  if (state.screen === "enterprise") enterprise();
  if (state.screen === "scenario") scenario();
  if (state.screen === "final") final();
  if (state.screen === "admin") admin();
}

async function init() {
  const data = await api("/bootstrap").catch(() => ({ test: { questions: [] }, enterprises: [], roles: {} }));
  state.questions = data.test.questions;
  state.enterprises = data.enterprises;
  state.roles = data.roles || {};
  render();
}

init();
