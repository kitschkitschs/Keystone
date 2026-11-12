// ---------- Hobbies (rebuilt on the building blocks, 2026-11-06) ----------
// g-hobbies > hobby groups (style 'hobby', shown as folder tabs down the right edge) > kids: activities (items I just tick)
// and projects (groups, style 'project') > project tasks (one-off tasks that can be scheduled like any other task).
// A project can be on hold (its own folding row, closed by default) or finished (p.done = date): finished ones live in
// the ⋯ menu's Archive. Surprise me is the dice tab at the top of the folders.
// every hobby item can be overdone by default (2026-11-11): swipe it to the left in Hobbies for Too much
function hobOverFix(m) { if (m.settings.hobOver1 || !m.groups || !m.groups['g-hobbies']) return; m.settings.hobOver1 = true;
  const G0 = (k) => m.groups[k]; m.groups['g-hobbies'].kids.filter(G0).forEach((h) => G0(h).kids.forEach((k) => { if (m.items[k] && m.items[k].overdo === undefined) m.items[k].overdo = true; if (G0(k) && G0(k).style === 'project') G0(k).kids.forEach((t) => { if (m.items[t] && m.items[t].overdo === undefined) m.items[t].overdo = true; }); })); }
function hMigrate(m) { m.settings = m.settings || {}; if (m.settings.hobbies1) { hobOverFix(m); return; } m.settings.hobbies1 = true;
  if (m.groups['g-hobbies']) return;
  const G0 = (id, o) => { m.groups[id] = Object.assign({ kids: [] }, o); return id; };
  const I0 = (id, o) => { if (!m.items[id]) m.items[id] = Object.assign({ type: 'task', when: { mode: 'every', n: 1 }, kind: 'behaviour', tags: ['t-hobby'], insight: true, made: '2026-10-01', dur: 30 }, o); return id; };
  const ex = !!m.example; const T = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const H = [['h-knit', 'Knitting', '#EC8FA8', 'scissors'], ['h-sew', 'Sewing', '#6F9BD6', 'shirt'], ['h-emb', 'Embroidering', '#A877C4', 'flower-2'], ['h-mend', 'Mending', '#D9AE72', 'spool'], ['h-learn', 'Learning', '#7DBE9A', 'book-open'], ['h-media', 'Media', '#F08A3E', 'tv']];
  G0('g-hobbies', { name: 'Hobbies', style: 'hobbies', kids: H.map((x) => x[0]) });
  H.forEach(([id, name, color, icon]) => G0(id, { name, style: 'hobby', color, icon }));
  if (!ex) return;
  const acts = { 'h-knit': [m.items['t-knit'] ? 't-knit' : I0('ha-knit', { name: 'Knit', icon: 'scissors', overdo: true })], 'h-sew': [I0('ha-sew', { name: 'Sew', icon: 'shirt' })], 'h-emb': [I0('ha-emb', { name: 'Embroider', icon: 'flower-2' })], 'h-mend': [I0('ha-mend', { name: 'Mend something', icon: 'spool' })],
    'h-learn': [I0('ha-read', { name: 'Reading', icon: 'book-open' }), I0('ha-lect', { name: 'Lectures', icon: 'presentation' }), I0('ha-write', { name: 'Writing', icon: 'pen-line' }), I0('ha-cookr', { name: 'Cooking research', icon: 'chef-hat' })],
    'h-media': [m.items['t-tv'] ? 't-tv' : I0('ha-tv', { name: 'TV', icon: 'tv', overdo: true }), I0('ha-game', { name: 'Gaming', icon: 'gamepad-2', overdo: true }), I0('ha-fic', { name: 'Fiction', icon: 'book' }), I0('ha-audio', { name: 'Audiobooks', icon: 'headphones' })] };
  Object.entries(acts).forEach(([h, ids]) => { m.groups[h].kids.push(...ids); });
  const task = (id, name) => I0(id, { name, when: { mode: 'once', date: null }, insight: false, tags: [] });
  const proj = (id, h, name, tasks, o) => { G0(id, Object.assign({ name, style: 'project', photos: [] }, o, { kids: tasks.map(([tid, tn]) => task(tid, tn)) })); m.groups[h].kids.push(id); };
  proj('pj-sweater', 'h-knit', 'Sweater', [['pt-back', 'Finish the back panel'], ['pt-sleeves', 'Knit both sleeves'], ['pt-seam', 'Sew it together'], ['pt-cast', 'Cast on']]);
  proj('pj-socks', 'h-knit', 'Socks', [['pt-heel', 'Turn the heel']], { hold: true });
  proj('pj-blanket', 'h-knit', 'Baby blanket', [['pt-edge', 'Knit the edging']], { done: T(-25) });
  proj('pj-skirt', 'h-sew', 'Linen skirt', [['pt-cut', 'Cut the pieces'], ['pt-waist', 'Sew the waistband']]);
  proj('pj-hoop', 'h-emb', 'Flower hoop', [['pt-trace', 'Trace the pattern']]);
  proj('pj-jeans', 'h-mend', 'Jeans knee patch', [['pt-patch', 'Patch the left knee']]);
  // a little history so Last worked on and Last done have something to say
  const lg = (d, id) => { (m.log[d] = m.log[d] || {})[id] = 'done'; };
  lg(T(-12), 'pt-cast'); lg(T(-4), 'pt-back'); lg(T(-9), 'pt-cut'); lg(T(-3), 'ha-read'); lg(T(-6), 'ha-sew'); lg(T(-15), 'ha-emb'); lg(T(-2), 'ha-game'); lg(T(-26), 'pt-edge');
  m.settings.hobPool = { 'h-media': false };
}
// archived hobbies leave the tabs and Surprise me; they wait in the Archive (2026-11-06)
const allHobIds = () => (G('g-hobbies') ? G('g-hobbies').kids.filter(G) : []);
const hobIds = () => allHobIds().filter((h) => !G(h).arch);
const hobActs = (h) => G(h).kids.filter((k) => I(k));
const hobProjs = (h) => G(h).kids.filter((k) => G(k) && G(k).style === 'project');
const hobOf = (pid) => hobIds().find((h) => G(h).kids.includes(pid));
const projTasks = (p) => G(p).kids.filter((k) => I(k));
const lastEver = (id) => Object.keys(M.log).filter((d) => d <= T0 && val(d, id)).sort().pop() || null;
// last worked on: days I marked it, or ticked one of its tasks; a photo alone doesn't count, so undoing today really undoes it (2026-11-11)
const projLast = (p) => projTasks(p).map(lastEver).concat(G(p).worked || []).filter(Boolean).sort().pop() || null;
const hobLast = (h) => hobActs(h).map(lastEver).concat(hobProjs(h).map(projLast)).filter(Boolean).sort().pop() || null;
const agoText = (d) => { const n = diff(d, T0); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 14 ? n + ' days ago' : n < 60 ? Math.round(n / 7) + ' weeks ago' : Math.round(n / 30) + ' months ago'; };
const projSrc = (x) => x.asset ? blobUrl(x.asset) : x.src;
function hobArea(id) { const h = hobIds().find((k) => G(k).kids.includes(id)); if (h) return G(h).name; const p = hobIds().flatMap(hobProjs).find((k) => G(k).kids.includes(id)); return p ? G(hobOf(p)).name + ' · ' + G(p).name : ''; }

