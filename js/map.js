// map.js: your own tiles, and the garden's map painted with them (the Map page,
// map-page.js, is where you make both).
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
//        type: ground, soil, path, water, edge or decoration (see TILE_TYPES).
//        front: drawn in front of the pets (a canopy). walk: the pets can walk on it.
//   { id: "map-garden", kind: "map", day: "", cols, rows, ground: [], detail: [], front: [] }
//        each layer a tile id (or "") for every tile of the map, row by row,
//        with ":1", ":2" or ":3" after it when it's turned that many quarter
//        turns. A tile bigger than one tile is stored at its top-left corner.

const TILE_TYPES = [
  ['ground', 'Ground', true],
  ['soil', 'Soil to plant in', true],
  ['path', 'Path', true],
  ['water', 'Water', false],
  ['edge', 'Edge', true],
  ['decoration', 'Decoration', false],
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
let gardenMap = null;

// Called by loadRoom (room.js) with every item.
function loadMaps(items) {
  tilesets = new Map();
  tiles = new Map();
  gardenMap = null;
  for (const item of items) {
    if (item.deleted) continue;
    if (item.kind === 'tileset') tilesets.set(item.id, item);
    if (item.kind === 'tile') tiles.set(item.id, item);
    if (item.kind === 'map' && item.id === 'map-garden') gardenMap = item;
  }
}

function blankMap() {
  const n = room.cols * rows();
  return { id: 'map-garden', kind: 'map', day: '', cols: room.cols, rows: rows(), ground: Array(n).fill(''), detail: Array(n).fill(''), front: Array(n).fill('') };
}
const saveMap = async () => { gardenMap = await putItem(gardenMap); };

// The sheet a tile set shows in a season.
function sheetFor(set, season = seasonNow()) {
  const sheets = (set && set.sheets) || {};
  return sheets[season] || sheets.summer || Object.values(sheets).find(Boolean) || '';
}

// What's in one spot of a map layer: the tile, and how many quarter turns.
function cellTile(value) {
  const [id, turn] = String(value || '').split(':');
  return { id, tile: tiles.get(id), turn: Number(turn) || 0 };
}
const cellValue = (id, turn) => (turn ? `${id}:${turn}` : id);
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

const mapHere = () => Boolean(gardenMap && gardenMap.ground.some((v) => cellTile(v).tile));
const cellOf = (tx, ty) => (gardenMap && tx >= 0 && ty >= 0 && tx < gardenMap.cols && ty < gardenMap.rows ? ty * gardenMap.cols + tx : -1);

// The spots on one layer whose tile covers tx, ty, big ones too.
function coveringAt(layer, tx, ty) {
  const found = [];
  if (!gardenMap) return found;
  gardenMap[layer].forEach((value, i) => {
    const { tile, turn } = cellTile(value);
    if (!tile) return;
    const x = i % gardenMap.cols;
    const y = Math.floor(i / gardenMap.cols);
    const [cols, rows] = footprint(tile, turn);
    if (tx >= x && tx < x + cols && ty >= y && ty < y + rows) found.push(i);
  });
  return found;
}

// The tiles covering a spot on the map, on each layer.
const tilesAt = (tx, ty) => MAP_LAYERS.flatMap(([layer]) => coveringAt(layer, tx, ty).map((i) => cellTile(gardenMap[layer][i]).tile));

const soilAt = (tx, ty) => tilesAt(tx, ty).some((t) => t.type === 'soil');
const walkableAt = (tx, ty) => {
  const here = tilesAt(tx, ty).filter((t) => !t.front);
  return here.every((t) => t.walk !== false);
};

function drawMapLayer(g, layer, now) {
  if (!gardenMap) return;
  const season = seasonNow();
  gardenMap[layer].forEach((value, i) => {
    const { tile, turn } = cellTile(value);
    if (tile) drawTile(g, tile, (i % gardenMap.cols) * TILE, Math.floor(i / gardenMap.cols) * TILE, now, season, turn);
  });
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
