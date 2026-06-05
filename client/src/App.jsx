import { useEffect, useMemo, useState } from "react";
import { fallbackBootstrap, profileLabels } from "./api_mock.js";

function Glyph({ children }) {
  return <span aria-hidden="true" className="inline-grid size-5 place-items-center text-base leading-none">{children}</span>;
}

const ArrowLeft = () => <Glyph>←</Glyph>;
const ArrowRight = () => <Glyph>→</Glyph>;
const BarChart3 = () => <Glyph>▦</Glyph>;
const Check = () => <Glyph>✓</Glyph>;
const Factory = () => <Glyph>▣</Glyph>;
const Mail = () => <Glyph>✉</Glyph>;
const MapPinned = () => <Glyph>⌖</Glyph>;
const Play = () => <Glyph>▶</Glyph>;
const RefreshCcw = () => <Glyph>↺</Glyph>;
const Settings = () => <Glyph>⚙</Glyph>;
const Sparkles = () => <Glyph>✦</Glyph>;

const screens = {
  HOME: "home",
  TEST: "test",
  RESULT: "result",
  ENTERPRISE: "enterprise",
  SCENARIO: "scenario",
  FINAL: "final",
  ADMIN: "admin"
};

async function api(path, options) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

function Shell({ screen, setScreen, children }) {
  const nav = [
    [screens.HOME, "Старт"],
    [screens.TEST, "Тест"],
    [screens.RESULT, "Результат"],
    [screens.ADMIN, "Админка"]
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-line/80 bg-white/90 px-5 py-2 backdrop-blur lg:px-12">
        <div className="flex items-center gap-3 font-extrabold">
          <span className="grid size-9 place-items-center rounded-panel bg-ink text-white">П</span>
          <span>ПрофМаршрут</span>
        </div>
        <nav className="flex flex-wrap justify-end gap-2">
          {nav.map(([id, label]) => (
            <button
              key={id}
              className={classNames(
                "min-h-9 rounded-panel px-3 text-sm text-muted hover:bg-teal/10 hover:text-[#08736f]",
                screen === id && "bg-teal/10 text-[#08736f]"
              )}
              onClick={() => setScreen(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      {children}
      <footer className="border-t border-line px-5 py-7 text-center text-sm text-muted">
        MVP платформы онлайн-профориентации: входной тест → предприятия → игровой сценарий → итог.
      </footer>
    </div>
  );
}

function Status({ answers, questions, enterprise, scenarioAnswers, screen }) {
  const steps = [
    ["Тест", answers.length === questions.length],
    ["Предварительный профиль", answers.length === questions.length],
    ["Предприятие", Boolean(enterprise)],
    ["Сценарий", scenarioAnswers.length > 0],
    ["Итог", screen === screens.FINAL]
  ];

  return (
    <aside className="panel sticky top-20 self-start p-5">
      <h3 className="mb-4 text-lg font-extrabold">Состояние маршрута</h3>
      <div className="grid gap-3">
        {steps.map(([label, done], index) => (
          <div key={label} className="grid grid-cols-[28px_1fr] items-start gap-3 text-sm text-muted">
            <span
              className={classNames(
                "grid size-7 place-items-center rounded-full bg-slate-100 font-black",
                done && "bg-green-50 text-green-700"
              )}
            >
              {done ? <Check size={15} /> : index + 1}
            </span>
            <span className={done ? "text-ink" : ""}>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Home({ setScreen }) {
  return (
    <>
      <section className="hero relative grid min-h-[calc(100vh-64px)] items-center overflow-hidden pb-36 lg:pb-28">
        <div className="w-full max-w-3xl px-5 py-14 lg:px-16">
          <div className="mb-5 inline-flex items-center gap-2 text-sm font-extrabold uppercase text-[#08736f] before:h-0.5 before:w-7 before:bg-teal before:content-['']">
            обязательный входной тест
          </div>
          <h1 className="max-w-2xl text-5xl font-black leading-none tracking-normal text-ink md:text-7xl">
            Профориентация через реальные предприятия
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
            Пользователь проходит короткий тест, получает профиль интересов, выбирает рекомендованную компанию и пробует профессию в игровом сценарии.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={() => setScreen(screens.TEST)}>
              <Play size={18} /> Начать тест
            </button>
            <a className="btn btn-secondary" href="#flow">
              <MapPinned size={18} /> Посмотреть путь
            </a>
          </div>
        </div>
        <div className="absolute inset-x-5 bottom-6 grid overflow-hidden rounded-panel border border-line bg-line shadow-hero md:grid-cols-4 lg:inset-x-12">
          {[
            ["10", "вопросов в MVP-тесте"],
            ["3–5", "рекомендованных предприятий"],
            ["2", "уровня результата"],
            ["B2B", "карточки и сценарии компаний"]
          ].map(([value, label]) => (
            <div key={label} className="min-h-[74px] bg-white/95 p-4">
              <strong className="block text-2xl">{value}</strong>
              <span className="text-sm text-muted">{label}</span>
            </div>
          ))}
        </div>
      </section>
      <main id="flow" className="px-5 py-10 lg:px-12">
        <section className="mx-auto max-w-6xl">
          <div className="mb-5">
            <h2 className="text-3xl font-black md:text-4xl">Пользовательский маршрут</h2>
            <p className="mt-2 max-w-3xl leading-7 text-muted">
              Предприятие открывается после диагностики, а финальный результат складывается из общего теста и сценария компании.
            </p>
          </div>
          <div className="panel grid overflow-hidden bg-line md:grid-cols-5">
            {[
              ["Старт и тест", "Пользователь отвечает на вопросы с балльной оценкой."],
              ["Профиль интересов", "Система считает теги, склонности и направления."],
              ["Подбор предприятий", "Компании ранжируются по совпадению профиля."],
              ["Карточка компании", "Внутри карточки доступны профессии и квест."],
              ["Финальный итог", "Итог объединяет тест, игру и рекомендации."]
            ].map(([title, text], index) => (
              <div key={title} className="min-h-36 bg-white p-5">
                <span className="mb-4 grid size-8 place-items-center rounded-full bg-teal/10 font-black text-[#08736f]">
                  {index + 1}
                </span>
                <h3 className="font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function Test({ bootstrap, answers, setAnswers, setScreen }) {
  const questions = bootstrap.test?.questions || [];
  const [index, setIndex] = useState(0);
  const question = questions[index];
  const selected = answers[index];

  if (!question) {
    return <main className="p-8">Тест не загружен.</main>;
  }

  function choose(answer) {
    const next = [...answers];
    next[index] = answer;
    setAnswers(next);
  }

  return (
    <main className="px-5 py-10 lg:px-12">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
        <Status answers={answers} questions={questions} scenarioAnswers={[]} screen={screens.TEST} />
        <div className="panel p-5 md:p-8">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-gradient-to-r from-teal to-amber" style={{ width: `${(index / questions.length) * 100}%` }} />
          </div>
          <div className="my-4 flex justify-between gap-3 text-sm text-muted">
            <span>Вопрос {index + 1} из {questions.length}</span>
            <span>{question.hint}</span>
          </div>
          <h2 className="mb-5 text-3xl font-black">{question.text}</h2>
          <div className="grid gap-3">
            {question.answers.map((answer) => (
              <button
                key={answer.id}
                className={classNames(
                  "flex min-h-[58px] items-start gap-3 rounded-panel border border-line bg-white p-4 text-left hover:border-teal hover:bg-teal/5",
                  selected?.id === answer.id && "border-teal bg-teal/5"
                )}
                onClick={() => choose(answer)}
              >
                <span className={classNames("mt-0.5 size-5 rounded-full border-2 border-slate-300", selected?.id === answer.id && "border-[6px] border-teal")} />
                <span>{answer.text}</span>
              </button>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              <ArrowLeft size={18} /> Назад
            </button>
            <button
              className="btn btn-primary"
              disabled={!selected}
              onClick={() => (index === questions.length - 1 ? setScreen(screens.RESULT) : setIndex(index + 1))}
            >
              {index === questions.length - 1 ? "Показать результат" : "Дальше"} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Result({ bootstrap, answers, preview, setPreview, setSelectedEnterprise, setScreen }) {
  useEffect(() => {
    if (!answers.length) return;
    api("/results/preview", {
      method: "POST",
      body: JSON.stringify({ answerIds: answers.map((answer) => answer.id) })
    })
      .then(setPreview)
      .catch(() => {
        setPreview({ title: "Предварительный профиль", topTags: [], enterprises: bootstrap.enterprises || [] });
      });
  }, [answers, bootstrap.enterprises, setPreview]);

  const enterprises = preview?.enterprises?.length ? preview.enterprises : bootstrap.enterprises || [];

  return (
    <main className="px-5 py-10 lg:px-12">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
        <Status answers={answers} questions={bootstrap.test?.questions || []} scenarioAnswers={[]} screen={screens.RESULT} />
        <div>
          <h2 className="text-3xl font-black md:text-4xl">{preview?.title || "Предварительный результат"}</h2>
          <p className="mt-2 max-w-3xl leading-7 text-muted">
            Результат входного теста используется для персонализации списка предприятий и объяснения рекомендаций.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="panel p-5">
              <h3 className="font-extrabold">Ваши сильные направления</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(preview?.topTags || []).map((tag) => (
                  <span key={tag.code} className="tag tag-teal">{tag.label}</span>
                ))}
              </div>
            </div>
            <div className="panel p-5">
              <h3 className="font-extrabold">Как считается подбор</h3>
              <p className="mt-2 leading-7 text-muted">Совпадение = сумма весов совпавших тегов / сумма значимых тегов предприятия.</p>
            </div>
          </div>
          <h2 className="mb-4 mt-8 text-3xl font-black">Рекомендованные предприятия</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {enterprises.map((enterprise) => (
              <article key={enterprise.id} className="panel flex min-h-[292px] flex-col justify-between p-5">
                <div>
                  <div className="mb-3 flex justify-between gap-3 text-sm text-muted">
                    <span>{enterprise.sector} · {enterprise.city}</span>
                    <strong className="text-[#08736f]">{enterprise.match ?? 0}%</strong>
                  </div>
                  <h3 className="text-xl font-black">{enterprise.name}</h3>
                  <p className="mt-2 leading-7 text-muted">{enterprise.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.keys(enterprise.tags || {}).slice(0, 4).map((tag) => (
                      <span key={tag} className="tag">{profileLabels[tag] || tag}</span>
                    ))}
                  </div>
                </div>
                <button
                  className="btn btn-primary mt-5"
                  onClick={() => {
                    setSelectedEnterprise(enterprise);
                    setScreen(screens.ENTERPRISE);
                  }}
                >
                  Открыть карточку <ArrowRight size={18} />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Enterprise({ enterprise, answers, questions, setScreen }) {
  return (
    <main className="px-5 py-10 lg:px-12">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
        <Status answers={answers} questions={questions} enterprise={enterprise} scenarioAnswers={[]} screen={screens.ENTERPRISE} />
        <div className="panel p-5 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-3 text-sm text-muted">{enterprise.sector} · {enterprise.city}</div>
              <h2 className="text-4xl font-black">{enterprise.name}</h2>
              <p className="mt-4 leading-7 text-muted">{enterprise.description}</p>
              <ul className="mt-5 grid gap-3">
                {[enterprise.reason, "Сценарий содержит вопросы, задания, ответы, баллы и обратную связь.", "Итог будет объединен с результатом входного теста."].map((item) => (
                  <li key={item} className="grid grid-cols-[26px_1fr] gap-3 text-muted">
                    <span className="grid size-6 place-items-center rounded-full bg-green-50 text-green-700"><Check size={15} /></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <button className="btn btn-primary" onClick={() => setScreen(screens.SCENARIO)}>
                  <Play size={18} /> Запустить сценарий
                </button>
                <button className="btn btn-ghost" onClick={() => setScreen(screens.RESULT)}>
                  <ArrowLeft size={18} /> К подборке
                </button>
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-xl font-black">Профессии предприятия</h3>
              <div className="grid gap-3">
                {enterprise.professions.map((profession) => (
                  <div key={profession.title} className="rounded-panel border border-line bg-white p-4">
                    <strong>{profession.title}</strong>
                    <p className="mt-1 text-sm leading-6 text-muted">{profession.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Scenario({ enterprise, answers, questions, scenarioAnswers, setScenarioAnswers, setScreen }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const tasks = enterprise.scenario?.tasks || [];
  const task = tasks[index];
  const selected = scenarioAnswers[index];
  const total = scenarioAnswers.reduce((sum, answer) => sum + Number(answer?.points || 0), 0);

  function choose(answer) {
    const next = [...scenarioAnswers];
    next[index] = answer;
    setScenarioAnswers(next);
    setFeedback(task.feedback);
  }

  return (
    <main className="px-5 py-10 lg:px-12">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
        <Status answers={answers} questions={questions} enterprise={enterprise} scenarioAnswers={scenarioAnswers} screen={screens.SCENARIO} />
        <div className="grid gap-5 lg:grid-cols-[1fr_310px]">
          <div className="panel p-5 md:p-8">
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-gradient-to-r from-teal to-amber" style={{ width: `${(index / tasks.length) * 100}%` }} />
            </div>
            <div className="my-4 flex justify-between gap-3 text-sm text-muted">
              <span>{enterprise.name}: этап {index + 1} из {tasks.length}</span>
              <span>{selected ? `+${selected.points} баллов` : "ожидает решения"}</span>
            </div>
            <h2 className="text-3xl font-black">{task.title}</h2>
            <p className="mt-2 leading-7 text-muted">{task.prompt}</p>
            <div className="my-5 grid min-h-64 place-items-center rounded-panel border border-line bg-[repeating-linear-gradient(90deg,#f6f9fb_0,#f6f9fb_22px,#eef3f6_22px,#eef3f6_23px)] p-5">
              <div className="grid w-full gap-3 sm:grid-cols-3">
                {task.visual.map((item, itemIndex) => (
                  <div key={item} className={classNames("grid min-h-16 place-items-center rounded-panel border border-slate-300 bg-white p-3 text-center text-sm font-extrabold text-slate-600", itemIndex % 3 === 0 && "border-amber bg-amber/10 text-[#9b5f15]")}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              {task.answers.map((answer) => (
                <button
                  key={answer.id}
                  className={classNames("flex min-h-[58px] items-start gap-3 rounded-panel border border-line bg-white p-4 text-left hover:border-teal hover:bg-teal/5", selected?.id === answer.id && "border-teal bg-teal/5")}
                  onClick={() => choose(answer)}
                >
                  <span className={classNames("mt-0.5 size-5 rounded-full border-2 border-slate-300", selected?.id === answer.id && "border-[6px] border-teal")} />
                  <span>{answer.text}</span>
                </button>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                <ArrowLeft size={18} /> Назад
              </button>
              <button
                className="btn btn-primary"
                disabled={!selected}
                onClick={() => (index === tasks.length - 1 ? setScreen(screens.FINAL) : (setIndex(index + 1), setFeedback("")))}
              >
                {index === tasks.length - 1 ? "Финальный итог" : "Следующий этап"} <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <aside className="panel p-5">
            <h3 className="font-black">Баллы сценария</h3>
            <div className="my-3 text-5xl font-black text-[#08736f]">{total}</div>
            <div className={classNames("min-h-24 rounded-panel bg-slate-50 p-4 leading-7 text-slate-700", feedback && selected?.isPreferred && "bg-green-50", feedback && !selected?.isPreferred && "bg-red-50")}>
              {feedback || "После выбора ответа здесь появится обратная связь по шагу."}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Final({ enterprise, answers, preview, scenarioAnswers, questions, setScreen, reset }) {
  const [serverResult, setServerResult] = useState(null);
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    api("/results/final", {
      method: "POST",
      body: JSON.stringify({
        answerIds: answers.map((answer) => answer.id),
        enterpriseId: enterprise.id,
        scenarioAnswers
      })
    })
      .then(setServerResult)
      .catch(() => setServerResult(null));
  }, [answers, enterprise.id, scenarioAnswers]);

  const total = scenarioAnswers.reduce((sum, answer) => sum + Number(answer?.points || 0), 0);
  const recommendation = serverResult?.enterpriseResult?.recommendation || enterprise.professions[0];
  const aiEvaluation = serverResult?.enterpriseResult?.aiEvaluation;
  const evaluationMode = serverResult?.enterpriseResult?.evaluationMode === "llm" ? "LLM" : "fallback";

  async function sendEmail() {
    const response = await api("/email-results", {
      method: "POST",
      body: JSON.stringify({ email: "demo@example.com", resultId: serverResult?.sessionKey })
    });
    setEmailMessage(response.message);
  }

  return (
    <main className="px-5 py-10 lg:px-12">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">
        <Status answers={answers} questions={questions} enterprise={enterprise} scenarioAnswers={scenarioAnswers} screen={screens.FINAL} />
        <div className="panel p-5 md:p-8">
          <div className="mb-3 flex justify-between gap-3 text-sm text-muted">
            <span>финальный результат</span>
            <span>{total} баллов</span>
          </div>
          <h2 className="text-3xl font-black md:text-4xl">{preview?.title || "Профиль"} + сценарий «{enterprise.name}»</h2>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">
            Общий профиль входного теста объединен с прохождением сценария предприятия. Так пользователь получает не абстрактный результат, а связку с конкретной компанией и профессиями.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-panel bg-soft p-5">
              <h3 className="font-black">Рекомендация по профессии</h3>
              <p className="mt-2 leading-7">
                <strong>{recommendation?.title}</strong><br />
                {recommendation?.description}
              </p>
            </div>
            <div className="rounded-panel bg-soft p-5">
              <h3 className="font-black">Почему это подходит</h3>
              <p className="mt-2 leading-7 text-slate-700">{enterprise.reason}</p>
            </div>
          </div>
          {aiEvaluation && (
            <div className="mt-5 rounded-panel bg-soft p-5">
              <div className="mb-2 flex justify-between gap-3 text-sm font-extrabold text-muted">
                <span>ИИ-оценка сценария предприятия</span>
                <span>{evaluationMode}</span>
              </div>
              <h3 className="font-black">{aiEvaluation.readinessLevel}</h3>
              <p className="mt-2 leading-7 text-slate-700">{aiEvaluation.summary}</p>
              <p className="mt-2 leading-7"><strong>HR:</strong> {aiEvaluation.hrComment}</p>
            </div>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={sendEmail}>
              <Mail size={18} /> Отправить на email
            </button>
            <button className="btn btn-secondary" onClick={() => setScreen(screens.RESULT)}>
              <MapPinned size={18} /> Другие предприятия
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              <RefreshCcw size={18} /> Пройти заново
            </button>
          </div>
          {emailMessage && <p className="mt-4 font-extrabold text-green-700">{emailMessage}</p>}
        </div>
      </section>
    </main>
  );
}

function Admin() {
  return (
    <main className="px-5 py-10 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-black md:text-4xl">Административная часть</h2>
        <p className="mt-2 max-w-3xl leading-7 text-muted">
          Управление разделено на общеплатформенный входной тест и самостоятельный контент предприятий.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            [BarChart3, "Общеплатформенный тест", ["Вопросы стартового теста", "Баллы, теги и веса", "Категории результата", "Алгоритм подбора предприятий"]],
            [Factory, "Карточки предприятий", ["Основная информация и контакты", "Профессии и компетенции", "Игровые задания и ответы", "Финальные интерпретации"]],
            [Sparkles, "Сущности данных", ["GlobalOrientationTest", "EnterpriseGameScenario", "UserSession", "UserResult"]],
            [Settings, "Технический стек", ["React/Vite/Tailwind", "Express + Node.js 20+", "SQLite 3 без ORM", "Docker compose"]]
          ].map(([Icon, title, items]) => (
            <article key={title} className="panel min-h-56 p-5">
              <h3 className="flex items-center gap-2 text-xl font-black"><Icon size={20} /> {title}</h3>
              <ul className="mt-4 grid gap-2 pl-5 text-muted [list-style:disc]">
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState(screens.HOME);
  const [bootstrap, setBootstrap] = useState(fallbackBootstrap);
  const [answers, setAnswers] = useState([]);
  const [preview, setPreview] = useState(null);
  const [selectedEnterprise, setSelectedEnterprise] = useState(null);
  const [scenarioAnswers, setScenarioAnswers] = useState([]);

  useEffect(() => {
    api("/bootstrap").then(setBootstrap).catch(() => setBootstrap(fallbackBootstrap));
  }, []);

  const questions = bootstrap.test?.questions || [];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  function navigate(nextScreen) {
    if (nextScreen === screens.RESULT && answers.length < questions.length) return setScreen(screens.TEST);
    setScreen(nextScreen);
  }

  function reset() {
    setAnswers([]);
    setPreview(null);
    setSelectedEnterprise(null);
    setScenarioAnswers([]);
    setScreen(screens.HOME);
  }

  const content = useMemo(() => {
    if (screen === screens.HOME) return <Home setScreen={setScreen} />;
    if (screen === screens.TEST) return <Test bootstrap={bootstrap} answers={answers} setAnswers={setAnswers} setScreen={setScreen} />;
    if (screen === screens.RESULT) return <Result bootstrap={bootstrap} answers={answers} preview={preview} setPreview={setPreview} setSelectedEnterprise={setSelectedEnterprise} setScreen={setScreen} />;
    if (screen === screens.ENTERPRISE && selectedEnterprise) return <Enterprise enterprise={selectedEnterprise} answers={answers} questions={questions} setScreen={setScreen} />;
    if (screen === screens.SCENARIO && selectedEnterprise) return <Scenario enterprise={selectedEnterprise} answers={answers} questions={questions} scenarioAnswers={scenarioAnswers} setScenarioAnswers={setScenarioAnswers} setScreen={setScreen} />;
    if (screen === screens.FINAL && selectedEnterprise) return <Final enterprise={selectedEnterprise} answers={answers} preview={preview} scenarioAnswers={scenarioAnswers} questions={questions} setScreen={setScreen} reset={reset} />;
    if (screen === screens.ADMIN) return <Admin />;
    return <Home setScreen={setScreen} />;
  }, [answers, bootstrap, preview, questions, scenarioAnswers, screen, selectedEnterprise]);

  return <Shell screen={screen} setScreen={navigate}>{content}</Shell>;
}
