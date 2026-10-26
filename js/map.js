// map.js: your own tiles, and the room's and the garden's maps painted with
// them (the Map page, map-page.js, is where you make them).
//
// A tile set is a tile sheet, with a sheet for each season. The tiles are cut
// from it once: every season's sheet has the same layout, so a tile shows the
// same spot on whichever sheet fits the season. The seasons follow the
// Norwegian calendar: winter December to February, spring March to May,
// summer June to August, autumn September to November. The season button on
// the garden tries the others, like the light button.
//
// Saved as items (all part of "Save game only", see sync.js):
//   { id: "tileset-...", kind: "tileset", day: "", name, sheets: { spring, summer, autumn, winter } }
//        each sheet a picture (missing seasons use summer's, or any there is).
//   { id: "tile-...", kind: "tile", day: "", set, x, y, w, h, frames: [[x, y]], fps, type, front, walk }
//        x, y, w, h: where it is on the sheet, in pixels (whole tiles of 16).
//        frames: more spots of the same size, played in turn (an animated tile).
//        type: ground, soil, path, water, edge, decoration or plant (see
//        TILE_TYPES). A plant sways when a pet walks through it, and in the
//        garden it's in front of a pet behind it and behind one in front.
//        front: drawn in front of the pets (a canopy). walk: the pets can walk on it.
//   { id: "map-garden" or "map-room", kind: "map", day: "", cols, rows, ground: [], detail: [], front: [] }
//        the garden's map is the garden's size, the room's the room's.
//        each layer a tile id (or "") for every tile of the map, row by row,
//        with ":1", ":2" or ":3" after it when it's turned that many quarter
//        turns, and "|" between them when tiles are stacked in one spot (the
//        last one is on top). A tile bigger than one tile is stored at its
//        top-left corner.

const TILE_TYPES = [
  ['ground', 'Ground', true],
  ['soil', 'Soil to plant in', true],
  ['path', 'Path', true],
  ['water', 'Water', false],
  ['edge', 'Edge', true],
  ['decoration', 'Decoration', false],
  ['plant', 'Swaying plant', true],
];
const MAP_LAYERS = [['ground', 'Ground'], ['detail', 'On the ground'], ['front', 'In front']];
// The layer a tile goes on, from its type.
const layerFor = (tile) => (tile.front ? 'front' : ['ground', 'soil', 'water'].includes(tile.type) ? 'ground' : 'detail');

const SEASONS = [['spring', 'Spring'], ['summer', 'Summer'], ['autumn', 'Autumn'], ['winter', 'Winter']];
let previewSeason = null; // a chosen season, to try it; null follows the calendar
function seasonNow() {
  if (previewSeason) return previewSeason;
  const m = new Date().getMonth();
  return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
}

let tilesets = new Map();
let tiles = new Map();
const maps = { room: null, garden: null };

// Called by loadRoom (room.js) with every item.
function loadMaps(items) {
  tilesets = new Map();
  tiles = new Map();
  maps.room = null;
  maps.garden = null;
  for (const item of items) {
    if (item.deleted) continue;
    if (item.kind === 'tileset') tilesets.set(item.id, item);
    if (item.kind === 'tile') tiles.set(item.id, item);
    if (item.kind === 'map' && item.id === 'map-garden') maps.garden = item;
    if (item.kind === 'map' && item.id === 'map-room') maps.room = item;
  }
}

// How big a map is: the room's size, or the garden's.
const mapSize = (which) => (which === 'room' ? [room.cols, rows()] : [gardenCols(), gardenRows()]);
function blankMap(which) {
  const [cols, rows] = mapSize(which);
  const n = cols * rows;
  return { id: `map-${which}`, kind: 'map', day: '', cols, rows, ground: Array(n).fill(''), detail: Array(n).fill(''), front: Array(n).fill('') };
}
const saveMap = async (which) => { maps[which] = await putItem(maps[which]); };

// A map that changed size keeps what's painted where it still fits.
function resizedMap(which) {
  const old = maps[which];
  const map = blankMap(which);
  if (!old) return map;
  for (const [layer] of MAP_LAYERS) {
    old[layer].forEach((id, i) => {
      const x = i % old.cols;
      const y = Math.floor(i / old.cols);
      if (x < map.cols && y < map.rows) map[layer][y * map.cols + x] = id;
    });
  }
  return map;
}
// Makes a map fit its size again, after the room or garden changed size.
async function fitMap(which) {
  const map = maps[which];
  const [cols, rows] = mapSize(which);
  if (!map || (map.cols === cols && map.rows === rows)) return;
  maps[which] = resizedMap(which);
  await saveMap(which);
}

