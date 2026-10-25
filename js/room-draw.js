// room-draw.js: a little pixel-art drawing page (#draw), for making pieces for
// the room on the phone or the computer. A drawing goes on to the Add pieces
// page (to name it and add it to the inventory), or back onto a piece you're
// changing.
//
// The drawing in progress is kept on this phone (localStorage "keystone-drawing"),
// so it's still there if you leave the page.

const DRAW_SIZES = [[16, 16], [16, 32], [32, 32], [32, 48], [48, 32], [64, 64]];
// The starting colours: the cottage palette of the placeholder art.
const DRAW_COLOURS = [
  '#3B2C2A', '#7A5238', '#A0714F', '#C3926A', '#F2E8D5', '#FBF7EF', '#E2D3B8', '#C2754F',
  '#7E9068', '#A9B98F', '#C5D2B3', '#6E9A5C', '#93BA77', '#D99A93', '#B97872', '#E79AA6',
  '#8FA6C2', '#CFE0EA', '#8C6A8E', '#D3A84F', '#D9B55A', '#9C9CA8', '#6C6C7A', '#2E2B33',
];
const MAX_UNDO = 60;

const draw = {
  w: 16, h: 16, px: null,
  tool: 'pen', colour: '#3B2C2A', mirrorX: false, mirrorY: false, grid: true,
  undo: [], redo: [], recent: [],
};
let drawFor = null; // { piece, view } when drawing on a piece you already have
let drawing = false;
let lastPoint = null;

function blankPixels(w, h) {
  return new Uint8ClampedArray(w * h * 4);
}

function rememberDrawing() {
  if (drawFor) return; // drawing on a piece: that's saved with the piece instead
  try {
    localStorage.setItem('keystone-drawing', JSON.stringify({ w: draw.w, h: draw.h, src: drawingToUrl(), recent: draw.recent }));
  } catch { /* not important */ }
}

function drawingCanvas() {
  const c = document.createElement('canvas');
  c.width = draw.w;
  c.height = draw.h;
  c.getContext('2d').putImageData(new ImageData(draw.px.slice(), draw.w, draw.h), 0, 0);
  return c;
}
const drawingToUrl = () => drawingCanvas().toDataURL('image/png');

// Starts from a picture: a saved drawing, or a piece's look.
async function loadDrawingFrom(src) {
  const c = pictureCanvas(await loadPicture(src));
  draw.w = c.width;
  draw.h = c.height;
  draw.px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data.slice();
  draw.undo = [];
  draw.redo = [];
}

async function showDraw() {
  if (drawFor) {
    const piece = pieces.get(drawFor.piece) || (await getAllItems()).find((i) => i.id === drawFor.piece);
    if (piece) await loadDrawingFrom(viewOf(piece, drawFor.view).src);
  } else if (!draw.px) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('keystone-drawing')); } catch { /* start fresh */ }
    if (saved && saved.src) {
      draw.recent = saved.recent || [];
      await loadDrawingFrom(saved.src).catch(() => { draw.px = blankPixels(draw.w, draw.h); });
    } else {
      draw.px = blankPixels(draw.w, draw.h);
    }
  }
  const forPiece = drawFor && pieces.get(drawFor.piece);
  $('draw-page').innerHTML = `
    <header class="plain-head">
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">${forPiece ? escapeHtml(forPiece.name) : 'Draw'}</h1></div>
      <button class="ink-button" type="button" data-draw="use">${forPiece ? 'Save' : 'Use this'}</button>
    </header>
    <div class="side">
      <div class="draw-tools" role="toolbar" aria-label="Drawing tools">
        ${[['pen', 'Pen'], ['erase', 'Eraser'], ['fill', 'Fill'], ['pick', 'Pick']].map(([key, name]) =>
          `<button type="button" class="chip" data-tool="${key}" aria-pressed="${draw.tool === key}">${name}</button>`).join('')}
      </div>
      <div class="draw-stage"><canvas id="draw-canvas"></canvas></div>
      <div class="draw-tools">
        <button type="button" class="text-button" data-draw="undo">Undo</button>
        <button type="button" class="text-button" data-draw="redo">Redo</button>
      </div>
      <div class="draw-colours" id="draw-colours"></div>
      <label class="own-colour"><input type="color" id="draw-own" value="${draw.colour}"> or pick your own colour</label>
      <div class="draw-tools">
        <button type="button" class="chip" data-draw="mirrorX" aria-pressed="${draw.mirrorX}">Mirror left and right</button>
        <button type="button" class="chip" data-draw="mirrorY" aria-pressed="${draw.mirrorY}">Mirror up and down</button>
        <button type="button" class="chip" data-draw="grid" aria-pressed="${draw.grid}">Grid</button>
      </div>
      <div class="draw-preview-row">
        <canvas id="draw-preview" class="pixel draw-preview"></canvas>
        <p class="muted">How it looks in the room. ${draw.w} × ${draw.h} pixels: ${draw.w / TILE} × ${draw.h / TILE} tiles.</p>
      </div>
      <div class="draw-tools">
        <button type="button" class="text-button" data-draw="outline">Add an outline</button>
        <button type="button" class="text-button" data-draw="flip">Flip the picture</button>
        <button type="button" class="text-button danger" data-draw="clear">Clear</button>
      </div>
      <h3 class="cat-h">Size</h3>
      <div class="draw-tools">
        ${DRAW_SIZES.map(([w, h]) => `<button type="button" class="chip" data-size="${w}x${h}" aria-pressed="${draw.w === w && draw.h === h}">${w} × ${h}</button>`).join('')}
      </div>
      <div class="cut-box">
        <label>Width <input type="number" id="draw-w" min="4" max="128" value="${draw.w}"></label>
        <label>Height <input type="number" id="draw-h" min="4" max="128" value="${draw.h}"></label>
        <button type="button" class="text-button" data-draw="resize">Change size</button>
      </div>
      <p class="muted">Changing the size keeps your drawing on the bottom edge, where pieces stand. One tile is 16 pixels.</p>
      <div class="buttons">
        <label class="text-button file-button"><span>Open a picture to draw on</span><input id="draw-file" type="file" accept="image/*" hidden></label>
        <button type="button" class="text-button" data-draw="download">Save the picture to this device</button>
      </div>
    </div>`;
  showDrawColours();
  paintDrawing();
}

