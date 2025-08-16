document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const audioFileInput = document.getElementById('audioFileInput');
    const transcribeButton = document.getElementById('transcribeButton');
    const loader = document.getElementById('loader');
    const resultsDiv = document.getElementById('results');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    const phraseOutput = document.getElementById('phraseOutput');
    const createClipButton = document.getElementById('createClipButton');
    const clearPhraseButton = document.getElementById('clearPhraseButton');
    const clippedAudioPlayer = document.getElementById('clippedAudioPlayer');
    const downloadLink = document.getElementById('downloadLink');

    // --- State ---
    let originalAudioBuffer = null;
    let transcribedWords = [];
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // --- Event Listeners ---
    transcribeButton.addEventListener('click', handleTranscribe);
    createClipButton.addEventListener('click', handleCreateClip);
    clearPhraseButton.addEventListener('click', () => {
        phraseOutput.innerHTML = '';
        clippedAudioPlayer.src = '';
        downloadLink.classList.add('hidden');
    });

    // --- Functions ---
    async function handleTranscribe() {
        const file = audioFileInput.files[0];
        if (!file) {
            alert('Please select an audio file.');
            return;
        }

        // Reset UI
        loader.classList.remove('hidden');
        resultsDiv.classList.add('hidden');
        transcriptionOutput.innerHTML = '';
        phraseOutput.innerHTML = '';

        // Decode audio for later use in clipping
        const arrayBuffer = await file.arrayBuffer();
        originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Send to backend for transcription
        const formData = new FormData();
        formData.append('audio', file);

        try {
            const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            
            const result = await response.json();
            transcribedWords = result.words;
            displayTranscription(transcribedWords);
            resultsDiv.classList.remove('hidden');

        } catch (error) {
            console.error('Transcription Error:', error);
            alert('Failed to transcribe audio. See console for details.');
        } finally {
            loader.classList.add('hidden');
        }
    }

    function displayTranscription(words) {
        words.forEach((wordData, index) => {
            const wordEl = document.createElement('span');
            wordEl.textContent = wordData.word;
            wordEl.className = 'word-token';
            wordEl.dataset.index = index;
            wordEl.addEventListener('click', () => addWordToPhrase(wordData));
            transcriptionOutput.appendChild(wordEl);
        });
    }

    function addWordToPhrase(wordData) {
        const wordEl = document.createElement('span');
        wordEl.textContent = wordData.word;
        wordEl.className = 'word-token';
        // Store data needed for clipping
        wordEl.dataset.startTime = wordData.startTime;
        wordEl.dataset.endTime = wordData.endTime;
        // Allow removing word by clicking it again
        wordEl.addEventListener('click', () => wordEl.remove());
        phraseOutput.appendChild(wordEl);
    }

    async function handleCreateClip() {
        const phraseWords = Array.from(phraseOutput.children);
        if (phraseWords.length === 0) {
            alert('Please build a phrase first.');
            return;
        }

        const segments = phraseWords.map(el => ({
            start: parseFloat(el.dataset.startTime),
            end: parseFloat(el.dataset.endTime)
        }));

        const totalDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
        const offlineContext = new OfflineAudioContext(originalAudioBuffer.numberOfChannels, audioContext.sampleRate * totalDuration, audioContext.sampleRate);
        
        let currentTime = 0;
        for (const segment of segments) {
            const duration = segment.end - segment.start;
            const source = offlineContext.createBufferSource();
            source.buffer = originalAudioBuffer;
            source.start(currentTime, segment.start, duration);
            source.connect(offlineContext.destination);
            currentTime += duration;
        }

        const finalBuffer = await offlineContext.startRendering();
        const wavBlob = bufferToWave(finalBuffer);
        const audioUrl = URL.createObjectURL(wavBlob);

        clippedAudioPlayer.src = audioUrl;
        downloadLink.href = audioUrl;
        downloadLink.download = 'clipped_phrase.wav';
        downloadLink.classList.remove('hidden');
        clippedAudioPlayer.play();
    }

    // Helper function to convert AudioBuffer to a WAV file Blob
    function bufferToWave(abuffer) {
        let numOfChan = abuffer.numberOfChannels,
            length = abuffer.length * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [],
            i, sample,
            offset = 0,
            pos = 0;

        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"

        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2); // block-align
        setUint16(16); // 16-bit
        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4); // chunk length

        for (i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));
        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }
        return new Blob([view], { type: 'audio/wav' });

        function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
        function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
    }
});