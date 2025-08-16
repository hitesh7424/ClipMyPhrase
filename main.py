import whisper_timestamped as whisper

# Load your audio file
# Make sure your audio file is in a format that whisper can handle, like WAV or MP3.
try:
    audio = whisper.load_audio("audio.wav")
except Exception as e:
    print(f"Error loading audio file: {e}")
    exit()

# Load the Whisper model. The "base" model is a good starting point.
# For higher accuracy, you can use "medium" or "large", but they require more resources.
try:
    model = whisper.load_model("base", device="cuda") # Or "cuda" if you have a GPU
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

# Transcribe the audio with word-level timestamps
try:
    result = whisper.transcribe(model, audio, language="en") # Specify the language
except Exception as e:
    print(f"Error during transcription: {e}")
    exit()

# Print the results
import json
# print(json.dumps(result, indent = 2, ensure_ascii = False)) # Uncomment for full details

# Iterate through the segments and words to display the timestamps
print("Word-level transcription:")
for segment in result['segments']:
    for word in segment['words']:
        start_time = word['start']
        end_time = word['end']
        text = word['text']
        print(f"[{start_time:.2f}s - {end_time:.2f}s] {text}")