// health-edit.js: the page for changing what's on the Health page, opened with the
// pencil on the Health page or from the full menu. Everything can be added,
// renamed, recoloured, moved and deleted: the check-in items, the feelings,
// folders, single items and tags. Changes are saved as the "health-list" item
// (see health.js) straight away.

let editList = null;
let editTab = 'physical';
// What each button on the page points at, filled in as the page is drawn.
let editTargets = [];

const ICON_NAMES = Object.keys(ICONS);

function target(info) {
  editTargets.push(info);
  return editTargets.length - 1;
}

function editRow(info, name, extra = '', colour = '') {
  return `<button type="button" class="edit-row" data-edit="${target(info)}">
    ${colour ? `<span class="swatch" style="background: ${colour}"></span>` : ''}
    <span class="row-name">${escapeHtml(name)}</span><span class="row-word">${extra}</span>${chevronRight}</button>`;
}

function addLine(info, words) {
  return `<button class="add-line" type="button" data-add="${target(info)}">${plus}<span>${words}</span></button>`;
}

function editFolder(arr, folder) {
  return `<div class="edit-block">
    <button type="button" class="edit-row edit-head" data-edit="${target({ arr, item: folder, kind: 'folder' })}">${icon(folder.icon, folder.colour, 19, 1.8)}<span class="row-name">${escapeHtml(folder.name)}</span><span class="row-word">folder</span>${chevronRight}</button>
    <div class="edit-inner">
      ${folder.items.map((item) => editRow({ arr: folder.items, item, kind: 'item' }, item.name, SCALE_NAMES[item.scale].toLowerCase())).join('')}
      ${folder.tags.length ? `<div class="tag-list">${folder.tags.map((t) => `<button type="button" class="chip" data-edit="${target({ arr: folder.tags, item: t, kind: 'tag' })}">${escapeHtml(t.name)}</button>`).join('')}</div>` : ''}
      <div class="add-lines">${addLine({ arr: folder.items, kind: 'item' }, 'add an item')}${addLine({ arr: folder.tags, kind: 'tag' }, 'add a tag')}</div>
    </div>
  </div>`;
}

async function showHealthEdit() {
  editList = await getHealthList();
  editTargets = [];
  if (!editList.tabs.some((t) => t.id === editTab)) editTab = healthTab;
  $('edit-tabs').innerHTML = [...editList.tabs.map((t) => [t.id, t.name]), ['checkins', 'Check-ins'], ['feelings', 'Feelings']]
    .map(([id, name]) => `<button type="button" class="tab" role="tab" aria-selected="${id === editTab}" data-tab="${id}">${escapeHtml(name)}</button>`).join('');

  let html = '';
  if (editTab === 'checkins') {
    html = ['morning', 'evening'].map((part) => `<div class="edit-block"><div class="edit-row edit-head"><span class="row-name">${part === 'morning' ? 'Morning' : 'Evening'}</span></div>
      ${editList.checkins[part].map((item) => editRow({ arr: editList.checkins[part], item, kind: 'single' }, item.name, SCALE_NAMES[item.scale].toLowerCase(), item.colour)).join('')}
      ${addLine({ arr: editList.checkins[part], kind: 'single' }, 'add a check-in item')}</div>`).join('');
  } else if (editTab === 'feelings') {
    html = editList.feelings.map((f) => `<div class="edit-block"><div class="edit-row edit-head"><span class="swatch" style="background: ${EMOTION_COLOURS[f.family]}"></span><span class="row-name">${f.family}</span></div>
      <div class="tag-list">${f.words.map((w, i) => `<button type="button" class="chip" data-edit="${target({ arr: f.words, item: w, index: i, kind: 'feeling' })}">${escapeHtml(w)}</button>`).join('')}</div>
      ${addLine({ arr: f.words, kind: 'feeling' }, 'add a feeling')}</div>`).join('');
  } else {
    const tab = editList.tabs.find((t) => t.id === editTab);
    html = tab.entries.map((e) => (e.items
      ? editFolder(tab.entries, e)
      : `<div class="edit-block">${editRow({ arr: tab.entries, item: e, kind: 'single' }, e.name, `single · ${SCALE_NAMES[e.scale].toLowerCase()}`, e.colour)}</div>`)).join('')
      + `<div class="add-lines" style="margin-top: 14px">${addLine({ arr: tab.entries, kind: 'folder' }, 'add a folder')}${addLine({ arr: tab.entries, kind: 'single' }, 'add a single item')}</div>`;
  }
  $('edit-list').innerHTML = html;
}

// --- The sheet for one thing ---

const KIND_WORDS = { folder: 'folder', item: 'item', single: 'item', tag: 'tag', feeling: 'feeling' };

