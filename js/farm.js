// farm.js: the garden, the farmer's market, the pantry and the stove.
//
// The garden is a second scene on the room's canvas (the sprout button on the
// room goes there, the house button comes back). Its bed is a grid of plots:
// tap one to choose what grows there. Crops grow on the real clock and the pets
// do the work: they wander between the plots, tend them and pick what's ripe,
// which goes in the pantry. A crop that doesn't regrow is planted again
// straight away, so the garden keeps going on its own.
//
// Produce sells at the farmer's market for coins, and the market sells what
// the garden can't grow (eggs, milk...). Recipes turn things from the pantry
// into snacks on a stove: any piece marked as a stove (see room.js). Tap the
// stove in the room to cook. Snacks can be given to the pets.
//
// Saved as items (all part of "Save game only", see sync.js):
//   { id: "crop-...", kind: "crop", day: "", name, fw, fh, stages: [src], produce, hours, regrow, yield, price }
//        stages: its pictures from seed to ripe, fw x fh pixels each, standing
//        on its plot. produce: the picture of what you pick. hours: from
//        planting to ripe. regrow: hours until it's ripe again after picking
//        (0: it's planted again from seed). yield: how many each picking.
//        price: coins each at the market.
//   { id: "good-...", kind: "good", day: "", name, src, price }    sold at the market
//   { id: "recipe-...", kind: "recipe", day: "", name, src, needs: [{ thing, n }], minutes, price }
//   { id: "plot-<x>-<y>", kind: "plot", day: "", x, y, crop, plantedAt, ripeAt, regrown }
//   { id: "garden", kind: "garden", day: "", cols, rows, grass, soil }    the bed's size, and floor pieces for its ground
//   { id: "pantry", kind: "pantry", day: "", coins, has: { thing: n } }
//   { id: "kitchen", kind: "kitchen", day: "", recipe, doneAt }    what's cooking
// A thing is "crop:<id>", "good:<id>" or "recipe:<id>".

const HOUR = 3600 * 1000;
let crops = new Map();
let goods = new Map();
let recipes = new Map();
let plots = new Map();
const garden = { cols: 6, rows: 3, grass: '', soil: '' };
let pantry = { coins: 0, has: {} };
let kitchen = { recipe: '', doneAt: 0 };
let scene = 'room'; // or 'garden'

