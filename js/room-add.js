// room-add.js: two pages for your own art.
//   #room-add  cuts pieces out of a picture (a whole sheet, or a single piece).
//              Then they're named and set up together on the Pieces page
//              (room-pieces.js).
//   #cat       sets up the cat from a sprite sheet.
// The pictures are saved on the phone as items (see room.js), never in the app's files.

// --- Cutting pieces ---

// Cutting for a piece you already have: { id, view }. view is the look to cut
// again, or null to add a new turned look.
let cutFor = null;

// Starts cutting for a piece. Cutting again opens its own sheet, if that's the
// picture already in the cutter, with the old box ready.
function cutForPiece(id, view) {
  cutFor = { id, view };
  const piece = pieces.get(id);
  cut.boxes = [];
  cut.corner = null;
  const old = view !== null && piece.views[view].box;
  if (cut.sheet && old && piece.sheet && piece.sheet === sheetName()) cut.boxes = [[...old]];
  else if (view !== null) cut.note = piece.sheet ? `Choose ${piece.sheet}, the sheet it was cut from.` : 'Choose the picture it was cut from.';
  goTo('room-add');
}
// sheet: the picture, as a canvas. boxes: the pieces boxed on it so far, each
// [x, y, width, height]. corner: the first corner of a box being drawn.
// name: what the picture is called (its file name).
const cut = { sheet: null, boxes: [], corner: null, zoom: 2, snap: true, name: '', note: '' };

// The name pieces from this picture remember, or '' for a drawing.
const sheetName = () => (cut.name && cut.name !== 'Drawing' ? cut.name : '');

