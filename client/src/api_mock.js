export const profileLabels = {
  energy: "Энергетика",
  manufacturing: "Производство",
  ecology: "Экология",
  science: "Лаборатории",
  engineering: "Инженерия",
  logistics: "Логистика",
  digital: "Цифровые задачи"
};

export const fallbackBootstrap = {
  test: {
    title: "Входной профориентационный тест",
    description: "Единый стартовый тест платформы для первичной диагностики и маршрутизации.",
    questions: [
      {
        id: 1,
        text: "Какая сфера промышленности вам интереснее?",
        hint: "Этот ответ сильнее всего влияет на подбор предприятий.",
        answers: [
          { id: 1, text: "Энергетика и инфраструктура", tags: { energy: 3, engineering: 1 } },
          { id: 2, text: "Производство и техника", tags: { manufacturing: 3, engineering: 1 } },
          { id: 3, text: "Лаборатории и экология", tags: { ecology: 3, science: 1 } }
        ]
      }
    ]
  },
  enterprises: []
};
