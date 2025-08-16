import { buffer } from 'micro';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false, // handle raw binary upload
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const buf = await buffer(req);
    const base64Audio = buf.toString('base64');

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
              maxOutputTokens: 1024,
            },
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const transcript = response.data.candidates[0].content.parts[0].text;
    res.status(200).json({ transcript });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Transcription failed' });
  }
}