// A sheet's file name as a set name: "cottage_red-furniture" is "Cottage red furniture".
function setNameFrom(name) {
  const words = name.replace(/[_-]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : '';
}

function showRoomAdd() {
  const forPiece = cutFor && pieces.get(cutFor.id);
  const again = forPiece && cutFor.view !== null;
  $('cut-page').innerHTML = `
    <header class="plain-head">
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">${again ? 'Cut again' : forPiece ? 'Add a turned look' : 'Cut pieces'}</h1></div>
      <button class="ink-button" type="button" data-cut="done">Done</button>
    </header>
    <div class="side">
      <p class="muted">${again ? 'Box the piece again. The new picture replaces the old one, everywhere it stands in the room.'
        : forPiece ? 'Box the picture of this piece turned another way.'
        : 'Choose a picture: one piece, or a whole sheet. Box the pieces, then add them. You name and set them up next, all together.'}
        The picture needs a see-through background, like a PNG.</p>
      <div class="buttons">
        <label class="ink-button"><span>Choose a picture</span><input id="cut-file" type="file" accept="image/*" hidden></label>
        <button class="text-button" type="button" data-cut="draw">Draw one</button>
        <button class="text-button" type="button" data-cut="starter">Use the starter sheet</button>
      </div>
      <p id="cut-status" class="status" role="status">${cut.note}</p>
      <div id="cut-work"${cut.sheet ? '' : ' hidden'}>
        <div class="cut-tools">
          <button class="text-button" type="button" data-cut="out" aria-label="Zoom out">−</button>
          <span id="cut-zoom" class="muted"></span>
          <button class="text-button" type="button" data-cut="in" aria-label="Zoom in">+</button>
          <label class="check"><input id="cut-snap" type="checkbox"${cut.snap ? ' checked' : ''}><span>Snap to tiles</span></label>
        </div>
        <p class="muted">Tap two opposite corners to box a piece${forPiece ? '' : ', or find them all at once. Tap a box again to take it out'}. Empty edges are trimmed off.</p>
        ${forPiece ? '' : '<p><button class="text-button" type="button" data-cut="find">Find all pieces</button></p>'}
        <div id="cut-scroll" class="cut-scroll"><canvas id="cut-canvas" class="pixel"></canvas></div>
        <div id="cut-boxed"></div>
      </div>
    </div>`;
  cut.note = '';
  if (cut.sheet) {
    fitCutZoom();
    drawCutSheet();
  }
  showBoxed();
}

function fitCutZoom() {
  const space = $('cut-scroll').clientWidth || 340;
  // At least 2x, so pieces are big enough to tap; the box scrolls if it's wider.
  cut.zoom = Math.max(2, Math.min(8, Math.floor(space / cut.sheet.width)));
}

function drawCutSheet() {
  const c = $('cut-canvas');
  // Phones can't hold giant canvases, so very big sheets zoom less.
  while (cut.zoom > 1 && cut.sheet.width * cut.zoom * cut.sheet.height * cut.zoom > 16e6) cut.zoom--;
  c.width = cut.sheet.width * cut.zoom;
  c.height = cut.sheet.height * cut.zoom;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  // A checked background shows what's see-through.
  for (let y = 0; y < c.height; y += 8) for (let x = 0; x < c.width; x += 8) {
    g.fillStyle = (x / 8 + y / 8) % 2 ? '#E9E4DE' : '#F7F4F0';
    g.fillRect(x, y, 8, 8);
  }
  g.drawImage(cut.sheet, 0, 0, c.width, c.height);
  g.fillStyle = 'rgba(61, 52, 50, 0.18)';
  const step = TILE * cut.zoom;
  for (let x = step; x < c.width; x += step) g.fillRect(x, 0, 1, c.height);
  for (let y = step; y < c.height; y += step) g.fillRect(0, y, c.width, 1);
  g.strokeStyle = '#3E9B5A';
  g.lineWidth = 2;
  for (const box of cut.boxes) {
    const [x, y, w, h] = box.map((n) => n * cut.zoom);
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
  if (cut.corner) {
    g.fillStyle = '#2F7FD0';
    g.fillRect(cut.corner[0] * cut.zoom - 3, cut.corner[1] * cut.zoom - 3, 6, 6);
  }
  $('cut-zoom').textContent = `${cut.zoom}×`;
}

// What's boxed so far, and the button to add it.
function showBoxed() {
  const el = $('cut-boxed');
  if (!el) return;
  const n = cut.boxes.length;
  if (cutFor) {
    const again = cutFor.view !== null;
    el.innerHTML = n ? `<div class="cut-preview"><img class="pixel" src="${cutBox(cut.sheet, cut.boxes[0])}" alt="" style="--pw: ${cut.boxes[0][2]}; --ph: ${cut.boxes[0][3]}"></div>
      <p><button class="ink-button" type="button" data-cut="look">${again ? 'Use this cut' : 'Add this turned look'}</button></p>` : '';
    return;
  }
  el.innerHTML = n ? `
    <h3 class="cat-h">${n} boxed</h3>
    <div class="pile">${cut.boxes.map((box, i) => `<button type="button" class="pile-tile" data-cut="unbox" data-i="${i}" aria-label="Take piece ${i + 1} out">
      <img class="pixel" src="${cutBox(cut.sheet, box)}" alt="" style="--pw: ${box[2]}; --ph: ${box[3]}"></button>`).join('')}</div>
    <p class="muted">Tap one to take it out.</p>
    <form id="cut-form">
      <label class="field"><span>Set</span><input name="set" type="text" value="${escapeHtml(setNameFrom(sheetName()))}" list="cut-set-names" autocomplete="off" placeholder="Not in a set"></label>
      <datalist id="cut-set-names">${[...new Set([...pieces.values()].map((p) => p.set).filter(Boolean))].map((s) => `<option value="${escapeHtml(s)}">`).join('')}</datalist>
      <label class="field"><span>Colour <span class="muted">(if the sheet is one colour of a set)</span></span><input name="colour" type="text" autocomplete="off" placeholder="None"></label>
      <label class="check"><input type="checkbox" name="locked" checked><span>Put them in the gacha machine, to unlock</span></label>
      <div class="buttons">
        <button class="ink-button" type="submit">Add ${n} ${n === 1 ? 'piece' : 'pieces'}</button>
        <button class="text-button" type="button" data-cut="clear">Clear</button>
      </div>
    </form>` : '';
}

async function useCutPicture(src, name) {
  try {
    cut.sheet = pictureCanvas(await loadPicture(src));
  } catch (error) {
    $('cut-status').textContent = error.message;
    return;
  }
  cut.name = name;
  cut.boxes = [];
  cut.corner = null;
  $('cut-work').hidden = false;
  fitCutZoom();
  // Cutting a piece again: its old box, if it fits this picture.
  const old = cutFor && cutFor.view !== null && pieces.get(cutFor.id).views[cutFor.view].box;
  if (old && old[0] + old[2] <= cut.sheet.width && old[1] + old[3] <= cut.sheet.height) cut.boxes = [[...old]];
  // A single piece is boxed straight away.
  else if (cut.sheet.width <= 64 && cut.sheet.height <= 64) cut.boxes = [trimBox(cut.sheet, [0, 0, cut.sheet.width, cut.sheet.height])];
  drawCutSheet();
  showBoxed();
  $('cut-status').textContent = `${name}, ${cut.sheet.width} × ${cut.sheet.height} pixels.`;
  await recognisePieces();
}

$('cut-page').addEventListener('change', async (event) => {
  if (event.target.id === 'cut-file' && event.target.files[0]) {
    const file = event.target.files[0];
    event.target.value = '';
    await useCutPicture(await readFileAsDataUrl(file), file.name.replace(/\.[^.]*$/, ''));
  }
  if (event.target.id === 'cut-snap') cut.snap = event.target.checked;
});

$('cut-page').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-cut]');
  if (!button) return;
  const action = button.dataset.cut;
  if (action === 'done') {
    cutFor = null;
    goTo('home');
  }
  if (action === 'draw') {
    drawFor = null;
    goTo('draw');
  }
  if (action === 'starter') await useCutPicture('room-art/starter.png', 'Starter');
  if (!cut.sheet) return;
  if (action === 'in' || action === 'out') {
    cut.zoom = Math.max(1, Math.min(12, cut.zoom + (action === 'in' ? 1 : -1)));
    drawCutSheet();
  }
  if (action === 'find') {
    const found = findPieces(cut.sheet).filter((box) => !cut.boxes.some((b) => b.join() === box.join()));
    cut.boxes.push(...found);
    drawCutSheet();
    showBoxed();
    const whole = found.length === 1 && found[0][2] === cut.sheet.width && found[0][3] === cut.sheet.height;
    $('cut-status').textContent = whole ? 'The whole picture came out as one piece. Finding pieces needs a see-through gap between them.'
      : found.length ? `Found ${found.length}. Pieces touching each other come out as one box: take it out and box them by hand.` : 'No new pieces found.';
  }
  if (action === 'unbox') {
    cut.boxes.splice(Number(button.dataset.i), 1);
    drawCutSheet();
    showBoxed();
  }
  if (action === 'clear') {
    cut.boxes = [];
    drawCutSheet();
    showBoxed();
  }
  if (action === 'look') await (cutFor.view === null ? addTurnedLook() : useNewCut());
});

