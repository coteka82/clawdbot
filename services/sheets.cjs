const { google } = require("googleapis");
const { getAuthorizedOAuthClient } = require("./googleOAuth.cjs");

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "Sheet1";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

function getSheetsClient() {
  const auth = getAuthorizedOAuthClient();
  return google.sheets({ version: "v4", auth });
}

async function upsertLead({ name, company, email, message, source, status }) {
  requireEnv("SPREADSHEET_ID");

  const sheets = getSheetsClient();
  const now = new Date().toISOString();

  // Get existing rows (A2:I)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:I`,
  });

  const rows = response.data.values || [];

  // Email col is C (index 2)
  const existingIndex = rows.findIndex((row) => row[2] === email);

  if (existingIndex !== -1) {
    const rowNumber = existingIndex + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${rowNumber}:I${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            name || "",
            company || "",
            email,
            message || "",
            rows[existingIndex][4] || now, // keep original createdAt if present
            status || "Pending",
            now,
            source || "api",
            "",
          ],
        ],
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
      values: [
        [
          name || "",
          company || "",
          email,
          message || "",
          now,
          status || "Pending",
          now,
          source || "api",
          "",
        ],
      ],
    },
  });

  return { action: "appended" };
}

module.exports = { upsertLead };
