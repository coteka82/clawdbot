const express = require("express");
const cors = require("cors");

const { upsertLead } = require("./services/sheets.cjs");
const { getAuthUrl, handleOAuthCallback } = require("./services/googleOAuth.cjs");

const app = express();

const PORT = process.env.PORT || 3000;

// ✅ CORS
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:8888",
    "https://clawdbot-5b60.onrender.com"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

/* =====================================================
   GOOGLE OAUTH ROUTES
===================================================== */

// Step 1: Start OAuth
app.get("/auth", (req, res) => {
  const url = getAuthUrl();
  res.send(`
    <h2>Clawdbot Google OAuth</h2>
    <p><a href="${url}">Click here to authorize Google Sheets</a></p>
  `);
});

// Step 2: OAuth callback
app.get("/auth/google/callback", async (req, res) => {
  try {
    if (!req.query.code) {
      return res.status(400).send("No OAuth code received.");
    }

    const refreshToken = await handleOAuthCallback(req.query.code);

    res.send(`
      <h2>✅ Google Authorized Successfully</h2>
      <p><strong>Copy this refresh token into Render:</strong></p>
      <pre>${refreshToken}</pre>
      <p>
        Go to Render → Environment → Add:
        <br/>
        GOOGLE_REFRESH_TOKEN = ${refreshToken}
      </p>
      <p>Then redeploy.</p>
    `);

  } catch (err) {
    console.error("OAuth Error:", err);
    res.status(500).send(`OAuth callback failed: ${err.message}`);
  }
});


/* =====================================================
   LEAD ROUTE
===================================================== */

app.post("/lead", async (req, res) => {
  try {
    const { name, company, email, message, source } = req.body || {};

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "email is required"
      });
    }

    const result = await upsertLead({
      name,
      company,
      email,
      message,
      source
    });

    res.json({
      ok: true,
      result
    });

  } catch (err) {
    console.error("Lead Error:", err);
    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});


/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/", (req, res) => {
  res.send("Clawdbot API running.");
});


app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