function hobRail() {
  const H = hobIds(); if (!S.hob || (S.hob !== 'surprise' && !G(S.hob))) S.hob = H[0] || 'surprise';
  const tab = (h) => { const g = G(h); const on = S.hob === h && !S.proj;
    return `<button role="tab" data-a="hobpick" data-v="${h}" aria-selected="${S.hob === h}" style="${S.hob === h ? 'background:' + g.color + '2E' : ''}"><span class="dot" style="background:${g.color}" ${S.edit ? `data-col="${h}" role="button" aria-label="Change colour of ${esc(g.name)}"` : ''}></span><span class="vl">${esc(g.name)}</span></button>`; };
  return `<nav role="tablist" aria-label="Hobbies"><button role="tab" class="dice" data-a="hobpick" data-v="surprise" aria-selected="${S.hob === 'surprise'}" aria-label="Surprise me">${icon('dice-5', 18)}</button>${H.map(tab).join('')}${S.edit ? `<button class="dice" data-a="hobadd" aria-label="Add hobby">${icon('plus', 18)}</button>` : ''}</nav>`;
}
// edit mode: the tabs as a list, to rename them and drag them into another order (the owner, 2026-11-11)
function hobTabsCard() { return lcard(null, 'Hobby tabs', '', `<div class="list" data-list="g-hobbies">${hobIds().map((h) => `<div class="row" data-ref="${h}">${grip()}<span class="hdot" data-col="${h}" role="button" aria-label="Change the ${esc(G(h).name)} colour" style="background:${G(h).color};width:16px;height:16px;flex:none;border-radius:8px;outline:1.5px dashed var(--faint);outline-offset:2px"></span><span class="lbl">${nm(h, G(h).name)}</span></div>`).join('')}</div>`); }
function hobTitle() { if (S.hob === 'surprise') return 'Surprise me'; if (S.proj && G(S.proj)) return S.edit ? nm(S.proj, G(S.proj).name) : esc(G(S.proj).name); return S.edit ? nm(S.hob, G(S.hob).name) : esc(G(S.hob).name); }
function renderHobbies() {
  if (!hobIds().length) return `<p class="empty">No hobbies yet.</p>` + (S.edit ? `<button class="addbtn" data-a="hobadd"><span class="plus">+</span>Hobby</button>` : '');
  if (S.hob === 'surprise') return surprisePage();
  if (S.proj && G(S.proj) && !G(S.proj).done) return projPage(S.proj);
  S.proj = null; const h = S.hob; const g = G(h);
  const actRow = (id) => { const it = I(id); const done = isDone(id, T0); const ld = lastEver(id);
    return `<div class="row" data-ref="${id}">${tickCircle(id, T0, true)}<button class="lbl" data-a="${S.edit ? 'open' : 'hobact'}" data-ref="${id}" style="text-align:left">${nm(id, it.name)}<span class="sub">${done ? 'Logged today' : ld ? 'Last done ' + agoText(ld) : 'Not done yet'}</span></button>${tail(id, h)}</div>`; };
  const projRow = (p) => { const x = G(p); const ph = (x.photos || []).slice(-1)[0]; const ld = projLast(p); const T = projTasks(p); const left = T.filter((t) => !keeps(t) && !lastEver(t)).length;
    return `<div class="row prow" data-ref="${p}"><span class="pthumb" style="--c:${g.color}">${ph ? `<img src="${esc(projSrc(ph))}" alt="">` : icon(g.icon || 'folder', 18)}</span><button class="lbl" data-a="${S.edit ? 'gear' : 'hobproj'}" data-ref="${p}" style="text-align:left">${nm(p, x.name)}<span class="sub">${(x.worked || []).includes(T0) ? 'Worked on today' : ld ? 'Last worked on ' + agoText(ld) : 'Not started'}${T.length ? ' · ' + left + ' left' : ''}</span></button>${S.edit ? tail(p, h) : `<span class="chev" aria-hidden="true">›</span>`}</div>`; };
  const A = hobActs(h), P = hobProjs(h).filter((p) => !G(p).done), live = P.filter((p) => !G(p).hold), held = P.filter((p) => G(p).hold);
  const hk = 'hbhold:' + h; if (S.open[hk] === undefined) S.open[hk] = false;
  let out = '';
  if (A.length || S.edit) out += lcard('hba:' + h, 'Activities', A.length, A.map(actRow).join('') + (S.edit ? `<button class="addrow" data-a="hobnewact" data-v="${h}"><span class="plus">+</span>Add activity</button>` : ''));
  if (live.length || S.edit) out += lcard('hbp:' + h, 'Projects', live.length, live.map(projRow).join('') + (S.edit ? `<button class="addrow" data-a="hobnewproj" data-v="${h}"><span class="plus">+</span>Project</button>` : ''));
  if (held.length) out += lcard(hk, 'On hold', held.length, held.map(projRow).join(''));
  // Add activity only in edit mode; outside it just + Project (2026-11-06)
  // no + Project button on the page; the top bar + has it (2026-11-08)
  // Archive and Delete for the hobby tab show only in edit mode (2026-11-10)
  if (S.edit) out += hobTabsCard();
  if (S.edit) out += `<div class="pjbtns"><button class="btn" data-a="hobarch" data-ref="${h}">${icon('archive', 16)} Archive</button><button class="btn danger" data-a="hobdel" data-ref="${h}">Delete</button></div>`;
  return out;
}
function projPage(p) { const x = G(p); const h = hobOf(p); const c = G(h).color;
  const T = projTasks(p); const open = T.filter((t) => { const d = lastEver(t); return keeps(t) || !d || d === T0; }); const nDone = T.length - T.filter((t) => !lastEver(t)).length;
  const row = (id, i) => { const it = I(id); const w = whenText(it); const done = isDone(id, T0);
    return `<div class="row" data-ref="${id}">${tickCircle(id, T0, true)}<button class="lbl" data-a="${S.edit ? 'open' : 'sched'}" data-ref="${id}" style="text-align:left">${nm(id, it.name)}<span class="sub">${done ? 'Done today' : w || (i === 0 ? 'Next up' : '')}</span></button>${tail(id, p)}</div>`; };
  const ph = x.photos || [];
  let out = lcardPlus('pjt:' + p, 'Tasks', open.length || '', // only counts the tasks that show (2026-11-08)
     open.map(row).join('') || (T.length ? '<p class="empty">All done.</p>' : ''), '');
  out += photosCard(p);
  // notes became files: notes, boards and PDFs (2026-11-08); On hold and Finished live in the ⋯ menu
  out += filesCard(p);
  return out;
}
// a soft die: a rounded tile with dots, showing a new face after each roll (2026-11-08)
function dieFace() { const n = S.dieN || 5; const P = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [3, 1], [1, 3], [3, 3]], 5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]], 6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]] }[n];
  return `<span class="dief" aria-hidden="true">${P.map(([x, y]) => `<i style="left:${x * 25}%;top:${y * 25}%"></i>`).join('')}</span>`; }
