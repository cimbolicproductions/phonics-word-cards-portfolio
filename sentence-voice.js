import * as ort from './voice/ort.wasm.min.mjs';
import { sentencePhrases } from './sentence-phonemes.js';

const assets = new URL('./voice/', import.meta.url);
const sampleRate = 24000;
const styleWidth = 256;
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = assets.href;

let pendingModel;
let work = Promise.resolve();

async function getAsset(name) {
  const response = await fetch(new URL(name, assets), { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error('Voice asset unavailable: ' + name);
  return response;
}

async function getModelBytes() {
  const url = new URL('kokoro-q8.onnx.gz', assets);
  const cache = await self.caches?.open('phonics-kokoro-heart-v1').catch(() => null);
  let response = await cache?.match(url).catch(() => null);
  if (!response) {
    response = await getAsset('kokoro-q8.onnx.gz');
    cache?.put(url, response.clone()).catch(() => {});
  }
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function loadModel() {
  if (!pendingModel) {
    pendingModel = (async () => {
      const [model, styles, config] = await Promise.all([
        getModelBytes(),
        getAsset('heart.bin').then(response => response.arrayBuffer()),
        getAsset('kokoro-vocab.json').then(response => response.json()),
      ]);
      const session = await ort.InferenceSession.create(model, { executionProviders: ['wasm'] });
      return { session, styles: new Float32Array(styles), vocab: config.vocab };
    })().catch(error => {
      pendingModel = undefined;
      throw error;
    });
  }
  return pendingModel;
}

function trimSilence(data) {
  let start = data.findIndex(value => Math.abs(value) > .009);
  if (start < 0) throw new Error('Voice produced silence');
  let end = data.findLastIndex(value => Math.abs(value) > .009) + 1;
  start = Math.max(0, start - 850);
  end = Math.min(data.length, end + 1150);
  return data.subarray(start, end);
}

function wavFile(clips) {
  const gap = Math.round(sampleRate * .14);
  const sampleCount = clips.reduce((count, clip) => count + clip.length, 0) + gap * clips.length;
  const data = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(data);
  const tag = (offset, text) => {
    for (let index = 0; index < text.length; index++) view.setUint8(offset + index, text.charCodeAt(index));
  };
  tag(0, 'RIFF');
  view.setUint32(4, data.byteLength - 8, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  let peak = 0;
  for (const clip of clips) {
    for (const sample of clip) peak = Math.max(peak, Math.abs(sample));
  }
  const gain = .73 / peak;
  let offset = 44;
  for (const clip of clips) {
    for (const sample of clip) {
      view.setInt16(offset, Math.round(sample * gain * 32767), true);
      offset += 2;
    }
    offset += gap * 2;
  }
  return data;
}

async function renderSentence(words) {
  const { session, styles, vocab } = await loadModel();
  const clips = [];
  for (const phrase of sentencePhrases(words)) {
    const ids = Array.from(phrase, symbol => {
      const id = vocab[symbol];
      if (id === undefined) throw new Error('Unknown phoneme in sentence');
      return BigInt(id);
    });
    const styleStart = ids.length * styleWidth;
    const { waveform } = await session.run({
      input_ids: new ort.Tensor('int64', BigInt64Array.from([0n, ...ids, 0n]), [1, ids.length + 2]),
      style: new ort.Tensor('float32', styles.slice(styleStart, styleStart + styleWidth), [1, styleWidth]),
      speed: new ort.Tensor('float32', Float32Array.of(.92), [1]),
    });
    clips.push(trimSilence(waveform.data));
  }
  return wavFile(clips);
}

self.addEventListener('message', event => {
  const { id, words } = event.data;
  work = work.then(async () => {
    try {
      const wav = await renderSentence(words);
      self.postMessage({ id, wav }, [wav]);
    } catch (error) {
      self.postMessage({ id, error: error.message });
    }
  });
});
