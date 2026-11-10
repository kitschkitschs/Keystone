// ---------- condition tags (2026-11-06) ----------
// Every condition can carry tags (Illness, Injury, ...). Each tag has its own line colour on the calendars, and
// each calendar switches tags on or off in edit mode › Calendars. Health and Training show the same one
// list (2026-11-06); x.fit is no longer used.
// (a function, not a const: migration runs while the page is still loading)
function CT_DEF() { return [['ct-ill', 'Illness', '#6F9BD6'], ['ct-inj', 'Injury', '#F08A3E'], ['ct-weak', 'Weakness', '#EDBB3A'], ['ct-pain', 'Pain', '#E0644E']]; }
const CT_NONE = '#B3AC9F';
function cMigrate(m) { m.settings = m.settings || {};
  // example data: conditions that ended over a month ago start in the Archive (2026-11-06)
  if (!m.settings.condarch1) { m.settings.condarch1 = true; if (m.example) { const old = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10); (m.conds || []).forEach((x) => { if (x.end && x.end < old) x.arch = true; }); } }
  if (m.settings.ctags1) return; m.settings.ctags1 = true;
  m.settings.condTags = m.settings.condTags || CT_DEF().map(([id, name, color]) => ({ id, name, color }));
  const SAMP = { 'cs-cold': 'ct-ill', 'cs-mig': 'ct-pain', 'cs-iron': 'ct-ill', 'cs-shin': 'ct-inj', 'cs-knee': 'ct-inj', 'cs-hip': 'ct-weak' };
  (m.conds || []).forEach((x) => { if (!x.tags) x.tags = [SAMP[x.id] || (x.fit ? 'ct-inj' : 'ct-ill')]; }); }
const condTags = () => ((M.settings = M.settings || {}).condTags = M.settings.condTags || CT_DEF().map(([id, name, color]) => ({ id, name, color })));
const ctag = (id) => condTags().find((t) => t.id === id);
const ctagCol = (id) => (ctag(id) || {}).color || CT_NONE;
const ctagsOf = (x) => (x.tags || []).filter(ctag);
// which tags a calendar draws: Today all, Training all but Illness, Schedule and Meal plan none (until switched on)
const ctOn = (k, id) => { const o = ((M.settings || {}).calShow || {})[k] || {}; const f = 'ct:' + id; if (f in o) return !!o[f]; return k === 'plan' || (k === 'train' && id !== 'ct-ill'); };
const condsDay = (d) => d > T0 ? [] : (M.conds || []).filter((x) => x.start <= d && (!x.end || x.end > d)); // the day I end it doesn't count (2026-11-06)
const lineTagsOn = (k, d) => { const s = new Set(); condsDay(d).forEach((x) => { const t = ctagsOf(x); (t.length ? t : ['none']).forEach((id) => { if (ctOn(k, id)) s.add(id); }); }); return s; };
// one row per tag that shows anywhere in that week, in tag order, so a line keeps its height across the week (max 3)
const ctOrder = () => condTags().map((t) => t.id).concat('none');
function calLines(k, d) { const w = weekStart(d); const inWeek = new Set(); for (let i = 0; i < 7; i++) lineTagsOn(k, addDays(w, i)).forEach((id) => inWeek.add(id));
  const rows = ctOrder().filter((id) => inWeek.has(id)).slice(0, 3); const today = lineTagsOn(k, d); if (!today.size) return '';
  // one stack per day: every row of the week keeps its place (an empty row when this day hasn't that tag), so the lines
  // stay level across the week and evenly spaced; snapBars sizes them in whole device pixels (2026-11-06)
  // three fixed slots: the first line sits in the middle, the second under it, the third over it (2026-11-06)
  const slots = [rows[2], rows[0], rows[1]];
  return `<span class="condlines">` + slots.map((id) => { if (!id || !today.has(id)) return '<i class="no"></i>'; const prev = lineTagsOn(k, addDays(d, -1)).has(id), next = d < T0 && lineTagsOn(k, addDays(d, 1)).has(id);
    const names = condsDay(d).filter((x) => (ctagsOf(x).length ? ctagsOf(x) : ['none']).includes(id)).map((x) => x.name).join(', ');
    return `<i class="${prev ? '' : 'st'} ${next ? '' : 'en'}" style="--cc:${id === 'none' ? CT_NONE : ctagCol(id)}" title="${esc(names)}"></i>`; }).join('') + `</span>`; }
// the little tag line shown before a condition's sub text and in the picked-day list
const ctagMarks = (x) => (ctagsOf(x).length ? ctagsOf(x) : ['none']).map((id) => `<i class="ctl" style="background:${id === 'none' ? CT_NONE : ctagCol(id)}"></i>`).join('');
const ctagWords = (x) => ctagsOf(x).map((id) => ctag(id).name).join(', ');

