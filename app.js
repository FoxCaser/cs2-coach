const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const titles = {
  dashboard: "Огляд гравця",
  analysis: "Аналіз",
  training: "Тренування",
  progress: "Прогрес",
  profile: "Профіль"
};

function showPage(id) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === id));
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === id));
  $("#pageTitle").textContent = titles[id] || "CS2 Coach";
}

$$(".nav-btn").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));
$$("[data-jump]").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.jump)));

async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  const p = data.player;
  const stats = [
    ["RATING", p.rating],
    ["K/D", p.kd],
    ["HEADSHOT", `${p.hs}%`],
    ["ADR", p.adr],
    ["WIN RATE", `${p.winrate}%`]
  ];

  $("#statsGrid").innerHTML = stats.map(([label,value]) =>
    `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`
  ).join("");

  $("#recentMatches").innerHTML = data.recent.map(m =>
    `<div class="match-row">
      <b class="${m.result === "W" ? "win" : "loss"}">${m.result}</b>
      <span>${m.map}</span><span>${m.score}</span><span>${m.kd}</span>
    </div>`
  ).join("");

  $("#focusList").innerHTML = data.focus.map(f =>
    `<div class="focus-item">
      <div class="focus-top"><b>${f.title}</b><span>${f.value}%</span></div>
      <div class="bar"><i style="width:${f.value}%"></i></div>
      <p>${f.note}</p>
    </div>`
  ).join("");
}

async function loadTraining() {
  const res = await fetch("/api/training-plan");
  const data = await res.json();
  $("#trainingPlan").innerHTML = data.days.map(d =>
    `<div class="day-card"><b>${d.day}</b><ul>${d.tasks.map(t => `<li>${t}</li>`).join("")}</ul></div>`
  ).join("");
}

$("#analyzeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const body = {
    nickname: fd.get("nickname"),
    stats: {
      kd: fd.get("kd"),
      hs: fd.get("hs"),
      adr: fd.get("adr")
    }
  };

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  const box = $("#analysisResult");
  box.classList.remove("hidden");
  box.innerHTML = `
    <span class="eyebrow">COACH SCORE</span>
    <div class="result-score">${data.score}/100</div>
    <p class="muted">${data.summary}</p>
    <ul>${data.tips.map(t => `<li>${t}</li>`).join("")}</ul>
  `;
});

Promise.all([loadDashboard(), loadTraining()]).catch(console.error);
