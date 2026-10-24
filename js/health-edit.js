// health-edit.js: the page for changing what's on the Health page, opened from
// the full menu. Everything can be added, renamed, moved and deleted: the main
// items, the feelings, folders, smaller folders inside them, scores and tags.
// Changes are saved as the "health-list" item (see health.js) straight away.

let editList = null;
// What each button on the page points at, filled in as the page is drawn.
let editTargets = [];
let editing = null; // { target, adding }

const arrowRight = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M5 3l4 4-4 4" fill="none" stroke="currentColor" stroke-opacity="0.7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const KIND_WORDS = {
  main: 'main item', item: 'score', folder: 'folder', subfolder: 'folder', tag: 'tag', feeling: 'feeling',
};
const SCALE_NAMES = { symptom: 'symptom', quality: 'quality', mood: 'mood' };
const SCALE_WORDS = { symptom: 'present · distressing · debilitating', quality: 'poor · fine · good', mood: 'awful to happy, 5 steps' };

function target(info) {
  editTargets.push(info);
  return editTargets.length - 1;
}

function editRow(arr, item, kind) {
  return `<li><button type="button" class="edit-row" data-edit="${target({ arr, item, kind })}">
    <span class="row-name">${escapeHtml(item.name)}</span>
    <span class="rate-word">${SCALE_NAMES[item.scale] || ''}</span>${arrowRight}
  </button></li>`;
}

function editChips(arr, kind) {
  return arr.map((item) => `<button type="button" class="chip" data-edit="${target({ arr, item, kind })}">${escapeHtml(item.name)}</button>`).join('');
}

function addLine(arr, kind, words) {
  return `<button class="add-line" type="button" data-add="${target({ arr, kind })}">${plus}<span>${words}</span></button>`;
}

function editFolder(arr, folder, kind) {
  const inner = folder.items.map((item) => (item.items
    ? `<li class="edit-sub">${editFolder(folder.items, item, 'subfolder')}</li>`
    : editRow(folder.items, item, 'item'))).join('');
  const heading = kind === 'folder'
    ? `<button type="button" class="edit-heading" data-edit="${target({ arr, item: folder, kind })}"><span class="part-name">${escapeHtml(folder.name)}</span><span class="part-count">folder</span>${arrowRight}</button>`
    : `<button type="button" class="edit-row edit-subname" data-edit="${target({ arr, item: folder, kind })}"><span class="sub-name">${escapeHtml(folder.name)}</span><span class="rate-word">folder</span>${arrowRight}</button>`;
  return `<div class="${kind === 'folder' ? 'folder' : ''}">${heading}
    <ul class="rows${kind === 'subfolder' ? ' sub-rows' : ''}">${inner}</ul>
    ${folder.tags.length ? `<div class="tags">${editChips(folder.tags, 'tag')}</div>` : ''}
    <div class="add-lines">
      ${addLine(folder.items, 'item', 'add a score')}
      ${kind === 'folder' ? addLine(folder.items, 'subfolder', 'add a folder inside') : ''}
      ${addLine(folder.tags, 'tag', 'add a tag')}
    </div>
  </div>`;
}

async function showHealthEdit() {
  editList = await getHealthList();
  editTargets = [];
  $('edit-list').innerHTML = `
    <div class="part"><div class="edit-heading plain"><span class="part-name">Main items</span><span class="part-count">always shown</span></div>
      <ul class="rows">${editList.main.map((m) => editRow(editList.main, m, 'main')).join('')}</ul>
      ${addLine(editList.main, 'main', 'add a main item')}
    </div>
    <div class="folder"><div class="edit-heading plain"><span class="part-name">Feelings</span><span class="part-count">under mood</span></div>
      <div class="tags">${editChips(editList.feelings, 'feeling')}</div>
      ${addLine(editList.feelings, 'feeling', 'add a feeling')}
    </div>
    ${editList.folders.map((f) => editFolder(editList.folders, f, 'folder')).join('')}
    <div class="folder">${addLine(editList.folders, 'folder', 'add a folder')}</div>`;
}

// --- The little sheet for one thing ---

const editDialog = $('edit-dialog');
const editForm = $('edit-form');

function openEditSheet(info, adding) {
  editing = { info, adding };
  const word = KIND_WORDS[info.kind];
  const hasScale = info.kind === 'main' || info.kind === 'item';
  $('edit-dialog-title').textContent = adding ? `New ${word}` : `Change ${word}`;
  $('edit-name').value = adding ? '' : info.item.name;
  $('edit-scale').hidden = !hasScale;
  const scale = adding ? (info.kind === 'main' ? 'quality' : 'symptom') : info.item.scale;
  for (const radio of editForm.elements.scale) radio.checked = radio.value === scale;
  $('edit-scale-words').textContent = SCALE_WORDS[scale] || '';
  $('edit-move').hidden = adding;
  $('edit-delete').hidden = adding;
  editDialog.showModal();
  if (adding) $('edit-name').focus();
}

editForm.addEventListener('change', () => {
  $('edit-scale-words').textContent = SCALE_WORDS[editForm.elements.scale.value] || '';
});

async function saveEdit() {
  await saveHealthList(editList);
  showHealthEdit();
  showBackupInfo();
}

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = $('edit-name').value.trim();
  if (!name) return;
  const { info, adding } = editing;
  const scale = editForm.elements.scale.value || 'symptom';
  if (adding) {
    const item = { id: newId('h'), name };
    if (info.kind === 'main' || info.kind === 'item') item.scale = scale;
    if (info.kind === 'folder' || info.kind === 'subfolder') Object.assign(item, { items: [], tags: [] });
    info.arr.push(item);
  } else {
    info.item.name = name;
    if (info.kind === 'main' || info.kind === 'item') info.item.scale = scale;
  }
  editDialog.close();
  await saveEdit();
});

async function moveEdit(step) {
  const { arr, item } = editing.info;
  const from = arr.indexOf(item);
  const to = from + step;
  if (to < 0 || to >= arr.length) return;
  arr.splice(from, 1);
  arr.splice(to, 0, item);
  editDialog.close();
  await saveEdit();
}
$('edit-up').addEventListener('click', () => moveEdit(-1));
$('edit-down').addEventListener('click', () => moveEdit(1));

$('edit-delete').addEventListener('click', async () => {
  const { arr, item, kind } = editing.info;
  const inside = item.items ? item.items.length + item.tags.length : 0;
  const question = inside
    ? `Delete the folder "${item.name}" and everything in it?`
    : `Delete "${item.name}"? Answers you already logged stay saved, but won't show.`;
  if (!confirm(question)) return;
  arr.splice(arr.indexOf(item), 1);
  editDialog.close();
  await saveEdit();
});

$('edit-cancel').addEventListener('click', () => editDialog.close());

$('edit-list').addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit]');
  const add = event.target.closest('[data-add]');
  if (edit) openEditSheet(editTargets[edit.dataset.edit], false);
  else if (add) openEditSheet(editTargets[add.dataset.add], true);
});

// Back to wherever you were before opening the menu.
$('edit-done').addEventListener('click', () => history.back());

$('edit-health-button').addEventListener('click', () => {
  closeMenu();
  // Takes the menu's place in the phone's history, so back goes where you were before the menu.
  history.replaceState(null, '', '#health-edit');
  showView();
});
