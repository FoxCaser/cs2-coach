const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const titles = {
  dashboard: "Огляд гравця",
  analysis: "Аналіз",
  training: "Тренування",
  progress: "Прогрес",
  profile: "Профіль",
};

let currentSteamUser = null;

function showPage(id) {
  $$(".page").forEach((p) => p.classList.toggle("active", p.id === id));
  $$(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === id)
  );
  $("#pageTitle").textContent = titles[id] || "CS2 Coach";
  history.replaceState(null, "", `#${id}`);
}

function setupNavigation() {
  $$(".nav-btn").forEach((btn) =>
    btn.addEventListener("click", () => showPage(btn.dataset.page))
  );
  $$("[data-jump]").forEach((btn) =>
    btn.addEventListener("click", () => showPage(btn.dataset.jump))
  );

  const hash = location.hash.replace("#", "");
  if (titles[hash]) showPage(hash);
}

async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  const p = data.player;
  const stats = [
    ["RATING", p.rating],
    ["K/D", p.kd],
    ["HEADSHOT", `${p.hs}%`],
    ["ADR", p.adr],
    ["WIN RATE", `${p.winrate}%`],
  ];

  $("#statsGrid").innerHTML = stats
    .map(
      ([label, value]) =>
        `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`
    )
    .join("");

  $("#recentMatches").innerHTML = data.recent
    .map(
      (m) => `
      <div class="match-row">
        <b class="${m.result === "W" ? "win" : "loss"}">${m.result}</b>
        <span>${m.map}</span>
        <span>${m.score}</span>
        <span>${m.kd}</span>
      </div>`
    )
    .join("");

  $("#focusList").innerHTML = data.focus
    .map(
      (f) => `
      <div class="focus-item">
        <div class="focus-top"><b>${f.title}</b><span>${f.value}%</span></div>
        <div class="bar"><i style="width:${f.value}%"></i></div>
        <p>${f.note}</p>
      </div>`
    )
    .join("");
}

async function loadTraining() {
  const res = await fetch("/api/training-plan");
  const data = await res.json();

  $("#trainingPlan").innerHTML = data.days
    .map(
      (d) =>
        `<div class="day-card"><b>${d.day}</b><ul>${d.tasks
          .map((t) => `<li>${t}</li>`)
          .join("")}</ul></div>`
    )
    .join("");
}

function initials(name = "FC") {
  const clean = name.trim();
  if (!clean) return "FC";
  const bits = clean.split(/\s+/).slice(0, 2);
  return bits.map((x) => x[0]?.toUpperCase() || "").join("") || "FC";
}

function showSteamNotice() {
  const params = new URLSearchParams(location.search);
  const status = params.get("steam");
  const notice = $("#steamMessage");

  const messages = {
    connected: ["success", "Steam успішно підключено."],
    error: ["error", "Не вдалося завершити вхід через Steam. Спробуй ще раз."],
    "not-configured": [
      "error",
      "Steam API Key ще не підключений на сервері.",
    ],
  };

  if (!status || !messages[status]) return;

  notice.className = `notice ${messages[status][0]}`;
  notice.textContent = messages[status][1];

  const cleanUrl = `${location.pathname}${location.hash || "#profile"}`;
  history.replaceState(null, "", cleanUrl);
}

async function loadMe() {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  const data = await res.json();

  const out = $("#loggedOutProfile");
  const inside = $("#loggedInProfile");
  const sideTitle = $("#sideSteamTitle");
  const sideText = $("#sideSteamText");
  const topState = $("#topSteamState");
  const topAvatar = $("#topAvatar");

  if (!data.authenticated) {
    currentSteamUser = null;
    out.classList.remove("hidden");
    inside.classList.add("hidden");
    sideTitle.textContent = data.steamConfigured ? "Steam не підключено" : "Потрібен API Key";
    sideText.textContent = data.steamConfigured
      ? "Увійди через Steam у розділі Профіль."
      : "Додай STEAM_API_KEY у Render.";
    topState.textContent = "Steam не підключено";
    topAvatar.textContent = "FC";
    topAvatar.style.backgroundImage = "";
    return;
  }

  currentSteamUser = data.user;
  out.classList.add("hidden");
  inside.classList.remove("hidden");

  $("#steamName").textContent = data.user.username || "Steam Player";
  $("#steamId").textContent = `SteamID64: ${data.user.steamid}`;

  const avatar = $("#steamAvatar");
  if (data.user.avatar) {
    avatar.src = data.user.avatar;
    avatar.classList.remove("no-avatar");
  } else {
    avatar.removeAttribute("src");
    avatar.classList.add("no-avatar");
  }

  const profileLink = $("#steamProfileLink");
  if (data.user.profile) {
    profileLink.href = data.user.profile;
    profileLink.classList.remove("hidden");
  } else {
    profileLink.classList.add("hidden");
  }

  sideTitle.textContent = data.user.username || "Steam підключено";
  sideText.textContent = `SteamID64: ${data.user.steamid}`;
  topState.textContent = data.user.username || "Steam підключено";

  if (data.user.avatar) {
    topAvatar.textContent = "";
    topAvatar.style.backgroundImage = `url("${data.user.avatar}")`;
  } else {
    topAvatar.textContent = initials(data.user.username);
    topAvatar.style.backgroundImage = "";
  }

  const nick = $("#nicknameInput");
  if (nick) nick.value = data.user.username || nick.value;
}

$("#analyzeForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(e.currentTarget);
  const body = {
    nickname: fd.get("nickname"),
    stats: {
      kd: fd.get("kd"),
      hs: fd.get("hs"),
      adr: fd.get("adr"),
    },
  };

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  const box = $("#analysisResult");
  box.classList.remove("hidden");
  box.innerHTML = `
    <span class="eyebrow">COACH SCORE</span>
    <div class="result-score">${data.score}/100</div>
    <p class="muted">${data.summary}</p>
    <ul>${data.tips.map((t) => `<li>${t}</li>`).join("")}</ul>
  `;
});

$("#logoutBtn").addEventListener("click", async () => {
  const btn = $("#logoutBtn");
  btn.disabled = true;
  btn.textContent = "Вихід...";

  try {
    const res = await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    if (!res.ok) throw new Error("logout failed");

    await loadMe();
    await loadDashboard();
    showPage("profile");
  } catch (error) {
    console.error(error);
    alert("Не вдалося вийти. Спробуй ще раз.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Вийти";
  }
});

setupNavigation();
showSteamNotice();

Promise.all([loadDashboard(), loadTraining(), loadMe()]).catch((error) => {
  console.error(error);
});
