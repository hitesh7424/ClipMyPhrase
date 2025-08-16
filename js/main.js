const audioUpload = document.getElementById('audioUpload');
const audioPlayer = document.getElementById('audioPlayer');

audioUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        audioPlayer.src = url;
        audioPlayer.play();
    }
});
