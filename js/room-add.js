// room-add.js: two pages for your own art.
//   #room-add  cuts pieces out of pictures (whole sheets, or single pieces):
//              open several, or a folder with the folders inside it, and
//              switch between them with their tags.
//              Then they're named and set up together on the Pieces page
//              (room-pieces.js).
//   #cat       sets up the cat from a sprite sheet.
// The pictures are saved on the phone as items (see room.js), never in the app's files.

// --- Cutting pieces ---

// Cutting for a piece you already have: { id, view, on }. view is the look to cut
// again, or null to add a new turned look. on: cutting a lamp's lit look.
let cutFor = null;

// The box a look was cut from, when cutting it again.
function oldCutBox() {
  if (!cutFor || cutFor.view === null) return null;
  const v = pieces.get(cutFor.id).views[cutFor.view];
  return cutFor.on ? v.on && v.on.box : v.box;
}

// Starts cutting for a piece. Cutting again opens its own sheet, if that's the
// picture already in the cutter, with the old box ready.
function cutForPiece(id, view, on = false) {
  cutFor = { id, view, on };
  const piece = pieces.get(id);
  cut.boxes = [];
  cut.corner = null;
  const old = oldCutBox();
  if (cut.sheet && old && piece.sheet && piece.sheet === sheetName()) cut.boxes = [[...old]];
  else if (view !== null) cut.note = piece.sheet ? `Choose ${piece.sheet}, the sheet it was cut from.` : 'Choose the picture it was cut from.';
  goTo('room-add');
}
// sheet: the picture, as a canvas. boxes: the pieces boxed on it so far, each
// [x, y, width, height]. corner: the first corner of a box being drawn.
// name: what the picture is called (its file name).
const cut = { sheet: null, boxes: [], corner: null, zoom: 2, snap: true, name: '', note: '', groups: [], picked: new Set(), set: '', undo: [], redo: [] };

// Undo and redo: copies of the boxes and groups, taken before each change.
function cutSnapshot() {
  return { boxes: cut.boxes.map((box) => [...box]), groups: cutGroups().map((group) => ({ kind: group.kind, at: group.boxes.map((box) => cut.boxes.indexOf(box)) })) };
}
function restoreCut(snap) {
  cut.boxes = snap.boxes.map((box) => [...box]);
  cut.groups = snap.groups.map((group) => ({ kind: group.kind, boxes: group.at.map((i) => cut.boxes[i]) }));
  cut.picked.clear();
  cut.corner = null;
}
function saveCutUndo() {
  cut.undo.push(cutSnapshot());
  if (cut.undo.length > 50) cut.undo.shift();
  cut.redo = [];
}

// Boxes can be grouped before adding: { kind: 'turns', boxes } become one piece
// with a look for each turn; { kind: 'colours', boxes } become pieces grouped
// as colours; { kind: 'lamp', boxes: [off, on] } become one lamp that can be
// switched on. The first box picked comes first.
function cutGroups() {
  cut.groups = cut.groups
    .map((group) => ({ ...group, boxes: group.boxes.filter((box) => cut.boxes.includes(box)) }))
    .filter((group) => group.boxes.length > 1);
  for (const box of cut.picked) if (!cut.boxes.includes(box)) cut.picked.delete(box);
  return cut.groups;
}
const groupOf = (box) => cutGroups().find((group) => group.boxes.includes(box));

