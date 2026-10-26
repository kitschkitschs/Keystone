// room-duck.js: a duck that waddles about the room, if you've given it a sprite
// sheet (Workshop → Duck, set up on the same page as the cat, room-add.js).
// It wanders the floor, stops to look about or peck, sits now and then, and
// sleeps at night, on furniture the cat can sleep on when there's some. Tap it
// and it gives a little hop; hold it to pick it up, like the cat.
//
// Saved as { id: "duck", kind: "duck", day: "", name, breed, src, fw, fh, anims }.
// Its sheet is your own picture, saved on the phone, never in the app's files.
//
// Breeds: every sprite sheet you've added for a cat or a duck, named after its
// file, to switch between on the cat and duck pages.
//   { id: "breed-...", kind: "breed", day: "", pet: "cat" | "duck", name, src, fw, fh, anims }

// The numbers fit Stardew Valley's duck sheet: 4 frames across, 16 x 16 pixels.
const DUCK_ANIMS = [
  { key: 'walkDown', name: 'Walking down', start: 0, count: 4, fps: 6 },
  { key: 'walkRight', name: 'Walking right', start: 4, count: 4, fps: 6 },
  { key: 'walkUp', name: 'Walking up', start: 8, count: 4, fps: 6 },
  { key: 'walkLeft', name: 'Walking left', start: 12, count: 4, fps: 6, canFlip: true },
  { key: 'peck', name: 'Pecking', start: 16, count: 4, fps: 5, once: true },
  { key: 'sit', name: 'Sitting', start: 24, count: 2, fps: 1 },
  { key: 'sleep', name: 'Sleeping', start: 26, count: 2, fps: 1 },
];

function defaultDuck() {
  const anims = {};
  for (const a of DUCK_ANIMS) anims[a.key] = { start: a.start, count: a.count, fps: a.fps, flip: false };
  return { id: 'duck', kind: 'duck', day: '', name: 'Duck', src: '', fw: 16, fh: 16, anims };
}

let duck = null; // set up in loadRoom (room.js) when there's a duck
let breeds = []; // loaded in loadRoom too
let duckSheet = null;
// mode is stand, walk, peck, sit, sleep, hop (on or off furniture) or carried.
// face: the way it last walked. on: the furniture it's on (a placed id), lift:
// how many pixels up. goal: { spot, kind } while it's on its way to furniture.
const duckState = {
  x: 0, y: 0, path: [], mode: 'stand', anim: 'walkDown', animStart: 0, face: 'walkDown', until: 0, placed: false,
  hop: 0, last: 0, on: null, onAt: '', lift: 0, goal: null, jump: null, exit: null, meet: false,
};
const DUCK_HOP_TIME = 400;
const DUCK_SPEED = 14; // room pixels a second

function loadDuck(item) {
  duck = { ...defaultDuck(), ...item, anims: { ...defaultDuck().anims, ...item.anims } };
  duckSheet = null;
  duckState.placed = false;
  if (duck.src) loadPicture(duck.src).then((img) => { duckSheet = img; }).catch(() => { duckSheet = null; });
}

const duckHere = () => Boolean(duck && duckSheet);

function placeDuck() {
  const free = freeFloorTiles();
  const [tx, ty] = free.length ? free[Math.floor(Math.random() * free.length)] : [0, room.wallRows];
  Object.assign(duckState, tileCentre(tx, ty), { tx, ty, path: [], mode: 'stand', until: 0, placed: true, on: null, lift: 0, goal: null, jump: null });
}

// --- Furniture: the duck uses the same spots as the cat (catSpots in room.js),
// sitting where the piece's seat settings put it (duckShift sideways, duckLift
// up; set beside the cat in the piece's details). Without them, a little to the
// cat's right.

function duckSeat(spotPlaced) {
  const piece = pieces.get(spotPlaced.piece);
  const b = boxOf(spotPlaced);
  const seat = seatPoint(spotPlaced);
  const shift = piece.duckShift ?? (piece.catShift || 0) + 10;
  return { x: (b.x + b.w / 2) * TILE + shift + (spotPlaced.ox || 0), y: seat.y, lift: piece.duckLift !== undefined ? piece.duckLift - (spotPlaced.oy || 0) : seat.lift };
}

function duckJump(to, lift, now) {
  duckState.mode = 'hop';
  duckState.jump = { x0: duckState.x, y0: duckState.y, l0: duckState.lift, x1: to.x, y1: to.y, l1: lift, start: now };
  const dx = to.x - duckState.x;
  const dy = to.y - duckState.y;
  duckState.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'walkRight' : 'walkLeft') : dy > 0 ? 'walkDown' : 'walkUp';
  setDuckAnim(duckState.face, now);
}

