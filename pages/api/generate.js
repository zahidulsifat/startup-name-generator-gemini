import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function (req, res) {
  if (req.body.openaiApiKey) {
    configuration.apiKey = req.body.openaiApiKey;
  }

  if (!configuration.apiKey) {
    res.status(500).json({ error: "OpenAI API key not configured" });
    return;
  }

  try {
    const completion = await openai.createCompletion({
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
  return `Suggest three names for an USA tech startup domain.
  
  Domain: Payment gateway
  Names: Zoomer Pay, Slay Pay, No Cap Payment
  Domain: Clothing
  Names: Drip Check, Bussin Wear, Boujee Clothes 
  Domain: ${capitalizedStartup}
  Names:`;
}
