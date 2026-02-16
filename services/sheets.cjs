const { google } = require("googleapis");

const raw = process.env.GOOGLE_CREDENTIALS;

if (!raw) {
  throw new Error("GOOGLE_CREDENTIALS env variable is missing");
}

let credentials;

try {
  credentials = JSON.parse(raw);
} catch (err) {
  console.error("Failed to parse GOOGLE_CREDENTIALS:", err);
  throw err;
}

// 🔥 CRITICAL FIX FOR RENDER
if (credentials.private_key) {
  credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "Sheet1";

async function upsertLead({ name, company, email, message, source, status }) {
  if (!SPREADSHEET_ID) {
    throw new Error("SPREADSHEET_ID is not set");
  }

  const now = new Date().toISOString();

  // Get existing rows
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:I`,
  });

  const rows = response.data.values || [];

  // Check if email already exists
  const existingIndex = rows.findIndex(row => row[2] === email);

  if (existingIndex !== -1) {
    const rowNumber = existingIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${rowNumber}:I${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          name || "",
          company || "",
          email,
          message || "",
          rows[existingIndex][4] || now,
          status || "Pending",
          now,
          source || "api",
          ""
        ]],
      },
    });

    return { action: "updated", rowIndex: rowNumber };
  }

  // Append new row
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:I`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        name || "",
        company || "",
        email,
        message || "",
        now,
        status || "Pending",
        now,
        source || "api",
        ""
      ]],
    },
  });

  return { action: "appended" };
}

module.exports = { upsertLead };
