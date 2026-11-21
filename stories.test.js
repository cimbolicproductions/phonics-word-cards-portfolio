import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { stories, storyVocabulary, storyTokens, storyReadingSteps } from './stories.js';

test('each level has two stories and every displayed word has a complete audio clip', () => {
  assert.equal(new Set(stories.map(story => story.id)).size, 8);
  assert.deepEqual([0, 1, 2, 3].map(level => stories.filter(story => story.level === level).length), [2, 2, 2, 2]);
  const used = new Set();
  for (const story of stories) {
    assert.ok(existsSync(new URL(story.photo, import.meta.url)));
    assert.ok(story.lines.length >= 4);
    const tokens = storyTokens(story);
    const steps = storyReadingSteps(story);
    assert.equal(tokens.length, steps.length);
    for (const [index, step] of steps.entries()) {
      assert.ok(existsSync(new URL(step.sound, import.meta.url)), story.id + ' ' + tokens[index].text);
      assert.equal(step.target, 'story-word-' + index);
      assert.equal(step.rate, .78);
      assert.equal(step.gap, /[.!?]$/.test(tokens[index].text) ? 650 : 200);
      const audio = readFileSync(new URL(step.sound, import.meta.url));
      assert.equal(audio.toString('ascii', 0, 4), 'RIFF');
      assert.equal(audio.readUInt32LE(24), 24000);
      assert.ok(audio.length > 6000);
      if (step.sound.startsWith('./story-audio/')) used.add(tokens[index].word);
    }
  }
  assert.deepEqual([...used].sort(), Object.keys(storyVocabulary).sort());
  assert.deepEqual(readdirSync(new URL('./story-audio/', import.meta.url)).sort(), [...used].map(word => word + '.wav').sort());
});
