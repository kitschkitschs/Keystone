// farm.js: the garden, the farmer's market, the pantry and the stove.
//
// The garden is a second scene on the room's canvas (the sprout button on the
// room goes there, the house button comes back). Its bed is a grid of plots:
// tap one to choose a crop, then tap or drag across the plots to plant it.
// Crops grow on the real clock and the pets do the work: the duck waters what's
// growing, dancing on the crop's tile, and the cat pounces on what's ripe and
// picks it, which goes in the pantry. A crop that regrows grows again; one that
// doesn't leaves its plot empty.
//
// Produce sells at the farmer's market for coins, and the market sells what
// the garden can't grow (eggs, milk...). Recipes turn things from the pantry
// into snacks on a stove: any piece marked as a stove (see room.js). Tap the
// stove in the room to cook. Snacks can be given to the pets.
//
// Saved as items (all part of "Save game only", see sync.js):
//   { id: "crop-...", kind: "crop", day: "", name, fw, fh, stages: [src], produce, hours, regrow, rounds, yield, price }
//        stages: its pictures from seed to ripe, fw x fh pixels each, standing
//        on its plot. A crop that regrows has one more at the end: how it looks
//        once it's been picked. produce: the picture of what you pick. hours: from
//        planting to ripe. regrow: hours until it's ripe again after picking
//        (0: it's planted again from seed). rounds: how many pickings a crop
//        that regrows gives before the last one clears its plot (0: no end).
//        yield: how many each picking.
//        price: coins each at the market.
//   { id: "good-...", kind: "good", day: "", name, src, price }    sold at the market
//   { id: "recipe-...", kind: "recipe", day: "", name, src, needs: [{ thing, n }], minutes, price }
//   { id: "plot-<x>-<y>", kind: "plot", day: "", x, y, crop, plantedAt, ripeAt, regrown, picks }
//        picks: how many times it's been picked so far.
//   { id: "garden", kind: "garden", day: "", cols, rows, wide, tall, grass, soil }
//        cols, rows: the bed's size. wide, tall: the garden's own size in tiles
//        (the room's, until you set it). grass, soil: floor pieces for its ground.
//   { id: "pantry", kind: "pantry", day: "", coins, has: { thing: n } }
//   { id: "kitchen", kind: "kitchen", day: "", recipe, doneAt }    what's cooking
// A thing is "crop:<id>", "good:<id>" or "recipe:<id>".

const HOUR = 3600 * 1000;
let crops = new Map();
let goods = new Map();
let recipes = new Map();
let plots = new Map();
const garden = { cols: 6, rows: 3, wide: 0, tall: 0, grass: '', soil: '' };
let pantry = { coins: 0, has: {} };
let kitchen = { recipe: '', doneAt: 0 };
let scene = 'room'; // or 'garden'

// Called by loadRoom (room.js) with every item.
function loadFarm(items) {
  crops = new Map();
  goods = new Map();
  recipes = new Map();
  plots = new Map();
  Object.assign(garden, { cols: 6, rows: 3, wide: 0, tall: 0, grass: '', soil: '' });
  pantry = { coins: 0, has: {} };
  kitchen = { recipe: '', doneAt: 0 };
  for (const item of items) {
    if (item.deleted) continue;
    if (item.kind === 'crop') crops.set(item.id, item);
    if (item.kind === 'good') goods.set(item.id, item);
    if (item.kind === 'recipe') recipes.set(item.id, item);
    if (item.kind === 'plot') plots.set(item.id, item);
    if (item.kind === 'garden') Object.assign(garden, item);
    if (item.kind === 'pantry') pantry = { coins: 0, ...item, has: { ...item.has } };
    if (item.kind === 'kitchen') kitchen = item;
  }
  for (const [id, plot] of plots) if (!crops.has(plot.crop)) plots.delete(id);
}

const savePantry = async () => { pantry = await putItem({ ...pantry, id: 'pantry', kind: 'pantry', day: '' }); };
const saveGarden = () => putItem({ id: 'garden', kind: 'garden', day: '', cols: garden.cols, rows: garden.rows, wide: garden.wide, tall: garden.tall, grass: garden.grass, soil: garden.soil });

// The garden has its own size, in tiles; until you set one it's the room's.
const gardenCols = () => Math.max(6, Math.min(40, Math.round(Number(garden.wide)) || room.cols));
const gardenRows = () => Math.max(room.wallRows + 2, Math.min(30, Math.round(Number(garden.tall)) || rows()));
// The size of whichever scene is showing.
const sceneCols = () => (scene === 'garden' ? gardenCols() : room.cols);
const sceneRows = () => (scene === 'garden' ? gardenRows() : rows());

// What a thing is, from its key: its name, picture and price.
function thingOf(key) {
  const [kind, id] = key.split(':');
  const item = { crop: crops, good: goods, recipe: recipes }[kind]?.get(id);
  if (!item) return null;
  return { key, kind, item, name: item.name || '', src: kind === 'crop' ? item.produce : item.src, price: Number(item.price) || 0 };
}
const hasOf = (key) => pantry.has[key] || 0;
function addThing(key, n) {
  pantry.has[key] = Math.max(0, hasOf(key) + n);
  if (!pantry.has[key]) delete pantry.has[key];
}

