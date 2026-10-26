// map-page.js: the Map page (Workshop → Map). Two tabs:
//   Tiles: add a tile set (a tile sheet), with a sheet for each season, and cut
//          tiles from it: drag across the sheet to pick one or more tiles, then
//          say what it is. Tap a tile you've cut to change it. An animated
//          tile has more frames to play in turn (water).
//   Map:   paint the garden with your tiles. Each tile goes on its own layer:
//          ground (ground, soil, water), on the ground (paths, edges,
//          decorations) or in front (anything marked to go in front of the pets).
//          The layer chips under the tiles say which layer it goes on (its
//          kind picks one to start with). ↻ turns the tile you paint with. A tile bigger than one tile goes
//          down with its bottom middle where you tap, and tiles stack on the
//          ground and in front, the last one on top. ✥ picks up the tile on top
//          and carries it to where you let go, like furniture. ✕ selects: tap
//          a tile or drag a box, and everything there (big tiles and
//          decorations too) comes up in a list by layer, with tags to show
//          just one layer or kind, to delete or move to another layer.
// What everything is, and how it's saved: see map.js.

const mapPage = {
  tab: 'map', // or 'tiles'
  set: '', // the tile set showing on the Tiles tab
  pick: null, // the box picked on the sheet: { x, y, w, h } in pixels
  tile: '', // the tile being changed
  addFrame: false, // the next tap on the sheet adds a frame to that tile
  brush: '', // the tile to paint with, 'erase' or 'move'
  turn: 0, // quarter turns of the tile you paint with
  layer: 'ground', // the layer the tile you paint with goes on
  sel: null, // the box selected with ✕: { x0, y0, x1, y1 } in tiles
  selFrom: null, // where the selecting drag started
  selLayer: '', // show only this layer in the list ('' all)
  selKind: '', // show only this kind in the list ('' all)
  hi: null, // the listed tile the pointer is over: { layer, at, k }
  kind: '', // only show tiles of this kind on the Map tab
  sheet: '', // only show tiles from this tile set
  form: null, // what's been changed in the tile form so far
  hover: null, // the tile the pointer is over on the map: [tx, ty]
  held: null, // a tile being moved: { layer, value }
};

