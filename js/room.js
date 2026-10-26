// room.js: the cottage room on the home page. A pixel-art room on a grid of
// 16 x 16 pixel tiles, with a cat walking about and the light following the clock.
//
// Everything is saved as items (see db.js), so it all goes in your backup file:
//   { id: "piece-...", kind: "piece", day: "", name, type, count, surface, lift, light, catSpot, catLift, catShift, lightX, lightY, toy,
//     set, family, rarity, locked,           set: the furniture set it belongs to. family: the
//                                            piece it's a colour of (its id), so colours sit
//                                            together in the catalogue. locked: still in the
//                                            gacha machine (see room-gacha.js).
//     sheet                                  the picture it was cut from, and each view's
//                                            box on it, so other colours of that sheet can
//                                            be cut the same way (see room-add.js).
//     views: [{ src, pw, ph, w, d, on }] }   one thing in your inventory. Each view is
//                                            one way it can be turned: its picture
//                                            (src, pw x ph pixels) and the tiles it
//                                            stands on (w wide, d deep). A lamp's
//                                            on: { src, pw, ph, box } is its lit look.
//   { id: "placed-...", kind: "placed", day: "", piece, view, x, y, lit, ox, oy, layer }
//                                            one piece standing in the room, with the
//                                            top-left tile it stands on. lit: a lamp
//                                            that's switched on. A small piece can be
//                                            nudged ox, oy pixels off its tile, and
//                                            layer puts it in front of (higher) or
//                                            behind (lower) others on the same tile.
//   { id: "breed-...", kind: "breed", ... }           a cat's or duck's sprite sheet (room-duck.js)
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
// The piece in your hand: { piece, view, x, y, ox, oy, layer, from, riders }.
// riders: the small things on a table you picked up, which move with it,
// each { p, dx, dy } tiles from its corner.
let held = null;
let fine = false; // fine placement: arrows nudge a small piece by the pixel
let inventoryFolder = null; // the tag the inventory shows: 'set:<name>' ('set:' for no set) or 'type:<type>', or null for everything
let previewHour = null; // a chosen time of day, to try the light; null follows the clock

const roomCanvas = $('room-canvas');
const world = document.createElement('canvas');
const wg = world.getContext('2d');

// --- Loading ---

async function loadRoom() {
  pieces = new Map();
  placed = [];
  cat = defaultCat();
  duck = null;
  duckSheet = null;
  breeds = [];
  for (const item of await getAllItems()) {
    if (item.deleted) continue;
    if (item.kind === 'piece') pieces.set(item.id, item);
    if (item.kind === 'placed') placed.push(item);
    if (item.kind === 'room') Object.assign(room, item);
    if (item.kind === 'duck' && item.src) loadDuck(item);
    if (item.kind === 'breed') breeds.push(item);
    if (item.kind === 'cat') {
      cat = { ...defaultCat(), ...item, anims: { ...defaultCat().anims, ...item.anims } };
      // The crouch first started at frame 24 by mistake: the stretch frames are 30 and 31.
      const crouch = cat.anims.crouch;
      if (crouch.start === 24 && crouch.count === 2) cat.anims.crouch = { ...crouch, start: 30 };
    }
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
// The picture a placed piece shows: a lamp that's switched on shows its on look.
function lookOf(p) {
  const v = viewOf(pieces.get(p.piece), p.view);
  return p.lit && v.on ? v.on : v;
}

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
    if (type === piece.type && type !== 'small') return false;
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
  const v = lookOf(p);
  const box = boxOf(p);
  let bottom = (box.y + box.d) * TILE;
  if (piece.type === 'small') {
    const table = p.riding ? null : surfaceUnder(box.x, box.y, p.id);
    if (p.riding) bottom -= pieces.get(p.riding).lift || 16;
    else if (table) bottom -= pieces.get(table.piece).lift || 16;
    bottom += p.oy || 0;
  }
  const ox = piece.type === 'small' ? p.ox || 0 : 0;
  return { x: box.x * TILE + Math.floor((box.w * TILE - v.pw) / 2) + ox, y: bottom - v.ph, w: v.pw, h: v.ph };
}

function drawPiece(p, alpha = 1) {
  const img = picture(lookOf(p).src);
  if (!img) return;
  const s = spot(p);
  let bx = 0;
  let by = 0;
  // A toy the cat just batted wobbles.
  if (toyBump && toyBump.id === p.id) {
    const t = (performance.now() - toyBump.at) / 450;
    if (t < 1) {
      bx = Math.round(Math.sin(t * Math.PI * 3) * 2 * (1 - t));
      by = -Math.round(3 * Math.sin(Math.PI * t));
    }
  }
  wg.globalAlpha = alpha;
  wg.drawImage(img, s.x + bx, s.y + by);
  wg.globalAlpha = 1;
}

// The order things are drawn in: wall things, rugs, then everything standing,
// back to front.
function drawList() {
  const wall = [];
  const rugs = [];
  const standing = [];
  for (const p of placed) {
    if (held && held.from && (held.from.id === p.id || held.riders.some((r) => r.p.id === p.id))) continue;
    const piece = pieces.get(p.piece);
    const box = boxOf(p);
    if (piece.type === 'wall') wall.push({ y: box.y + box.d, p });
    else if (piece.type === 'rug') rugs.push({ y: box.y + box.d, p });
    else if (piece.type === 'small') {
      const table = surfaceUnder(box.x, box.y, p.id);
      // On the same tile, the layer decides first, then which is further forward.
      const nudge = (p.layer || 0) * 0.02 + (p.oy || 0) * 0.001;
      standing.push({ y: (table ? (boxOf(table).y + boxOf(table).d) * TILE + 0.25 : (box.y + 1) * TILE - 0.5) + nudge, p });
    } else standing.push({ y: (box.y + box.d) * TILE, p });
  }
  wall.sort((a, b) => a.y - b.y);
  rugs.sort((a, b) => a.y - b.y);
  if (catState.mode !== 'carried') standing.push({ y: catSortY(), cat: true });
  if (duckHere()) standing.push({ y: duckState.y - 0.1, duck: true });
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
    else if (thing.duck) drawDuck(now);
    else drawPiece(thing.p);
  }

  if (catState.mode === 'carried') {
    // Where the cat will land: furniture it can sit on, or a floor tile.
    const target = catDropTarget();
    const b = target.spot ? boxOf(target.spot) : { x: target.tile[0], y: target.tile[1], w: 1, d: 1 };
    dashedBox(b, true);
    if (target.spot) drawSeatGhost(target.spot);
    drawCat(now);
  }

  const light = drawDayLight();
  drawCatExtras(now, light);

  if (held) {
    // A faint tile grid while placing, then the piece, outlined in white where
    // it fits or red where it doesn't.
    wg.fillStyle = 'rgba(255, 255, 255, 0.07)';
    for (let x = TILE; x < W; x += TILE) wg.fillRect(x, 0, 1, world.height);
    for (let y = TILE; y < world.height; y += TILE) wg.fillRect(0, y, W, 1);
    const ok = canPlace(held);
    const box = boxOf(held);
    drawPiece(held, ok ? 0.9 : 0.6);
    for (const r of ridersAt(held)) drawPiece(r, ok ? 0.9 : 0.6);
    dashedBox(box, ok);
    if (pieces.get(held.piece).catSpot) drawSeatGhost(held);
  }

  const g = roomCanvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(world, 0, 0, roomCanvas.width, roomCanvas.height);
}