// --- Growing ---

const growTime = (crop) => Math.max(0.001, Number(crop.hours) || 1) * HOUR;
const againTime = (crop) => (Number(crop.regrow) > 0 ? Number(crop.regrow) * HOUR : growTime(crop));

async function plant(x, y, cropId) {
  const id = `plot-${x}-${y}`;
  if (!cropId) {
    plots.delete(id);
    await deleteItem(id);
    return;
  }
  const now = Date.now();
  const plot = await putItem({ id, kind: 'plot', day: '', x, y, crop: cropId, plantedAt: now, ripeAt: now + growTime(crops.get(cropId)), regrown: false });
  plots.set(id, plot);
}

const isRipe = (plot, now = Date.now()) => now >= plot.ripeAt;

// Picks a ripe plot: as many pickings as there have been since it ripened
// (the pets kept at it while nobody was looking). Returns how many it gave.
async function pickPlot(plot, now = Date.now()) {
  const crop = crops.get(plot.crop);
  if (!crop || !isRipe(plot, now)) return 0;
  const again = againTime(crop);
  const times = 1 + Math.floor((now - plot.ripeAt) / again);
  const last = plot.ripeAt + (times - 1) * again;
  const regrows = Number(crop.regrow) > 0;
  if (!regrows) {
    // Picked once, and the plot is empty again.
    addThing(`crop:${crop.id}`, Math.max(1, Number(crop.yield) || 1));
    plots.delete(plot.id);
    await deleteItem(plot.id);
    return Math.max(1, Number(crop.yield) || 1);
  }
  // Its last round: picked, and the plot is empty again.
  const rounds = Math.round(Number(crop.rounds)) || 0;
  const picks = plot.picks || 0;
  const taken = rounds > 0 ? Math.max(1, Math.min(times, rounds - picks)) : times;
  const n = taken * Math.max(1, Number(crop.yield) || 1);
  addThing(`crop:${crop.id}`, n);
  if (rounds > 0 && picks + taken >= rounds) {
    plots.delete(plot.id);
    await deleteItem(plot.id);
    return n;
  }
  const next = await putItem({ ...plot, ripeAt: last + again, regrown: true, pickedAt: last, picks: picks + taken });
  plots.set(next.id, next);
  return n;
}

// Away from the garden, the pets pick everything that's ripe.
async function tendGarden() {
  const now = Date.now();
  let any = false;
  for (const plot of [...plots.values()]) if (isRipe(plot, now) && (await pickPlot(plot, now))) any = true;
  if (any) await savePantry();
}

// Which stage picture is the ripe one. A crop that regrows keeps one more
// picture after it: how it looks once it's been picked.
const ripeStage = (crop) => Math.max(0, crop.stages.length - (Number(crop.regrow) > 0 && crop.stages.length > 1 ? 2 : 1));

// Which picture a plot shows: the stages grow in turn up to the ripe one, and
// a crop that regrows waits on its picked look.
function stageOf(plot, now = Date.now()) {
  const crop = crops.get(plot.crop);
  const n = crop.stages.length;
  if (!n) return null;
  const ripe = ripeStage(crop);
  if (isRipe(plot, now)) return crop.stages[ripe];
  if (plot.regrown) return crop.stages[Number(crop.regrow) > 0 && n > 1 ? n - 1 : Math.max(0, ripe - 1)];
  const t = (now - plot.plantedAt) / Math.max(1, plot.ripeAt - plot.plantedAt);
  return crop.stages[Math.max(0, Math.min(ripe - 1, Math.floor(t * ripe)))];
}

// --- Cooking ---

async function tendKitchen() {
  if (!kitchen.recipe || Date.now() < kitchen.doneAt) return;
  if (recipes.has(kitchen.recipe)) addThing(`recipe:${kitchen.recipe}`, 1);
  kitchen = await putItem({ id: 'kitchen', kind: 'kitchen', day: '', recipe: '', doneAt: 0 });
  await savePantry();
  if (gameWindow.open && ['stove', 'pantry', 'market'].includes(gameWindowKind)) drawGameWindow();
}

const canCook = (recipe) => (recipe.needs || []).every(({ thing, n }) => hasOf(thing) >= n);

async function cook(recipe) {
  if (kitchen.recipe || !canCook(recipe)) return;
  for (const { thing, n } of recipe.needs || []) addThing(thing, -n);
  await savePantry();
  kitchen = await putItem({ id: 'kitchen', kind: 'kitchen', day: '', recipe: recipe.id, doneAt: Date.now() + Math.max(0, Number(recipe.minutes) || 0) * 60000 });
  await tendKitchen();
}

const stovesInRoom = () => placed.filter((p) => pieces.get(p.piece)?.stove);

// Steam rises from the stove while something's cooking.
function drawSteam(now) {
  if (!kitchen.recipe) return;
  for (const p of stovesInRoom()) {
    const s = spot(p);
    for (let i = 0; i < 3; i++) {
      const t = ((now / 1600) + i / 3) % 1;
      wg.globalAlpha = 0.7 * Math.sin(Math.PI * t);
      wg.fillStyle = '#FFFFFF';
      const x = s.x + s.w / 2 - 4 + i * 4 + Math.round(Math.sin(t * 6 + i) * 1.5);
      wg.fillRect(Math.round(x), Math.round(s.y + 2 - t * 12), 2, 2);
    }
  }
  wg.globalAlpha = 1;
}

