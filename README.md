# Phonics Word Cards

A static practice app for early readers. Choose a card and press **Hear the word** to listen to its chunks and then the whole word. Flip the card to check its picture. Build sentences from an empty strip or start one from a card. Choose from action words, naming words, and sentence helpers. Every sentence choice has a picture. Helpers reuse a photo from the word packs as a contextual cue. Drag a word by its grip, or use the tap and keyboard controls.

## Run locally

Start a static server in this directory.

```shell
python -m http.server 4316 --bind 127.0.0.1
```

Open [Phonics Word Cards](http://127.0.0.1:4316/). Run `npm test` to check the pack, credits, and playback data with Node.js. No npm install is needed.

## Audio

Isolated sounds, blends, syllables, and whole words all use bundled clips from Kokoro 82M's Heart voice. Short-vowel cards play two overlapping spelling groups, such as “ca,” “at,” then “cat.” The groups and syllables play at 70% speed. Other phonemes and blends play at 78% speed. Each clip finishes before the pause and the next clip begins. Whole words play at their recorded speed. The silent e is highlighted during a longer pause, and heart words are spoken whole. [Kokoro 82M ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX).

The fluent pass uses the same Kokoro Heart voice in a browser worker. Custom sentences are assembled from the app's existing word bank using the pronunciations in `sentence-phonemes.js`. The first use of **Play sentence** loads about 75 MB of model and runtime assets on demand. The browser caches the compressed model where Cache Storage is available. Card decoding and individual words use small bundled clips and work without that download. All voice work stays on the device.

All fonts, photos, and isolated sounds are bundled. [Photo credits](photo-credits.html) identifies the source and license for each photo. Adding a pack word requires an explicit spelling breakdown and a photo with credits. Sentence helpers are separate from the picture-card packs.