// the wheel's own colours, editable in edit mode (2026-11-09): rim, pin and lights
const WH_DEF = { rim: '#E58F7B', pin: '#F2C14E', bulb: '#FBE3A6' };
const whCol = (k) => (M.settings.wheelCols || {})[k] || WH_DEF[k];
function surprisePage() {
  const pool = M.settings.hobPool || {};
  const dot = (k, l) => `<div class="tg"><span class="l"><span class="hdot" data-col="wh:${k}" role="button" aria-label="Change the ${l.toLowerCase()} colour" style="background:${whCol(k)};width:16px;height:16px;display:inline-block;border-radius:8px;margin-right:10px;vertical-align:-3px;outline:1.5px dashed var(--faint);outline-offset:2px"></span>${l}</span></div>`;
  if (S.edit) return `<div class="card rollcard">${hobWheel()}</div>` + lcard(null, 'Wheel', '', dot('rim', 'Rim') + dot('pin', 'Pin') + dot('bulb', 'Lights')) + hobTabsCard() + lcard(null, 'Surprise me picks from', '', hobIds().map((h) => `<div class="tg"><span class="l"><span class="hdot" data-col="${h}" role="button" aria-label="Change the ${esc(G(h).name)} colour" style="background:${G(h).color};width:16px;height:16px;display:inline-block;border-radius:8px;margin-right:10px;vertical-align:-3px;outline:1.5px dashed var(--faint);outline-offset:2px"></span>${esc(G(h).name)}</span><button class="fbtn hicb" data-ic="${h}" aria-label="Change the icon for ${esc(G(h).name)}" style="color:${mix(G(h).color || '#9A9387', TH.ink, 0.45)}">${icon(G(h).icon || 'star', 18)}</button><button class="swt" role="switch" aria-checked="${pool[h] !== false}" data-a="hobpool" data-v="${h}" aria-label="${esc(G(h).name)}"></button></div>`).join(''));
  const r = S.roll && !S.spinning && suggestion(S.roll);
  return `<div class="card rollcard">${hobWheel()}${r ? `<div class="rollin"><span class="mono" style="color:${r.color}">${esc(r.hobby)}</span><p class="rollt">${esc(r.text)}</p><p class="rolls">${esc(r.sub)}</p><div class="pjbtns" style="justify-content:center"><button class="btn" data-a="hobrollgo">Open</button>${r.go ? `<button class="btn" data-a="projwork" data-ref="${r.go}" aria-pressed="${(G(r.go).worked || []).includes(T0)}">${(G(r.go).worked || []).includes(T0) ? 'Done today' : 'Worked on it'}</button>` : ''}</div></div>` : ''}</div>`;
}
// the spinning wheel (2026-11-08): a slice per hobby in the pool, in its colour with its icon; a tap spins it and it lands on the roll
const wheelHobs = () => { const pool = M.settings.hobPool || {}; return hobIds().filter((h) => pool[h] !== false); };
function hobWheel() { const H = wheelHobs(); if (!H.length) return ''; const n = H.length, A = 360 / n, R = 89, C = 100;
  const pt = (deg, r) => { const t = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(t), C + r * Math.sin(t)]; };
  const win = !S.spinning && S.roll && H.includes(S.roll) ? S.roll : null; // after a spin the winning slice glows and the rest go quiet
  const slices = H.map((h, i) => { const g = G(h), c = g.color || '#B3AC9F'; const dim = win && win !== h; const [x1, y1] = pt(i * A, R), [x2, y2] = pt((i + 1) * A, R); const [ix, iy] = pt(i * A + A / 2, R * 0.64);
    const ic = icon(g.icon || 'star', 22, 1.8).replace('<svg ', `<svg x="${ix - 11}" y="${iy - 11}" `).replace(/stroke="currentColor"/, `stroke="${mix(c, TH.ink, 0.55)}"`);
    const path = n === 1 ? `<circle cx="${C}" cy="${C}" r="${R}" fill="${c}"/>` : `<path d="M${C} ${C}L${x1} ${y1}A${R} ${R} 0 ${A > 180 ? 1 : 0} 1 ${x2} ${y2}Z" fill="${dim ? mix(c, TH.card, 0.64) : c}" stroke="${TH.card}" stroke-width="2.5" stroke-linejoin="round"/>`;
    return `${path}<g transform="rotate(${i * A + A / 2} ${ix} ${iy})"${dim ? ' opacity=".45"' : ''}>${ic}</g>`; }).join('');
  const pinC = whCol('pin'), rimC = whCol('rim'), bulbC = whCol('bulb');
  // the lights sit on a ring that stays still while the wheel inside turns (2026-11-08)
  const nb = 36, RR = 95; const bulbs = Array.from({ length: nb }, (_, i) => { const t = (i * 360 / nb - 90) * Math.PI / 180; return `<circle class="whb${i % 2}" cx="${C + RR * Math.cos(t)}" cy="${C + RR * Math.sin(t)}" r="2.5" fill="${i % 2 ? mix(bulbC, '#FFFFFF', 0.7) : bulbC}"/>`; }).join('');
  return `<div class="whl"><div class="whbtn" role="img" aria-label="Wheel of hobbies, drag it round to spin"><svg class="whsv" viewBox="0 0 200 200" style="transform:rotate(${S.hwRot || 0}deg)">${slices}</svg></div>
    <svg class="whrim" viewBox="0 0 200 200" aria-hidden="true"><circle cx="${C}" cy="${C}" r="${RR}" fill="none" stroke="${mix(rimC, TH.card, 0.12)}" stroke-width="9"/>${bulbs}</svg>
    <span class="whhub" aria-hidden="true" style="background:${pinC};border:2.5px solid ${TH.card}"></span>
    <svg class="whpin" viewBox="0 0 28 44" aria-hidden="true"><path d="M14 40.5C12.2 35 6 21.5 6 10a8 8 0 0 1 16 0c0 11.5-6.2 25-8 30.5z" fill="${pinC}" stroke="${TH.card}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="14" cy="10" r="2.8" fill="${TH.card}"/></svg></div>`; }
