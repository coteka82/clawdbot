const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/*
  IMPORTANT:
  We parse credentials from environment.
  We also fix newline formatting for private_key.
*/

function getGoogleAuth() {
  if (!process.env.GOOGLE_CREDENTIALS) {
    throw new Error("GOOGLE_CREDENTIALS not set");
  }

  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  // Fix private key formatting (CRITICAL FOR RENDER)
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

app.post("/lead", async (req, res) => {
  try {
    const { name, company, email, message, source } = req.body;

    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.SPREADSHEET_ID;

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            name || "Unknown",
            company || "",
            email || "",
            message || "",
            new Date().toISOString(),
            "Pending",
            "",
            source || "api"
          ],
        ],
      },
    });

    res.json({ ok: true, message: "Lead added successfully 🚀" });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("Clawdbot API is running 🚀");
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
