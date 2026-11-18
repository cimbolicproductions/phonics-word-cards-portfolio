import { levels, helpers } from './words.js?v=kokoro-3';
import { createSpeechPlayer, decodeSteps, wholeWordStep } from './speech.js?v=kokoro-3';

const element = id => document.getElementById(id);
const levelOptions = element('level-options');
const cardStage = element('card-stage');
const wordOptions = element('word-options');
const namingOptions = element('naming-options');
const actionOptions = element('action-options');
const strip = element('sentence-strip');
const sentenceWordGroups = element('sentence-word-groups');
const wordPalette = element('word-palette');
const actionPalette = element('action-palette');
const helperPalette = element('helper-palette');
const celebration = element('celebration');
const stopSpeech = element('stop-speech');
const speechFeedback = element('speech-feedback');
const sentenceVoiceFeedback = element('sentence-voice-feedback');

let levelIndex = 0;
let wordIndex = 0;
let mode = 'cards';
let sentence = [];
let previousSentence = null;
let nextToken = 0;
let selectedToken = null;
let wordToHear = null;
let highlighted = [];

const level = () => levels[levelIndex];
const word = () => level().words[wordIndex];
const audio = createSpeechPlayer({
  onBusy: busy => { stopSpeech.hidden = !busy; },
  onMessage(message) {
    speechFeedback.textContent = mode === 'cards' ? message : '';
    sentenceVoiceFeedback.textContent = mode === 'sentence' ? message : '';
  },
  onHighlight(step) {
    for (const node of highlighted) node.classList.remove('speaking');
    highlighted = [];
    if (!step) return;
    let selector = '.chunk';
    if (step.part === 'heart') selector = '.chunk.tricky';
    else if (Array.isArray(step.part)) {
      selector = '.chunk:is(' + step.part.map(part => '[data-part="' + part + '"]').join(',') + ')';
    }
    else if (typeof step.part === 'number') selector = '.chunk[data-part="' + step.part + '"]';
    const targets = step.target === 'sentence'
      ? strip.querySelectorAll('.chunk')
      : document.querySelectorAll('[data-speech-target="' + step.target + '"] ' + selector);
    highlighted = Array.from(targets);
    for (const node of highlighted) node.classList.add('speaking');
  },
});

function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text) result.textContent = text;
  return result;
}

function button(className, text, action, label) {
  const result = node('button', className, text);
  result.type = 'button';
  if (label) result.setAttribute('aria-label', label);
  if (action) result.addEventListener('click', action);
  return result;
}

function renderSpelling(entry, target, className = '') {
  const spelling = node('span', className || undefined);
  spelling.dataset.speechTarget = target;
  for (const [index, [text, sound]] of entry.chunks.entries()) {
    const chunk = node('span', 'chunk', text);
    chunk.dataset.part = index;
    if (entry.heart && sound) chunk.classList.add('tricky');
    if (sound === null) chunk.classList.add('silent');
    spelling.append(chunk);
  }
  return spelling;
}

function photo(entry, back) {
  const figure = node('span', back ? 'card-photo back-photo' : 'card-photo');
  const image = node('img');
  image.alt = '';
  image.src = entry.photo;
  image.addEventListener('error', () => {
    image.replaceWith(node('span', 'missing-photo', 'Picture unavailable'));
  });
  figure.append(image);
  return figure;
}

function renderCards() {
  const entry = word();
  const front = node('span', 'card-face front');
  const back = node('span', 'card-face back');
  back.setAttribute('aria-hidden', 'true');
  front.append(renderSpelling(entry, 'card', 'spelling'));
  if (level().pictureOnFront) {
    front.classList.add('has-photo');
    front.append(photo(entry, false));
  }
  back.append(photo(entry, true), renderSpelling(entry, 'card', 'spelling'));
  const card = node('div', 'flashcard');
  card.append(front, back);
  cardStage.replaceChildren(card);
  element('flip-card').setAttribute('aria-pressed', 'false');
  element('flip-card').setAttribute('aria-label', 'Flip card to show picture');
  element('word-count').textContent = (wordIndex + 1) + ' of ' + level().words.length;
  const choices = level().words.map((item, index) => {
    const choice = button('word-option', item.spelling, () => {
      chooseWord(index);
      wordOptions.querySelector('[data-word-index="' + index + '"]')?.focus();
    });
    choice.dataset.wordIndex = index;
    choice.setAttribute('aria-pressed', String(index === wordIndex));
    return choice;
  });
  namingOptions.replaceChildren(...choices.filter((_, index) => !level().words[index].action));
  actionOptions.replaceChildren(...choices.filter((_, index) => level().words[index].action));
  element('action-options-group').hidden = !actionOptions.childElementCount;
}

