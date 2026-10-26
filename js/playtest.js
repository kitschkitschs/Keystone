// playtest.js: Playtest, in the Workshop (so only on a computer), for trying
// the game out without playing for it.
//
// Its window holds everything there is: tap a piece to place it in the room
// (whether you have one or not), a crop to plant it in the garden, and a thing
// from the market or a snack to put one in the pantry. Coins are there too.
//
// The wand at the top switches "hurry" on: then a tap on a plot in the garden
// grows it a stage (a ripe one is picked), and a tap on the stove finishes what
// it's cooking. Hurry isn't saved: it's off again when the app is closed.

let hurry = false;

const PLAYTEST_COINS = [10, 100, 1000];

function playtestHtml() {
  const grid = (things) => `<div class="thing-grid">${things.map(({ attr, name, src, n, style }) => `
    <button type="button" class="thing-tile" ${attr} aria-label="${escapeHtml(name)}" title="${escapeHtml(name)}">
      ${src ? (style ? `<img class="pixel" src="${src}" alt="" style="${style}">` : thingImg(src)) : '<span class="thing-x">?</span>'}${n ? `<span class="thing-n">${n}</span>` : ''}</button>`).join('')}</div>`;
  const pantryThings = (map, kind) => [...map.values()].map((item) => ({
    attr: `data-pt-give="${kind}:${item.id}"`, name: item.name || '', src: item.src, n: hasOf(`${kind}:${item.id}`),
  }));
  const cropThings = [...crops.values()].map((crop) => ({
    attr: `data-pt-sow="${crop.id}"`, name: crop.name || '', src: crop.produce || crop.stages[crop.stages.length - 1],
  }));
  const pieceThings = [...pieces.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((piece) => ({
    attr: `data-pt-place="${piece.id}"`, name: pieceLabel(piece), src: piece.views[0].src, style: `--pw: ${piece.views[0].pw}; --ph: ${piece.views[0].ph}`,
  }));
  const section = (title, things) => (things.length ? `<h3 class="market-h">${title}</h3>${grid(things)}` : '');
  return `<p class="wand-switch">
      <button type="button" class="ink-button" data-pt="hurry" aria-pressed="${hurry}" aria-label="Hurry" title="Hurry">${pixelIcon('wand')}</button>
    </p>
    <p class="market-coins">${coinsHtml(pantry.coins || 0)}
      ${PLAYTEST_COINS.map((n) => `<button type="button" class="text-button" data-pt-coins="${n}">+${n}</button>`).join('')}</p>
    ${section('Pieces', pieceThings)}
    ${section('Crops', cropThings)}
    ${section('Pantry', [...pantryThings(goods, 'good'), ...pantryThings(recipes, 'recipe')])}`;
}

// A plot grows one stage. A ripe one is picked instead.
async function jumpPlot(plot) {
  const crop = crops.get(plot.crop);
  if (!crop) return;
  const now = Date.now();
  if (isRipe(plot, now)) return harvestInView(plot, performance.now());
  const total = Math.max(1, plot.ripeAt - plot.plantedAt);
  const steps = Math.max(1, ripeStage(crop));
  // Waiting to grow again, or already on its last stage: ripe now.
  const next = plot.regrown ? steps : Math.floor(((now - plot.plantedAt) / total) * steps) + 1;
  const plantedAt = next >= steps ? now - total : Math.round(now - ((next + 0.01) / steps) * total);
  const saved = await putItem({ ...plot, plantedAt, ripeAt: next >= steps ? now : plantedAt + total, regrown: false });
  plots.set(saved.id, saved);
  if (navigator.vibrate) navigator.vibrate(10);
}

// What's on the stove is ready now.
async function finishCooking() {
  if (!kitchen.recipe) return;
  kitchen = await putItem({ ...kitchen, doneAt: Date.now() });
  await tendKitchen();
  if (navigator.vibrate) navigator.vibrate(10);
}

// A piece in your hand to place, in the room, whether you have one or not.
async function playtestPlace(piece) {
  if (scene === 'garden') leaveGarden();
  if (piece.type === 'wallpaper' || piece.type === 'floor') {
    room[piece.type] = room[piece.type] === piece.id ? '' : piece.id;
    await saveRoomSettings();
    showRoomPanel();
    return;
  }
  decorating = true;
  holdPiece(piece);
}

$('gw-body').addEventListener('click', async (event) => {
  if (gameWindowKind !== 'playtest') return;
  if (event.target.closest('[data-pt="hurry"]')) {
    hurry = !hurry;
    drawGameWindow();
    return;
  }
  const coins = event.target.closest('[data-pt-coins]');
  if (coins) {
    pantry.coins = (pantry.coins || 0) + Number(coins.dataset.ptCoins);
    await savePantry();
    drawGameWindow();
    return;
  }
  const place = event.target.closest('[data-pt-place]');
  if (place && pieces.has(place.dataset.ptPlace)) return playtestPlace(pieces.get(place.dataset.ptPlace));
  const sow = event.target.closest('[data-pt-sow]');
  if (sow && crops.has(sow.dataset.ptSow)) {
    if (scene !== 'garden') enterGarden();
    startSowing(sow.dataset.ptSow);
    return;
  }
  const give = event.target.closest('[data-pt-give]');
  if (give) {
    addThing(give.dataset.ptGive, 1);
    await savePantry();
    drawGameWindow();
  }
});
