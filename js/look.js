// look.js: the colours and small drawings shared by every page.
//
// Every colour in the app has a name here (a "role"), so all of them can be
// changed on the Colours page (menu > Colours). Changes are kept on this phone
// (localStorage "keystone-colours") and the page reloads to use them.
//
// The palette is soft and sunset-warm: pale petal, wild rose, warm clay, golden
// hour, river stone, fern leaf and eucalyptus, plus a dusty blue, mauve and a few
// deeper shades so data still reads clearly on the light background.

const COLOUR_DEFAULTS = {
  // The app
  paper: '#FFFFFF',
  topBar: '#FFFFFF',
  ink: '#3D3432',
  muted: '#7A6F6B',
  rule: '#E4DAD3',
  faint: '#C4B9B2',
  onColour: '#FFFFFF',
  fieldText: '#FFFFFF',
  emptyField: '#E6DCD8',
  danger: '#B5545C',
  // The six feelings families
  Happiness: '#EDBE68', // golden hour
  Surprise: '#7E9D84', // fern leaf
  Fear: '#E2A174', // warm clay
  Anger: '#D9868B', // wild rose
  Disgust: '#A98AA6', // mauve
  Sadness: '#7F92AB', // dusty blue
  // Insight
  notDone: '#DAD0CA',
  skipped: '#BDB2AB',
  nothing: '#DAD0CA',
  showingUp: '#F2C46F',
  hiding: '#6E7E95',
  // Symptom heat maps, a thermal ramp from none to the most
  heat0: '#F3EEE6',
  heat1: '#EAD5F1',
  heat2: '#D49EEC',
  heat3: '#FFE6A6',
  heat4: '#FFAE4C',
  heat5: '#F0663A',
  heat6: '#5A2FE0',
  heat7: '#130B47',
  compare: '#B9BAAE',
  // Colours offered in every colour picker
  palette: [
    '#EDBE68', '#7E9D84', '#E2A174', '#D9868B', '#A98AA6', '#7F92AB',
    '#B8646E', '#C9993F', '#7D6283', '#5C6D86', '#7FA39C', '#5E7A66',
    '#8F7B6A', '#A3A698', '#E8B4B2', '#4F5B70',
  ],
};

// The names shown on the Colours page, in groups.
const COLOUR_ROLES = [
  ['The app', [['paper', 'Background'], ['topBar', 'Top bar'], ['ink', 'Text and lines'], ['muted', 'Soft text'], ['rule', 'Thin lines'], ['faint', 'Faint marks'], ['onColour', 'Text on darker colours'], ['fieldText', 'Words on the feelings colours'], ['emptyField', 'Feelings colours, nothing picked yet'], ['danger', 'Delete']]],
  ['Feelings', [['Happiness', 'Happiness'], ['Surprise', 'Surprise'], ['Fear', 'Fear'], ['Anger', 'Anger'], ['Disgust', 'Disgust'], ['Sadness', 'Sadness']]],
  ['Insight', [['notDone', 'Not done (bigger grey dot)'], ['skipped', 'Skipped (tiny grey dot)'], ['nothing', 'Nothing logged (tiny pale dot)'], ['showingUp', 'Sun: showing up'], ['hiding', 'Sun: hiding'], ['heat0', 'Heat map 1: none'], ['heat1', 'Heat map 2'], ['heat2', 'Heat map 3'], ['heat3', 'Heat map 4'], ['heat4', 'Heat map 5'], ['heat5', 'Heat map 6'], ['heat6', 'Heat map 7'], ['heat7', 'Heat map 8: the most'], ['compare', 'The "without" bar on Links']]],
];

// The palette before 24 Oct 2026, so colours saved with it can move to the new one.
const OLD_PALETTE = [
  '#DB9A2E', '#7F9566', '#DC7E4A', '#BE4A4E', '#A36AAE', '#56629A',
  '#BC4960', '#E4943B', '#AB67A4', '#675C96', '#46679A', '#579B90',
  '#8C7A5B', '#4E8A6B', '#C46F8C', '#3F4E7A',
];

