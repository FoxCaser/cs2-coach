const demo = {
  player: {
    nickname: "FoxCaser",
    rating: 1.08,
    kd: 1.04,
    hs: 48,
    adr: 79.6,
    winrate: 54,
    matches: 128
  },
  recent: [
    { map: "Mirage", result: "W", score: "13:9", kd: "22 / 16", rating: 1.24 },
    { map: "Inferno", result: "L", score: "10:13", kd: "17 / 20", rating: 0.94 },
    { map: "Ancient", result: "W", score: "13:7", kd: "19 / 12", rating: 1.31 }
  ],
  focus: [
    { title: "Crosshair placement", value: 72, note: "Тримай приціл на рівні голови ще до піку." },
    { title: "Counter-strafe", value: 64, note: "Додай 10 хвилин stop-shoot вправ щодня." },
    { title: "Utility usage", value: 58, note: "Вивчи 3 базові гранати для Mirage та Inferno." }
  ]
};

function getDashboard() {
  return { ok: true, ...demo };
}

function analyzePlayer(nickname, stats) {
  const kd = Number(stats.kd ?? 1.0);
  const hs = Number(stats.hs ?? 45);
  const adr = Number(stats.adr ?? 75);

  const tips = [];
  if (kd < 1) tips.push("Зменш кількість ризикових перших контактів і частіше грай від трейду.");
  else tips.push("K/D стабільний — працюй над впливом у ключових раундах.");

  if (hs < 45) tips.push("Зосередься на crosshair placement і коротких burst-серіях.");
  else tips.push("Headshot% хороший — підтримуй дисципліну першої кулі.");

  if (adr < 75) tips.push("Піднімай ADR через гранати, prefire і кращий вибір позицій.");
  else tips.push("ADR у робочому діапазоні — підвищуй конверсію damage у фраги.");

  return {
    ok: true,
    nickname,
    score: Math.max(40, Math.min(99, Math.round(60 + (kd - 1) * 20 + (hs - 45) * 0.3 + (adr - 75) * 0.25))),
    summary: "Початковий локальний аналіз. Пізніше сюди підключимо реальні матчі та AI.",
    tips
  };
}

function getTrainingPlan() {
  return {
    ok: true,
    days: [
      { day: "Пн", tasks: ["10 хв aim warmup", "10 хв counter-strafe", "2 Mirage utility"] },
      { day: "Вт", tasks: ["15 хв DM", "Prefire Mirage", "Перегляд 1 демо"] },
      { day: "Ср", tasks: ["10 хв spray", "10 хв aim", "2 Inferno utility"] },
      { day: "Чт", tasks: ["15 хв DM", "Prefire Inferno", "Робота над піками"] },
      { day: "Пт", tasks: ["10 хв aim", "10 хв movement", "1 матч з фокусом на трейди"] }
    ]
  };
}

module.exports = { getDashboard, analyzePlayer, getTrainingPlan };
