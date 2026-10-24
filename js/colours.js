// colours.js: the Colours page (menu > Colours, #colours). Every colour in the app
// in one place, to try things out:
//   The app, Feelings, Insight and the picker palette are roles from look.js.
//     They're kept on this phone only, and the page reloads to show them.
//   Habit categories, habits and the Health page's items keep their colours in
//     your data, the same as when you change them on their own pages.

let colourTargets = [];

function colourRow(info, name, colour, extra = '') {
  colourTargets.push(info);
  return `<button type="button" class="edit-row" data-recolour="${colourTargets.length - 1}">
    <span class="swatch" style="background: ${colour}"></span>
    <span class="row-name">${escapeHtml(name)}</span><span class="row-word">${extra || colour}</span>${chevronRight}</button>`;
}

async function showColours() {
  colourTargets = [];
  const changed = savedColours();
  const changedWord = (role) => (role in changed ? `${COLOURS[role]} · changed` : '');
  let html = COLOUR_ROLES.map(([group, roles]) => `<h2 class="label">${group}</h2>
    ${roles.map(([role, name]) => colourRow({ kind: 'role', role, name }, name, COLOURS[role], changedWord(role))).join('')}`).join('');

  html += `<h2 class="label">Colour picker choices</h2>
    <p class="muted">The swatches offered whenever you pick a colour.</p>
    <div class="swatches palette-edit">${PALETTE.map((c, k) => {
      colourTargets.push({ kind: 'palette', index: k, name: `Choice ${k + 1}` });
      return `<button type="button" data-recolour="${colourTargets.length - 1}" style="background: ${c}" aria-label="Choice ${k + 1}, ${c}"></button>`;
    }).join('')}</div>`;

  await loadInsight();
  if (insight.habits.length) {
    html += `<h2 class="label">Habit categories</h2>
      ${categories().map((name) => colourRow({ kind: 'category', name }, name, insight.catColours.get(name))).join('')}
      <h2 class="label">Habits</h2>
      ${insight.habits.map((h) => colourRow({ kind: 'habit', habit: h, name: h.name }, h.name, h.colour, h.ownColour ? '' : 'its category’s')).join('')}`;
  }

  const list = insight.list;
  const healthRows = [
    ...list.checkins.morning.map((item) => [item, `${item.name} (morning)`]),
    ...list.checkins.evening.map((item) => [item, `${item.name} (evening)`]),
    ...list.tabs.flatMap((tab) => tab.entries.filter((e) => e.colour).map((e) => [e, e.items ? `${e.name} folder` : e.name])),
  ];
  html += `<h2 class="label">Health page</h2>
    ${healthRows.map(([item, name]) => colourRow({ kind: 'health', item, name }, name, item.colour)).join('')}
    <div class="buttons colour-buttons">
      <button id="copy-colours" class="ink-button" type="button">Copy the app colours as text</button>
      <button id="reset-colours" class="text-button danger" type="button">Back to the starting colours</button>
    </div>
    <p id="colours-status" class="status" role="status"></p>`;
  $('colours-list').innerHTML = html;
}

function openRecolour(info) {
  const isRole = info.kind === 'role' || info.kind === 'palette';
  const current = info.kind === 'role' ? COLOURS[info.role]
    : info.kind === 'palette' ? PALETTE[info.index]
    : info.kind === 'category' ? insight.catColours.get(info.name)
    : info.kind === 'habit' ? info.habit.colour
    : info.item.colour;
  const note = isRole ? '<p class="muted">The app reloads to show the new colour everywhere.</p>'
    : info.kind === 'habit' ? '<p class="muted">Gives this habit its own colour, instead of its category’s.</p>' : '';
  const back = info.kind === 'habit' && info.habit.ownColour ? '<button class="text-button" type="submit" name="action" value="default">Use its category’s</button>'
    : isRole ? '<button class="text-button" type="submit" name="action" value="default">Starting colour</button>' : '';
  openSheet(escapeHtml(info.name), `${note}${colourPicker(current)}${back ? `<p>${back}</p>` : ''}`, async (form, submitter) => {
    const toDefault = submitter && submitter.value === 'default';
    const colour = form.elements.colour.value.toUpperCase();
    if (isRole) {
      const changes = savedColours();
      if (info.kind === 'role') {
        if (toDefault) delete changes[info.role];
        else changes[info.role] = colour;
      } else {
        const palette = [...(changes.palette || COLOUR_DEFAULTS.palette)];
        palette[info.index] = toDefault ? COLOUR_DEFAULTS.palette[info.index] : colour;
        changes.palette = palette;
      }
      saveColours(changes);
      location.reload();
      return;
    }
    if (info.kind === 'category') {
      await putItem({ id: `habit-cat-${slug(info.name)}`, kind: 'habit-cat', day: '', name: info.name, colour });
    } else if (info.kind === 'habit') {
      const h = info.habit;
      await putItem({ id: `habit-${h.id}`, kind: 'habit', day: '', taskId: h.id, category: h.category, colour: toDefault ? '' : colour, freq: h.freq, streak: h.streak });
    } else {
      info.item.colour = colour;
      await saveHealthList(insight.list);
    }
    showBackupInfo();
    showColours();
  });
}

$('colours-list').addEventListener('click', async (event) => {
  const row = event.target.closest('[data-recolour]');
  if (row) openRecolour(colourTargets[Number(row.dataset.recolour)]);
  if (event.target.closest('#reset-colours')) {
    if (!confirm('Put every colour of the app, feelings, Insight and colour picker back to how it started? Your habit and Health page colours stay.')) return;
    saveColours(null);
    location.reload();
  }
  if (event.target.closest('#copy-colours')) {
    const text = COLOUR_ROLES.flatMap(([, roles]) => roles.map(([role, name]) => `${name}: ${COLOURS[role]}`)).concat(`Colour picker: ${PALETTE.join(' ')}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      $('colours-status').textContent = 'Copied. You can paste them into a message.';
    } catch {
      $('colours-status').textContent = text;
    }
  }
});

$('colours-button').addEventListener('click', () => {
  closeMenu();
  // Takes the menu's place in the phone's history, so back goes where you were before the menu.
  history.replaceState(null, '', '#colours');
  showView();
});
$('colours-done').addEventListener('click', () => history.back());

// Colours saved with the palette before 24 Oct 2026 move to the same place in today's palette.
// Runs at start and after loading a file; only touches items that still have old colours.
async function movePaletteColours() {
  if (sampleMode) return;
  for (const item of await getAllItems()) {
    if (item.deleted) continue;
    if ((item.kind === 'habit' || item.kind === 'habit-cat') && OLD_PALETTE.includes((item.colour || '').toUpperCase())) {
      await putItem({ ...item, colour: newPaletteColour(item.colour) });
    }
    if (item.kind === 'health-list') {
      let moved = false;
      const walk = (value) => {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object') {
          if (OLD_PALETTE.includes((value.colour || '').toUpperCase())) {
            value.colour = newPaletteColour(value.colour);
            moved = true;
          }
          Object.values(value).forEach(walk);
        }
      };
      walk(item.list);
      if (moved) await putItem({ ...item });
    }
  }
}
