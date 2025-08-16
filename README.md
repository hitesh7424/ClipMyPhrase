
# ClipMyPhrase 🎵✂️

ClipMyPhrase is a web application that allows you to upload audio files, transcribe them with word-level timestamps, select specific words or phrases, and generate custom audio clips from those selections.

## Features

- Upload audio files (`.wav`, `.mp3`, `.m4a`, `.ogg`)
- Automatic transcription using OpenAI Whisper with timestamps
- Interactive web interface to select words/phrases
- Generate and download new audio clips from selected words
- Caching of transcriptions for faster repeated use

## Project Structure

- `app.py` – Flask backend for file upload, transcription, and audio clipping
- `main.py` – Standalone script for transcription and word-level timestamp extraction
- `static/` – Frontend assets (JavaScript, CSS)
- `templates/` – HTML templates for the web interface
- `uploads/` – Uploaded audio files and cached transcriptions
- `clips/` – Generated audio clips
- `audio/` – Sample audio files

## Setup & Usage

1. **Install dependencies**  
	- Python 3.8+  
	- `pip install flask pydub whisper-timestamped`

2. **Run the app**  
	```
	python app.py
	```
	Then open your browser at [http://localhost:5000](http://localhost:5000).

3. **Upload an audio file**  
	Use the web interface to upload and transcribe.

4. **Select words and create clips**  
	Highlight words/phrases and generate your custom audio.

## License

This project is licensed under the MIT License.

---

🚀 Work in progress. Contributions and feedback are welcome!

