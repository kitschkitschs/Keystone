// room.js: the cottage room on the home page. A pixel-art room on a grid of
// 16 x 16 pixel tiles, with a cat walking about and the light following the clock.
//
// Everything is saved as items (see db.js), so it all goes in your backup file:
//   { id: "piece-...", kind: "piece", day: "", name, type, count, surface, lift, light, catSpot, catLift,
//     views: [{ src, pw, ph, w, d }] }       one thing in your inventory. Each view is
//                                            one way it can be turned: its picture
//                                            (src, pw x ph pixels) and the tiles it
//                                            stands on (w wide, d deep).
//   { id: "placed-...", kind: "placed", day: "", piece, view, x, y }
//                                            one piece standing in the room, with the
//                                            top-left tile it stands on.
//   { id: "room", kind: "room", day: "", cols, wallRows, floorRows, wallpaper, floor }
//   { id: "cat", kind: "cat", day: "", name, src, fw, fh, anims }   see room-art.js
//
// A piece's picture stands on the bottom edge of its tiles and can reach up past
// them, like a bookshelf in front of the wall. Things nearer the bottom of the
// screen are drawn in front.

const room = { cols: 12, wallRows: 3, floorRows: 8, wallpaper: '', floor: '' };
let pieces = new Map();
let placed = [];
let cat = defaultCat();

let decorating = false;
let held = null; // the piece in your hand: { piece, view, x, y, from }
let inventoryTab = 'all';
let editingPieces = false;
let previewHour = null; // a chosen time of day, to try the light; null follows the clock
try { inventoryTab = localStorage.getItem('keystone-inventory-tab') || 'all'; } catch { /* all */ }

const roomCanvas = $('room-canvas');
const world = document.createElement('canvas');
const wg = world.getContext('2d');

// --- Loading ---

async function loadRoom() {
  pieces = new Map();
  placed = [];
  cat = defaultCat();
  for (const item of await getAllItems()) {
    if (item.deleted) continue;
    if (item.kind === 'piece') pieces.set(item.id, item);
    if (item.kind === 'placed') placed.push(item);
    if (item.kind === 'room') Object.assign(room, item);
    if (item.kind === 'cat') cat = { ...defaultCat(), ...item, anims: { ...defaultCat().anims, ...item.anims } };
  }
  placed = placed.filter((p) => pieces.has(p.piece));
  catSheet = null;
  loadPicture(cat.src).then((img) => { catSheet = img; }).catch(() => { catSheet = null; });
  sizeRoom();
}

function saveRoomSettings() {
  return putItem({ id: 'room', kind: 'room', day: '', cols: room.cols, wallRows: room.wallRows, floorRows: room.floorRows, wallpaper: room.wallpaper, floor: room.floor });
}

// Pictures, loaded once and kept.
const pictures = new Map();
function picture(src) {
  if (!pictures.has(src)) {
    const img = new Image();
    img.src = src;
    pictures.set(src, img);
  }
  const img = pictures.get(src);
  return img.complete && img.naturalWidth ? img : null;
}

// --- The grid ---

const rows = () => room.wallRows + room.floorRows;
const viewOf = (piece, i) => piece.views[i] || piece.views[0];

// The tiles a piece stands on.
function boxOf({ piece: pieceId, view, x, y }) {
  const piece = pieces.get(pieceId);
  if (piece.type === 'small') return { x, y, w: 1, d: 1 };
  const v = viewOf(piece, view);
  return { x, y, w: v.w, d: v.d };
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;

// Wall things go in the wall rows; everything else on the floor.
function rowsFor(type) {
  return type === 'wall' ? [0, room.wallRows] : [room.wallRows, rows()];
}

// The table (or other surface) under a tile, if there is one.
function surfaceUnder(tx, ty, skipId) {
  return placed.find((p) => p.id !== skipId && pieces.get(p.piece).surface && pieces.get(p.piece).type === 'furniture'
    && overlaps(boxOf(p), { x: tx, y: ty, w: 1, d: 1 }));
}

function canPlace(h) {
  const piece = pieces.get(h.piece);
  const box = boxOf(h);
  const [top, bottom] = rowsFor(piece.type);
  if (box.x < 0 || box.x + box.w > room.cols || box.y < top || box.y + box.d > bottom) return false;
  for (const other of placed) {
    if (h.from && other.id === h.from.id) continue;
    if (!overlaps(box, boxOf(other))) continue;
    const type = pieces.get(other.piece).type;
    if (type === piece.type) return false;
    if (piece.type === 'furniture' && type === 'small' && !piece.surface) return false;
    if (piece.type === 'small' && type === 'furniture' && !pieces.get(other.piece).surface) return false;
  }
  return true;
}

// Things standing on a table, which have to come off before it can move.
function thingsOn(table) {
  const box = boxOf(table);
  return placed.filter((p) => p.id !== table.id && pieces.get(p.piece).type === 'small' && overlaps(box, boxOf(p)));
}

// Tiles the cat can't walk through.
function blockedTiles() {
  const blocked = new Set();
  for (const p of placed) {
    if (pieces.get(p.piece).type !== 'furniture') continue;
    const b = boxOf(p);
    for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++) blocked.add(`${x},${y}`);
  }
  return blocked;
}

// --- Drawing ---

let scale = 1;
function sizeRoom() {
  const W = room.cols * TILE;
  const H = rows() * TILE;
  world.width = W;
  world.height = H;
  const dpr = window.devicePixelRatio || 1;
  const space = Math.min(480, document.documentElement.clientWidth) * dpr;
  scale = Math.max(1, Math.floor(space / W));
  roomCanvas.width = W * scale;
  roomCanvas.height = H * scale;
  roomCanvas.style.width = `${(W * scale) / dpr}px`;
  roomCanvas.style.height = `${(H * scale) / dpr}px`;
}
window.addEventListener('resize', () => { if (currentView() === 'home') sizeRoom(); });