// Picking a box from a group of the same kind adds the others to that group.
function groupPicked(kind) {
  const joining = kind === 'lamp' ? null : cutGroups().find((group) => group.kind === kind && group.boxes.some((box) => cut.picked.has(box)));
  addToGroup(kind, joining);
}
function addToGroup(kind, target) {
  const boxes = [...(target ? target.boxes : []), ...[...cut.picked].filter((box) => !target || !target.boxes.includes(box))];
  // Groups never share boxes, so the target is the one holding its first box.
  cut.groups = cutGroups().filter((group) => !target || !group.boxes.includes(target.boxes[0])).map((group) => ({ ...group, boxes: group.boxes.filter((box) => !cut.picked.has(box)) }));
  cut.groups.push({ kind, boxes });
  cut.picked.clear();
}

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
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">${again ? (cutFor.on ? 'Cut the on look' : 'Cut again') : forPiece ? 'Add a turned look' : 'Cut pieces'}</h1></div>
      <button class="ink-button" type="button" data-cut="done">Done</button>
    </header>
    <div class="side">
      ${forPiece ? '' : `<label class="field"><span>Set</span><input id="cut-set" type="text" value="${escapeHtml(cut.set)}" list="cut-set-names" autocomplete="off" placeholder="Not in a set"></label>
      <datalist id="cut-set-names">${setNames().map((name) => `<option value="${escapeHtml(name)}">`).join('')}</datalist>`}
      <div class="buttons">
        <label class="ink-button"><span>${cut.sheet ? 'More pictures' : 'Choose pictures'}</span><input id="cut-file" type="file" accept="image/*" multiple hidden></label>
        <label class="text-button"><span>Open a folder</span><input id="cut-folder" type="file" webkitdirectory multiple hidden></label>
      </div>
      ${sheetTagsHtml(cutSheets.map((sheet) => sheet.name), cutAt, 'data-cut-sheet', 'data-cut-unload', cutSheets.map((sheet) => sheet.path))}
      <p id="cut-status" class="status" role="status">${cut.note}</p>
      <div id="cut-work"${cut.sheet ? '' : ' hidden'}>
        <div class="cut-tools">
          <button class="text-button" type="button" data-cut="undo">Undo</button>
          <button class="text-button" type="button" data-cut="redo">Redo</button>
          ${forPiece ? '' : '<button class="text-button" type="button" data-cut="find">Find all</button>'}
          <span class="spacer"></span>
          <button class="text-button" type="button" data-cut="out" aria-label="Zoom out">−</button>
          <span id="cut-zoom" class="muted"></span>
          <button class="text-button" type="button" data-cut="in" aria-label="Zoom in">+</button>
          <label class="check"><input id="cut-snap" type="checkbox"${cut.snap ? ' checked' : ''}><span>Snap</span></label>
        </div>
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
  g.lineWidth = 2;
  for (const box of cut.boxes) {
    const [x, y, w, h] = box.map((n) => n * cut.zoom);
    const group = !cutFor && groupOf(box);
    g.strokeStyle = !group ? '#3E9B5A' : { turns: '#2F7FD0', colours: '#9A5FB0', lamp: '#D0962F' }[group.kind];
    g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    if (cut.picked.has(box)) {
      g.fillStyle = 'rgba(47, 127, 208, 0.25)';
      g.fillRect(x, y, w, h);
    }
  }
  if (cut.corner) {
    g.fillStyle = '#2F7FD0';
    g.fillRect(cut.corner[0] * cut.zoom - 3, cut.corner[1] * cut.zoom - 3, 6, 6);
  }
  $('cut-zoom').textContent = `${cut.zoom}×`;
  for (const [key, list] of [['undo', cut.undo], ['redo', cut.redo]]) {
    const button = document.querySelector(`[data-cut="${key}"]`);
    if (button) button.disabled = !list.length;
  }
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
  const old = $('cut-form');
  const locked = old ? old.elements.locked.checked : true;
  const groups = cutGroups();
  const grouped = new Set(groups.flatMap((group) => group.boxes));
  const count = n - groups.filter((group) => group.kind !== 'colours').reduce((sum, group) => sum + group.boxes.length - 1, 0);
  const tile = (box) => {
    const i = cut.boxes.indexOf(box);
    return `<button type="button" class="pile-tile" data-cut="pick" data-i="${i}" aria-pressed="${cut.picked.has(box)}" aria-label="Pick piece ${i + 1}">
      <img class="pixel" src="${cutBox(cut.sheet, box)}" alt="" style="--pw: ${box[2]}; --ph: ${box[3]}"></button>`;
  };
  const p = cut.picked.size;
  el.innerHTML = n ? `
    <div class="pile">${cut.boxes.filter((box) => !grouped.has(box)).map(tile).join('')}</div>
    ${groups.map((group, g) => `<div class="cut-group ${group.kind}">
      <div class="cut-group-head"><span>${{ turns: 'Turns', colours: 'Colours', lamp: 'Off and on' }[group.kind]}</span>
        <span class="spacer"></span>
        ${group.kind !== 'lamp' && [...cut.picked].some((box) => !group.boxes.includes(box)) ? `<button class="text-button" type="button" data-cut="join" data-g="${g}">Add picked</button>` : ''}
        <button class="text-button" type="button" data-cut="ungroup" data-g="${g}">Separate</button></div>
      <div class="pile">${group.boxes.map(tile).join('')}</div>
    </div>`).join('')}
    <div class="buttons cut-pick-actions"${p ? '' : ' hidden'}>
      <button class="text-button" type="button" data-cut="turns"${p > 1 ? '' : ' disabled'}>Turns</button>
      <button class="text-button" type="button" data-cut="colours"${p > 1 ? '' : ' disabled'}>Colours</button>
      <button class="text-button" type="button" data-cut="lamp"${p === 2 ? '' : ' disabled'}>Off and on</button>
      <button class="text-button danger" type="button" data-cut="unpick">Take out</button>
    </div>
    <form id="cut-form">
      <label class="check"><input type="checkbox" name="locked"${locked ? ' checked' : ''}><span>Comes from the gacha machine</span></label>
      <div class="buttons">
        <button class="ink-button" type="submit">Add ${count} ${count === 1 ? 'piece' : 'pieces'}</button>
        <button class="text-button" type="button" data-cut="clear">Clear</button>
      </div>
    </form>` : '';
}

