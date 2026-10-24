// stamps.js: draws stamps in uneven ink, like a rubber stamp pressed on paper.
//
// A stamp is a shape (white = ink, black = carved away, in a 200 x 200 box)
// pushed through an ink filter: rough edges, fine grain, and soft patches
// where less ink landed. The same shape never prints the same way twice,
// because each press gets its own "seed".

const INK = '#1B1716';

let stampCount = 0;

// The day's stamp frames: an outer line and a thin inner line.
// Each one takes a half width (a) and half height (b) inside the 200 box.
const FRAME_SHAPES = {
  octagon: (a, b) => {
    const c = a * 0.42;
    return polygon([[100 - a + c, 100 - b], [100 + a - c, 100 - b], [100 + a, 100 - b + c], [100 + a, 100 + b - c],
      [100 + a - c, 100 + b], [100 - a + c, 100 + b], [100 - a, 100 + b - c], [100 - a, 100 - b + c]]);
  },
  arch: (a, b) => `M${100 - a} ${100 + b}L${100 - a} ${100 - b + a}A${a} ${a} 0 0 1 ${100 + a} ${100 - b + a}L${100 + a} ${100 + b}Z`,
  oval: (a, b) => `M${100 - a} 100A${a} ${b} 0 1 1 ${100 + a} 100A${a} ${b} 0 1 1 ${100 - a} 100Z`,
  scallop: (a, b) => {
    const points = [];
    for (let i = 0; i <= 112; i++) {
      const t = (i / 112) * Math.PI * 2;
      const r = 1 - 0.06 * (1 - Math.abs(Math.cos(7 * t)));
      points.push([100 + Math.sin(t) * a * r, 100 - Math.cos(t) * b * r]);
    }
    return polygon(points);
  },
  diamond: (a, b) => polygon([[100, 100 - b], [100 + a, 100], [100, 100 + b], [100 - a, 100]]),
  shield: (a, b) => `M${100 - a} ${100 - b}L${100 + a} ${100 - b}L${100 + a} ${100 + b * 0.15}` +
    `C${100 + a} ${100 + b * 0.62} ${100 + a * 0.45} ${100 + b * 0.86} 100 ${100 + b}` +
    `C${100 - a * 0.45} ${100 + b * 0.86} ${100 - a} ${100 + b * 0.62} ${100 - a} ${100 + b * 0.15}Z`,
  ticket: (a, b) => {
    const r = a * 0.3;
    return `M${100 - a + r} ${100 - b}L${100 + a - r} ${100 - b}A${r} ${r} 0 0 0 ${100 + a} ${100 - b + r}` +
      `L${100 + a} ${100 + b - r}A${r} ${r} 0 0 0 ${100 + a - r} ${100 + b}L${100 - a + r} ${100 + b}` +
      `A${r} ${r} 0 0 0 ${100 - a} ${100 + b - r}L${100 - a} ${100 - b + r}A${r} ${r} 0 0 0 ${100 - a + r} ${100 - b}Z`;
  },
  circle: (a) => `M${100 - a} 100A${a} ${a} 0 1 1 ${100 + a} 100A${a} ${a} 0 1 1 ${100 - a} 100Z`,
};

// How big each frame sits in the box: [half width, half height].
const FRAME_SIZES = {
  octagon: [66, 92], arch: [64, 92], oval: [68, 92], scallop: [86, 86],
  diamond: [80, 96], shield: [70, 90], ticket: [68, 90], circle: [88, 88],
};

const FRAME_NAMES = Object.keys(FRAME_SHAPES);

function polygon(points) {
  return 'M' + points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z';
}

// The shape of one frame, ready to stamp.
function frameShape(name) {
  const [a, b] = FRAME_SIZES[name];
  const draw = FRAME_SHAPES[name];
  return `<path d="${draw(a, b)}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="${draw(a - 9, b - 9)}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>`;
}

// Returns an <svg> of one stamp press.
//   shape  the shape's mask, from stamp-shapes.js or frameShape()
//   size   how wide it lands on the page, in pixels
//   done   0 to 1: how much of the day's plan is finished. More done = darker, more even ink.
//   seed   changes the ink pattern, so every press looks different
//   rot    turns the stamp a little, in degrees
//   label  what a screen reader says, or leave empty to hide it from screen readers
function stamp(shape, { size = 200, done = 1, seed = 1, rot = 0, label = '' } = {}) {
  const id = `stamp${++stampCount}`;
  // Each tick should darken the stamp by the same visible amount, however many
  // tasks there are. So pick how dark it should look, split that between how
  // strong the ink is and how much of the shape gets printed, then look up
  // which grain cut-off prints that much of the shape.
  const opacity = 0.3 + 0.7 * done;
  const printed = Math.min(1, (0.92 * done) / opacity);
  const threshold = cutoffFor(printed);
  const patches = 0.95 - 0.5 * (threshold - 0.3);
  const warp = 4.4 - 1.4 * done;
  const grain = Math.min(0.75, (0.75 * size) / 300);
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" ${a11y}>` +
    `<defs><mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">` +
    `<rect width="200" height="200" fill="#000"/>${shape}</mask>` +
    `<filter id="${id}f" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="${seed}" result="warp"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="warp" scale="${warp.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="rough"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="${grain.toFixed(3)}" numOctaves="3" seed="${seed + 7}" result="g0"/>` +
    '<feColorMatrix in="g0" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="grain"/>' +
    `<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="${seed + 13}" result="p0"/>` +
    '<feColorMatrix in="p0" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="patch"/>' +
    `<feComposite in="grain" in2="patch" operator="arithmetic" k1="0" k2="0.55" k3="${patches.toFixed(2)}" k4="0" result="mix"/>` +
    `<feColorMatrix in="mix" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 9 ${(-9 * threshold).toFixed(2)}" result="ink"/>` +
    '<feComposite in="rough" in2="ink" operator="out"/>' +
    '</filter></defs>' +
    `<g transform="rotate(${rot} 100 100)" opacity="${opacity.toFixed(2)}"><g filter="url(#${id}f)">` +
    `<rect width="200" height="200" fill="${INK}" mask="url(#${id}m)"/></g></g></svg>`;
}

// How much of a shape gets printed (0 to 1) at grain cut-offs 0.30, 0.33, 0.36 ... 0.90.
// Measured by printing the frames many times; the ink isn't printed evenly
// around the middle cut-offs, so stepping the cut-off evenly gave uneven steps.
const PRINTED_AT = [0, 0.002, 0.006, 0.012, 0.025, 0.044, 0.072, 0.119, 0.183, 0.26, 0.368, 0.478,
  0.595, 0.722, 0.817, 0.9, 0.955, 0.981, 0.994, 0.999, 1];

function cutoffFor(printed) {
  for (let i = 1; i < PRINTED_AT.length; i++) {
    if (printed <= PRINTED_AT[i]) {
      const t = (printed - PRINTED_AT[i - 1]) / (PRINTED_AT[i] - PRINTED_AT[i - 1]);
      return 0.3 + 0.03 * (i - 1 + t);
    }
  }
  return 0.9;
}

// A number from 0 to 1 that is always the same for the same text.
// Used so a day keeps its frame, and a tick keeps its tilt, every time the page is drawn.
function steadyRandom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
