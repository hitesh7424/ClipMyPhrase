document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const loadingDiv = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error-message');
    const audioPlayer = document.getElementById('audio-player');
    const transcriptP = document.getElementById('full-transcript');
    
    // NEW & UPDATED Selectors for the new UI
    const progressBar = document.getElementById('progress-bar');
    const clickableTranscript = document.getElementById('clickable-transcript');
    const phraseBuilder = document.getElementById('phrase-builder');
    const placeholder = document.querySelector('#phrase-builder .placeholder');
    const createClipBtn = document.getElementById('create-clip-btn');
    const clearPhraseBtn = document.getElementById('clear-phrase-btn');
    const clipLoadingDiv = document.getElementById('clip-loading');
    const clipResultArea = document.getElementById('clip-result-area');
    const clipPlayer = document.getElementById('clip-player');
    const downloadClipLink = document.getElementById('download-clip-link');

    let currentAudioFilename = null;

    // --- Event Listeners ---
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fileInput.files.length) {
            showError("Please select a file to upload.");
            return;
        }
        resultDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        clipResultArea.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        // Clear old results
        clickableTranscript.innerHTML = '';
        clearPhrase();
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'An unknown error occurred.');
            renderResults(data);
        } catch (error) {
            showError(`Error: ${error.message}`);
        } finally {
            loadingDiv.classList.add('hidden');
        }
    });

    createClipBtn.addEventListener('click', async () => {
        const selectedPills = document.querySelectorAll('.word-pill');
        if (selectedPills.length === 0) {
            alert("Please select words from the transcript to build a phrase first.");
            return;
        }
        const wordsData = Array.from(selectedPills).map(pill => ({
            text: pill.dataset.text,
            start: pill.dataset.start,
            end: pill.dataset.end
        }));
        const payload = { audio_filename: currentAudioFilename, words: wordsData };

        clipResultArea.classList.add('hidden');
        clipLoadingDiv.classList.remove('hidden');
        try {
            const response = await fetch('/clip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            clipPlayer.src = data.clip_url;
            downloadClipLink.href = data.clip_url;
            clipResultArea.classList.remove('hidden');
        } catch (error) {
            showError(`Clipping failed: ${error.message}`);
        } finally {
            clipLoadingDiv.classList.add('hidden');
        }
    });
    
    clearPhraseBtn.addEventListener('click', clearPhrase);

    // --- CORE LOGIC FUNCTIONS ---

    function renderResults(data) {
        resultDiv.classList.remove('hidden');
        audioPlayer.src = data.audio_url;
        currentAudioFilename = data.audio_filename;
        
        // --- NEW: Populate the clickable transcript area ---
        data.transcription.segments.forEach(segment => {
            segment.words.forEach(wordData => {
                const wordEl = document.createElement('span');
                wordEl.className = 'transcript-word';
                // Add a space after each word for natural text flow
                wordEl.textContent = wordData.text + ' '; 
                wordEl.dataset.start = wordData.start;
                wordEl.dataset.end = wordData.end;

                wordEl.addEventListener('click', () => {
                    addWordToPhrase(wordData);
                    // Seek audio to the start of the clicked word
                    audioPlayer.currentTime = wordData.start;
                });

                clickableTranscript.appendChild(wordEl);
            });
        });
    }
    
    function addWordToPhrase(wordData) {
        if (placeholder) placeholder.style.display = 'none';
        const pill = document.createElement('div');
        pill.className = 'word-pill';
        pill.textContent = wordData.text;
        pill.dataset.text = wordData.text;
        pill.dataset.start = wordData.start;
        pill.dataset.end = wordData.end;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-word-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pill.remove();
            if (phraseBuilder.querySelectorAll('.word-pill').length === 0) {
                 if (placeholder) placeholder.style.display = 'inline';
            }
        });
        pill.appendChild(removeBtn);
        phraseBuilder.appendChild(pill);
    }

    function clearPhrase() {
        phraseBuilder.innerHTML = '';
        if (placeholder) {
            phraseBuilder.appendChild(placeholder);
            placeholder.style.display = 'inline';
        }
    }

    // --- Audio Player Sync ---
    audioPlayer.addEventListener('timeupdate', () => {
        const currentTime = audioPlayer.currentTime;
        
        // Update the progress bar width
        if (audioPlayer.duration) {
            const progress = (currentTime / audioPlayer.duration) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        // Highlight the currently playing word in the transcript
        document.querySelectorAll('.transcript-word').forEach(wordEl => {
            const start = parseFloat(wordEl.dataset.start);
            const end = parseFloat(wordEl.dataset.end);
            wordEl.classList.toggle('active', currentTime >= start && currentTime < end);
        });
    });

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
});