// Every picture among files picked one by one, or a folder with the folders
// inside it, in path order: [{ name, path, file }].
function picturesIn(fileList) {
  return [...fileList].filter((file) => file.type.startsWith('image/'))
    .map((file) => ({ file, path: file.webkitRelativePath || file.name, name: file.name.replace(/\.[^.]*$/, '') }))
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}
// A row of tags for the sheets you have open, each with ✕ to close it. Used by
// every cutter: here, the Farm page and the Map page.
function sheetTagsHtml(names, at, pickAttr, unloadAttr, titles = names) {
  if (!names.length) return '';
  return `<div class="inv-tags sheet-tags">${names.map((name, i) => `<span class="sheet-tag"><button type="button" class="inv-tag" ${pickAttr}="${i}" aria-pressed="${i === at}" title="${escapeHtml(titles[i])}">${escapeHtml(name)}</button><button type="button" class="text-button danger" ${unloadAttr}="${i}" aria-label="Close ${escapeHtml(name)}" title="Close">✕</button></span>`).join('')}</div>`;
}

// The sheets open in the cutter: { name, path, file, src, state }. Switching
// sheets keeps each one's boxes (state); closing one forgets its boxes, but
// pieces already added stay.
const cutSheets = [];
let cutAt = -1;
function keepCutState() {
  const sheet = cutSheets[cutAt];
  if (sheet) sheet.state = { boxes: cut.boxes, groups: cut.groups, undo: cut.undo, redo: cut.redo };
}
async function openCutSheet(i) {
  keepCutState();
  const sheet = cutSheets[i];
  if (!sheet) return;
  cutAt = i;
  if (!sheet.src) sheet.src = await readFileAsDataUrl(sheet.file);
  await useCutPicture(sheet.src, sheet.name, sheet.state);
  showRoomAdd();
}
async function addCutSheets(fileList) {
  const found = picturesIn(fileList);
  if (!found.length) return;
  keepCutState();
  const first = cutSheets.length;
  cutSheets.push(...found);
  cutAt = -1;
  await openCutSheet(first);
}
async function closeCutSheet(i) {
  if (i === cutAt) keepCutState();
  cutSheets.splice(i, 1);
  if (i === cutAt) {
    cutAt = -1;
    if (cutSheets.length) return openCutSheet(Math.min(i, cutSheets.length - 1));
    Object.assign(cut, { sheet: null, boxes: [], groups: [], undo: [], redo: [], name: '', corner: null });
    cut.picked.clear();
  } else if (i < cutAt) cutAt--;
  showRoomAdd();
}