// The sheet a tile set shows in a season.
function sheetFor(set, season = seasonNow()) {
  const sheets = (set && set.sheets) || {};
  return sheets[season] || sheets.summer || Object.values(sheets).find(Boolean) || '';
}

// What's in one spot of a map layer: the tiles stacked there, the last on top,
// each with how many quarter turns it's turned.
function cellStack(value) {
  return String(value || '').split('|').filter(Boolean).map((one) => {
    const [id, turn] = one.split(':');
    return { id, tile: tiles.get(id), turn: Number(turn) || 0 };
  }).filter((one) => one.tile);
}
// The tile on top of a spot.
const cellTile = (value) => cellStack(value).pop() || { id: '', tile: null, turn: 0 };
const cellValue = (id, turn) => (turn ? `${id}:${turn}` : id);
const stackValue = (stack) => stack.map(({ id, turn }) => cellValue(id, turn)).join('|');
// How many tiles across and down a tile covers, turned.
const footprint = (tile, turn = 0) => (turn % 2 ? [tile.h / TILE, tile.w / TILE] : [tile.w / TILE, tile.h / TILE]);

// Draws a tile with its top-left corner at x, y.
function drawTile(g, tile, x, y, now = performance.now(), season = seasonNow(), turn = 0) {
  const img = picture(sheetFor(tilesets.get(tile.set), season));
  if (!img) return;
  const spots = [[tile.x, tile.y], ...(tile.frames || [])];
  const [sx, sy] = spots[Math.floor((now / 1000) * (Number(tile.fps) || 4)) % spots.length];
  if (!turn) return g.drawImage(img, sx, sy, tile.w, tile.h, x, y, tile.w, tile.h);
  const [cols, rows] = footprint(tile, turn);
  g.save();
  g.translate(x + (cols * TILE) / 2, y + (rows * TILE) / 2);
  g.rotate((turn * Math.PI) / 2);
  g.drawImage(img, sx, sy, tile.w, tile.h, -tile.w / 2, -tile.h / 2, tile.w, tile.h);
  g.restore();
}

// Whether a map has ground painted on it.
const mapHere = (map) => Boolean(map && map.ground.some((v) => cellStack(v).length));
const cellOf = (map, tx, ty) => (map && tx >= 0 && ty >= 0 && tx < map.cols && ty < map.rows ? ty * map.cols + tx : -1);

// Every tile on one layer covering tx, ty, big ones and stacked ones too:
// { at (the spot), k (where it is in the stack), tile, turn }, the last on top.
function coveringAt(map, layer, tx, ty) {
  const found = [];
  if (!map) return found;
  map[layer].forEach((value, at) => {
    const x = at % map.cols;
    const y = Math.floor(at / map.cols);
    cellStack(value).forEach(({ tile, turn }, k) => {
      const [cols, rows] = footprint(tile, turn);
      if (tx >= x && tx < x + cols && ty >= y && ty < y + rows) found.push({ at, k, tile, turn });
    });
  });
  return found;
}

// The tiles covering a spot on the map, on each layer.
const tilesAt = (map, tx, ty) => MAP_LAYERS.flatMap(([layer]) => coveringAt(map, layer, tx, ty).map((one) => one.tile));

// Takes tiles off a layer: each { at, k } found by coveringAt.
function takeOff(map, layer, found) {
  for (const at of new Set(found.map((one) => one.at))) {
    const gone = found.filter((one) => one.at === at).map((one) => one.k);
    map[layer][at] = stackValue(cellStack(map[layer][at]).filter((_, k) => !gone.includes(k)));
  }
}

// Puts a tile down: the ground holds one tile, the other layers stack.
function putTile(map, layer, at, id, turn) {
  if (layer === 'ground') {
    map[layer][at] = cellValue(id, turn);
    return;
  }
  const stack = cellStack(map[layer][at]).filter((one) => one.id !== id || one.turn !== turn);
  map[layer][at] = stackValue([...stack, { id, turn }]);
}

