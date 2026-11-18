import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { levels, helpers } from './words.js';
import { decodeSteps } from './speech.js';
import { sentencePhrases } from './sentence-phonemes.js';

const credits = readFileSync(new URL('./photo-credits.html', import.meta.url), 'utf8');
const photoFiles = readdirSync(new URL('./photos/', import.meta.url)).sort();
const soundFiles = readdirSync(new URL('./sounds/', import.meta.url)).sort();
const blendFiles = readdirSync(new URL('./blends/', import.meta.url)).sort();
const spokenFiles = readdirSync(new URL('./spoken/', import.meta.url)).sort();
const packs = levels.flatMap(level => level.words);

test('every card has a unique spelling, bundled photo, and one credit', () => {
  const names = packs.map(word => word.spelling);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(photoFiles, names.map(word => word + '.webp').sort());
  const credited = [...credits.matchAll(/<li><strong>(\w+)<\/strong>/g)].map(match => match[1]);
  assert.deepEqual(credited.sort(), names.sort());
  assert.deepEqual(levels.map(level => level.pictureOnFront), [true, true, false, false]);
  for (const entry of [...packs, ...helpers]) {
    assert.ok(photoFiles.includes(entry.photo?.split('/').at(-1)), entry.spelling);
  }
});

test('written chunks reconstruct each word and their sounds are bundled', () => {
  const expectedSounds = new Set();
  const expectedBlends = new Set();
  const expectedSpoken = new Set();
  for (const word of [...packs, ...helpers]) {
    assert.equal(word.chunks.map(([letters]) => letters).join(''), word.spelling);
    expectedSpoken.add(word.spelling + '.wav');
    if (word.pairs) assert.deepEqual(word.pairs, [word.spelling.slice(0, 2), word.spelling.slice(1)]);
    for (const pair of word.pairs ?? []) expectedBlends.add(pair + '.wav');
    if (word.heart) continue;
    for (const [, sound] of word.chunks) {
      if (sound) (word.syllables ? expectedSpoken : expectedSounds).add(sound + '.wav');
    }
  }
  assert.deepEqual(soundFiles, [...expectedSounds].sort());
  assert.deepEqual(blendFiles, [...expectedBlends].sort());
  assert.deepEqual(spokenFiles, [...expectedSpoken].sort());
});

test('decoding skips silent sounds and reads heart words once', () => {
  const cake = packs.find(word => word.spelling === 'cake');
  const cakeSteps = decodeSteps(cake, 'card');
  assert.deepEqual(cakeSteps.map(step => step.part), [0, 1, 2, 3, 'whole']);
  assert.equal(cakeSteps[3].sound, null);
  assert.match(cakeSteps[4].sound, /^\.\/spoken\/cake\.wav\?/);

  const rabbit = packs.find(word => word.spelling === 'rabbit');
  const rabbitSteps = decodeSteps(rabbit, 'card');
  assert.deepEqual(rabbitSteps.map(step => step.sound.split('?')[0]), [
    './spoken/rab.wav', './spoken/bit.wav', './spoken/rabbit.wav',
  ]);
  assert.ok(rabbitSteps.slice(0, 2).every(step => step.rate < 1 && step.gap === 300));
  assert.equal(rabbitSteps.at(-1).rate, undefined);

  const said = helpers.find(word => word.spelling === 'said');
  const [step, ...rest] = decodeSteps(said, 4);
  assert.match(step.sound, /^\.\/spoken\/said\.wav\?/);
  assert.equal(step.part, 'heart');
  assert.equal(rest.length, 0);
});

test('cat decodes as ca, at, then the whole word', () => {
  const steps = decodeSteps(packs.find(word => word.spelling === 'cat'), 'card');
  assert.deepEqual(steps.map(step => step.sound.split('?')[0]), [
    './blends/ca.wav', './blends/at.wav', './spoken/cat.wav',
  ]);
  assert.deepEqual(steps.map(step => step.part), [[0, 1], [1, 2], 'whole']);
  assert.deepEqual(steps.map(step => step.rate ?? 1), [.7, .7, 1]);
});

test('the full sentence voice covers all selectable words and splits long sequences', () => {
  const words = [...packs, ...helpers].map(word => word.spelling);
  const vocab = JSON.parse(readFileSync(new URL('./voice/kokoro-vocab.json', import.meta.url), 'utf8')).vocab;
  const phrases = sentencePhrases(Array.from({ length: 6 }, () => words).flat());
  assert.ok(phrases.length > 1);
  for (const phrase of phrases) {
    assert.ok(phrase.length <= 400);
    assert.ok([...phrase].every(symbol => Object.hasOwn(vocab, symbol)));
  }
  assert.equal(sentencePhrases(['the', 'cat', 'can', 'sit'])[0], 'ðə kˈæt kən sˈɪt.');
});
