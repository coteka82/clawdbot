require("dotenv").config();

const Anthropic = require("@anthropic-ai/sdk");
const { google } = require("googleapis");

const spreadsheetId = process.env.SPREADSHEET_ID;

if (!spreadsheetId) {
  console.error("❌ SPREADSHEET_ID not found in .env");
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ===== GOOGLE AUTH =====
const auth = new google.auth.GoogleAuth({
  keyFile: "key.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ===== GET LEADS FROM SHEET =====
async function getLeads() {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Leads!A2:B",
  });

  const rows = res.data.values || [];
  return rows.map(r => ({
    name: r[0],
    email: r[1],
  }));
}

// ===== WRITE BACK TO SHEET =====
async function appendToSheet(rows) {
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:D",
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

// ===== PROMPT =====
function buildPrompt(leads) {
  const formatted = leads
    .map(l => `Name: ${l.name}, Email: ${l.email}`)
    .join("\n");

  return `
You work at DataLabSync and are sending quick emails to diagnostics teams you believe we can help.

DataLabSync is a Field Execution Platform built for Diagnostics Field Agents (FAS) and their Managers.

These teams struggle with:
- Validation documentation chaos across spreadsheets and emails
- Compliance risk from missed steps
- Zero manager visibility into field work
- FAS burnout from admin instead of customers
- Manual PAR, Correlation, and AMR workflows

Invite them to take the 2-minute Field Efficiency Quiz at https://datalabsync.com

Keep emails natural, human, and under 120 words.

FORMAT:

EMAIL
To:
Subject:
Body:

Leads:
${formatted}
`;
}

// ===== MAIN =====
async function main() {
  const leads = await getLeads();

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1500,
    temperature: 0.7,
    messages: [
      { role: "user", content: buildPrompt(leads) }
    ],
  });

  const emails = msg.content[0].text;
  console.log("\n✅ Emails generated:\n");
  console.log(emails);

  const blocks = emails.split("EMAIL").filter(b => b.trim());

  const rows = blocks.map(block => {
    const toMatch = block.match(/To:\s*(.*)/);
    const email = toMatch ? toMatch[1] : "Unknown";
    return [email, block.trim(), new Date().toISOString(), "Pending"];
  });

  await appendToSheet(rows);

  console.log("✅ Emails sent to Google Sheet!");
}

main();
