require("dotenv").config();
const axios = require("axios");

console.log("Starting Clawdbot...");

async function runClaude() {
  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: "Say hello from a secure Clawdbot."
          }
        ]
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );

    console.log("Claude says:");
    console.log(response.data.content[0].text);

  } catch (err) {
    console.error("Error:", err.response?.data?.error?.message || err.message);
  }
}

runClaude();
