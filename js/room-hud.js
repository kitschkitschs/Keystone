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
  garden: ['............', '.kk......kk.', 'kggk....kggk', 'kgggk..kgggk', '.kgggkkgggk.', '..kkkggkkk..',
    '.....gg.....', '.....gg.....', '.kkkkkkkkkk.', 'kwwwwwwwwwwk', 'kwwwwwwwwwwk', '.kkkkkkkkkk.'],
  house: ['.....kk.....', '....kaak....', '...kaaaak...', '..kaaaaaak..', '.kaaaaaaaak.', 'kkkkkkkkkkkk',
    '.kcccccccck.', '.kcbbcckwwk.', '.kcbbcckwwk.', '.kccccckwwk.', '.kkkkkkkkkk.', '............'],
  market: ['............', 'kkkkkkkkkkkk', 'kaaccaaccaak', 'kaaccaaccaak', 'kkkkkkkkkkkk', '.kw......wk.',
    '.kw......wk.', 'kkkkkkkkkkkk', 'kyyygggaaaak', 'kwwwwwwwwwwk', 'kkkkkkkkkkkk', '............'],
  pantry: ['............', '...kkkkkk...', '...kwwwwk...', '..kkkkkkkk..', '.kllllllllk.', '.kldddddddk.',
    '.kldcccdddk.', '.kldcccdddk.', '.kldddddddk.', '.kldddddddk.', '..kkkkkkkk..', '............'],
  coin: ['............', '....kkkk....', '...kyyyyk...', '..kyycyyyk..', '.kyycyyyyyk.', '.kyycyyyyyk.',
    '.kyyyyyyyyk.', '.kyyyyyyyyk.', '..kyyyyyyk..', '...kyyyyk...', '....kkkk....', '............'],
  calendar: ['..k......k..', 'kkkkkkkkkkkk', 'kaaaaaaaaaak', 'kkkkkkkkkkkk', 'kcccccccccck', 'kckcckcckcck',
    'kcccccccccck', 'kckcckcckcck', 'kcccccccccck', 'kcccccccccck', 'kkkkkkkkkkkk', '............'],
  spring: ['............', '....aaaa....', '...aaaaaa...', '..aaayyaaa..', '..aaayyaaa..', '...aaaaaa...',
    '....aaaa....', '.....gg.....', '..gg.gg.....', '...gggg.....', '.....gg.....', '............'],
  autumn: ['............', '.......kk...', '.....kkyyk..', '...kkyyyyk..', '..kyyywyyk..', '.kyyywyyyk..',
    '.kyywyyyk...', '.kywyyykk...', '.kwykkk.....', '.kw.........', 'kw..........', '............'],
  winter: ['.....b......', '...b.b.b....', '....bbb.....', '.b...b...b..', '..b..b..b...', 'bbbbbbbbbbb.',
    '..b..b..b...', '.b...b...b..', '....bbb.....', '...b.b.b....', '.....b......', '............'],
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
  const buttons = (scene === 'garden' ? [
    ['room', 'Back inside', 'house'],
    ['market', 'Market', 'market'],
    ['pantry', 'Pantry', 'pantry'],
    ['light', `Light: ${lightName}`, lightIcon()],
    ['season', `Season: ${previewSeason ? SEASONS.find(([key]) => key === previewSeason)[1] : 'Calendar'}`, previewSeason ? (previewSeason === 'summer' ? 'day' : previewSeason) : 'calendar'],
    ['workshop', 'Workshop', 'workshop'],
  ] : [
    ['decorate', decorating ? 'Done decorating' : 'Decorate', decorating ? 'done' : 'decorate'],
    ['inventory', 'Inventory', 'inventory'],
    ['gacha', 'Gachapon', 'gacha'],
    ['catalogue', 'Catalogue', 'catalogue'],
    ['garden', 'Garden', 'garden'],
    ['pantry', 'Pantry', 'pantry'],
    ['light', `Light: ${lightName}`, lightIcon()],
    ['workshop', 'Workshop', 'workshop'],
  ]).filter(([key]) => hudOpen || (decorating && (key === 'decorate' || key === 'inventory')));
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
  // Opening something folds the buttons away again; trying the light or season doesn't.
  if (key !== 'light' && key !== 'season') hudOpen = false;
  if (key === 'season') {
    // Follow the calendar, or try a season. A picked season lasts until the app closes.
    const steps = [null, ...SEASONS.map(([k]) => k)];
    previewSeason = steps[(steps.indexOf(previewSeason) + 1) % steps.length];
    showHud();
    roomNote(previewSeason ? `Trying ${previewSeason}.` : 'The seasons follow the calendar.');
  }
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
  if (key === 'garden') enterGarden();
  if (key === 'room') leaveGarden();
  if (key === 'market' || key === 'pantry') { showHud(); openGameWindow(key); }
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
// The windows to go back to, when one opened from inside another.
let gameWindowTrail = [];

