document.addEventListener('DOMContentLoaded', () => {
    const audioFileInput = document.getElementById('audioFileInput');
    const transcribeButton = document.getElementById('transcribeButton');
    const loader = document.getElementById('loader');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    const clippingControls = document.getElementById('clippingControls');
    const clipButton = document.getElementById('clipButton');
    const clippedAudioPlayer = document.getElementById('clippedAudioPlayer');

    let words = [];

    transcribeButton.addEventListener('click', async () => {
        const file = audioFileInput.files[0];
        if (!file) {
            alert('Please select an audio file first.');
            return;
        }

        loader.classList.remove('hidden');
        transcriptionOutput.innerHTML = '';
        clippingControls.classList.add('hidden');

        const formData = new FormData();
        formData.append('audio', file);

        try {
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const result = await response.json();
            words = result.words;
            displayTranscription(words);

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during transcription.');
        } finally {
            loader.classList.add('hidden');
        }
    });

    function displayTranscription(transcribedWords) {
        transcriptionOutput.innerHTML = '';
        transcribedWords.forEach((word, index) => {
            const span = document.createElement('span');
            span.textContent = word.word + ' ';
            span.classList.add('word');
            span.dataset.index = index;
            span.addEventListener('click', handleWordClick);
            transcriptionOutput.appendChild(span);
        });
        clippingControls.classList.remove('hidden');
    }

    let selectedIndices = [];

    function handleWordClick(event) {
        const clickedIndex = parseInt(event.target.dataset.index);

        if (selectedIndices.length === 0) {
            selectedIndices.push(clickedIndex);
        } else if (selectedIndices.length === 1) {
            selectedIndices.push(clickedIndex);
            selectedIndices.sort((a, b) => a - b);
        } else {
            selectedIndices = [clickedIndex];
        }

        updateSelection();
    }

    function updateSelection() {
        document.querySelectorAll('.word').forEach(span => {
            span.classList.remove('selected');
        });

        if (selectedIndices.length === 2) {
            for (let i = selectedIndices[0]; i <= selectedIndices[1]; i++) {
                document.querySelector(`.word[data-index='${i}']`).classList.add('selected');
            }
        } else if (selectedIndices.length === 1) {
            document.querySelector(`.word[data-index='${selectedIndices[0]}']`).classList.add('selected');
        }
    }

    clipButton.addEventListener('click', () => {
        if (selectedIndices.length !== 2) {
            alert('Please select a start and end word to create a clip.');
            return;
        }

        const startTime = words[selectedIndices[0]].startTime;
        const endTime = words[selectedIndices[1]].endTime;

        const originalAudioFile = audioFileInput.files[0];
        const audioUrl = URL.createObjectURL(originalAudioFile);

        clippedAudioPlayer.src = `${audioUrl}#t=${startTime},${endTime}`;
        clippedAudioPlayer.play();
    });
});