// Tapping on the sheet: two corners make a box. A tap inside a box takes it out.
$('cut-page').addEventListener('pointerup', (event) => {
  if (event.target.id !== 'cut-canvas') return;
  const r = event.target.getBoundingClientRect();
  const px = Math.floor(((event.clientX - r.left) / r.width) * cut.sheet.width);
  const py = Math.floor(((event.clientY - r.top) / r.height) * cut.sheet.height);
  const inside = !cut.corner && !cutFor && cut.boxes.findIndex(([x, y, w, h]) => px >= x && px < x + w && py >= y && py < y + h);
  if (inside !== false && inside >= 0) {
    cut.boxes.splice(inside, 1);
  } else {
    const unit = cut.snap ? TILE : 1;
    const sx = Math.floor(px / unit) * unit;
    const sy = Math.floor(py / unit) * unit;
    if (!cut.corner) {
      cut.corner = [sx, sy];
    } else {
      const x0 = Math.min(cut.corner[0], sx);
      const y0 = Math.min(cut.corner[1], sy);
      const x1 = Math.min(cut.sheet.width, Math.max(cut.corner[0], sx) + unit);
      const y1 = Math.min(cut.sheet.height, Math.max(cut.corner[1], sy) + unit);
      const box = trimBox(cut.sheet, [x0, y0, x1 - x0, y1 - y0]);
      // A turned look is one box; pieces can be many.
      cut.boxes = cutFor ? [box] : [...cut.boxes, box];
      cut.corner = null;
    }
  }
  drawCutSheet();
  showBoxed();
});