// Every few seconds: cooking finishes, and away from the garden the pets pick.
let farmTickAt = 0;
function farmTick(now) {
  if (now < farmTickAt) return;
  farmTickAt = now + 2000;
  tendKitchen();
  if (scene !== 'garden') tendGarden();
}

// --- The garden scene ---
// It's drawn on the room's canvas, the same size as the room: your own map
// (map.js), where soil tiles are the plots, or else a hedge where the wall
// would be, then grass, with the bed in the middle.

function bed() {
  const cols = Math.max(1, Math.min(garden.cols, sceneCols() - 2));
  const down = Math.max(1, Math.min(garden.rows, sceneRows() - room.wallRows - 2));
  return { x: Math.floor((sceneCols() - cols) / 2), y: room.wallRows + 1, cols, rows: down };
}
const inBed = (tx, ty) => {
  if (mapHere(maps.garden)) return soilAt(tx, ty);
  const b = bed();
  return tx >= b.x && tx < b.x + b.cols && ty >= b.y && ty < b.y + b.rows;
};
// Somewhere a pet can stand: anywhere on the map that isn't water or in the way.
function freeGardenSpot() {
  const top = mapHere(maps.garden) ? 0 : room.wallRows;
  for (let tries = 0; tries < 40; tries++) {
    const tx = Math.floor(Math.random() * sceneCols());
    const ty = top + Math.floor(Math.random() * (sceneRows() - top));
    if (!mapHere(maps.garden) || walkableAt(tx, ty)) return { x: tx * TILE + TILE / 2, y: ty * TILE + 13 };
  }
  return { x: (sceneCols() * TILE) / 2, y: (sceneRows() - 1) * TILE + 13 };
}
const plotAt = (tx, ty) => plots.get(`plot-${tx}-${ty}`);
const bedPlots = () => [...plots.values()].filter((p) => inBed(p.x, p.y));

function groundPicture(id) {
  const piece = id && pieces.get(id);
  return piece ? picture(piece.views[0].src) : null;
}

function drawGardenGround() {
  if (mapHere(maps.garden)) {
    drawMapLayer(wg, maps.garden, 'ground', performance.now(), true);
    drawMapLayer(wg, maps.garden, 'detail', performance.now(), true);
    return;
  }
  const W = world.width;
  const top = room.wallRows * TILE;
  // The sky, a hedge along the back, and a little fence in front of it.
  wg.fillStyle = '#BFD8E4'; wg.fillRect(0, 0, W, top);
  wg.fillStyle = '#5E7F4E'; wg.fillRect(0, Math.max(0, top - 22), W, 22);
  wg.fillStyle = '#6F9259';
  for (let x = 0; x < W; x += 8) wg.fillRect(x, Math.max(0, top - 24) + ((x / 8) % 2) * 2, 6, 4);
  wg.fillStyle = '#A0714F';
  for (let x = 3; x < W; x += 10) wg.fillRect(x, top - 12, 3, 12);
  wg.fillRect(0, top - 9, W, 2);
  wg.fillRect(0, top - 4, W, 2);
  const grass = groundPicture(garden.grass);
  if (grass) tileAcross(wg, grass, 0, top, W, world.height - top);
  else {
    wg.fillStyle = '#9DBF7E'; wg.fillRect(0, top, W, world.height - top);
    wg.fillStyle = '#8AAE6C';
    for (let y = top; y < world.height; y += TILE) {
      for (let x = 0; x < W; x += TILE) {
        const seed = (x * 7 + y * 13) % 5;
        wg.fillRect(x + 3 + seed, y + 4 + (seed % 3) * 3, 1, 2);
        wg.fillRect(x + 10 - seed, y + 11 - (seed % 2) * 4, 1, 2);
      }
    }
  }
  const b = bed();
  const soil = groundPicture(garden.soil);
  for (let ty = b.y; ty < b.y + b.rows; ty++) {
    for (let tx = b.x; tx < b.x + b.cols; tx++) {
      const x = tx * TILE;
      const y = ty * TILE;
      if (soil) { wg.drawImage(soil, 0, 0, TILE, TILE, x, y, TILE, TILE); continue; }
      wg.fillStyle = '#8A6248'; wg.fillRect(x, y, TILE, TILE);
      wg.fillStyle = '#7A5440';
      wg.fillRect(x + 2, y + 4, 12, 1); wg.fillRect(x + 2, y + 8, 12, 1); wg.fillRect(x + 2, y + 12, 12, 1);
      wg.fillStyle = 'rgba(59, 44, 42, 0.25)'; wg.fillRect(x, y + TILE - 1, TILE, 1); wg.fillRect(x + TILE - 1, y, 1, TILE);
    }
  }
}

function drawCrop(plot, now) {
  const crop = crops.get(plot.crop);
  const img = picture(stageOf(plot, now) || '');
  if (!img) return;
  const x = plot.x * TILE + Math.floor((TILE - img.naturalWidth) / 2);
  wg.drawImage(img, x, (plot.y + 1) * TILE - img.naturalHeight - (Number(crop.lift) || 0));
}

