const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

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

// Step 2: OAuth callback
app.get("/auth/google/callback", async (req, res) => {
  try {
    // Make sure Google sent back a code
    if (!req.query.code) {
      return res.status(400).send("No OAuth code received.");
    }

    // Exchange code for refresh token
    const refreshToken = await handleOAuthCallback(req.query.code);

    // Show token so you can copy into Render
    res.send(`
      <h2>✅ Google Authorized Successfully</h2>
      <p><strong>Copy this refresh token into Render:</strong></p>
      <pre>${refreshToken}</pre>
      <p>
        Go to Render → Environment → Add:
        <br/>
        GOOGLE_REFRESH_TOKEN = ${refreshToken}
      </p>
      <p>Then redeploy your service.</p>
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

    // Basic validation
    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "Email is required"
      });
    }

    const now = new Date().toISOString();

    // 1️⃣ Save to Google Sheets
    const result = await upsertLead({
      name,
      company,
      email,
      message,
      source,
      status: "Pending",
      createdAt: now
    });

    // 2️⃣ Send Internal Notification Email (To You)
    await resend.emails.send({
      from: "DataLabSync <claude@datalabsync.com>",
      to: "claude@datalabsync.com",
      subject: "🚀 New Lead Captured - DataLabSync",
      html: `
        <h2>New Lead Submitted</h2>
        <p><strong>Name:</strong> ${name || "N/A"}</p>
        <p><strong>Company:</strong> ${company || "N/A"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message || "No message provided."}</p>
        <hr/>
        <p><strong>Source:</strong> ${source || "api"}</p>
        <p><strong>Captured At:</strong> ${now}</p>
      `
    });

    // 3️⃣ Send Confirmation Email to Lead
    await resend.emails.send({
      from: "DataLabSync <claude@datalabsync.com>",
      to: email,
      subject: "Thanks for reaching out to DataLabSync",
      html: `
        <h2>Hi ${name || "there"},</h2>
        <p>Thanks for your interest in DataLabSync.</p>
        <p>We help Diagnostics Field Agents eliminate validation chaos and regain visibility across installs.</p>
        <p>Someone from our team will reach out shortly.</p>
        <br/>
        <p>— Claude</p>
        <p><strong>Founder, DataLabSync</strong></p>
      `
    });

    // 4️⃣ Final API response
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
