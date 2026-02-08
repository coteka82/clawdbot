const { google } = require("googleapis");

const SPREADSHEET_ID = "1ktXn4nT-p37SJdbIG3JMut0EhfHxlWcp_dpe7h8qZpE";
const SHEET_NAME = "Sheet1";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function getClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

async function upsertLead({ name, company, email, message, source, status }) {
  if (!email) throw new Error("Email required");

  const sheets = await getClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:F`,
  });

  const rows = res.data.values || [];
  const normalizedEmail = normalizeEmail(email);

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const rowEmail = normalizeEmail(rows[i][2]); // column C
    if (rowEmail === normalizedEmail) {
      const rowIndex = i + 1;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${rowIndex}:F${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            name,
            company,
            email,
            message,
            new Date().toISOString(),
            status || "Pending"
          ]]
        }
      });

      return { action: "updated", rowIndex };
    }
  }

  // Not found → append
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:F`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        name,
        company,
        email,
        message,
        new Date().toISOString(),
        status || "Pending"
      ]]
    }
  });

  return { action: "appended" };
}

module.exports = { upsertLead };