// The pets in the garden. Each one: { who, x, y, mode (walk, tend, rest, sleep),
// anim, start, until, goal: {x, y}, plot, flip, hearts }.
let gardenPets = [];
const PET_SPEED = { cat: 22, duck: 14 };
const sheetOf = (who) => (who === 'duck' ? duckSheet : catSheet);
const petOf = (who) => (who === 'duck' ? duck : cat);
const standAt = (plot) => ({ x: plot.x * TILE + TILE / 2, y: (plot.y + 1) * TILE + 11 });

function enterGarden() {
  scene = 'garden';
  view.z = 1;
  sizeRoom();
  decorating = false;
  held = null;
  gardenPets = [{ who: 'cat' }, ...(duckHere() ? [{ who: 'duck' }] : [])].map((p, i) => {
    const b = bed();
    const tx = b.x - 1 + i * (b.cols + 1);
    const at = mapHere(maps.garden) ? freeGardenSpot() : { x: Math.max(0, tx) * TILE + TILE / 2, y: (b.y + b.rows) * TILE + 11 };
    return { ...p, ...at, mode: 'rest', anim: p.who === 'duck' ? 'sit' : 'sitDown', start: performance.now(), until: performance.now() + 1500 + i * 1200, flip: false, hearts: 0 };
  });
  showRoomPanel();
  if (gameWindowKind === 'inventory') closeGameWindow();
}

function leaveGarden() {
  scene = 'room';
  pouchOpen = false;
  plantAt = null;
  sowing = null;
  view.z = 1;
  sizeRoom();
  showRoomPanel();
  showPouch();
  if (gameWindowKind === 'market') closeGameWindow();
}

function setPetAnim(pet, key, now) {
  if (pet.anim === key) return;
  pet.anim = key;
  pet.start = now;
}

// What a pet does next. The cat goes to pick something ripe, the duck goes to
// water something growing; otherwise they wander and sit.
function nextGardenPlan(pet, now, dark) {
  if (dark > 0.6) {
    pet.mode = 'sleep';
    setPetAnim(pet, 'sleep', now);
    pet.until = now + 8000;
    return;
  }
  const others = gardenPets.filter((p) => p !== pet).map((p) => p.plot);
  const free = bedPlots().filter((p) => !others.includes(p.id));
  const jobs = pet.who === 'cat' ? free.filter((p) => isRipe(p)) : free.filter((p) => !isRipe(p));
  const target = jobs.length && (pet.who === 'cat' || Math.random() < 0.7) ? jobs[Math.floor(Math.random() * jobs.length)] : null;
  pet.plot = target ? target.id : null;
  if (!target) pet.goal = freeGardenSpot();
  else if (pet.who === 'duck') pet.goal = onPlot(target);
  else {
    // The cat waits beside the plot, so it can pounce on it from the side.
    const left = pet.x < target.x * TILE + TILE / 2;
    pet.goal = { x: target.x * TILE + TILE / 2 + (left ? -14 : 14), y: onPlot(target).y };
  }
  pet.mode = 'walk';
}

// Standing on a plot's own tile, in front of its crop.
const onPlot = (plot) => ({ x: plot.x * TILE + TILE / 2, y: (plot.y + 1) * TILE - 1 });

const PICK_CROUCH = 450;
const PICK_POUNCE = 320;

function moveGarden(now, dark) {
  for (const pet of gardenPets) {
    const dt = Math.min(0.1, (now - (pet.last || now)) / 1000);
    pet.last = now;
    if (pet.mode === 'walk') {
      const dx = pet.goal.x - pet.x;
      const dy = pet.goal.y - pet.y;
      const dist = Math.hypot(dx, dy);
      const step = PET_SPEED[pet.who] * dt;
      if (dist <= step) {
        Object.assign(pet, pet.goal);
        const plot = pet.plot && plots.get(pet.plot);
        if (plot && pet.who === 'cat' && isRipe(plot)) {
          // A quick crouch, facing the plot, then the pounce.
          pet.flip = plot.x * TILE + TILE / 2 < pet.x;
          pet.mode = 'pick';
          pet.home = { x: pet.x, y: pet.y };
          setPetAnim(pet, 'crouch', now);
          pet.until = now + PICK_CROUCH;
        } else if (plot && pet.who === 'duck' && !isRipe(plot)) {
          pet.mode = 'water';
          setPetAnim(pet, 'walkRight', now);
          pet.until = now + 3000 + Math.random() * 2500;
        } else {
          pet.plot = null;
          pet.mode = 'rest';
          setPetAnim(pet, pet.who === 'duck' ? 'sit' : 'sitDown', now);
          pet.until = now + 3000 + Math.random() * 5000;
        }
      } else {
        pet.x += (dx / dist) * step;
        pet.y += (dy / dist) * step;
        const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'walkRight' : 'walkLeft') : (dy > 0 ? 'walkDown' : 'walkUp');
        pet.flip = key === 'walkLeft' || (key !== 'walkRight' && pet.flip);
        setPetAnim(pet, key, now);
      }
      continue;
    }
    if (pet.mode === 'pick') {
      pickMove(pet, now);
      continue;
    }
    // The duck dances on the crop's tile while it waters: side to side, with a hop.
    if (pet.mode === 'water') {
      const beat = Math.floor((now - pet.start) / 320);
      setPetAnim(pet, beat % 2 ? 'walkLeft' : 'walkRight', pet.start);
      pet.flip = beat % 2 === 1;
      pet.lift = Math.round(Math.abs(Math.sin(((now - pet.start) / 320) * Math.PI)) * 2);
    }
    if (pet.mode === 'sleep' && dark <= 0.6) pet.until = 0;
    if (now < pet.until) continue;
    if (pet.mode === 'water') {
      pet.plot = null;
      pet.lift = 0;
      pet.mode = 'rest';
      setPetAnim(pet, 'sit', now);
      pet.until = now + 1200 + Math.random() * 2000;
      continue;
    }
    nextGardenPlan(pet, now, dark);
  }
}

