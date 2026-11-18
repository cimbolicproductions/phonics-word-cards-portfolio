// Each pair carries visible spelling and a sound file name, or text for a syllable.
const card = (spelling, chunks, options = {}) => ({
  spelling, chunks, photo: './photos/' + spelling + '.webp', ...options,
});
const cvc = (spelling, pairs, options) => card(
  spelling, Array.from(spelling, letter => [letter]), { pairs, ...options },
);
const helper = (spelling, photo, chunks, options = {}) => ({
  spelling, chunks, photo: './photos/' + photo + '.webp', ...options,
});

export const levels = [
  {
    name: 'Short vowels',
    pictureOnFront: true,
    words: [
      cvc('cat', ['ca', 'at']),
      cvc('dog', ['do', 'og']),
      cvc('pig', ['pi', 'ig']),
      cvc('sun', ['su', 'un']),
      cvc('hat', ['ha', 'at']),
      cvc('bus', ['bu', 'us']),
      cvc('dig', ['di', 'ig'], { action: true }),
      cvc('sit', ['si', 'it'], { action: true }),
      cvc('hen', ['he', 'en']),
    ],
  },
  {
    name: 'Blends & digraphs',
    pictureOnFront: true,
    words: [
      card('fish', [['f', 'f'], ['i', 'short-i'], ['sh', 'sh']]),
      card('ship', [['sh', 'sh'], ['i', 'short-i'], ['p', 'p']]),
      card('duck', [['d', 'd'], ['u', 'short-u'], ['ck', 'k']]),
      card('frog', [['fr', 'fr'], ['o', 'short-o'], ['g', 'g']]),
      card('chick', [['ch', 'ch'], ['i', 'short-i'], ['ck', 'k']]),
      card('swim', [['sw', 'sw'], ['i', 'short-i'], ['m', 'm']], { action: true }),
      card('nest', [['n', 'n'], ['e', 'short-e'], ['st', 'st']]),
      card('block', [['bl', 'bl'], ['o', 'short-o'], ['ck', 'k']]),
      card('moth', [['m', 'm'], ['o', 'short-o'], ['th', 'th']]),
      card('truck', [['tr', 'tr'], ['u', 'short-u'], ['ck', 'k']]),
    ],
  },
  {
    name: 'Silent e',
    pictureOnFront: false,
    words: [
      card('cake', [['c', 'k'], ['a', 'long-a'], ['k', 'k'], ['e', null]]),
      card('bike', [['b', 'b'], ['i', 'long-i'], ['k', 'k'], ['e', null]]),
      card('kite', [['k', 'k'], ['i', 'long-i'], ['t', 't'], ['e', null]]),
      card('cone', [['c', 'k'], ['o', 'long-o'], ['n', 'n'], ['e', null]]),
      card('lake', [['l', 'l'], ['a', 'long-a'], ['k', 'k'], ['e', null]]),
      card('bake', [['b', 'b'], ['a', 'long-a'], ['k', 'k'], ['e', null]], { action: true }),
    ],
  },
  {
    name: 'Vowel teams & syllables',
    pictureOnFront: false,
    words: [
      card('rain', [['r', 'r'], ['ai', 'long-a'], ['n', 'n']]),
      card('bird', [['b', 'b'], ['ir', 'er'], ['d', 'd']]),
      card('coin', [['c', 'k'], ['oi', 'oi'], ['n', 'n']]),
      card('rabbit', [['rab', 'rab'], ['bit', 'bit']], { syllables: true }),
      card('sunset', [['sun', 'sun'], ['set', 'set']], { syllables: true }),
      card('rainbow', [['rain', 'rain'], ['bow', 'beau']], { syllables: true }),
      card('train', [['tr', 'tr'], ['ai', 'long-a'], ['n', 'n']]),
    ],
  },
];

export const helpers = [
  helper('a', 'cat', [['a', true]], { heart: true }),
  helper('the', 'sun', [['th', false], ['e', true]], { heart: true }),
  helper('can', 'swim', [['c', 'k'], ['a', 'short-a'], ['n', 'n']]),
  helper('has', 'cone', [['h', 'h'], ['a', 'short-a'], ['s', 'z']]),
  helper('was', 'sunset', [['w', false], ['a', true], ['s', true]], { heart: true }),
  helper('said', 'bake', [['s', false], ['ai', true], ['d', false]], { heart: true, action: true }),
  helper('and', 'cake', [['a', 'short-a'], ['n', 'n'], ['d', 'd']]),
  helper('in', 'fish', [['i', 'short-i'], ['n', 'n']]),
  helper('on', 'cat', [['o', 'short-o'], ['n', 'n']]),
];