// The plain wall and floor, until you pick a wallpaper and a floor.
function drawPlainWall(g, h) {
  g.fillStyle = '#C5D2B3'; g.fillRect(0, 0, world.width, h);
  g.fillStyle = '#A0714F'; g.fillRect(0, h - 7, world.width, 7);
  g.fillStyle = '#C3926A'; g.fillRect(0, h - 7, world.width, 1);
}
function drawPlainFloor(g, y0, h) {
  g.fillStyle = '#C9A27A'; g.fillRect(0, y0, world.width, h);
  g.fillStyle = '#B48B63';
  for (let y = y0 + 4; y < y0 + h; y += 5) g.fillRect(0, y, world.width, 1);
}

function tileAcross(g, img, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y += img.naturalHeight) {
    for (let x = x0; x < x0 + w; x += img.naturalWidth) {
      const dw = Math.min(img.naturalWidth, x0 + w - x);
      const dh = Math.min(img.naturalHeight, y0 + h - y);
      g.drawImage(img, 0, 0, dw, dh, x, y, dw, dh);
    }
  }
}

function surfaceBg(id, x, y, w, h, plain) {
  const piece = pieces.get(id);
  const img = piece && picture(piece.views[0].src);
  if (img) tileAcross(wg, img, x, y, w, h);
  else plain();
}

// Where a placed piece's picture goes, in room pixels.
function spot(p) {
  const piece = pieces.get(p.piece);
  const v = viewOf(piece, p.view);
  const box = boxOf(p);
  let bottom = (box.y + box.d) * TILE;
  if (piece.type === 'small') {
    const table = surfaceUnder(box.x, box.y, p.id);
    if (table) bottom -= pieces.get(table.piece).lift || 16;
  }
  return { x: box.x * TILE + Math.floor((box.w * TILE - v.pw) / 2), y: bottom - v.ph, w: v.pw, h: v.ph };
}

function drawPiece(p, alpha = 1) {
  const v = viewOf(pieces.get(p.piece), p.view);
  const img = picture(v.src);
  if (!img) return;
  const s = spot(p);
  wg.globalAlpha = alpha;
  wg.drawImage(img, s.x, s.y);
  wg.globalAlpha = 1;
}

// The order things are drawn in: wall things, rugs, then everything standing,
// back to front.
function drawList() {
  const wall = [];
  const rugs = [];
  const standing = [];
  for (const p of placed) {
    if (held && held.from && held.from.id === p.id) continue;
    const piece = pieces.get(p.piece);
    const box = boxOf(p);
    if (piece.type === 'wall') wall.push({ y: box.y + box.d, p });
    else if (piece.type === 'rug') rugs.push({ y: box.y + box.d, p });
    else if (piece.type === 'small') {
      const table = surfaceUnder(box.x, box.y, p.id);
      standing.push({ y: table ? (boxOf(table).y + boxOf(table).d) * TILE + 0.2 : (box.y + 1) * TILE - 0.5, p });
    } else standing.push({ y: (box.y + box.d) * TILE, p });
  }
  wall.sort((a, b) => a.y - b.y);
  rugs.sort((a, b) => a.y - b.y);
  standing.push({ y: catSortY(), cat: true });
  standing.sort((a, b) => a.y - b.y);
  return [...wall, ...rugs, ...standing];
}

function drawRoom(now) {
  const W = world.width;
  const wallH = room.wallRows * TILE;
  wg.imageSmoothingEnabled = false;
  wg.clearRect(0, 0, W, world.height);
  surfaceBg(room.wallpaper, 0, 0, W, wallH, () => drawPlainWall(wg, wallH));
  surfaceBg(room.floor, 0, wallH, W, room.floorRows * TILE, () => drawPlainFloor(wg, wallH, room.floorRows * TILE));
  wg.fillStyle = 'rgba(59, 44, 42, 0.18)';
  wg.fillRect(0, wallH, W, 2);

  for (const thing of drawList()) {
    if (thing.cat) drawCat(now);
    else drawPiece(thing.p);
  }

  const light = drawDayLight();
  drawCatExtras(now, light);

  if (held) {
    // The tile grid while placing, then the piece and its tiles in green or red.
    wg.fillStyle = 'rgba(255, 255, 255, 0.16)';
    for (let x = TILE; x < W; x += TILE) wg.fillRect(x, 0, 1, world.height);
    for (let y = TILE; y < world.height; y += TILE) wg.fillRect(0, y, W, 1);
    const ok = canPlace(held);
    const box = boxOf(held);
    drawPiece(held, 0.85);
    wg.fillStyle = ok ? 'rgba(90, 200, 120, 0.5)' : 'rgba(230, 80, 80, 0.5)';
    wg.fillRect(box.x * TILE, box.y * TILE, box.w * TILE, box.d * TILE);
  }

  const g = roomCanvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(world, 0, 0, roomCanvas.width, roomCanvas.height);
}

// --- Day and night ---
// The room is tinted with the time of day, and lamps glow once it's dark.

const DAY_LIGHT = [
  [0, '#4A5688', 0.72], [5, '#4A5688', 0.72], [6.5, '#E8B9A8', 0.35], [8, '#FFFFFF', 0],
  [16.5, '#FFFFFF', 0], [18, '#F2B98A', 0.38], [19.5, '#B98AA8', 0.55], [21, '#4A5688', 0.72], [24, '#4A5688', 0.72],
];