// The cat's pounce on a ripe plot: crouch, then leap onto its tile and pick it.
function pickMove(pet, now) {
  const plot = plots.get(pet.plot);
  const at = plot ? onPlot(plot) : pet.home;
  if (pet.phase === undefined) pet.phase = 'crouch';
  if (pet.phase === 'crouch') {
    if (now < pet.until) return;
    Object.assign(pet, { phase: 'pounce', jumpAt: now });
    setPetAnim(pet, pet.flip ? 'walkLeft' : 'walkRight', now);
  }
  const t = Math.min(1, (now - pet.jumpAt) / PICK_POUNCE);
  pet.x = pet.home.x + (at.x - pet.home.x) * t;
  pet.y = pet.home.y + (at.y - pet.home.y) * t;
  pet.lift = 6 * Math.sin(Math.PI * t);
  if (t < 1) return;
  if (plot && isRipe(plot)) harvestInView(plot, now);
  // It stays where it landed, on the crop's tile, for a little sit.
  Object.assign(pet, { phase: undefined, plot: null, mode: 'rest', lift: 0 });
  setPetAnim(pet, 'sitDown', now);
  pet.until = now + 1200 + Math.random() * 2000;
}

// What's just been picked, floating up from its plot.
let pops = [];
async function harvestInView(plot, now) {
  const crop = crops.get(plot.crop);
  const n = await pickPlot(plot);
  if (!n) return;
  await savePantry();
  pops.push({ src: crop.produce, x: plot.x * TILE + TILE / 2, y: plot.y * TILE, start: now, n });
  if (gameWindow.open && gameWindowKind === 'pantry') drawGameWindow();
}

function petFrame(pet, now) {
  const who = petOf(pet.who);
  let a = who.anims[pet.anim] || who.anims.walkDown;
  let mirror = false;
  if (pet.anim === 'walkLeft' && a.flip) { a = who.anims.walkRight; mirror = true; }
  else if (pet.who === 'cat' && pet.flip && (pet.anim === 'sleep' || pet.anim === 'lieDown')) mirror = true;
  else if (pet.who === 'cat' && pet.anim === 'crouch') mirror = pet.flip !== Boolean(a.facesLeft);
  const meta = (pet.who === 'duck' ? DUCK_ANIMS : CAT_ANIMS).find((m) => m.key === pet.anim);
  let i = pet.who === 'duck' && pet.anim === 'sit' ? 0 : Math.floor(((now - pet.start) / 1000) * a.fps);
  i = meta && meta.once ? Math.min(i, a.count - 1) : i % Math.max(1, a.count);
  return { frame: a.start + i, mirror };
}

function petBoxIn(pet) {
  const who = petOf(pet.who);
  return { x: Math.round(pet.x - who.fw / 2), y: Math.round(pet.y - who.fh + 3 - (pet.lift || 0)), w: who.fw, h: who.fh };
}

function drawGardenPet(pet, now) {
  const sheet = sheetOf(pet.who);
  if (!sheet) return;
  const who = petOf(pet.who);
  const { frame, mirror } = petFrame(pet, now);
  const b = petBoxIn(pet);
  const across = Math.max(1, Math.floor(sheet.naturalWidth / who.fw));
  const sx = (frame % across) * who.fw;
  const sy = Math.floor(frame / across) * who.fh;
  wg.save();
  if (mirror) {
    wg.translate(b.x + who.fw, b.y);
    wg.scale(-1, 1);
    wg.drawImage(sheet, sx, sy, who.fw, who.fh, 0, 0, who.fw, who.fh);
  } else wg.drawImage(sheet, sx, sy, who.fw, who.fh, b.x, b.y, who.fw, who.fh);
  wg.restore();
}

