/**
 * A prescription is free text a coach types — "3 x 12 reps · Slow lower" —
 * so there is no table to look it up in. It is read in its parts instead:
 * each piece between the dots is translated when it is a phrase coaches and
 * the catalogue actually use, and left exactly as written when it is not.
 * A line that is half translated still reads; a guessed one could tell
 * someone to do the wrong thing.
 */

const PHRASES_HI: Record<string, string> = {
  'both sides': 'दोनों तरफ़',
  'each side': 'हर तरफ़',
  'slow lower': 'धीरे-धीरे नीचे लाएँ',
  'slow tempo': 'धीमी गति',
  'light weight': 'हल्का वज़न',
  'as slow as you can': 'जितना धीरे हो सके',
  'full recovery between': 'बीच में पूरा आराम',
  'full rest between': 'बीच में पूरा आराम',
  'to a pain-free depth': 'जितना बिना दर्द के नीचे जा सकें',
  'little and often': 'थोड़ा-थोड़ा, बार-बार',
  'every evening': 'हर शाम',
  'every morning': 'हर सुबह',
  'every day': 'हर दिन',
  daily: 'रोज़',
  'twice a day': 'दिन में दो बार',
  'as prescribed': 'जैसा बताया गया है',
};

// "3 x 12", keeping however the coach wrote the x.
const SETS = String.raw`(\d+)(\s*[x×X]\s*)(\d+)`;

const PATTERNS_HI: [RegExp, string][] = [
  [new RegExp(`^${SETS} reps$`, 'i'), '$1$2$3 रेप्स'],
  [new RegExp(`^${SETS} reps each side$`, 'i'), '$1$2$3 रेप्स हर तरफ़'],
  [new RegExp(`^${SETS} each side$`, 'i'), '$1$2$3 हर तरफ़'],
  [new RegExp(`^${SETS} steps each side$`, 'i'), '$1$2$3 क़दम हर तरफ़'],
  [new RegExp(`^${SETS} landings$`, 'i'), '$1$2$3 लैंडिंग'],
  [new RegExp(`^${SETS}s each side$`, 'i'), '$1$2$3 सेकंड हर तरफ़'],
  [new RegExp(`^${SETS}s holds? each side$`, 'i'), '$1$2$3 सेकंड होल्ड हर तरफ़'],
  [new RegExp(`^${SETS}s holds?$`, 'i'), '$1$2$3 सेकंड होल्ड'],
  // A hold is a time, so "m" here is minutes; a bare "4 x 30m" is a distance and stays as written.
  [new RegExp(`^${SETS}m holds?$`, 'i'), '$1$2$3 मिनट होल्ड'],
  [new RegExp(`^${SETS}s$`, 'i'), '$1$2$3 सेकंड'],
  [/^(\d+) runs each side$/i, 'हर तरफ़ $1 रन'],
  [/^(\d+) min rest$/i, '$1 मिनट आराम'],
  [/^(\d+)s hold$/i, '$1 सेकंड रोकें'],
  [/^(\d+)s hold at the top$/i, 'ऊपर $1 सेकंड रोकें'],
  [/^(\d+)s squeeze at the top$/i, 'ऊपर $1 सेकंड कसकर रोकें'],
  [/^(\d+)s lower$/i, '$1 सेकंड में नीचे लाएँ'],
  [/^hold each for (\d+)s$/i, 'हर बार $1 सेकंड रोकें'],
];

function translatePart(part: string): string {
  const phrase = PHRASES_HI[part.toLowerCase()];
  if (phrase) return phrase;
  for (const [pattern, replacement] of PATTERNS_HI) {
    if (pattern.test(part)) return part.replace(pattern, replacement);
  }
  return part;
}

/** A prescription in Hindi, as far as it can be read; the rest exactly as the coach wrote it. */
export function prescriptionInHindi(text: string): string {
  return text
    .split('·')
    .map((piece) => {
      const core = piece.trim();
      if (!core) return piece;
      const start = piece.indexOf(core);
      return piece.slice(0, start) + translatePart(core) + piece.slice(start + core.length);
    })
    .join('·');
}
