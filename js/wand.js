// wand.js: the wand, for setting the game up and trying things out.
//
// The wand is a switch in the Workshop. While it's on, a tap hurries things
// along: a plot in the garden grows a stage (and a ripe one is picked), and the
// stove finishes what it's cooking. The wand's window also holds everything
// there is in the game: tap a crop, a thing from the market, a snack or a piece
// to give yourself one, and the coins are there too.
//
// Nothing here is saved: the wand switches itself off when the app is closed.

let wand = false;

const WAND_COINS = [10, 100, 1000];

function wandHtml() {
  const row = (things, what) => `<div class="thing-grid">${things.map(({ key, name, src, n }) => `
    <button type="button" class="thing-tile" data-wand-give="${what}:${key}" aria-label="${escapeHtml(name)}" title="${escapeHtml(name)}">
      ${src ? thingImg(src) : '<span class="thing-x">?</span>'}${n ? `<span class="thing-n">${n}</span>` : ''}</button>`).join('')}</div>`;
  const stock = (map, kind) => [...map.values()].map((item) => ({
    key: item.id,
    name: item.name || '',
    src: kind === 'crop' ? item.produce || item.stages[item.stages.length - 1] : item.src,
    n: hasOf(`${kind}:${item.id}`),
  }));
  const locked = machinePieces().map((piece) => ({
    key: piece.id, name: pieceLabel(piece), src: piece.views[0].src, n: copiesOf(piece),
  }));
  return `<p class="wand-switch">
      <button type="button" class="ink-button" data-wand="toggle" aria-pressed="${wand}" aria-label="Wand" title="Wand">${pixelIcon('wand')}</button>
    </p>
    <p class="market-coins">${coinsHtml(pantry.coins || 0)}
      ${WAND_COINS.map((n) => `<button type="button" class="text-button" data-wand-coins="${n}">+${n}</button>`).join('')}</p>
    ${crops.size ? row(stock(crops, 'crop'), 'crop') : ''}
    ${goods.size ? row(stock(goods, 'good'), 'good') : ''}
    ${recipes.size ? row(stock(recipes, 'recipe'), 'recipe') : ''}
    ${locked.length ? row(locked, 'piece') : ''}`;
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

// One more of something, straight into the pantry (or, for a piece, a copy of it).
async function wandGive(what) {
  const [kind, id] = [what.slice(0, what.indexOf(':')), what.slice(what.indexOf(':') + 1)];
  if (kind === 'piece') {
    const piece = pieces.get(id);
    if (!piece) return;
    const saved = await putItem({ ...piece, got: copiesOf(piece) + 1, unlockedAt: piece.unlockedAt || Date.now() });
    pieces.set(saved.id, saved);
    return;
  }
  addThing(`${kind}:${id}`, 1);
  await savePantry();
}

$('gw-body').addEventListener('click', async (event) => {
  if (gameWindowKind !== 'wand') return;
  const toggle = event.target.closest('[data-wand]');
  if (toggle) {
    wand = !wand;
    drawGameWindow();
    return;
  }
  const coins = event.target.closest('[data-wand-coins]');
  if (coins) {
    pantry.coins = (pantry.coins || 0) + Number(coins.dataset.wandCoins);
    await savePantry();
    drawGameWindow();
    return;
  }
  const give = event.target.closest('[data-wand-give]');
  if (give) {
    await wandGive(give.dataset.wandGive);
    drawGameWindow();
  }
});
