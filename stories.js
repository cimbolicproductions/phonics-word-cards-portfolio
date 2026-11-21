import { levels, helpers } from './words.js';

// Shared card recordings keep the same voice for familiar words.
const cardWords = new Set([...levels.flatMap(level => level.words), ...helpers].map(word => word.spelling));

export const stories = [
  {
    id: 'nap-in-the-sun',
    title: 'A nap in the sun',
    level: 0,
    photo: './photos/cat.webp',
    lines: [
      'The cat sat on a mat.',
      'The sun was hot.',
      'The cat had a nap.',
      'A dog ran to the mat.',
      'The cat and the dog sat in the sun.',
    ],
  },
  {
    id: 'pig-and-hat',
    title: 'A pig and a hat',
    level: 0,
    photo: './photos/pig.webp',
    lines: [
      'The pig had a hat.',
      'The hat was on a log.',
      'The pig ran to the log.',
      'The pig got the hat.',
      'The hat fit!',
    ],
  },
  {
    id: 'lost-chick',
    title: 'The lost chick',
    level: 1,
    photo: './photos/chick.webp',
    lines: [
      'A chick was in a nest.',
      'The hen went to the nest.',
      'The chick hid in the grass.',
      'The hen did not spot the chick.',
      'Then the chick ran back.',
      'The hen and the chick sat in the nest.',
    ],
  },
  {
    id: 'frog-in-pond',
    title: 'A frog in the pond',
    level: 1,
    photo: './photos/frog.webp',
    lines: [
      'A frog sat on a rock.',
      'A duck swam in the pond.',
      'Splash!',
      'The frog sprang in.',
      'The duck and the frog swam back.',
      'Then the frog sat on the rock.',
    ],
  },
  {
    id: 'kate-can-bake',
    title: 'Kate can bake',
    level: 2,
    photo: './photos/cake.webp',
    lines: [
      'Kate can bake.',
      'She made a cake.',
      'The cake was in a tin.',
      'Kate put the cake on a plate.',
      'Mike came on his bike.',
      'Kate and Mike ate the cake.',
    ],
  },
  {
    id: 'kite-by-lake',
    title: 'The kite by the lake',
    level: 2,
    photo: './photos/kite.webp',
    lines: [
      'Mike had a kite.',
      'He rode his bike to the lake.',
      'The kite got stuck in a pine.',
      'Mike gave the kite a tug.',
      'The kite came back.',
      'Mike had a big smile.',
    ],
  },
  {
    id: 'picnic-in-rain',
    title: 'A picnic in the rain',
    level: 3,
    photo: './photos/rain.webp',
    lines: [
      'A rabbit sat in the grass.',
      'It had a picnic by the lake.',
      'Rain fell on the picnic.',
      'The rabbit ran to a tree.',
      'A bird sat in the tree.',
      'Then the rain went away.',
      'A rainbow lit up the sky.',
    ],
  },
  {
    id: 'coin-on-train',
    title: 'A coin on the train',
    level: 3,
    photo: './photos/train.webp',
    lines: [
      'Robin had a coin.',
      'The coin fell on the train.',
      'Robin bent down to find it.',
      'The coin was under a seat.',
      'A kid saw the coin.',
      'The kid gave it back.',
      'Robin had a big grin.',
    ],
  },
];

// Explicit pronunciations for the extra story vocabulary, generated with Kokoro Heart.
export const storyVocabulary = {
  sat: 'sˈæt', mat: 'mˈæt', hot: 'hˈɑt', had: 'hˈæd', nap: 'nˈæp', ran: 'ɹˈæn',
  to: 'tˈu', log: 'lˈɑɡ', got: 'ɡˈɑt', fit: 'fˈɪt', went: 'wˈɛnt', hid: 'hˈɪd',
  grass: 'ɡɹˈæs', did: 'dˈɪd', not: 'nˈɑt', spot: 'spˈɑt', then: 'ðˈɛn', back: 'bˈæk',
  rock: 'ɹˈɑk', swam: 'swˈæm', pond: 'pˈɑnd', splash: 'splˈæʃ', sprang: 'spɹˈæŋ',
  kate: 'kˈAt', she: 'ʃˈi', made: 'mˈAd', tin: 'tˈɪn', put: 'pˈʊt', plate: 'plˈAt',
  mike: 'mˈIk', came: 'kˈAm', his: 'hˈɪz', ate: 'ˈAt', he: 'hˈi', rode: 'ɹˈOd',
  stuck: 'stˈʌk', pine: 'pˈIn', gave: 'ɡˈAv', tug: 'tˈʌɡ', big: 'bˈɪɡ', smile: 'smˈIl',
  it: 'ˈɪt', picnic: 'pˈɪknɪk', by: 'bˈI', fell: 'fˈɛl', tree: 'tɹˈi', away: 'əwˈA',
  lit: 'lˈɪt', up: 'ˈʌp', sky: 'skˈI', robin: 'ɹˈɑbɪn', bent: 'bˈɛnt', down: 'dˈWn',
  find: 'fˈInd', under: 'ˈʌndəɹ', seat: 'sˈit', kid: 'kˈɪd', saw: 'sˈɔ', grin: 'ɡɹˈɪn',
};

export function storyTokens(story) {
  return story.lines.flatMap((line, lineIndex) => line.split(' ').map(text => ({
    text, word: text.toLowerCase().replace(/[^a-z]/g, ''), lineIndex,
  })));
}

export function storyReadingSteps(story) {
  return storyTokens(story).map(({ text, word }, index) => ({
    sound: (cardWords.has(word) ? './spoken/' : './story-audio/') + word + '.wav',
    target: 'story-word-' + index,
    part: 'whole',
    rate: .78,
    gap: /[.!?]$/.test(text) ? 650 : 200,
  }));
}
