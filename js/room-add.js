// room-add.js: two pages for your own art.
//   #room-add  cuts pieces out of a picture (a whole sheet, or a single piece)
//              and adds them to the room's inventory.
//   #cat       sets up the cat from a sprite sheet.
// The pictures are saved on the phone as items (see room.js), never in the app's files.

// --- Cutting pieces ---

let cutFor = null; // a piece's id when adding a turned look to it
const cut = { sheet: null, box: null, corner: null, zoom: 2, snap: true, tilesTouched: false, typeTouched: false };

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
        <p class="muted">Tap one corner of a piece, then the opposite corner.</p>
        <div id="cut-scroll" class="cut-scroll"><canvas id="cut-canvas" class="pixel"></canvas></div>
        <div class="cut-tools">
          <button class="text-button" type="button" data-cut="trim">Trim empty edges</button>
        </div>
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
          <label class="check"><input type="checkbox" name="toy"><span>A toy the cat plays with</span></label>`}
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
    if (cut.sheet) $('cut-status').textContent = `${file.name}, ${cut.sheet.width} × ${cut.sheet.height} pixels.`;
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
  if (action === 'starter') await useCutPicture('room-art/starter.png', 'The starter sheet. Box a piece to try it.');
  if (!cut.sheet) return;
  if (action === 'in' || action === 'out') {
    cut.zoom = Math.max(1, Math.min(12, cut.zoom + (action === 'in' ? 1 : -1)));
    drawCutSheet();
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
  const view = { src: cutBox(cut.sheet, cut.box), pw, ph, w: Number(form.elements.w.value) || 1, d: Number(form.elements.d.value) || 1 };
  if (cutFor) {
    const piece = pieces.get(cutFor);
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
    light: form.elements.light.checked, catSpot: form.elements.catSpot.checked, catLift: 8, toy: form.elements.toy.checked, createdAt: Date.now(),
  });
  pieces.set(piece.id, piece);
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
  $('cut-status').textContent = `Added ${piece.name}. Box the next piece, or tap Done.`;
  $('cut-page').scrollIntoView();
  showBackupInfo();
});

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
