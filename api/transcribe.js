const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Read raw audio bytes
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    const base64Audio = buf.toString('base64');

    // Gemini API request
    const response = await axios.post(
      'https://api.genai.google.com/v1alpha2/models/gemini-2.0-flash:generateContent',
      {
        instances: [
          {
            content: base64Audio,
            mimeType: 'audio/wav',
            config: {
              responseModalities: ['TEXT'],
              temperature: 0.5,
              maxOutputTokens: 1024
            }
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const transcript = response.data.candidates[0].content.parts[0].text;
    res.status(200).json({ transcript });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Transcription failed' });
  }
};