// Called by loadRoom (room.js) with every item.
function loadFarm(items) {
  crops = new Map();
  goods = new Map();
  recipes = new Map();
  plots = new Map();
  Object.assign(garden, { cols: 6, rows: 3, grass: '', soil: '' });
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
const saveGarden = () => putItem({ id: 'garden', kind: 'garden', day: '', cols: garden.cols, rows: garden.rows, grass: garden.grass, soil: garden.soil });

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
  const n = times * Math.max(1, Number(crop.yield) || 1);
  addThing(`crop:${crop.id}`, n);
  const regrows = Number(crop.regrow) > 0;
  const next = await putItem({ ...plot, plantedAt: regrows ? plot.plantedAt : last, ripeAt: last + again, regrown: regrows, pickedAt: last });
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

// Which picture a plot shows: the stages grow in turn, the last one is ripe.
// A crop that regrows waits on its last-but-one stage.
function stageOf(plot, now = Date.now()) {
  const crop = crops.get(plot.crop);
  const n = crop.stages.length;
  if (!n) return null;
  if (isRipe(plot, now)) return crop.stages[n - 1];
  if (plot.regrown) return crop.stages[Math.max(0, n - 2)];
  const t = (now - plot.plantedAt) / Math.max(1, plot.ripeAt - plot.plantedAt);
  return crop.stages[Math.max(0, Math.min(n - 2, Math.floor(t * (n - 1))))];
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
// It's drawn on the room's canvas, the same size as the room: a hedge where the
// wall would be, then grass, with the bed in the middle.

function bed() {
  const cols = Math.max(1, Math.min(garden.cols, room.cols - 2));
  const down = Math.max(1, Math.min(garden.rows, room.floorRows - 2));
  return { x: Math.floor((room.cols - cols) / 2), y: room.wallRows + 1, cols, rows: down };
}
const inBed = (tx, ty) => { const b = bed(); return tx >= b.x && tx < b.x + b.cols && ty >= b.y && ty < b.y + b.rows; };
const plotAt = (tx, ty) => plots.get(`plot-${tx}-${ty}`);
const bedPlots = () => [...plots.values()].filter((p) => inBed(p.x, p.y));

function groundPicture(id) {
  const piece = id && pieces.get(id);
  return piece ? picture(piece.views[0].src) : null;
}

function drawGardenGround() {
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
  decorating = false;
  held = null;
  gardenPets = [{ who: 'cat' }, ...(duckHere() ? [{ who: 'duck' }] : [])].map((p, i) => {
    const b = bed();
    const tx = b.x - 1 + i * (b.cols + 1);
    return { ...p, x: Math.max(0, tx) * TILE + TILE / 2, y: (b.y + b.rows) * TILE + 11, mode: 'rest', anim: p.who === 'duck' ? 'sit' : 'sitDown', start: performance.now(), until: performance.now() + 1500 + i * 1200, flip: false, hearts: 0 };
  });
  showRoomPanel();
  if (gameWindowKind === 'inventory') closeGameWindow();
}

function leaveGarden() {
  scene = 'room';
  showRoomPanel();
  if (gameWindowKind === 'plant' || gameWindowKind === 'market') closeGameWindow();
}

function setPetAnim(pet, key, now) {
  if (pet.anim === key) return;
  pet.anim = key;
  pet.start = now;
}

// What a pet does next: pick something ripe, tend a plot, or wander and sit.
function nextGardenPlan(pet, now, dark) {
  if (dark > 0.6) {
    pet.mode = 'sleep';
    setPetAnim(pet, pet.who === 'duck' ? 'sleep' : 'sleep', now);
    pet.until = now + 8000;
    return;
  }
  const others = gardenPets.filter((p) => p !== pet).map((p) => p.plot);
  const growing = bedPlots().filter((p) => !others.includes(p.id));
  const ripe = growing.filter((p) => isRipe(p));
  let target = null;
  if (ripe.length) target = ripe[Math.floor(Math.random() * ripe.length)];
  else if (growing.length && Math.random() < 0.6) target = growing[Math.floor(Math.random() * growing.length)];
  pet.plot = target ? target.id : null;
  if (target) pet.goal = standAt(target);
  else {
    const tx = Math.floor(Math.random() * room.cols);
    const ty = room.wallRows + Math.floor(Math.random() * room.floorRows);
    pet.goal = { x: tx * TILE + TILE / 2, y: ty * TILE + 13 };
  }
  pet.mode = 'walk';
}

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
        if (pet.plot && plots.has(pet.plot)) {
          pet.mode = 'tend';
          setPetAnim(pet, pet.who === 'duck' ? 'peck' : 'groom', now);
          pet.until = now + 2500 + Math.random() * 2500;
        } else {
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
    // The duck pecks again and again while it tends.
    if (pet.mode === 'tend' && pet.who === 'duck' && now - pet.start > 1400) pet.start = now;
    if (pet.mode === 'sleep' && dark <= 0.6) pet.until = 0;
    if (now < pet.until) continue;
    if (pet.mode === 'tend') {
      const plot = plots.get(pet.plot);
      pet.plot = null;
      if (plot && isRipe(plot)) harvestInView(plot, now);
      pet.mode = 'rest';
      setPetAnim(pet, pet.who === 'duck' ? 'sit' : 'sitDown', now);
      pet.until = now + 1200 + Math.random() * 2000;
      continue;
    }
    nextGardenPlan(pet, now, dark);
  }
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
  const meta = (pet.who === 'duck' ? DUCK_ANIMS : CAT_ANIMS).find((m) => m.key === pet.anim);
  let i = pet.who === 'duck' && pet.anim === 'sit' ? 0 : Math.floor(((now - pet.start) / 1000) * a.fps);
  i = meta && meta.once ? Math.min(i, a.count - 1) : i % Math.max(1, a.count);
  return { frame: a.start + i, mirror };
}

function petBoxIn(pet) {
  const who = petOf(pet.who);
  return { x: Math.round(pet.x - who.fw / 2), y: Math.round(pet.y - who.fh + 3), w: who.fw, h: who.fh };
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
  // The pets go in front of the crops, so they never get lost among them.
  for (const plot of bedPlots().sort((a, b) => a.y - b.y)) drawCrop(plot, Date.now());
  for (const pet of gardenPets.filter((p) => sheetOf(p.who)).sort((a, b) => a.y - b.y)) drawGardenPet(pet, now);
  // Tending: drops of water falling on the plot.
  for (const pet of gardenPets) {
    const plot = pet.mode === 'tend' && plots.get(pet.plot);
    if (!plot) continue;
    for (let i = 0; i < 3; i++) {
      const t = ((now - pet.start) / 900 + i / 3) % 1;
      wg.globalAlpha = 1 - t;
      wg.fillStyle = '#8FC3E8';
      wg.fillRect(plot.x * TILE + 4 + i * 4, plot.y * TILE - 2 + Math.round(t * 10), 1, 2);
    }
    wg.globalAlpha = 1;
  }
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
  const g = roomCanvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(world, 0, 0, roomCanvas.width, roomCanvas.height);
}

function heartUp(b, until, now) {
  const t = 1 - (until - now) / 1600;
  wg.globalAlpha = Math.min(1, 2 - t * 2);
  drawPixels(HEART, b.x + b.w / 2 - 3, b.y + 4 - t * 12, '#E0607A');
  wg.globalAlpha = 1;
}

// A tap in the garden: a pet gets a pat, a plot opens what to plant.
let plantAt = null;
function tapGarden(point) {
  const now = performance.now();
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
  const tx = Math.floor(point.x / TILE);
  const ty = Math.floor(point.y / TILE);
  if (!inBed(tx, ty)) return;
  plantAt = { x: tx, y: ty };
  openGameWindow('plant');
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
  if (kind === 'plant') {
    const plot = plantAt && plotAt(plantAt.x, plantAt.y);
    const all = [...crops.values()];
    if (!all.length) return `<div class="workshop"><button type="button" class="ws-button" data-farm-go="crops"><b>Farm</b></button></div>`;
    return `<div class="thing-grid">
      ${all.map((c) => `<button type="button" class="thing-tile${plot && plot.crop === c.id ? ' on' : ''}" data-plant="${c.id}" aria-label="${escapeHtml(c.name)}" title="${escapeHtml(c.name)}">${thingImg(c.produce || c.stages[c.stages.length - 1])}</button>`).join('')}
      ${plot ? '<button type="button" class="thing-tile" data-plant="" aria-label="Clear" title="Clear"><span class="thing-x">✕</span></button>' : ''}
    </div>`;
  }
  if (kind === 'market') {
    const forSale = [...goods.values()];
    const sellable = Object.keys(pantry.has).map(thingOf).filter((t) => t && t.price > 0 && t.kind !== 'good');
    return `<p class="market-coins">${coinsHtml(pantry.coins || 0)}</p>
      <h3 class="market-h">Buy</h3>
      <div class="thing-grid">${forSale.map((g) => `<button type="button" class="thing-tile" data-buy="${g.id}" aria-label="${escapeHtml(g.name)}" title="${escapeHtml(g.name)}"${(pantry.coins || 0) < (Number(g.price) || 0) ? ' disabled' : ''}>
        ${thingImg(g.src)}${hasOf(`good:${g.id}`) ? `<span class="thing-n">${hasOf(`good:${g.id}`)}</span>` : ''}<span class="thing-price">${pixelIcon('coin')}${Number(g.price) || 0}</span></button>`).join('')}
      ${forSale.length ? '' : '<button type="button" class="thing-tile" data-farm-go="goods" aria-label="Farm"><span class="thing-x">+</span></button>'}</div>
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
      </div>`).join('')}
      ${all.length ? '' : '<div class="workshop"><button type="button" class="ws-button" data-farm-go="recipes"><b>Farm</b></button></div>'}</div>`;
  }
  return '';
}

const FARM_TITLES = { plant: 'Plant', market: 'Market', pantry: 'Pantry', stove: 'Stove' };
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
  const go = event.target.closest('[data-farm-go]');
  if (go) {
    farmTab = go.dataset.farmGo;
    closeGameWindow();
    goTo('farm');
    return;
  }
  const plantButton = event.target.closest('[data-plant]');
  if (plantButton && plantAt) {
    const current = plotAt(plantAt.x, plantAt.y);
    if (!current || current.crop !== plantButton.dataset.plant) await plant(plantAt.x, plantAt.y, plantButton.dataset.plant);
    closeGameWindow();
    return;
  }
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
