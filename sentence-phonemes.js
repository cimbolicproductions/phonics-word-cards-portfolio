// Kokoro's American English phonemes for the app's fixed vocabulary.
const pronunciations = {
  cat: 'kˈæt', dog: 'dˈɑɡ', pig: 'pˈɪɡ', sun: 'sˈʌn', hat: 'hˈæt', bus: 'bˈʌs',
  dig: 'dˈɪɡ', sit: 'sˈɪt', hen: 'hˈɛn', fish: 'fˈɪʃ', ship: 'ʃˈɪp', duck: 'dˈʌk',
  frog: 'fɹˈɑɡ', chick: 'ʧˈɪk', swim: 'swˈɪm', nest: 'nˈɛst', block: 'blˈɑk', moth: 'mˈɑθ',
  truck: 'tɹˈʌk', cake: 'kˈAk', bike: 'bˈIk', kite: 'kˈIt', cone: 'kˈOn', lake: 'lˈAk',
  bake: 'bˈAk', rain: 'ɹˈAn', bird: 'bˈɜɹd', coin: 'kˈYn', rabbit: 'ɹˈæbɪt',
  sunset: 'sˈʌnsˌɛt', rainbow: 'ɹˈAnbˌO', train: 'tɹˈAn',
  a: 'ə', the: 'ðə', can: 'kən', has: 'hˈæz', was: 'wəz', said: 'sˈɛd',
  and: 'ænd', in: 'ɪn', on: 'ɑn',
};

export function sentencePhrases(words) {
  const phrases = [];
  let phrase = '';
  for (const [index, word] of words.entries()) {
    let next = Object.hasOwn(pronunciations, word) ? pronunciations[word] : null;
    if (!next) throw new Error('Word has no sentence pronunciation');
    if (word === 'the' && /^[ˈˌ]?[AIOYɑæəɛɪʌi]/u.test(pronunciations[words[index + 1]] ?? '')) {
      next = 'ði';
    }
    // Keep well below the model's 510-token limit and break only between words.
    if (phrase.length + next.length + 2 > 400) {
      phrases.push(phrase + '.');
      phrase = '';
    }
    phrase += (phrase ? ' ' : '') + next;
  }
  if (phrase) phrases.push(phrase + '.');
  return phrases;
}