function showDrawColours() {
  const colours = [...new Set([...draw.recent, ...DRAW_COLOURS])];
  $('draw-colours').innerHTML = colours.map((c) =>
    `<button type="button" data-colour-pick="${c}" style="background: ${c}" aria-label="${c}" aria-pressed="${c.toLowerCase() === draw.colour.toLowerCase()}"></button>`).join('');
}

function setDrawColour(colour) {
  draw.colour = colour;
  const own = $('draw-own');
  if (own) own.value = colour;
  showDrawColours();
}

// --- Drawing on screen ---

function cellSize() {
  const space = Math.min(440, document.documentElement.clientWidth - 40);
  return Math.max(4, Math.min(28, Math.floor(space / Math.max(draw.w, draw.h * 0.8))));
}

function paintDrawing() {
  const c = $('draw-canvas');
  if (!c) return;
  const cell = cellSize();
  const dpr = window.devicePixelRatio || 1;
  c.width = draw.w * cell * dpr;
  c.height = draw.h * cell * dpr;
  c.style.width = `${draw.w * cell}px`;
  c.style.height = `${draw.h * cell}px`;
  const g = c.getContext('2d');
  const s = cell * dpr;
  // A checked background shows what's see-through.
  for (let y = 0; y < draw.h; y++) for (let x = 0; x < draw.w; x++) {
    g.fillStyle = (x + y) % 2 ? '#E9E4DE' : '#F7F4F0';
    g.fillRect(x * s, y * s, s, s);
  }
  g.imageSmoothingEnabled = false;
  g.drawImage(drawingCanvas(), 0, 0, c.width, c.height);
  if (draw.grid && cell >= 6) {
    g.fillStyle = 'rgba(61, 52, 50, 0.12)';
    for (let x = 1; x < draw.w; x++) g.fillRect(Math.round(x * s), 0, 1, c.height);
    for (let y = 1; y < draw.h; y++) g.fillRect(0, Math.round(y * s), c.width, 1);
    // Tile edges, every 16 pixels, a little stronger.
    g.fillStyle = 'rgba(61, 52, 50, 0.35)';
    for (let x = TILE; x < draw.w; x += TILE) g.fillRect(Math.round(x * s), 0, 1, c.height);
    for (let y = draw.h % TILE; y < draw.h; y += TILE) if (y) g.fillRect(0, Math.round(y * s), c.width, 1);
  }
  if (draw.mirrorX || draw.mirrorY) {
    g.fillStyle = 'rgba(47, 127, 208, 0.6)';
    if (draw.mirrorX) g.fillRect(Math.round((draw.w / 2) * s) - 1, 0, 2, c.height);
    if (draw.mirrorY) g.fillRect(0, Math.round((draw.h / 2) * s) - 1, c.width, 2);
  }
  const p = $('draw-preview');
  p.width = draw.w * 3;
  p.height = draw.h * 3;
  const pg = p.getContext('2d');
  pg.imageSmoothingEnabled = false;
  pg.drawImage(drawingCanvas(), 0, 0, p.width, p.height);
}