// Adding every boxed piece, then on to the Pieces page to name and set them up.
$('cut-page').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const set = form.elements.set.value.trim();
  const base = set || 'Piece';
  const start = Date.now();
  const ids = [];
  for (const box of cut.boxes) {
    const [, , pw, ph] = box;
    const small = pw <= TILE && ph <= TILE;
    const view = { src: cutBox(cut.sheet, box), pw, ph, w: small ? 1 : Math.max(1, Math.round(pw / TILE)), d: 1, box: [...box] };
    const piece = await putItem({
      id: newId('piece'), kind: 'piece', day: '', name: `${base} ${ids.length + 1}`, type: small ? 'small' : 'furniture', views: [view],
      count: 1, surface: false, lift: 16, light: false, catSpot: false, catLift: 8, toy: false,
      set, colour: form.elements.colour.value.trim(), sheet: sheetName(), locked: form.elements.locked.checked, createdAt: start + ids.length,
    });
    pieces.set(piece.id, piece);
    ids.push(piece.id);
  }
  cut.boxes = [];
  showBackupInfo();
  showPiecesFor(ids);
});

// Cutting again: the look gets the new picture and box, and keeps its tiles.
async function useNewCut() {
  const piece = pieces.get(cutFor.id);
  const box = cut.boxes[0];
  const [, , pw, ph] = box;
  const views = piece.views.map((v, i) => (i === cutFor.view ? { ...v, src: cutBox(cut.sheet, box), pw, ph, box: [...box] } : v));
  const saved = await putItem({ ...piece, views, sheet: piece.sheet || sheetName() });
  pieces.set(saved.id, saved);
  cutFor = null;
  cut.boxes = [];
  goTo('home');
  openPieceDetails(saved);
}

async function addTurnedLook() {
  const piece = pieces.get(cutFor.id);
  const box = cut.boxes[0];
  const [, , pw, ph] = box;
  // Turned, it stands on its tiles the other way round.
  const view = { src: cutBox(cut.sheet, box), pw, ph, w: piece.views[0].d, d: piece.views[0].w };
  // It only keeps its box if it came from the piece's own sheet.
  if (sheetName() && piece.sheet === sheetName()) view.box = [...box];
  const saved = await putItem({ ...piece, views: [...piece.views, view] });
  pieces.set(saved.id, saved);
  cutFor = null;
  cut.boxes = [];
  org.note = `It now has ${saved.views.length} looks: tap Turn while placing it.`;
  goTo('pieces');
}

// Pieces cut before pieces remembered their sheet: if a piece's picture is one of
// the pieces on this sheet, it's from here. (Needed for cutting other colours.)
async function recognisePieces() {
  const name = sheetName();
  if (!cut.sheet || !name) return;
  const found = new Map(findPieces(cut.sheet).map((box) => [cutBox(cut.sheet, box), box]));
  for (const piece of [...pieces.values()]) {
    if (piece.sheet) continue;
    let matched = false;
    const views = piece.views.map((v) => {
      const box = v.box || found.get(v.src);
      if (box && !v.box) matched = true;
      return box ? { ...v, box } : v;
    });
    if (!matched) continue;
    const saved = await putItem({ ...piece, views, sheet: name });
    pieces.set(saved.id, saved);
  }
}