function hourNow() {
  if (previewHour !== null) return previewHour;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

function lightAt(hour) {
  let i = 0;
  while (i < DAY_LIGHT.length - 2 && DAY_LIGHT[i + 1][0] <= hour) i++;
  const [h0, c0, a0] = DAY_LIGHT[i];
  const [h1, c1, a1] = DAY_LIGHT[i + 1];
  const t = h1 === h0 ? 0 : (hour - h0) / (h1 - h0);
  const [r0, g0, b0] = hexToRgb(c0);
  const [r1, g1, b1] = hexToRgb(c1);
  const mix = (a, b) => Math.round((a + (b - a) * t) * 255);
  return { colour: `rgb(${mix(r0, r1)}, ${mix(g0, g1)}, ${mix(b0, b1)})`, amount: a0 + (a1 - a0) * t };
}

function timeWord(hour) {
  if (hour < 5) return 'night';
  if (hour < 8) return 'early morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 19.5) return 'evening';
  if (hour < 21) return 'dusk';
  return 'night';
}

// Returns how dark it is, from 0 (day) to 1 (night).
function drawDayLight() {
  const { colour, amount } = lightAt(hourNow());
  if (amount <= 0.01) return 0;
  wg.globalCompositeOperation = 'multiply';
  wg.globalAlpha = amount;
  wg.fillStyle = colour;
  wg.fillRect(0, 0, world.width, world.height);
  wg.globalAlpha = 1;
  const dark = Math.max(0, Math.min(1, (amount - 0.25) / 0.47));
  if (dark > 0) {
    wg.globalCompositeOperation = 'screen';
    for (const p of placed) {
      if (!pieces.get(p.piece).light) continue;
      const s = spot(p);
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h * 0.35;
      const glow = wg.createRadialGradient(cx, cy, 0, cx, cy, 44);
      glow.addColorStop(0, `rgba(255, 210, 140, ${0.75 * dark})`);
      glow.addColorStop(0.4, `rgba(255, 190, 120, ${0.3 * dark})`);
      glow.addColorStop(1, 'rgba(255, 190, 120, 0)');
      wg.fillStyle = glow;
      wg.fillRect(cx - 44, cy - 44, 88, 88);
    }
  }
  wg.globalCompositeOperation = 'source-over';
  return dark;
}

// --- The cat ---

let catSheet = null;
// on: the furniture the cat is sitting or sleeping on (a placed id), lift: how many
// pixels up it sits there.
const catState = { x: 0, y: 0, tx: 0, ty: 0, path: [], mode: 'idle', anim: 'sitDown', animStart: 0, flip: false, until: 0, hearts: 0, placed: false, on: null, onAt: '', lift: 0 };
const HOP_TIME = 450;
const CAT_SPEED = 22; // room pixels a second

const tileCentre = (tx, ty) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + 13 });

function setAnim(key, now) {
  if (catState.anim !== key) {
    catState.anim = key;
    catState.animStart = now;
  }
}

function freeFloorTiles() {
  const blocked = blockedTiles();
  const out = [];
  for (let y = room.wallRows; y < rows(); y++) for (let x = 0; x < room.cols; x++) if (!blocked.has(`${x},${y}`)) out.push([x, y]);
  return out;
}

// The shortest way between two tiles, around the furniture.
function findPath(from, to) {
  const blocked = blockedTiles();
  const key = ([x, y]) => `${x},${y}`;
  const came = new Map([[key(from), null]]);
  const queue = [from];
  while (queue.length) {
    const here = queue.shift();
    if (here[0] === to[0] && here[1] === to[1]) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [here[0] + dx, here[1] + dy];
      if (next[0] < 0 || next[0] >= room.cols || next[1] < room.wallRows || next[1] >= rows()) continue;
      if (blocked.has(key(next)) || came.has(key(next))) continue;
      came.set(key(next), here);
      queue.push(next);
    }
  }
  if (!came.has(key(to))) return null;
  const path = [];
  for (let at = to; at; at = came.get(key(at))) path.unshift(at);
  return path.slice(1);
}

function placeCat() {
  const free = freeFloorTiles();
  const [tx, ty] = free.length ? free[Math.floor(Math.random() * free.length)] : [0, room.wallRows];
  Object.assign(catState, { tx, ty, ...tileCentre(tx, ty), path: [], mode: 'idle', until: 0, placed: true, on: null, lift: 0 });
}

// --- Furniture the cat sits and sleeps on (a piece marked "the cat can sit and
// sleep on it"). The cat walks up next to it, hops on, and hops off again after.

const placedAt = (p) => `${p.x},${p.y},${p.view || 0}`;
const catSpots = () => placed.filter((p) => pieces.get(p.piece).catSpot && pieces.get(p.piece).type === 'furniture');

// Drawn just in front of the furniture it's on, so it sits on top.
function catSortY() {
  const spotUnder = catState.on && placed.find((p) => p.id === catState.on);
  if (!spotUnder) return catState.y;
  const b = boxOf(spotUnder);
  return (b.y + b.d) * TILE + 0.3;
}

// Free floor tiles beside a piece (not corners), the ones in front first.
function besideTiles(p) {
  const b = boxOf(p);
  const blocked = blockedTiles();
  const out = [];
  for (let y = b.y - 1; y <= b.y + b.d; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
    const insideX = x >= b.x && x < b.x + b.w;
    const insideY = y >= b.y && y < b.y + b.d;
    if (insideX === insideY) continue; // the piece itself, or a corner
    if (x < 0 || x >= room.cols || y < room.wallRows || y >= rows() || blocked.has(`${x},${y}`)) continue;
    out.push([x, y]);
  }
  return out.sort((a, c) => c[1] - a[1]);
}

// Walks to the furniture, then hops on to sit or sleep. False if it can't get there.
function goToSpot(spotPlaced, kind, now) {
  const b = boxOf(spotPlaced);
  let best = null;
  for (const tile of besideTiles(spotPlaced)) {
    const path = tile[0] === catState.tx && tile[1] === catState.ty ? [] : findPath([catState.tx, catState.ty], tile);
    if (path && (!best || path.length < best.path.length)) best = { tile, path };
  }
  if (!best) return false;
  // It settles on the front row of the furniture, in the middle.
  const onTile = [b.x + Math.floor((b.w - 1) / 2), b.y + b.d - 1];
  catState.goal = { spot: spotPlaced.id, tile: onTile, kind };
  if (best.path.length) {
    catState.after = 'hop';
    startWalk(best.path, now);
  } else {
    hopOn(now);
  }
  return true;
}

