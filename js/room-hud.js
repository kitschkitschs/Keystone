// room-hud.js: the game's own buttons, on the room itself, and the pop-up
// windows they open (the inventory, Gachapon, the catalogue, the workshop).

// --- Little pixel icons, drawn from rows of letters ---

const HUD_ICON_COLOURS = {
  k: '#3B2C2A', a: '#D99A93', d: '#B97872', c: '#F2E8D5', y: '#D9B55A', b: '#8FA6C2', l: '#DCEAF0', w: '#A0714F', g: '#7E9068',
};

const HUD_ICONS = {
  decorate: ['............', '..kkkkkkkk..', '.kaaaaaaaak.', '.kaddddddak.', 'kkaaaaaaaakk', 'kakaaaaaakak',
    'kakcccccckak', 'kakkkkkkkkak', 'kaaaaaaaaaak', 'kkkkkkkkkkkk', '.kk......kk.', '............'],
  gacha: ['...kkkkkk...', '..kllllllk..', '.klabyabllk.', '.kllbaylalk.', '.kllllllllk.', '..kkkkkkkk..',
    '..kaaaaaak..', '..kayyaaak..', '..kayykkak..', '..kaaakkak..', '..kddddddk..', '..kkkkkkkk..'],
  catalogue: ['..kkkkkkkkk.', '..kbbbbbbbk.', '..kbcccccbk.', '..kbbbbbbbk.', '..kbbbbbbbk.', '..kbbyybbbk.',
    '..kbbbbbbbk.', '..kbbbbbbbk.', '..kkkkkkkkk.', '..kccccccck.', '..kkkkkkkkk.', '............'],
  done: ['............', '............', '..........k.', '.........kgk', '........kgk.', '.k.....kgk..',
    'kgk...kgk...', '.kgk.kgk....', '..kgkgk.....', '...kgk......', '....k.......', '............'],
  menu: ['............', '............', '.kkkkkkkkkk.', '.kaaaaaaaak.', '.kkkkkkkkkk.', '............',
    '.kkkkkkkkkk.', '.kaaaaaaaak.', '.kkkkkkkkkk.', '............', '............', '............'],
  inventory: ['............', '..kkkkkkkk..', '.kwwwwwwwwk.', '.kwwwwwwwwk.', 'kkkkkkkkkkkk', 'kwwwwyywwwwk',
    'kwwwwyywwwwk', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk', '............', '............'],
  workshop: ['............', '....kkkk....', '....k..k....', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwwwwwwwwk.',
    '.kkkkyykkkk.', '.kwwwyywwwk.', '.kwwwwwwwwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............'],
  clock: ['...kkkkkk...', '..kcccccck..', '.kcccckccck.', '.kcccckccck.', '.kcccckccck.', '.kcccckkkck.',
    '.kcccccccck.', '.kcccccccck.', '..kcccccck..', '...kkkkkk...', '............', '............'],
  day: ['............', '.y...yy...y.', '..y..yy..y..', '....kkkk....', '...kyyyyk...', 'yy.kyyyyk.yy',
    'yy.kyyyyk.yy', '...kyyyyk...', '....kkkk....', '..y..yy..y..', '.y...yy...y.', '............'],
  evening: ['............', '............', '.a...aa...a.', '..a..aa..a..', '....kkkk....', '...kaaaak...',
    '..kaaaaaak..', 'kkkkkkkkkkkk', '............', '.dddddddddd.', '...dddddd...', '............'],
  night: ['............', '....kkkk....', '...kyyyk....', '..kyyyk.....', '..kyyk......', '..kyyk......',
    '..kyyk......', '..kyyyk.....', '...kyyyk....', '....kkkk....', '............', '............'],
};

// An icon as a crisp little SVG, one rectangle per run of same-coloured pixels.
function pixelIcon(name) {
  const rows = HUD_ICONS[name];
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (HUD_ICON_COLOURS[ch]) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${HUD_ICON_COLOURS[ch]}"/>`;
      x = end;
    }
  });
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

// --- The buttons on the room ---

function lightIcon() {
  if (previewHour === null) return 'clock';
  if (previewHour >= 21 || previewHour < 5) return 'night';
  if (previewHour >= 16.5) return 'evening';
  return 'day';
}

// The buttons fold away behind one menu button, so the room stays clear. While
// decorating, the decorate button stays out as a tick: tap it when you're done.
let hudOpen = false;