// Dark mode (menu > Dark mode): a deep plum night instead of white paper.
// It has its own colour changes ("keystone-colours-dark"), so changing a colour
// in dark mode doesn't change it in the light, and the other way round.
let darkMode = false;
try { darkMode = localStorage.getItem('keystone-dark') === '1'; } catch { /* stays light */ }
const DARK_DEFAULTS = {
  paper: '#1E1A2A',
  topBar: '#1E1A2A',
  ink: '#ECE4EE',
  muted: '#A79DB2',
  rule: '#3A3249',
  faint: '#5D5372',
  emptyField: '#3A3349',
  danger: '#E08A92',
  notDone: '#463E57',
  skipped: '#5D5372',
  nothing: '#3A3349',
  heat0: '#2C2639',
  compare: '#5D5372',
};
const COLOURS_KEY = darkMode ? 'keystone-colours-dark' : 'keystone-colours';

function readColours(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}
function savedColours() {
  return readColours(COLOURS_KEY);
}
function saveColours(changes) {
  try {
    if (changes) localStorage.setItem(COLOURS_KEY, JSON.stringify(changes));
    else localStorage.removeItem(COLOURS_KEY);
  } catch {}
}

// In dark mode, colours you changed in the light (like a feeling's colour) carry
// over, except the ones dark mode itself changes.
const COLOURS = darkMode
  ? { ...COLOUR_DEFAULTS, ...readColours('keystone-colours'), ...DARK_DEFAULTS, ...savedColours() }
  : { ...COLOUR_DEFAULTS, ...savedColours() };
// Moves a colour from the old palette to the same place in today's palette.
const newPaletteColour = (c) => {
  const k = OLD_PALETTE.indexOf((c || '').toUpperCase());
  return k < 0 ? c : COLOURS.palette[k];
};

const EMOTION_COLOURS = Object.fromEntries(['Happiness', 'Surprise', 'Fear', 'Anger', 'Disgust', 'Sadness'].map((f) => [f, COLOURS[f]]));

// The emotion families and their feelings (from the emotions and sensations chart).
const EMOTION_FAMILIES = [
  ['Happiness', ['joyful', 'curious', 'proud', 'satisfied', 'courageous', 'peaceful', 'intimate', 'optimistic', 'powerful', 'accepted']],
  ['Surprise', ['shocked', 'confused', 'amazed', 'excited']],
  ['Fear', ['embarrassed', 'unwanted', 'insecure', 'inferior', 'anxious', 'scared']],
  ['Anger', ['hurt', 'hateful', 'mad', 'aggressive', 'frustrated', 'distant', 'critical', 'irritated', 'offended']],
  ['Disgust', ['disapproval', 'disappointed', 'awful', 'avoidant']],
  ['Sadness', ['apathetic', 'lonely', 'despair', 'depressed', 'abandoned', 'guilty']],
];

const PALETTE = COLOURS.palette;
const INK = COLOURS.ink;
const MUTED = COLOURS.muted;
const RULE = COLOURS.rule;
const PAPER = COLOURS.paper;

