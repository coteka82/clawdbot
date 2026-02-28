// ===============================
// IMPORTS
// ===============================
const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const { db } = require("./services/firebase.cjs");

// ===============================
// APP SETUP
// ===============================
const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// RESEND SETUP
// ===============================
const resend = new Resend(process.env.RESEND_API_KEY);

// ===============================
// CORS CONFIG
// ===============================
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      "https://datalabsync.com",
      "https://www.datalabsync.com",
      "http://localhost:3000",
      "http://localhost:8888"
    ];

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("*", cors());
app.use(express.json());

/* ======================================
   LEAD SCORING ENGINE
====================================== */

function calculateLeadScore({ result, painPoint, message }) {
  let score = 0;

  if (painPoint && painPoint.toLowerCase().includes("chaos")) score += 30;
  if (painPoint && painPoint.toLowerCase().includes("compliance")) score += 25;
  if (result && result.toLowerCase().includes("manual")) score += 25;
  if (message && message.length > 50) score += 20;
  if (message && message.toLowerCase().includes("urgent")) score += 40;

  return score;
}

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
   LEAD ROUTE — FULL SYSTEM
===================================================== */

app.post("/lead", async (req, res) => {
  try {
    const { name, company, email, message, source, result, painPoint } = req.body || {};

    // 1️⃣ Basic validation
    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "Email is required"
      });
    }

    const now = new Date().toISOString();

// Calculate lead score
const score = calculateLeadScore({ result, painPoint, message });

let temperature = "cold";
if (score >= 60) temperature = "hot";
else if (score >= 30) temperature = "warm";

    /* =====================================================
       2️⃣ SAVE TO GOOGLE SHEETS
    ===================================================== */

    const sheetResult = await upsertLead({
      name,
      company,
      email,
      message,
      source: source || "api",
      status: "Pending",
      createdAt: now
    });

    /* =====================================================
       3️⃣ SAVE TO FIREBASE (MASTER DATABASE)
    ===================================================== */

    await db.collection("leads").add({
      name: name || null,
      company: company || null,
      email,
      message: message || null,
      result: result || null,
      painPoint: painPoint || null,
      source: source || "api",
      status: "new",
      followUpStage: 0,
      vaAssigned: false,
      createdAt: now
    });

    /* =====================================================
       4️⃣ SEND INTERNAL EMAIL (TO YOU)
    ===================================================== */

    await resend.emails.send({
      from: "DataLabSync <claude@datalabsync.com>",
      to: "claude@datalabsync.com",
      subject: "🚀 New Lead Captured – DataLabSync",
      html: `
        <h2>New Lead Submitted</h2>
        <p><strong>Name:</strong> ${name || "N/A"}</p>
        <p><strong>Company:</strong> ${company || "N/A"}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Pain Point:</strong> ${painPoint || "N/A"}</p>
        <p><strong>Quiz Result:</strong> ${result || "N/A"}</p>
        <p><strong>Message:</strong></p>
        <p>${message || "No message provided."}</p>
        <hr/>
        <p><strong>Source:</strong> ${source || "api"}</p>
        <p><strong>Captured At:</strong> ${now}</p>
      `
    });

    /* =====================================================
       5️⃣ SEND THANK YOU EMAIL (FOUNDER STYLE)
    ===================================================== */

    await resend.emails.send({
      from: "Claude – DataLabSync <claude@datalabsync.com>",
      to: email,
      subject: "Thanks for taking the quiz",
      html: `
        <h2>Hi ${name || "there"},</h2>

        <p>Thanks for taking the DataLabSync assessment.</p>

        <p>Based on your answers, it looks like you're dealing with:</p>
        <p><strong>${painPoint || "Operational inefficiencies"}</strong></p>

        <p>And your current workflow likely reflects:</p>
        <p><strong>${result || "Manual validation processes"}</strong></p>

        <p>That’s exactly why I built DataLabSync.</p>

        <p>Field teams are drowning in validation documentation, spreadsheets, and disconnected systems. 
        We’re fixing that with structured workflows, automatic documentation, and manager visibility.</p>

        <p>I’d love to understand your situation better.</p>

        <p>
          👉 <a href="https://calendly.com/your-link-here" target="_blank">
          Schedule 15 minutes with me
          </a>
        </p>

        <p>Or just hit reply — I read every response.</p>

        <br/>
        <p>— Claude</p>
        <p><strong>Founder, DataLabSync</strong></p>
      `
    });

    /* =====================================================
       6️⃣ FLAG FOR VA FOLLOW-UP
    ===================================================== */

    await db.collection("leads").doc(email).set({
  	name,
  	company,
  	email,
  	message,
  	result,
  	painPoint,
  	score,
  	temperature,
  	status: "new",
  	followUpStage: 0,
  	replied: false,
  	createdAt: now
     });

    /* =====================================================
       7️⃣ FINAL RESPONSE
    ===================================================== */

    res.json({
      ok: true,
      message: "Lead captured, stored, and emails sent successfully.",
      sheetResult
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
  res.json({ message: "Clawbot API running 🚀" });
});

app.post("/api/waitlist", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email required" });
    }

    await db.collection("waitlist").add({
      email: email.toLowerCase().trim(),
      createdAt: new Date()
    });

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