async function showMapPage() {
  await loadRoom();
  if (!gardenMap) gardenMap = blankMap();
  else if (gardenMap.cols !== gardenCols() || gardenMap.rows !== gardenRows()) gardenMap = resizedMap(gardenMap);
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
const turnStyle = (turn) => (turn ? `; transform: rotate(${turn * 90}deg)` : '');

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
  const shown = all.filter((t) => (!mapPage.kind || t.type === mapPage.kind) && (!mapPage.sheet || t.set === mapPage.sheet));
  const kinds = TILE_TYPES.filter(([key]) => key === mapPage.kind || all.some((t) => t.type === key));
  const option = (value, label, on) => `<option value="${escapeHtml(value)}"${on ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  const tool = (key, mark, label) => `<button type="button" class="thing-tile${mapPage.brush === key ? ' on' : ''}" data-brush="${key}" aria-label="${label}" title="${label}"><span class="thing-x">${mark}</span></button>`;
  return `<div class="map-layout">
      <div class="map-tools">
        <div class="tile-filters">
          <select id="tile-kind" aria-label="Kind">${option('', 'All kinds', !mapPage.kind)}${kinds.map(([key, name]) => option(key, name, mapPage.kind === key)).join('')}</select>
          <select id="tile-sheet" aria-label="Tile set">${option('', 'All tile sets', !mapPage.sheet)}${[...tilesets.values()].map((set) => option(set.id, set.name, mapPage.sheet === set.id)).join('')}</select>
        </div>
        <div class="thing-grid tile-grid">
          ${tool('erase', '✕', 'Eraser')}${tool('move', '✥', 'Move')}
          <button type="button" class="thing-tile" data-map="turn" aria-label="Turn" title="Turn"${tiles.has(mapPage.brush) ? '' : ' disabled'}><span class="thing-x">↻</span></button>
          ${shown.map((t) => `<button type="button" class="thing-tile${mapPage.brush === t.id ? ' on' : ''}" data-brush="${t.id}" aria-label="${typeName(t.type)}" title="${typeName(t.type)}"><img class="pixel tile-img" src="${tileThumb(t)}" alt="" style="--tw: ${t.w}; --th: ${t.h}${mapPage.brush === t.id ? turnStyle(mapPage.turn) : ''}"></button>`).join('')}
        </div>
        ${tiles.has(mapPage.brush) ? `<div class="inv-tags">${MAP_LAYERS.map(([key, name]) => `<button type="button" class="inv-tag" data-paint-layer="${key}" aria-pressed="${mapPage.layer === key}">${name}</button>`).join('')}</div>` : ''}
        ${mapPage.brush === 'erase' && mapPage.sel ? selectionHtml() : ''}
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
  // Where the tile you're carrying, or painting with, would go.
  const going = goingTile();
  if (going && mapPage.hover) {
    const [x, y] = spotFor(going.tile, going.turn, ...mapPage.hover);
    const [cols, rows] = footprint(going.tile, going.turn);
    if (mapPage.held) {
      g.globalAlpha = 0.85;
      drawTile(g, going.tile, x * TILE, y * TILE, now, seasonNow(), going.turn);
      g.globalAlpha = 1;
    }
    g.strokeStyle = '#FFFFFF';
    g.lineWidth = 1;
    g.setLineDash([2, 2]);
    g.strokeRect(x * TILE + 0.5, y * TILE + 0.5, cols * TILE - 1, rows * TILE - 1);
    g.setLineDash([]);
  }
  // The box selected with ✕, and the listed tile the pointer is over.
  if (mapPage.brush === 'erase' && mapPage.sel) {
    const { x0, y0, x1, y1 } = mapPage.sel;
    g.strokeStyle = '#E0607A';
    g.lineWidth = 1;
    g.setLineDash([2, 2]);
    g.strokeRect(x0 * TILE + 0.5, y0 * TILE + 0.5, (x1 - x0 + 1) * TILE - 1, (y1 - y0 + 1) * TILE - 1);
    g.setLineDash([]);
  }
  const hi = mapPage.hi && cellStack(gardenMap[mapPage.hi.layer][mapPage.hi.at])[mapPage.hi.k];
  if (hi) {
    const [cols, rows] = footprint(hi.tile, hi.turn);
    g.fillStyle = 'rgba(224, 96, 122, 0.35)';
    g.fillRect((mapPage.hi.at % gardenMap.cols) * TILE, Math.floor(mapPage.hi.at / gardenMap.cols) * TILE, cols * TILE, rows * TILE);
  }
}

// --- Selecting with ✕ ---

// Every tile on the map that touches the selected box, on every layer.
function selectedTiles() {
  const { x0, y0, x1, y1 } = mapPage.sel;
  const found = [];
  for (const [layer] of MAP_LAYERS) {
    gardenMap[layer].forEach((value, at) => {
      const x = at % gardenMap.cols;
      const y = Math.floor(at / gardenMap.cols);
      cellStack(value).forEach(({ tile, turn }, k) => {
        const [cols, rows] = footprint(tile, turn);
        if (x <= x1 && x + cols - 1 >= x0 && y <= y1 && y + rows - 1 >= y0) found.push({ layer, at, k, tile, turn });
      });
    });
  }
  return found;
}
const shownSelected = () => selectedTiles().filter((one) => (!mapPage.selLayer || one.layer === mapPage.selLayer) && (!mapPage.selKind || one.tile.type === mapPage.selKind));