function duckOnto(spotPlaced, kind, now) {
  duckState.on = spotPlaced.id;
  duckState.onAt = placedAt(spotPlaced);
  duckState.goal = { spot: spotPlaced.id, kind };
  const seat = duckSeat(spotPlaced);
  duckJump(seat, seat.lift, now);
}

// Walks up beside the furniture, then hops on. False if it can't get there.
function duckGoTo(spotPlaced, kind, now) {
  let best = null;
  for (const tile of besideTiles(spotPlaced)) {
    const path = tile[0] === duckState.tx && tile[1] === duckState.ty ? [] : findPath([duckState.tx, duckState.ty], tile);
    if (path && (!best || path.length < best.length)) best = path;
  }
  if (!best) return false;
  duckState.goal = { spot: spotPlaced.id, kind };
  if (!best.length) duckOnto(spotPlaced, kind, now);
  else {
    duckState.path = best;
    duckState.mode = 'walk';
  }
  return true;
}

function duckOff(now) {
  const spotPlaced = placed.find((p) => p.id === duckState.on);
  const exits = spotPlaced ? besideTiles(spotPlaced) : [];
  duckState.goal = null;
  duckState.on = null;
  if (!exits.length) return placeDuck();
  duckState.exit = exits[exits.length - 1];
  duckJump(tileCentre(...duckState.exit), 0, now);
}

function duckRest(kind, now, dark) {
  duckState.mode = kind;
  setDuckAnim(kind, now);
  duckState.until = now + (kind === 'sleep' ? (dark > 0.5 ? 60000 : 20000 + Math.random() * 20000) : 6000 + Math.random() * 9000);
}

function finishDuckJump(now, dark) {
  const j = duckState.jump;
  Object.assign(duckState, { x: j.x1, y: j.y1, lift: j.l1, jump: null });
  if (duckState.on && duckState.goal) {
    duckRest(duckState.goal.kind, now, dark);
    // Next to the cat on the same furniture: a moment of hearts, if they're awake.
    if (catState.on === duckState.on && duckState.mode === 'sit' && catState.mode === 'sit') startHearts(now);
    return;
  }
  if (duckState.exit) [duckState.tx, duckState.ty] = duckState.exit;
  duckState.exit = null;
  duckState.mode = 'stand';
  setDuckAnim(duckState.face, now);
  duckState.until = now + 1500 + Math.random() * 2000;
}

function setDuckAnim(key, now) {
  if (duckState.anim !== key) {
    duckState.anim = key;
    duckState.animStart = now;
  }
}

// What to do next: mostly wander a few tiles, sometimes peck or sit. At night, sleep.
function nextDuckPlan(now, dark) {
  if (duckState.on) return duckOff(now);
  // Bedtime: on furniture if it can get to some, or where it stands.
  const spots = catSpots();
  const someSpot = () => spots[Math.floor(Math.random() * spots.length)];
  if (dark > 0.6) {
    if (spots.length && duckGoTo(someSpot(), 'sleep', now)) return;
    return duckRest('sleep', now, dark);
  }
  if (Math.random() < 0.15 && duckVisitsCat(now)) return;
  if (spots.length && Math.random() < 0.12 && duckGoTo(someSpot(), Math.random() < 0.5 ? 'sit' : 'sleep', now)) return;
  const roll = Math.random();
  if (roll < 0.55) {
    const near = freeFloorTiles().filter(([x, y]) => Math.abs(x - duckState.tx) + Math.abs(y - duckState.ty) <= 4);
    const goal = near[Math.floor(Math.random() * near.length)];
    const path = goal && findPath([duckState.tx, duckState.ty], goal);
    if (path && path.length) {
      duckState.path = path;
      duckState.mode = 'walk';
      return;
    }
  }
  if (roll < 0.75) {
    duckState.mode = 'peck';
    setDuckAnim('peck', now);
    duckState.until = now + 1500 + Math.random() * 1500;
  } else if (roll < 0.85) {
    duckState.mode = 'sit';
    setDuckAnim('sit', now);
    duckState.until = now + 6000 + Math.random() * 9000;
  } else {
    duckState.mode = 'stand';
    setDuckAnim(duckState.face, now);
    duckState.until = now + 2000 + Math.random() * 4000;
  }
}

