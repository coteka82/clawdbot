const { appendToSheet } = require("./sheets.cjs");

async function run() {
  const now = new Date().toISOString();

  await appendToSheet("Sheet1", [
    [
      "Test Lead",
      "QuickCare Clinic",
      "email@test.com",
      "Interested in reducing no-shows",
      now,
      "Pending"
    ]
  ]);

  console.log("✅ Wrote to Google Sheet successfully!");
}

run();
