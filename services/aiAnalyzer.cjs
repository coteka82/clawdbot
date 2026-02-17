const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeLead({ message, result, painPoint }) {
  try {
    const prompt = `
You are an AI sales assistant for DataLabSync.

Analyze this lead:

Result: ${result}
Pain Point: ${painPoint}
Message: ${message}

Return JSON only:
{
  "temperature": "hot | warm | cold",
  "score": number (1-10),
  "summary": "short summary"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error("AI Analysis Error:", err);
    return {
      temperature: "unknown",
      score: 0,
      summary: "AI failed"
    };
  }
}

module.exports = { analyzeLead };
