const { GoogleGenerativeAI } = require("@google/generative-ai");
const { formidable } = require('formidable');
const fs = require('fs');
const path = require('path');

// Vercel's serverless functions run in a read-only filesystem,
// except for the /tmp directory.
const UPLOAD_DIR = '/tmp';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const form = formidable({
        uploadDir: UPLOAD_DIR,
        keepExtensions: true,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).json({ error: 'Error processing file upload.' });
        }

        const audioFile = files.audio[0];

        try {
            const audioBytes = fs.readFileSync(audioFile.filepath).toString("base64");

            const audioPart = {
                inlineData: {
                    data: audioBytes,
                    mimeType: audioFile.mimetype,
                },
            };

            const result = await model.generateContent([
                "Provide a timestamped transcription of this audio.",
                audioPart
            ]);

            const response = result.response;
            const text = response.text();

            // This is a simplified parser. You might need a more robust one.
            const lines = text.split('\n').filter(line => line.includes('-->'));
            const words = lines.flatMap(line => {
                 const [timestamp, content] = line.split('] ');
                 const [start, end] = timestamp.replace('[', '').split(' --> ');
                 return content.split(' ').map(word => ({
                     word: word.trim(),
                     startTime: parseFloat(start),
                     endTime: parseFloat(end) // Note: Gemini might provide sentence-level timestamps
                 }));
            });


            res.status(200).json({ words });

        } catch (error) {
            console.error('Gemini API Error:', error);
            res.status(500).json({ error: 'Failed to transcribe audio.' });
        } finally {
            // Clean up the uploaded file
            fs.unlinkSync(audioFile.filepath);
        }
    });
}