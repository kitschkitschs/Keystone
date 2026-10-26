// map-page.js: the Map page (Workshop → Map). Two tabs:
//   Tiles: open pictures (or a whole folder) and cut tiles from them: drag
//          across a sheet to pick one or more tiles, then say what it is. The
//          first tile cut makes the picture a tile set, which can have a sheet
//          for each season. ✕ closes a sheet: a tile set with tiles is only
//          put away (its tiles stay), and "Open again" brings it back. Tap a tile you've cut to change it. An animated
//          tile has more frames to play in turn (water).
//   Map:   paint the room or the garden with your tiles (each has its own
//          map, and its size is set here too). Each tile goes on its own layer:
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
//          − and + zoom in and out (or Ctrl and the scroll wheel), and the
//          hand drags the map around, as does the middle mouse button.
// What everything is, and how it's saved: see map.js.

const mapPage = {
  tab: 'map', // or 'tiles'
  which: 'garden', // the map being painted: 'room' or 'garden'
  zoom: 1, // 1 fits the whole map in
  sizing: false, // the size fields are open
  set: '', // the tile set showing on the Tiles tab
  loose: [], // pictures opened but not cut from yet: { name, file, src }
  looseAt: -1, // the one showing instead of a tile set
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
  for (const which of ['room', 'garden']) {
    if (!maps[which]) maps[which] = blankMap(which);
    else await fitMap(which);
  }
  if (!tilesets.has(mapPage.set) || tilesets.get(mapPage.set).hidden) mapPage.set = openSets()[0]?.id || '';
  await sheetsReady();
  drawMapPage();
}

// The map being painted.
const theMap = () => maps[mapPage.which];

const setTiles = (setId) => [...tiles.values()].filter((t) => t.set === setId).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
const typeName = (key) => (TILE_TYPES.find(([k]) => k === key) || TILE_TYPES[0])[1];
const turnStyle = (turn) => (turn ? `; transform: rotate(${turn * 90}deg)` : '');

function drawMapPage() {
  // Drawing again keeps the sheet scrolled where it was.
  const wrapOf = () => document.querySelector(mapPage.tab === 'map' ? '.map-view' : '.sheet-wrap');
  const wrap = wrapOf();
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
  if (mapPage.tab === 'map') {
    sizeMapCanvas();
    drawMapCanvas();
  } else drawSheetCanvas();
  const again = wrapOf();
  if (again && scrolled) [again.scrollLeft, again.scrollTop] = scrolled;
}

function mapStatus(text) {
  const status = $('map-status');
  if (status) status.textContent = text;
}

// --- The Map tab ---

