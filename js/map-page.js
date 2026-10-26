// map-page.js: the Map page (Workshop → Map). Two tabs:
//   Tiles: add a tile set (a tile sheet), with a sheet for each season, and cut
//          tiles from it: drag across the sheet to pick one or more tiles, then
//          say what it is. Tap a tile you've cut to change it, or to give it
//          more frames to play in turn (water).
//   Map:   paint the garden with your tiles. Each tile goes on its own layer:
//          ground (ground, soil, water), on the ground (paths, edges,
//          decorations) or in front (anything marked to go in front of the pets).
// What everything is, and how it's saved: see map.js.

const mapPage = {
  tab: 'map', // or 'tiles'
  set: '', // the tile set showing on the Tiles tab
  pick: null, // the box picked on the sheet: { x, y, w, h } in pixels
  tile: '', // the tile being changed
  addFrame: false, // the next tap on the sheet adds a frame to that tile
  brush: '', // the tile to paint with, or 'erase'
  layer: 'ground', // the layer the eraser takes tiles off
};

async function showMapPage() {
  await loadRoom();
  if (!gardenMap) gardenMap = blankMap();
  else if (gardenMap.cols !== room.cols || gardenMap.rows !== rows()) gardenMap = resizedMap(gardenMap);
  if (!tilesets.has(mapPage.set)) mapPage.set = [...tilesets.keys()][0] || '';
  await sheetsReady();
  drawMapPage();
}

// The room changed size: keep what's painted where it still fits.
function resizedMap(old) {
  const map = blankMap();
  for (const [layer] of MAP_LAYERS) {
    old[layer].forEach((id, i) => {
      const x = i % old.cols;
      const y = Math.floor(i / old.cols);
      if (x < map.cols && y < map.rows) map[layer][y * map.cols + x] = id;
    });
  }
  return map;
}

const setTiles = (setId) => [...tiles.values()].filter((t) => t.set === setId).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
const typeName = (key) => (TILE_TYPES.find(([k]) => k === key) || TILE_TYPES[0])[1];

function drawMapPage() {
  // Drawing again keeps the sheet scrolled where it was.
  const wrap = document.querySelector('.sheet-wrap');
  const scrolled = wrap ? [wrap.scrollLeft, wrap.scrollTop] : null;
  const chip = (attr, value, label, on) => `<button type="button" class="inv-tag" ${attr}="${escapeHtml(value)}" aria-pressed="${on}">${label}</button>`;
  $('map-page').innerHTML = `
    <header class="plain-head">
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">Map</h1></div>
      <button class="ink-button" type="button" data-map="done">Done</button>
    </header>
    <div class="side">
      <div class="inv-tags farm-tabs">${chip('data-map-tab', 'map', 'Map', mapPage.tab === 'map')}${chip('data-map-tab', 'tiles', 'Tiles', mapPage.tab === 'tiles')}</div>
      <div class="inv-tags season-tags">${chip('data-season', '', 'Calendar', !previewSeason)}${SEASONS.map(([key, name]) => chip('data-season', key, name, previewSeason === key)).join('')}</div>
      ${mapPage.tab === 'map' ? mapTabHtml() : tilesTabHtml()}
      <p id="map-status" class="status" role="status"></p>
    </div>`;
  if (mapPage.tab === 'map') drawMapCanvas();
  else drawSheetCanvas();
  const again = document.querySelector('.sheet-wrap');
  if (again && scrolled) [again.scrollLeft, again.scrollTop] = scrolled;
}

function mapStatus(text) {
  const status = $('map-status');
  if (status) status.textContent = text;
}

// --- The Map tab ---

