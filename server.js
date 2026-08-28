require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const morgan = require("morgan");
const session = require("express-session");
const SteamAuth = require("node-steam-openid");

const app = express();
const PORT = process.env.PORT || 3000;

const rawBaseUrl =
  process.env.RENDER_EXTERNAL_URL ||
  process.env.APP_URL ||
  `http://localhost:${PORT}`;

const BASE_URL = rawBaseUrl.replace(/\/+$/, "");
const STEAM_API_KEY = process.env.STEAM_API_KEY || "";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash("sha256").update(`cs2-coach:${STEAM_API_KEY || "dev"}`).digest("hex");

if (!STEAM_API_KEY) {
  console.warn("STEAM_API_KEY is not configured. Steam login will be unavailable.");
}
if (!process.env.SESSION_SECRET) {
  console.warn("SESSION_SECRET is not configured. Add it in Render Environment for a stable secure session secret.");
}

const steam = STEAM_API_KEY
  ? new SteamAuth({
      realm: BASE_URL,
      returnUrl: `${BASE_URL}/auth/steam/authenticate`,
      apiKey: STEAM_API_KEY,
    })
  : null;

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("tiny"));

app.use(
  session({
    name: "cs2coach.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: BASE_URL.startsWith("https://"),
      maxAge: 1000 * 60 * 60 * 24 * 14,
    },
  })
);

const demo = {
  player: {
    nickname: "FoxCaser",
    rating: 1.08,
    kd: 1.04,
    hs: 48,
    adr: 79.6,
    winrate: 54,
    matches: 128,
  },
  recent: [
    { map: "Mirage", result: "W", score: "13:9", kd: "22 / 16", rating: 1.24 },
    { map: "Inferno", result: "L", score: "10:13", kd: "17 / 20", rating: 0.94 },
    { map: "Ancient", result: "W", score: "13:7", kd: "19 / 12", rating: 1.31 },
  ],
  focus: [
    {
      title: "Crosshair placement",
      value: 72,
      note: "Тримай приціл на рівні голови ще до піку.",
    },
    {
      title: "Counter-strafe",
      value: 64,
      note: "Додай 10 хвилин stop-shoot вправ щодня.",
    },
    {
      title: "Utility usage",
      value: 58,
      note: "Вивчи 3 базові гранати для Mirage та Inferno.",
    },
  ],
};

function normalizeSteamUser(user) {
  const raw = user?._json || {};
  const profile =
    typeof user?.profile === "string"
      ? user.profile
      : user?.profile?.url || raw.profileurl || "";

  const avatar =
    user?.avatar?.large ||
    user?.avatar?.medium ||
    raw.avatarfull ||
    raw.avatarmedium ||
    raw.avatar ||
    "";

  return {
    steamid: String(user?.steamid || raw.steamid || ""),
    username: user?.username || raw.personaname || "Steam Player",
    name: user?.name || raw.realname || "",
    profile,
    avatar,
  };
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "cs2-coach",
    steamConfigured: Boolean(STEAM_API_KEY),
  });
});

app.get("/api/dashboard", (req, res) => {
  const connectedName = req.session?.steamUser?.username;
  const player = {
    ...demo.player,
    nickname: connectedName || demo.player.nickname,
  };

  res.json({ ok: true, ...demo, player });
});

app.get("/api/me", (req, res) => {
  if (!req.session?.steamUser) {
    return res.json({
      ok: true,
      authenticated: false,
      steamConfigured: Boolean(STEAM_API_KEY),
    });
  }

  res.json({
    ok: true,
    authenticated: true,
    steamConfigured: Boolean(STEAM_API_KEY),
    user: req.session.steamUser,
  });
});

app.get("/auth/steam", async (req, res) => {
  if (!steam) {
    return res.redirect("/?steam=not-configured#profile");
  }

  try {
    const redirectUrl = await steam.getRedirectUrl();
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Steam redirect error:", error);
    return res.redirect("/?steam=error#profile");
  }
});

app.get("/auth/steam/authenticate", async (req, res) => {
  if (!steam) {
    return res.redirect("/?steam=not-configured#profile");
  }

  try {
    const user = await steam.authenticate(req);
    const safeUser = normalizeSteamUser(user);

    if (!safeUser.steamid) {
      throw new Error("Steam returned no SteamID.");
    }

    req.session.steamUser = safeUser;

    req.session.save((saveError) => {
      if (saveError) {
        console.error("Session save error:", saveError);
        return res.redirect("/?steam=error#profile");
      }
      return res.redirect("/?steam=connected#profile");
    });
  } catch (error) {
    console.error("Steam authentication error:", error);
    return res.redirect("/?steam=error#profile");
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);
      return res.status(500).json({ ok: false, error: "logout_failed" });
    }

    res.clearCookie("cs2coach.sid");
    res.json({ ok: true });
  });
});

app.post("/api/analyze", (req, res) => {
  const { nickname = "Player", stats = {} } = req.body || {};
  const kd = Number(stats.kd ?? 1.0);
  const hs = Number(stats.hs ?? 45);
  const adr = Number(stats.adr ?? 75);

  const tips = [];
  if (kd < 1) {
    tips.push("Зменш кількість ризикових перших контактів і частіше грай від трейду.");
  } else {
    tips.push("K/D стабільний — працюй над впливом у ключових раундах.");
  }

  if (hs < 45) {
    tips.push("Зосередься на crosshair placement і коротких burst-серіях.");
  } else {
    tips.push("Headshot% хороший — підтримуй дисципліну першої кулі.");
  }

  if (adr < 75) {
    tips.push("Піднімай ADR через гранати, prefire і кращий вибір позицій.");
  } else {
    tips.push("ADR у робочому діапазоні — підвищуй конверсію damage у фраги.");
  }

  res.json({
    ok: true,
    nickname,
    score: Math.max(
      40,
      Math.min(
        99,
        Math.round(
          60 +
            (kd - 1) * 20 +
            (hs - 45) * 0.3 +
            (adr - 75) * 0.25
        )
      )
    ),
    summary:
      "Початковий локальний аналіз. Пізніше сюди підключимо реальні матчі та AI.",
    tips,
  });
});

app.get("/api/training-plan", (req, res) => {
  res.json({
    ok: true,
    days: [
      { day: "Пн", tasks: ["10 хв aim warmup", "10 хв counter-strafe", "2 Mirage utility"] },
      { day: "Вт", tasks: ["15 хв DM", "Prefire Mirage", "Перегляд 1 демо"] },
      { day: "Ср", tasks: ["10 хв spray", "10 хв aim", "2 Inferno utility"] },
      { day: "Чт", tasks: ["15 хв DM", "Prefire Inferno", "Робота над піками"] },
      { day: "Пт", tasks: ["10 хв aim", "10 хв movement", "1 матч з фокусом на трейди"] },
    ],
  });
});

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`CS2 Coach started on port ${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
});
