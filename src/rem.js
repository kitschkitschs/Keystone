// ===================== Reminders (2026-11-10) =====================
// A Planner tab holding the reminders my Cloudflare worker sends to my phone as notifications (the Keystone approach).
// M.reminders = [{ id, text, time 'HH:MM', rep 'once'|'days', date (once), days [0..6 Mon first] (days), item (only if not done), on }]
// Every change sends the times (never the words) to the sender; see host.js.
function remMigrate(m) {
  m.reminders = Array.isArray(m.reminders) ? m.reminders : []; m.pages = m.pages || {}; m.settings = m.settings || {};
  if (!m.pages.rem) m.pages.rem = { name: 'Reminders', color: '#D9AE72' };
  const pl = m.areas && m.areas.plan; if (pl && !pl.pages.includes('rem')) pl.pages.push('rem');
  if (m.example && !m.settings.rem1) { m.settings.rem1 = true; const T = (n) => addDays(T0, n);
    m.reminders.push({ id: 'rm-ex1', text: 'Take my medication', time: '08:30', rep: 'days', days: [0, 1, 2, 3, 4, 5, 6], on: true, sample: true },
      { id: 'rm-ex2', text: 'Water the plants', time: '18:00', rep: 'days', days: [2, 6], on: true, sample: true },
      { id: 'rm-ex3', text: 'Book the dentist', time: '10:00', rep: 'once', date: T(2), on: true, sample: true },
      { id: 'rm-ex4', text: 'Evening check-in', time: '21:30', rep: 'days', days: [0, 1, 2, 3, 4, 5, 6], item: 'ci-e', on: false, sample: true }); }
}
const remList = () => (M.reminders = M.reminders || []);
const remDow = (d) => (parse(d).getDay() + 6) % 7;
const remOn = (r, d) => r.rep === 'once' ? r.date === d : (r.days || []).includes(remDow(d));
const remDays = (r) => { const D = r.days || []; if (D.length === 7) return 'Every day'; if (D.join() === '0,1,2,3,4') return 'Weekdays'; if (D.join() === '5,6') return 'Weekends'; return D.map((i) => WD[i]).join(', ') || 'No days'; };
const remWhen = (r) => r.rep === 'once' ? (r.date ? relDay(r.date) : 'No date') + ' · ' + (r.time || '') : remDays(r) + ' · ' + (r.time || '');
function remRow(r) { const it = r.item && I(r.item);
  return `<div class="row${r.on ? '' : ' past'}"><span class="adot" style="--c:var(--faint)">${icon('bell', 13, 2.2)}</span><button class="lbl" data-a="remopen" data-ref="${r.id}" style="text-align:left">${esc(r.text || 'Reminder')}<span class="sub">${esc(remWhen(r))}${it ? ' · if ' + esc(it.name) + ' isn’t done' : ''}</span></button><button class="swt" role="switch" aria-checked="${!!r.on}" data-a="remtog" data-ref="${r.id}" aria-label="${esc(r.text)} on"></button></div>`; }
function renderRem() {
  const R = remList(); const byT = (a, b) => (a.time || '').localeCompare(b.time || '');
  const today = R.filter((r) => remOn(r, T0)).sort(byT);
  const rep = R.filter((r) => r.rep !== 'once' && !remOn(r, T0)).sort(byT);
  const later = R.filter((r) => r.rep === 'once' && r.date > T0).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const sec = (t, xs) => xs.length ? lcard('rm:' + t, t, xs.length, xs.map(remRow).join('')) : '';
  const tools = `<div class="ptools"><button class="fbtn" data-a="remnew" aria-label="New reminder">${icon('plus', 18)}</button><button class="fbtn" data-a="remsetup" aria-label="Notification settings" aria-pressed="${!!S.remSet}">${icon('bell-ring', 18)}</button></div>`;
  return tools + (S.remSet ? remSetup() : '') + (sec('Today', today) + sec('Repeat', rep) + sec('Later', later) || '<p class="empty">No reminders.</p>');
}
// notifications on this phone, and when the times last reached the sender (the sending itself lives in host.js)
function remSetup() { const st = M.settings.remSync || {}; let perm = 'Not available here', on = false; try { if (remCan()) { perm = { granted: REM.sub ? 'On' : 'Not signed up yet', denied: 'Blocked', default: 'Off' }[Notification.permission]; on = Notification.permission === 'granted' && REM.sub; } } catch (_) {}
  return `<div class="card lcard remset"><div class="tg"><span class="l">Notifications on this phone<small>${esc(perm)}</small></span>${on ? '' : '<button class="btn soft" data-a="remperm">Turn on</button>'}</div>
    <div class="tg"><span class="l">Last sent<small>${st.at ? esc(relDay(st.at.slice(0, 10)) + ' ' + st.at.slice(11, 16)) + (st.ok ? '' : ' · couldn’t reach the sender') : 'Never'}</small></span><button class="btn soft" data-a="remsync">Send now</button></div></div>`; }