// A dashed pixel outline around some tiles: white for yes, red for no.
function dashedBox(b, ok) {
  const [x, y, w, h] = [b.x * TILE, b.y * TILE, b.w * TILE, b.d * TILE];
  wg.fillStyle = ok ? 'rgba(255, 255, 255, 0.85)' : 'rgba(232, 96, 96, 0.95)';
  for (let i = 0; i < w; i += 4) {
    wg.fillRect(x + i, y, 2, 1);
    wg.fillRect(x + i, y + h - 1, 2, 1);
  }
  for (let i = 0; i < h; i += 4) {
    wg.fillRect(x, y + i, 1, 2);
    wg.fillRect(x + w - 1, y + i, 1, 2);
  }
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

// A lamp's glow: how far it reaches, and how strong it is from the middle out.
const GLOW_R = 38;
const GLOW = [[0, 0.38], [0.35, 0.14], [1, 0]];

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
      const piece = pieces.get(p.piece);
      if (!piece.light || !p.lit) continue;
      const s = spot(p);
      const cx = s.x + s.w / 2 + (piece.lightX || 0);
      const cy = s.y + s.h * 0.35 + (piece.lightY || 0);
      const glow = wg.createRadialGradient(cx, cy, 0, cx, cy, GLOW_R);
      for (const [at, a] of GLOW) glow.addColorStop(at, `rgba(255, 200, 135, ${a * dark})`);
      wg.fillStyle = glow;
      wg.fillRect(cx - GLOW_R, cy - GLOW_R, GLOW_R * 2, GLOW_R * 2);
    }
  }
  wg.globalCompositeOperation = 'source-over';
  return dark;
}

// --- The cat ---

let catSheet = null;
// on: the furniture the cat is sitting or sleeping on (a placed id), lift: how many
// pixels up it sits there. mode is idle, walk, sit, sleep, hop, play or carried
// (in your hand). still: holds the first frame of the animation (crouching to pounce,
// or dangling in your hand). stay: put down while you decorate, so it stays put.
const catState = { x: 0, y: 0, tx: 0, ty: 0, path: [], mode: 'idle', anim: 'sitDown', animStart: 0, flip: false, until: 0, hearts: 0, placed: false, on: null, onAt: '', lift: 0, still: false, stay: false, fast: false, play: null, wantToy: null };
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
  // Playing, the cat stays in front of its toy.
  const toy = catState.play && placed.find((p) => p.id === catState.play.toy);
  if (toy) return Math.max(catState.y, (boxOf(toy).y + 1) * TILE);
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
  let best = null;
  for (const tile of besideTiles(spotPlaced)) {
    const path = tile[0] === catState.tx && tile[1] === catState.ty ? [] : findPath([catState.tx, catState.ty], tile);
    if (path && (!best || path.length < best.path.length)) best = { tile, path };
  }
  if (!best) return false;
  catState.goal = { spot: spotPlaced.id, tile: seatTile(spotPlaced), kind };
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
  const seat = seatPoint(spotPlaced);
  startHop({ x: seat.x, y: seat.y }, seat.lift, now);
}

// The tile the cat settles on, on the front row of the furniture, in the middle.
function seatTile(spotPlaced) {
  const b = boxOf(spotPlaced);
  return [b.x + Math.floor((b.w - 1) / 2), b.y + b.d - 1];
}

// Where the cat sits on a piece, in room pixels: the middle of its tiles, moved
// by the piece's own seat settings (catShift sideways, catLift up).
function seatPoint(spotPlaced) {
  const piece = pieces.get(spotPlaced.piece);
  const b = boxOf(spotPlaced);
  return { x: (b.x + b.w / 2) * TILE + (piece.catShift || 0), y: tileCentre(...seatTile(spotPlaced)).y, lift: piece.catLift ?? 8 };
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
    startRest(catState.landKind || 'idle', now, dark);
    catState.landKind = null;
  }
}