function startHop(to, lift, now) {
  catState.mode = 'hop';
  catState.hop = { x0: catState.x, y0: catState.y, l0: catState.lift, x1: to.x, y1: to.y, l1: lift, start: now };
  const dx = to.x - catState.x;
  const dy = to.y - catState.y;
  let key;
  if (Math.abs(dx) > Math.abs(dy)) key = dx > 0 ? 'walkRight' : 'walkLeft';
  else key = dy > 0 ? 'walkDown' : 'walkUp';
  catState.flip = key === 'walkLeft';
  setAnim(key, now);
}

function hopOn(now) {
  const goal = catState.goal;
  const spotPlaced = goal && placed.find((p) => p.id === goal.spot);
  if (!spotPlaced) {
    startRest('idle', now, 0);
    return;
  }
  catState.on = spotPlaced.id;
  catState.onAt = placedAt(spotPlaced);
  const b = boxOf(spotPlaced);
  const to = { x: (b.x + b.w / 2) * TILE, y: tileCentre(...goal.tile).y };
  startHop(to, pieces.get(spotPlaced.piece).catLift ?? 8, now);
}

function hopOff(now) {
  const spotPlaced = placed.find((p) => p.id === catState.on);
  const exits = spotPlaced ? besideTiles(spotPlaced) : [];
  catState.goal = null;
  if (!exits.length) {
    // Nowhere free to hop down to: stay a little longer.
    startRest('sit', now, 0);
    return;
  }
  const [tx, ty] = exits[0];
  catState.exit = [tx, ty];
  catState.on = null;
  startHop(tileCentre(tx, ty), 0, now);
}

function finishHop(now, dark) {
  const h = catState.hop;
  Object.assign(catState, { x: h.x1, y: h.y1, lift: h.l1, hop: null });
  if (catState.on && catState.goal) {
    [catState.tx, catState.ty] = catState.goal.tile;
    startRest(catState.goal.kind, now, dark);
  } else {
    if (catState.exit) [catState.tx, catState.ty] = catState.exit;
    catState.exit = null;
    startRest('idle', now, dark);
  }
}

// What the cat does next: wander, sit and wash, or sleep. It sleeps more at night,
// and likes a rug for it.
function nextCatPlan(now, dark) {
  if (catState.on) return hopOff(now);
  const r = Math.random();
  const sleepy = 0.12 + 0.65 * dark;
  const spots = catSpots();
  const someSpot = () => spots[Math.floor(Math.random() * spots.length)];
  if (r < sleepy && spots.length && Math.random() < 0.75 && goToSpot(someSpot(), 'sleep', now)) return;
  if (r >= sleepy && r < sleepy + 0.3 && spots.length && Math.random() < 0.5 && goToSpot(someSpot(), 'sit', now)) return;
  if (r < sleepy) {
    const rugTiles = [];
    for (const p of placed) {
      if (pieces.get(p.piece).type !== 'rug') continue;
      const b = boxOf(p);
      for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++) rugTiles.push([x, y]);
    }
    const blocked = blockedTiles();
    const cosy = rugTiles.filter(([x, y]) => !blocked.has(`${x},${y}`));
    const goal = cosy.length && Math.random() < 0.8 ? cosy[Math.floor(Math.random() * cosy.length)] : null;
    const path = goal && findPath([catState.tx, catState.ty], goal);
    catState.after = 'sleep';
    if (path && path.length) return startWalk(path, now);
    return startRest('sleep', now, dark);
  }
  if (r < sleepy + 0.3) return startRest('sit', now, dark);
  const free = freeFloorTiles();
  for (let tries = 0; tries < 8 && free.length; tries++) {
    const goal = free[Math.floor(Math.random() * free.length)];
    const path = findPath([catState.tx, catState.ty], goal);
    if (path && path.length) {
      catState.after = Math.random() < 0.5 ? 'sit' : 'idle';
      return startWalk(path, now);
    }
  }
  return startRest('sit', now, dark);
}

function startWalk(path, now) {
  catState.mode = 'walk';
  catState.path = path;
  catState.animStart = now;
}

function startRest(kind, now, dark) {
  catState.mode = kind;
  if (kind === 'sleep') {
    setAnim('lieDown', now);
    catState.until = now + (dark > 0.5 ? 90000 + Math.random() * 120000 : 25000 + Math.random() * 30000);
  } else if (kind === 'sit') {
    setAnim('sitDown', now);
    catState.until = now + 5000 + Math.random() * 8000;
  } else {
    catState.until = now + 1500 + Math.random() * 2500;
  }
}