function drawGarden(now) {
  wg.imageSmoothingEnabled = false;
  wg.clearRect(0, 0, world.width, world.height);
  drawGardenGround();
  // Crops, swaying plants and pets by depth: a pet whose feet are on a crop's
  // tile, or lower down, is in front of it; one further up is behind it.
  const map = mapHere(maps.garden) ? maps.garden : null;
  rustlePlants(map, gardenPets.map((pet) => ({ who: `garden-${pet.who}`, x: pet.x, y: pet.y })), performance.now());
  const things = [
    ...mapPlants(map, performance.now()),
    ...bedPlots().map((plot) => ({ y: plot.y * TILE + TILE / 2, draw: () => drawCrop(plot, Date.now()) })),
    ...gardenPets.filter((p) => sheetOf(p.who)).map((pet) => ({ y: pet.y, draw: () => drawGardenPet(pet, now) })),
  ];
  for (const thing of things.sort((a, b) => a.y - b.y)) thing.draw();
  // The plot tapped to plant, waiting for a crop from the pouch.
  if (pouchOpen && plantAt && sowing === null) dashedBox({ x: plantAt.x, y: plantAt.y, w: 1, d: 1 }, true);
  // Watering: drops falling on the plot while the duck dances.
  for (const pet of gardenPets) {
    const plot = pet.mode === 'water' && plots.get(pet.plot);
    if (!plot) continue;
    for (let i = 0; i < 3; i++) {
      const t = ((now - pet.start) / 900 + i / 3) % 1;
      wg.globalAlpha = 1 - t;
      wg.fillStyle = '#8FC3E8';
      wg.fillRect(plot.x * TILE + 4 + i * 4, plot.y * TILE - 2 + Math.round(t * 10), 1, 2);
    }
    wg.globalAlpha = 1;
  }
  // Your map's tiles that go in front: a canopy over everything.
  if (mapHere(maps.garden)) drawMapLayer(wg, maps.garden, 'front', now);
  drawDayLight(false);
  for (const pet of gardenPets) {
    const b = sheetOf(pet.who) && petBoxIn(pet);
    if (b && pet.hearts > now) heartUp(b, pet.hearts, now);
    if (b && pet.mode === 'sleep' && pet.anim === 'sleep') {
      const t = ((now - pet.start) / 2400) % 1;
      wg.globalAlpha = Math.sin(t * Math.PI);
      drawPixels(ZED, b.x + b.w / 2 + 3 + t * 4, b.y + (pet.who === 'duck' ? 2 : 8) - t * 10, '#FFFFFF');
      wg.globalAlpha = 1;
    }
  }
  pops = pops.filter((p) => now - p.start < 1400);
  for (const p of pops) {
    const img = picture(p.src);
    if (!img) continue;
    const t = (now - p.start) / 1400;
    wg.globalAlpha = Math.min(1, 2.5 - t * 2.5);
    wg.drawImage(img, Math.round(p.x - img.naturalWidth / 2), Math.round(p.y - img.naturalHeight - t * 14));
    wg.globalAlpha = 1;
  }
  blitWorld();
}

function heartUp(b, until, now) {
  const t = 1 - (until - now) / 1600;
  wg.globalAlpha = Math.min(1, 2 - t * 2);
  drawPixels(HEART, b.x + b.w / 2 - 3, b.y + 4 - t * 12, '#E0607A');
  wg.globalAlpha = 1;
}

// A tap in the garden: a pet gets a pat, a plot opens the seed pouch.
let plantAt = null;
function tapGarden(point) {
  const now = performance.now();
  const tx = Math.floor(point.x / TILE);
  const ty = Math.floor(point.y / TILE);
  // Playtesting with hurry on, a tap grows a plot a stage, even with a pet standing on it.
  if (hurry && plotAt(tx, ty)) return jumpPlot(plotAt(tx, ty));
  const pet = [...gardenPets].reverse().find((p) => {
    if (!sheetOf(p.who)) return false;
    const b = petBoxIn(p);
    return point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h;
  });
  if (pet) {
    pet.hearts = now + 1600;
    if (navigator.vibrate) navigator.vibrate(10);
    return;
  }
  if (!inBed(tx, ty)) return;
  plantAt = { x: tx, y: ty };
  openPouch();
}

