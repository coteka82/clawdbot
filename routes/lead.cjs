const express = require("express");
const router = express.Router();
const { upsertLead } = require("../services/sheets.cjs");

router.post("/", async (req, res) => {
  try {
    const { name, company, email, message, source } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const result = await upsertLead({
      name,
      company,
      email,
      message,
      source: source || "api",
      status: "Pending",
    });

    res.json({ ok: true, result });
  } catch (err) {
    console.error("Lead error:", err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

module.exports = router;
