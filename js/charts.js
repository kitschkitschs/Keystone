// charts.js: the small drawings on the Insight pages, as SVG.
// Crisp shapes in the data's own colour: pale for a little, deep for a lot.
// Every chart is 350 units wide and scales to the screen.

const W = 350;

const svgOpen = (h, label, w = W) => `<svg class="chart" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${escapeHtml(label)}">`;
const txt = (x, y, s, { anchor = 'middle', size = 10, fill = MUTED, weight = 400, family = '' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${fill}" font-weight="${weight}"${family ? ` font-family="${family}"` : ''}>${escapeHtml(s)}</text>`;

function arcPath(cx, cy, r, share) {
  const a = Math.min(Math.max(share, 0.0001), 0.9999) * Math.PI * 2;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  return `M${cx} ${cy - r} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

// Rings, one inside the other, each filled to its share. No track behind them.
function ringSet(rings, big, small, size = 230) {
  const c = size / 2;
  const width = rings.length > 4 ? 9 : 11;
  const gap = width + 4;
  let body = '';
  rings.forEach((ring, k) => {
    const r = c - 8 - k * gap;
    if (r < 20) return;
    if (ring.v > 0.002) body += `<path d="${arcPath(c, c, r, ring.v)}" fill="none" stroke="${shade(ring.colour, 0.35 + 0.55 * ring.v)}" stroke-width="${width}" stroke-linecap="round"/>`;
    body += txt(c - 8, c - r + 3.5, ring.label, { anchor: 'end', size: 9.5, fill: INK });
  });
  return `<svg class="chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${escapeHtml(rings.map((r) => `${r.label} ${Math.round(r.v * 100)}%`).join(', '))}" style="max-width: ${size}px; margin: 0 auto">${body}${txt(c, c + 7, big, { size: big.length > 5 ? 19 : 24, fill: INK, family: 'Lora, serif' })}${txt(c, c + 22, small, { size: 10 })}</svg>`;
}

// One small ring, for list rows.
function miniRing(v, colour, size = 26) {
  const c = size / 2;
  const r = c - 4;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="flex-shrink: 0">${v > 0.002 ? `<path d="${arcPath(c, c, r, v)}" fill="none" stroke="${shade(colour, 0.35 + 0.55 * v)}" stroke-width="4" stroke-linecap="round"/>` : `<circle cx="${c}" cy="${c}" r="1.6" fill="${COLOURS.nothing}"/>`}</svg>`;
}

// A bead per day. state: "done" (coloured, t = 0..1 for how much), "miss" (bigger grey),
// "skip" (tiny grey), "none" (nothing logged: tiny, lighter grey) or null (no dot).
function bead(x, y, d, max, colour) {
  if (!d || !d.state) return '';
  if (d.state === 'skip') return `<circle cx="${x}" cy="${y}" r="1.5" fill="${COLOURS.skipped}"/>`;
  if (d.state === 'none') return `<circle cx="${x}" cy="${y}" r="1.2" fill="${COLOURS.nothing}"/>`;
  if (d.state === 'miss') return `<circle cx="${x}" cy="${y}" r="${(max * 0.62).toFixed(2)}" fill="${COLOURS.notDone}"/>`;
  const t = d.t == null ? 1 : d.t;
  return `<circle cx="${x}" cy="${y}" r="${(max * (0.55 + 0.45 * t)).toFixed(2)}" fill="${shade(d.colour || colour, 0.3 + 0.7 * t)}"/>`;
}

// A calendar of beads: one column per week (Monday on top), the last column is this week.
// days: [{ day: "YYYY-MM-DD", state, t }], oldest first, ending today.
function beadCalendar(days, colour, label, weeks = 26) {
  const end = new Date(`${days[days.length - 1].day}T12:00:00`);
  const lastCol = weeks - 1;
  const rowOf = (date) => (date.getDay() + 6) % 7;
  const cw = (W - 18) / weeks;
  const rh = 14;
  const max = Math.min(5.4, cw * 0.42);
  let body = '';
  for (let k = days.length - 1; k >= 0; k--) {
    const date = new Date(`${days[k].day}T12:00:00`);
    const back = Math.round((end - date) / 86400000) + (6 - rowOf(end));
    const col = lastCol - Math.floor(back / 7);
    if (col < 0) break;
    body += bead(18 + (col + 0.5) * cw, (rowOf(date) + 0.5) * rh, days[k], max, colour);
  }
  const names = ['M', '', 'W', '', 'F', '', 'S'].map((n, r) => txt(5, (r + 0.5) * rh + 3.5, n, { anchor: 'start' })).join('');
  return `${svgOpen(rh * 7, label)}${names}${body}</svg>`;
}

// A row of beads, one per day, for list rows.
function beadRow(days, colour, w = 110) {
  const per = w / days.length;
  const max = Math.min(4.6, per * 0.45);
  return `<svg width="${w}" height="12" viewBox="0 0 ${w} 12" aria-hidden="true" style="flex-shrink: 0">${days.map((d, k) => bead((k + 0.5) * per, 6, d, max, colour)).join('')}</svg>`;
}

// Columns with their numbers on top. values 0..1 for height; labels show above.
function columns(values, labels, colour, label, h = 110) {
  const n = values.length;
  const cw = W / n;
  let body = '';
  values.forEach((v, k) => {
    const hh = 6 + v * (h - 24);
    const x = k * cw + cw * 0.2;
    body += `<rect x="${x.toFixed(2)}" y="${(h - hh).toFixed(2)}" width="${(cw * 0.6).toFixed(2)}" height="${hh.toFixed(2)}" rx="${Math.min(cw * 0.3, 7).toFixed(2)}" fill="${shade(colour, 0.25 + 0.75 * v)}"/>`;
    if (labels[k] !== '') body += txt(x + cw * 0.3, h - hh - 5, String(labels[k]), { size: 9.5 });
  });
  return `${svgOpen(h, label)}${body}</svg>`;
}

// A plain ink line, for strength and scores over time (0..1), with 0, 50 and 100% guides.
function lineChart(values, label, xLabels = []) {
  const h = 110;
  const top = 8;
  const bottom = 86;
  const y = (v) => bottom - v * (bottom - top);
  const n = Math.max(2, values.length);
  const pts = values.map((v, k) => [(k / (n - 1)) * (W - 30), y(v)]);
  const path = pts.map(([px, py], k) => `${k ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('');
  const guides = [1, 0.5, 0].map((g) => `<line x1="0" x2="${W - 30}" y1="${y(g)}" y2="${y(g)}" stroke="${RULE}" stroke-dasharray="2 3"/>${txt(W - 26, y(g) + 3, `${g * 100}%`, { anchor: 'start', size: 9 })}`).join('');
  const xs = xLabels.map((l, k) => txt((k / Math.max(1, xLabels.length - 1)) * (W - 30), h - 4, l, { anchor: k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle' })).join('');
  return `${svgOpen(h, label)}${guides}<path d="${path}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>${xs}</svg>`;
}

// Seven petals, one per weekday (Monday at the top), longer and deeper where the value is bigger.
function flower(values, names, colour, label, size = 190) {
  const w = W;
  const cx = w / 2;
  const c = size / 2;
  const L = size / 2 - 52; // the longest petal; names sit outside it with room to spare
  const R = size / 2 - 12;
  let petals = '';
  let words = '';
  values.forEach((v, k) => {
    const a = (k / 7) * 360;
    const len = 12 + L * v;
    petals += `<ellipse cx="${cx}" cy="${(c - len / 2 - 5).toFixed(2)}" rx="${(6 + 4 * v).toFixed(2)}" ry="${(len / 2).toFixed(2)}" transform="rotate(${a.toFixed(1)} ${cx} ${c})" fill="${shade(colour, 0.25 + 0.75 * v)}"/>`;
    const rad = ((a - 90) * Math.PI) / 180;
    words += txt(cx + R * Math.cos(rad), c + R * Math.sin(rad) + 4, names[k], { size: 9.5 });
  });
  return `${svgOpen(size, label)}${petals}${words}</svg>`;
}

// Loop's frequency chart: one row per weekday, one column per month; bigger dots for more.
function dotMatrix(grid, rowNames, colNames, colour, label) {
  const rows = grid.length;
  const cols = grid[0].length;
  const cw = (W - 26) / cols;
  const rh = 18;
  const max = Math.max(1, ...grid.flat());
  let body = '';
  grid.forEach((row, r) => row.forEach((v, c) => {
    const x = 26 + (c + 0.5) * cw;
    const y = (r + 0.5) * rh;
    body += v ? `<circle cx="${x.toFixed(1)}" cy="${y}" r="${(1.8 + 5 * (v / max)).toFixed(2)}" fill="${shade(colour, 0.3 + 0.7 * (v / max))}"/>` : `<circle cx="${x.toFixed(1)}" cy="${y}" r="1.2" fill="${COLOURS.nothing}"/>`;
  }));
  const rn = rowNames.map((n, r) => txt(0, (r + 0.5) * rh + 3.5, n, { anchor: 'start' })).join('');
  const cn = colNames.map((n, c) => txt(26 + (c + 0.5) * cw, rows * rh + 12, n, { size: 9 })).join('');
  return `${svgOpen(rows * rh + 16, label)}${rn}${body}${cn}</svg>`;
}

// --- Heat maps: a thermal field, the colours melting into each other ---
// Values (0..1) are drawn as grey squares, blurred, then each grey is swapped for its colour
// on the heat ramp (see heat() in look.js).

let heatIds = 0;

// The blur and the grey-to-colour swap, as an SVG filter.
function heatFilter(id, blur) {
  const tables = [[], [], []];
  for (let k = 0; k < 40; k++) hexToRgb(heat(k / 39)).forEach((v, i) => tables[i].push(v.toFixed(3)));
  const [r, g, b] = tables.map((t) => t.join(' '));
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${blur}"/><feComponentTransfer><feFuncR type="table" tableValues="${r}"/><feFuncG type="table" tableValues="${g}"/><feFuncB type="table" tableValues="${b}"/><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer></filter>`;
}

// A heat field inside an SVG: grid[row][col] = 0..1 (null = nothing, drawn as none).
// strips: each row is its own rounded strip and the heat only runs sideways; otherwise one rounded field.
function heatField(grid, x, w, rowH, { blur = 4, strips = 0 } = {}) {
  const id = `heat${heatIds++}`;
  const cols = grid[0].length;
  const cw = w / cols;
  const grey = (v) => { const g = Math.round(Math.min(Math.max(v || 0, 0), 1) * 255); return `rgb(${g},${g},${g})`; };
  let cells = '';
  grid.forEach((row, r) => row.forEach((v, c) => {
    if (v) cells += `<rect x="${(x + c * cw).toFixed(2)}" y="${(r * rowH).toFixed(2)}" width="${(cw + 0.5).toFixed(2)}" height="${(rowH + 0.5).toFixed(2)}" fill="${grey(v)}"/>`;
  }));
  const h = grid.length * rowH;
  const clip = strips
    ? grid.map((_, r) => `<rect x="${x}" y="${r * rowH + strips / 2}" width="${w}" height="${rowH - strips}" rx="${(rowH - strips) / 2}"/>`).join('')
    : `<rect x="${x}" y="0" width="${w}" height="${h}" rx="12"/>`;
  return `<defs>${heatFilter(id, strips ? `${blur} 0.01` : blur)}<clipPath id="${id}c">${clip}</clipPath></defs>
    <g clip-path="url(#${id}c)"><g filter="url(#${id})"><rect x="${x - 30}" y="-30" width="${w + 60}" height="${h + 60}" fill="${grey(0)}"/>${cells}</g></g>`;
}

// The year: a row per month, a column per day of the month. rows: [{ name, values: [31 x 0..1 or null] }].
function heatYear(rows, label) {
  const left = 30;
  const rowH = 30;
  const w = W - left;
  const h = rows.length * rowH;
  const names = rows.map((r, k) => txt(0, k * rowH + rowH / 2 + 3.5, r.name, { anchor: 'start', size: 9.5 })).join('');
  const days = [1, 10, 20, 31].map((d) => txt(left + ((d - 0.5) / 31) * w, h + 14, String(d), { size: 9.5 })).join('');
  return `${svgOpen(h + 18, label)}${heatField(rows.map((r) => r.values), left, w, rowH, { blur: 5 })}${names}${days}</svg>`;
}

// A month as a calendar (Monday first), the heat melting across the days, with the dates on top.
// values: { "YYYY-MM-DD": 0..1 }; days missing from it show as none.
function heatMonth(month, values, label) {
  const first = new Date(`${month}-01T12:00:00`);
  const offset = (first.getDay() + 6) % 7;
  const length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const rows = Math.ceil((offset + length) / 7);
  const cw = W / 7;
  const grid = Array.from({ length: rows }, () => new Array(7).fill(0));
  let dates = '';
  for (let d = 1; d <= length; d++) {
    const pos = offset + d - 1;
    const v = values[`${month}-${String(d).padStart(2, '0')}`] || 0;
    grid[Math.floor(pos / 7)][pos % 7] = v;
    // Dates sit on the field: light on the deepest colours, ink on the rest.
    dates += txt((pos % 7) * cw + 9, Math.floor(pos / 7) * cw + 18, String(d), { anchor: 'start', size: 11, fill: v > 0.76 ? COLOURS.onColour : INK });
  }
  return `${svgOpen(rows * cw, label)}${heatField(grid, 0, W, cw, { blur: 13 })}${dates}</svg>`;
}

// One soft strip per thing, the heat running sideways through the columns.
function heatStrips(grid, rowNames, colNames, label) {
  const left = 96;
  const rowH = 30;
  const w = W - left;
  const h = grid.length * rowH;
  const names = rowNames.map((n, r) => txt(0, r * rowH + rowH / 2 + 3.5, n.length > 15 ? `${n.slice(0, 14)}…` : n, { anchor: 'start', size: 10, fill: INK })).join('');
  const cw = w / grid[0].length;
  const cn = colNames.map((n, c) => (n ? txt(left + c * cw + 2, h + 12, n, { anchor: 'start', size: 9 }) : '')).join('');
  return `${svgOpen(h + 16, label)}${heatField(grid, left, w, rowH, { blur: cw * 0.5, strips: 9 })}${names}${cn}</svg>`;
}

// A small soft strip, for list rows.
function heatRow(values, w = 120) {
  return `<svg width="${w}" height="12" viewBox="0 0 ${w} 12" aria-hidden="true" style="flex-shrink: 0">${heatField([values], 0, w, 12, { blur: (w / values.length) * 0.45, strips: 0.01 })}</svg>`;
}

// The heat map's key: the ramp from none to the most.
function heatKey() {
  const stops = Array.from({ length: 9 }, (_, k) => `<stop offset="${k / 8}" stop-color="${heat(k / 8)}"/>`).join('');
  const id = `heat${heatIds++}k`;
  return `<div class="key"><span>none <svg width="120" height="8" aria-hidden="true"><defs><linearGradient id="${id}">${stops}</linearGradient></defs><rect width="120" height="8" rx="4" fill="url(#${id})"/></svg> the most</span></div>`;
}

// A horizontal bar for list rows: the track is a pale tint, the fill deepens with the value.
function hbar(v, colour) {
  return `<span class="track" style="background: linear-gradient(90deg, ${shade(colour, 0.3)}, ${shade(colour, 0.3 + 0.7 * v)}) 0 0 / ${Math.max(4, Math.round(v * 100))}% 100% no-repeat"></span>`;
}

// Avoidance: a sun on the horizon. Above the line, the light part (showing up); below, the deep part (hiding).
// share = how much shows above the line.
function horizon(share, light, deep, label, h = 150, R = 52) {
  const cx = W / 2;
  const hy = h * 0.5;
  const cy = hy + R - share * 2 * R;
  const id = `hz${Math.round(share * 1000)}${R}`;
  return `${svgOpen(h, label)}<defs><clipPath id="${id}a"><rect x="0" y="0" width="${W}" height="${hy}"/></clipPath><clipPath id="${id}b"><rect x="0" y="${hy}" width="${W}" height="${h - hy}"/></clipPath></defs>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="${light}" clip-path="url(#${id}a)"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="${deep}" clip-path="url(#${id}b)"/>
    <line x1="10" x2="${W - 10}" y1="${hy}" y2="${hy}" stroke="${INK}" stroke-width="1"/></svg>`;
}

function miniSun(share, light, deep, size = 26) {
  const c = size / 2;
  const R = size * 0.36;
  const cy = c + R - share * 2 * R;
  const id = `ms${Math.round(share * 1000)}${size}`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="flex-shrink: 0"><defs><clipPath id="${id}a"><rect width="${size}" height="${c}"/></clipPath><clipPath id="${id}b"><rect y="${c}" width="${size}" height="${c}"/></clipPath></defs><circle cx="${c}" cy="${cy}" r="${R}" fill="${light}" clip-path="url(#${id}a)"/><circle cx="${c}" cy="${cy}" r="${R}" fill="${deep}" clip-path="url(#${id}b)"/><line x1="2" x2="${size - 2}" y1="${c}" y2="${c}" stroke="${INK}" stroke-width="0.8"/></svg>`;
}

// A row of little suns along a horizon, one per week. Like the big sun, each one sits
// higher the more you showed up, and the part above the line is light, the part below deep.
function sunPath(shares, labels, light, deep, label) {
  const h = 74;
  const hy = 30;
  const per = W / shares.length;
  const R = Math.min(11, per * 0.38);
  const defs = `<defs><clipPath id="sp-up"><rect x="0" y="0" width="${W}" height="${hy}"/></clipPath><clipPath id="sp-down"><rect x="0" y="${hy}" width="${W}" height="${h - hy}"/></clipPath></defs>`;
  let body = '';
  shares.forEach((s, k) => {
    const x = ((k + 0.5) * per).toFixed(1);
    if (s != null) {
      const cy = (hy + R - s * 2 * R).toFixed(1);
      body += `<circle cx="${x}" cy="${cy}" r="${R}" fill="${light}" clip-path="url(#sp-up)"/><circle cx="${x}" cy="${cy}" r="${R}" fill="${deep}" clip-path="url(#sp-down)"/>`;
    } else {
      body += `<circle cx="${x}" cy="${hy}" r="1.4" fill="${COLOURS.nothing}"/>`;
    }
    body += txt(Number(x), h - 6, labels[k], { size: 9 });
  });
  return `${svgOpen(h, label)}${defs}${body}<line x1="0" x2="${W}" y1="${hy}" y2="${hy}" stroke="${INK}" stroke-width="0.8"/></svg>`;
}