// The page's own colours (in style.css) follow the same roles.
(() => {
  const css = { topBar: '--top-bar', paper: '--paper', ink: '--ink', muted: '--muted', rule: '--rule', faint: '--faint', onColour: '--on-colour', fieldText: '--field-text', danger: '--danger' };
  for (const [role, name] of Object.entries(css)) document.documentElement.style.setProperty(name, COLOURS[role]);
  document.documentElement.style.setProperty('--shadow', `${COLOURS.ink}40`);
  document.documentElement.style.setProperty('--backdrop', `${COLOURS.ink}59`);
  document.documentElement.classList.toggle('dark', darkMode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = COLOURS.paper;
})();

// --- Colour maths (OKLab, so blends stay clean instead of going muddy) ---

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}
function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toLab(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromLab([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map((v) => Math.max(0, Math.min(1, fromLinear(Math.max(0, v)))));
}

// Mixes two colours; t = 0 gives a, t = 1 gives b.
function mix(a, b, t) {
  const x = toLab(hexToRgb(a));
  const y = toLab(hexToRgb(b));
  return rgbToHex(fromLab(x.map((v, i) => v + (y[i] - v) * t)));
}

// A colour's steps for data, from a pale tint (t = 0) up to the colour itself.
// It never goes darker than the colour you picked: from t = 0.85 up it's exactly that colour.
function shade(colour, t) {
  return mix(PAPER, colour, Math.min(1, 0.22 + (0.78 * t) / 0.85));
}

// The heat maps' colour for t = 0..1: a thermal ramp through eight colours, each at its own place,
// so the levels show as clear bands (lilac for a little, then gold, orange and deep violet for the most).
const HEAT_AT = [0, 0.16, 0.34, 0.48, 0.6, 0.72, 0.85, 1];
function heat(t) {
  const x = Math.min(Math.max(t, 0), 1);
  let k = 1;
  while (k < HEAT_AT.length - 1 && x > HEAT_AT[k]) k++;
  return mix(COLOURS[`heat${k - 1}`], COLOURS[`heat${k}`], (x - HEAT_AT[k - 1]) / (HEAT_AT[k] - HEAT_AT[k - 1]));
}

// Text for on top of a colour: ink on light colours, the "text on darker colours" role on the rest.
function textOn(colour) {
  return toLab(hexToRgb(colour))[0] > 0.76 ? INK : COLOURS.onColour;
}

// --- Today's emotions as a soft field of colour ---
// Each family flows in from an edge; the family you felt most takes the middle of the top.

function drawEmotionField(canvas, picks) {
  const w = 130;
  // Always drawn in the full field's shape: a shorter header (the front page) shows the
  // whole field gently squeezed, so every colour shows, not just the middle where they blend.
  const h = Math.round(w * Math.max(320 / 390, (canvas.clientHeight || 320) / (canvas.clientWidth || 390)));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const count = {};
  for (const [family] of picks) count[family] = (count[family] || 0) + 1;
  const families = EMOTION_FAMILIES.map(([f]) => f).filter((f) => count[f]).sort((a, b) => count[b] - count[a]);
  const total = picks.length || 1;
  const perimeter = 2 * h * 0.85 + w;
  const along = (t) => {
    let p = t * perimeter;
    if (p < h * 0.85) return [-w * 0.06, h * 0.85 - p];
    p -= h * 0.85;
    if (p < w) return [p, -h * 0.08];
    p -= w;
    return [w * 1.06, p];
  };
  const spots = [0.5, 0.08, 0.92, 0.3, 0.7, 0.18];
  const anchors = families.map((f, i) => {
    const share = count[f] / total;
    const [x, y] = along(families.length === 1 ? 0.5 : spots[i]);
    return { lab: toLab(hexToRgb(EMOTION_COLOURS[f])), x, y, sig: (0.3 + 0.5 * Math.sqrt(share)) * Math.max(w, h) * (families.length > 3 ? 0.55 : 0.7), a: 0.6 + share };
  });
  // A lighter echo of the strongest family in a lower corner, so even a one-feeling day has depth.
  if (anchors.length) {
    const [L, A, B] = anchors[0].lab;
    anchors.push({ lab: [L + 0.1, A * 0.75, B * 0.75], x: w * 1.05, y: h * 0.8, sig: Math.max(w, h) * 0.32, a: 0.45 });
  }
  const empty = toLab(hexToRgb(COLOURS.emptyField));
  const image = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const lab = empty.map((v) => v * 0.002);
      let weight = 0.002;
      for (const a of anchors) {
        const g = a.a * Math.exp(-((x - a.x) ** 2 + (y - a.y) ** 2) / (2 * a.sig * a.sig)) ** 1.6;
        weight += g;
        for (let j = 0; j < 3; j++) lab[j] += a.lab[j] * g;
      }
      const rgb = fromLab(lab.map((v) => v / weight));
      const i = (y * w + x) * 4;
      image.data[i] = rgb[0] * 255;
      image.data[i + 1] = rgb[1] * 255;
      image.data[i + 2] = rgb[2] * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

// --- The face: shows the family you felt most today, or a calm face for a tie ---

const FACE_MOUTHS = {
  Happiness: '<path d="M8.5 14.2q3.5 3.2 7 0"/>',
  Sadness: '<path d="M8.5 16.4q3.5 -3 7 0"/>',
  Anger: '<path d="M8.5 16.2q3.5 -2.2 7 0"/><path d="M7.6 8.2l2.6 1.4"/><path d="M16.4 8.2l-2.6 1.4"/>',
  Fear: '<path d="M8.6 15.8q1.2 -1.2 2.3 0t2.3 0t2.3 0"/><path d="M7.8 9.4l2.4 -1.2"/><path d="M16.2 9.4l-2.4 -1.2"/>',
  Surprise: '<circle cx="12" cy="15.4" r="1.9"/><path d="M7.8 8.2q1.3 -1 2.6 0"/><path d="M13.6 8.2q1.3 -1 2.6 0"/>',
  Disgust: '<path d="M8.6 15.6l2 -.9l2 .9l2.2 -.9"/><path d="M13.6 8.6l2.6 -.6"/>',
  Mixed: '<path d="M9 15h6"/>',
};

function strongestFamily(picks) {
  const count = {};
  for (const [family] of picks) count[family] = (count[family] || 0) + 1;
  const ranked = Object.entries(count).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || (ranked[1] && ranked[1][1] === ranked[0][1])) return 'Mixed';
  return ranked[0][0];
}

function faceIcon(family, colour = COLOURS.fieldText, size = 26) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="9.2" cy="10.6" r="0.55" fill="${colour}"/><circle cx="14.8" cy="10.6" r="0.55" fill="${colour}"/>${FACE_MOUTHS[family]}</svg>`;
}

// --- Line icons (from Tabler, MIT licence), stand-ins until Null draws their own ---

const ICONS = {
  pain: '<path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11"/>',
  injury: '<path d="M14 12l0 .01"/><path d="M10 12l0 .01"/><path d="M12 10l0 .01"/><path d="M12 14l0 .01"/><path d="M4.5 12.5l8 -8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1 -7 -7"/>',
  body: '<path d="M11 8a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M4 8v-2a2 2 0 0 1 2 -2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2 -2v-2"/><path d="M12 11v5"/><path d="M9 13l3 -1l3 1"/><path d="M10 16l2 -2l2 2"/>',
  mind: '<path d="M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8"/><path d="M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8"/><path d="M17.5 16a3.5 3.5 0 0 0 0 -7h-.5"/><path d="M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0"/><path d="M6.5 16a3.5 3.5 0 0 1 0 -7h.5"/><path d="M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10"/>',
  heart: '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/>',
  stomach: '<path d="M12 3c0 2 1 3 3 3s4 1.5 4 5c0 4 -3 9 -8 9c-3 0 -6 -2 -6 -5c0 -2 1.5 -3.5 3.5 -3.5s2.5 1.5 4.5 1.5c1 0 1.5 -.5 1.5 -1.5s-.5 -2 -2 -2"/>',
  door: '<path d="M14 12v.01"/><path d="M3 21h18"/><path d="M6 21v-16a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v16"/>',
  bowl: '<path d="M4 11h16a1 1 0 0 1 1 1v.5c0 1.5 -2.517 5.573 -4 6.5v1a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-1c-1.687 -1.054 -4 -5 -4 -6.5v-.5a1 1 0 0 1 1 -1z"/><path d="M12 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M16 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M8 4a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/>',
  sun: '<path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/>',
  moon: '<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>',
  leaf: '<path d="M5 21c.5 -4.5 2.5 -8 7 -10"/><path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3z"/>',
  people: '<path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0 -3 -3.85"/>',
  drop: '<path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546z"/>',
  dot: '<path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>',
};

function icon(name, colour = 'currentColor', size = 20, width = 1.6) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.dot}</svg>`;
}

const chevron = '<svg class="chev" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const chevronLeft = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M9 3L5 7l4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const chevronRight = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M5 3l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const plus = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const pencilIcon = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 L4.8 15.6 L15.6 4.8 L19.2 8.4 L8.4 19.2 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const menuIcon = '<svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true"><path d="M1 1.5h20M1 8h20M1 14.5h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
