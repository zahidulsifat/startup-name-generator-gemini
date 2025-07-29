import OpenAI from "openai";

export default async function (req, res) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "OpenAI API key not configured on server" });
    return;
  }

  try {
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a friendly AI startup name generator. Always respond in a conversational way and provide exactly 3 creative startup names with brief explanations."
        },
        {
          role: "user",
          content: generatePrompt(req.body.startup)
        }
      ],
      temperature: 0.6,
      max_tokens: 500,
    });
    res.status(200).json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI API error:", error);
    res.status(500).json({ error: "Failed to generate startup names" });
  }
}

function generatePrompt(startup) {
  const capitalizedStartup =
    startup[0].toUpperCase() + startup.slice(1).toLowerCase();
  return `I'm building a ${capitalizedStartup} startup. Can you suggest 3 creative and memorable names with brief explanations for each?`;
}