// --- Changing pixels ---

const hexToBytes = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function setPixel(x, y, rgba) {
  if (x < 0 || y < 0 || x >= draw.w || y >= draw.h) return;
  draw.px.set(rgba, (y * draw.w + x) * 4);
}

// One dab of the pen or eraser, mirrored if mirroring is on.
function dab(x, y) {
  const rgba = draw.tool === 'erase' ? [0, 0, 0, 0] : [...hexToBytes(draw.colour), 255];
  const xs = draw.mirrorX ? [x, draw.w - 1 - x] : [x];
  const ys = draw.mirrorY ? [y, draw.h - 1 - y] : [y];
  for (const px of xs) for (const py of ys) setPixel(px, py, rgba);
}

// Every pixel on a straight line, so a quick stroke has no gaps.
function line(a, b) {
  let [x0, y0] = a;
  const [x1, y1] = b;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    dab(x0, y0);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function pixelAt(x, y) {
  const i = (y * draw.w + x) * 4;
  return [...draw.px.slice(i, i + 4)];
}

function fillFrom(x, y) {
  const target = pixelAt(x, y).join();
  const rgba = [...hexToBytes(draw.colour), 255];
  if (target === rgba.join()) return;
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= draw.w || cy >= draw.h || pixelAt(cx, cy).join() !== target) continue;
    setPixel(cx, cy, rgba);
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

function saveUndo() {
  draw.undo.push(draw.px.slice());
  if (draw.undo.length > MAX_UNDO) draw.undo.shift();
  draw.redo = [];
}

function changed() {
  paintDrawing();
  rememberDrawing();
}

function pointToPixel(event) {
  const r = $('draw-canvas').getBoundingClientRect();
  return [Math.floor(((event.clientX - r.left) / r.width) * draw.w), Math.floor(((event.clientY - r.top) / r.height) * draw.h)];
}

$('draw-page').addEventListener('pointerdown', (event) => {
  if (event.target.id !== 'draw-canvas') return;
  event.preventDefault();
  const [x, y] = pointToPixel(event);
  if (draw.tool === 'pick') {
    const [r, g, b, a] = pixelAt(x, y);
    if (a) setDrawColour(`#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase());
    draw.tool = 'pen';
    for (const b2 of document.querySelectorAll('[data-tool]')) b2.setAttribute('aria-pressed', b2.dataset.tool === 'pen');
    return;
  }
  saveUndo();
  if (draw.tool === 'fill') {
    fillFrom(x, y);
    noteColourUsed();
    changed();
    return;
  }
  drawing = true;
  lastPoint = [x, y];
  event.target.setPointerCapture(event.pointerId);
  dab(x, y);
  paintDrawing();
});

$('draw-page').addEventListener('pointermove', (event) => {
  if (!drawing) return;
  const point = pointToPixel(event);
  if (point[0] === lastPoint[0] && point[1] === lastPoint[1]) return;
  line(lastPoint, point);
  lastPoint = point;
  paintDrawing();
});

function endStroke() {
  if (!drawing) return;
  drawing = false;
  if (draw.tool === 'pen') noteColourUsed();
  rememberDrawing();
}
$('draw-page').addEventListener('pointerup', endStroke);
$('draw-page').addEventListener('pointercancel', endStroke);

// Colours you use come to the front of the swatches.
function noteColourUsed() {
  if (draw.tool === 'erase') return;
  const c = draw.colour.toUpperCase();
  draw.recent = [c, ...draw.recent.filter((r) => r !== c)].slice(0, 8);
  showDrawColours();
}

// --- Whole-picture changes ---

// A 1-pixel outline in the current colour around everything drawn.
function addOutline() {
  const solid = (x, y) => x >= 0 && y >= 0 && x < draw.w && y < draw.h && pixelAt(x, y)[3] > 0;
  const add = [];
  for (let y = 0; y < draw.h; y++) for (let x = 0; x < draw.w; x++) {
    if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push([x, y]);
  }
  const rgba = [...hexToBytes(draw.colour), 255];
  for (const [x, y] of add) setPixel(x, y, rgba);
}

function flipPicture() {
  const old = draw.px.slice();
  for (let y = 0; y < draw.h; y++) for (let x = 0; x < draw.w; x++) {
    const from = (y * draw.w + (draw.w - 1 - x)) * 4;
    draw.px.set(old.slice(from, from + 4), (y * draw.w + x) * 4);
  }
}

// New size, keeping the drawing on the bottom edge and centred across.
function resizeDrawing(w, h) {
  const old = drawingCanvas();
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(old, Math.floor((w - draw.w) / 2), h - draw.h);
  draw.w = w;
  draw.h = h;
  draw.px = c.getContext('2d').getImageData(0, 0, w, h).data.slice();
  draw.undo = [];
  draw.redo = [];
}

$('draw-page').addEventListener('click', async (event) => {
  const tool = event.target.closest('[data-tool]');
  if (tool) {
    draw.tool = tool.dataset.tool;
    for (const b of document.querySelectorAll('[data-tool]')) b.setAttribute('aria-pressed', b === tool);
    return;
  }
  const swatch = event.target.closest('[data-colour-pick]');
  if (swatch) {
    setDrawColour(swatch.dataset.colourPick);
    if (draw.tool === 'erase' || draw.tool === 'pick') {
      draw.tool = 'pen';
      for (const b of document.querySelectorAll('[data-tool]')) b.setAttribute('aria-pressed', b.dataset.tool === 'pen');
    }
    return;
  }
  const size = event.target.closest('[data-size]');
  if (size) {
    const [w, h] = size.dataset.size.split('x').map(Number);
    if (w === draw.w && h === draw.h) return;
    resizeDrawing(w, h);
    rememberDrawing();
    showDraw();
    return;
  }
  const button = event.target.closest('[data-draw]');
  if (!button) return;
  const action = button.dataset.draw;
  if (action === 'undo' && draw.undo.length) {
    draw.redo.push(draw.px.slice());
    draw.px = draw.undo.pop();
    changed();
  }
  if (action === 'redo' && draw.redo.length) {
    draw.undo.push(draw.px.slice());
    draw.px = draw.redo.pop();
    changed();
  }
  if (action === 'mirrorX' || action === 'mirrorY' || action === 'grid') {
    draw[action] = !draw[action];
    button.setAttribute('aria-pressed', draw[action]);
    paintDrawing();
  }
  if (action === 'outline') { saveUndo(); addOutline(); changed(); }
  if (action === 'flip') { saveUndo(); flipPicture(); changed(); }
  if (action === 'clear' && confirm('Clear the whole drawing?')) { saveUndo(); draw.px = blankPixels(draw.w, draw.h); changed(); }
  if (action === 'resize') {
    const w = Math.max(4, Math.min(128, Math.round(Number($('draw-w').value)) || draw.w));
    const h = Math.max(4, Math.min(128, Math.round(Number($('draw-h').value)) || draw.h));
    resizeDrawing(w, h);
    rememberDrawing();
    showDraw();
  }
  if (action === 'download') {
    const a = document.createElement('a');
    a.href = drawingToUrl();
    a.download = 'keystone-drawing.png';
    a.click();
  }
  if (action === 'use') await useDrawing();
});

$('draw-page').addEventListener('input', (event) => {
  if (event.target.id === 'draw-own') setDrawColour(event.target.value.toUpperCase());
});

$('draw-page').addEventListener('change', async (event) => {
  if (event.target.id !== 'draw-file' || !event.target.files[0]) return;
  const file = event.target.files[0];
  event.target.value = '';
  try {
    await loadDrawingFrom(await readFileAsDataUrl(file));
  } catch (error) {
    alert(error.message);
    return;
  }
  if (draw.w > 128 || draw.h > 128) {
    alert('That picture is bigger than 128 pixels. Use Add pieces to cut a part out of it instead.');
    draw.px = blankPixels(16, 16);
    draw.w = 16;
    draw.h = 16;
  }
  rememberDrawing();
  showDraw();
});

// Takes the drawing onward: onto the piece you're changing, or to Add pieces
// to name it and put it in the inventory.
async function useDrawing() {
  const canvas = drawingCanvas();
  if (drawFor) {
    const piece = pieces.get(drawFor.piece);
    const views = piece.views.map((v, i) => (i === drawFor.view ? { ...v, src: canvas.toDataURL('image/png'), pw: draw.w, ph: draw.h } : v));
    const saved = await putItem({ ...piece, views });
    pieces.set(saved.id, saved);
    drawFor = null;
    // The next drawing starts from the one in progress, not this piece.
    draw.px = null;
    goTo('home');
    showBackupInfo();
    return;
  }
  cut.sheet = canvas;
  cut.box = [0, 0, draw.w, draw.h];
  cut.corner = null;
  cut.tilesTouched = false;
  cutFor = null;
  cut.note = 'Your drawing. Give it a name and add it to the inventory.';
  goTo('room-add');
}
