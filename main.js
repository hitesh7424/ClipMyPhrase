const uploadBtn = document.getElementById('uploadBtn');
const audioUpload = document.getElementById('audioUpload');
const audioPlayer = document.getElementById('audioPlayer');
const transcriptEl = document.getElementById('transcript');

uploadBtn.addEventListener('click', async () => {
    const file = audioUpload.files[0];
    if (!file) return alert('Please select an audio file');

    // Update audio player
    const url = URL.createObjectURL(file);
    audioPlayer.src = url;
    audioPlayer.play();

    const reader = new FileReader();
    reader.onload = async () => {
        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: reader.result
            });
            if (!response.ok) throw new Error('Transcription failed');
            const data = await response.json();
            transcriptEl.textContent = data.transcript;
        } catch (err) {
            console.error(err);
            alert('Error during transcription');
        }
    };
    reader.readAsArrayBuffer(file);
});
