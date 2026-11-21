const audioVersion = '?v=kokoro-3';
const decodeRate = 0.78;
const syllableRate = 0.70;

export function createSpeechPlayer({ onBusy, onMessage, onHighlight }) {
  const clip = new Audio();
  let current;
  let sentenceWorker;
  let requestId = 0;

  function stop() {
    if (current) {
      current.abort();
      current = undefined;
    }
    onHighlight(null);
    onBusy(false);
    onMessage('');
  }

  const pause = (duration, signal) => new Promise(resolve => {
    const timer = setTimeout(finish, duration);
    signal.addEventListener('abort', finish, { once: true });
    function finish() {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    }
  });

  function prepareSentence(words, signal) {
    return new Promise((resolve, reject) => {
      sentenceWorker ??= new Worker(new URL('./sentence-voice.js', import.meta.url), { type: 'module' });
      const worker = sentenceWorker;
      const id = requestId++;
      function cleanup() {
        worker.removeEventListener('message', onReply);
        worker.removeEventListener('error', onWorkerError);
        signal.removeEventListener('abort', onAbort);
      }
      function onReply(event) {
        if (event.data.id !== id) return;
        cleanup();
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.wav);
      }
      function onWorkerError() {
        cleanup();
        worker.terminate();
        sentenceWorker = undefined;
        reject(new Error('Sentence voice could not start'));
      }
      function onAbort() {
        cleanup();
        resolve(null);
      }
      worker.addEventListener('message', onReply);
      worker.addEventListener('error', onWorkerError);
      signal.addEventListener('abort', onAbort, { once: true });
      worker.postMessage({ id, words });
    });
  }

  function playSound(step, signal) {
    return new Promise((resolve, reject) => {
      const rate = step.rate ?? 1;
      clip.src = step.sound;
      clip.defaultPlaybackRate = rate;
      clip.playbackRate = rate;
      clip.preservesPitch = true;
      let settled = false;
      clip.onplaying = () => {
        clearTimeout(watchdog);
        if (!signal.aborted) onHighlight(step);
      };
      clip.onended = () => finish();
      clip.onerror = () => finish(new Error('Sound unavailable'));
      signal.addEventListener('abort', cancel, { once: true });
      const watchdog = setTimeout(() => finish(new Error('Sound did not start')), 6500);
      clip.play().catch(finish);

      function cancel() {
        clip.pause();
        finish();
      }

      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        signal.removeEventListener('abort', cancel);
        clip.onplaying = clip.onended = clip.onerror = null;
        if (error) {
          clip.pause();
          reject(error);
        } else resolve();
      }
    });
  }

  async function play(steps, errorMessage = 'Audio stopped. Tap the word or sentence to try again.') {
    stop();
    const playback = new AbortController();
    current = playback;
    const { signal } = playback;
    onBusy(true);
    const sentence = steps.find(step => step.words);
    let prepared;
    let voiceReady = false;
    if (sentence) {
      // Prepare the fluent reading while the word clips play.
      prepared = prepareSentence(sentence.words, signal).then(
        wav => { voiceReady = true; return { wav }; },
        error => { voiceReady = true; return { error }; },
      );
    }
    let preparingVoice = false;
    try {
      for (const step of steps) {
        if (signal.aborted) return false;
        if (step.sound) {
          await playSound(step, signal);
        } else if (step.words) {
          preparingVoice = true;
          if (!voiceReady) onMessage('Loading the sentence voice. The first time can take a moment.');
          const { wav, error } = await prepared;
          if (signal.aborted) return false;
          if (error) throw error;
          onMessage('');
          const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
          try {
            await playSound({ ...step, sound: url }, signal);
          } finally {
            URL.revokeObjectURL(url);
          }
          preparingVoice = false;
        } else {
          onHighlight(step);
        }
        if (signal.aborted) return false;
        if (step.sound || step.words) onHighlight(null);
        if (step.gap) await pause(step.gap, signal);
      }
      return !signal.aborted;
    } catch {
      if (!signal.aborted) {
        onMessage(preparingVoice
          ? 'The sentence voice could not load. Tap Play sentence to try again.'
          : errorMessage);
      }
      return false;
    } finally {
      if (current === playback) {
        current = undefined;
        onHighlight(null);
        onBusy(false);
      }
    }
  }

  return { play, stop };
}

const spokenClip = spelling => './spoken/' + spelling + '.wav' + audioVersion;

export function wholeWordStep(word, target) {
  return { sound: spokenClip(word.spelling), part: word.heart ? 'heart' : 'whole', target };
}

export function decodeSteps(word, target) {
  const wholeWord = wholeWordStep(word, target);
  if (word.heart) return [wholeWord];
  if (word.pairs) {
    return [...word.pairs.map((pair, part) => ({
      sound: './blends/' + pair + '.wav' + audioVersion,
      rate: syllableRate, part: [part, part + 1], target, gap: 300,
    })), wholeWord];
  }
  return [
    ...word.chunks.map(([, sound], part) => ({
      sound: sound ? (word.syllables ? spokenClip(sound) : './sounds/' + sound + '.wav' + audioVersion) : null,
      rate: word.syllables ? syllableRate : decodeRate,
      part, target, gap: sound ? 300 : 440,
    })),
    wholeWord,
  ];
}
