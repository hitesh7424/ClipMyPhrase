import os
import time
import json # Import the json library
import whisper_timestamped as whisper
from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
from pydub import AudioSegment

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
CLIPS_FOLDER = 'clips'
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'ogg'}
MODEL_SIZE = "medium"

# --- Flask App Initialization ---
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CLIPS_FOLDER'] = CLIPS_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CLIPS_FOLDER, exist_ok=True)

# --- Helper Functions ---
def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- Flask Routes ---
@app.route('/')
def index():
    """Render the main HTML page."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_and_transcribe():
    """Handle audio upload and transcription, with caching."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # --- CACHING LOGIC ---
        # Define the path for the cached JSON transcription
        json_filepath = filepath + '.json'
        
        

        # If no cache, save the file and transcribe
        file.save(filepath)

        try:
            print(f"No cache found. Transcribing {filename}...")
            audio = whisper.load_audio(filepath)
            model = whisper.load_model(MODEL_SIZE, device="cuda")
            result = whisper.transcribe(model, audio)
            
            # --- SAVE TO CACHE ---
            # After a successful transcription, save the result to the JSON file
            try:
                with open(json_filepath, 'w', encoding='utf-8') as f:
                    json.dump(result, f, ensure_ascii=False, indent=4)
                print(f"Saved transcription cache to {json_filepath}")
            except Exception as e:
                print(f"Error saving cache file: {e}")

            total_duration = result['segments'][-1]['end'] if result['segments'] else 0

            return jsonify({
                "transcription": result,
                "audio_filename": filename,
                "audio_url": f"/uploads/{filename}",
                "duration": total_duration
            })

        except Exception as e:
            if os.path.exists(filepath): os.remove(filepath)
            return jsonify({"error": f"An error occurred during transcription: {str(e)}"}), 500
    
    return jsonify({"error": "File type not allowed"}), 400

# The /clip route and other routes remain exactly the same as before
@app.route('/clip', methods=['POST'])
def clip_audio():
    data = request.get_json()
    if not data or 'words' not in data or 'audio_filename' not in data:
        return jsonify({"error": "Invalid request"}), 400

    original_filename = secure_filename(data['audio_filename'])
    selected_words = data['words']
    
    original_filepath = os.path.join(app.config['UPLOAD_FOLDER'], original_filename)
    if not os.path.exists(original_filepath):
        return jsonify({"error": "Original audio file not found"}), 404

    try:
        original_audio = AudioSegment.from_file(original_filepath)
        final_clip = AudioSegment.empty()

        for word_data in selected_words:
            start_ms = int(float(word_data['start']) * 1000)
            end_ms = int(float(word_data['end']) * 1000)
            word_segment = original_audio[start_ms:end_ms]
            final_clip += word_segment
        
        min_duration_ms = 1000
        if len(final_clip) < min_duration_ms:
            padding_needed = min_duration_ms - len(final_clip)
            silence = AudioSegment.silent(duration=padding_needed)
            final_clip += silence
        
        timestamp = int(time.time())
        clip_filename = f"clip_{timestamp}.wav"
        clip_filepath = os.path.join(app.config['CLIPS_FOLDER'], clip_filename)

        final_clip.export(clip_filepath, format="wav")
        
        return jsonify({
            "success": True,
            "clip_url": f"/clips/{clip_filename}"
        })

    except Exception as e:
        return jsonify({"error": f"Failed to create clip: {str(e)}"}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/clips/<filename>')
def serve_clip(filename):
    return send_from_directory(app.config['CLIPS_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)