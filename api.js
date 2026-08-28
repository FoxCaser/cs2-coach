const express = require("express");
const router = express.Router();
const { getDashboard, analyzePlayer, getTrainingPlan } = require("../services/coach");

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "cs2-coach" });
});

router.get("/dashboard", (req, res) => {
  res.json(getDashboard());
});

router.post("/analyze", (req, res) => {
  const { nickname = "Player", stats = {} } = req.body || {};
  res.json(analyzePlayer(nickname, stats));
});

router.get("/training-plan", (req, res) => {
  res.json(getTrainingPlan());
});

module.exports = router;
