// room-add.js: two pages for your own art.
//   #room-add  cuts pieces out of a picture (a whole sheet, or a single piece)
//              and adds them to the room's inventory.
//   #cat       sets up the cat from a sprite sheet.
// The pictures are saved on the phone as items (see room.js), never in the app's files.

// --- Cutting pieces ---

let cutFor = null; // a piece's id when adding a turned look to it
// pile: boxes kept to add all at once, each { box, src, on }. name: what the picture
// is called, for naming pieces added from the pile.
const cut = { sheet: null, box: null, corner: null, zoom: 2, snap: true, tilesTouched: false, typeTouched: false, pile: [], name: '' };

function showRoomAdd() {
  const forPiece = cutFor && pieces.get(cutFor);
  $('cut-page').innerHTML = `
    <header class="plain-head">
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">${forPiece ? 'Add a turned look' : 'Add pieces'}</h1></div>
      <button class="ink-button" type="button" data-cut="done">Done</button>
    </header>
    <div class="side">
      <p class="muted">${forPiece ? `Box the picture of ${escapeHtml(forPiece.name)} turned another way.` : 'Choose a picture: a single piece, or a whole sheet of them. Then box each piece you want and add it.'}
        Pictures need a see-through background, like a PNG.</p>
      <div class="buttons">
        <label class="ink-button"><span>Choose a picture</span><input id="cut-file" type="file" accept="image/*" hidden></label>
        <button class="text-button" type="button" data-cut="draw">Draw one</button>
        <button class="text-button" type="button" data-cut="starter">Use the starter sheet</button>
      </div>
      <p id="cut-status" class="status" role="status">${cut.note || ''}</p>
      <div id="cut-work"${cut.sheet ? '' : ' hidden'}>
        <div class="cut-tools">
          <button class="text-button" type="button" data-cut="out" aria-label="Zoom out">−</button>
          <span id="cut-zoom" class="muted"></span>
          <button class="text-button" type="button" data-cut="in" aria-label="Zoom in">+</button>
          <label class="check"><input id="cut-snap" type="checkbox"${cut.snap ? ' checked' : ''}><span>Snap to tiles</span></label>
        </div>
        <p class="muted">Tap one corner of a piece, then the opposite corner.${forPiece ? '' : ' Or find every piece on the sheet at once.'}</p>
        <div id="cut-scroll" class="cut-scroll"><canvas id="cut-canvas" class="pixel"></canvas></div>
        <div class="cut-tools">
          <button class="text-button" type="button" data-cut="trim">Trim empty edges</button>
          ${forPiece ? '' : `<button class="text-button" type="button" data-cut="keep">Keep this box</button>
          <button class="text-button" type="button" data-cut="find">Find all pieces</button>`}
        </div>
        <div id="cut-pile" hidden></div>
        <div id="cut-colours" hidden></div>
        <div class="cut-box">
          <label>Left <input type="number" min="0" data-box="0"></label>
          <label>Top <input type="number" min="0" data-box="1"></label>
          <label>Width <input type="number" min="1" data-box="2"></label>
          <label>Height <input type="number" min="1" data-box="3"></label>
        </div>
        <div class="cut-preview"><canvas id="cut-preview" class="pixel"></canvas></div>
        <form id="cut-form">
          ${forPiece ? '' : `<label class="field"><span>Name</span><input name="name" type="text" autocomplete="off" required></label>
          ${pieceTypeChoices('furniture')}`}
          <div class="cut-box">
            <label>Tiles wide <input name="w" type="number" min="1" max="12" value="1"></label>
            <label>Tiles deep <input name="d" type="number" min="1" max="12" value="1"></label>
          </div>
          <p class="muted">The tiles are what it stands on. A bookshelf can be 2 wide and 1 deep even if its picture is 3 tiles tall.</p>
          ${forPiece ? '' : `<label class="field"><span>How many you have</span><input name="count" type="number" min="1" max="99" value="1"></label>
          <label class="check"><input type="checkbox" name="surface"><span>Things can go on top (like a table)</span></label>
          <label class="check"><input type="checkbox" name="light"><span>Gives light at night</span></label>
          <label class="check"><input type="checkbox" name="catSpot"><span>The cat can sit and sleep on it</span></label>
          <label class="check"><input type="checkbox" name="toy"><span>A toy the cat plays with</span></label>
          <label class="check"><input type="checkbox" name="locked" checked><span>Put it in the gacha machine, to unlock</span></label>`}
          <p><button class="ink-button" type="submit">${forPiece ? 'Add this look' : 'Add to inventory'}</button></p>
        </form>
      </div>
    </div>`;
  cut.note = '';
  if (cut.sheet) {
    fitCutZoom();
    drawCutSheet();
    showCutBox();
  }
  showPile();
  showColourOffer();
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
  if (cut.box) {
    const [x, y, w, h] = cut.box.map((n) => n * cut.zoom);
    g.fillStyle = 'rgba(90, 160, 220, 0.18)';
    g.fillRect(x, y, w, h);
    g.strokeStyle = '#2F7FD0';
    g.lineWidth = 2;
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
  // Kept boxes: green while they're in, faint once you've left them out.
  for (const kept of cut.pile) {
    const [x, y, w, h] = kept.box.map((n) => n * cut.zoom);
    g.strokeStyle = kept.on ? '#3E9B5A' : 'rgba(61, 52, 50, 0.3)';
    g.lineWidth = kept.on ? 2 : 1;
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }
  if (cut.corner) {
    g.fillStyle = '#2F7FD0';
    g.fillRect(cut.corner[0] * cut.zoom - 3, cut.corner[1] * cut.zoom - 3, 6, 6);
  }
  $('cut-zoom').textContent = `${cut.zoom}×`;
}

function showCutBox() {
  for (const input of document.querySelectorAll('[data-box]')) input.value = cut.box ? cut.box[Number(input.dataset.box)] : '';
  const p = $('cut-preview');
  if (!cut.box) {
    p.width = p.height = 0;
    return;
  }
  const [, , w, h] = cut.box;
  const z = Math.max(1, Math.min(6, Math.floor(160 / Math.max(w, h))));
  p.width = w * z;
  p.height = h * z;
  const g = p.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(cut.sheet, ...cut.box, 0, 0, p.width, p.height);
  guessTiles();
}

// A first guess at the tiles, from the picture's size. You can change it.
function guessTiles() {
  const form = $('cut-form');
  if (!form || !cut.box || cut.tilesTouched) return;
  const type = form.elements.type ? form.elements.type.value : pieces.get(cutFor).type;
  const [, , w, h] = cut.box;
  const across = Math.max(1, Math.round(w / TILE));
  const tall = Math.max(1, Math.round(h / TILE));
  form.elements.w.value = type === 'small' ? 1 : across;
  form.elements.d.value = type === 'small' || type === 'furniture' ? 1 : tall;
}

async function useCutPicture(src, status) {
  try {
    cut.sheet = pictureCanvas(await loadPicture(src));
  } catch (error) {
    $('cut-status').textContent = error.message;
    return;
  }
  cut.box = null;
  cut.corner = null;
  cut.pile = [];
  showPile();
  $('cut-work').hidden = false;
  fitCutZoom();
  // A single piece is boxed straight away.
  if (cut.sheet.width <= 64 && cut.sheet.height <= 64) cut.box = [0, 0, cut.sheet.width, cut.sheet.height];
  drawCutSheet();
  showCutBox();
  $('cut-status').textContent = status;
}

$('cut-page').addEventListener('change', async (event) => {
  if (event.target.id === 'cut-file' && event.target.files[0]) {
    const file = event.target.files[0];
    event.target.value = '';
    await useCutPicture(await readFileAsDataUrl(file), '');
    cut.name = file.name.replace(/\.[^.]*$/, '');
    if (cut.sheet) $('cut-status').textContent = `${file.name}, ${cut.sheet.width} × ${cut.sheet.height} pixels.`;
    await recognisePieces();
  }
  if (event.target.id === 'cut-colour-files' && event.target.files.length) {
    const files = [...event.target.files];
    event.target.value = '';
    await addColourSheets(files);
  }
  if (event.target.id === 'cut-snap') cut.snap = event.target.checked;
  if (event.target.name === 'type') { cut.tilesTouched = false; guessTiles(); }
  if (event.target.name === 'w' || event.target.name === 'd') cut.tilesTouched = true;
  if (event.target.dataset.box !== undefined && cut.box) {
    const box = [...document.querySelectorAll('[data-box]')].map((input) => Math.max(0, Math.round(Number(input.value)) || 0));
    box[2] = Math.max(1, Math.min(box[2], cut.sheet.width - box[0]));
    box[3] = Math.max(1, Math.min(box[3], cut.sheet.height - box[1]));
    cut.box = box;
    cut.tilesTouched = false;
    drawCutSheet();
    showCutBox();
  }
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
  if (action === 'starter') {
    await useCutPicture('room-art/starter.png', 'The starter sheet. Box a piece to try it.');
    cut.name = 'Starter';
    await recognisePieces();
  }
  if (action === 'pile') {
    const kept = cut.pile[Number(button.dataset.i)];
    kept.on = !kept.on;
    drawCutSheet();
    showPile();
  }
  if (action === 'clearpile') {
    cut.pile = [];
    drawCutSheet();
    showPile();
  }
  if (action === 'addall') await addPile();
  if (!cut.sheet) return;
  if (action === 'in' || action === 'out') {
    cut.zoom = Math.max(1, Math.min(12, cut.zoom + (action === 'in' ? 1 : -1)));
    drawCutSheet();
  }
  if (action === 'keep' && cut.box) {
    keepBox(cut.box);
    cut.box = null;
    cut.corner = null;
    drawCutSheet();
    showCutBox();
    showPile();
  }
  if (action === 'find') {
    const found = findPieces(cut.sheet).filter((box) => !cut.pile.some((kept) => kept.box.join() === box.join()));
    for (const box of found) keepBox(box);
    drawCutSheet();
    showPile();
    if (cut.pile.length === 1 && cut.pile[0].box[2] === cut.sheet.width && cut.pile[0].box[3] === cut.sheet.height) {
      $('cut-status').textContent = 'The whole picture came out as one piece. Finding pieces needs a see-through background between them.';
    } else {
      $('cut-status').textContent = found.length ? `Found ${found.length}. Tap any you don't want, on the sheet or below.` : 'No new pieces found.';
    }
  }
  if (action === 'trim' && cut.box) {
    cut.box = trimBox(cut.sheet, cut.box);
    cut.tilesTouched = false;
    drawCutSheet();
    showCutBox();
  }
});

// Tapping corners on the sheet.
$('cut-page').addEventListener('pointerup', (event) => {
  if (event.target.id !== 'cut-canvas') return;
  const r = event.target.getBoundingClientRect();
  const px = Math.floor(((event.clientX - r.left) / r.width) * cut.sheet.width);
  const py = Math.floor(((event.clientY - r.top) / r.height) * cut.sheet.height);
  const unit = cut.snap ? TILE : 1;
  const sx = Math.floor(px / unit) * unit;
  const sy = Math.floor(py / unit) * unit;
  // A tap inside a kept box leaves it out, or puts it back in.
  const kept = !cut.corner && cut.pile.find((k) => px >= k.box[0] && px < k.box[0] + k.box[2] && py >= k.box[1] && py < k.box[1] + k.box[3]);
  if (kept) {
    kept.on = !kept.on;
    drawCutSheet();
    showPile();
    return;
  }
  if (!cut.corner) {
    cut.corner = [sx, sy];
    cut.box = [sx, sy, Math.min(unit, cut.sheet.width - sx), Math.min(unit, cut.sheet.height - sy)];
  } else {
    const x0 = Math.min(cut.corner[0], sx);
    const y0 = Math.min(cut.corner[1], sy);
    const x1 = Math.min(cut.sheet.width, Math.max(cut.corner[0], sx) + unit);
    const y1 = Math.min(cut.sheet.height, Math.max(cut.corner[1], sy) + unit);
    cut.box = [x0, y0, x1 - x0, y1 - y0];
    cut.corner = null;
  }
  cut.tilesTouched = false;
  drawCutSheet();
  showCutBox();
});

$('cut-page').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!cut.box) {
    $('cut-status').textContent = 'Box a piece first: tap one corner, then the opposite corner.';
    return;
  }
  const form = event.target;
  const [, , pw, ph] = cut.box;
  const view = { src: cutBox(cut.sheet, cut.box), pw, ph, w: Number(form.elements.w.value) || 1, d: Number(form.elements.d.value) || 1, box: [...cut.box] };
  if (cutFor) {
    const piece = pieces.get(cutFor);
    // A turned look only keeps its box if it came from the same sheet.
    if (!sheetName() || piece.sheet !== sheetName()) delete view.box;
    const saved = await putItem({ ...piece, views: [...piece.views, view] });
    pieces.set(saved.id, saved);
    cutFor = null;
    $('cut-status').textContent = `Added. ${saved.name} now has ${saved.views.length} looks: tap Turn while placing it.`;
    return;
  }
  const type = form.elements.type.value;
  const piece = await putItem({
    id: newId('piece'), kind: 'piece', day: '', name: form.elements.name.value.trim(), type, views: [view],
    count: Math.max(1, Number(form.elements.count.value) || 1), surface: form.elements.surface.checked, lift: 16,
    light: form.elements.light.checked, catSpot: form.elements.catSpot.checked, catLift: 8, toy: form.elements.toy.checked, locked: form.elements.locked.checked, createdAt: Date.now(),
    sheet: sheetName(),
  });
  pieces.set(piece.id, piece);
  showColourOffer();
  form.elements.name.value = '';
  form.elements.count.value = 1;
  form.elements.surface.checked = false;
  form.elements.light.checked = false;
  form.elements.catSpot.checked = false;
  form.elements.toy.checked = false;
  cut.box = null;
  cut.tilesTouched = false;
  drawCutSheet();
  showCutBox();
  $('cut-status').textContent = piece.locked ? `${piece.name} went into the gacha machine. Box the next piece, or tap Done.` : `Added ${piece.name}. Box the next piece, or tap Done.`;
  $('cut-page').scrollIntoView();
  showBackupInfo();
});