async function useCutPicture(src, name, state = null) {
  try {
    cut.sheet = pictureCanvas(await loadPicture(src));
  } catch (error) {
    $('cut-status').textContent = error.message;
    return;
  }
  cut.name = name;
  cut.boxes = state ? state.boxes : [];
  cut.groups = state ? state.groups : [];
  cut.picked.clear();
  cut.corner = null;
  cut.undo = state ? state.undo : [];
  cut.redo = state ? state.redo : [];
  // The set is named after the sheet, unless you've named it already.
  const setInput = $('cut-set');
  if (setInput && !setInput.value.trim()) setInput.value = cut.set = setNameFrom(sheetName());
  $('cut-work').hidden = false;
  fitCutZoom();
  // Cutting a piece again: its old box, if it fits this picture.
  const old = oldCutBox();
  if (state) {
    // Back to a sheet you'd boxed things on: as you left it.
  } else if (old && old[0] + old[2] <= cut.sheet.width && old[1] + old[3] <= cut.sheet.height) cut.boxes = [[...old]];
  // A single piece is boxed straight away.
  else if (cut.sheet.width <= 64 && cut.sheet.height <= 64) cut.boxes = [trimBox(cut.sheet, [0, 0, cut.sheet.width, cut.sheet.height])];
  drawCutSheet();
  showBoxed();
  $('cut-status').textContent = '';
  await recognisePieces();
}

$('cut-page').addEventListener('change', async (event) => {
  if ((event.target.id === 'cut-file' || event.target.id === 'cut-folder') && event.target.files.length) {
    const files = [...event.target.files];
    event.target.value = '';
    await addCutSheets(files);
  }
  if (event.target.id === 'cut-snap') cut.snap = event.target.checked;
  if (event.target.id === 'cut-set') cut.set = event.target.value.trim();
});

$('cut-page').addEventListener('click', async (event) => {
  const pick = event.target.closest('[data-cut-sheet]');
  if (pick) return openCutSheet(Number(pick.dataset.cutSheet));
  const unload = event.target.closest('[data-cut-unload]');
  if (unload) return closeCutSheet(Number(unload.dataset.cutUnload));
  const button = event.target.closest('[data-cut]');
  if (!button) return;
  const action = button.dataset.cut;
  if (action === 'done') {
    cutFor = null;
    goTo('home');
  }
  if (!cut.sheet) return;
  if ((action === 'undo' && cut.undo.length) || (action === 'redo' && cut.redo.length)) {
    const [from, to] = action === 'undo' ? [cut.undo, cut.redo] : [cut.redo, cut.undo];
    to.push(cutSnapshot());
    restoreCut(from.pop());
    drawCutSheet();
    showBoxed();
  }
  if (action === 'in' || action === 'out') {
    cut.zoom = Math.max(1, Math.min(12, cut.zoom + (action === 'in' ? 1 : -1)));
    drawCutSheet();
  }
  if (action === 'find') {
    const found = findPieces(cut.sheet).filter((box) => !cut.boxes.some((b) => b.join() === box.join()));
    if (found.length) saveCutUndo();
    cut.boxes.push(...found);
    drawCutSheet();
    showBoxed();
    const whole = found.length === 1 && found[0][2] === cut.sheet.width && found[0][3] === cut.sheet.height;
    $('cut-status').textContent = whole ? 'Found no gaps between pieces: box them by hand.' : found.length ? '' : 'No new pieces found.';
  }
  if (action === 'pick') {
    const box = cut.boxes[Number(button.dataset.i)];
    if (cut.picked.has(box)) cut.picked.delete(box);
    else cut.picked.add(box);
  }
  if (['turns', 'colours', 'lamp', 'join', 'ungroup', 'unpick', 'clear'].includes(action)) saveCutUndo();
  if (action === 'join') {
    const target = cutGroups()[Number(button.dataset.g)];
    addToGroup(target.kind, target);
  }
  if (['turns', 'colours', 'lamp'].includes(action)) groupPicked(action);
  if (action === 'ungroup') cut.groups.splice(Number(button.dataset.g), 1);
  if (action === 'unpick') {
    cut.boxes = cut.boxes.filter((box) => !cut.picked.has(box));
    cut.picked.clear();
  }
  if (action === 'clear') cut.boxes = [];
  if (['pick', 'turns', 'colours', 'lamp', 'join', 'ungroup', 'unpick', 'clear'].includes(action)) {
    drawCutSheet();
    showBoxed();
  }
  if (action === 'look') await (cutFor.view === null ? addTurnedLook() : useNewCut());
});

