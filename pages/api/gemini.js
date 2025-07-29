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
    const { startup, image, audio } = req.body;

    if (!startup && !image && !audio) {
      res.status(400).json({ error: 'At least one input (text, image, or audio) is required' });
      return;
    }

    const parts = [];

    // Add text prompt if provided
    if (startup) {
      const prompt = generatePrompt(startup);
      parts.push({ text: prompt });
    }

    // Add image if provided
    if (image) {
      // Remove data URL prefix and get just the base64 data
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });

      // Add context for image analysis
      if (!startup) {
        parts.push({
          text: "Based on this image, suggest 3 creative startup names with brief explanations for each. Be conversational and friendly in your response."
        });
      } else {
        parts.push({
          text: "Also consider this image in your startup name suggestions."
        });
      }
    }

    // Add audio if provided
    if (audio) {
      const base64Data = audio.split(',')[1];
      const mimeType = audio.split(';')[0].split(':')[1];

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });

      if (!startup && !image) {
        parts.push({
          text: "Based on this audio, suggest 3 creative startup names with brief explanations for each. Be conversational and friendly in your response."
        });
      } else {
        parts.push({
          text: "Also consider this audio in your startup name suggestions."
        });
      }
    }

    const requestBody = {
      contents: [
        {
          parts: parts
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
