#!/bin/bash

# Project name
PROJECT="ClipMyPhrase"

# Create main project folder
# mkdir $PROJECT
# cd $PROJECT || exit

# Create main files
touch README.md LICENSE .gitignore index.html

# Create folders
mkdir css js audio assets assets/icons assets/images docs

# Create placeholder files
touch css/style.css js/main.js audio/sample.mp3 docs/notes.md

# Add a simple README placeholder
echo "# ClipMyPhrase 🎵✂️" >> README.md
echo "ClipMyPhrase is a tool to extract phrases from audio and download custom clips." >> README.md

echo "Folder structure for $PROJECT created successfully!"