function openGameWindow(kind) {
  if (!gameWindow.open) gameWindowTrail = [];
  else if (gameWindowTrail.includes(kind)) gameWindowTrail = gameWindowTrail.slice(0, gameWindowTrail.indexOf(kind));
  else if (gameWindowKind && gameWindowKind !== kind) gameWindowTrail.push(gameWindowKind);
  gameWindowKind = kind;
  drawGameWindow();
  // On a computer it stays open beside the room, so the room still works.
  if (!gameWindow.open) {
    if (isWide()) gameWindow.show();
    else gameWindow.showModal();
  }
}

// On a computer, the window is always there beside the room: the workshop when
// nothing else is open.
function dockGameWindow() {
  if (isWide() && currentView() === 'home' && !gameWindow.open) openGameWindow('workshop');
}

function gameWindowBack() {
  gameWindowKind = gameWindowTrail.pop();
  drawGameWindow();
}

function drawGameWindow() {
  const kind = gameWindowKind;
  $('gw-back').hidden = !gameWindowTrail.length;
  if (kind === 'gacha') return drawGacha();
  if (FARM_TITLES[kind]) return drawFarmWindow(kind);
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
        <button type="button" class="ws-button" data-ws="duck"><b>${duck ? escapeHtml(duck.name) : 'Duck'}</b></button>
        <button type="button" class="ws-button" data-ws="farm"><b>Farm</b></button>
        <button type="button" class="ws-button" data-ws="map"><b>Map</b></button>
        <button type="button" class="ws-button" data-ws="room"><b>Room</b></button>
      </div>`;
  }
}

function closeGameWindow() {
  if (gameWindow.open) gameWindow.close();
}
gameWindow.addEventListener('close', () => {
  // Closed and opened again straight away: it's showing something new.
  if (gameWindow.open) return;
  gameWindowKind = null;
  if (gacha.phase !== 'turning') gacha.phase = 'ready';
  setTimeout(dockGameWindow);
});
// A tap outside the window closes it.
gameWindow.addEventListener('click', (event) => {
  if (event.target === gameWindow || event.target.closest('[data-gw-close]')) closeGameWindow();
  if (event.target.closest('#gw-back')) gameWindowBack();
});

$('gw-body').addEventListener('click', async (event) => {
  const ws = event.target.closest('[data-ws]');
  if (ws) {
    const action = ws.dataset.ws;
    closeGameWindow();
    if (action === 'add') { cutFor = null; goTo('room-add'); }
    if (action === 'cat' || action === 'duck') {
      petKind = action;
      goTo('cat');
    }
    if (action === 'room') openRoomSettings();
    if (action === 'pieces') goTo('pieces');
    if (action === 'farm') goTo('farm');
    if (action === 'map') goTo('map');
    return;
  }
  if (event.target.closest('[data-gw="catalogue"]')) openGameWindow('catalogue');
});
