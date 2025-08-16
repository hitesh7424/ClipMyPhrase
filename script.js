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

    // --- Configuration ---
    const CHUNK_DURATION_SECONDS = 9; // Keep this under 10 to be safe

    // --- Event Listeners ---
    transcribeButton.addEventListener('click', handleTranscribe);
    createClipButton.addEventListener('click', handleCreateClip);
    clearPhraseButton.addEventListener('click', () => {
        phraseOutput.innerHTML = '';
        clippedAudioPlayer.src = '';
        downloadLink.classList.add('hidden');
    });

    // --- Core Transcription Logic ---
    async function handleTranscribe() {
        const file = audioFileInput.files[0];
        if (!file) {
            alert('Please select an audio file.');
            return;
        }

        // 1. Reset UI
        loader.classList.remove('hidden');
        resultsDiv.classList.add('hidden');
        transcriptionOutput.innerHTML = '';
        phraseOutput.innerHTML = '';
        transcribeButton.disabled = true;
        transcribeButton.textContent = 'Transcribing...';

        try {
            // 2. Load and decode the full audio file in the browser
            const arrayBuffer = await file.arrayBuffer();
            originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // 3. Slice the audio into chunks
            const chunks = sliceAudioBuffer(originalAudioBuffer);

            // 4. Transcribe each chunk one by one
            let allWords = [];
            for (let i = 0; i < chunks.length; i++) {
                console.log(`Transcribing chunk ${i + 1} of ${chunks.length}...`);
                transcribeButton.textContent = `Transcribing chunk ${i + 1}/${chunks.length}`;
                const chunkBlob = bufferToWave(chunks[i].buffer);
                const chunkTranscription = await transcribeChunk(chunkBlob);
                
                // 5. Adjust timestamps and collect words
                const adjustedWords = chunkTranscription.map(word => ({
                    ...word,
                    startTime: word.startTime + chunks[i].startTime,
                    endTime: word.endTime + chunks[i].startTime,
                }));
                allWords.push(...adjustedWords);
            }

            transcribedWords = allWords;
            displayTranscription(transcribedWords);
            resultsDiv.classList.remove('hidden');

        } catch (error) {
            console.error('Transcription Error:', error);
            alert('An error occurred during transcription. Please check the console for details.');
        } finally {
            // 6. Finalize UI
            loader.classList.add('hidden');
            transcribeButton.disabled = false;
            transcribeButton.textContent = '1. Transcribe Audio';
        }
    }

    function sliceAudioBuffer(buffer) {
        const chunks = [];
        const sampleRate = buffer.sampleRate;
        const totalSamples = buffer.length;
        const chunkSamples = CHUNK_DURATION_SECONDS * sampleRate;

        for (let offset = 0; offset < totalSamples; offset += chunkSamples) {
            const remainingSamples = totalSamples - offset;
            const currentChunkSamples = Math.min(chunkSamples, remainingSamples);

            const chunkBuffer = audioContext.createBuffer(
                buffer.numberOfChannels,
                currentChunkSamples,
                sampleRate
            );

            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                const sourceData = buffer.getChannelData(channel);
                const chunkData = chunkBuffer.getChannelData(channel);
                chunkData.set(sourceData.subarray(offset, offset + currentChunkSamples));
            }

            chunks.push({
                buffer: chunkBuffer,
                startTime: offset / sampleRate,
            });
        }
        return chunks;
    }

    async function transcribeChunk(chunkBlob) {
        const formData = new FormData();
        formData.append('audio', chunkBlob, 'chunk.wav');
        
        const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Server error: ${response.statusText} - ${errorBody}`);
        }
        const result = await response.json();
        return result.words;
    }
    
    // --- UI and Clipping Functions (no changes from previous version) ---
    // --- Replace your existing displayTranscription function with this one ---

function displayTranscription(words) {
    words.forEach((wordData, index) => {
        const wordEl = document.createElement('span');
        wordEl.textContent = wordData.word;
        wordEl.className = 'word-token';
        wordEl.dataset.index = index;
        
        // --- THIS IS THE NEW PART ---
        // Format the timestamp nicely to two decimal places
        const startTime = wordData.startTime.toFixed(2);
        const endTime = wordData.endTime.toFixed(2);
        // Create the data-timestamp attribute for the CSS tooltip
        wordEl.dataset.timestamp = `${startTime}s - ${endTime}s`;
        // --- END OF NEW PART ---

        wordEl.addEventListener('click', () => addWordToPhrase(wordData));
        transcriptionOutput.appendChild(wordEl);
    });
}

    function addWordToPhrase(wordData) {
        const wordEl = document.createElement('span');
        wordEl.textContent = wordData.word;
        wordEl.className = 'word-token';
        wordEl.dataset.startTime = wordData.startTime;
        wordEl.dataset.endTime = wordData.endTime;
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
        if (totalDuration <= 0) return;

        const offlineContext = new OfflineAudioContext(originalAudioBuffer.numberOfChannels, audioContext.sampleRate * totalDuration, audioContext.sampleRate);
        
        let currentTime = 0;
        for (const segment of segments) {
            const duration = segment.end - segment.start;
            if (duration <= 0) continue;
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

    function bufferToWave(abuffer) {
        let numOfChan = abuffer.numberOfChannels,
            length = abuffer.length * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [],
            i, sample,
            offset = 0,
            pos = 0;

        setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
        setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
        setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
        setUint32(length - pos - 4);

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