# CS2 Coach

Version 1.1 adds Steam OpenID sign-in.

## Current features
- responsive UI;
- dashboard;
- quick K/D, HS%, ADR analyzer;
- training plan;
- Steam login/profile session;
- SteamID64, nickname, avatar and profile link;
- Render-ready Node.js + Express app.

## Required Render environment variables
- `STEAM_API_KEY` — Steam Web API key.
- `SESSION_SECRET` — long random value used to sign sessions.

Render supplies `RENDER_EXTERNAL_URL`, so the Steam callback URL is built automatically.

## Local run
```bash
npm install
npm start
```