function openEditSheet(info, adding) {
  const { kind } = info;
  const item = adding ? null : info.item;
  const name = kind === 'feeling' ? item || '' : item ? item.name : '';
  const hasScale = kind === 'item' || kind === 'single';
  const hasColour = kind === 'folder' || kind === 'single';
  const scale = item && item.scale ? item.scale : (kind === 'single' && info.arr === editList.checkins.morning ? 'quality' : 'symptom');
  const colour = item && item.colour ? item.colour : PALETTE[Math.floor(Math.random() * PALETTE.length)];
  const otherTabs = editList.tabs.filter((t) => t.id !== editTab);
  const movable = !adding && (kind === 'folder' || (kind === 'single' && editList.tabs.some((t) => t.entries === info.arr)));

  let html = `<label class="field"><span>Name</span><input type="text" name="name" value="${escapeHtml(name)}" autocomplete="off" required></label>`;
  if (hasScale) {
    html += `<fieldset class="field"><legend>Scale</legend><div class="choices">${Object.keys(SCALES).map((s) =>
      `<label><input type="radio" name="scale" value="${s}"${s === scale ? ' checked' : ''}><span>${SCALE_NAMES[s]}</span></label>`).join('')}</div>
      <span class="muted" data-scale-words>${SCALES[scale].slice(1).join(' · ')}</span></fieldset>`;
  }
  if (hasColour) html += `<h3>Colour</h3>${colourPicker(colour)}`;
  if (kind === 'folder') {
    const current = item ? item.icon : 'dot';
    html += `<h3>Icon</h3><div class="icon-choices">${ICON_NAMES.map((n) => `<button type="button" data-icon="${n}" aria-pressed="${n === current}" aria-label="${n}">${icon(n, INK, 20, 1.6)}</button>`).join('')}</div><input type="hidden" name="icon" value="${current}">`;
  }
  if (movable && otherTabs.length) {
    html += `<label class="field" style="margin-top: 12px"><span>Tab</span><select name="tab">${editList.tabs.map((t) => `<option value="${t.id}"${t.id === editTab ? ' selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}</select></label>`;
  }
  if (!adding) {
    html += `<div class="sheet-buttons"><button class="text-button" type="submit" name="action" value="up" formnovalidate>Move up</button><button class="text-button" type="submit" name="action" value="down" formnovalidate>Move down</button><span class="spacer"></span><button class="text-button danger" type="submit" name="action" value="delete" formnovalidate>Delete</button></div>`;
  }

  openSheet(adding ? `New ${KIND_WORDS[kind]}` : `Change ${KIND_WORDS[kind]}`, html, async (form, submitter) => {
    const action = submitter && submitter.value;
    const arr = info.arr;
    const index = kind === 'feeling' ? info.index : arr.indexOf(item);
    if (action === 'delete') {
      const inside = item && item.items ? item.items.length + item.tags.length : 0;
      const question = inside
        ? `Delete the folder "${item.name}" and everything in it?`
        : `Delete "${name}"? Answers you already logged stay saved, but won't show.`;
      if (!confirm(question)) return false;
      arr.splice(index, 1);
    } else if (action === 'up' || action === 'down') {
      const to = index + (action === 'up' ? -1 : 1);
      if (to < 0 || to >= arr.length) return false;
      const [moved] = arr.splice(index, 1);
      arr.splice(to, 0, moved);
    } else {
      const newName = form.elements.name.value.trim();
      if (!newName) return false;
      if (kind === 'feeling') {
        if (adding) arr.push(newName.toLowerCase());
        else arr[index] = newName.toLowerCase();
      } else {
        const thing = item || { id: newId('h') };
        thing.name = newName;
        if (hasScale) thing.scale = form.elements.scale.value || 'symptom';
        if (hasColour) thing.colour = form.elements.colour.value.toUpperCase();
        if (kind === 'folder') Object.assign(thing, { icon: form.elements.icon.value, items: thing.items || [], tags: thing.tags || [] });
        if (adding) arr.push(thing);
        // Moving to another tab.
        if (form.elements.tab && form.elements.tab.value !== editTab) {
          arr.splice(arr.indexOf(thing), 1);
          editList.tabs.find((t) => t.id === form.elements.tab.value).entries.push(thing);
        }
      }
    }
    await saveHealthList(editList);
    showHealthEdit();
    showBackupInfo();
  });
}

sheetForm.addEventListener('click', (event) => {
  const choice = event.target.closest('[data-icon]');
  if (!choice) return;
  sheetForm.elements.icon.value = choice.dataset.icon;
  for (const b of sheetForm.querySelectorAll('[data-icon]')) b.setAttribute('aria-pressed', b === choice);
});
sheetForm.addEventListener('change', (event) => {
  if (event.target.name !== 'scale') return;
  const words = sheetForm.querySelector('[data-scale-words]');
  if (words) words.textContent = SCALES[event.target.value].slice(1).join(' · ');
});

$('edit-tabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (!tab) return;
  editTab = tab.dataset.tab;
  showHealthEdit();
});

$('edit-list').addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit]');
  const add = event.target.closest('[data-add]');
  if (edit) openEditSheet(editTargets[edit.dataset.edit], false);
  else if (add) openEditSheet(editTargets[add.dataset.add], true);
});

// Back to wherever you were before.
$('edit-done').addEventListener('click', () => history.back());

$('edit-health-button').addEventListener('click', () => {
  closeMenu();
  // Takes the menu's place in the phone's history, so back goes where you were before the menu.
  history.replaceState(null, '', '#health-edit');
  showView();
});