// Every separate picture on a sheet: groups of touching pixels that aren't
// see-through. Boxes that overlap are joined, so loose bits stay with their piece.
function findPieces(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const seen = new Uint8Array(w * h);
  let boxes = [];
  const stack = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || d[start * 4 + 3] === 0) continue;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, count = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      const y = (i - x) / w;
      count++;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!seen[j] && d[j * 4 + 3] > 0) { seen[j] = 1; stack.push(j); }
      }
    }
    if (count >= 6) boxes.push([x0, y0, x1, y1]);
  }
  for (let joined = true; joined;) {
    joined = false;
    outer: for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
      const [p, q] = [boxes[a], boxes[b]];
      if (p[0] <= q[2] && q[0] <= p[2] && p[1] <= q[3] && q[1] <= p[3]) {
        boxes[a] = [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[2], q[2]), Math.max(p[3], q[3])];
        boxes.splice(b, 1);
        joined = true;
        break outer;
      }
    }
  }
  // In reading order: row by row (rows of tiles), left to right.
  boxes = boxes.map(([x0, y0, x1, y1]) => [x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
  return boxes.sort((a, b) => Math.floor(a[1] / TILE) - Math.floor(b[1] / TILE) || a[0] - b[0]);
}

// --- The cat page ---

let catDraft = null;
let catDraftSheet = null;

async function showCatSetup() {
  await loadRoom();
  catDraft = JSON.parse(JSON.stringify(cat));
  try {
    catDraftSheet = pictureCanvas(await loadPicture(catDraft.src));
  } catch {
    catDraftSheet = null;
  }
  showCatPage();
}

// Draws the cat page from the draft.
function showCatPage() {
  $('cat-page').innerHTML = `
    <header class="plain-head">
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">Cat</h1></div>
      <button class="ink-button" type="button" data-cat="save">Save</button>
    </header>
    <div class="side">
      <label class="field"><span>Name</span><input id="cat-name" type="text" value="${escapeHtml(catDraft.name)}" autocomplete="off"></label>
      <h3 class="cat-h">Sprite sheet</h3>
      <p class="muted">A picture with every frame of the cat in a grid, like Stardew Valley's pets: 4 frames across, 32 × 32 pixels each.</p>
      <div class="buttons">
        <label class="ink-button"><span>Choose a sprite sheet</span><input id="cat-file" type="file" accept="image/*" hidden></label>
        <button class="text-button" type="button" data-cat="placeholder">Use the placeholder cat</button>
      </div>
      <p id="cat-status" class="status" role="status"></p>
      <div class="cut-box">
        <label>Frame width <input id="cat-fw" type="number" min="4" max="256" value="${catDraft.fw}"></label>
        <label>Frame height <input id="cat-fh" type="number" min="4" max="256" value="${catDraft.fh}"></label>
      </div>
      <p class="muted">The numbers on the sheet are frame numbers. Each animation starts at one frame and plays the ones after it.</p>
      <div class="cut-scroll"><canvas id="cat-sheet" class="pixel"></canvas></div>
      <h3 class="cat-h">Animations</h3>
      <div id="cat-anims">${CAT_ANIMS.map((a) => {
        const s = catDraft.anims[a.key];
        return `<div class="anim-row" data-anim="${a.key}">
          <canvas class="pixel anim-preview" data-preview="${a.key}"></canvas>
          <div class="anim-body">
            <b>${a.name}</b>${a.once ? '<span class="muted"> · plays once</span>' : ''}
            <div class="cut-box">
              <label>First frame <input type="number" min="0" data-set="start" value="${s.start}"></label>
              <label>Frames <input type="number" min="1" max="32" data-set="count" value="${s.count}"></label>
              <label>Speed <input type="number" min="0.5" max="24" step="0.5" data-set="fps" value="${s.fps}"></label>
            </div>
            ${a.canFlip ? `<label class="check"><input type="checkbox" data-set="flip"${s.flip ? ' checked' : ''}><span>Use walking right, turned around</span></label>` : ''}
            ${a.canFaceLeft ? `<label class="check"><input type="checkbox" data-set="facesLeft"${s.facesLeft ? ' checked' : ''}><span>These frames face left</span></label>` : ''}
          </div>
        </div>`;
      }).join('')}</div>
      <p class="muted">Speed is frames a second.</p>
    </div>`;
  drawCatSheet();
  startCatPreviews();
}

function drawCatSheet() {
  const c = $('cat-sheet');
  if (!catDraftSheet) {
    c.width = c.height = 0;
    return;
  }
  const space = c.parentElement.clientWidth || 340;
  const z = Math.max(1, Math.min(4, Math.floor(space / catDraftSheet.width)));
  c.width = catDraftSheet.width * z;
  c.height = catDraftSheet.height * z;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#EFEAE4';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(catDraftSheet, 0, 0, c.width, c.height);
  const fw = catDraft.fw * z;
  const fh = catDraft.fh * z;
  const across = Math.max(1, Math.floor(catDraftSheet.width / catDraft.fw));
  const down = Math.floor(catDraftSheet.height / catDraft.fh);
  g.font = '500 11px Roboto, sans-serif';
  for (let j = 0; j < down; j++) for (let i = 0; i < across; i++) {
    g.strokeStyle = 'rgba(61, 52, 50, 0.25)';
    g.strokeRect(i * fw + 0.5, j * fh + 0.5, fw - 1, fh - 1);
    const label = String(j * across + i);
    g.fillStyle = 'rgba(61, 52, 50, 0.75)';
    g.fillRect(i * fw + 1, j * fh + 1, g.measureText(label).width + 6, 14);
    g.fillStyle = '#FFFFFF';
    g.fillText(label, i * fw + 4, j * fh + 12);
  }
}

let catPreviewRunning = false;
function startCatPreviews() {
  if (catPreviewRunning) return;
  catPreviewRunning = true;
  const start = performance.now();
  const frame = (now) => {
    if (currentView() !== 'cat') {
      catPreviewRunning = false;
      return;
    }
    for (const c of document.querySelectorAll('[data-preview]')) {
      const key = c.dataset.preview;
      const meta = CAT_ANIMS.find((m) => m.key === key);
      let s = catDraft.anims[key];
      const mirror = key === 'walkLeft' && s.flip;
      if (mirror) s = catDraft.anims.walkRight;
      c.width = catDraft.fw * 2;
      c.height = catDraft.fh * 2;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      if (!catDraftSheet) continue;
      // Plays-once animations loop here with a pause, so you can watch them.
      const t = ((now - start) / 1000) * s.fps;
      const i = meta.once ? Math.min(Math.floor(t % (s.count + 4)), s.count - 1) : Math.floor(t) % Math.max(1, s.count);
      const across = Math.max(1, Math.floor(catDraftSheet.width / catDraft.fw));
      const n = s.start + i;
      g.save();
      if (mirror) {
        g.translate(c.width, 0);
        g.scale(-1, 1);
      }
      g.drawImage(catDraftSheet, (n % across) * catDraft.fw, Math.floor(n / across) * catDraft.fh, catDraft.fw, catDraft.fh, 0, 0, c.width, c.height);
      g.restore();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

$('cat-page').addEventListener('input', (event) => {
  const t = event.target;
  if (t.id === 'cat-name') catDraft.name = t.value;
  if (t.id === 'cat-fw' || t.id === 'cat-fh') {
    catDraft[t.id === 'cat-fw' ? 'fw' : 'fh'] = Math.max(4, Number(t.value) || 32);
    drawCatSheet();
  }
  const row = t.closest('[data-anim]');
  if (row && t.dataset.set) {
    const s = catDraft.anims[row.dataset.anim];
    s[t.dataset.set] = t.type === 'checkbox' ? t.checked : Math.max(t.dataset.set === 'start' ? 0 : 0.5, Number(t.value) || 0);
    if (t.dataset.set !== 'fps') s[t.dataset.set] = t.type === 'checkbox' ? t.checked : Math.round(s[t.dataset.set]);
  }
});

$('cat-page').addEventListener('change', async (event) => {
  if (event.target.id !== 'cat-file' || !event.target.files[0]) return;
  const file = event.target.files[0];
  event.target.value = '';
  try {
    catDraftSheet = pictureCanvas(await loadPicture(await readFileAsDataUrl(file)));
  } catch (error) {
    $('cat-status').textContent = error.message;
    return;
  }
  catDraft.src = '';
  drawCatSheet();
  $('cat-status').textContent = `${file.name}, ${catDraftSheet.width} × ${catDraftSheet.height} pixels: ${Math.floor(catDraftSheet.width / catDraft.fw)} frames across.`;
});

$('cat-page').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-cat]');
  if (!button) return;
  const action = button.dataset.cat;
  if (action === 'placeholder') {
    catDraftSheet = pictureCanvas(await loadPicture('room-art/cat.png'));
    catDraft.src = 'room-art/cat.png';
    catDraft.fw = 32;
    catDraft.fh = 32;
    catDraft.anims = defaultCat().anims;
    showCatPage();
  }
  if (action === 'save') {
    // A sheet from your phone is saved inside the app, so it's in your backup.
    const src = catDraft.src || (catDraftSheet ? catDraftSheet.toDataURL('image/png') : 'room-art/cat.png');
    await putItem({ ...catDraft, id: 'cat', kind: 'cat', day: '', src });
    catState.placed = false;
    goTo('home');
    showBackupInfo();
  }
});