function moveDuck(now, dark) {
  if (!duckHere()) return;
  if (!duckState.placed) placeDuck();
  const dt = Math.min(0.1, (now - (duckState.last || now)) / 1000);
  duckState.last = now;
  if (duckState.mode === 'carried') return;
  // The furniture it's on moved or went away: it lands on the floor.
  if (duckState.on) {
    const spotPlaced = placed.find((p) => p.id === duckState.on);
    if (!spotPlaced || placedAt(spotPlaced) !== duckState.onAt || (held && held.from && held.from.id === duckState.on)) placeDuck();
  } else if (duckState.mode !== 'hop' && blockedTiles().has(`${duckState.tx},${duckState.ty}`)) {
    // Furniture put down where it stands: it moves to a free tile.
    placeDuck();
  }
  if (duckState.mode === 'hop') {
    const j = duckState.jump;
    const t = Math.min(1, (now - j.start) / DUCK_HOP_TIME);
    duckState.x = j.x0 + (j.x1 - j.x0) * t;
    duckState.y = j.y0 + (j.y1 - j.y0) * t;
    duckState.lift = j.l0 + (j.l1 - j.l0) * t + 5 * Math.sin(Math.PI * t);
    if (t >= 1) finishDuckJump(now, dark);
    return;
  }
  if (duckState.mode === 'snuggle') {
    // The cat's picked up: the duck shuffles back.
    if (catState.mode === 'carried') duckState.snug.end = Math.min(duckState.snug.end, now + SNUG_IN);
    return snuggle(now);
  }
  if (duckState.mode === 'walk') {
    const next = duckState.path[0];
    if (!next) {
      const goal = duckState.goal && placed.find((p) => p.id === duckState.goal.spot);
      if (goal) return duckOnto(goal, duckState.goal.kind, now);
      duckState.goal = null;
      if (duckState.meet && greet(now)) return;
      duckState.meet = false;
      duckState.mode = 'stand';
      setDuckAnim(duckState.face, now);
      duckState.until = now + 1000 + Math.random() * 3000;
      return;
    }
    const goal = tileCentre(next[0], next[1]);
    const dx = goal.x - duckState.x;
    const dy = goal.y - duckState.y;
    const dist = Math.hypot(dx, dy);
    const step = DUCK_SPEED * dt;
    if (dist <= step) {
      Object.assign(duckState, goal);
      [duckState.tx, duckState.ty] = next;
      duckState.path.shift();
    } else {
      duckState.x += (dx / dist) * step;
      duckState.y += (dy / dist) * step;
    }
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'walkRight' : 'walkLeft') : dy > 0 ? 'walkDown' : 'walkUp';
    duckState.face = key;
    setDuckAnim(key, now);
    return;
  }
  // Asleep, it wakes when it gets light.
  if (duckState.mode === 'sleep' && dark > 0.5) return;
  if (now > duckState.until) nextDuckPlan(now, dark);
}

function duckFrame(now) {
  let a = duck.anims[duckState.anim];
  let mirror = false;
  if (duckState.anim === 'walkLeft' && a.flip) {
    a = duck.anims.walkRight;
    mirror = true;
  }
  const meta = DUCK_ANIMS.find((m) => m.key === duckState.anim);
  // Standing or held, it holds the first frame of the way it's facing.
  const shuffling = duckState.mode === 'snuggle' && duckState.x !== duckState.snug.x1;
  let i = duckState.mode === 'stand' || duckState.mode === 'carried' || (duckState.mode === 'snuggle' && !shuffling) ? 0 : Math.floor(((now - duckState.animStart) / 1000) * a.fps);
  i = meta && meta.once ? Math.min(i, a.count - 1) : i % Math.max(1, a.count);
  return { frame: a.start + i, mirror };
}

function duckBox(now) {
  const t = (now - duckState.hop) / 350;
  const lift = t >= 0 && t < 1 ? Math.round(4 * Math.sin(Math.PI * t)) : 0;
  // Smooching, it leans in towards the cat as it hops.
  const lean = duckState.mode === 'snuggle' && lift ? (duckState.face === 'walkLeft' ? -2 : 2) : 0;
  return { x: Math.round(duckState.x - duck.fw / 2) + lean, y: Math.round(duckState.y - duckState.lift - duck.fh + 3 - lift), w: duck.fw, h: duck.fh };
}

// Drawn just in front of the furniture it's on, so it sits on top.
function duckSortY() {
  const spotUnder = duckState.on && placed.find((p) => p.id === duckState.on);
  if (!spotUnder) return duckState.y + (duckState.mode === 'snuggle' ? 0.1 : -0.1);
  const b = boxOf(spotUnder);
  return (b.y + b.d) * TILE + 0.35;
}