// the pin is a flapper: each slice edge that passes flicks it aside, then it springs back; as the wheel slows the flicks get further apart
function pinRun(n) { if (pinRun.on) return; pinRun.on = true; const A = 360 / n; let a = 0, v = 0, last = null, prev = null, t0 = performance.now();
  const ang = (el) => { const m = getComputedStyle(el).transform; if (!m || m === 'none') return 0; const [ma, mb] = m.slice(7, -1).split(',').map(Number); return Math.atan2(mb, ma) * 180 / Math.PI; };
  const step = (now) => { const sv = document.querySelector('.whsv'), pin = document.querySelector('.whpin'); if (!sv || !pin) { pinRun.on = false; return; } const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    const r = ((ang(sv) % 360) + 360) % 360; let dr = prev === null ? 0 : r - prev; if (dr > 180) dr -= 360; if (dr < -180) dr += 360; prev = r;
    // an edge passing gives the pin a push against the turn (no jump), and the spring brings it back smoothly
    const seg = Math.floor(r / A); if (last !== null && seg !== last && dr) v -= Math.sign(dr) * 420; last = seg;
    v += (-170 * a - 14 * v) * dt; a += v * dt; if (Math.abs(a) > 34) { a = Math.sign(a) * 34; v *= 0.3; } pin.style.transform = `rotate(${a}deg)`;
    if (S.spinning || hwDrag || Math.abs(a) > 0.2 || Math.abs(v) > 1) requestAnimationFrame(step); else { pin.style.transform = ''; pinRun.on = false; } };
  requestAnimationFrame(step); }
