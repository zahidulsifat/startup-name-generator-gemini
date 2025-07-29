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

    // Try with retries and fallback models
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    let currentModel = 'gemini-2.0-flash';

    while (attempts < maxAttempts) {
      // If we have multimodal content and previous attempts failed, try with gemini-pro-vision
      if (attempts > 0 && (image || audio)) {
        currentModel = 'gemini-pro-vision';
        // For gemini-pro-vision, remove audio as it doesn't support it
        if (audio) {
          const audioIndex = parts.findIndex(part => part.inlineData && part.inlineData.mimeType.startsWith('audio'));
          if (audioIndex > -1) {
            parts.splice(audioIndex, 1);
          }
        }
      } else if (attempts > 1 && !image && !audio) {
        // For text-only, try gemini-pro
        currentModel = 'gemini-pro';
      }

      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        break;
      }

      const errorData = await response.json();
      console.error(`Gemini API error (attempt ${attempts + 1}):`, errorData);

      if (response.status === 503 && attempts < maxAttempts - 1) {
        // Wait before retry for overloaded model
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
        attempts++;
        continue;
      }

      // For other errors or max attempts reached
      let errorMessage = 'Failed to generate startup names';
      if (response.status === 503) {
        errorMessage = 'The AI model is currently overloaded. Please try again in a moment.';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request. Please try with a smaller image or shorter audio.';
      }

      res.status(response.status).json({ error: errorMessage });
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