let lastTick = 0;
function moveCat(now, dark) {
  if (!catState.placed) placeCat();
  // If the furniture it's on was moved or put away, the cat lands on the floor.
  if (catState.on) {
    const spotPlaced = placed.find((p) => p.id === catState.on);
    if (!spotPlaced || placedAt(spotPlaced) !== catState.onAt || (held && held.from && held.from.id === catState.on)) placeCat();
  }
  const dt = Math.min(0.1, (now - (lastTick || now)) / 1000);
  lastTick = now;
  if (catState.mode === 'hop') {
    const h = catState.hop;
    const t = Math.min(1, (now - h.start) / HOP_TIME);
    catState.x = h.x0 + (h.x1 - h.x0) * t;
    catState.y = h.y0 + (h.y1 - h.y0) * t;
    catState.lift = h.l0 + (h.l1 - h.l0) * t + 7 * Math.sin(Math.PI * t);
    if (t >= 1) finishHop(now, dark);
    return;
  }
  if (catState.mode === 'walk') {
    const next = catState.path[0];
    if (!next) {
      const after = catState.after || 'idle';
      catState.after = null;
      if (after === 'hop') hopOn(now);
      else startRest(after, now, dark);
      return;
    }
    const goal = tileCentre(next[0], next[1]);
    const dx = goal.x - catState.x;
    const dy = goal.y - catState.y;
    const dist = Math.hypot(dx, dy);
    const step = CAT_SPEED * dt;
    if (dist <= step) {
      Object.assign(catState, goal);
      [catState.tx, catState.ty] = next;
      catState.path.shift();
    } else {
      catState.x += (dx / dist) * step;
      catState.y += (dy / dist) * step;
    }
    let key;
    if (Math.abs(dx) > Math.abs(dy)) key = dx > 0 ? 'walkRight' : 'walkLeft';
    else key = dy > 0 ? 'walkDown' : 'walkUp';
    catState.flip = key === 'walkLeft';
    catState.anim = key;
    return;
  }
  // Sitting: after sitting down, wash now and then.
  if (catState.mode === 'sit' && animDone(now)) {
    const sitting = Math.floor((now - catState.animStart) / 3000) % 3 === 2;
    if (catState.anim === 'sitDown' && sitting) setAnim('groom', now);
    else if (catState.anim === 'groom' && now - catState.animStart > 2600) setAnim('sitDown', now - 60000);
  }
  if (catState.mode === 'sleep' && catState.anim === 'lieDown' && animDone(now)) setAnim('sleep', now);
  if (now > catState.until) nextCatPlan(now, dark);
}

function animSetting(key) {
  const a = cat.anims[key];
  // "Walking left" can be "walking right", turned around.
  if (key === 'walkLeft' && a.flip) return { ...cat.anims.walkRight, mirror: true };
  // After walking left, the cat lies down facing left too.
  return { ...a, mirror: catState.flip && (key === 'lieDown' || key === 'sleep') };
}

function animDone(now) {
  const a = cat.anims[catState.anim];
  const meta = CAT_ANIMS.find((m) => m.key === catState.anim);
  if (!meta || !meta.once) return true;
  return (now - catState.animStart) / 1000 * a.fps >= a.count;
}

function catFrame(now) {
  const a = animSetting(catState.anim);
  const meta = CAT_ANIMS.find((m) => m.key === catState.anim);
  let i = Math.floor(((now - catState.animStart) / 1000) * a.fps);
  i = meta && meta.once ? Math.min(i, a.count - 1) : i % Math.max(1, a.count);
  return { frame: a.start + i, mirror: a.mirror };
}

function drawCatFrame(g, sheet, frame, x, y, mirror) {
  const across = Math.max(1, Math.floor(sheet.naturalWidth / cat.fw));
  const sx = (frame % across) * cat.fw;
  const sy = Math.floor(frame / across) * cat.fh;
  g.save();
  if (mirror) {
    g.translate(x + cat.fw, y);
    g.scale(-1, 1);
    g.drawImage(sheet, sx, sy, cat.fw, cat.fh, 0, 0, cat.fw, cat.fh);
  } else {
    g.drawImage(sheet, sx, sy, cat.fw, cat.fh, x, y, cat.fw, cat.fh);
  }
  g.restore();
}

function catBox() {
  return { x: Math.round(catState.x - cat.fw / 2), y: Math.round(catState.y - catState.lift - cat.fh + 3), w: cat.fw, h: cat.fh };
}

function drawCat(now) {
  if (!catSheet) return;
  const { frame, mirror } = catFrame(now);
  const b = catBox();
  drawCatFrame(wg, catSheet, frame, b.x, b.y, mirror);
}

// Little pixel hearts when you pet the cat, and z's while it sleeps.
const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
const ZED = ['###', '..#', '.#.', '###'];
function drawPixels(rowsOfPixels, x, y, colour) {
  wg.fillStyle = colour;
  rowsOfPixels.forEach((line, j) => [...line].forEach((c, i) => { if (c === '#') wg.fillRect(Math.round(x) + i, Math.round(y) + j, 1, 1); }));
}

function drawCatExtras(now) {
  if (!catSheet) return;
  const b = catBox();
  if (catState.hearts > now) {
    const t = 1 - (catState.hearts - now) / 1600;
    wg.globalAlpha = Math.min(1, 2 - t * 2);
    drawPixels(HEART, b.x + b.w / 2 - 3, b.y + 4 - t * 12, '#E0607A');
    wg.globalAlpha = 1;
  }
  if (catState.mode === 'sleep' && catState.anim === 'sleep') {
    const t = ((now - catState.animStart) / 2400) % 1;
    wg.globalAlpha = Math.sin(t * Math.PI);
    drawPixels(ZED, b.x + b.w / 2 + 4 + t * 4, b.y + 8 - t * 10, '#FFFFFF');
    wg.globalAlpha = 1;
  }
}

function petCat(now) {
  catState.hearts = now + 1600;
  if (navigator.vibrate) navigator.vibrate(10);
  if (catState.mode === 'walk') {
    catState.path = [];
    catState.after = null;
    catState.goal = null;
    startRest('sit', now, 0);
  } else if (catState.mode !== 'sleep') {
    catState.until = Math.max(catState.until, now + 4000);
  }
}

// --- The loop that draws the room while it's on screen ---

let roomRunning = false;
function roomFrame(now) {
  if (currentView() !== 'home' || document.hidden) {
    roomRunning = false;
    return;
  }
  const dark = Math.max(0, Math.min(1, (lightAt(hourNow()).amount - 0.25) / 0.47));
  moveCat(now, dark);
  drawRoom(now);
  requestAnimationFrame(roomFrame);
}
function startRoomLoop() {
  if (roomRunning) return;
  roomRunning = true;
  lastTick = 0;
  requestAnimationFrame(roomFrame);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && currentView() === 'home') startRoomLoop(); });

// --- Touching the room ---