function chooseWord(index) {
  audio.stop();
  wordIndex = (index + level().words.length) % level().words.length;
  renderCards();
}

function playCard() {
  return audio.play(decodeSteps(word(), 'card'));
}

function changeMode(next, focusHeading = false) {
  audio.stop();
  mode = next;
  const isCards = next === 'cards';
  element('cards-view').hidden = !isCards;
  element('sentence-view').hidden = isCards;
  element('cards-mode').setAttribute('aria-pressed', String(isCards));
  element('sentence-mode').setAttribute('aria-pressed', String(!isCards));
  const heading = element('page-title');
  heading.textContent = isCards ? 'Sound it out' : 'Build a sentence';
  element('page-description').textContent = isCards
    ? 'Choose a card, then press Hear the word to sound it out.'
    : 'Put words together and listen to what you made.';
  if (isCards) renderCards();
  else renderSentence();
  if (focusHeading) {
    heading.tabIndex = -1;
    heading.focus();
  }
}

function setSentence(next, message, focusToken = null) {
  audio.stop();
  previousSentence = sentence;
  sentence = next;
  selectedToken = null;
  renderSentence();
  element('sentence-status').textContent = message;
  if (focusToken !== null) strip.querySelector('[data-token="' + focusToken + '"] .sentence-word')?.focus();
}

function makeToken(entry) {
  return { id: nextToken++, entry };
}

function place(entry, replaceId = selectedToken, restoreFocus = true) {
  const token = makeToken(entry);
  const replacing = sentence.find(item => item.id === replaceId);
  const next = replacing
    ? sentence.map(item => item.id === replaceId ? token : item)
    : [...sentence, token];
  setSentence(next, replacing
    ? 'Replaced ' + replacing.entry.spelling + ' with ' + entry.spelling + '.'
    : 'Added ' + entry.spelling + '.', restoreFocus ? token.id : null);
}

function setSelected(id, focusPalette = false) {
  selectedToken = id;
  for (const chip of strip.querySelectorAll('.sentence-token')) {
    const selected = Number(chip.dataset.token) === id;
    chip.classList.toggle('selected', selected);
    chip.querySelector('.swap-word').setAttribute('aria-pressed', String(selected));
  }
  const index = sentence.findIndex(token => token.id === id);
  const editing = index >= 0;
  element('sentence-edit').hidden = !editing;
  element('earlier-word').disabled = index <= 0;
  element('later-word').disabled = index === sentence.length - 1;
  element('sentence-palette-title').textContent = editing ? 'Swap a word' : 'Add a word';
  element('sentence-help').textContent = editing
    ? 'Choose a word to put in place of ' + sentence[index].entry.spelling + '.'
    : 'Choose a word, then press Hear the word.';
  if (editing && focusPalette) sentenceWordGroups.querySelector('.word-option')?.focus();
}

function moveToken(id, destination) {
  const index = sentence.findIndex(token => token.id === id);
  if (index < 0 || index === destination || destination < 0 || destination >= sentence.length) return;
  const next = [...sentence];
  const [token] = next.splice(index, 1);
  next.splice(destination, 0, token);
  setSentence(next, 'Moved ' + token.entry.spelling + '.', token.id);
}

function paletteWord(entry) {
  const container = node('span', 'palette-token');
  const tap = button('word-option', entry.spelling, () => place(entry));
  tap.prepend(thumbnail(entry));
  const grip = button('drag-grip', '⠿', () => place(entry), 'Add or drag ' + entry.spelling);
  grip.addEventListener('pointerdown', event => beginDrag(event, { entry }));
  container.append(tap, grip);
  return container;
}

function thumbnail(entry) {
  const image = node('img', 'word-thumbnail');
  image.alt = '';
  image.src = entry.photo;
  image.loading = 'lazy';
  return image;
}

function selectWordToHear(id) {
  wordToHear = id;
  for (const chip of strip.querySelectorAll('.sentence-token')) {
    chip.querySelector('.sentence-word').setAttribute('aria-pressed', String(Number(chip.dataset.token) === id));
  }
  element('play-sentence-word').disabled = id === null;
}

