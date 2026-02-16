const express = require("express");
const cors = require("cors");

const { upsertLead } = require("./services/sheets.cjs");
const { getAuthUrl, handleOAuthCallback } = require("./services/googleOAuth.cjs");

const app = express();

// ✅ CORS for Netlify + local dev
app.use(cors({
  origin: [
    "http://localhost:8888",
    "http://localhost:3000",
    "https://clawdbot-5b60.onrender.com", // your render url
    // ADD your netlify site URL here once you have it, example:
    // "https://datalabsync.netlify.app"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// --- OAuth routes ---
app.get("/auth", (req, res) => {
  const url = getAuthUrl();
  res.send(`
    <h2>Clawdbot Google OAuth</h2>
    <p><a href="${url}">Click here to authorize Google Sheets</a></p>
  `);
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const { refreshToken } = await handleOAuthCallback(req.query.code);

    // IMPORTANT: you must copy this into Render env as GOOGLE_REFRESH_TOKEN
    res.send(`
      <h2>✅ Authorized</h2>
      <p><strong>Copy this Refresh Token into Render Env:</strong></p>
      <pre>${refreshToken}</pre>
      <p>Then redeploy. After that, your /lead route will write to Google Sheets.</p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send(`OAuth callback failed: ${err.message}`);
  }
});

// --- Lead intake route ---
app.post("/lead", async (req, res) => {
  try {
    const { name, company, email, message, source } = req.body || {};

    if (!email) {
      return res.status(400).json({ ok: false, error: "email is required" });
    }

    const result = await upsertLead({
      name,
      company,
      email,
      message,
      source,
      status: "Pending",
    });

    res.json({ ok: true, result });
  } catch (err) {
    console.error("Lead error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