function toRoom(event) {
  const r = roomCanvas.getBoundingClientRect();
  return { x: ((event.clientX - r.left) / r.width) * world.width, y: ((event.clientY - r.top) / r.height) * world.height };
}

// Moves the piece in your hand so its tiles sit under your finger.
function moveHeldTo(point) {
  const box = boxOf(held);
  const [top, bottom] = rowsFor(pieces.get(held.piece).type);
  held.x = Math.max(0, Math.min(room.cols - box.w, Math.round(point.x / TILE - box.w / 2)));
  held.y = Math.max(top, Math.min(bottom - box.d, Math.round(point.y / TILE - box.d / 2)));
  const place = document.querySelector('[data-room="place"]');
  if (place) place.disabled = !canPlace(held);
}

// The piece under a finger: the picture's own pixels count, not its see-through edges.
const pixelCache = new WeakMap();
function solidAt(img, x, y) {
  if (!pixelCache.has(img)) pixelCache.set(img, pictureCanvas(img).getContext('2d').getImageData(0, 0, img.naturalWidth, img.naturalHeight));
  const d = pixelCache.get(img);
  return x >= 0 && y >= 0 && x < d.width && y < d.height && d.data[(Math.floor(y) * d.width + Math.floor(x)) * 4 + 3] > 0;
}
function pieceAt(point) {
  const list = drawList().filter((t) => !t.cat).reverse();
  for (const { p } of list) {
    const img = picture(viewOf(pieces.get(p.piece), p.view).src);
    const s = spot(p);
    if (img && solidAt(img, point.x - s.x, point.y - s.y)) return p;
  }
  return null;
}

let dragging = false;
roomCanvas.addEventListener('pointerdown', (event) => {
  if (!held) return;
  dragging = true;
  roomCanvas.setPointerCapture(event.pointerId);
  moveHeldTo(toRoom(event));
});
roomCanvas.addEventListener('pointermove', (event) => {
  if (dragging) moveHeldTo(toRoom(event));
});
roomCanvas.addEventListener('pointerup', (event) => {
  if (dragging) {
    dragging = false;
    return;
  }
  const point = toRoom(event);
  if (decorating) {
    const p = pieceAt(point);
    if (p) pickUp(p);
    return;
  }
  const b = catBox();
  if (point.x >= b.x - 4 && point.x <= b.x + b.w + 4 && point.y >= b.y && point.y <= b.y + b.h) petCat(performance.now());
});

function pickUp(p) {
  const piece = pieces.get(p.piece);
  if (piece.surface && thingsOn(p).length) {
    roomNote(`Take the things off the ${piece.name.toLowerCase()} first.`);
    return;
  }
  held = { piece: p.piece, view: p.view || 0, x: p.x, y: p.y, from: p };
  showRoomPanel();
}

function holdPiece(piece) {
  const [top, bottom] = rowsFor(piece.type);
  held = { piece: piece.id, view: 0, x: 0, y: 0, from: null };
  moveHeldTo({ x: (room.cols * TILE) / 2, y: ((top + bottom) / 2) * TILE });
  showRoomPanel();
}

async function placeHeld() {
  if (!held || !canPlace(held)) return;
  const item = await putItem({ id: held.from ? held.from.id : newId('placed'), kind: 'placed', day: '', piece: held.piece, view: held.view, x: held.x, y: held.y });
  placed = placed.filter((p) => p.id !== item.id).concat(item);
  held = null;
  showRoomPanel();
  showBackupInfo();
}

async function putAway() {
  if (held && held.from) {
    await deleteItem(held.from.id);
    placed = placed.filter((p) => p.id !== held.from.id);
  }
  held = null;
  showRoomPanel();
}

function turnHeld() {
  const piece = pieces.get(held.piece);
  held.view = (held.view + 1) % piece.views.length;
  const box = boxOf(held);
  moveHeldTo({ x: (held.x + box.w / 2) * TILE, y: (held.y + box.d / 2) * TILE });
}

// --- The panel under the room ---

let noteTimer = 0;
function roomNote(text) {
  const note = $('room-note');
  note.textContent = text;
  note.hidden = false;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { note.hidden = true; }, 3500);
}

function placedCount(id) {
  return placed.filter((p) => p.piece === id).length;
}

function catStatus() {
  const spotPlaced = catState.on && catState.mode !== 'hop' && placed.find((p) => p.id === catState.on);
  const where = spotPlaced ? ` on the ${pieces.get(spotPlaced.piece).name.toLowerCase()}` : '';
  if (catState.mode === 'sleep') return `${cat.name} is asleep${where}`;
  if (catState.mode === 'walk' || catState.mode === 'hop') return `${cat.name} is wandering about`;
  if (where) return `${cat.name} is${where}`;
  return `${cat.name} is here`;
}

