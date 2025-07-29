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

    // Start with text-only approach for reliability
    let prompt = '';
    if (startup) {
      prompt = generatePrompt(startup);
    } else if (image) {
      prompt = "Based on the uploaded image, suggest 3 creative startup names with brief explanations for each. Be conversational and friendly in your response.";
    } else if (audio) {
      prompt = "Based on the uploaded audio, suggest 3 creative startup names with brief explanations for each. Be conversational and friendly in your response.";
    }

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt }
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

    // Try gemini-pro first (more stable)
    let response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini Pro API error:', errorData);
      
      // Fallback to 2.0-flash if pro fails
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const fallbackError = await response.json();
        console.error('Gemini 2.0 Flash API error:', fallbackError);
        
        let errorMessage = 'Failed to generate startup names';
        if (response.status === 503) {
          errorMessage = 'The AI model is currently busy. Please try again in a moment.';
        }
        
        res.status(500).json({ error: errorMessage });
        return;
      }
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