// --- Picking it up (the finger handling is shared with the cat, in room.js) ---

function startCarryDuck(point) {
  Object.assign(duckState, { mode: 'carried', meet: false, snug: null, path: [], goal: null, on: null, lift: 0, jump: null, exit: null, face: 'walkDown' });
  setDuckAnim('walkDown', performance.now());
  carryDuckTo(point);
  if (navigator.vibrate) navigator.vibrate(15);
}

function carryDuckTo(point) {
  duckState.x = Math.max(0, Math.min(world.width, point.x));
  duckState.y = Math.max(duck.fh / 2, Math.min(world.height, point.y + duck.fh / 2 - 3));
}

// Lets go: onto furniture under it, or down to the nearest free floor tile.
function dropDuck() {
  const now = performance.now();
  const feet = [Math.floor(duckState.x / TILE), Math.floor(duckState.y / TILE)];
  const under = pieceAt({ x: duckState.x, y: duckState.y - duck.fh / 2 + 3 });
  const spotPlaced = catSpots().find((p) => p === under || overlaps(boxOf(p), { x: feet[0], y: feet[1], w: 1, d: 1 }));
  if (spotPlaced) return duckOnto(spotPlaced, darkNow() > 0.4 ? 'sleep' : 'sit', now);
  let best = null;
  for (const [x, y] of freeFloorTiles()) {
    const d = (x - feet[0]) ** 2 + (y - feet[1]) ** 2;
    if (!best || d < best.d) best = { tile: [x, y], d };
  }
  duckState.exit = best ? best.tile : [0, room.wallRows];
  duckJump(tileCentre(...duckState.exit), 0, now);
}

function drawDuck(now) {
  if (!duckHere()) return;
  const { frame, mirror } = duckFrame(now);
  const b = duckBox(now);
  const across = Math.max(1, Math.floor(duckSheet.naturalWidth / duck.fw));
  const sx = (frame % across) * duck.fw;
  const sy = Math.floor(frame / across) * duck.fh;
  wg.save();
  if (mirror) {
    wg.translate(b.x + duck.fw, b.y);
    wg.scale(-1, 1);
    wg.drawImage(duckSheet, sx, sy, duck.fw, duck.fh, 0, 0, duck.fw, duck.fh);
  } else {
    wg.drawImage(duckSheet, sx, sy, duck.fw, duck.fh, b.x, b.y, duck.fw, duck.fh);
  }
  wg.restore();
}

// Z's drifting up while it sleeps, like the cat's.
function drawDuckZeds(now) {
  if (!duckHere() || duckState.mode !== 'sleep') return;
  const b = duckBox(now);
  const t = ((now - duckState.animStart) / 2400) % 1;
  wg.globalAlpha = Math.sin(t * Math.PI);
  drawPixels(ZED, b.x + b.w / 2 + 3 + t * 3, b.y + 2 - t * 8, '#FFFFFF');
  wg.globalAlpha = 1;
}

function onDuck(point) {
  if (!duckHere()) return false;
  const b = duckBox(performance.now());
  return point.x >= b.x - 2 && point.x <= b.x + b.w + 2 && point.y >= b.y - 2 && point.y <= b.y + b.h;
}

// A tap: it wakes up if it was asleep, and hops.
function tapDuck(now) {
  duckState.hop = now;
  if (duckState.mode === 'sleep' || duckState.mode === 'sit') {
    duckState.mode = 'stand';
    setDuckAnim(duckState.face, now);
    duckState.until = now + 3000;
  }
  if (navigator.vibrate) navigator.vibrate(8);
}

// --- Friends: now and then the duck and the cat go up to each other, and
// little hearts float up between them. They do it sitting together on
// furniture too.

const FRIEND_TIME = 4500;
let friends = null; // { start, x, y } while hearts are floating up

// Both on the floor, awake and not busy, so they can meet.
function bothFree() {
  if (!duckHere() || !catSheet || !catState.placed || !duckState.placed) return false;
  const catFree = (catState.mode === 'idle' || catState.mode === 'sit') && !catState.on && !catState.stay;
  return catFree && !duckState.on && ['stand', 'peck', 'sit'].includes(duckState.mode);
}

// The free tiles left and right of a pet: where the other one stands to say
// hello. Two tiles over, as the cat is two tiles wide; one if that's all there is.
function helloTiles(tx, ty) {
  const free = new Set(freeFloorTiles().map(([x, y]) => `${x},${y}`));
  const ok = (tiles) => tiles.filter(([x, y]) => free.has(`${x},${y}`));
  const roomy = ok([[tx - 2, ty], [tx + 2, ty]]);
  return roomy.length ? roomy : ok([[tx - 1, ty], [tx + 1, ty]]);
}

