// colours.js: sliders in the full menu for playing with the two main colours.
// Paper and ink are the only colours set by hand; everything else (the faded
// text, lines, dashed boxes, the bottom bar) is mixed from them in style.css.
// Your choice is kept on this phone only, so it isn't part of backups.

const USUAL_COLOURS = { paper: '#EDE5D1', ink: '#1B1716' };
const COLOUR_NAMES = { paper: 'Paper', ink: 'Ink' };

function loadColours() {
  try { return { ...USUAL_COLOURS, ...JSON.parse(localStorage.getItem('keystone-colours')) }; } catch { return { ...USUAL_COLOURS }; }
}
let colours = loadColours();

function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// The browser's own bar at the top of the phone follows the paper (or black on bud days).
function showThemeColour() {
  const bud = document.documentElement.classList.contains('bud');
  document.querySelector('meta[name="theme-color"]').content = bud ? '#121212' : colours.paper;
}

function applyColours() {
  for (const key of Object.keys(USUAL_COLOURS)) document.documentElement.style.setProperty(`--${key}`, colours[key]);
  showThemeColour();
}

function saveColours() {
  try { localStorage.setItem('keystone-colours', JSON.stringify(colours)); } catch { /* still shows for now */ }
}

function showColourSliders() {
  $('colour-sliders').innerHTML = Object.keys(USUAL_COLOURS).map((key) => {
    const [h, s, l] = hexToHsl(colours[key]);
    const slider = (part, label, value, max) =>
      `<label class="slider"><span>${label}</span><input type="range" min="0" max="${max}" value="${value}" data-colour="${key}" data-part="${part}"></label>`;
    return `<div class="colour">
      <div class="colour-head"><span class="swatch" style="background: ${colours[key]}"></span>${COLOUR_NAMES[key]}<span class="colour-code">${colours[key]}</span></div>
      ${slider('h', 'Hue', h, 360)}${slider('s', 'Strength', s, 100)}${slider('l', 'Lightness', l, 100)}
    </div>`;
  }).join('');
}

$('colour-sliders').addEventListener('input', (event) => {
  const key = event.target.dataset.colour;
  if (!key) return;
  const [h, s, l] = ['h', 's', 'l'].map((part) => Number($('colour-sliders').querySelector(`[data-colour="${key}"][data-part="${part}"]`).value));
  colours[key] = hslToHex(h, s, l);
  applyColours();
  const box = event.target.closest('.colour');
  box.querySelector('.swatch').style.background = colours[key];
  box.querySelector('.colour-code').textContent = colours[key];
});
$('colour-sliders').addEventListener('change', saveColours);

$('colours-reset').addEventListener('click', () => {
  colours = { ...USUAL_COLOURS };
  try { localStorage.removeItem('keystone-colours'); } catch { /* fine */ }
  applyColours();
  showColourSliders();
});

applyColours();
showColourSliders();
