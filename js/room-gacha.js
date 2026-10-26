// room-gacha.js: the gacha machine and the catalogue, shown in the room's pop-up
// window (see room-hud.js).
//
// A piece marked "locked" (see room.js) is inside the machine: it isn't in your
// inventory until you turn the handle and it comes out. Pulls are free for now,
// while we try it out. The catalogue shows everything there is to collect, by set,
// with colours of the same piece side by side. Locked ones show as silhouettes.

const RARITIES = [['common', 'Common', 70], ['rare', 'Rare', 25], ['special', 'Special', 5]];
const CAPSULE = { common: '#E8B4B0', rare: '#8FA6C2', special: '#E2BE5C' };
const rarityName = (key) => (RARITIES.find(([k]) => k === key) || RARITIES[0])[1];

// phase: ready, turning (the handle goes round), capsule (waiting in the chute,
// tap to open) or open (the prize is showing).
const gacha = { phase: 'ready', prize: null, start: 0 };

function openGacha() {
  if (gacha.phase === 'turning') gacha.phase = 'capsule';
  openGameWindow('gacha');
}

const lockedPieces = () => [...pieces.values()].filter((p) => p.locked);
const familyOf = (p) => p.family || p.id;

// Draws the machine in the pop-up window (see room-hud.js).
function drawGacha() {
  if (gameWindowKind !== 'gacha') return;
  const inside = lockedPieces().length;
  const prize = gacha.prize && pieces.get(gacha.prize);
  let action;
  if (gacha.phase === 'capsule') action = '<button class="ink-button" type="button" data-gacha="open">Open the capsule</button>';
  else if (gacha.phase === 'open' && prize) {
    action = `<div class="prize">
        <img class="pixel" src="${prize.views[0].src}" alt="" style="--pw: ${prize.views[0].pw}; --ph: ${prize.views[0].ph}">
        <p><b>${escapeHtml(prize.name)}</b> <span class="muted">· ${rarityName(prize.rarity)}</span></p>
        <p class="muted">It's in your inventory now.</p>
      </div>
      ${inside ? '<button class="ink-button" type="button" data-gacha="pull">Turn the handle again</button>' : ''}`;
  } else if (gacha.phase === 'turning') action = '';
  else action = inside ? '<button class="ink-button" type="button" data-gacha="pull">Turn the handle</button>' : '';
  $('gw-title').textContent = 'Gachapon';
  $('gw-body').innerHTML = `
    <div class="machine-wrap"><canvas id="gacha-machine" class="pixel" width="48" height="64"></canvas></div>
    <p class="muted machine-note">${inside ? `${inside} ${inside === 1 ? 'thing' : 'things'} inside. Free to turn while we try it out.`
      : 'Empty: everything is collected. Pieces you add go in here.'}</p>
    <div class="machine-action">${action}</div>
    <p class="machine-more"><button class="text-button" type="button" data-gw="catalogue">See the catalogue</button></p>`;
  drawMachine(performance.now());
}

// --- The catalogue ---

function catalogueHtml(all) {
  if (!all.length) return '';
  const got = all.filter((p) => !p.locked).length;
  const sets = new Map();
  for (const p of [...all].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))) {
    const set = (p.set || '').trim();
    if (!sets.has(set)) sets.set(set, new Map());
    const families = sets.get(set);
    // Colours of one piece sit together, under the first one's family.
    const key = familyOf(p);
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(p);
  }
  const names = [...sets.keys()].sort((a, b) => (a === '') - (b === '') || a.localeCompare(b));
  return `<p class="muted cat-count">${got} of ${all.length} collected</p>
    ${names.map((name) => {
      const families = [...sets.get(name).values()];
      const members = families.flat();
      return `<section class="cat-set">
        <h3>${name ? escapeHtml(name) : 'Not in a set'} <span class="muted">${members.filter((p) => !p.locked).length} of ${members.length}</span></h3>
        <div class="cat-grid">${families.map((fam) => `<div class="cat-family${fam.length > 1 ? ' colours' : ''}">${fam.map(catalogueTile).join('')}</div>`).join('')}</div>
      </section>`;
    }).join('')}`;
}

function catalogueTile(p) {
  const v = p.views[0];
  return `<button type="button" class="cat-tile${p.locked ? ' locked' : ''}" data-cat-piece="${p.id}" aria-label="Edit ${escapeHtml(p.name)}">
    <img class="pixel" src="${v.src}" alt="" style="--pw: ${v.pw}; --ph: ${v.ph}">
    <span class="inv-name">${p.locked ? '?' : escapeHtml(p.name)}</span>
    ${p.rarity && p.rarity !== 'common' ? `<span class="cat-rarity ${p.rarity}">${rarityName(p.rarity)}</span>` : ''}
  </button>`;
}

// --- Turning the handle ---

// Picks a rarity first (only ones still in the machine), then a piece of that rarity.
function pickPrize() {
  const pool = lockedPieces();
  const present = RARITIES.filter(([key]) => pool.some((p) => (p.rarity || 'common') === key));
  let roll = Math.random() * present.reduce((sum, [, , w]) => sum + w, 0);
  let rarity = present[0][0];
  for (const [key, , w] of present) {
    if (roll < w) { rarity = key; break; }
    roll -= w;
  }
  const choices = pool.filter((p) => (p.rarity || 'common') === rarity);
  return choices[Math.floor(Math.random() * choices.length)];
}

