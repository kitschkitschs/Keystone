// farm-page.js: the Farm page (Workshop → Farm), to add your own crops, the
// farmer's market's goods and recipes, and set up the garden's bed. Pictures
// are picked from a sprite sheet: open the picture, set the frame size, and
// tap the frames. A crop's growing stages are tapped in order, seed first.
// What everything is, and how it's saved: see farm.js.

let farmTab = 'crops'; // crops, goods, recipes or garden
let farmDraft = null; // the crop, good or recipe being edited
// Picking frames from a picture: { what (the draft's field), many, fw, fh, picked: [[col, row]] }
let picker = null;
let pickerSheet = null; // the last picture opened, kept while the app is open
const PICK_SIZES = { stages: [16, 32], produce: [16, 16], src: [16, 16] };

const FARM_TABS = [['crops', 'Crops'], ['goods', 'Market'], ['recipes', 'Recipes'], ['garden', 'Garden']];
const tabKind = { crops: 'crop', goods: 'good', recipes: 'recipe' };
const tabMap = () => ({ crops, goods, recipes })[farmTab];

async function showFarm() {
  await loadRoom();
  farmDraft = null;
  picker = null;
  drawFarm();
}

function newDraft() {
  const kind = tabKind[farmTab];
  const base = { id: newId(kind), kind, day: '', name: '', isNew: true };
  if (kind === 'crop') return { ...base, fw: 16, fh: 32, stages: [], produce: '', hours: 24, regrow: 0, yield: 1, price: 5 };
  if (kind === 'good') return { ...base, src: '', price: 10 };
  return { ...base, src: '', needs: [], minutes: 30, price: 0 };
}