// --- Many pieces at once: keep boxes in a pile, then add them all and set each
// one up afterwards.

function keepBox(box) {
  cut.pile.push({ box, src: cutBox(cut.sheet, box), on: true });
}

function showPile() {
  const el = $('cut-pile');
  if (!el) return;
  el.hidden = !cut.pile.length;
  const on = cut.pile.filter((k) => k.on).length;
  el.innerHTML = cut.pile.length ? `
    <h3 class="cat-h">Kept: ${on} of ${cut.pile.length}</h3>
    <div class="pile">${cut.pile.map((k, i) => `<button type="button" class="pile-tile" data-cut="pile" data-i="${i}" aria-pressed="${k.on}" aria-label="Piece ${i + 1}">
      <img class="pixel" src="${k.src}" alt="" style="--pw: ${k.box[2]}; --ph: ${k.box[3]}"></button>`).join('')}</div>
    <div class="buttons">
      <button class="ink-button" type="button" data-cut="addall"${on ? '' : ' disabled'}>Add ${on} to inventory</button>
      <button class="text-button" type="button" data-cut="clearpile">Clear</button>
    </div>
    <p class="muted">They're added with a first guess at their tiles. You name and set up each one straight after.</p>` : '';
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

async function addPile() {
  const base = cut.name || 'Piece';
  const ids = [];
  let n = 0;
  for (const kept of cut.pile.filter((k) => k.on)) {
    const [, , pw, ph] = kept.box;
    const small = pw <= TILE && ph <= TILE;
    const view = { src: kept.src, pw, ph, w: small ? 1 : Math.max(1, Math.round(pw / TILE)), d: 1, box: [...kept.box] };
    const piece = await putItem({
      id: newId('piece'), kind: 'piece', day: '', name: `${base} ${++n}`, type: small ? 'small' : 'furniture', views: [view],
      count: 1, surface: false, lift: 16, light: false, catSpot: false, catLift: 8, toy: false, locked: true, createdAt: Date.now() + n,
      sheet: sheetName(),
    });
    pieces.set(piece.id, piece);
    ids.push(piece.id);
  }
  cut.pile = [];
  drawCutSheet();
  showPile();
  showColourOffer();
  showBackupInfo();
  $('cut-status').textContent = `Added ${ids.length}. You can change them any time in Edit pieces.`;
  setupQueue = ids;
  if (ids.length) openPieceDetails(pieces.get(ids[0]));
}

// --- Other colours of a sheet ---
// A piece remembers the sheet it was cut from (sheet) and where (each look's box).
// Another sheet with the same layout in other colours can then be cut in one go:
// every piece again, in each colour, with the same settings, grouped as colours.

// The name pieces from this picture remember, or '' for a drawing.
const sheetName = () => (cut.name && cut.name !== 'Drawing' ? cut.name : '');
const piecesFromSheet = (name) => [...pieces.values()].filter((p) => name && p.sheet === name && p.views.some((v) => v.box));

// Pieces cut before pieces remembered their sheet: if a piece's picture is one of
// the pieces on this sheet, it's from here.
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
  showColourOffer();
}