// the condition pop-up: name, tags, Health or Training, dates
function condSheet(s) { const D = s.draft;
  const chip = (act, v, l, on, col) => `<button class="chip" data-a="${act}" data-v="${v}" aria-pressed="${on}" ${col ? `style="--c:${col}"` : ''}>${col ? `<span class="d"></span>` : ''}${esc(l)}</button>`;
  return `<div class="fld"><span class="mono">Name</span><input class="inp" id="cname" value="${esc(D.name)}" placeholder="e.g. Sore knee" data-autofocus></div>
    <div class="fld"><span class="mono">Tags</span><div class="chips">${condTags().map((t) => chip('ctagpick', t.id, t.name, (D.tags || []).includes(t.id), t.color)).join('')}</div>
      ${addOpen('ctagnew') ? `<div class="inrow" style="margin-top:8px"><input class="inp" id="ctagnew" placeholder="New tag"><button class="btn soft" data-a="ctagnew">Add</button></div>` : `<div class="chips" style="margin-top:8px">${addChip('ctagnew', 'New tag')}</div>`}</div>
    <div class="fld"><span class="mono">Started</span><input class="inp" type="date" id="cstart" value="${esc(D.start || '')}"></div>
    <div class="fld"><span class="mono">Ended</span><input class="inp" type="date" id="cend" value="${esc(D.end || '')}"></div>
    ${s.isNew ? '' : `<button class="btn danger" style="width:100%;margin-top:8px" data-a="conddel" data-ref="${s.ref}">Delete</button>`}`; }
function condCapture() { const D = S.sheet.draft; const g = (id) => ($('#' + id) || {}).value; D.name = (g('cname') || '').trim(); D.start = g('cstart') || D.start; D.end = g('cend') || null; }
function condAction(act, a, ref, v) {
  switch (act) {
    case 'condopen': { const x = (M.conds || []).find((c) => c.id === ref); if (x) openSheet({ kind: 'cond', ref, title: x.name, draft: JSON.parse(JSON.stringify(x)) }); return true; }
    case 'ctagpick': { condCapture(); const D = S.sheet.draft; D.tags = D.tags || []; D.tags = D.tags.includes(v) ? D.tags.filter((t) => t !== v) : D.tags.concat(v); renderLayer(); return true; }
    case 'ctagnew': { condCapture(); const n = ($('#ctagnew').value || '').trim(); if (!n) return true; const id = uid('ct'); const used = condTags().map((t) => t.color);
      const col = (PAL.find(([, c]) => !used.includes(c)) || PAL[0])[1]; condTags().push({ id, name: n, color: col }); save(); S.sheet.draft.tags = (S.sheet.draft.tags || []).concat(id); renderLayer(); return true; }
    case 'condarch': { const x = (M.conds || []).find((c) => c.id === ref); if (!x) return true; const was = !!x.arch; change(() => { if (was) delete x.arch; else x.arch = true; }, (was ? 'Brought back ' : 'Archived ') + x.name); return true; }
    case 'condarchopen': S.open['condarch'] = S.open['condarch'] !== true; render(); return true;
    case 'cfit': condCapture(); S.sheet.draft.fit = v === '1'; renderLayer(); return true;
    case 'condsave': { condCapture(); const D = S.sheet.draft; if (!D.name) { flash('Name it first'); return true; } const s = S.sheet;
      change(() => { if (s.isNew) { M.conds.push(Object.assign({ id: s.ref }, D)); if (!D.end) delete M.conds[M.conds.length - 1].end; return; } const x = M.conds.find((c) => c.id === s.ref); if (x) { Object.assign(x, D); if (!D.end) delete x.end; if (!D.fit) delete x.fit; } }, 'Saved'); S.sheet = null; render(); return true; }
    case 'conddel': { const x = M.conds.find((c) => c.id === ref); S.sheet = null; change(() => { M.conds = M.conds.filter((c) => c.id !== ref); }, 'Deleted ' + (x ? x.name : '')); return true; }
    case 'ctagdel': { const t = ctag(ref); change(() => { M.settings.condTags = condTags().filter((x) => x.id !== ref); (M.conds || []).forEach((c) => { if (c.tags) c.tags = c.tags.filter((x) => x !== ref); }); }, 'Deleted the tag ' + (t ? t.name : '')); return true; }
  }
  return false;
}
// edit mode › Calendars: the shared tag list (colour dot to change, ✕ to delete)
const ctagRows = () => `<div class="fld calset"><span class="mono">Condition tags</span>${condTags().map((t) => `<div class="tg"><span class="hdot" style="background:${t.color};width:14px;height:14px" data-col="ctag:${t.id}" role="button" aria-label="Change the ${esc(t.name)} colour"></span><span class="l">${esc(t.name)}</span><button class="soft" data-a="ctagdel" data-ref="${t.id}" aria-label="Delete the tag ${esc(t.name)}">${icon('x', 16)}</button></div>`).join('')}</div>`;