function drawFarm() {
  const list = farmTab === 'garden' ? [] : [...tabMap().values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const face = (item) => item.kind === 'crop' ? item.produce || item.stages[item.stages.length - 1] : item.src;
  $('farm-page').innerHTML = `
    <header class="plain-head">
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">Farm</h1></div>
      <button class="ink-button" type="button" data-farm="done">Done</button>
    </header>
    <div class="side">
      <div class="inv-tags farm-tabs">${FARM_TABS.map(([key, name]) => `<button type="button" class="inv-tag" data-farm-tab="${key}" aria-pressed="${farmTab === key}">${name}</button>`).join('')}</div>
      <div class="farm-layout">
        <div class="farm-main">
          ${farmTab === 'garden' ? gardenFormHtml() : `<div class="thing-grid farm-list">
            ${list.map((item) => `<button type="button" class="thing-tile${farmDraft && farmDraft.id === item.id ? ' on' : ''}" data-farm-edit="${item.id}" aria-label="${escapeHtml(item.name)}" title="${escapeHtml(item.name)}">${face(item) ? thingImg(face(item)) : '<span class="thing-x">?</span>'}<span class="thing-name">${escapeHtml(item.name)}</span></button>`).join('')}
            <button type="button" class="thing-tile" data-farm="add" aria-label="Add" title="Add"><span class="thing-x">+</span></button>
          </div>
          ${farmDraft ? `<div id="farm-editor" class="farm-editor">${editorHtml()}</div>` : ''}`}
          <p id="farm-status" class="status" role="status"></p>
        </div>
        ${picker ? `<div class="farm-side">${pickerHtml()}</div>` : ''}
      </div>
    </div>`;
  if (picker) drawPicker();
}

// --- Editing one crop, good or recipe ---

const numberField = (label, key, attrs = '') => `<label>${label} <input type="number" data-f="${key}" value="${farmDraft[key] ?? ''}" ${attrs}></label>`;
const slot = (src, what, label) => `<button type="button" class="thing-tile pick-slot${picker && picker.what === what ? ' on' : ''}" data-pick="${what}" aria-label="${label}" title="${label}">${src ? thingImg(src) : '<span class="thing-x">+</span>'}</button>`;

function editorHtml() {
  const d = farmDraft;
  const name = `<label class="field"><span>Name</span><input type="text" data-f="name" value="${escapeHtml(d.name)}" autocomplete="off"></label>`;
  const buttons = `<div class="buttons">
      <button class="ink-button" type="button" data-farm="save">Save</button>
      <button class="text-button" type="button" data-farm="close">Cancel</button>
      ${d.isNew ? '' : '<button class="text-button danger" type="button" data-farm="delete">Delete</button>'}
    </div>`;
  if (d.kind === 'crop') {
    return `${name}
      <div class="field"><span>Growing</span><div class="stage-row">
        ${d.stages.map((src) => `<img class="pixel stage-pic" src="${src}" alt="">`).join('')}
        ${slot('', 'stages', 'Pick the stages')}
      </div></div>
      <div class="field"><span>Harvest</span><div class="stage-row">${slot(d.produce, 'produce', 'Pick the harvest')}</div></div>
      <div class="cut-box">
        ${numberField('Hours to grow', 'hours', 'min="0.001" step="any"')}
        ${numberField('Regrows after (hours)', 'regrow', 'min="0" step="any"')}
        ${numberField('Each picking', 'yield', 'min="1" max="99"')}
        ${numberField('Price', 'price', 'min="0"')}
      </div>
      ${buttons}`;
  }
  if (d.kind === 'good') {
    return `${name}
      <div class="field"><span>Picture</span><div class="stage-row">${slot(d.src, 'src', 'Pick the picture')}</div></div>
      <div class="cut-box">${numberField('Price', 'price', 'min="0"')}</div>
      ${buttons}`;
  }
  const things = [
    ...[...crops.values()].map((c) => [`crop:${c.id}`, c.name]),
    ...[...goods.values()].map((g) => [`good:${g.id}`, g.name]),
    ...[...recipes.values()].filter((r) => r.id !== d.id).map((r) => [`recipe:${r.id}`, r.name]),
  ];
  return `${name}
    <div class="field"><span>Picture</span><div class="stage-row">${slot(d.src, 'src', 'Pick the picture')}</div></div>
    <div class="field"><span>Ingredients</span>
      ${d.needs.map((need, i) => `<div class="need-row">
        ${thingOf(need.thing) ? thingImg(thingOf(need.thing).src, 1) : ''}
        <select data-need="${i}">${things.map(([key, label]) => `<option value="${key}"${key === need.thing ? ' selected' : ''}>${escapeHtml(label || '?')}</option>`).join('')}</select>
        <input type="number" min="1" max="99" data-need-n="${i}" value="${need.n}">
        <button class="text-button danger" type="button" data-unneed="${i}" aria-label="Remove">✕</button>
      </div>`).join('')}
      ${things.length ? '<p><button class="text-button" type="button" data-farm="need">Add an ingredient</button></p>' : ''}
    </div>
    <div class="cut-box">
      ${numberField('Minutes to cook', 'minutes', 'min="0" step="any"')}
      ${numberField('Price', 'price', 'min="0"')}
    </div>
    ${buttons}`;
}

// Takes what's been typed into the draft, before the page is drawn again.
function readFarmFields() {
  if (!farmDraft) return;
  for (const input of document.querySelectorAll('#farm-editor [data-f]')) {
    farmDraft[input.dataset.f] = input.type === 'number' ? Number(input.value) || 0 : input.value;
  }
  for (const select of document.querySelectorAll('#farm-editor [data-need]')) farmDraft.needs[Number(select.dataset.need)].thing = select.value;
  for (const input of document.querySelectorAll('#farm-editor [data-need-n]')) farmDraft.needs[Number(input.dataset.needN)].n = Math.max(1, Number(input.value) || 1);
}

async function saveFarmDraft() {
  readFarmFields();
  const d = { ...farmDraft };
  delete d.isNew;
  if (!d.name.trim()) return farmStatus('It needs a name.');
  if (d.kind === 'crop' && (!d.stages.length || !d.produce)) return farmStatus('It needs its growing stages and its harvest.');
  if (d.kind !== 'crop' && !d.src) return farmStatus('It needs a picture.');
  d.name = d.name.trim();
  if (d.kind === 'crop') {
    d.hours = Math.max(0.001, d.hours || 1);
    d.yield = Math.max(1, Math.round(d.yield) || 1);
  }
  const saved = await putItem({ createdAt: Date.now(), ...d });
  tabMap().set(saved.id, saved);
  farmDraft = null;
  picker = null;
  drawFarm();
}

async function deleteFarmItem() {
  const d = farmDraft;
  const key = `${d.kind}:${d.id}`;
  const used = [...recipes.values()].filter((r) => (r.needs || []).some((n) => n.thing === key));
  const growing = d.kind === 'crop' ? [...plots.values()].filter((p) => p.crop === d.id) : [];
  const more = [growing.length ? `growing in ${growing.length} plot${growing.length === 1 ? '' : 's'}` : '', used.length ? `in ${used.length} recipe${used.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ');
  if (!confirm(more ? `Delete it? It's ${more}.` : 'Delete it?')) return;
  for (const p of growing) await plant(p.x, p.y, '');
  for (const r of used) {
    const kept = await putItem({ ...r, needs: r.needs.filter((n) => n.thing !== key) });
    recipes.set(kept.id, kept);
  }
  if (hasOf(key)) {
    delete pantry.has[key];
    await savePantry();
  }
  await deleteItem(d.id);
  tabMap().delete(d.id);
  farmDraft = null;
  picker = null;
  drawFarm();
}

function farmStatus(text) {
  const status = $('farm-status');
  if (status) status.textContent = text;
}

function gardenFormHtml() {
  const floors = [...pieces.values()].filter((p) => p.type === 'floor');
  return `<div class="cut-box">
      <label>Bed across <input type="number" id="bed-cols" min="1" max="22" value="${garden.cols}"></label>
      <label>Bed down <input type="number" id="bed-rows" min="1" max="14" value="${garden.rows}"></label>
    </div>
    ${floors.length ? `<div class="field"><span>Grass</span>${pieceRadios('grass', floors, garden.grass, 'Plain')}</div>
    <div class="field"><span>Soil</span>${pieceRadios('soil', floors, garden.soil, 'Plain')}</div>` : ''}
    <div class="buttons"><button class="ink-button" type="button" data-farm="garden">Save</button></div>`;
}

// --- Picking frames from a picture ---

function pickerHtml() {
  return `<div class="picker">
      <div class="buttons"><label class="ink-button"><span>Open picture</span><input id="pick-file" type="file" accept="image/*" hidden></label></div>
      <div class="cut-box">
        <label>Width <input id="pick-fw" type="number" min="4" max="128" value="${picker.fw}"></label>
        <label>Height <input id="pick-fh" type="number" min="4" max="128" value="${picker.fh}"></label>
      </div>
      ${pickerSheet ? '<div class="cut-scroll pick-scroll"><canvas id="pick-canvas" class="pixel"></canvas></div>' : ''}
      <div class="buttons">
        <button class="ink-button" type="button" data-pickact="use"${picker.picked.length ? '' : ' disabled'}>Use</button>
        ${picker.many && picker.picked.length ? '<button class="text-button" type="button" data-pickact="undo">Undo</button>' : ''}
        <button class="text-button" type="button" data-pickact="cancel">Cancel</button>
      </div>
    </div>`;
}

const PICK_SCALE = 3;
function drawPicker() {
  const c = $('pick-canvas');
  if (!c || !pickerSheet) return;
  const { fw, fh } = picker;
  c.width = pickerSheet.width * PICK_SCALE;
  c.height = pickerSheet.height * PICK_SCALE;
  c.style.width = `${c.width}px`;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(pickerSheet, 0, 0, c.width, c.height);
  g.fillStyle = 'rgba(47, 127, 208, 0.25)';
  for (let x = fw; x < pickerSheet.width; x += fw) g.fillRect(x * PICK_SCALE, 0, 1, c.height);
  for (let y = fh; y < pickerSheet.height; y += fh) g.fillRect(0, y * PICK_SCALE, c.width, 1);
  picker.picked.forEach(([col, row], i) => {
    const x = col * fw * PICK_SCALE;
    const y = row * fh * PICK_SCALE;
    g.strokeStyle = '#2F7FD0';
    g.lineWidth = 2;
    g.strokeRect(x + 1, y + 1, fw * PICK_SCALE - 2, fh * PICK_SCALE - 2);
    if (picker.many) {
      g.fillStyle = '#2F7FD0';
      g.fillRect(x + 2, y + 2, 16, 14);
      g.fillStyle = '#FFFFFF';
      g.font = '11px Roboto, sans-serif';
      g.fillText(String(i + 1), x + 5, y + 13);
    }
  });
}

function openPicker(what) {
  readFarmFields();
  const [fw, fh] = what === 'stages' && farmDraft.fw ? [farmDraft.fw, farmDraft.fh] : PICK_SIZES[what];
  picker = { what, many: what === 'stages', fw, fh, picked: [] };
  drawFarm();
  const side = document.querySelector('.farm-side');
  if (side && !isWide()) side.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function usePicked() {
  readFarmFields();
  const { fw, fh } = picker;
  const cut = ([col, row]) => cutBox(pickerSheet, [col * fw, row * fh, fw, fh]);
  if (picker.what === 'stages') Object.assign(farmDraft, { stages: picker.picked.map(cut), fw, fh });
  else farmDraft[picker.what] = cut(picker.picked[0]);
  PICK_SIZES[picker.what] = [fw, fh];
  picker = null;
  drawFarm();
}

$('farm-page').addEventListener('change', async (event) => {
  if (event.target.id === 'pick-file') {
    const file = event.target.files[0];
    if (!file) return;
    try {
      pickerSheet = pictureCanvas(await loadPicture(await readFileAsDataUrl(file)));
    } catch (error) {
      farmStatus(error.message);
      return;
    }
    picker.picked = [];
    readFarmFields();
    drawFarm();
  }
  if (event.target.id === 'pick-fw' || event.target.id === 'pick-fh') {
    picker[event.target.id === 'pick-fw' ? 'fw' : 'fh'] = Math.max(4, Number(event.target.value) || 16);
    picker.picked = [];
    readFarmFields();
    drawFarm();
  }
  if (event.target.matches('[data-need]')) {
    readFarmFields();
    drawFarm();
  }
});

$('farm-page').addEventListener('click', async (event) => {
  const canvas = event.target.closest('#pick-canvas');
  if (canvas && picker) {
    const r = canvas.getBoundingClientRect();
    const x = ((event.clientX - r.left) / r.width) * pickerSheet.width;
    const y = ((event.clientY - r.top) / r.height) * pickerSheet.height;
    const cell = [Math.floor(x / picker.fw), Math.floor(y / picker.fh)];
    const at = picker.picked.findIndex(([c, w]) => c === cell[0] && w === cell[1]);
    if (!picker.many) picker.picked = [cell];
    else if (at >= 0) picker.picked.splice(at, 1);
    else picker.picked.push(cell);
    const scroll = document.querySelector('.pick-scroll');
    const [left, top] = scroll ? [scroll.scrollLeft, scroll.scrollTop] : [0, 0];
    readFarmFields();
    drawFarm();
    const again = document.querySelector('.pick-scroll');
    if (again) { again.scrollLeft = left; again.scrollTop = top; }
    return;
  }
  const tab = event.target.closest('[data-farm-tab]');
  if (tab) {
    farmTab = tab.dataset.farmTab;
    farmDraft = null;
    picker = null;
    drawFarm();
    return;
  }
  const edit = event.target.closest('[data-farm-edit]');
  if (edit) {
    farmDraft = JSON.parse(JSON.stringify(tabMap().get(edit.dataset.farmEdit)));
    picker = null;
    drawFarm();
    return;
  }
  const pick = event.target.closest('[data-pick]');
  if (pick) return openPicker(pick.dataset.pick);
  const act = event.target.closest('[data-pickact]');
  if (act) {
    const what = act.dataset.pickact;
    if (what === 'use') return usePicked();
    if (what === 'undo') picker.picked.pop();
    if (what === 'cancel') picker = null;
    readFarmFields();
    drawFarm();
    return;
  }
  const unneed = event.target.closest('[data-unneed]');
  if (unneed) {
    readFarmFields();
    farmDraft.needs.splice(Number(unneed.dataset.unneed), 1);
    drawFarm();
    return;
  }
  const button = event.target.closest('[data-farm]');
  if (!button) return;
  const action = button.dataset.farm;
  if (action === 'done') goTo('home');
  if (action === 'add') {
    farmDraft = newDraft();
    picker = null;
    drawFarm();
  }
  if (action === 'close') {
    farmDraft = null;
    picker = null;
    drawFarm();
  }
  if (action === 'save') await saveFarmDraft();
  if (action === 'delete') await deleteFarmItem();
  if (action === 'need') {
    readFarmFields();
    const first = document.querySelector('#farm-editor [data-need]')?.options[0]?.value
      || (crops.size ? `crop:${[...crops.keys()][0]}` : goods.size ? `good:${[...goods.keys()][0]}` : `recipe:${[...recipes.keys()].find((id) => id !== farmDraft.id)}`);
    farmDraft.needs.push({ thing: first, n: 1 });
    drawFarm();
  }
  if (action === 'garden') {
    const page = $('farm-page');
    garden.cols = Math.max(1, Math.min(22, Math.round(Number($('bed-cols').value)) || garden.cols));
    garden.rows = Math.max(1, Math.min(14, Math.round(Number($('bed-rows').value)) || garden.rows));
    garden.grass = page.querySelector('[name="grass"]:checked')?.value || '';
    garden.soil = page.querySelector('[name="soil"]:checked')?.value || '';
    await saveGarden();
    farmStatus('Saved.');
  }
});