// spinning by hand (2026-11-08): drag the wheel round; let go with some speed and it spins on, slows down and lands on whatever is under the pin
let hwDrag = null;
const hwAng = (b, ev) => { const r = b.getBoundingClientRect(); return Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
document.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('.whbtn'); if (!b || S.spinning) return; e.preventDefault();
  hwDrag = { b, sv: b.querySelector('.whsv'), prev: hwAng(b, e), last: [[performance.now(), S.hwRot || 0]] }; try { b.setPointerCapture(e.pointerId); } catch (_) {}
  const wl = document.querySelector('.whl'); if (wl) wl.classList.remove('land'); if (S.roll) { S.roll = null; const card = document.querySelector('.rollcard .rollin'); if (card) card.remove(); hwRedim(); }
  pinRun(wheelHobs().length); });
document.addEventListener('pointermove', (e) => { const d = hwDrag; if (!d) return; const a = hwAng(d.b, e); let da = a - d.prev; if (da > 180) da -= 360; if (da < -180) da += 360; d.prev = a;
  S.hwRot = (S.hwRot || 0) + da; d.sv.style.transition = 'none'; d.sv.style.transform = `rotate(${S.hwRot}deg)`; d.last.push([performance.now(), S.hwRot]); if (d.last.length > 6) d.last.shift(); });