// The seed pouch: a row under the garden with every crop. Pick one and it
// stays in your hand: every empty plot you tap or drag across gets it. ✕
// digs plots up instead. The grid button plants every empty plot at once, and
// ✓ puts the pouch away. A plot tapped first (plantAt) gets the crop you pick.
let pouchOpen = false;
let sowing = null; // the crop in your hand, '' digging up, null nothing
let sowDrag = false;
function openPouch() {
  pouchOpen = true;
  showHud();
  showPouch();
}
function closePouch() {
  pouchOpen = false;
  plantAt = null;
  stopSowing();
}
function startSowing(cropId) {
  sowing = cropId;
  pouchOpen = true;
  showHud();
  showPouch();
}
function stopSowing() {
  sowing = null;
  sowDrag = false;
  showHud();
  showPouch();
}
const POUCH_ICONS = {
  fill: '<svg viewBox="0 0 16 16"><rect x="1" y="1" width="4" height="4" fill="currentColor"/><rect x="6" y="1" width="4" height="4" fill="currentColor"/><rect x="11" y="1" width="4" height="4" fill="currentColor"/><rect x="1" y="6" width="4" height="4" fill="currentColor"/><rect x="6" y="6" width="4" height="4" fill="currentColor"/><rect x="11" y="6" width="4" height="4" fill="currentColor"/><rect x="1" y="11" width="4" height="4" fill="currentColor"/><rect x="6" y="11" width="4" height="4" fill="currentColor"/><rect x="11" y="11" width="4" height="4" fill="currentColor"/></svg>',
};
// Every spot in the bed with nothing growing.
function emptyPlots() {
  const out = [];
  for (let y = 0; y < sceneRows(); y++) for (let x = 0; x < sceneCols(); x++) if (inBed(x, y) && !plotAt(x, y)) out.push([x, y]);
  return out;
}
function showPouch() {
  const pouch = $('seed-pouch');
  pouch.hidden = !(scene === 'garden' && pouchOpen);
  if (pouch.hidden) return;
  const all = [...crops.values()];
  const target = plantAt && plotAt(plantAt.x, plantAt.y);
  pouch.innerHTML = `<div class="pouch-seeds">${all.map((c) => `<button type="button" class="held-button pouch-seed" data-sow="${c.id}" aria-pressed="${sowing === c.id}" aria-label="${escapeHtml(c.name)}" title="${escapeHtml(c.name)}"><img class="pixel" src="${c.produce || c.stages[c.stages.length - 1]}" alt=""></button>`).join('')}</div>
    <div class="pouch-tools">
      <button type="button" class="held-button" data-sow="" aria-pressed="${sowing === ''}" aria-label="Dig up" title="Dig up"${!target && !plots.size ? ' disabled' : ''}>✕</button>
      ${sowing ? `<button type="button" class="held-button" data-pouch="fill" aria-label="Plant every empty plot" title="Plant every empty plot"${emptyPlots().length ? '' : ' disabled'}>${POUCH_ICONS.fill}</button>` : ''}
      <button type="button" class="held-button place" data-pouch="close" aria-label="Done" title="Done">✓</button>
    </div>`;
}
$('seed-pouch').addEventListener('click', async (event) => {
  const sow = event.target.closest('[data-sow]');
  if (sow) {
    const id = sow.dataset.sow;
    // The same one again puts it back in the pouch.
    if (sowing === id) return stopSowing();
    // A plot tapped first gets it straight away.
    const at = plantAt;
    plantAt = null;
    if (at) {
      const plot = plotAt(at.x, at.y);
      if (id ? !plot || plot.crop !== id : plot) await plant(at.x, at.y, id);
    }
    return startSowing(id);
  }
  const action = event.target.closest('[data-pouch]')?.dataset.pouch;
  if (action === 'fill' && sowing) {
    for (const [x, y] of emptyPlots()) await plant(x, y, sowing);
    if (navigator.vibrate) navigator.vibrate(10);
    showPouch();
  }
  if (action === 'close') closePouch();
});
$('seed-pouch').addEventListener('pointerdown', (event) => event.stopPropagation());
async function sowAt(point) {
  const tx = Math.floor(point.x / TILE);
  const ty = Math.floor(point.y / TILE);
  if (!inBed(tx, ty)) return;
  const plot = plotAt(tx, ty);
  if (sowing === '' ? !plot : plot) return;
  await plant(tx, ty, sowing);
  showPouch();
}
// Called by the room's pointer handlers (room.js) in the garden.
function gardenDown(point, event) {
  if (sowing === null) return false;
  sowDrag = true;
  roomCanvas.setPointerCapture(event.pointerId);
  sowAt(point);
  return true;
}
function gardenMove(point) {
  if (sowDrag) sowAt(point);
}
function gardenUp() {
  if (!sowDrag) return false;
  sowDrag = false;
  return true;
}

// Hearts over a pet given a snack, in the room or the garden.
function treatPet(who) {
  const now = performance.now();
  if (scene === 'garden') {
    const pet = gardenPets.find((p) => p.who === who);
    if (pet) pet.hearts = now + 1600;
    return;
  }
  if (who === 'cat') catState.hearts = now + 1600;
  else duckTreat = now + 1600;
}
let duckTreat = 0;
function drawDuckTreat(now) {
  if (duckTreat > now && duckHere()) heartUp(duckBox(now), duckTreat, now);
}

// --- The game windows: plant, market, pantry, stove (opened by room-hud.js) ---

const thingImg = (src, size = 2) => (src ? `<img class="pixel" src="${src}" alt="" style="--s: ${size}">` : '');
const coinsHtml = (n) => `<span class="coins">${pixelIcon('coin')}<b>${n}</b></span>`;