async function pull() {
  if (!lockedPieces().length) return;
  const prize = pickPrize();
  // Saved straight away, so closing the app mid-turn never loses it.
  const saved = await putItem({ ...prize, locked: false, unlockedAt: Date.now() });
  pieces.set(saved.id, saved);
  showBackupInfo();
  Object.assign(gacha, { phase: 'turning', prize: saved.id, start: performance.now() });
  drawGacha();
  if (navigator.vibrate) navigator.vibrate([10, 60, 10, 60, 10]);
  requestAnimationFrame(turning);
}

const TURN_TIME = 1400;
function turning(now) {
  if (gacha.phase !== 'turning' || gameWindowKind !== 'gacha') return;
  drawMachine(now);
  if (now - gacha.start < TURN_TIME) {
    requestAnimationFrame(turning);
    return;
  }
  gacha.phase = 'capsule';
  drawGacha();
}

// Tap a piece in the catalogue to edit it, locked or not. The window shows what
// changed once the editing sheet closes.
$('gw-body').addEventListener('click', (event) => {
  const tile = event.target.closest('[data-cat-piece]');
  const piece = tile && pieces.get(tile.dataset.catPiece);
  if (piece) openPieceDetails(piece);
});
$('sheet').addEventListener('close', () => { if (gameWindowKind === 'catalogue') drawGameWindow(); });

$('gw-body').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-gacha]');
  if (!button) return;
  const action = button.dataset.gacha;
  if (action === 'pull') {
    button.disabled = true;
    await pull();
  }
  if (action === 'open') {
    gacha.phase = 'open';
    drawGacha();
  }
});

// --- The machine, drawn in pixels ---

const MACHINE = { line: '#3B2C2A', body: '#D99A93', bodyD: '#B97872', glass: '#DCEAF0', glassL: '#F4FAFC', cream: '#F2E8D5', brass: '#D9B55A', chute: '#5A4542' };

function disc(g, cx, cy, r, colour) {
  g.fillStyle = colour;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) g.fillRect(x, y, 1, 1);
  }
}

// Capsules in the dome: [x, y, colour key]. They jiggle while the handle turns.
const DOME_CAPSULES = [[17, 27, 'common'], [24, 28, 'rare'], [31, 27, 'common'], [14, 21, 'rare'], [21, 22, 'common'],
  [28, 21, 'special'], [34, 21, 'common'], [18, 15, 'common'], [25, 15, 'rare'], [31, 14, 'common']];

function drawMachine(now) {
  const c = $('gacha-machine');
  if (!c) return;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const turning = gacha.phase === 'turning';
  const t = turning ? Math.min(1, (now - gacha.start) / TURN_TIME) : 0;
  const prize = gacha.prize && pieces.get(gacha.prize);
  const empty = !lockedPieces().length && gacha.phase === 'ready';

  // The dome, with capsules inside.
  disc(g, 24, 20, 18, MACHINE.line);
  disc(g, 24, 20, 17, MACHINE.glass);
  if (!empty) {
    DOME_CAPSULES.forEach(([x, y, key], i) => {
      const jiggle = turning ? Math.round(Math.sin(now / 40 + i * 2) * 1.5) : 0;
      disc(g, x + jiggle + 0.5, y - Math.abs(jiggle) + 0.5, 3.6, MACHINE.line);
      disc(g, x + jiggle + 0.5, y - Math.abs(jiggle) + 0.5, 2.7, CAPSULE[key]);
    });
  }
  g.fillStyle = MACHINE.glassL;
  g.fillRect(13, 10, 2, 5);
  g.fillRect(15, 8, 2, 2);

  // The body.
  g.fillStyle = MACHINE.line;
  g.fillRect(7, 33, 34, 29);
  g.fillStyle = MACHINE.body;
  g.fillRect(8, 34, 32, 27);
  g.fillStyle = MACHINE.bodyD;
  g.fillRect(8, 56, 32, 5);
  g.fillStyle = MACHINE.cream;
  g.fillRect(8, 34, 32, 2);

  // The handle: a brass dial with a bar that goes round once.
  disc(g, 19, 45, 6, MACHINE.line);
  disc(g, 19, 45, 5, MACHINE.brass);
  const angle = -Math.PI / 2 + t * Math.PI * 2;
  g.fillStyle = MACHINE.line;
  for (let s = -4; s <= 4; s += 0.5) g.fillRect(Math.round(19 + Math.cos(angle) * s - 0.5), Math.round(45 + Math.sin(angle) * s - 0.5), 2, 2);

  // The chute, with the capsule in it once it's come out.
  g.fillStyle = MACHINE.line;
  g.fillRect(28, 46, 10, 9);
  g.fillStyle = MACHINE.chute;
  g.fillRect(29, 47, 8, 7);
  if (prize && (gacha.phase === 'capsule' || (turning && t > 0.8))) {
    const colour = CAPSULE[prize.rarity || 'common'];
    disc(g, 33, 51, 3.4, MACHINE.line);
    disc(g, 33, 51, 2.6, colour);
    g.fillStyle = MACHINE.cream;
    g.fillRect(31, 51, 5, 1);
  }
}
