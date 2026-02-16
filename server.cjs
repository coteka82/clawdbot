const express = require("express");
const cors = require("cors");
const { upsertLead } = require("./services/sheets.cjs");

const app = express();
app.use(cors());
app.use(express.json());

// Health check

app.get("/", (req, res) => {
  res.send("Clawdbot API is running 🚀");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// Create or update lead
app.post("/lead", async (req, res) => {
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
    console.error(err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
