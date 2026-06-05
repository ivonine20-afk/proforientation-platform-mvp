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
        <div class="eyebrow">адаптивный визуальный тест</div>
        <h1>Промакадемия: найди свою профессию на заводе</h1>
        <p class="lead">Школьник или студент проходит 24 визуальных вопроса, получает одну основную и до двух вспомогательных заводских профессий, затем выполняет квест предприятия и формирует цифровое портфолио.</p>
        <div class="actions">
          <button class="btn" id="start">▶ Начать 24-вопросный тест</button>
          <button class="btn secondary" onclick="document.querySelector('#flow').scrollIntoView()">⌖ Как работает логика</button>
        </div>
      </div>
      <div class="strip">
        ${[["24", "визуальных вопроса"], ["6", "профессиональных типов"], ["1+2", "основная и вспомогательные роли"], ["HR", "дашборд готовности к практике"]].map((item) => `
          <div class="metric"><strong>${item[0]}</strong><span>${item[1]}</span></div>
        `).join("")}
      </div>
    </section>
    <main class="main" id="flow">
      <section class="wrap">
        <h2>Логика платформы</h2>
        <p class="lead">Система считает роли по ответам, подбирает предприятие, начисляет баллы и бейджи в квесте, затем собирает портфолио и HR-профиль компетенций.</p>
        <div class="panel cards">
          ${["Визуальный тест", "Роли на заводе", "Производственный симулятор"].map((title, index) => `
            <div class="card"><h3>${index + 1}. ${title}</h3><p>${["24 вопроса: по 4 на каждый профтип.", "Динамический маппинг: основная роль и до двух дополнительных.", "Квесты предприятия, баллы, бейджи, сертификат и HR-скоринг."][index]}</p></div>
          `).join("")}
        </div>
      </section>
    </main>
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
  if (type === "priority") return renderPriorityGame(task);
  if (type === "heatmap") return renderHeatmapGame(task);
  if (type === "technology") return renderTechnologyGame(task);
  if (type === "budget") return renderBudgetGame(task);
  return renderFactoryGame(task);
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
            <button class="btn ghost" onclick="state.answers=[];state.enterprise=null;state.scenarioAnswers=[];state.preview=null;go('home')">↺ Пройти заново</button>
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