// Right-clicking a box, on the sheet or in the list, takes it out.
$('cut-page').addEventListener('contextmenu', (event) => {
  let i = -1;
  const tile = event.target.closest('[data-cut="pick"]');
  if (tile) i = Number(tile.dataset.i);
  else if (event.target.id === 'cut-canvas' && !cutFor) {
    const r = event.target.getBoundingClientRect();
    const px = ((event.clientX - r.left) / r.width) * cut.sheet.width;
    const py = ((event.clientY - r.top) / r.height) * cut.sheet.height;
    // The smallest box under the pointer, so a piece inside a bigger box can be taken out.
    let best = Infinity;
    cut.boxes.forEach(([x, y, w, h], j) => {
      if (px >= x && px < x + w && py >= y && py < y + h && w * h < best) [i, best] = [j, w * h];
    });
  }
  if (i < 0) return;
  event.preventDefault();
  saveCutUndo();
  const box = cut.boxes[i];
  cut.boxes.splice(i, 1);
  cut.picked.delete(box);
  drawCutSheet();
  showBoxed();
});

// Tapping on the sheet: two corners make a box. A tap inside a box picks it.
$('cut-page').addEventListener('pointerup', (event) => {
  if (event.target.id !== 'cut-canvas' || event.button !== 0) return;
  const r = event.target.getBoundingClientRect();
  const px = Math.floor(((event.clientX - r.left) / r.width) * cut.sheet.width);
  const py = Math.floor(((event.clientY - r.top) / r.height) * cut.sheet.height);
  const inside = !cut.corner && !cutFor && cut.boxes.findIndex(([x, y, w, h]) => px >= x && px < x + w && py >= y && py < y + h);
  if (inside !== false && inside >= 0) {
    const box = cut.boxes[inside];
    if (cut.picked.has(box)) cut.picked.delete(box);
    else cut.picked.add(box);
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
      saveCutUndo();
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
  const set = $('cut-set').value.trim();
  const base = set || 'Piece';
  const start = Date.now();
  const ids = [];
  const groups = cutGroups();
  const viewOf = (box, first) => {
    const [, , pw, ph] = box;
    const small = pw <= TILE && ph <= TILE;
    const w = small ? 1 : Math.max(1, Math.round(pw / TILE));
    // A turn stands on its tiles the other way round.
    return { src: cutBox(cut.sheet, box), pw, ph, w: first ? first.d : w, d: first ? first.w : 1, box: [...box] };
  };
  const add = async (boxes, extra) => {
    const [first, ...turns] = boxes;
    const view = viewOf(first);
    const small = first[2] <= TILE && first[3] <= TILE;
    const piece = await putItem({
      id: newId('piece'), kind: 'piece', day: '', name: `${base} ${ids.length + 1}`, type: small ? 'small' : 'furniture',
      views: [view, ...turns.map((box) => viewOf(box, view))],
      count: 1, surface: false, lift: 16, light: false, catSpot: false, catLift: 8, toy: false,
      set, sheet: sheetName(), locked: form.elements.locked.checked, createdAt: start + ids.length, ...extra,
    });
    pieces.set(piece.id, piece);
    ids.push(piece.id);
    return piece;
  };
  const done = new Set();
  for (const box of cut.boxes) {
    if (done.has(box)) continue;
    const group = groupOf(box);
    if (!group) {
      await add([box]);
    } else if (group.kind === 'turns') {
      await add(group.boxes);
    } else if (group.kind === 'lamp') {
      const [off, on] = group.boxes;
      const { src, pw, ph, box } = viewOf(on);
      await add([off], { light: true, views: [{ ...viewOf(off), on: { src, pw, ph, box } }] });
    } else {
      let root = null;
      for (const one of group.boxes) {
        const piece = await add([one], { family: root ? root.id : '' });
        root = root || piece;
      }
    }
    for (const one of group ? group.boxes : [box]) done.add(one);
  }
  cut.boxes = [];
  cut.groups = [];
  cut.picked.clear();
  cut.undo = [];
  cut.redo = [];
  showBackupInfo();
  showPiecesFor(ids);
});

// Cutting again: the look gets the new picture and box, and keeps its tiles.
async function useNewCut() {
  const piece = pieces.get(cutFor.id);
  const box = cut.boxes[0];
  const [, , pw, ph] = box;
  const look = { src: cutBox(cut.sheet, box), pw, ph, box: [...box] };
  const views = piece.views.map((v, i) => (i !== cutFor.view ? v : cutFor.on ? { ...v, on: look } : { ...v, ...look }));
  const saved = await putItem({ ...piece, views, sheet: piece.sheet || sheetName() });
  pieces.set(saved.id, saved);
  cutFor = null;
  cut.boxes = [];
  // Back to the Pieces page in the Workshop, where pieces are edited.
  goTo('pieces');
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

// --- The cat page, which sets up the duck too ---

let petKind = 'cat'; // which one the page sets up: 'cat' or 'duck'
let catDraft = null;
let catDraftSheet = null;
const petAnims = () => (petKind === 'duck' ? DUCK_ANIMS : CAT_ANIMS);

// The breeds to pick from: yours, and for the cat the placeholder cat too.
const PLACEHOLDER_BREED = 'placeholder';
function petBreeds() {
  const own = breeds.filter((b) => b.pet === petKind).sort((a, b) => a.name.localeCompare(b.name));
  if (petKind !== 'cat') return own;
  const d = defaultCat();
  return [{ id: PLACEHOLDER_BREED, pet: 'cat', name: 'Placeholder', src: d.src, fw: d.fw, fh: d.fh, anims: d.anims }, ...own];
}

async function showCatSetup() {
  await loadRoom();
  catDraft = JSON.parse(JSON.stringify(petKind === 'duck' ? duck || defaultDuck() : cat));
  // A sheet from before there were breeds becomes one.
  if (catDraft.src && !catDraft.breed) {
    const same = petBreeds().find((b) => b.src === catDraft.src);
    if (same) catDraft.breed = same.id;
    else {
      const breed = { id: newId('breed'), kind: 'breed', day: '', pet: petKind, name: petKind === 'duck' ? 'Duck' : 'Cat', src: catDraft.src, fw: catDraft.fw, fh: catDraft.fh, anims: catDraft.anims };
      breeds.push(await putItem(breed));
      catDraft.breed = breed.id;
    }
  }
  try {
    catDraftSheet = pictureCanvas(await loadPicture(catDraft.src));
  } catch {
    catDraftSheet = null;
  }
  showCatPage();
}

// Switching breed: its sheet, frame size and animations.
async function useBreed(breed) {
  try {
    catDraftSheet = pictureCanvas(await loadPicture(breed.src));
  } catch (error) {
    $('cat-status').textContent = error.message;
    return;
  }
  Object.assign(catDraft, { breed: breed.id, src: breed.src, fw: breed.fw, fh: breed.fh, anims: JSON.parse(JSON.stringify(breed.anims)) });
  showCatPage();
}

// Each breed's first frame, for its button.
async function drawBreedThumbs() {
  for (const c of document.querySelectorAll('[data-breed-thumb]')) {
    const breed = petBreeds().find((b) => b.id === c.dataset.breedThumb);
    const img = breed && (await loadPicture(breed.src).catch(() => null));
    if (!img) continue;
    c.width = breed.fw;
    c.height = breed.fh;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const first = breed.anims.walkDown ? breed.anims.walkDown.start : 0;
    const across = Math.max(1, Math.floor(img.naturalWidth / breed.fw));
    g.drawImage(img, (first % across) * breed.fw, Math.floor(first / across) * breed.fh, breed.fw, breed.fh, 0, 0, breed.fw, breed.fh);
  }
}

// Draws the cat page from the draft.
function showCatPage() {
  $('cat-page').innerHTML = `
    <header class="plain-head">
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">${petKind === 'duck' ? 'Duck' : 'Cat'}</h1></div>
      <button class="ink-button" type="button" data-cat="save">Save</button>
    </header>
    <div class="side cat-layout">
      <div class="cat-main">
      <label class="field"><span>Name</span><input id="cat-name" type="text" value="${escapeHtml(catDraft.name)}" autocomplete="off"></label>
      <h3 class="cat-h">Breeds</h3>
      <div class="breeds">${petBreeds().map((b) => `<button type="button" class="breed" data-breed="${b.id}"${catDraft.breed === b.id ? ' aria-current="true"' : ''}>
        <canvas class="pixel" data-breed-thumb="${b.id}" width="1" height="1"></canvas><span>${escapeHtml(b.name)}</span></button>`).join('')}</div>
      <div class="buttons">
        <label class="ink-button"><span>Add breeds</span><input id="cat-file" type="file" accept="image/*" multiple hidden></label>
        ${catDraft.breed && catDraft.breed !== PLACEHOLDER_BREED ? '<button class="text-button danger" type="button" data-cat="unbreed">Remove this breed</button>' : ''}
        ${petKind === 'duck' && duck ? '<button class="text-button danger" type="button" data-cat="remove">Remove the duck</button>' : ''}
      </div>
      <p id="cat-status" class="status" role="status"></p>
      <div class="cut-box">
        <label>Frame width <input id="cat-fw" type="number" min="4" max="256" value="${catDraft.fw}"></label>
        <label>Frame height <input id="cat-fh" type="number" min="4" max="256" value="${catDraft.fh}"></label>
      </div>
      <p class="muted">The numbers on the sheet are frame numbers. Each animation starts at one frame and plays the ones after it.</p>
      <div class="cut-scroll"><canvas id="cat-sheet" class="pixel"></canvas></div>
      </div>
      <div class="cat-side">
      <h3 class="cat-h">Animations</h3>
      <div id="cat-anims">${petAnims().map((a) => {
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
      </div>
    </div>`;
  drawCatSheet();
  startCatPreviews();
  drawBreedThumbs();
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
      const meta = petAnims().find((m) => m.key === key);
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
  if (event.target.id !== 'cat-file' || !event.target.files.length) return;
  const files = [...event.target.files];
  event.target.value = '';
  // Each sheet is a breed, named after its file, laid out like the one showing.
  let last = null;
  for (const file of files) {
    let sheet;
    try {
      sheet = pictureCanvas(await loadPicture(await readFileAsDataUrl(file)));
    } catch (error) {
      $('cat-status').textContent = error.message;
      continue;
    }
    last = await putItem({
      id: newId('breed'), kind: 'breed', day: '', pet: petKind, name: setNameFrom(file.name.replace(/\.[^.]*$/, '')) || 'Breed',
      src: sheet.toDataURL('image/png'), fw: catDraft.fw, fh: catDraft.fh, anims: JSON.parse(JSON.stringify(catDraft.anims)),
    });
    breeds.push(last);
  }
  if (last) await useBreed(last);
  showBackupInfo();
});

// The breed keeps the frame size and animations set up for it.
async function saveBreedSettings() {
  const i = breeds.findIndex((b) => b.id === catDraft.breed);
  if (i < 0) return;
  breeds[i] = await putItem({ ...breeds[i], fw: catDraft.fw, fh: catDraft.fh, anims: catDraft.anims });
}

$('cat-page').addEventListener('click', async (event) => {
  const breedButton = event.target.closest('[data-breed]');
  if (breedButton) {
    const breed = petBreeds().find((b) => b.id === breedButton.dataset.breed);
    if (breed) await useBreed(breed);
    return;
  }
  const button = event.target.closest('[data-cat]');
  if (!button) return;
  const action = button.dataset.cat;
  if (action === 'unbreed') {
    const gone = breeds.find((b) => b.id === catDraft.breed);
    if (!gone || !confirm(`Remove ${gone.name}?`)) return;
    await deleteItem(gone.id);
    breeds = breeds.filter((b) => b !== gone);
    const next = petBreeds()[0];
    if (next) await useBreed(next);
    else {
      Object.assign(catDraft, { breed: '', src: '' });
      catDraftSheet = null;
      showCatPage();
    }
    showBackupInfo();
  }
  if (action === 'remove') {
    if (!confirm('Remove the duck?')) return;
    await deleteItem('duck');
    goTo('home');
    showBackupInfo();
  }
  if (action === 'save') {
    // A sheet from your phone is saved inside the app, so it's in your backup.
    if (petKind === 'duck') {
      if (!catDraftSheet) {
        $('cat-status').textContent = 'Choose a sprite sheet first.';
        return;
      }
      await saveBreedSettings();
      await putItem({ ...catDraft, id: 'duck', kind: 'duck', day: '' });
      goTo('home');
      showBackupInfo();
      return;
    }
    await saveBreedSettings();
    await putItem({ ...catDraft, id: 'cat', kind: 'cat', day: '', src: catDraft.src || 'room-art/cat.png' });
    catState.placed = false;
    goTo('home');
    showBackupInfo();
  }
});