function mapTabHtml() {
  const all = [...tiles.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const which = (key, name) => `<button type="button" class="inv-tag" data-map-which="${key}" aria-pressed="${mapPage.which === key}">${name}</button>`;
  const head = `<div class="inv-tags">${which('room', 'Room')}${which('garden', 'Garden')}
      <button type="button" class="inv-tag" data-map="sizing" aria-pressed="${mapPage.sizing}">Size</button></div>
    ${mapPage.sizing ? sizeHtml() : ''}`;
  if (!all.length) return `${head}<p><button class="ink-button" type="button" data-map-tab="tiles">Add tiles</button></p>`;
  const shown = all.filter((t) => (!mapPage.kind || t.type === mapPage.kind) && (!mapPage.sheet || t.set === mapPage.sheet));
  const kinds = TILE_TYPES.filter(([key]) => key === mapPage.kind || all.some((t) => t.type === key));
  const option = (value, label, on) => `<option value="${escapeHtml(value)}"${on ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  const tool = (key, mark, label) => `<button type="button" class="thing-tile${mapPage.brush === key ? ' on' : ''}" data-brush="${key}" aria-label="${label}" title="${label}"><span class="thing-x">${mark}</span></button>`;
  return `${head}<div class="map-layout">
      <div class="map-tools">
        <div class="tile-filters">
          <select id="tile-kind" aria-label="Kind">${option('', 'All kinds', !mapPage.kind)}${kinds.map(([key, name]) => option(key, name, mapPage.kind === key)).join('')}</select>
          <select id="tile-sheet" aria-label="Tile set">${option('', 'All tile sets', !mapPage.sheet)}${[...tilesets.values()].map((set) => option(set.id, set.name, mapPage.sheet === set.id)).join('')}</select>
        </div>
        <div class="thing-grid tile-grid">
          ${tool('erase', '✕', 'Select')}${tool('move', '✥', 'Move')}${tool('pan', '✋&#xFE0E;', 'Look around')}
          <button type="button" class="thing-tile" data-map="turn" aria-label="Turn" title="Turn"${tiles.has(mapPage.brush) ? '' : ' disabled'}><span class="thing-x">↻</span></button>
          ${shown.map((t) => `<button type="button" class="thing-tile${mapPage.brush === t.id ? ' on' : ''}" data-brush="${t.id}" aria-label="${typeName(t.type)}" title="${typeName(t.type)}"><img class="pixel tile-img" src="${tileThumb(t)}" alt="" style="--tw: ${t.w}; --th: ${t.h}${mapPage.brush === t.id ? turnStyle(mapPage.turn) : ''}"></button>`).join('')}
        </div>
        ${tiles.has(mapPage.brush) ? `<div class="inv-tags">${MAP_LAYERS.map(([key, name]) => `<button type="button" class="inv-tag" data-paint-layer="${key}" aria-pressed="${mapPage.layer === key}">${name}</button>`).join('')}</div>` : ''}
        ${mapPage.brush === 'erase' && mapPage.sel ? selectionHtml() : ''}
        <p><button class="text-button danger" type="button" data-map="clear">Clear the map</button></p>
      </div>
      <div class="map-side">
        <div class="zoom-bar">
          <button type="button" class="text-button" data-map="zoomout" aria-label="Zoom out" title="Zoom out"${mapPage.zoom <= 1 ? ' disabled' : ''}>−</button>
          <button type="button" class="text-button" data-map="zoomin" aria-label="Zoom in" title="Zoom in"${mapPage.zoom >= MAP_ZOOM_MAX ? ' disabled' : ''}>+</button>
        </div>
        <div class="map-wrap map-view"><canvas id="map-canvas" class="pixel${mapPage.brush === 'pan' ? ' panning' : ''}"></canvas></div>
      </div>
    </div>`;
}

// The size of the map being painted: the room's or the garden's own.
function sizeHtml() {
  const field = (id, label, min, max, value) => `<label>${label} <input type="number" data-size="${id}" min="${min}" max="${max}" value="${value}"></label>`;
  return `<div class="cut-box">${mapPage.which === 'room'
    ? field('cols', 'Across', ...ROOM_SIZES.cols, room.cols) + field('wallRows', 'Wall rows', ...ROOM_SIZES.wallRows, room.wallRows) + field('floorRows', 'Floor rows', ...ROOM_SIZES.floorRows, room.floorRows)
    : field('wide', 'Across', 6, 40, gardenCols()) + field('tall', 'Down', room.wallRows + 2, 30, gardenRows())}</div>`;
}

// Zooming: at 1 the whole map fits in its box; bigger, the box scrolls.
const MAP_ZOOM_MAX = 8;
function sizeMapCanvas() {
  const c = $('map-canvas');
  const box = document.querySelector('.map-view');
  const map = theMap();
  if (!c || !box || !map) return;
  const fit = Math.min(box.clientWidth / (map.cols * TILE), (box.clientHeight || Infinity) / (map.rows * TILE));
  c.style.width = `${Math.floor(map.cols * TILE * fit * mapPage.zoom)}px`;
  c.style.height = `${Math.floor(map.rows * TILE * fit * mapPage.zoom)}px`;
}
// Zooms to z, keeping the spot under clientX, clientY (or the middle) still.
function zoomMap(z, clientX, clientY) {
  const box = document.querySelector('.map-view');
  const c = $('map-canvas');
  if (!box || !c) return;
  z = Math.max(1, Math.min(MAP_ZOOM_MAX, z));
  const b = box.getBoundingClientRect();
  const x = clientX ?? b.left + b.width / 2;
  const y = clientY ?? b.top + b.height / 2;
  const r = c.getBoundingClientRect();
  const ratio = z / mapPage.zoom;
  const [px, py] = [(x - r.left) * ratio, (y - r.top) * ratio];
  mapPage.zoom = z;
  sizeMapCanvas();
  box.scrollLeft = px - (x - b.left);
  box.scrollTop = py - (y - b.top);
  const [out, inn] = document.querySelectorAll('.zoom-bar button');
  out.disabled = z <= 1;
  inn.disabled = z >= MAP_ZOOM_MAX;
}
window.addEventListener('resize', () => { if (currentView() === 'map' && mapPage.tab === 'map') sizeMapCanvas(); });

function drawMapCanvas() {
  const c = $('map-canvas');
  const map = theMap();
  if (!c || !map) return;
  c.width = map.cols * TILE;
  c.height = map.rows * TILE;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#9DBF7E';
  g.fillRect(0, 0, c.width, c.height);
  if (mapPage.which === 'room') {
    // The plain wall and floor, under what's painted.
    g.fillStyle = '#C5D2B3';
    g.fillRect(0, 0, c.width, room.wallRows * TILE);
    g.fillStyle = '#C9A27A';
    g.fillRect(0, room.wallRows * TILE, c.width, c.height - room.wallRows * TILE);
  }
  const now = performance.now();
  for (const [layer] of MAP_LAYERS) drawMapLayer(g, map, layer, now);
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
  const hi = mapPage.hi && cellStack(theMap()[mapPage.hi.layer][mapPage.hi.at])[mapPage.hi.k];
  if (hi) {
    const [cols, rows] = footprint(hi.tile, hi.turn);
    g.fillStyle = 'rgba(224, 96, 122, 0.35)';
    g.fillRect((mapPage.hi.at % theMap().cols) * TILE, Math.floor(mapPage.hi.at / theMap().cols) * TILE, cols * TILE, rows * TILE);
  }
}

// --- Selecting with ✕ ---

// Every tile on the map that touches the selected box, on every layer.
function selectedTiles() {
  const { x0, y0, x1, y1 } = mapPage.sel;
  const found = [];
  for (const [layer] of MAP_LAYERS) {
    theMap()[layer].forEach((value, at) => {
      const x = at % theMap().cols;
      const y = Math.floor(at / theMap().cols);
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
  const one = cellStack(theMap()[layer][Number(at)])[Number(k)];
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
  return [Math.max(0, Math.min(x, theMap().cols - cols)), Math.max(0, Math.min(y, theMap().rows - rows))];
}
// Water keeps moving while the map is on screen.
setInterval(() => { if (currentView() === 'map' && mapPage.tab === 'map') drawMapCanvas(); }, 200);

let painting = false;
let mapSaveTimer = 0;
const saveSoon = () => {
  clearTimeout(mapSaveTimer);
  const which = mapPage.which;
  mapSaveTimer = setTimeout(() => saveMap(which), 400);
};

// The map tile under the pointer, kept inside the map.
function mapCell(event) {
  const r = $('map-canvas').getBoundingClientRect();
  const tx = Math.floor(((event.clientX - r.left) / r.width) * theMap().cols);
  const ty = Math.floor(((event.clientY - r.top) / r.height) * theMap().rows);
  return [Math.max(0, Math.min(tx, theMap().cols - 1)), Math.max(0, Math.min(ty, theMap().rows - 1))];
}

function paintAt(event, first) {
  const [tx, ty] = mapCell(event);
  const tile = tiles.get(mapPage.brush);
  if (!tile) return;
  const [cols, rows] = footprint(tile, mapPage.turn);
  // A big tile goes down once per tap, not along the drag.
  if (!first && (cols > 1 || rows > 1)) return;
  const [x, y] = spotFor(tile, mapPage.turn, tx, ty);
  putTile(theMap(), mapPage.layer, cellOf(theMap(), x, y), tile.id, mapPage.turn);
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
    const found = coveringAt(theMap(), layer, tx, ty);
    if (!found.length) continue;
    const top = found[found.length - 1];
    mapPage.held = { layer, value: cellValue(top.tile.id, top.turn) };
    takeOff(theMap(), layer, [top]);
    return true;
  }
  return false;
}
function putDown() {
  const { layer, value } = mapPage.held;
  const { tile, turn } = cellTile(value);
  const [x, y] = spotFor(tile, turn, ...mapPage.hover);
  putTile(theMap(), layer, cellOf(theMap(), x, y), tile.id, turn);
  mapPage.held = null;
  drawMapCanvas();
  saveSoon();
}

// Moving around a zoomed-in map: dragging with the hand, or the middle mouse
// button, scrolls its box.
let panFrom = null;
function startPan(event) {
  const box = document.querySelector('.map-view');
  panFrom = { x: event.clientX, y: event.clientY, left: box.scrollLeft, top: box.scrollTop };
  event.target.setPointerCapture(event.pointerId);
}
function panTo(event) {
  const box = document.querySelector('.map-view');
  box.scrollLeft = panFrom.left - (event.clientX - panFrom.x);
  box.scrollTop = panFrom.top - (event.clientY - panFrom.y);
}

$('map-page').addEventListener('pointerdown', (event) => {
  if (event.target.id === 'map-canvas') {
    if (mapPage.brush === 'pan' || event.button === 1) {
      event.preventDefault();
      return startPan(event);
    }
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
  if (panFrom) return panTo(event);
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
  if (panFrom) {
    panFrom = null;
    return;
  }
  painting = false;
  if (mapPage.held) putDown();
  if (mapPage.selFrom) {
    mapPage.selFrom = null;
    drawMapPage();
  }
  if (sheetDrag && event.target.id === 'sheet-canvas') sheetUp(event);
});
$('map-page').addEventListener('wheel', (event) => {
  if (event.target.id !== 'map-canvas' || !(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  zoomMap(mapPage.zoom * Math.exp(-event.deltaY / 300), event.clientX, event.clientY);
}, { passive: false });
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

// The sheet showing on the Tiles tab: a tile set, or a picture opened but not
// cut from yet (it becomes a tile set with its first tile).
function shownSet() {
  const loose = mapPage.loose[mapPage.looseAt];
  return loose ? { id: '', name: loose.name, sheets: { summer: loose.src }, loose: true } : tilesets.get(mapPage.set);
}
// The tile sets in the row of tags: closed ones (hidden) only in "Open again".
const openSets = () => [...tilesets.values()].filter((set) => !set.hidden);

function tilesTabHtml() {
  const set = shownSet();
  const sets = openSets();
  const closed = [...tilesets.values()].filter((one) => one.hidden);
  const at = mapPage.looseAt >= 0 ? sets.length + mapPage.looseAt : sets.findIndex((one) => one.id === mapPage.set);
  return `<div class="buttons">
      <label class="ink-button"><span>Open pictures</span><input id="tileset-file" type="file" accept="image/*" multiple hidden></label>
      <label class="text-button"><span>Open a folder</span><input id="tileset-folder" type="file" webkitdirectory multiple hidden></label>
      ${closed.length ? `<select id="tileset-reopen" aria-label="Open again"><option value="">Open again</option>${closed.map((one) => `<option value="${one.id}">${escapeHtml(one.name)}</option>`).join('')}</select>` : ''}
    </div>
    ${sheetTagsHtml([...sets.map((one) => one.name), ...mapPage.loose.map((one) => one.name)], at, 'data-tileset', 'data-tileset-close')}
    ${set ? `<div class="map-layout tiles-layout">
      <div class="map-wrap sheet-wrap cut-scroll"><canvas id="sheet-canvas" class="pixel"></canvas></div>
      <div class="map-tools">
        ${set.loose ? '' : `<label class="field"><span>Name</span><input id="tileset-name" type="text" value="${escapeHtml(set.name)}" autocomplete="off"></label>
        <div class="field"><span>Sheets</span><div class="season-sheets">${SEASONS.map(([key, name]) => `<label class="season-sheet${set.sheets[key] ? ' has' : ''}">
          ${set.sheets[key] ? `<img class="pixel" src="${set.sheets[key]}" alt="">` : '<span class="thing-x">+</span>'}<span>${name}</span>
          <input type="file" accept="image/*" data-season-sheet="${key}" hidden></label>`).join('')}</div></div>`}
        ${tileFormHtml()}
        ${set.loose ? '' : '<p><button class="text-button danger" type="button" data-map="unset">Delete this tile set</button></p>'}
      </div>
    </div>` : ''}`;
}

// The tile being changed, or the new one picked on the sheet.
const formTile = () => tiles.get(mapPage.tile) || (mapPage.pick && { id: 'pick', set: shownSet()?.id || '', frames: [], fps: 4, ...mapPage.pick });

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
  const set = shownSet();
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
    const hit = setTiles(shownSet()?.id || '').find((t) => x * TILE >= t.x && x * TILE < t.x + t.w && y * TILE >= t.y && y * TILE < t.y + t.h);
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

// Shows a picture you've opened, reading it first if it hasn't been yet.
async function showLoose(i) {
  const loose = mapPage.loose[i];
  if (!loose) return;
  try {
    if (!loose.src) loose.src = await readFileAsDataUrl(loose.file);
    await loadPicture(loose.src);
  } catch (error) {
    mapStatus(error.message);
    return;
  }
  Object.assign(mapPage, { looseAt: i, tile: '', pick: null, addFrame: false, form: null });
  drawMapPage();
}
// Closing a tile set with tiles only puts it away (the tiles stay, and "Open
// again" brings it back); one with none is deleted. A picture not cut from is
// just closed.
async function closeSheet(i) {
  const sets = openSets();
  if (i >= sets.length) {
    const at = i - sets.length;
    mapPage.loose.splice(at, 1);
    if (mapPage.looseAt === at) mapPage.looseAt = -1;
    else if (mapPage.looseAt > at) mapPage.looseAt--;
  } else {
    const set = sets[i];
    if (setTiles(set.id).length) {
      const saved = await putItem({ ...set, hidden: true });
      tilesets.set(saved.id, saved);
    } else {
      await deleteItem(set.id);
      tilesets.delete(set.id);
    }
    if (mapPage.set === set.id) mapPage.set = openSets()[0]?.id || '';
  }
  Object.assign(mapPage, { tile: '', pick: null, addFrame: false, form: null });
  drawMapPage();
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
  if ((t.id === 'tileset-file' || t.id === 'tileset-folder') && t.files.length) {
    const found = picturesIn(t.files);
    t.value = '';
    if (!found.length) return;
    mapPage.loose.push(...found.map(({ name, file }) => ({ name, file, src: '' })));
    return showLoose(mapPage.loose.length - found.length);
  }
  if (t.id === 'tileset-reopen' && tilesets.has(t.value)) {
    const saved = await putItem({ ...tilesets.get(t.value), hidden: false });
    tilesets.set(saved.id, saved);
    Object.assign(mapPage, { set: saved.id, looseAt: -1, tile: '', pick: null, form: null });
    return drawMapPage();
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
    takeOff(theMap(), one.layer, [one]);
    putTile(theMap(), t.value, one.at, one.id, one.turn);
    mapPage.hi = null;
    saveSoon();
    return drawMapPage();
  }
  if (t.dataset.size) {
    const sizes = Object.fromEntries([...document.querySelectorAll('[data-size]')].map((input) => [input.dataset.size, input.value]));
    if (mapPage.which === 'room') await setRoomSize(sizes);
    else {
      garden.wide = Math.max(6, Math.min(40, Math.round(Number(sizes.wide)) || gardenCols()));
      garden.tall = Math.max(room.wallRows + 2, Math.min(30, Math.round(Number(sizes.tall)) || gardenRows()));
      await saveGarden();
      await fitMap('garden');
    }
    mapPage.sel = null;
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
  const which = event.target.closest('[data-map-which]');
  if (which) {
    Object.assign(mapPage, { which: which.dataset.mapWhich, sel: null, hi: null, held: null, zoom: 1 });
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
    if (one) takeOff(theMap(), one.layer, [one]);
    mapPage.hi = null;
    saveSoon();
    return drawMapPage();
  }
  const set = event.target.closest('[data-tileset]');
  if (set) {
    const i = Number(set.dataset.tileset);
    const sets = openSets();
    if (i >= sets.length) return showLoose(i - sets.length);
    Object.assign(mapPage, { set: sets[i].id, looseAt: -1, tile: '', pick: null, addFrame: false, form: null });
    return drawMapPage();
  }
  const close = event.target.closest('[data-tileset-close]');
  if (close) return closeSheet(Number(close.dataset.tilesetClose));
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
  if (action === 'sizing') {
    mapPage.sizing = !mapPage.sizing;
    drawMapPage();
  }
  if (action === 'zoomin' || action === 'zoomout') zoomMap(mapPage.zoom * (action === 'zoomin' ? 1.5 : 1 / 1.5));
  if (action === 'delsel') {
    const shown = shownSelected();
    for (const [layer] of MAP_LAYERS) takeOff(theMap(), layer, shown.filter((one) => one.layer === layer));
    mapPage.hi = null;
    saveSoon();
    drawMapPage();
  }
  if (action === 'turn') {
    mapPage.turn = (mapPage.turn + 1) % 4;
    drawMapPage();
  }
  if (action === 'clear' && confirm('Clear the whole map?')) {
    maps[mapPage.which] = blankMap(mapPage.which);
    await saveMap(mapPage.which);
    drawMapPage();
  }
  if (action === 'addtile') {
    // The first tile from a picture makes it a tile set.
    const loose = mapPage.loose[mapPage.looseAt];
    if (loose) {
      const set = await putItem({ id: newId('tileset'), kind: 'tileset', day: '', name: loose.name, sheets: { summer: loose.src }, createdAt: Date.now() });
      tilesets.set(set.id, set);
      mapPage.loose.splice(mapPage.looseAt, 1);
      mapPage.looseAt = -1;
      mapPage.set = set.id;
      await sheetsReady();
    }
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
    const used = Object.values(maps).some((map) => map && MAP_LAYERS.some(([layer]) => map[layer].some((v) => cellStack(v).some((one) => one.id === id))));
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
    mapPage.set = openSets()[0]?.id || '';
    drawMapPage();
  }
});

async function removeTiles(ids) {
  for (const id of ids) {
    await deleteItem(id);
    tiles.delete(id);
  }
  for (const which of ['room', 'garden']) {
    if (!maps[which]) continue;
    for (const [layer] of MAP_LAYERS) maps[which][layer] = maps[which][layer].map((v) => stackValue(cellStack(v).filter((one) => !ids.includes(one.id))));
    await saveMap(which);
  }
  if (ids.includes(mapPage.brush)) mapPage.brush = '';
}