function showHud() {
  const hud = $('room-hud');
  const lightName = previewHour === null ? 'Clock' : LIGHT_STEPS.find(([hour]) => hour === previewHour)?.[1] || timeWord(previewHour);
  const buttons = [
    ['decorate', decorating ? 'Done decorating' : 'Decorate', decorating ? 'done' : 'decorate'],
    ['inventory', 'Inventory', 'inventory'],
    ['gacha', 'Gachapon', 'gacha'],
    ['catalogue', 'Catalogue', 'catalogue'],
    ['light', `Light: ${lightName}`, lightIcon()],
    ['workshop', 'Workshop', 'workshop'],
  ].filter(([key]) => hudOpen || (decorating && (key === 'decorate' || key === 'inventory')));
  buttons.push(['menu', hudOpen ? 'Fold the buttons away' : 'Open the buttons', 'menu']);
  hud.innerHTML = buttons.map(([key, label, icon]) => `<button type="button" class="hud-button" data-hud="${key}" aria-label="${label}" title="${label}"${key === 'decorate' ? ` aria-pressed="${decorating}"` : ''}${key === 'menu' ? ` aria-expanded="${hudOpen}"` : ''}>${pixelIcon(icon)}</button>`).join('');
}

$('room-hud').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-hud]');
  if (!button) return;
  const key = button.dataset.hud;
  if (key === 'menu') {
    hudOpen = !hudOpen;
    showHud();
    return;
  }
  // Opening something folds the buttons away again; trying the light doesn't.
  if (key !== 'light') hudOpen = false;
  if (key === 'decorate') {
    decorating = !decorating;
    if (!decorating) held = null;
    showRoomPanel();
  }
  if (key === 'inventory') {
    decorating = true;
    showRoomPanel();
    openGameWindow('inventory');
  }
  if (key === 'gacha') { showHud(); openGacha(); }
  if (key === 'catalogue') { showHud(); openGameWindow('catalogue'); }
  if (key === 'workshop') { showHud(); openGameWindow('workshop'); }
  if (key === 'light') {
    // Follow the clock, or try a time of day. A picked time lasts until the app closes.
    const i = LIGHT_STEPS.findIndex(([hour]) => hour === previewHour);
    const [hour, word] = LIGHT_STEPS[(i + 1) % LIGHT_STEPS.length];
    previewHour = hour;
    showHud();
    roomNote(hour === null ? 'The light follows the clock.' : `Trying the light at ${word.toLowerCase()}.`);
  }
});

// --- The pop-up window ---

const gameWindow = $('game-window');
let gameWindowKind = null;

function openGameWindow(kind) {
  gameWindowKind = kind;
  drawGameWindow();
  if (!gameWindow.open) gameWindow.showModal();
}

function drawGameWindow() {
  const kind = gameWindowKind;
  if (kind === 'gacha') return drawGacha();
  const titles = { inventory: 'Inventory', catalogue: 'Catalogue', workshop: 'Workshop' };
  $('gw-title').textContent = titles[kind] || '';
  if (kind === 'inventory') $('gw-body').innerHTML = inventoryHtml();
  if (kind === 'look') $('gw-body').innerHTML = catLookHtml();
  if (kind === 'catalogue') {
    $('gw-body').innerHTML = catalogueHtml([...pieces.values()]) || '';
  }
  if (kind === 'workshop') {
    $('gw-body').innerHTML = `
      <div class="workshop">
        <button type="button" class="ws-button" data-ws="add"><b>Cut pieces</b></button>
        <button type="button" class="ws-button" data-ws="pieces"><b>Pieces</b></button>
        <button type="button" class="ws-button" data-ws="cat"><b>${escapeHtml(cat.name)}</b></button>
        <button type="button" class="ws-button" data-ws="room"><b>Room</b></button>
      </div>`;
  }
}

function closeGameWindow() {
  if (gameWindow.open) gameWindow.close();
}
gameWindow.addEventListener('close', () => {
  gameWindowKind = null;
  if (gacha.phase !== 'turning') gacha.phase = 'ready';
});
// A tap outside the window closes it.
gameWindow.addEventListener('click', (event) => {
  if (event.target === gameWindow || event.target.closest('[data-gw-close]')) closeGameWindow();
});

$('gw-body').addEventListener('click', async (event) => {
  const ws = event.target.closest('[data-ws]');
  if (ws) {
    const action = ws.dataset.ws;
    closeGameWindow();
    if (action === 'add') { cutFor = null; goTo('room-add'); }
    if (action === 'cat') goTo('cat');
    if (action === 'room') openRoomSettings();
    if (action === 'pieces') goTo('pieces');
    return;
  }
  if (event.target.closest('[data-gw="catalogue"]')) openGameWindow('catalogue');
});