function renderSentence() {
  strip.replaceChildren(...sentence.map(token => {
    const { id, entry } = token;
    const chip = node('span', 'sentence-token');
    chip.dataset.token = id;
    const tap = button('sentence-word', '', () => selectWordToHear(id), 'Select ' + entry.spelling);
    tap.append(thumbnail(entry), renderSpelling(entry, id));
    let lastSwapTouch = -Infinity;
    const swap = button('swap-word', 'Swap', event => {
      if (event.pointerType === 'touch') return;
      if (!event.pointerType && event.detail && performance.now() - lastSwapTouch < 700) return;
      setSelected(selectedToken === id ? null : id, event.detail === 0);
    }, 'Swap ' + entry.spelling);
    // A touch release can reach the button even if the browser suppresses its click after a drag.
    let swapTouch = null;
    swap.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') swapTouch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    swap.addEventListener('pointerup', event => {
      if (swapTouch?.id === event.pointerId && Math.hypot(event.clientX - swapTouch.x, event.clientY - swapTouch.y) < 10) {
        lastSwapTouch = performance.now();
        setSelected(selectedToken === id ? null : id);
      }
      swapTouch = null;
    });
    swap.addEventListener('pointercancel', () => { swapTouch = null; });
    const grip = button('drag-grip', '⠿', () => setSelected(id), 'Move ' + entry.spelling);
    grip.addEventListener('pointerdown', event => beginDrag(event, token));
    chip.append(grip, tap, swap);
    return chip;
  }));
  if (!sentence.length) strip.append(node('span', 'empty-sentence', 'Add a word to start your sentence.'));
  element('sentence-help').hidden = !sentence.length;
  element('play-sentence').disabled = !sentence.length;
  element('clear-sentence').disabled = !sentence.length;
  element('undo-sentence').disabled = previousSentence === null;
  selectWordToHear(sentence.some(token => token.id === wordToHear) ? wordToHear : null);
  setSelected(selectedToken);
}

function renderPalette() {
  const available = levels.slice(0, levelIndex + 1).flatMap(pack => pack.words);
  wordPalette.replaceChildren(...available.filter(entry => !entry.action).map(paletteWord));
  actionPalette.replaceChildren(...[...available, ...helpers].filter(entry => entry.action).map(paletteWord));
  helperPalette.replaceChildren(...helpers.filter(entry => !entry.action).map(paletteWord));
}

let drag = null;
let suppressGripClick = false;
let clickTimer;

function beginDrag(event, token) {
  if (!event.isPrimary || event.button !== 0 || drag) return;
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  drag = { token, handle, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
}

document.addEventListener('pointermove', event => {
  if (drag?.pointerId !== event.pointerId) return;
  if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
  if (!drag.ghost) {
    drag.ghost = node('span', 'drag-ghost', drag.token.entry.spelling);
    drag.ghost.setAttribute('aria-hidden', 'true');
    document.body.append(drag.ghost);
  }
  drag.ghost.style.left = event.clientX + 'px';
  drag.ghost.style.top = event.clientY + 'px';
  const hovered = document.elementFromPoint(event.clientX, event.clientY);
  strip.classList.toggle('drop-active', strip.contains(hovered));
  const target = hovered?.closest('.sentence-token');
  if (drag.dropTarget !== target) {
    drag.dropTarget?.classList.remove('drop-target');
    target?.classList.add('drop-target');
    drag.dropTarget = target;
  }
});

function finishDrag(event, drop) {
  if (drag?.pointerId !== event.pointerId) return;
  const finished = drag;
  drag = null;
  if (!finished.ghost) return;
  const { token, ghost, dropTarget } = finished;
  ghost.remove();
  dropTarget?.classList.remove('drop-target');
  strip.classList.remove('drop-active');
  suppressGripClick = true;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => { suppressGripClick = false; }, 300);
  const hovered = document.elementFromPoint(event.clientX, event.clientY);
  if (!drop || !strip.contains(hovered)) return;
  const target = hovered.closest('.sentence-token');
  const targetId = target ? Number(target.dataset.token) : null;
  if (token.id === undefined) {
    place(token.entry, targetId, false);
  } else if (token.id !== targetId) {
    const from = sentence.findIndex(item => item.id === token.id);
    const to = target ? sentence.findIndex(item => item.id === targetId) : sentence.length - 1;
    if (!target) moveToken(token.id, to);
    else {
      const rect = target.getBoundingClientRect();
      const after = event.clientX > rect.left + rect.width / 2;
      moveToken(token.id, to + Number(after) - Number(from < to));
    }
  }
}