function showRoomPanel() {
  const bar = $('room-bar');
  const panel = $('room-panel');
  $('room-light').textContent = previewHour === null ? 'Clock' : LIGHT_STEPS.find(([hour]) => hour === previewHour)?.[1] || timeWord(previewHour);
  if (!decorating) {
    bar.innerHTML = `<span class="grow muted" id="room-status">${escapeHtml(catStatus())}, ${timeWord(hourNow())}.</span>
      <button class="ink-button" type="button" data-room="decorate">Decorate</button>`;
    panel.innerHTML = '';
    return;
  }
  if (held) {
    const piece = pieces.get(held.piece);
    bar.innerHTML = `<span class="grow"><b>${escapeHtml(piece.name)}</b><span class="muted"> · drag it to a spot</span></span>
      ${piece.views.length > 1 ? '<button class="text-button" type="button" data-room="turn">Turn</button>' : ''}
      ${held.from ? '<button class="text-button" type="button" data-room="away">Put away</button>' : '<button class="text-button" type="button" data-room="cancel">Cancel</button>'}
      <button class="ink-button" type="button" data-room="place"${canPlace(held) ? '' : ' disabled'}>Place</button>`;
  } else {
    bar.innerHTML = `<span class="grow muted">Tap a piece below to place it, or one in the room to move it.</span>
      <button class="ink-button" type="button" data-room="done">Done</button>`;
  }
  const tabs = [['all', 'All'], ...PIECE_TYPES.map(([key, name]) => [key, name])];
  const list = [...pieces.values()]
    .filter((p) => inventoryTab === 'all' || p.type === inventoryTab)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  panel.innerHTML = `
    ${sampleMode ? '<p class="muted">Sample data is on, so changes to the room are only kept until you turn it off.</p>' : ''}
    <nav class="inv-tabs" aria-label="Kinds of pieces">${tabs.map(([key, name]) => `<button type="button" class="chip" data-inv-tab="${key}" aria-pressed="${key === inventoryTab}">${name}</button>`).join('')}</nav>
    <div class="inventory">
      <button type="button" class="inv-tile inv-add" data-room="add"><span class="inv-plus">+</span><span class="inv-name">Add</span></button>
      ${list.map((p) => {
        const left = (p.count || 1) - placedCount(p.id);
        const flat = p.type === 'wallpaper' || p.type === 'floor';
        const using = (p.type === 'wallpaper' && room.wallpaper === p.id) || (p.type === 'floor' && room.floor === p.id);
        const badge = flat ? (using ? 'in use' : '') : left > 0 ? `${left}` : 'all out';
        return `<button type="button" class="inv-tile${!flat && left <= 0 ? ' used' : ''}${using ? ' using' : ''}" data-piece="${p.id}">
          <img class="pixel" src="${p.views[0].src}" alt="" style="--pw: ${p.views[0].pw}; --ph: ${p.views[0].ph}">
          <span class="inv-name">${escapeHtml(p.name)}</span>${badge ? `<span class="inv-badge">${badge}</span>` : ''}</button>`;
      }).join('')}
    </div>
    ${pieces.size ? '' : `<p class="muted">Nothing here yet. Add your own pieces, or start with the placeholder ones.</p>
      <p><button class="ink-button" type="button" data-room="starter">Add the starter pieces</button></p>`}
    <div class="buttons room-more">
      <button class="text-button" type="button" data-room="edit" aria-pressed="${editingPieces}">${editingPieces ? 'Stop editing pieces' : 'Edit pieces'}</button>
      <button class="text-button" type="button" data-room="settings">Room</button>
      <button class="text-button" type="button" data-room="draw">Draw</button>
      <button class="text-button" type="button" data-room="cat">Cat</button>
    </div>
    ${editingPieces ? '<p class="muted">Tap a piece above to rename it, change it, or delete it.</p>' : ''}`;
}

$('room-bar').addEventListener('click', roomButton);
$('room-panel').addEventListener('click', roomButton);

async function roomButton(event) {
  const tab = event.target.closest('[data-inv-tab]');
  if (tab) {
    inventoryTab = tab.dataset.invTab;
    try { localStorage.setItem('keystone-inventory-tab', inventoryTab); } catch { /* not important */ }
    showRoomPanel();
    return;
  }
  const tile = event.target.closest('[data-piece]');
  if (tile) return tapPiece(pieces.get(tile.dataset.piece));
  const button = event.target.closest('[data-room]');
  if (!button) return;
  const action = button.dataset.room;
  if (action === 'decorate') { decorating = true; showRoomPanel(); }
  if (action === 'done') { decorating = false; editingPieces = false; held = null; showRoomPanel(); }
  if (action === 'place') placeHeld();
  if (action === 'turn') turnHeld();
  if (action === 'cancel') { held = null; showRoomPanel(); }
  if (action === 'away') putAway();
  if (action === 'add') { cutFor = null; goTo('room-add'); }
  if (action === 'cat') goTo('cat');
  if (action === 'draw') { drawFor = null; goTo('draw'); }
  if (action === 'edit') { editingPieces = !editingPieces; showRoomPanel(); }
  if (action === 'settings') openRoomSettings();
  if (action === 'starter') {
    button.disabled = true;
    await addStarterPieces();
    await loadRoom();
    showRoomPanel();
  }
}

async function tapPiece(piece) {
  if (editingPieces) return openPieceDetails(piece);
  if (piece.type === 'wallpaper' || piece.type === 'floor') {
    room[piece.type] = room[piece.type] === piece.id ? '' : piece.id;
    await saveRoomSettings();
    showRoomPanel();
    return;
  }
  if ((piece.count || 1) - placedCount(piece.id) <= 0) {
    roomNote(`Every ${piece.name.toLowerCase()} is in the room. Tap one there to move it.`);
    return;
  }
  holdPiece(piece);
}

// --- Sheets: a piece's details, and the room's size and light ---

function pieceTypeChoices(current) {
  return `<label class="field"><span>What it is</span><select name="type">${PIECE_TYPES.map(([key, name]) => `<option value="${key}"${key === current ? ' selected' : ''}>${name}</option>`).join('')}</select></label>`;
}