function remSheet(s) { const D = s.draft; const ch = (act, v, l, on) => `<button class="chip" data-a="${act}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
  const items = Object.keys(M.items).filter((k) => { const it = I(k); return it && (it.type === 'checkin' || it.type === 'task' || it.type === 'routine' || it.when); }); if (D.item && I(D.item) && !items.includes(D.item)) items.push(D.item); items.sort((a, b) => I(a).name.localeCompare(I(b).name));
  return `<div class="fld"><span class="mono">Remind me to</span><input class="inp" id="remtext" value="${esc(D.text || '')}" autocomplete="off" ${s.isNew ? 'data-autofocus' : ''}></div>
    <div class="fld"><span class="mono">At</span><input class="inp" type="time" id="remtime" value="${esc(D.time || '09:00')}"></div>
    <div class="fld"><span class="mono">When</span><div class="chips">${ch('remrep', 'once', 'Once', D.rep === 'once')}${ch('remrep', 'days', 'Repeat', D.rep !== 'once')}</div></div>
    ${D.rep === 'once' ? `<div class="fld"><span class="mono">Day</span><input class="inp" type="date" id="remdate" value="${esc(D.date || T0)}"></div>`
      : `<div class="fld"><span class="mono">Days</span><div class="chips">${WD.map((w, i) => ch('remday', i, w, (D.days || []).includes(i))).join('')}</div></div>`}
    <div class="fld"><span class="mono">Only if this isn’t done yet</span><select class="inp" id="remitem"><option value="">Always</option>${items.map((k) => `<option value="${k}" ${D.item === k ? 'selected' : ''}>${esc(I(k).name)}</option>`).join('')}</select></div>
    ${s.isNew ? '' : `<button class="btn soft" style="width:100%;margin-top:8px;color:#B5503E" data-a="remdel" data-ref="${s.ref}">Delete this reminder</button>`}`; }
function remCapture() { const s = S.sheet; if (!s || s.kind !== 'rem') return; const g = (id) => (document.getElementById(id) || {}).value;
  const D = s.draft; D.text = (g('remtext') || '').trim(); D.time = g('remtime') || D.time; if (D.rep === 'once') D.date = g('remdate') || D.date; D.item = g('remitem') || ''; }
function remChange(fn) { change(fn, 'Reminders changed'); remSync(); }
function remAction(act, a, ref, v) {
  switch (act) {
    case 'remnew': { const it = v && I(v); const back = it && S.sheet ? S.sheet : null; if (back && typeof capture === 'function') capture();
      const w = (it && it.when) || {}; const days = w.mode === 'days' && (w.days || []).length ? w.days.slice() : [0, 1, 2, 3, 4, 5, 6]; const once = it && (it.type === 'appt' ? !it.rep : w.mode === 'once');
      openSheet({ kind: 'rem', title: 'New reminder', isNew: true, back, draft: { text: it ? it.name : '', time: (it && it.time) || '09:00', rep: once ? 'once' : 'days', days, date: (it && (it.date || w.date)) || T0, item: it ? v : '', on: true } }); return true; }
    case 'remopen': if (S.sheet && S.sheet.kind === 'item') { capture(); const r = remList().find((x) => x.id === ref); if (r) openSheet({ kind: 'rem', ref, title: 'Reminder', back: S.sheet, draft: JSON.parse(JSON.stringify(r)) }); return true; }
    case 'remopen': { const r = remList().find((x) => x.id === ref); if (r) openSheet({ kind: 'rem', ref, title: 'Reminder', draft: JSON.parse(JSON.stringify(r)) }); return true; }
    case 'remrep': remCapture(); S.sheet.draft.rep = v; renderLayer(); return true;
    case 'remday': { remCapture(); const D = S.sheet.draft.days = (S.sheet.draft.days || []).slice(); const i = D.indexOf(+v); if (i >= 0) D.splice(i, 1); else D.push(+v); D.sort(); renderLayer(); return true; }
    case 'remsave': { remCapture(); const s = S.sheet; const D = s.draft; if (!D.text) { flash('Write the reminder first'); return true; } if (D.rep !== 'once' && !(D.days || []).length) { flash('Pick at least one day'); return true; }
      const clean = { text: D.text, time: D.time, rep: D.rep, on: D.on !== false }; if (D.rep === 'once') clean.date = D.date; else clean.days = D.days; if (D.item) clean.item = D.item;
      remChange(() => { if (s.isNew) remList().push(Object.assign({ id: uid('rm') }, clean)); else { const r = remList().find((x) => x.id === s.ref); if (r) { ['date', 'days', 'item'].forEach((k) => delete r[k]); Object.assign(r, clean); } } }); closeSheet(); return true; }
    case 'remdel': { S.sheet = S.sheet && S.sheet.back || null; remChange(() => { M.reminders = remList().filter((x) => x.id !== ref); }); return true; }
    case 'remtog': { const r = remList().find((x) => x.id === ref); if (r) remChange(() => { r.on = !r.on; }); return true; }
    case 'remsetup': S.remSet = !S.remSet; render(); return true;
    case 'remperm': remTurnOn(); return true;
    case 'remsync': remSync(true); return true;
  }
  return false;
}
// every item's full editor has its reminders, and adds one (2026-11-10)
function remField(id) { const R = remList().filter((r) => r.item === id);
  return `<div class="fld"><span class="mono">Reminders</span>${R.length ? `<div class="list">${R.map(remRow).join('')}</div>` : ''}<div class="chips"><button class="chip addchip" data-a="remnew" data-v="${id}"><span class="plus" aria-hidden="true">+</span>Add a reminder</button></div></div>`; }
// a little bell after the name of every item with an active reminder, wherever the item shows (2026-11-10)
const remActive = () => new Set(remList().filter((r) => r.on && r.item && (r.rep !== 'once' || (r.date || '') >= T0)).map((r) => r.item));
let remBellT = 0;
function remBells() { remBellT = 0; const A = remActive(); const root = document.getElementById('phone') || document.body;
  root.querySelectorAll('.rbell').forEach((b) => { const h = b.closest('[data-ref],[data-appt]'); const id = h && (h.dataset.ref || h.dataset.appt); if (!A.has(id) || S.edit) b.remove(); });
  if (S.edit || !A.size) return;
  root.querySelectorAll('.row[data-ref], .vjob[data-ref], .appt[data-appt], div[data-ref] > .row:first-child').forEach((r) => { const h = r.dataset.ref || r.dataset.appt ? r : r.parentElement; const id = h.dataset.ref || h.dataset.appt; if (!A.has(id) || r.querySelector('.rbell')) return;
    let lbl = null; for (const q of ['.vjt b', ':scope > button > span[style*="flex:1"]', '.lbl > button > span[style*="flex:1"]', 'button.lbl > span[style*="flex:1"]', '.lbl > button', 'button.lbl', '.lbl']) { lbl = r.querySelector(q); if (lbl) break; } if (!lbl || lbl.closest('.under')) return;
    const b = document.createElement('span'); b.className = 'rbell'; b.setAttribute('aria-label', 'Has a reminder'); b.setAttribute('role', 'img'); b.innerHTML = icon('bell', 12, 2.2);
    const sub = lbl.querySelector(':scope > .sub'); if (sub) lbl.insertBefore(b, sub); else lbl.appendChild(b); }); }
new MutationObserver(() => { if (!remBellT) remBellT = requestAnimationFrame(remBells); }).observe(document.documentElement, { childList: true, subtree: true });
