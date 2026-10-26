// room-duck.js: a duck that waddles about the room, if you've given it a sprite
// sheet (Workshop → Duck, set up on the same page as the cat, room-add.js).
// It wanders the floor, stops to look about or peck, sits now and then, and
// sleeps at night. Tap it and it gives a little hop.
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
// mode is stand, walk, peck, sit or sleep. face: the way it last walked.
const duckState = { x: 0, y: 0, path: [], mode: 'stand', anim: 'walkDown', animStart: 0, face: 'walkDown', until: 0, placed: false, hop: 0, last: 0 };
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
  Object.assign(duckState, tileCentre(tx, ty), { tx, ty, path: [], mode: 'stand', until: 0, placed: true });
}

function setDuckAnim(key, now) {
  if (duckState.anim !== key) {
    duckState.anim = key;
    duckState.animStart = now;
  }
}

// What to do next: mostly wander a few tiles, sometimes peck or sit. At night, sleep.
function nextDuckPlan(now, dark) {
  if (dark > 0.6) {
    duckState.mode = 'sleep';
    setDuckAnim('sleep', now);
    duckState.until = now + 60000;
    return;
  }
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
  // Furniture put down where it stands: it hops to a free tile.
  if (blockedTiles().has(`${duckState.tx},${duckState.ty}`)) placeDuck();
  if (duckState.mode === 'walk') {
    const next = duckState.path[0];
    if (!next) {
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
  // Standing, it holds the first frame of the way it's facing.
  let i = duckState.mode === 'stand' ? 0 : Math.floor(((now - duckState.animStart) / 1000) * a.fps);
  i = meta && meta.once ? Math.min(i, a.count - 1) : i % Math.max(1, a.count);
  return { frame: a.start + i, mirror };
}

function duckBox(now) {
  const t = (now - duckState.hop) / 350;
  const lift = t >= 0 && t < 1 ? Math.round(4 * Math.sin(Math.PI * t)) : 0;
  return { x: Math.round(duckState.x - duck.fw / 2), y: Math.round(duckState.y - duck.fh + 3 - lift), w: duck.fw, h: duck.fh };
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