function mapTabHtml() {
  const all = [...tiles.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (!all.length) return '<p><button class="ink-button" type="button" data-map-tab="tiles">Add tiles</button></p>';
  return `<div class="map-layout">
      <div class="map-tools">
        <div class="thing-grid tile-grid">
          <button type="button" class="thing-tile${mapPage.brush === 'erase' ? ' on' : ''}" data-brush="erase" aria-label="Eraser" title="Eraser"><span class="thing-x">✕</span></button>
          ${all.map((t) => `<button type="button" class="thing-tile${mapPage.brush === t.id ? ' on' : ''}" data-brush="${t.id}" aria-label="${typeName(t.type)}" title="${typeName(t.type)}"><img class="pixel tile-img" src="${tileThumb(t)}" alt="" style="--tw: ${t.w}; --th: ${t.h}"></button>`).join('')}
        </div>
        ${mapPage.brush === 'erase' ? `<div class="inv-tags">${MAP_LAYERS.map(([key, name]) => `<button type="button" class="inv-tag" data-erase-layer="${key}" aria-pressed="${mapPage.layer === key}">${name}</button>`).join('')}</div>` : ''}
        <p><button class="text-button danger" type="button" data-map="clear">Clear the map</button></p>
      </div>
      <div class="map-wrap"><canvas id="map-canvas" class="pixel"></canvas></div>
    </div>`;
}

function drawMapCanvas() {
  const c = $('map-canvas');
  if (!c || !gardenMap) return;
  c.width = gardenMap.cols * TILE;
  c.height = gardenMap.rows * TILE;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#9DBF7E';
  g.fillRect(0, 0, c.width, c.height);
  const now = performance.now();
  for (const [layer] of MAP_LAYERS) drawMapLayer(g, layer, now);
  g.fillStyle = 'rgba(255, 255, 255, 0.18)';
  for (let x = TILE; x < c.width; x += TILE) g.fillRect(x, 0, 1, c.height);
  for (let y = TILE; y < c.height; y += TILE) g.fillRect(0, y, c.width, 1);
}
// Water keeps moving while the map is on screen.
setInterval(() => { if (currentView() === 'map' && mapPage.tab === 'map') drawMapCanvas(); }, 200);

let painting = false;
let mapSaveTimer = 0;
function paintAt(event) {
  const c = $('map-canvas');
  const r = c.getBoundingClientRect();
  const tx = Math.floor(((event.clientX - r.left) / r.width) * gardenMap.cols);
  const ty = Math.floor(((event.clientY - r.top) / r.height) * gardenMap.rows);
  const i = cellOf(tx, ty);
  if (i < 0) return;
  if (mapPage.brush === 'erase') {
    // Takes off the tile here on that layer, a big one too.
    const layer = gardenMap[mapPage.layer];
    layer.forEach((id, j) => {
      const tile = tiles.get(id);
      if (!tile) return;
      const x = j % gardenMap.cols;
      const y = Math.floor(j / gardenMap.cols);
      if (tx >= x && tx < x + tile.w / TILE && ty >= y && ty < y + tile.h / TILE) layer[j] = '';
    });
  } else {
    const tile = tiles.get(mapPage.brush);
    if (!tile) return;
    gardenMap[layerFor(tile)][i] = tile.id;
  }
  drawMapCanvas();
  clearTimeout(mapSaveTimer);
  mapSaveTimer = setTimeout(saveMap, 400);
}

$('map-page').addEventListener('pointerdown', (event) => {
  if (event.target.id === 'map-canvas') {
    if (!mapPage.brush) return mapStatus('Pick a tile to paint with.');
    painting = true;
    event.target.setPointerCapture(event.pointerId);
    paintAt(event);
  }
  if (event.target.id === 'sheet-canvas') sheetDown(event);
});
$('map-page').addEventListener('pointermove', (event) => {
  if (painting && event.target.id === 'map-canvas') paintAt(event);
  if (sheetDrag && event.target.id === 'sheet-canvas') sheetMove(event);
});
$('map-page').addEventListener('pointerup', (event) => {
  painting = false;
  if (sheetDrag && event.target.id === 'sheet-canvas') sheetUp(event);
});

// --- The Tiles tab ---

function tilesTabHtml() {
  const set = tilesets.get(mapPage.set);
  const sets = [...tilesets.values()];
  return `<div class="inv-tags">
      ${sets.map((s) => `<button type="button" class="inv-tag" data-tileset="${s.id}" aria-pressed="${s.id === mapPage.set}">${escapeHtml(s.name)}</button>`).join('')}
      <label class="inv-tag add-tag"><span>New tile set</span><input id="tileset-file" type="file" accept="image/*" hidden></label>
    </div>
    ${set ? `<div class="map-layout tiles-layout">
      <div class="map-wrap sheet-wrap cut-scroll"><canvas id="sheet-canvas" class="pixel"></canvas></div>
      <div class="map-tools">
        <label class="field"><span>Name</span><input id="tileset-name" type="text" value="${escapeHtml(set.name)}" autocomplete="off"></label>
        <div class="field"><span>Sheets</span><div class="season-sheets">${SEASONS.map(([key, name]) => `<label class="season-sheet${set.sheets[key] ? ' has' : ''}">
          ${set.sheets[key] ? `<img class="pixel" src="${set.sheets[key]}" alt="">` : '<span class="thing-x">+</span>'}<span>${name}</span>
          <input type="file" accept="image/*" data-season-sheet="${key}" hidden></label>`).join('')}</div></div>
        ${tileFormHtml()}
        <p><button class="text-button danger" type="button" data-map="unset">Delete this tile set</button></p>
      </div>
    </div>` : ''}`;
}

function tileFormHtml() {
  const tile = tiles.get(mapPage.tile);
  const it = tile || (mapPage.pick && { type: 'ground', front: false, walk: true, ...mapPage.pick });
  if (!it) return '';
  const types = TILE_TYPES.map(([key, name]) => `<option value="${key}"${it.type === key ? ' selected' : ''}>${name}</option>`).join('');
  const frames = tile ? [[tile.x, tile.y], ...(tile.frames || [])] : [];
  return `<div class="tile-form">
      <h3>${tile ? 'Tile' : 'New tile'}</h3>
      <label class="field"><span>Kind</span><select id="tile-type">${types}</select></label>
      <label class="check"><input type="checkbox" id="tile-front"${it.front ? ' checked' : ''}><span>In front of the pets</span></label>
      <label class="check"><input type="checkbox" id="tile-walk"${it.walk !== false ? ' checked' : ''}><span>The pets can walk on it</span></label>
      ${tile ? `<div class="field"><span>Frames</span><div class="stage-row">
          ${frames.map(([x, y], i) => `<span class="frame-pic"><img class="pixel tile-img" src="${frameThumb(tile, x, y)}" alt="" style="--tw: ${tile.w}; --th: ${tile.h}">${i ? `<button type="button" class="text-button danger" data-unframe="${i - 1}" aria-label="Remove">✕</button>` : ''}</span>`).join('')}
          <button type="button" class="thing-tile pick-slot${mapPage.addFrame ? ' on' : ''}" data-map="frame" aria-label="Add a frame" title="Add a frame"><span class="thing-x">+</span></button>
        </div></div>
        ${frames.length > 1 ? `<div class="cut-box"><label>Speed <input type="number" id="tile-fps" min="0.5" max="24" step="0.5" value="${tile.fps || 4}"></label></div>` : ''}` : ''}
      <div class="buttons">
        <button class="ink-button" type="button" data-map="${tile ? 'savetile' : 'addtile'}">${tile ? 'Save' : 'Add'}</button>
        <button class="text-button" type="button" data-map="untile-pick">Cancel</button>
        ${tile ? '<button class="text-button danger" type="button" data-map="deltile">Delete</button>' : ''}
      </div>
    </div>`;
}

function frameThumb(tile, x, y) {
  return tileThumb({ ...tile, id: `${tile.id}@${x},${y}`, x, y });
}

const SHEET_SCALE = 2;
function drawSheetCanvas() {
  const c = $('sheet-canvas');
  const set = tilesets.get(mapPage.set);
  const img = set && picture(sheetFor(set));
  if (!c) return;
  if (!img) {
    // Not loaded yet: try again in a moment.
    setTimeout(() => { if (currentView() === 'map' && mapPage.tab === 'tiles') drawSheetCanvas(); }, 150);
    return;
  }
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.style.width = `${img.naturalWidth * SHEET_SCALE}px`;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0);
  g.fillStyle = 'rgba(47, 127, 208, 0.22)';
  for (let x = TILE; x < c.width; x += TILE) g.fillRect(x, 0, 1, c.height);
  for (let y = TILE; y < c.height; y += TILE) g.fillRect(0, y, c.width, 1);
  const box = (b, colour) => {
    g.strokeStyle = colour;
    g.lineWidth = 1;
    g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  };
  for (const t of setTiles(set.id)) {
    box(t, t.id === mapPage.tile ? '#E0607A' : 'rgba(255, 255, 255, 0.8)');
    for (const [x, y] of t.frames || []) box({ x, y, w: t.w, h: t.h }, t.id === mapPage.tile ? '#E0607A' : 'rgba(255, 255, 255, 0.45)');
  }
  if (mapPage.pick) box(mapPage.pick, '#2F7FD0');
}

