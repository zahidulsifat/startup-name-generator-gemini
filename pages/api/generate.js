import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function (req, res) {
  const apiKey = req.body.openaiApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "OpenAI API key not configured" });
    return;
  }

  try {
    // Create a new configuration and OpenAI instance for each request
    const config = new Configuration({
      apiKey: apiKey,
    });
    const openaiInstance = new OpenAIApi(config);

    const completion = await openaiInstance.createCompletion({
      model: "text-davinci-003",
      prompt: generatePrompt(req.body.startup),
      temperature: 0.6,
    });
    res.status(200).json({ result: completion.data.choices[0].text });
  } catch (error) {
    console.error("OpenAI API error:", error);
    res.status(500).json({ error: "Failed to generate startup names" });
  }
}

function generatePrompt(startup) {
  const capitalizedStartup =
    startup[0].toUpperCase() + startup.slice(1).toLowerCase();
  return `As a friendly AI startup name generator, suggest 3 creative and memorable names for a ${capitalizedStartup} startup. Format your response in a conversational way.

Example format:
"Great idea for a ${capitalizedStartup} startup! Here are 3 creative names I came up with:

🚀 [Name 1] - [brief reason why it's good]
💡 [Name 2] - [brief reason why it's good]
⭐ [Name 3] - [brief reason why it's good]

Which one resonates with you? I can generate more options if needed!"

Domain: ${capitalizedStartup}
Response:`;
}