function openPieceDetails(piece) {
  const views = piece.views.map((v, i) => `<div class="view-row">
      <img class="pixel" src="${v.src}" alt="" style="--pw: ${v.pw}; --ph: ${v.ph}">
      <label>Wide <input type="number" name="w${i}" min="1" max="12" value="${v.w}"></label>
      <label>Deep <input type="number" name="d${i}" min="1" max="12" value="${v.d}"></label>
      <button class="text-button" type="submit" value="draw-${i}">Draw</button>
      ${i ? `<button class="text-button danger" type="submit" value="unview-${i}">Remove</button>` : ''}
    </div>`).join('');
  openSheet('Piece', `
    <label class="field"><span>Name</span><input name="name" type="text" value="${escapeHtml(piece.name)}" required autocomplete="off"></label>
    ${pieceTypeChoices(piece.type)}
    <label class="field"><span>How many you have</span><input name="count" type="number" min="1" max="99" value="${piece.count || 1}"></label>
    <h3>Looks and tiles</h3>
    <p class="muted">Each look is one way the piece can be turned. The tiles are what it stands on.</p>
    ${views}
    <p><button class="text-button" type="submit" value="addview">Add a turned look</button></p>
    <label class="check"><input type="checkbox" name="surface"${piece.surface ? ' checked' : ''}><span>Things can go on top (like a table)</span></label>
    <label class="field"><span>Table height, in pixels <span class="muted">(how high things sit on it)</span></span><input name="lift" type="number" min="0" max="64" value="${piece.lift || 16}"></label>
    <label class="check"><input type="checkbox" name="light"${piece.light ? ' checked' : ''}><span>Gives light at night</span></label>
    <label class="check"><input type="checkbox" name="catSpot"${piece.catSpot ? ' checked' : ''}><span>${escapeHtml(cat.name)} can sit and sleep on it</span></label>
    <label class="field"><span>How high ${escapeHtml(cat.name)} sits on it, in pixels</span><input name="catLift" type="number" min="0" max="64" value="${piece.catLift ?? 8}"></label>
    <p><button class="text-button danger" type="submit" value="delete">Delete this piece</button></p>`,
  async (form, submitter) => {
    const action = submitter && submitter.value;
    if (action === 'delete') {
      const inRoom = placed.filter((p) => p.piece === piece.id);
      if (!confirm(inRoom.length ? `Delete ${piece.name}? The ${inRoom.length} in the room go too.` : `Delete ${piece.name}?`)) return false;
      for (const p of inRoom) await deleteItem(p.id);
      if (room.wallpaper === piece.id) room.wallpaper = '';
      if (room.floor === piece.id) room.floor = '';
      await saveRoomSettings();
      await deleteItem(piece.id);
      await loadRoom();
      showRoomPanel();
      return true;
    }
    const views = piece.views.map((v, i) => ({ ...v, w: Number(form.elements[`w${i}`].value) || 1, d: Number(form.elements[`d${i}`].value) || 1 }));
    if (action && action.startsWith('unview-')) views.splice(Number(action.slice(7)), 1);
    const saved = await putItem({
      ...piece, name: form.elements.name.value.trim() || piece.name, type: form.elements.type.value,
      count: Math.max(1, Number(form.elements.count.value) || 1), views,
      surface: form.elements.surface.checked, lift: Number(form.elements.lift.value) || 0, light: form.elements.light.checked,
      catSpot: form.elements.catSpot.checked, catLift: Math.max(0, Number(form.elements.catLift.value) || 0),
    });
    pieces.set(saved.id, saved);
    showRoomPanel();
    if (action && action.startsWith('draw-')) {
      drawFor = { piece: saved.id, view: Number(action.slice(5)) };
      goTo('draw');
    } else if (action === 'addview') {
      cutFor = saved.id;
      goTo('room-add');
    } else if (action && action.startsWith('unview-')) {
      openPieceDetails(saved);
      return false;
    }
    return true;
  });
}

function openRoomSettings() {
  const hour = previewHour === null ? hourNow() : previewHour;
  openSheet('Room', `
    <label class="field"><span>Tiles across</span><input name="cols" type="number" min="6" max="24" value="${room.cols}"></label>
    <label class="field"><span>Wall rows</span><input name="wallRows" type="number" min="1" max="6" value="${room.wallRows}"></label>
    <label class="field"><span>Floor rows</span><input name="floorRows" type="number" min="3" max="16" value="${room.floorRows}"></label>
    <p class="muted">Pieces that no longer fit go back to the inventory.</p>
    <h3>Light</h3>
    <label class="check"><input type="checkbox" name="clock"${previewHour === null ? ' checked' : ''}><span>Follow the clock</span></label>
    <label class="field"><span>Or try a time of day: <b id="hour-word">${timeWord(hour)}</b></span>
      <input name="hour" type="range" min="0" max="23.75" step="0.25" value="${hour}"></label>
    <p class="muted">Trying a time only lasts until the app closes.</p>`,
  async (form) => {
    const size = (name, min, max) => Math.max(min, Math.min(max, Math.round(Number(form.elements[name].value)) || room[name]));
    room.cols = size('cols', 6, 24);
    room.wallRows = size('wallRows', 1, 6);
    room.floorRows = size('floorRows', 3, 16);
    previewHour = form.elements.clock.checked ? null : Number(form.elements.hour.value);
    await saveRoomSettings();
    for (const p of [...placed]) {
      if (canPlace({ ...p, from: p })) continue;
      await deleteItem(p.id);
      placed = placed.filter((q) => q.id !== p.id);
    }
    sizeRoom();
    catState.placed = false;
    showRoomPanel();
    return true;
  });
  const form = $('sheet-form');
  form.elements.hour.addEventListener('input', () => {
    form.elements.clock.checked = false;
    $('hour-word').textContent = timeWord(Number(form.elements.hour.value));
    previewHour = Number(form.elements.hour.value);
  });
}

// The light button at the top: follow the clock, or pick a time of day to see
// the room in. A picked time lasts until the app closes.
const LIGHT_STEPS = [[null, 'Clock'], [10, 'Day'], [18, 'Evening'], [22.5, 'Night']];
$('room-light').addEventListener('click', () => {
  const i = LIGHT_STEPS.findIndex(([hour]) => hour === previewHour);
  previewHour = LIGHT_STEPS[(i + 1) % LIGHT_STEPS.length][0];
  showRoomPanel();
});

// --- Showing the page ---

async function showRoom() {
  await loadRoom();
  showRoomPanel();
  startRoomLoop();
}

// Keeps the words under the room up to date.
setInterval(() => {
  const status = $('room-status');
  if (status && currentView() === 'home') status.textContent = `${catStatus()}, ${timeWord(hourNow())}.`;
}, 2000);