// Dragging across the sheet picks a box of whole tiles.
let sheetDrag = null;
function sheetCell(event) {
  const c = $('sheet-canvas');
  const r = c.getBoundingClientRect();
  return [Math.floor(((event.clientX - r.left) / r.width) * c.width / TILE), Math.floor(((event.clientY - r.top) / r.height) * c.height / TILE)];
}
function sheetDown(event) {
  sheetDrag = { from: sheetCell(event), to: sheetCell(event) };
  event.target.setPointerCapture(event.pointerId);
}
function sheetMove(event) {
  sheetDrag.to = sheetCell(event);
  const [x0, y0] = sheetDrag.from;
  const [x1, y1] = sheetDrag.to;
  if (x0 === x1 && y0 === y1) return;
  mapPage.pick = { x: Math.min(x0, x1) * TILE, y: Math.min(y0, y1) * TILE, w: (Math.abs(x1 - x0) + 1) * TILE, h: (Math.abs(y1 - y0) + 1) * TILE };
  drawSheetCanvas();
}
function sheetUp(event) {
  const { from, to } = sheetDrag;
  sheetDrag = null;
  const [x, y] = to;
  const tap = from[0] === x && from[1] === y;
  const tile = tiles.get(mapPage.tile);
  if (tap && mapPage.addFrame && tile) {
    tile.frames = [...(tile.frames || []), [x * TILE, y * TILE]];
    mapPage.addFrame = false;
    return drawMapPage();
  }
  if (tap) {
    // A tap on a tile you've cut opens it; anywhere else picks that one tile.
    const hit = setTiles(mapPage.set).find((t) => x * TILE >= t.x && x * TILE < t.x + t.w && y * TILE >= t.y && y * TILE < t.y + t.h);
    mapPage.tile = hit ? hit.id : '';
    mapPage.pick = hit ? null : { x: x * TILE, y: y * TILE, w: TILE, h: TILE };
  } else mapPage.tile = '';
  mapPage.addFrame = false;
  drawMapPage();
}

