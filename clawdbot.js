import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BASE_DIR = process.cwd();

function safePath(relPath) {
  const resolved = path.resolve(BASE_DIR, relPath);
  if (!resolved.startsWith(BASE_DIR)) {
    throw new Error("Access outside Clawdbot workspace denied");
  }
  return resolved;
}

async function callClaude(prompt) {
  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-opus-20240229",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }]
    },
    {
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      }
    }
  );
  return res.data.content[0].text;
}

async function runTask(taskFile) {
  const task = JSON.parse(fs.readFileSync(safePath(taskFile), "utf-8"));
  const systemPrompt = fs.readFileSync("system_prompt.md", "utf-8");

  const fullPrompt = `${systemPrompt}

MODE: ${task.mode}

TASK:
${task.prompt}
`;

  const output = await callClaude(fullPrompt);

  if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
  }

  fs.writeFileSync(safePath(`output/${task.output}`), output);
  console.log("Task complete. See output folder.");
}

runTask(process.argv[2]);