document.addEventListener('pointerup', event => finishDrag(event, true));
document.addEventListener('pointercancel', event => finishDrag(event, false));
document.addEventListener('lostpointercapture', event => finishDrag(event, false));
document.addEventListener('click', event => {
  if (suppressGripClick && event.target.closest('.drag-grip') && event.detail) {
    event.stopImmediatePropagation();
    event.preventDefault();
    suppressGripClick = false;
  }
}, true);

element('cards-mode').addEventListener('click', () => changeMode('cards'));
element('sentence-mode').addEventListener('click', () => changeMode('sentence'));
element('play-word').addEventListener('click', playCard);
element('play-sentence-word').addEventListener('click', () => {
  const token = sentence.find(item => item.id === wordToHear);
  if (token) audio.play(decodeSteps(token.entry, token.id));
});
stopSpeech.addEventListener('click', () => {
  audio.stop();
  element(mode === 'cards' ? 'play-word' : 'play-sentence').focus();
});
element('flip-card').addEventListener('click', event => {
  const card = cardStage.firstElementChild;
  const flipped = card.classList.toggle('is-flipped');
  card.querySelector('.front').setAttribute('aria-hidden', String(flipped));
  card.querySelector('.back').setAttribute('aria-hidden', String(!flipped));
  event.currentTarget.setAttribute('aria-pressed', String(flipped));
  event.currentTarget.setAttribute('aria-label', flipped ? 'Flip card to show word' : 'Flip card to show picture');
});
element('anchor-card').addEventListener('click', () => {
  const anchor = makeToken(word());
  setSentence([anchor], 'Started with ' + anchor.entry.spelling + '.');
  changeMode('sentence', true);
});
element('previous-word').addEventListener('click', () => chooseWord(wordIndex - 1));
element('next-word').addEventListener('click', () => chooseWord(wordIndex + 1));
element('clear-sentence').addEventListener('click', () => {
  setSentence([], 'Started a new sentence.');
  element('undo-sentence').focus();
});
element('undo-sentence').addEventListener('click', () => {
  if (previousSentence === null) return;
  setSentence(previousSentence, 'Restored the previous sentence.');
  previousSentence = null;
  element('undo-sentence').disabled = true;
  sentenceWordGroups.querySelector('.word-option')?.focus();
});
element('cancel-swap').addEventListener('click', () => {
  const chip = strip.querySelector('[data-token="' + selectedToken + '"] .swap-word');
  setSelected(null);
  chip?.focus();
});
element('earlier-word').addEventListener('click', () => moveToken(selectedToken, sentence.findIndex(token => token.id === selectedToken) - 1));
element('later-word').addEventListener('click', () => moveToken(selectedToken, sentence.findIndex(token => token.id === selectedToken) + 1));
element('remove-word').addEventListener('click', () => {
  const index = sentence.findIndex(token => token.id === selectedToken);
  if (index < 0) return;
  const token = sentence[index];
  const next = sentence.filter(item => item.id !== token.id);
  setSentence(next, 'Removed ' + token.entry.spelling + '.', (next[index] ?? next[index - 1])?.id);
  if (!next.length) sentenceWordGroups.querySelector('.word-option')?.focus();
});
element('play-sentence').addEventListener('click', async () => {
  celebration.classList.remove('played');
  const words = sentence.map(token => token.entry.spelling);
  const steps = sentence.map(token => ({ ...wholeWordStep(token.entry, token.id), gap: 185 }));
  if (await audio.play([...steps, { words, target: 'sentence', part: 'whole' }])) {
    celebration.classList.add('played');
    element('sentence-status').textContent = 'You played your sentence!';
  }
});

levels.forEach((pack, index) => {
  const label = node('label', 'level-option');
  const control = node('input', 'visually-hidden');
  control.type = 'radio';
  control.name = 'level';
  control.checked = index === 0;
  control.setAttribute('aria-label', 'Level ' + (index + 1) + ', ' + pack.name);
  control.addEventListener('change', () => {
    levelIndex = index;
    chooseWord(0);
    renderPalette();
  });
  const display = node('span', '', '');
  display.append(node('span', 'level-number', String(index + 1)), document.createTextNode(pack.name));
  label.append(control, display);
  levelOptions.append(label);
});

window.addEventListener('pagehide', () => audio.stop());
renderPalette();
renderCards();