function shortestPath(from, tiles) {
  let best = null;
  for (const tile of tiles) {
    const path = tile[0] === from[0] && tile[1] === from[1] ? [] : findPath(from, tile);
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}

// The duck waddles over to the cat, who waits for it.
function duckVisitsCat(now) {
  if (!bothFree()) return false;
  const path = shortestPath([duckState.tx, duckState.ty], helloTiles(catState.tx, catState.ty));
  if (!path) return false;
  catState.until = Math.max(catState.until, now + (path.length * TILE / DUCK_SPEED) * 1000 + 2000);
  duckState.meet = true;
  if (!path.length) return greet(now);
  duckState.path = path;
  duckState.mode = 'walk';
  return true;
}

// The cat walks over to the duck, who waits for it.
function catVisitsDuck(now) {
  if (!bothFree()) return false;
  const path = shortestPath([catState.tx, catState.ty], helloTiles(duckState.tx, duckState.ty));
  if (!path) return false;
  duckState.mode = 'stand';
  duckState.path = [];
  setDuckAnim(duckState.face, now);
  duckState.until = now + (path.length * TILE / CAT_SPEED) * 1000 + 2000;
  if (!path.length) return greet(now);
  catState.after = 'meet';
  startWalk(path, now);
  return true;
}

// They're side by side: they face each other and the hearts start.
function greet(now) {
  duckState.meet = false;
  const side = Math.abs(catState.y - duckState.y) < TILE && Math.abs(catState.x - duckState.x) < TILE * 2.6;
  if (!side || catState.mode === 'carried' || duckState.mode === 'carried') return false;
  // The duck shuffles right up against the cat for a cuddle, then back.
  const dir = catState.x < duckState.x ? 1 : -1;
  duckState.mode = 'snuggle';
  duckState.face = dir > 0 ? 'walkLeft' : 'walkRight';
  setDuckAnim(duckState.face, now);
  duckState.snug = { x0: duckState.x, x1: catState.x + dir * SNUG_GAP, start: now, end: now + SNUG_IN + FRIEND_TIME + SNUG_IN };
  if (catState.mode !== 'sit') startRest('sit', now, 0);
  catState.until = Math.max(catState.until, duckState.snug.end + 1000);
  return true;
}

const SNUG_GAP = 9; // pixels between the cat's middle and the duck's, cuddled up
const SNUG_IN = 700; // how long the shuffle in (and out) takes

function snuggle(now) {
  const s = duckState.snug;
  const age = now - s.start;
  const left = s.end - now;
  if (left <= 0) {
    duckState.x = s.x0;
    duckState.snug = null;
    duckState.mode = 'stand';
    duckState.until = now + 1500 + Math.random() * 2000;
    return;
  }
  const t = Math.min(1, age / SNUG_IN, left / SNUG_IN);
  duckState.x = s.x0 + (s.x1 - s.x0) * t;
  if (t < 1) return;
  // Cuddled up: a smooch now and then, a little hop towards the cat.
  if (!friends) startHearts(now);
  if (now > (s.kiss || 0)) {
    duckState.hop = now;
    s.kiss = now + 1100;
  }
}

function startHearts(now) {
  const c = catBox();
  const d = duckBox(now);
  friends = { start: now, x: (c.x + c.w / 2 + d.x + d.w / 2) / 2, y: Math.min(c.y + 6, d.y) };
}

// A few small hearts, one after another, drifting up and fading.
const SMALL_HEART = ['##.##', '#####', '.###.', '..#..'];
function drawFriendHearts(now) {
  if (!friends) return;
  const age = now - friends.start;
  if (age > FRIEND_TIME || catState.mode === 'carried' || duckState.mode === 'carried') {
    friends = null;
    return;
  }
  for (let i = 0; i < 4; i++) {
    const t = (age - i * 800) / 1800;
    if (t < 0 || t > 1) continue;
    const sway = Math.sin(t * Math.PI * 2 + i) * 2;
    wg.globalAlpha = Math.min(1, 2 - t * 2);
    const shape = i % 2 ? SMALL_HEART : HEART;
    drawPixels(shape, friends.x - shape[0].length / 2 + sway + (i % 2 ? 3 : -3), friends.y - t * 14, '#E0607A');
  }
  wg.globalAlpha = 1;
}