function showColourOffer() {
  const el = $('cut-colours');
  if (!el || cutFor) return;
  const from = piecesFromSheet(sheetName());
  el.hidden = !from.length;
  el.innerHTML = from.length ? `
    <h3 class="cat-h">Other colours of this sheet</h3>
    <p class="muted">${from.length} ${from.length === 1 ? 'piece has' : 'pieces have'} been cut from ${escapeHtml(sheetName())}. Choose the same sheet in other colours, one or several at once, and every piece is cut from each of them with the same settings, grouped as colours.</p>
    <label class="ink-button"><span>Choose the other colours</span><input id="cut-colour-files" type="file" accept="image/*" multiple hidden></label>` : '';
}

// The part of a file name that says its colour: the words not in the first
// sheet's name. "cottage-blue.png" next to "cottage-red" is "blue".
function colourWord(fileName, sheet) {
  const words = (name) => name.toLowerCase().split(/[\s_.-]+/).filter(Boolean);
  const base = new Set(words(sheet));
  const own = words(fileName.replace(/\.[^.]*$/, '')).filter((w) => !base.has(w));
  return own.join(' ') || fileName.replace(/\.[^.]*$/, '');
}

async function addColourSheets(files) {
  const name = sheetName();
  const from = piecesFromSheet(name).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  let added = 0;
  let skipped = 0;
  for (const file of files) {
    let sheet;
    try {
      sheet = pictureCanvas(await loadPicture(await readFileAsDataUrl(file)));
    } catch {
      skipped++;
      continue;
    }
    const colour = colourWord(file.name, name);
    for (const piece of from) {
      const fits = (box) => box && box[0] + box[2] <= sheet.width && box[1] + box[3] <= sheet.height;
      const views = piece.views.filter((v) => fits(v.box)).map((v) => ({ ...v, src: cutBox(sheet, v.box) }));
      if (!views.length) { skipped++; continue; }
      const copy = { ...piece };
      delete copy.unlockedAt;
      const saved = await putItem({
        ...copy, id: newId('piece'), name: `${piece.name} (${colour})`, views, family: familyOf(piece),
        sheet: file.name.replace(/\.[^.]*$/, ''), locked: true, createdAt: Date.now() + added,
      });
      pieces.set(saved.id, saved);
      added++;
    }
  }
  showBackupInfo();
  $('cut-status').textContent = `Added ${added} ${added === 1 ? 'piece' : 'pieces'} in ${files.length} ${files.length === 1 ? 'colour' : 'colours'}. They went into the gacha machine.${skipped ? ` ${skipped} couldn't be cut: the sheet was a different size.` : ''}`;
  $('cut-page').scrollIntoView();
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
