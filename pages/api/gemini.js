export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "Gemini API key not configured on server" });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { startup } = req.body;
    
    if (!startup) {
      res.status(400).json({ error: 'Startup description is required' });
      return;
    }

    const prompt = generatePrompt(startup);
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      res.status(response.status).json({ error: 'Failed to generate startup names' });
      return;
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const generatedText = data.candidates[0].content.parts[0].text;
      res.status(200).json({ result: generatedText });
    } else {
      console.error('Unexpected Gemini API response structure:', data);
      res.status(500).json({ error: 'Unexpected response from Gemini API' });
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Failed to generate startup names" });
  }
}

function generatePrompt(startup) {
  const capitalizedStartup = startup[0].toUpperCase() + startup.slice(1).toLowerCase();
  return `I'm building a ${capitalizedStartup} startup. Can you suggest 3 creative and memorable names with brief explanations for each? Please provide them in a friendly, conversational way.`;
}
