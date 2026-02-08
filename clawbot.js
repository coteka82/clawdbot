require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const { google } = require("googleapis");

// ====== CONFIG ======
const spreadsheetId = process.env.SPREADSHEET_ID;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ====== GOOGLE AUTH ======
const auth = new google.auth.GoogleAuth({
  keyFile: "google-credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function getLeads() {
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Leads!A2:B",
  });

  const rows = response.data.values || [];
  return rows.map((r) => ({
    name: r[0],
    email: r[1],
  }));
}

async function appendToSheet(rows) {
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:D",
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

// ====== CLAUDE PROMPT ======
function buildPrompt(leads) {
  const formatted = leads
    .map((l) => `Name: ${l.name}, Email: ${l.email}`)
    .join("\n");

  return `
You work at DataLabSync and are sending quick emails to diagnostics teams you believe we can help.

DataLabSync is a Field Execution Platform built for Diagnostics Field Agents (FAS) and their Managers.

These teams struggle with:
- Validation documentation chaos across spreadsheets and emails
- Compliance risk from missed steps and inconsistent records
- Zero manager visibility into what is happening in the field
- FAS burnout from spending 40% of their time on admin instead of customers
- Manual PAR, Correlation, and AMR workflows
- Recreating validation documents for every install

DataLabSync solves this by:
- Guiding validation workflows step-by-step
- Automatically generating validation-ready documentation
- Centralizing customer and instrument records
- Giving managers real-time visibility into every install and validation
- Working alongside existing LIMS, QMS, and instrument software

Your job is to write very simple, genuine, human-sounding emails as if written by a calm office assistant.

The goal of the email is to invite diagnostics teams to take a 2-minute Field Efficiency Quiz at:
https://datalabsync.com

The tone must be:
- Short
- Natural
- Not salesy
- Not AI-sounding
- No buzzwords
- No marketing language

FORMAT:

EMAIL
To:
Subject:
Body:

Leads:
${formatted}
`;
}

// ====== MAIN ======
async function main() {
  if (!spreadsheetId) {
    console.error("❌ Missing SPREADSHEET_ID in .env");
    return;
  }

  const leads = await getLeads();

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    temperature: 0.7,
    messages: [
      {
        role: "user",
        content: buildPrompt(leads),
      },
    ],
  });

  const emails = msg.content[0].text;

  console.log("\n✅ Emails generated:\n");
  console.log(emails);

  const blocks = emails.split("EMAIL").filter((b) => b.trim());

  const rows = blocks.map((block) => {
    const toMatch = block.match(/To:\s*(.*)/);
    const email = toMatch ? toMatch[1] : "Unknown";

    return [email, block.trim(), new Date().toISOString(), "Pending"];
  });

  await appendToSheet(rows);

  console.log("✅ Emails sent to Google Sheet!");
}

main();