function selectionHtml() {
  const all = selectedTiles();
  const shown = shownSelected();
  const tag = (attr, value, label, on) => `<button type="button" class="inv-tag" ${attr}="${value}" aria-pressed="${on}">${label}</button>`;
  const layers = MAP_LAYERS.filter(([key]) => all.some((one) => one.layer === key));
  const kinds = TILE_TYPES.filter(([key]) => all.some((one) => one.tile.type === key));
  // Top layer first, the tile on top of a stack first.
  const order = ['front', 'detail', 'ground'];
  const groups = order.map((layer) => [layer, shown.filter((one) => one.layer === layer).reverse()]).filter(([, list]) => list.length);
  const row = (one) => `<div class="sel-row" data-sel-row="${one.layer}|${one.at}|${one.k}">
      <img class="pixel tile-img" src="${tileThumb(one.tile)}" alt="" style="--tw: ${one.tile.w}; --th: ${one.tile.h}${turnStyle(one.turn)}">
      <span class="sel-kind">${typeName(one.tile.type)}</span>
      <select data-sel-move="${one.layer}|${one.at}|${one.k}" aria-label="Layer">${MAP_LAYERS.map(([key, name]) => `<option value="${key}"${key === one.layer ? ' selected' : ''}>${name}</option>`).join('')}</select>
      <button type="button" class="text-button danger" data-sel-del="${one.layer}|${one.at}|${one.k}" aria-label="Delete" title="Delete">✕</button>
    </div>`;
  return `<div class="sel-box">
      <div class="inv-tags">${tag('data-sel-layer', '', 'All layers', !mapPage.selLayer)}${layers.map(([key, name]) => tag('data-sel-layer', key, name, mapPage.selLayer === key)).join('')}</div>
      <div class="inv-tags">${tag('data-sel-kind', '', 'All kinds', !mapPage.selKind)}${kinds.map(([key, name]) => tag('data-sel-kind', key, name, mapPage.selKind === key)).join('')}</div>
      ${groups.map(([layer, list]) => `<h3 class="market-h">${MAP_LAYERS.find(([key]) => key === layer)[1]}</h3>${list.map(row).join('')}`).join('')}
      ${shown.length > 1 ? '<p><button class="text-button danger" type="button" data-map="delsel">Delete all of these</button></p>' : ''}
    </div>`;
}

// One listed tile, from its "layer|at|k".
function selEntry(key) {
  const [layer, at, k] = key.split('|');
  const one = cellStack(gardenMap[layer][Number(at)])[Number(k)];
  return one && { layer, at: Number(at), k: Number(k), ...one };
}

// The tile being carried, or the one being painted with.
function goingTile() {
  if (mapPage.held) return cellTile(mapPage.held.value);
  const tile = tiles.get(mapPage.brush);
  return tile ? { tile, turn: mapPage.turn } : null;
}

// The top-left corner a tile goes at so its bottom middle is on tx, ty,
// kept inside the map.
function spotFor(tile, turn, tx, ty) {
  const [cols, rows] = footprint(tile, turn);
  const x = tx - Math.floor((cols - 1) / 2);
  const y = ty - rows + 1;
  return [Math.max(0, Math.min(x, gardenMap.cols - cols)), Math.max(0, Math.min(y, gardenMap.rows - rows))];
}
// Water keeps moving while the map is on screen.
setInterval(() => { if (currentView() === 'map' && mapPage.tab === 'map') drawMapCanvas(); }, 200);

let painting = false;
let mapSaveTimer = 0;
const saveSoon = () => {
  clearTimeout(mapSaveTimer);
  mapSaveTimer = setTimeout(saveMap, 400);
};

// The map tile under the pointer, kept inside the map.
function mapCell(event) {
  const r = $('map-canvas').getBoundingClientRect();
  const tx = Math.floor(((event.clientX - r.left) / r.width) * gardenMap.cols);
  const ty = Math.floor(((event.clientY - r.top) / r.height) * gardenMap.rows);
  return [Math.max(0, Math.min(tx, gardenMap.cols - 1)), Math.max(0, Math.min(ty, gardenMap.rows - 1))];
}