const hwEnd = () => { const d = hwDrag; if (!d) return; hwDrag = null; const now = performance.now(); const L = d.last.filter((x) => now - x[0] < 120); const [t0, r0] = L[0] || d.last[d.last.length - 1], [t1, r1] = d.last[d.last.length - 1];
  let v = t1 > t0 ? (r1 - r0) / (t1 - t0) : 0; // degrees per ms
  if (Math.abs(v) < 0.25) return; // a slow push just turns it
  v = Math.sign(v) * Math.min(2.6, Math.max(0.7, Math.abs(v))); S.spinning = true; const wl = document.querySelector('.whl'); if (wl) wl.classList.add('spin'); let tp = performance.now();
  const step = (now) => { const sv = document.querySelector('.whsv'); if (!sv) { S.spinning = false; return; } const dt = Math.min(40, now - tp); tp = now;
    S.hwRot += v * dt; sv.style.transform = `rotate(${S.hwRot}deg)`; v = Math.sign(v) * Math.max(0, Math.abs(v) * Math.pow(0.9988, dt) - 0.00022 * dt);
    if (Math.abs(v) > 0.002) { requestAnimationFrame(step); return; }
    const H = wheelHobs(), A = 360 / H.length; const top = (((-S.hwRot) % 360) + 360) % 360; const h = H[Math.min(H.length - 1, Math.floor(top / A))];
    S.spinning = false; S.roll = h; S.rollPick = rollPick(h); if (S.area === 'hobbies' && S.hob === 'surprise') { render(); const w2 = document.querySelector('.whl'); if (w2) { w2.classList.add('land'); wheelBurst(S.roll); } } };
  requestAnimationFrame(step); };
document.addEventListener('pointerup', hwEnd); document.addEventListener('pointercancel', hwEnd);
// picking a new spin clears the last winner's dimming straight away
function hwRedim() { const sv = document.querySelector('.whsv'); if (!sv) return; const box = document.createElement('div'); box.innerHTML = hobWheel(); const nsv = box.querySelector('.whsv'); if (nsv) sv.innerHTML = nsv.innerHTML; }
function spinTo(h) { const H = wheelHobs(), i = H.indexOf(h); if (i < 0) return; const A = 360 / H.length, ci = i * A + A / 2 + (Math.random() - 0.5) * A * 0.6; const cur = S.hwRot || 0;
  const tgt = cur + 360 * 4 + ((((-ci - cur) % 360) + 360) % 360); S.hwRot = tgt; S.spinning = true; S.roll = h; S.rollPick = rollPick(h); render(); const wl = document.querySelector('.whl'); if (wl) wl.classList.add('spin');
  const sv = document.querySelector('.whsv'); if (!sv) { S.spinning = false; render(); return; } sv.style.transform = `rotate(${cur}deg)`; void sv.getBoundingClientRect();
  sv.style.transition = 'transform 3.2s cubic-bezier(.17,.84,.24,1)'; sv.style.transform = `rotate(${tgt}deg)`;
  pinRun(H.length);
  setTimeout(() => { S.spinning = false; if (S.area === 'hobbies' && S.hob === 'surprise') { render(); const w2 = document.querySelector('.whl'); if (w2) { w2.classList.add('land'); wheelBurst(S.roll); } } }, 3300); }
// a roll picks a hobby I haven't touched for longest more often; it suggests its first open project, else an activity
// a random open project of the hobby, else a random activity, chosen once when the wheel lands (2026-11-08)
// what the wheel can land on: every open project, and every activity no open project covers (the owner, 2026-11-11)
const openProjs = (h) => hobProjs(h).filter((p) => !G(p).hold && !G(p).done);
function rollPool(h) { const P = openProjs(h); const cov = P.map((p) => G(p).act).filter(Boolean); return P.concat(hobActs(h).filter((a) => !cov.includes(a))); }
function rollPick(h) { const L = rollPool(h); return L.length ? L[Math.floor(Math.random() * L.length)] : null; }
function suggestion(h) { if (!G(h)) return null; const g = G(h); const L = rollPool(h); const ld = hobLast(h);
  const pk = L.includes(S.rollPick) ? S.rollPick : L[0]; const pj = pk && G(pk) ? pk : null; const act = pk && I(pk) ? pk : null;
  return { hobby: g.name, color: g.color, text: pj ? 'Work on ' + G(pj).name.toLowerCase() : act ? I(act).name : 'Some ' + g.name.toLowerCase(), sub: ld ? 'Last done ' + agoText(ld) : 'Not done yet', go: pj || null, act }; }
// Worked on it: a project gets today as a day I worked on it, and the activity it covers counts as done today
function projWork(p) { const x = G(p); if (!x) return; const was = (x.worked || []).includes(T0);
  change(() => { if (was) { x.worked = x.worked.filter((d) => d !== T0); if ((x.workAuto === T0 || x.muchAuto === T0) && x.act && M.log[T0]) { delete M.log[T0][x.act]; } delete x.workAuto; if ((x.much || []).includes(T0)) { x.much = x.much.filter((d) => d !== T0); if (x.muchK) delete x.muchK[T0]; } delete x.muchAuto; delete x.prevAct; delete x.muchWork; }
    else { x.worked = (x.worked || []).concat(T0).slice(-400); if (x.act && I(x.act) && !val(T0, x.act)) { (M.log[T0] = M.log[T0] || {})[x.act] = 'done'; x.workAuto = T0; } } }); }