const soilAt = (tx, ty) => tilesAt(maps.garden, tx, ty).some((t) => t.type === 'soil');
const walkableAt = (tx, ty) => {
  const here = tilesAt(maps.garden, tx, ty).filter((t) => !t.front);
  return here.every((t) => t.walk !== false);
};

// Draws a map layer. skipPlants leaves the swaying plants out, for drawing
// them in among the pets instead (mapPlants).
function drawMapLayer(g, map, layer, now, skipPlants = false) {
  if (!map) return;
  const season = seasonNow();
  map[layer].forEach((value, i) => {
    for (const { tile, turn } of cellStack(value)) {
      if (skipPlants && tile.type === 'plant') continue;
      drawPlantOrTile(g, map, tile, i, now, season, turn);
    }
  });
}
function drawPlantOrTile(g, map, tile, at, now, season, turn) {
  const x = (at % map.cols) * TILE;
  const y = Math.floor(at / map.cols) * TILE;
  const lean = tile.type === 'plant' ? swayOf(map, at, now) : 0;
  if (!lean) return drawTile(g, tile, x, y, now, season, turn);
  // Leaning from its foot: the top moves most.
  const [cols, rows] = footprint(tile, turn);
  g.save();
  g.translate(0, y + rows * TILE);
  g.transform(1, 0, lean, 1, 0, 0);
  drawTile(g, tile, x, -rows * TILE, now, season, turn);
  g.restore();
}
// The swaying plants on a map's lower layers, to sort by depth with the pets:
// [{ y (its foot), draw }].
function mapPlants(map, now) {
  if (!map) return [];
  const season = seasonNow();
  const out = [];
  for (const layer of ['ground', 'detail']) {
    map[layer].forEach((value, at) => {
      for (const { tile, turn } of cellStack(value)) {
        if (tile.type !== 'plant') continue;
        const rows = footprint(tile, turn)[1];
        out.push({ y: (Math.floor(at / map.cols) + rows) * TILE - 1, draw: () => drawPlantOrTile(wg, map, tile, at, now, season, turn) });
      }
    });
  }
  return out;
}

// Swaying: a plant starts to sway when a pet steps onto its tile, and settles
// again in under a second.
const SWAY_MS = 900;
const swaying = new Map(); // "map id:spot" → when it started
const petSpots = new Map(); // a pet's name → the tile it was on
function swayOf(map, at, now) {
  const start = swaying.get(`${map.id}:${at}`);
  if (start === undefined) return 0;
  const t = now - start;
  if (t > SWAY_MS) {
    swaying.delete(`${map.id}:${at}`);
    return 0;
  }
  return 0.22 * Math.sin((t / 1000) * Math.PI * 2 * 3) * (1 - t / SWAY_MS);
}
// Called every frame with where each pet's feet are: { who, x, y }.
function rustlePlants(map, feet, now) {
  if (!map) return;
  for (const { who, x, y } of feet) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor((y - 1) / TILE);
    const spot = `${map.id}:${tx},${ty}`;
    if (petSpots.get(who) === spot) continue;
    petSpots.set(who, spot);
    for (const layer of ['ground', 'detail', 'front']) {
      for (const one of coveringAt(map, layer, tx, ty)) if (one.tile.type === 'plant') swaying.set(`${map.id}:${one.at}`, now);
    }
  }
}

// A tile as a little picture, for the Map page and the palette.
const tileThumbs = new Map();
function tileThumb(tile, season = seasonNow()) {
  const src = sheetFor(tilesets.get(tile.set), season);
  const key = `${tile.id}|${tile.x},${tile.y},${tile.w},${tile.h}|${src.length}|${season}`;
  if (tileThumbs.has(key)) return tileThumbs.get(key);
  const img = picture(src);
  if (!img) return '';
  const c = document.createElement('canvas');
  c.width = tile.w;
  c.height = tile.h;
  c.getContext('2d').drawImage(img, tile.x, tile.y, tile.w, tile.h, 0, 0, tile.w, tile.h);
  const url = c.toDataURL('image/png');
  tileThumbs.set(key, url);
  return url;
}

// Waits until every tile sheet's picture is ready to draw.
function sheetsReady() {
  const srcs = [...tilesets.values()].flatMap((s) => Object.values(s.sheets || {}).filter(Boolean));
  return Promise.all(srcs.map((src) => {
    picture(src);
    const img = pictures.get(src);
    return img.complete ? null : new Promise((resolve) => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); });
  }));
}
