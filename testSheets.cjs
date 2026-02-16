const { upsertLead } = require("./services/sheets.cjs");

async function run() {
  const result = await upsertLead({
    name: "Test User",
    company: "Test Company",
    email: "test@example.com",
    message: "Testing Clawdbot connection",
    source: "local-test",
    status: "Pending"
  });

  console.log(result);
}

run();