function rollHobby() { const pool = M.settings.hobPool || {}; const H = hobIds().filter((h) => pool[h] !== false && h !== S.roll); if (!H.length) return null;
  const w = H.map((h) => { const ld = hobLast(h); return 1 + (ld ? Math.min(30, diff(ld, T0)) : 30); }); let t = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < H.length; i++) { t -= w[i]; if (t <= 0) return H[i]; } return H[H.length - 1]; }
function hobNewTask(p) { const D = { name: '', type: 'task', kind: 'behaviour', overdo: true, tags: [], made: T0, dur: 30, insight: false, when: { mode: 'once', date: null } };
  openSheet({ kind: 'item', isNew: true, title: 'New task · ' + G(p).name, draft: D, block: eveBlock(), home: p, steps: [] }); }
function hobNewAct(h) { const D = { name: '', type: 'task', kind: 'behaviour', overdo: true, tags: ['t-hobby'], made: T0, dur: 30, when: { mode: 'once', date: null }, icon: G(h).icon };
  openSheet({ kind: 'item', isNew: true, title: 'New activity · ' + G(h).name, draft: D, block: null, home: h, steps: [], hobact: true }); }
function finishedProjects() { return allHobIds().flatMap((h) => hobProjs(h).filter((p) => G(p).done).map((p) => ({ p, h }))).sort((a, b) => G(b.p).done.localeCompare(G(a.p).done)); }
function hobAction(act, a, ref, v) {
  switch (act) {
    case 'hobpick': if (S.hob === v && S.proj) S.proj = null; else { S.hob = v; S.proj = null; } render(); $('#main').scrollTop = 0; return true;
    case 'hobproj': S.proj = ref; render(); $('#main').scrollTop = 0; return true;
    case 'hobact': tick(ref); return true;
    case 'hobnewact': hobNewAct(v); return true;
    case 'hobnewtask': hobNewTask(v); return true;
    case 'hobnewproj': { const id = uid('pj'); change(() => { M.groups[id] = { name: 'New project', style: 'project', kids: [], photos: [] }; G(v).kids.push(id); }, null, false); S.proj = id; render(); openSheet({ kind: 'group', ref: id, title: 'Project', isNew: true }); return true; }
    case 'hobadd': { const id = uid('h'); change(() => { M.groups[id] = { name: 'New hobby', style: 'hobby', color: '#7DBE9A', icon: 'star', kids: [] }; G('g-hobbies').kids.push(id); }, null, false); S.hob = id; S.proj = null; render(); openSheet({ kind: 'group', ref: id, title: 'Hobby', isNew: true }); return true; }
    case 'projhold': { S.menu = false; const x = G(ref); const was = !!x.hold; change(() => { if (was) delete x.hold; else x.hold = true; }, (was ? 'Took ' + x.name + ' off hold' : x.name + ' is on hold')); return true; }
    case 'projdone': { S.menu = false; const x = G(ref); change(() => { x.done = T0; delete x.hold; }, x.name + ' is in the Archive'); S.proj = null; render(); return true; }
    case 'hobarch': { S.menu = false; const x = G(ref); change(() => { x.arch = true; }, 'Archived ' + x.name); S.hob = hobIds()[0] || 'surprise'; S.proj = null; render(); return true; }
    case 'hobback': { const x = G(ref); change(() => { delete x.arch; }, 'Brought back ' + x.name); return true; }
    case 'hobdel': { S.menu = false; const x = G(ref); change(() => { G('g-hobbies').kids = G('g-hobbies').kids.filter((k) => k !== ref); }, 'Deleted ' + x.name); S.hob = hobIds()[0] || 'surprise'; S.proj = null; render(); return true; }
    case 'projback': { const x = G(ref); change(() => { delete x.done; }, 'Brought back ' + x.name); return true; }
    case 'projphrm': { const x = G(ref); change(() => { x.photos = (x.photos || []).filter((q) => q.id !== v); }, 'Photo removed'); if (VW && VW.kind === 'photo') vwPhoto(); return true; }
    case 'hobpool': { change(() => { const P = M.settings.hobPool = M.settings.hobPool || {}; if (P[v] === false) delete P[v]; else P[v] = false; }); return true; }
    case 'projwork': projWork(ref); return true;
    case 'hobroll': { if (S.spinning) return true; const h = rollHobby(); if (!h) { flash('Nothing in the pool'); return true; } spinTo(h); return true; }
    case 'hobrollgo': { const r = suggestion(S.roll); if (!r) return true; S.hob = S.roll; S.proj = r.go; S.roll = null; render(); return true; }
  }
  return fileAction(act, a, ref, v);
}
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'projphoto' && e.target.files && e.target.files[0]) addPhotos(e.target.files, 'proj:' + e.target.dataset.ref); });
// a confetti burst from the wheel when it lands, in the hobby's colour and the palette (2026-11-10)
function wheelBurst(h) { const ph = document.getElementById('phone'), sv = document.querySelector('.whsv'); if (!ph || !sv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const P = ph.getBoundingClientRect(), R = sv.getBoundingClientRect(); const ox = R.left + R.width / 2 - P.left, oy = R.top + R.height / 2 - P.top;
  const fx = document.createElement('div'); fx.className = 'cfx'; ph.appendChild(fx); setTimeout(() => fx.remove(), 2600);
  const hc = (G(h) || {}).color; const cols = PAL.map((x) => x[1]).concat(hc ? [hc, hc, hc] : []);
  for (let i = 0; i < 90; i++) { const p = document.createElement('i'); const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 190, w = 5 + Math.random() * 5;
    p.style.cssText = `left:${ox}px;top:${oy}px;width:${w}px;height:${w * (Math.random() < 0.5 ? 0.45 : 1)}px;background:${cols[i % cols.length]};border-radius:${Math.random() < 0.35 ? '50%' : '1px'}`; fx.appendChild(p);
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 60, sp = (Math.random() - 0.5) * 900;
    p.animate([{ transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${sp / 2}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx * 1.25}px),calc(-50% + ${dy + 260}px)) rotate(${sp}deg)`, opacity: 0 }], { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(.15,.7,.35,1)', fill: 'forwards' }); }
  try { if (navigator.vibrate) navigator.vibrate(12); } catch (_) {} }

// swipe a project to the right to say I worked on it today; again to take it back (the owner, 2026-11-11)
let pws = null;
// swipe right to left on a project or a hobby item: Too much today, again to take it back (2026-11-11)
document.addEventListener('pointerdown', (e) => { if (S.edit || S.sheet || S.area !== 'hobbies' || e.button > 0) return; const row = e.target.closest && e.target.closest('#view .row[data-ref]'); if (!row) return;
  const ref = row.dataset.ref; const proj = row.classList.contains('prow'); if (!proj) return; pws = { row, proj, x: e.clientX, y: e.clientY, on: false, dx: 0 }; });
document.addEventListener('pointermove', (e) => { const w = pws; if (!w) return; const dx = e.clientX - w.x, dy = e.clientY - w.y;
  if (!w.on) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { pws = null; return; } if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4 && dx > 0) { w.on = true; w.row.style.transition = 'none'; } else return; }
  w.dx = Math.max(0, Math.min(110, dx)); w.row.style.transform = `translateX(${w.dx}px)`; });
const pwsEnd = (e) => { const w = pws; pws = null; if (!w || !w.on) return; w.row.style.transition = 'transform .2s'; w.row.style.transform = '';
  if (e.type !== 'pointerup' || Math.abs(w.dx) <= 60) return; suppress = true; setTimeout(() => { suppress = false; }, 300); try { if (navigator.vibrate) navigator.vibrate(8); } catch (_) {}
  if (w.dx > 0) projWork(w.row.dataset.ref); }; // Too much is gone (2026-11-12): only the right swipe on a project, Worked on
function projMuch(p) { const x = G(p); if (!x) return; const on = (x.much || []).includes(T0); const act = x.act && I(x.act) ? x.act : null;
  if (on) { change(() => { x.much = x.much.filter((d) => d !== T0); if (x.muchK) delete x.muchK[T0]; if (x.muchWork === T0) { x.worked = (x.worked || []).filter((d) => d !== T0); if (x.workAuto === T0 && x.act && M.log[T0] && x.muchAuto !== T0) delete M.log[T0][x.act]; delete x.workAuto; } delete x.muchWork;
    if (act && x.muchAuto === T0) { if (x.prevAct === undefined) delete L(T0)[act]; else L(T0)[act] = x.prevAct; } delete x.muchAuto; delete x.prevAct; }, 'Not too much'); return; }
  // Too much on a project also makes its activity too much today, the way working on it ticks the activity (2026-11-11)
  change(() => { x.much = (x.much || []).concat(T0).slice(-400); if (!(x.worked || []).includes(T0)) { x.worked = (x.worked || []).concat(T0).slice(-400); x.muchWork = T0; }
    if (act) { const cur = val(T0, act); if (!String(cur || '').startsWith('much')) { x.prevAct = cur === undefined ? undefined : cur; if (x.prevAct === undefined) delete x.prevAct; L(T0)[act] = 'much'; x.muchAuto = T0; } } });
  openSheet({ kind: 'much', ref: p, title: 'Too much' }); }
function hobMuch(id) { const it = I(id); if (!it) return; const cur = String(val(T0, id) || '');
  if (cur.startsWith('much')) { change(() => { L(T0)[id] = 'done'; }, 'Not too much'); return; }
  change(() => { L(T0)[id] = 'much'; }); openSheet({ kind: 'much', ref: id, title: 'Too much' }); }
document.addEventListener('pointerup', pwsEnd); document.addEventListener('pointercancel', pwsEnd);