// What the cat does next: wander, sit and wash, or sleep. It sleeps more at night,
// and likes a rug for it.
function nextCatPlan(now, dark) {
  catState.stay = false;
  if (catState.on) return hopOff(now);
  if (catState.wantToy) {
    const toy = floorToys().find((p) => p.id === catState.wantToy);
    catState.wantToy = null;
    if (toy && goPlay(toy, now)) return;
  }
  // Now and then, in the day: play with a toy, or a dash about the room.
  const playful = 0.22 * (1 - dark);
  if (Math.random() < playful) {
    const toys = floorToys();
    if (toys.length && Math.random() < 0.7 && goPlay(toys[Math.floor(Math.random() * toys.length)], now)) return;
    if (zoom(now)) return;
  }
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

// --- Playing. A toy is a piece marked "a toy the cat plays with", on the floor
// (not on a table). The cat crouches, pounces at it and backs off, a few times.

function floorToys() {
  return placed.filter((p) => {
    const piece = pieces.get(p.piece);
    if (!piece.toy || piece.type === 'wall' || (held && held.from && held.from.id === p.id)) return false;
    return !(piece.type === 'small' && surfaceUnder(p.x, p.y, p.id));
  });
}

function goPlay(toy, now) {
  // It likes to pounce from the side, so the crouch faces the toy.
  const row = boxOf(toy).y + boxOf(toy).d - 1;
  let best = null;
  let bestScore = Infinity;
  for (const tile of besideTiles(toy)) {
    const path = tile[0] === catState.tx && tile[1] === catState.ty ? [] : findPath([catState.tx, catState.ty], tile);
    const score = path ? path.length + (tile[1] === row ? 0 : 4) : Infinity;
    if (score < bestScore) { best = path; bestScore = score; }
  }
  if (!best) return false;
  catState.play = { toy: toy.id };
  if (best.length) {
    catState.after = 'play';
    startWalk(best, now);
  } else {
    startPlay(now);
  }
  return true;
}

function toyCentre(toy) {
  const b = boxOf(toy);
  return { x: (b.x + b.w / 2) * TILE, y: (b.y + b.d) * TILE - 3 };
}

function faceTowards(x, y, now) {
  const dx = x - catState.x;
  const dy = y - catState.y;
  let key;
  if (Math.abs(dx) > Math.abs(dy)) key = dx > 0 ? 'walkRight' : 'walkLeft';
  else key = dy > 0 ? 'walkDown' : 'walkUp';
  catState.flip = key === 'walkLeft';
  setAnim(key, now);
}

function startPlay(now) {
  const toy = catState.play && placed.find((p) => p.id === catState.play.toy);
  if (!toy) {
    catState.play = null;
    startRest('sit', now, 0);
    return;
  }
  catState.mode = 'play';
  catState.play = { toy: toy.id, left: 3 + Math.floor(Math.random() * 3), home: { x: catState.x, y: catState.y } };
  crouch(now);
}

// Crouches low (the stretch frames), facing the toy, then wiggles before the pounce.
function crouch(now) {
  const pl = catState.play;
  const toy = placed.find((p) => p.id === pl.toy);
  const c = toyCentre(toy);
  catState.flip = c.x < catState.x - 2 || (Math.abs(c.x - catState.x) <= 2 && catState.flip);
  catState.anim = 'crouch';
  catState.animStart = now;
  catState.still = false;
  const a = cat.anims.crouch;
  const down = (a.count / a.fps) * 1000;
  Object.assign(pl, { phase: 'crouch', start: now, wiggleAt: now + down + 300 + Math.random() * 500, until: now + down + 900 + Math.random() * 900 });
}

let toyBump = null; // the toy the cat just batted: { id, at }
const POUNCE_TIME = 260;
const BACK_TIME = 420;

function playCat(now, dark) {
  const pl = catState.play;
  const toy = floorToys().find((p) => p.id === pl.toy);
  if (!toy) {
    Object.assign(catState, { x: pl.home.x, y: pl.home.y, lift: 0, still: false, play: null });
    startRest('sit', now, dark);
    return;
  }
  const c = toyCentre(toy);
  const near = { x: pl.home.x + (c.x - pl.home.x) * 0.7, y: pl.home.y + (c.y - pl.home.y) * 0.7 };
  if (pl.phase === 'crouch') {
    // A little wiggle just before it goes.
    catState.wiggle = now > pl.wiggleAt ? Math.round(Math.sin(now / 45)) : 0;
    if (now < pl.until) return;
    catState.wiggle = 0;
    faceTowards(c.x, c.y, now);
    Object.assign(pl, { phase: 'pounce', start: now });
  }
  if (pl.phase === 'pounce') {
    const t = Math.min(1, (now - pl.start) / POUNCE_TIME);
    catState.x = pl.home.x + (near.x - pl.home.x) * t;
    catState.y = pl.home.y + (near.y - pl.home.y) * t;
    catState.lift = 6 * Math.sin(Math.PI * t);
    if (t >= 1) {
      toyBump = { id: toy.id, at: now };
      Object.assign(pl, { phase: 'back', start: now });
    }
    return;
  }
  if (pl.phase === 'back') {
    const t = Math.min(1, (now - pl.start) / BACK_TIME);
    catState.x = near.x + (pl.home.x - near.x) * t;
    catState.y = near.y + (pl.home.y - near.y) * t;
    catState.lift = 0;
    if (t < 1) return;
    pl.left--;
    if (pl.left > 0) return crouch(now);
    catState.play = null;
    startRest('sit', now, dark);
  }
}

// A dash across the room, twice as fast.
function zoom(now) {
  const free = freeFloorTiles();
  for (let tries = 0; tries < 8 && free.length; tries++) {
    const goal = free[Math.floor(Math.random() * free.length)];
    const path = findPath([catState.tx, catState.ty], goal);
    if (path && path.length >= 5) {
      catState.fast = true;
      catState.after = 'sit';
      startWalk(path, now);
      return true;
    }
  }
  return false;
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
    // Sometimes it stays lying stretched out instead of curling up.
    catState.stretch = Math.random() < 0.4;
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
  if (catState.mode === 'carried') return;
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
  if (catState.mode === 'play') return playCat(now, dark);
  if (catState.mode === 'walk') {
    const next = catState.path[0];
    if (!next) {
      const after = catState.after || 'idle';
      catState.after = null;
      catState.fast = false;
      catState.creep = false;
      if (after === 'hop') hopOn(now);
      else if (after === 'play') startPlay(now);
      else startRest(after, now, dark);
      return;
    }
    const goal = tileCentre(next[0], next[1]);
    const dx = goal.x - catState.x;
    const dy = goal.y - catState.y;
    const dist = Math.hypot(dx, dy);
    // Creeping up on a toy: the last two tiles, slowly.
    catState.creep = catState.after === 'play' && catState.path.length <= 2;
    const step = CAT_SPEED * (catState.fast ? 2.6 : catState.creep ? 0.4 : 1) * dt;
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
  if (catState.mode === 'sleep' && catState.anim === 'lieDown' && !catState.stretch && animDone(now)) setAnim('sleep', now);
  if (now > catState.until) {
    // Put down while you decorate: it stays where you put it until you're done.
    if (catState.stay && decorating) catState.until = now + 4000;
    else nextCatPlan(now, dark);
  }
}

function animSetting(key) {
  const a = cat.anims[key];
  // "Walking left" can be "walking right", turned around.
  if (key === 'walkLeft' && a.flip) return { ...cat.anims.walkRight, mirror: true };
  // Crouching faces the toy, whichever way the frames were drawn.
  if (key === 'crouch') return { ...a, mirror: catState.flip !== Boolean(a.facesLeft) };
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
  let i = catState.still ? 0 : Math.floor(((now - catState.animStart) / 1000) * a.fps * (catState.fast ? 2 : catState.creep ? 0.5 : 1));
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
  return { x: Math.round(catState.x - cat.fw / 2) + (catState.wiggle || 0), y: Math.round(catState.y - catState.lift - cat.fh + 3), w: cat.fw, h: cat.fh };
}

function drawCat(now) {
  if (!catSheet) return;
  const { frame, mirror } = catFrame(now);
  const b = catBox();
  drawCatFrame(wg, catSheet, frame, b.x, b.y, mirror);
}

// A see-through cat, sitting where it would sit on a piece: shown while you
// place a piece the cat can sit on, or carry the cat over one.
function drawSeatGhost(spotPlaced) {
  if (!catSheet) return;
  const sit = animSetting('sitDown');
  const seat = seatPoint(spotPlaced);
  const x = seat.x;
  const y = seat.y - seat.lift;
  wg.globalAlpha = 0.6;
  drawCatFrame(wg, catSheet, sit.start + Math.max(0, sit.count - 1), Math.round(x - cat.fw / 2), Math.round(y - cat.fh + 3), sit.mirror);
  wg.globalAlpha = 1;
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
  if (catState.mode === 'walk' && !catState.fast && catState.after !== 'play' && catState.after !== 'hop') {
    catState.path = [];
    catState.after = null;
    catState.goal = null;
    startRest('sit', now, 0);
  } else if (catState.mode === 'sit' || catState.mode === 'idle') {
    catState.until = Math.max(catState.until, now + 4000);
  }
}

// --- The loop that draws the room while it's on screen ---

// How dark it is in the room, from 0 (day) to 1 (night).
const darkNow = () => Math.max(0, Math.min(1, (lightAt(hourNow()).amount - 0.25) / 0.47));

let roomRunning = false;
function roomFrame(now) {
  if (currentView() !== 'home' || document.hidden) {
    roomRunning = false;
    return;
  }
  moveCat(now, darkNow());
  moveDuck(now, darkNow());
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
  placeHeldTools();
}

// The piece under a finger: the picture's own pixels count, not its see-through edges.
const pixelCache = new WeakMap();
function solidAt(img, x, y) {
  if (!pixelCache.has(img)) pixelCache.set(img, pictureCanvas(img).getContext('2d').getImageData(0, 0, img.naturalWidth, img.naturalHeight));
  const d = pixelCache.get(img);
  return x >= 0 && y >= 0 && x < d.width && y < d.height && d.data[(Math.floor(y) * d.width + Math.floor(x)) * 4 + 3] > 0;
}
function pieceAt(point) {
  const list = drawList().filter((t) => t.p).reverse();
  for (const { p } of list) {
    const img = picture(lookOf(p).src);
    const s = spot(p);
    if (img && solidAt(img, point.x - s.x, point.y - s.y)) return p;
  }
  return null;
}

function onCat(point) {
  if (!catSheet) return false;
  const b = catBox();
  return point.x >= b.x - 4 && point.x <= b.x + b.w + 4 && point.y >= b.y && point.y <= b.y + b.h;
}

// --- Picking up the cat: hold it, or drag it, and put it down somewhere else.

let press = null; // a finger on the cat: { last, timer, carrying }

function startCarry() {
  press.carrying = true;
  clearTimeout(press.timer);
  Object.assign(catState, {
    mode: 'carried', path: [], goal: null, after: null, hop: null, play: null, on: null, lift: 0,
    fast: false, wantToy: null, exit: null,
  });
  setAnim('walkDown', performance.now());
  catState.still = true;
  carryTo(press.last);
  if (navigator.vibrate) navigator.vibrate(15);
}

// The cat hangs from your finger by its middle.
function carryTo(point) {
  catState.x = Math.max(0, Math.min(world.width, point.x));
  catState.y = Math.max(cat.fh / 2, Math.min(world.height, point.y + cat.fh / 2 - 3));
}

// Where the cat lands if you let go now: furniture it can sit on (under your
// finger or its feet), or the nearest free floor tile.
function catDropTarget() {
  const feet = [Math.floor(catState.x / TILE), Math.floor(catState.y / TILE)];
  const finger = { x: catState.x, y: catState.y - cat.fh / 2 + 3 };
  const under = pieceAt(finger);
  const spotPlaced = catSpots().find((p) => p === under || overlaps(boxOf(p), { x: feet[0], y: feet[1], w: 1, d: 1 }));
  if (spotPlaced) return { spot: spotPlaced };
  let best = null;
  for (const [x, y] of freeFloorTiles()) {
    const d = (x - feet[0]) ** 2 + (y - feet[1]) ** 2;
    if (!best || d < best.d) best = { tile: [x, y], d };
  }
  return { tile: best ? best.tile : [0, room.wallRows] };
}

function dropCat() {
  const now = performance.now();
  const target = catDropTarget();
  catState.still = false;
  catState.stay = decorating;
  if (target.spot) {
    const tile = seatTile(target.spot);
    catState.goal = { spot: target.spot.id, tile, kind: darkNow() > 0.4 ? 'sleep' : 'sit' };
    catState.on = target.spot.id;
    catState.onAt = placedAt(target.spot);
    const seat = seatPoint(target.spot);
    startHop({ x: seat.x, y: seat.y }, seat.lift, now);
  } else {
    catState.exit = target.tile;
    catState.landKind = 'sit';
    startHop(tileCentre(...target.tile), 0, now);
  }
}

let dragging = false;
roomCanvas.addEventListener('pointerdown', (event) => {
  const point = toRoom(event);
  if (!held) {
    if (!onCat(point)) return;
    roomCanvas.setPointerCapture(event.pointerId);
    press = { first: point, last: point, carrying: false };
    press.timer = setTimeout(() => { if (press && !press.carrying) startCarry(); }, 300);
    return;
  }
  dragging = true;
  roomCanvas.setPointerCapture(event.pointerId);
  moveHeldTo(point);
});
roomCanvas.addEventListener('pointermove', (event) => {
  if (dragging) moveHeldTo(toRoom(event));
  if (!press) return;
  press.last = toRoom(event);
  if (press.carrying) carryTo(press.last);
  else if (Math.hypot(press.last.x - press.first.x, press.last.y - press.first.y) > 4) startCarry();
});
function letGoOfCat() {
  clearTimeout(press.timer);
  if (press.carrying) dropCat();
  else petCat(performance.now());
  press = null;
}
roomCanvas.addEventListener('pointercancel', () => { if (press) letGoOfCat(); });
roomCanvas.addEventListener('pointerup', (event) => {
  if (dragging) {
    dragging = false;
    return;
  }
  if (press) {
    letGoOfCat();
    return;
  }
  const point = toRoom(event);
  const p = pieceAt(point);
  if (decorating) {
    if (p) pickUp(p);
    return;
  }
  // Tap the duck and it hops. Tap a toy and the cat comes to play with it. Tap a lamp to switch it.
  if (onDuck(point)) tapDuck(performance.now());
  else if (p && floorToys().includes(p)) callToPlay(p);
  else if (p && pieces.get(p.piece).light) switchLamp(p);
});

async function switchLamp(p) {
  const item = await putItem({ ...p, lit: !p.lit });
  placed = placed.map((one) => (one.id === item.id ? item : one));
  if (navigator.vibrate) navigator.vibrate(10);
}

function callToPlay(toy) {
  const now = performance.now();
  if (catState.mode === 'sleep') {
    roomNote(`${cat.name} is asleep.`);
    return;
  }
  if (catState.mode === 'play' || catState.mode === 'hop') return;
  if (catState.on) {
    catState.wantToy = toy.id;
    hopOff(now);
    return;
  }
  Object.assign(catState, { path: [], goal: null, after: null, fast: false });
  if (!goPlay(toy, now)) roomNote(`${cat.name} can't get to it.`);
}

function pickUp(p) {
  const piece = pieces.get(p.piece);
  // Things on a table come along with it.
  const riders = piece.surface && piece.type === 'furniture' ? thingsOn(p).map((r) => ({ p: r, dx: r.x - p.x, dy: r.y - p.y })) : [];
  held = { piece: p.piece, view: p.view || 0, x: p.x, y: p.y, ox: p.ox || 0, oy: p.oy || 0, layer: p.layer || 0, from: p, riders };
  showRoomPanel();
}

// Where the things on a held table are now: on its tiles, kept on when it turns.
function ridersAt(h) {
  const box = boxOf(h);
  return (h.riders || []).map(({ p, dx, dy }) => ({
    ...p, x: h.x + Math.min(dx, box.w - 1), y: h.y + Math.min(dy, box.d - 1), riding: h.piece,
  }));
}

function holdPiece(piece) {
  const [top, bottom] = rowsFor(piece.type);
  held = { piece: piece.id, view: 0, x: 0, y: 0, ox: 0, oy: 0, layer: 0, from: null, riders: [] };
  moveHeldTo({ x: (room.cols * TILE) / 2, y: ((top + bottom) / 2) * TILE });
  showRoomPanel();
}

async function placeHeld() {
  if (!held || !canPlace(held)) return;
  const fields = { id: held.from ? held.from.id : newId('placed'), kind: 'placed', day: '', piece: held.piece, view: held.view, x: held.x, y: held.y, lit: Boolean(held.from && held.from.lit) };
  if (pieces.get(held.piece).type === 'small') Object.assign(fields, { ox: held.ox, oy: held.oy, layer: held.layer });
  const item = await putItem(fields);
  placed = placed.filter((p) => p.id !== item.id).concat(item);
  for (const { riding, ...rider } of ridersAt(held)) {
    const moved = await putItem(rider);
    placed = placed.map((p) => (p.id === moved.id ? moved : p));
  }
  held = null;
  showRoomPanel();
  showBackupInfo();
}

async function putAway() {
  if (held && held.from) {
    // Things on it go back in the inventory too.
    const gone = [held.from, ...held.riders.map((r) => r.p)].map((p) => p.id);
    for (const id of gone) await deleteItem(id);
    placed = placed.filter((p) => !gone.includes(p.id));
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

// Small buttons by the piece in your hand. Fine placement adds arrows that
// nudge a small piece by the pixel, and buttons to put it in front or behind.
const HELD_ICONS = {
  front: '<svg viewBox="0 0 16 16"><rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor"/><rect x="5" y="5" width="10" height="10" fill="currentColor"/></svg>',
  back: '<svg viewBox="0 0 16 16"><rect x="5" y="5" width="10" height="10" fill="currentColor"/><rect x="1.5" y="1.5" width="9" height="9" fill="#FBF4E6" stroke="currentColor"/></svg>',
  fine: '<svg viewBox="0 0 16 16"><path d="M8 1 5.5 4h5zM8 15l-2.5-3h5zM1 8l3-2.5v5zM15 8l-3-2.5v5z" fill="currentColor"/><rect x="7" y="4" width="2" height="8" fill="currentColor"/><rect x="4" y="7" width="8" height="2" fill="currentColor"/></svg>',
};
function showRoomPanel() {
  const tools = $('held-tools');
  showHud();
  if (gameWindowKind === 'inventory') drawGameWindow();
  if (!held) fine = false;
  tools.hidden = !(decorating && held);
  if (tools.hidden) return;
  const piece = pieces.get(held.piece);
  const small = piece.type === 'small';
  if (!small) fine = false;
  const button = (action, label, glyph, extra = '') => `<button class="held-button${extra}" type="button" data-room="${action}" aria-label="${label}" title="${label}">${glyph}</button>`;
  tools.innerHTML = `<div class="held-row">
      ${button('cancel', 'Cancel', '✕')}
      ${held.from ? button('away', 'Put away', '⤓') : ''}
      ${piece.views.length > 1 ? button('turn', 'Turn', '↻') : ''}
      ${small ? `<button class="held-button" type="button" data-room="fine" aria-label="Fine placement" title="Fine placement" aria-pressed="${fine}">${HELD_ICONS.fine}</button>` : ''}
      ${button('place', 'Place', '✓', ' place')}
    </div>
    ${fine ? `<div class="held-row">
      ${button('nudge:-1:0', 'Left', '←')}${button('nudge:0:-1', 'Up', '↑')}${button('nudge:0:1', 'Down', '↓')}${button('nudge:1:0', 'Right', '→')}
      ${button('layer:1', 'In front', HELD_ICONS.front)}${button('layer:-1', 'Behind', HELD_ICONS.back)}
    </div>` : ''}`;
  tools.querySelector('[data-room="place"]').disabled = !canPlace(held);
  placeHeldTools();
}

// The buttons sit under the piece, or above it near the bottom of the room.
function placeHeldTools() {
  const tools = $('held-tools');
  if (!held || tools.hidden) return;
  const s = spot(held);
  const box = boxOf(held);
  const k = roomCanvas.clientWidth / world.width;
  const below = Math.max(s.y + s.h, (box.y + box.d) * TILE) * k + 6;
  const room = roomCanvas.clientHeight;
  const h = tools.offsetHeight;
  const top = below + h <= room ? below : Math.max(0, Math.min(s.y, box.y * TILE) * k - h - 6);
  const left = Math.max(0, Math.min(roomCanvas.clientWidth - tools.offsetWidth, (s.x + s.w / 2) * k - tools.offsetWidth / 2));
  tools.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

// The inventory: every unlocked piece, with how many are left to place. Tags
// along the top show just one set, or one kind of piece.
function inventoryHtml() {
  const owned = [...pieces.values()].filter((p) => !p.locked).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const sets = [...new Set(owned.map((p) => p.set || ''))].sort((a, b) => (a === '') - (b === '') || a.localeCompare(b));
  const types = PIECE_TYPES.filter(([key]) => owned.some((p) => p.type === key));
  const tags = [
    ...(sets.length > 1 ? sets.map((name) => [`set:${name}`, name ? escapeHtml(name) : 'Not in a set']) : []),
    ...(types.length > 1 ? types.map(([key, name]) => [`type:${key}`, name]) : []),
  ];
  if (!tags.some(([value]) => value === inventoryFolder)) inventoryFolder = null;
  const [by, value] = inventoryFolder === null ? [] : [inventoryFolder.slice(0, inventoryFolder.indexOf(':')), inventoryFolder.slice(inventoryFolder.indexOf(':') + 1)];
  const shown = owned.filter((p) => !by || (by === 'set' ? p.set || '' : p.type) === value);
  const tag = (value, label) => `<button type="button" class="inv-tag" data-inv-folder="${value === null ? '*' : escapeHtml(value)}" aria-pressed="${inventoryFolder === value}">${label}</button>`;
  return `${tags.length ? `<div class="inv-tags">${tag(null, 'All')}${tags.map(([value, label]) => tag(value, label)).join('')}</div>` : ''}
    <p id="inv-note" class="status" role="status"></p>
    <div class="inventory">
      ${shown.map((p) => {
        const left = (p.count || 1) - placedCount(p.id);
        const flat = p.type === 'wallpaper' || p.type === 'floor';
        const using = (p.type === 'wallpaper' && room.wallpaper === p.id) || (p.type === 'floor' && room.floor === p.id);
        const badge = flat ? (using ? '✓' : '') : left > 0 ? `${left}` : '0';
        return `<button type="button" class="inv-tile${!flat && left <= 0 ? ' used' : ''}${using ? ' using' : ''}" data-piece="${p.id}">
          <img class="pixel" src="${p.views[0].src}" alt="" style="--pw: ${p.views[0].pw}; --ph: ${p.views[0].ph}">${badge ? `<span class="inv-badge">${badge}</span>` : ''}</button>`;
      }).join('')}
    </div>`;
}

$('held-tools').addEventListener('click', (event) => {
  const button = event.target.closest('[data-room]');
  if (!button || !held) return;
  const [action, dx, dy] = button.dataset.room.split(':');
  if (action === 'place') placeHeld();
  if (action === 'turn') turnHeld();
  if (action === 'cancel') { held = null; showRoomPanel(); }
  if (action === 'away') putAway();
  if (action === 'fine') { fine = !fine; showRoomPanel(); }
  if (action === 'nudge') {
    held.ox = Math.max(-15, Math.min(15, held.ox + Number(dx)));
    held.oy = Math.max(-15, Math.min(15, held.oy + Number(dy)));
    placeHeldTools();
  }
  if (action === 'layer') held.layer = Math.max(-9, Math.min(9, held.layer + Number(dx)));
});
// The buttons don't move the piece: taps on them stay off the room.
$('held-tools').addEventListener('pointerdown', (event) => event.stopPropagation());

$('gw-body').addEventListener('click', async (event) => {
  if (gameWindowKind !== 'inventory') return;
  const folder = event.target.closest('[data-inv-folder]');
  if (folder) {
    const value = folder.dataset.invFolder;
    inventoryFolder = value === '*' ? null : value;
    drawGameWindow();
    return;
  }
  const tile = event.target.closest('[data-piece]');
  if (tile) return tapPiece(pieces.get(tile.dataset.piece));
});

// A piece tapped in the inventory: wallpaper and floors go straight on, anything
// else goes in your hand to place.
async function tapPiece(piece) {
  if (piece.type === 'wallpaper' || piece.type === 'floor') {
    room[piece.type] = room[piece.type] === piece.id ? '' : piece.id;
    await saveRoomSettings();
    showRoomPanel();
    return;
  }
  if ((piece.count || 1) - placedCount(piece.id) <= 0) {
    $('inv-note').textContent = 'All in the room.';
    return;
  }
  closeGameWindow();
  holdPiece(piece);
}

// --- Sheets: a piece's details, and the room's size and light ---

function pieceTypeChoices(current) {
  return `<label class="field"><span>What it is</span><select name="type">${PIECE_TYPES.map(([key, name]) => `<option value="${key}"${key === current ? ' selected' : ''}>${name}</option>`).join('')}</select></label>`;
}

// Pieces go by their set's name; only pieces outside a set show their own.
const pieceLabel = (p) => p.set || p.name;

// Pieces to pick between, as their pictures: a radio button each.
function pieceRadios(name, list, current, none) {
  const tile = (value, inside) => `<label class="pile-tile radio-tile"><input type="radio" name="${name}" value="${value}"${(current || '') === value ? ' checked' : ''}>${inside}</label>`;
  return `<div class="pile">${none ? tile('', `<span class="muted">${none}</span>`) : ''}${list.map((p) => tile(p.id,
    `<img class="pixel" src="${p.views[0].src}" alt="${escapeHtml(pieceLabel(p))}" style="--pw: ${p.views[0].pw}; --ph: ${p.views[0].ph}">`)).join('')}</div>`;
}

const setNames = () => [...new Set([...pieces.values()].map((p) => p.set).filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Pieces this one can be a colour of: the first of each colour family in the
// same set (its own family's too), but not itself.
function colourChoices(piece) {
  return [...pieces.values()]
    .filter((p) => !p.family && p.id !== piece.id && (p.set || '') === (piece.set || ''))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

// Deletes pieces, and any of them standing in the room.
async function deletePieces(ids) {
  for (const id of ids) {
    for (const p of placed.filter((q) => q.piece === id)) await deleteItem(p.id);
    if (room.wallpaper === id) room.wallpaper = '';
    if (room.floor === id) room.floor = '';
    await deleteItem(id);
  }
  await saveRoomSettings();
  await loadRoom();
}

// Everything about one piece. Opened from the Pieces page (room-pieces.js).
// Previews in a piece's details, to set things by eye: where the cat sits, where
// small things stand on top, and where a lamp's light comes from. The piece
// stays still in its frame and the arrows move the thing being placed.
let previewPiece = null;

// What each arrow moves: the field, how one step up or right changes it, and its limits.
const NUDGES = {
  seat: { x: ['catShift', 1, -64, 64], y: ['catLift', -1, 0, 64] },
  top: { y: ['lift', -1, 0, 64] },
  glow: { x: ['lightX', 1, -64, 64], y: ['lightY', 1, -64, 64] },
};

// A frame around the piece, with room for the cat around it, the same size
// whatever is being placed.
async function previewFrame(id) {
  const c = $(id);
  if (!c || !previewPiece) return null;
  const form = sheetForm.elements;
  const v = previewPiece.views[0];
  const w = Math.max(1, Number(form.w0.value) || v.w) * TILE;
  const d = Math.max(1, Number(form.d0.value) || v.d) * TILE;
  const img = await loadPicture(v.src).catch(() => null);
  const pic = { x: Math.floor((w - v.pw) / 2), y: d - v.ph };
  const side = Math.max(cat.fw, 16);
  const left = Math.min(0, pic.x) - side;
  const top = Math.min(0, pic.y) - Math.max(cat.fh, 24);
  c.width = Math.max(w, pic.x + v.pw) - left + side;
  c.height = Math.max(d, pic.y + v.ph) - top + 6;
  const zoom = Math.max(1, Math.min(4, Math.floor(280 / c.width)));
  c.style.width = `${c.width * zoom}px`;
  c.style.height = `${c.height * zoom}px`;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.translate(-left, -top);
  return { g, form, v, w, d, img, pic, left, top, c };
}

async function drawSeatPreview() {
  const f = await previewFrame('seat-preview');
  if (!f) return;
  const { g, form, w, d, img, pic } = f;
  g.fillStyle = 'rgba(90, 200, 120, 0.25)';
  g.fillRect(0, 0, w, d);
  if (img) g.drawImage(img, pic.x, pic.y);
  const lift = Number(form.catLift.value) || 0;
  const shift = Number(form.catShift.value) || 0;
  if (catSheet) {
    const sit = animSetting('sitDown');
    drawCatFrame(g, catSheet, sit.start + Math.max(0, sit.count - 1), Math.round(w / 2 + shift - cat.fw / 2), Math.round(d - TILE + 13 - lift - cat.fh + 3), sit.mirror);
  }
}

// A small piece to stand on top in the preview: a teacup if there is one.
function sampleSmallPiece() {
  const small = [...pieces.values()].filter((p) => p.type === 'small' && p.id !== previewPiece.id);
  return small.find((p) => /cup/i.test(p.name)) || small[0];
}

async function drawTopPreview() {
  const f = await previewFrame('top-preview');
  if (!f) return;
  const { g, form, w, d, img, pic } = f;
  if (img) g.drawImage(img, pic.x, pic.y);
  const lift = Number(form.lift.value) || 0;
  const thing = sampleSmallPiece();
  const tx = Math.floor((w / TILE - 1) / 2) * TILE;
  const bottom = d - lift;
  if (thing) {
    const tv = thing.views[0];
    const timg = await loadPicture(tv.src).catch(() => null);
    if (timg) g.drawImage(timg, tx + Math.floor((TILE - tv.pw) / 2), bottom - tv.ph);
  } else {
    g.fillStyle = '#F2E8D5';
    g.fillRect(tx + 4, bottom - 6, 8, 6);
  }
}

async function drawGlowPreview() {
  const f = await previewFrame('glow-preview');
  if (!f) return;
  const { g, form, v, img, pic, left, top, c } = f;
  g.fillStyle = '#2E2A40';
  g.fillRect(left, top, c.width, c.height);
  const on = v.on && (await loadPicture(v.on.src).catch(() => null));
  if (on) g.drawImage(on, pic.x + Math.floor((v.pw - v.on.pw) / 2), pic.y + v.ph - v.on.ph);
  else if (img) g.drawImage(img, pic.x, pic.y);
  const cx = pic.x + v.pw / 2 + (Number(form.lightX.value) || 0);
  const cy = pic.y + v.ph * 0.35 + (Number(form.lightY.value) || 0);
  g.globalCompositeOperation = 'screen';
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, GLOW_R);
  for (const [at, a] of GLOW) glow.addColorStop(at, `rgba(255, 200, 135, ${a})`);
  g.fillStyle = glow;
  g.fillRect(cx - GLOW_R, cy - GLOW_R, GLOW_R * 2, GLOW_R * 2);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#FFFFFF';
  g.fillRect(Math.round(cx) - 1, Math.round(cy), 3, 1);
  g.fillRect(Math.round(cx), Math.round(cy) - 1, 1, 3);
}

function drawPreviews() {
  drawSeatPreview();
  drawTopPreview();
  drawGlowPreview();
}

// Arrow buttons, and the hidden numbers they change.
function nudgeHtml(kind, piece) {
  const n = NUDGES[kind];
  const field = ([name]) => `<input type="hidden" name="${name}" value="${Number(piece[name] ?? (name === 'catLift' ? 8 : name === 'lift' ? 16 : 0))}">`;
  const arrow = (axis, dir, label, glyph) => `<button class="nudge" type="button" data-nudge="${kind}:${axis}:${dir}" aria-label="${label}">${glyph}</button>`;
  return `<div class="nudges">
    ${n.x ? arrow('x', -1, 'Left', '←') : ''}${arrow('y', -1, 'Up', '↑')}${arrow('y', 1, 'Down', '↓')}${n.x ? arrow('x', 1, 'Right', '→') : ''}
    ${Object.values(n).map(field).join('')}
  </div>`;
}

sheetForm.addEventListener('click', (event) => {
  const button = event.target.closest('[data-nudge]');
  if (!button) return;
  const [kind, axis, dir] = button.dataset.nudge.split(':');
  const [name, step, low, high] = NUDGES[kind][axis];
  const input = sheetForm.elements[name];
  input.value = Math.max(low, Math.min(high, (Number(input.value) || 0) + Number(dir) * step));
  drawPreviews();
});
sheetForm.addEventListener('input', (event) => {
  if (!$('seat-preview')) return;
  const shows = { catSpot: '.seat-setup', surface: '.top-setup', light: '.glow-setup' }[event.target.name];
  if (shows) sheetForm.querySelector(shows).hidden = !event.target.checked;
  if (['w0', 'd0', 'catSpot', 'surface', 'light'].includes(event.target.name)) drawPreviews();
});

// What all the colours of a piece share. Each colour keeps its own pictures,
// how many you have, its rarity and whether it's still in the machine.
const SHARED_SETTINGS = ['type', 'set', 'surface', 'lift', 'light', 'lightX', 'lightY', 'catSpot', 'catLift', 'catShift', 'toy'];

function openPieceDetails(piece) {
  const views = piece.views.map((v, i) => `<div class="view-row">
      <img class="pixel" src="${v.src}" alt="" style="--pw: ${v.pw}; --ph: ${v.ph}">
      <label>Wide <input type="number" name="w${i}" min="1" max="12" value="${v.w}"></label>
      <label>Deep <input type="number" name="d${i}" min="1" max="12" value="${v.d}"></label>
      <button class="text-button" type="submit" value="recut-${i}">Cut again</button>
      ${piece.light ? `${v.on ? `<img class="pixel" src="${v.on.src}" alt="On" style="--pw: ${v.on.pw}; --ph: ${v.on.ph}">` : ''}
        <button class="text-button" type="submit" value="recuton-${i}">${v.on ? 'Cut on look again' : 'Cut on look'}</button>` : ''}
      ${i ? `<button class="text-button danger" type="submit" value="unview-${i}">Remove</button>` : ''}
    </div>`).join('');
  previewPiece = piece;
  openSheet('Piece', `
    ${pieceTypeChoices(piece.type)}
    <label class="field"><span>How many you have</span><input name="count" type="number" min="1" max="99" value="${piece.count || 1}"></label>
    <h3>Collecting</h3>
    <label class="field"><span>Set</span><input name="set" type="text" value="${escapeHtml(piece.set || '')}" list="set-names" autocomplete="off" placeholder="Not in a set"></label>
    <datalist id="set-names">${setNames().map((name) => `<option value="${escapeHtml(name)}">`).join('')}</datalist>
    <div class="field"><span>A colour of</span>${pieceRadios('family', colourChoices(piece), piece.family, 'None')}</div>
    <label class="field"><span>Rarity</span><select name="rarity">${RARITIES.map(([key, name]) => `<option value="${key}"${(piece.rarity || 'common') === key ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" name="locked"${piece.locked ? ' checked' : ''}><span>Locked in the gacha machine</span></label>
    <h3>Looks and tiles</h3>
    ${views}
    <p><button class="text-button" type="submit" value="addview">Add a turned look</button></p>
    <h3>In the room</h3>
    <label class="check"><input type="checkbox" name="surface"${piece.surface ? ' checked' : ''}><span>Things can go on top</span></label>
    <div class="preview-setup top-setup"${piece.surface ? '' : ' hidden'}>
      <canvas id="top-preview" class="pixel" width="1" height="1" aria-label="Something on top of it"></canvas>
      ${nudgeHtml('top', piece)}
    </div>
    <label class="check"><input type="checkbox" name="catSpot"${piece.catSpot ? ' checked' : ''}><span>${escapeHtml(cat.name)} can sit and sleep on it</span></label>
    <div class="preview-setup seat-setup"${piece.catSpot ? '' : ' hidden'}>
      <canvas id="seat-preview" class="pixel" width="1" height="1" aria-label="${escapeHtml(cat.name)} sitting on it"></canvas>
      ${nudgeHtml('seat', piece)}
    </div>
    <label class="check"><input type="checkbox" name="light"${piece.light ? ' checked' : ''}><span>Gives light at night</span></label>
    <div class="preview-setup glow-setup"${piece.light ? '' : ' hidden'}>
      <canvas id="glow-preview" class="pixel" width="1" height="1" aria-label="Its light"></canvas>
      ${nudgeHtml('glow', piece)}
    </div>
    <label class="check"><input type="checkbox" name="toy"${piece.toy ? ' checked' : ''}><span>A toy ${escapeHtml(cat.name)} plays with (on the floor)</span></label>
    <p><button class="text-button danger" type="submit" value="delete">Delete this piece</button></p>`,
  async (form, submitter) => {
    const action = submitter && submitter.value;
    if (action === 'delete') {
      const inRoom = placed.filter((p) => p.piece === piece.id).length;
      if (!confirm(inRoom ? `Delete this piece? The ${inRoom} in the room go too.` : 'Delete this piece?')) return false;
      await deletePieces([piece.id]);
      return true;
    }
    // Joining a colour family: pieces that were colours of this one come along.
    const family = form.elements.family.value;
    if (family && family !== (piece.family || '')) {
      for (const other of pieces.values()) {
        if (other.family !== piece.id) continue;
        const moved = await putItem({ ...other, family });
        pieces.set(moved.id, moved);
      }
    }
    const views = piece.views.map((v, i) => ({ ...v, w: Number(form.elements[`w${i}`].value) || 1, d: Number(form.elements[`d${i}`].value) || 1 }));
    if (action && action.startsWith('unview-')) views.splice(Number(action.slice(7)), 1);
    const saved = await putItem({
      ...piece, type: form.elements.type.value,
      count: Math.max(1, Number(form.elements.count.value) || 1), views,
      surface: form.elements.surface.checked, lift: Number(form.elements.lift.value) || 0, light: form.elements.light.checked,
      catSpot: form.elements.catSpot.checked, catLift: Math.max(0, Number(form.elements.catLift.value) || 0),
      catShift: Math.round(Number(form.elements.catShift.value) || 0),
      lightX: Number(form.elements.lightX.value) || 0, lightY: Number(form.elements.lightY.value) || 0,
      toy: form.elements.toy.checked, set: form.elements.set.value.trim(), family, rarity: form.elements.rarity.value,
      locked: form.elements.locked.checked,
    });
    pieces.set(saved.id, saved);
    // Its colours are the same piece, so they get the same settings (unless it
    // just joined other colours, which keep theirs).
    for (const other of family === (piece.family || '') ? [...pieces.values()] : []) {
      if (other.id === saved.id || familyOf(other) !== familyOf(saved)) continue;
      const shared = {};
      for (const key of SHARED_SETTINGS) shared[key] = saved[key];
      const otherViews = other.views.map((v, i) => (saved.views[i] ? { ...v, w: saved.views[i].w, d: saved.views[i].d } : v));
      const moved = await putItem({ ...other, ...shared, views: otherViews });
      pieces.set(moved.id, moved);
    }
    if (action === 'addview' || (action && action.startsWith('recut'))) {
      closeGameWindow();
      if (action === 'addview') cutForPiece(saved.id, null);
      else cutForPiece(saved.id, Number(action.split('-')[1]), action.startsWith('recuton-'));
    } else if (action && action.startsWith('unview-')) {
      openPieceDetails(saved);
      return false;
    }
    return true;
  });
  drawPreviews();
}

function openRoomSettings() {
  const hour = previewHour === null ? hourNow() : previewHour;
  openSheet('Room', `
    <label class="field"><span>Tiles across</span><input name="cols" type="number" min="6" max="24" value="${room.cols}"></label>
    <label class="field"><span>Wall rows</span><input name="wallRows" type="number" min="1" max="6" value="${room.wallRows}"></label>
    <label class="field"><span>Floor rows</span><input name="floorRows" type="number" min="3" max="16" value="${room.floorRows}"></label>
    <h3>Light</h3>
    <label class="check"><input type="checkbox" name="clock"${previewHour === null ? ' checked' : ''}><span>Follow the clock</span></label>
    <label class="field"><span>Or try a time of day: <b id="hour-word">${timeWord(hour)}</b></span>
      <input name="hour" type="range" min="0" max="23.75" step="0.25" value="${hour}"></label>
    <h3>Starter pieces</h3>
    <p><button class="text-button" type="submit" value="starter">Add the starter pieces you don't have</button></p>`,
  async (form, submitter) => {
    if (submitter && submitter.value === 'starter') {
      submitter.disabled = true;
      const added = await addStarterPieces();
      await loadRoom();
      showRoomPanel();
      roomNote(added ? `Added ${added} starter piece${added === 1 ? '' : 's'}.` : 'You have all the starter pieces already.');
      return true;
    }
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

// The light button on the room (room-hud.js) steps through these.
const LIGHT_STEPS = [[null, 'Clock'], [10, 'Day'], [18, 'Evening'], [22.5, 'Night']];

// --- Showing the page ---

async function showRoom() {
  await loadRoom();
  showRoomPanel();
  startRoomLoop();
}