function farmWindowHtml(kind) {
  if (kind === 'market') {
    const forSale = [...goods.values()];
    const sellable = Object.keys(pantry.has).map(thingOf).filter((t) => t && t.price > 0 && t.kind !== 'good');
    return `<p class="market-coins">${coinsHtml(pantry.coins || 0)}</p>
      <h3 class="market-h">Buy</h3>
      <div class="thing-grid">${forSale.map((g) => `<button type="button" class="thing-tile" data-buy="${g.id}" aria-label="${escapeHtml(g.name)}" title="${escapeHtml(g.name)}"${(pantry.coins || 0) < (Number(g.price) || 0) ? ' disabled' : ''}>
        ${thingImg(g.src)}${hasOf(`good:${g.id}`) ? `<span class="thing-n">${hasOf(`good:${g.id}`)}</span>` : ''}<span class="thing-price">${pixelIcon('coin')}${Number(g.price) || 0}</span></button>`).join('')}</div>
      <h3 class="market-h">Sell</h3>
      <div class="thing-grid">${sellable.map((t) => `<button type="button" class="thing-tile" data-sell="${t.key}" aria-label="${escapeHtml(t.name)}" title="${escapeHtml(t.name)}">
        ${thingImg(t.src)}<span class="thing-n">${hasOf(t.key)}</span><span class="thing-price">${pixelIcon('coin')}${t.price}</span></button>`).join('')}</div>`;
  }
  if (kind === 'pantry') {
    const all = Object.keys(pantry.has).map(thingOf).filter(Boolean);
    const order = { recipe: 0, crop: 1, good: 2 };
    all.sort((a, b) => order[a.kind] - order[b.kind]);
    const picked = pantryPick && thingOf(pantryPick);
    return `<p class="market-coins">${coinsHtml(pantry.coins || 0)}</p>
      <div class="thing-grid">${all.map((t) => `<button type="button" class="thing-tile${pantryPick === t.key ? ' on' : ''}" data-pantry="${t.key}" aria-label="${escapeHtml(t.name)}" title="${escapeHtml(t.name)}">
        ${thingImg(t.src)}<span class="thing-n">${hasOf(t.key)}</span></button>`).join('')}</div>
      ${picked && hasOf(picked.key) ? `<div class="give">
        <span class="give-name">${escapeHtml(picked.name)}</span>
        <button class="ink-button" type="button" data-give="cat">${escapeHtml(cat.name)}</button>
        ${duckHere() ? `<button class="ink-button" type="button" data-give="duck">${escapeHtml(duck.name)}</button>` : ''}
      </div>` : ''}`;
  }
  if (kind === 'stove') {
    const cooking = kitchen.recipe && recipes.get(kitchen.recipe);
    const all = [...recipes.values()];
    return `${cooking ? `<div class="cooking">${thingImg(cooking.src, 3)}<div class="cook-bar"><span id="cook-fill"></span></div><span id="cook-left" class="muted"></span></div>` : ''}
      <div class="recipes">${all.map((r) => `<div class="recipe-row">
        <span class="recipe-pic" title="${escapeHtml(r.name)}">${thingImg(r.src)}</span>
        <span class="recipe-needs">${(r.needs || []).map(({ thing, n }) => {
          const t = thingOf(thing);
          return t ? `<span class="need${hasOf(thing) >= n ? '' : ' short'}" title="${escapeHtml(t.name)}">${thingImg(t.src, 1)}${hasOf(thing)}/${n}</span>` : '';
        }).join('')}</span>
        <button class="ink-button" type="button" data-cook="${r.id}"${cooking || !canCook(r) ? ' disabled' : ''}>Cook</button>
      </div>`).join('')}</div>`;
  }
  return '';
}

const FARM_TITLES = { market: 'Market', pantry: 'Pantry', stove: 'Stove' };
let pantryPick = null;

async function drawFarmWindow(kind) {
  $('gw-title').textContent = FARM_TITLES[kind];
  $('gw-body').innerHTML = farmWindowHtml(kind);
  if (kind === 'stove') showCookTime();
}

function showCookTime() {
  const fill = $('cook-fill');
  if (!fill || !kitchen.recipe) return;
  const recipe = recipes.get(kitchen.recipe);
  const total = Math.max(1, (Number(recipe?.minutes) || 0) * 60000);
  const left = Math.max(0, kitchen.doneAt - Date.now());
  fill.style.width = `${Math.round((1 - left / total) * 100)}%`;
  const mins = Math.ceil(left / 60000);
  $('cook-left').textContent = mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
}
setInterval(() => { if (gameWindow.open && gameWindowKind === 'stove') showCookTime(); }, 1000);

$('gw-body').addEventListener('click', async (event) => {
  if (!FARM_TITLES[gameWindowKind]) return;
  const buy = event.target.closest('[data-buy]');
  if (buy) {
    const good = goods.get(buy.dataset.buy);
    const price = Number(good.price) || 0;
    if ((pantry.coins || 0) < price) return;
    pantry.coins = (pantry.coins || 0) - price;
    addThing(`good:${good.id}`, 1);
    await savePantry();
    drawGameWindow();
    return;
  }
  const sell = event.target.closest('[data-sell]');
  if (sell) {
    const t = thingOf(sell.dataset.sell);
    if (!t || !hasOf(t.key)) return;
    addThing(t.key, -1);
    pantry.coins = (pantry.coins || 0) + t.price;
    await savePantry();
    drawGameWindow();
    return;
  }
  const pick = event.target.closest('[data-pantry]');
  if (pick) {
    pantryPick = pantryPick === pick.dataset.pantry ? null : pick.dataset.pantry;
    drawGameWindow();
    return;
  }
  const give = event.target.closest('[data-give]');
  if (give && pantryPick && hasOf(pantryPick)) {
    addThing(pantryPick, -1);
    await savePantry();
    treatPet(give.dataset.give);
    if (navigator.vibrate) navigator.vibrate(10);
    if (!hasOf(pantryPick)) pantryPick = null;
    drawGameWindow();
    return;
  }
  const cookButton = event.target.closest('[data-cook]');
  if (cookButton) {
    await cook(recipes.get(cookButton.dataset.cook));
    drawGameWindow();
  }
});