function paintAt(event, first) {
  const [tx, ty] = mapCell(event);
  const tile = tiles.get(mapPage.brush);
  if (!tile) return;
  const [cols, rows] = footprint(tile, mapPage.turn);
  // A big tile goes down once per tap, not along the drag.
  if (!first && (cols > 1 || rows > 1)) return;
  const [x, y] = spotFor(tile, mapPage.turn, tx, ty);
  putTile(mapPage.layer, cellOf(x, y), tile.id, mapPage.turn);
  drawMapCanvas();
  saveSoon();
}

// Selecting: a drag with ✕ draws the box.
function selectTo(event) {
  const [tx, ty] = mapCell(event);
  const [fx, fy] = mapPage.selFrom;
  mapPage.sel = { x0: Math.min(fx, tx), y0: Math.min(fy, ty), x1: Math.max(fx, tx), y1: Math.max(fy, ty) };
  drawMapCanvas();
}

// Moving: picks up the tile on top here (in front first, then on the ground).
function pickUpAt(event) {
  const [tx, ty] = mapCell(event);
  for (const layer of ['front', 'detail']) {
    const found = coveringAt(layer, tx, ty);
    if (!found.length) continue;
    const top = found[found.length - 1];
    mapPage.held = { layer, value: cellValue(top.tile.id, top.turn) };
    takeOff(layer, [top]);
    return true;
  }
  return false;
}
function putDown() {
  const { layer, value } = mapPage.held;
  const { tile, turn } = cellTile(value);
  const [x, y] = spotFor(tile, turn, ...mapPage.hover);
  putTile(layer, cellOf(x, y), tile.id, turn);
  mapPage.held = null;
  drawMapCanvas();
  saveSoon();
}

$('map-page').addEventListener('pointerdown', (event) => {
  if (event.target.id === 'map-canvas') {
    if (!mapPage.brush) return;
    mapPage.hover = mapCell(event);
    if (mapPage.brush === 'move') {
      if (!pickUpAt(event)) return;
      event.target.setPointerCapture(event.pointerId);
      return drawMapCanvas();
    }
    if (mapPage.brush === 'erase') {
      mapPage.selFrom = mapCell(event);
      mapPage.hi = null;
      event.target.setPointerCapture(event.pointerId);
      return selectTo(event);
    }
    painting = true;
    event.target.setPointerCapture(event.pointerId);
    paintAt(event, true);
  }
  if (event.target.id === 'sheet-canvas') sheetDown(event);
});
$('map-page').addEventListener('pointermove', (event) => {
  if (event.target.id === 'map-canvas') {
    const [tx, ty] = mapCell(event);
    const moved = !mapPage.hover || mapPage.hover[0] !== tx || mapPage.hover[1] !== ty;
    mapPage.hover = [tx, ty];
    if (mapPage.selFrom && moved) selectTo(event);
    else if (painting && moved) paintAt(event, false);
    else if (moved) drawMapCanvas();
  }
  if (sheetDrag && event.target.id === 'sheet-canvas') sheetMove(event);
});
$('map-page').addEventListener('pointerup', (event) => {
  painting = false;
  if (mapPage.held) putDown();
  if (mapPage.selFrom) {
    mapPage.selFrom = null;
    drawMapPage();
  }
  if (sheetDrag && event.target.id === 'sheet-canvas') sheetUp(event);
});
// Pointing at a listed tile shows where it is on the map.
$('map-page').addEventListener('mouseover', (event) => {
  const row = event.target.closest('[data-sel-row]');
  const key = row ? row.dataset.selRow : null;
  const now = mapPage.hi ? `${mapPage.hi.layer}|${mapPage.hi.at}|${mapPage.hi.k}` : null;
  if (key === now) return;
  mapPage.hi = key ? selEntry(key) : null;
  drawMapCanvas();
});
$('map-page').addEventListener('pointerleave', (event) => {
  if (event.target.id !== 'map-canvas' || mapPage.held) return;
  mapPage.hover = null;
  if ($('map-canvas')) drawMapCanvas();
}, true);

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

// The tile being changed, or the new one picked on the sheet.
const formTile = () => tiles.get(mapPage.tile) || (mapPage.pick && { id: 'pick', set: mapPage.set, frames: [], fps: 4, ...mapPage.pick });

