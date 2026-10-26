// room-pieces.js: the Pieces page. Every piece in one list. Pick several to give
// them the same set and settings at once, or tap one for everything about it
// (openPieceDetails in room.js). Pieces cut from a sheet land here, all picked.
// The colours of one piece share a row: picking it picks them all.

// filter: 'all', 'new' (just added), 'none' (not in a set) or 'set:<name>'.
const org = { filter: 'all', picked: new Set(), justAdded: [], note: '' };

// After cutting: show just the new pieces, all picked, ready to set up together.
function showPiecesFor(ids) {
  org.justAdded = ids;
  org.filter = 'new';
  org.picked = new Set(ids);
  org.note = `Added ${ids.length}.`;
  goTo('pieces');
}

async function showPieces() {
  await loadRoom();
  drawPieces();
}

function shownPieces() {
  const all = [...pieces.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (org.filter === 'new') return all.filter((p) => org.justAdded.includes(p.id));
  if (org.filter === 'none') return all.filter((p) => !p.set);
  if (org.filter.startsWith('set:')) return all.filter((p) => p.set === org.filter.slice(4));
  return all;
}

// The shown pieces, a row for each piece and its colours, the first colour first.
function shownRows() {
  const rows = new Map();
  for (const p of shownPieces()) {
    const root = pieces.get(familyOf(p)) ? familyOf(p) : p.id;
    if (!rows.has(root)) rows.set(root, []);
    rows.get(root).push(p);
  }
  return [...rows.values()].map((row) => row.sort((a, b) => (a.family ? 1 : 0) - (b.family ? 1 : 0)));
}

function pieceTags(p, colours) {
  const tags = [(PIECE_TYPES.find(([key]) => key === p.type) || PIECE_TYPES[0])[1]];
  if (p.rarity && p.rarity !== 'common') tags.push(rarityName(p.rarity));
  if (colours > 1) tags.push(`${colours} colours`);
  if (p.locked) tags.push('in the machine');
  return tags.map(escapeHtml).join(' · ');
}

function drawPieces() {
  const shown = shownPieces();
  const rows = shownRows();
  // Only pieces on screen stay picked.
  org.picked = new Set([...org.picked].filter((id) => shown.some((p) => p.id === id)));
  const n = org.picked.size;
  const rowPicked = (row) => row.every((p) => org.picked.has(p.id));
  const sets = setNames();
  const option = (value, label) => `<option value="${escapeHtml(value)}"${org.filter === value ? ' selected' : ''}>${escapeHtml(label)}</option>`;
  const count = (list) => list.length;
  const all = [...pieces.values()];
  $('pieces-page').innerHTML = `
    <header class="plain-head">
      <div class="date"><div class="date-line">Room</div><h1 class="weekday">Pieces</h1></div>
      <button class="ink-button" type="button" data-org="done">Done</button>
    </header>
    <div class="side">
      <p class="status" role="status">${escapeHtml(org.note)}</p>
      <div class="org-bar">
        <select id="org-filter" aria-label="Which pieces to show">
          ${option('all', `All pieces (${all.length})`)}
          ${org.justAdded.length ? option('new', `Just added (${count(all.filter((p) => org.justAdded.includes(p.id)))})`) : ''}
          ${sets.map((s) => option(`set:${s}`, `${s} (${count(all.filter((p) => p.set === s))})`)).join('')}
          ${option('none', `Not in a set (${count(all.filter((p) => !p.set))})`)}
        </select>
        <button class="text-button" type="button" data-org="cut">Cut more</button>
      </div>
      ${rows.length ? `<label class="check org-all"><input type="checkbox" id="org-all"${n && n === shown.length ? ' checked' : ''}><span>Pick all ${rows.length}</span></label>
      <ul class="org-list">${rows.map((row) => {
        const p = row[0];
        return `<li class="org-row${rowPicked(row) ? ' picked' : ''}">
        <input type="checkbox" data-pick="${row.map((q) => q.id).join(' ')}" aria-label="Pick this piece"${rowPicked(row) ? ' checked' : ''}>
        <button type="button" class="org-thumb" data-open="${p.id}" aria-label="Everything about this piece"><img class="pixel" src="${p.views[0].src}" alt="" style="--pw: ${p.views[0].pw}; --ph: ${p.views[0].ph}"></button>
        <div class="org-main">
          <span class="org-name">${p.set ? escapeHtml(pieceLabel(p)) : '<span class="muted">Not in a set</span>'}</span>
          <span class="org-tags">${pieceTags(p, row.length)}</span>
          ${row.length > 1 ? `<span class="org-colours">${row.slice(1).map((q) => `<button type="button" class="org-colour" data-open="${q.id}" aria-label="This colour"><img class="pixel" src="${q.views[0].src}" alt="" style="--pw: ${q.views[0].pw}; --ph: ${q.views[0].ph}"></button>`).join('')}</span>` : ''}
        </div>
        <button type="button" class="text-button org-more" data-open="${p.id}">More</button>
      </li>`;
      }).join('')}</ul>` : '<p class="muted">No pieces here.</p>'}
    </div>
    <div class="org-actions"${n ? '' : ' hidden'}>
      <span class="grow"><b>${rows.filter(rowPicked).length || n}</b> picked</span>
      <button class="ink-button" type="button" data-org="change">Change</button>
      <button class="text-button" type="button" data-org="colours">Colours</button>
      <button class="text-button danger" type="button" data-org="delete">Delete</button>
    </div>`;
}

const pickedPieces = () => shownPieces().filter((p) => org.picked.has(p.id));

$('pieces-page').addEventListener('change', async (event) => {
  const t = event.target;
  if (t.id === 'org-filter') {
    org.filter = t.value;
    org.picked = new Set();
    org.note = '';
    drawPieces();
  }
  if (t.id === 'org-all') {
    org.picked = new Set(t.checked ? shownPieces().map((p) => p.id) : []);
    drawPieces();
  }
  if (t.dataset.pick) {
    for (const id of t.dataset.pick.split(' ')) {
      if (t.checked) org.picked.add(id);
      else org.picked.delete(id);
    }
    drawPieces();
  }
});

$('pieces-page').addEventListener('click', async (event) => {
  const open = event.target.closest('[data-open]');
  if (open) return openPieceDetails(pieces.get(open.dataset.open));
  const button = event.target.closest('[data-org]');
  if (!button) return;
  const action = button.dataset.org;
  if (action === 'done') goTo('home');
  if (action === 'cut') { cutFor = null; goTo('room-add'); }
  if (action === 'change') openBulkChange();
  if (action === 'colours') openColours();
  if (action === 'delete') {
    const list = pickedPieces();
    const inRoom = placed.filter((p) => list.some((q) => q.id === p.piece)).length;
    if (!confirm(`Delete ${list.length} ${list.length === 1 ? 'piece' : 'pieces'}?${inRoom ? ` ${inRoom} of them in the room go too.` : ''}`)) return;
    await deletePieces(list.map((p) => p.id));
    org.note = `Deleted ${list.length}.`;
    drawPieces();
  }
});

// The sheets close back onto the list, so it shows what changed.
$('sheet').addEventListener('close', () => { if (currentView() === 'pieces') drawPieces(); });

// --- Changing several at once. Anything left on "Keep as is" stays as it was. ---

function openBulkChange() {
  const list = pickedPieces();
  const keep = '<option value="">Keep as is</option>';
  const yesNo = (name, label) => `<label class="field"><span>${label}</span><select name="${name}">${keep}<option value="yes">Yes</option><option value="no">No</option></select></label>`;
  openSheet(`Change ${list.length} ${list.length === 1 ? 'piece' : 'pieces'}`, `
    <div class="pile">${list.slice(0, 12).map((p) => `<span class="pile-tile"><img class="pixel" src="${p.views[0].src}" alt="" style="--pw: ${p.views[0].pw}; --ph: ${p.views[0].ph}"></span>`).join('')}${list.length > 12 ? `<span class="muted">and ${list.length - 12} more</span>` : ''}</div>
    <div class="piece-cols"><div class="piece-col">
    <h3>What they are</h3>
    <label class="field"><span>Kind</span><select name="type">${keep}${PIECE_TYPES.map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}</select></label>
    <div class="cut-box">
      <label>Tiles wide <input name="w" type="number" min="1" max="12" placeholder="Keep"></label>
      <label>Tiles deep <input name="d" type="number" min="1" max="12" placeholder="Keep"></label>
    </div>
    <label class="field"><span>Set</span><select name="setChoice">${keep}${setNames().map((s) => `<option value="set:${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}<option value="new">A new set…</option><option value="none">Not in a set</option></select></label>
    <label class="field" id="bulk-new-set" hidden><span>New set's name</span><input name="newSet" type="text" autocomplete="off"></label>
    <h3>Gachapon</h3>
    <label class="field"><span>Rarity</span><select name="rarity">${keep}${RARITIES.map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}</select></label>
    <label class="field"><span>Gacha machine</span><select name="locked">${keep}<option value="yes">Locked in the machine</option><option value="no">Unlocked</option></select></label>
    </div><div class="piece-col">
    <h3>In the room</h3>
    ${yesNo('surface', 'Things can go on top')}
    ${yesNo('light', 'Give light at night')}
    ${yesNo('stove', 'Stoves to cook on')}
    <h3>Pets</h3>
    ${yesNo('catSpot', `${escapeHtml(cat.name)} can sit and sleep on them`)}
    ${yesNo('toy', `Toys ${escapeHtml(cat.name)} plays with`)}
    </div></div>`,
  async (form) => {
    const choice = form.elements.setChoice.value;
    const newSet = form.elements.newSet.value.trim();
    if (choice === 'new' && !newSet) {
      form.elements.newSet.focus();
      return false;
    }
    const num = (name) => (form.elements[name].value === '' ? null : Math.max(1, Math.round(Number(form.elements[name].value)) || 1));
    const [w, d] = [num('w'), num('d')];
    const flag = (name, piece) => (form.elements[name].value === '' ? piece[name] : form.elements[name].value === 'yes');
    for (const piece of list) {
      const change = { ...piece };
      if (choice === 'new') change.set = newSet;
      if (choice === 'none') change.set = '';
      if (choice.startsWith('set:')) change.set = choice.slice(4);
      if (form.elements.rarity.value) change.rarity = form.elements.rarity.value;
      if (form.elements.type.value) change.type = form.elements.type.value;
      for (const name of ['locked', 'surface', 'catSpot', 'light', 'toy', 'stove']) change[name] = Boolean(flag(name, piece));
      // Tiles: the first look as given, and turned looks the other way round.
      if (w || d) {
        change.views = piece.views.map((v, i) => {
          const [vw, vd] = [w || (i % 2 ? piece.views[0].d : v.w), d || (i % 2 ? piece.views[0].w : v.d)];
          return i % 2 ? { ...v, w: vd, d: vw } : { ...v, w: vw, d: vd };
        });
      }
      const saved = await putItem(change);
      pieces.set(saved.id, saved);
    }
    if (choice === 'new' || choice.startsWith('set:')) org.filter = `set:${choice === 'new' ? newSet : choice.slice(4)}`;
    org.note = `Changed ${list.length} ${list.length === 1 ? 'piece' : 'pieces'}.`;
    showBackupInfo();
    return true;
  });
  const form = $('sheet-form');
  form.elements.setChoice.addEventListener('change', () => {
    $('bulk-new-set').hidden = form.elements.setChoice.value !== 'new';
    if (form.elements.setChoice.value === 'new') form.elements.newSet.focus();
  });
}

// --- Colours: group picked pieces as colours of one, or cut them again from
// sheets of the same layout in other colours. ---

function openColours() {
  const list = pickedPieces();
  const cuttable = list.filter((p) => p.sheet && p.views.some((v) => v.box));
  const firsts = list.filter((p) => !list.some((q) => q.id === p.family));
  openSheet('Colours', `
    ${firsts.length > 1 ? `<h3>Colours of one piece</h3>
    <div class="field"><span>The first colour</span>${pieceRadios('original', firsts, firsts[0].id)}</div>
    <p><button class="ink-button" type="submit" value="group">Group them as colours</button></p>` : ''}
    ${cuttable.length ? `<h3>Cut other colours</h3>
    <label class="ink-button"><span>Choose the other colours</span><input id="org-colour-files" type="file" accept="image/*" multiple hidden></label>` : ''}`,
  async (form, submitter) => {
    if (!submitter || submitter.value !== 'group') return true;
    const original = pieces.get(form.elements.original.value);
    const root = familyOf(original);
    for (const piece of list) {
      if (familyOf(piece) === root) continue;
      // Colours of a picked piece come along.
      for (const other of [...pieces.values()]) {
        if (other.family !== piece.id) continue;
        const moved = await putItem({ ...other, family: root });
        pieces.set(moved.id, moved);
      }
      const saved = await putItem({ ...piece, family: piece.id === root ? '' : root });
      pieces.set(saved.id, saved);
    }
    org.note = `${list.length} pieces are now colours of one piece.`;
    return true;
  }, 'Close');
  const files = $('org-colour-files');
  if (files) {
    files.addEventListener('change', async () => {
      const chosen = [...files.files];
      if (!chosen.length) return;
      $('sheet').close();
      await cutColours(cuttable, chosen);
    });
  }
}

// The part of a file name that says its colour: the words not in the first
// sheet's name. "cottage-blue.png" next to "cottage-red" is "blue".
function colourWord(fileName, sheet) {
  const words = (name) => name.toLowerCase().split(/[\s_.-]+/).filter(Boolean);
  const base = new Set(words(sheet));
  const own = words(fileName.replace(/\.[^.]*$/, '')).filter((w) => !base.has(w));
  return own.join(' ') || fileName.replace(/\.[^.]*$/, '');
}

async function cutColours(list, files) {
  const ids = [];
  let skipped = 0;
  for (const file of files) {
    let sheet;
    try {
      sheet = pictureCanvas(await loadPicture(await readFileAsDataUrl(file)));
    } catch {
      skipped += list.length;
      continue;
    }
    for (const piece of list) {
      const fits = (box) => box && box[0] + box[2] <= sheet.width && box[1] + box[3] <= sheet.height;
      const views = piece.views.filter((v) => fits(v.box)).map((v) => ({ ...v, src: cutBox(sheet, v.box) }));
      if (!views.length) { skipped++; continue; }
      const copy = { ...piece };
      delete copy.unlockedAt;
      const saved = await putItem({
        ...copy, id: newId('piece'), name: `${piece.name} (${colourWord(file.name, piece.sheet)})`, views, family: familyOf(piece),
        sheet: file.name.replace(/\.[^.]*$/, ''), locked: true, createdAt: Date.now() + ids.length,
      });
      pieces.set(saved.id, saved);
      ids.push(saved.id);
    }
  }
  showBackupInfo();
  org.justAdded = ids;
  org.filter = 'new';
  org.picked = new Set();
  org.note = `Cut ${ids.length} ${ids.length === 1 ? 'piece' : 'pieces'} in ${files.length} ${files.length === 1 ? 'colour' : 'colours'}. They went into the gacha machine.${skipped ? ` ${skipped} couldn't be cut: a sheet was smaller.` : ''}`;
  drawPieces();
}