function tileFields() {
  const fields = { type: $('tile-type').value, front: $('tile-front').checked, walk: $('tile-walk').checked };
  if ($('tile-fps')) fields.fps = Math.max(0.5, Number($('tile-fps').value) || 4);
  return fields;
}

async function addTileset(file, season = 'summer', set = null) {
  let src;
  try {
    src = await readFileAsDataUrl(file);
    await loadPicture(src);
  } catch (error) {
    mapStatus(error.message);
    return;
  }
  const saved = await putItem(set
    ? { ...set, sheets: { ...set.sheets, [season]: src } }
    : { id: newId('tileset'), kind: 'tileset', day: '', name: file.name.replace(/\.[^.]*$/, ''), sheets: { summer: src }, createdAt: Date.now() });
  tilesets.set(saved.id, saved);
  mapPage.set = saved.id;
  await sheetsReady();
  drawMapPage();
}

$('map-page').addEventListener('change', async (event) => {
  const t = event.target;
  if (t.id === 'tileset-file' && t.files[0]) {
    mapPage.tile = '';
    mapPage.pick = null;
    await addTileset(t.files[0]);
  }
  if (t.dataset.seasonSheet && t.files[0]) await addTileset(t.files[0], t.dataset.seasonSheet, tilesets.get(mapPage.set));
  if (t.id === 'tileset-name' && t.value.trim()) {
    const saved = await putItem({ ...tilesets.get(mapPage.set), name: t.value.trim() });
    tilesets.set(saved.id, saved);
    drawMapPage();
  }
  // A new tile's kind suggests whether the pets can walk on it.
  if (t.id === 'tile-type' && !mapPage.tile) $('tile-walk').checked = TILE_TYPES.find(([k]) => k === t.value)[2];
});

