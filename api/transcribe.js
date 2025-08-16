import { GoogleGenerativeAI } from "@google/generative-ai";
import { formidable } from 'formidable';
import fs from 'fs';

// Vercel's serverless functions can't parse FormData bodies automatically
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const { files } = await parseForm(req);
        const audioFile = files.audio[0];

        const audioBytes = fs.readFileSync(audioFile.filepath).toString("base64");
        fs.unlinkSync(audioFile.filepath); // Clean up the temp file

        const audioPart = {
            inlineData: {
                data: audioBytes,
                mimeType: audioFile.mimetype,
            },
        };

        const prompt = "Transcribe this audio. Provide a list of every single word with its start and end time. The output should be only a valid JSON array, with no other text, markdown, or explanation. Each object in the array should have three keys: 'word', 'startTime' (in seconds), and 'endTime' (in seconds). Example: [{\"word\": \"Hello\", \"startTime\": 0.5, \"endTime\": 0.9}, {\"word\": \"world\", \"startTime\": 1.0, \"endTime\": 1.4}]";

        const result = await model.generateContent([prompt, audioPart]);
        const responseText = result.response.text();
        
        // Clean up potential markdown formatting from the response
        const cleanedText = responseText.replace(/```json\n|```/g, '').trim();

        // Parse the JSON string into an object
        const words = JSON.parse(cleanedText);

        res.status(200).json({ words });

    } catch (error) {
        console.error('Error in /api/transcribe:', error);
        res.status(500).json({ error: 'Failed to transcribe audio.', details: error.message });
    }
}

// Helper to parse FormData with formidable
const parseForm = (req) => {
    return new Promise((resolve, reject) => {
        const form = formidable({
            // Vercel allows writing to the /tmp directory
            uploadDir: '/tmp',
            keepExtensions: true,
        });
        form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
        });
    });
};