function tileFormHtml() {
  const tile = tiles.get(mapPage.tile);
  const shape = formTile();
  if (!shape) return '';
  const it = { type: 'ground', front: false, walk: true, ...shape, anim: (shape.frames || []).length > 0, ...mapPage.form };
  const types = TILE_TYPES.map(([key, name]) => `<option value="${key}"${it.type === key ? ' selected' : ''}>${name}</option>`).join('');
  const frames = [[shape.x, shape.y], ...(shape.frames || [])];
  return `<div class="tile-form">
      <h3>${tile ? 'Tile' : 'New tile'}</h3>
      <label class="field"><span>Kind</span><select id="tile-type">${types}</select></label>
      <label class="check"><input type="checkbox" id="tile-front"${it.front ? ' checked' : ''}><span>In front of the pets</span></label>
      <label class="check"><input type="checkbox" id="tile-walk"${it.walk !== false ? ' checked' : ''}><span>The pets can walk on it</span></label>
      <label class="check"><input type="checkbox" id="tile-anim"${it.anim ? ' checked' : ''}><span>Animated</span></label>
      ${it.anim ? `<div class="field"><span>Frames</span><div class="stage-row">
          ${frames.map(([x, y], i) => `<span class="frame-pic"><img class="pixel tile-img" src="${frameThumb(shape, x, y)}" alt="" style="--tw: ${shape.w}; --th: ${shape.h}">${i ? `<button type="button" class="text-button danger" data-unframe="${i - 1}" aria-label="Remove">✕</button>` : ''}</span>`).join('')}
          <button type="button" class="thing-tile pick-slot${mapPage.addFrame ? ' on' : ''}" data-map="frame" aria-label="Add a frame" title="Add a frame"><span class="thing-x">+</span></button>
        </div></div>
        <div class="cut-box"><label>Speed <input type="number" id="tile-fps" min="0.5" max="24" step="0.5" value="${it.fps || 4}"></label></div>` : ''}
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
  const shape = tiles.get(mapPage.tile) || mapPage.pick;
  if (tap && mapPage.addFrame && shape) {
    shape.frames = [...(shape.frames || []), [x * TILE, y * TILE]];
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
  mapPage.form = null;
  drawMapPage();
}

function tileFields() {
  const fields = { type: $('tile-type').value, front: $('tile-front').checked, walk: $('tile-walk').checked, anim: $('tile-anim').checked };
  if ($('tile-fps')) fields.fps = Math.max(0.5, Number($('tile-fps').value) || 4);
  return fields;
}
// The tile's fields to save: a tile that isn't animated has no frames.
function savedFields(shape) {
  const { anim, ...fields } = tileFields();
  return { ...fields, frames: anim ? shape.frames || [] : [] };
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
  if (t.closest('.tile-form')) {
    mapPage.form = tileFields();
    if (t.id === 'tile-anim') drawMapPage();
  }
  if (t.dataset.selMove) {
    const one = selEntry(t.dataset.selMove);
    if (!one || t.value === one.layer) return;
    takeOff(one.layer, [one]);
    putTile(t.value, one.at, one.id, one.turn);
    mapPage.hi = null;
    saveSoon();
    return drawMapPage();
  }
  if (t.id === 'tile-kind' || t.id === 'tile-sheet') {
    mapPage[t.id === 'tile-kind' ? 'kind' : 'sheet'] = t.value;
    drawMapPage();
  }
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
    if (brush.dataset.brush !== mapPage.brush) mapPage.turn = 0;
    mapPage.hi = null;
    mapPage.brush = brush.dataset.brush;
    if (tiles.has(mapPage.brush)) mapPage.layer = layerFor(tiles.get(mapPage.brush));
    return drawMapPage();
  }
  const paintLayer = event.target.closest('[data-paint-layer]');
  if (paintLayer) {
    mapPage.layer = paintLayer.dataset.paintLayer;
    return drawMapPage();
  }
  const selTag = event.target.closest('[data-sel-layer], [data-sel-kind]');
  if (selTag) {
    if ('selLayer' in selTag.dataset) mapPage.selLayer = selTag.dataset.selLayer;
    else mapPage.selKind = selTag.dataset.selKind;
    return drawMapPage();
  }
  const selDel = event.target.closest('[data-sel-del]');
  if (selDel) {
    const one = selEntry(selDel.dataset.selDel);
    if (one) takeOff(one.layer, [one]);
    mapPage.hi = null;
    saveSoon();
    return drawMapPage();
  }
  const set = event.target.closest('[data-tileset]');
  if (set) {
    Object.assign(mapPage, { set: set.dataset.tileset, tile: '', pick: null, addFrame: false, form: null });
    return drawMapPage();
  }
  const unframe = event.target.closest('[data-unframe]');
  if (unframe) {
    const shape = tiles.get(mapPage.tile) || mapPage.pick;
    shape.frames = shape.frames.filter((_, i) => i !== Number(unframe.dataset.unframe));
    return drawMapPage();
  }
  const button = event.target.closest('[data-map]');
  if (!button) return;
  const action = button.dataset.map;
  if (action === 'done') goTo('home');
  if (action === 'delsel') {
    const shown = shownSelected();
    for (const [layer] of MAP_LAYERS) takeOff(layer, shown.filter((one) => one.layer === layer));
    mapPage.hi = null;
    saveSoon();
    drawMapPage();
  }
  if (action === 'turn') {
    mapPage.turn = (mapPage.turn + 1) % 4;
    drawMapPage();
  }
  if (action === 'clear' && confirm('Clear the whole map?')) {
    gardenMap = blankMap();
    await saveMap();
    drawMapPage();
  }
  if (action === 'addtile') {
    const saved = await putItem({ id: newId('tile'), kind: 'tile', day: '', set: mapPage.set, ...mapPage.pick, fps: 4, ...savedFields(mapPage.pick), createdAt: Date.now() });
    tiles.set(saved.id, saved);
    Object.assign(mapPage, { pick: null, tile: '', brush: saved.id, turn: 0, layer: layerFor(saved), form: null });
    drawMapPage();
    mapStatus('Added.');
  }
  if (action === 'savetile') {
    const tile = tiles.get(mapPage.tile);
    const saved = await putItem({ ...tile, ...savedFields(tile) });
    tiles.set(saved.id, saved);
    mapPage.tile = '';
    mapPage.form = null;
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
    Object.assign(mapPage, { pick: null, tile: '', addFrame: false, form: null });
    drawMapPage();
  }
  if (action === 'deltile') {
    const id = mapPage.tile;
    const used = MAP_LAYERS.some(([layer]) => gardenMap[layer].some((v) => cellStack(v).some((one) => one.id === id)));
    if (!confirm(used ? 'Delete this tile? It comes off the map too.' : 'Delete this tile?')) return;
    await removeTiles([id]);
    mapPage.tile = '';
    mapPage.form = null;
    drawMapPage();
  }
  if (action === 'unset') {
    const set = tilesets.get(mapPage.set);
    const ids = setTiles(set.id).map((t) => t.id);
    if (!confirm(ids.length ? `Delete ${set.name} and its ${ids.length} tiles? They come off the map too.` : `Delete ${set.name}?`)) return;
    await removeTiles(ids);
    await deleteItem(set.id);
    tilesets.delete(set.id);
    if (mapPage.sheet === set.id) mapPage.sheet = '';
    mapPage.set = [...tilesets.keys()][0] || '';
    drawMapPage();
  }
});

async function removeTiles(ids) {
  for (const id of ids) {
    await deleteItem(id);
    tiles.delete(id);
  }
  for (const [layer] of MAP_LAYERS) gardenMap[layer] = gardenMap[layer].map((v) => stackValue(cellStack(v).filter((one) => !ids.includes(one.id))));
  await saveMap();
  if (ids.includes(mapPage.brush)) mapPage.brush = '';
}