$('map-page').addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-map-tab]');
  if (tab) {
    mapPage.tab = tab.dataset.mapTab;
    return drawMapPage();
  }
  const season = event.target.closest('[data-season]');
  if (season) {
    previewSeason = season.dataset.season || null;
    await sheetsReady();
    return drawMapPage();
  }
  const brush = event.target.closest('[data-brush]');
  if (brush) {
    mapPage.brush = brush.dataset.brush;
    if (mapPage.brush !== 'erase') mapPage.layer = layerFor(tiles.get(mapPage.brush));
    return drawMapPage();
  }
  const eraseLayer = event.target.closest('[data-erase-layer]');
  if (eraseLayer) {
    mapPage.layer = eraseLayer.dataset.eraseLayer;
    return drawMapPage();
  }
  const set = event.target.closest('[data-tileset]');
  if (set) {
    Object.assign(mapPage, { set: set.dataset.tileset, tile: '', pick: null, addFrame: false });
    return drawMapPage();
  }
  const unframe = event.target.closest('[data-unframe]');
  if (unframe) {
    const tile = tiles.get(mapPage.tile);
    tile.frames = tile.frames.filter((_, i) => i !== Number(unframe.dataset.unframe));
    return drawMapPage();
  }
  const button = event.target.closest('[data-map]');
  if (!button) return;
  const action = button.dataset.map;
  if (action === 'done') goTo('home');
  if (action === 'clear' && confirm('Clear the whole map?')) {
    gardenMap = blankMap();
    await saveMap();
    drawMapPage();
  }
  if (action === 'addtile') {
    const saved = await putItem({ id: newId('tile'), kind: 'tile', day: '', set: mapPage.set, ...mapPage.pick, frames: [], fps: 4, ...tileFields(), createdAt: Date.now() });
    tiles.set(saved.id, saved);
    Object.assign(mapPage, { pick: null, tile: '', brush: saved.id, layer: layerFor(saved) });
    drawMapPage();
    mapStatus('Added.');
  }
  if (action === 'savetile') {
    const tile = tiles.get(mapPage.tile);
    const saved = await putItem({ ...tile, ...tileFields() });
    tiles.set(saved.id, saved);
    mapPage.tile = '';
    drawMapPage();
  }
  if (action === 'frame') {
    mapPage.addFrame = !mapPage.addFrame;
    drawMapPage();
    if (mapPage.addFrame) mapStatus('Tap the next frame on the sheet.');
  }
  if (action === 'untile-pick') {
    // Frames added but not saved go back to how they were.
    if (mapPage.tile) tiles.set(mapPage.tile, (await getAllItems()).find((i) => i.id === mapPage.tile) || tiles.get(mapPage.tile));
    Object.assign(mapPage, { pick: null, tile: '', addFrame: false });
    drawMapPage();
  }
  if (action === 'deltile') {
    const id = mapPage.tile;
    const used = MAP_LAYERS.some(([layer]) => gardenMap[layer].includes(id));
    if (!confirm(used ? 'Delete this tile? It comes off the map too.' : 'Delete this tile?')) return;
    await removeTiles([id]);
    mapPage.tile = '';
    drawMapPage();
  }
  if (action === 'unset') {
    const set = tilesets.get(mapPage.set);
    const ids = setTiles(set.id).map((t) => t.id);
    if (!confirm(ids.length ? `Delete ${set.name} and its ${ids.length} tiles? They come off the map too.` : `Delete ${set.name}?`)) return;
    await removeTiles(ids);
    await deleteItem(set.id);
    tilesets.delete(set.id);
    mapPage.set = [...tilesets.keys()][0] || '';
    drawMapPage();
  }
});

async function removeTiles(ids) {
  for (const id of ids) {
    await deleteItem(id);
    tiles.delete(id);
  }
  for (const [layer] of MAP_LAYERS) gardenMap[layer] = gardenMap[layer].map((id) => (ids.includes(id) ? '' : id));
  await saveMap();
  if (ids.includes(mapPage.brush)) mapPage.brush = '';
}
