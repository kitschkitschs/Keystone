// ---------- the feeling wheel (2026-11-06, replaces Plutchik) ----------
// Colours = the earlier Plutchik colours (2026-11-06): Mad anger, Scared fear, Joyful joy, Powerful anticipation, Peaceful trust, Sad sadness.
// Six core feelings, each with six middle words, each middle word with one outer word, in the reference wheel's order
// (clockwise from the top: Mad, Scared, Joyful, Powerful, Peaceful, Sad). Words are stored lowercase in M.feel[day].
// The wheel sits half cut off at the right edge of the pop-up and spins with a drag; a tap picks a word.
function wheelDef() { return [
  ['Mad', '#D9868B', [['hurt', 'distant'], ['hostile', 'sarcastic'], ['angry', 'frustrated'], ['selfish', 'jealous'], ['hateful', 'irritated'], ['critical', 'skeptical']]],
  ['Scared', '#6FAF86', [['confused', 'bewildered'], ['rejected', 'discouraged'], ['helpless', 'insignificant'], ['submissive', 'inadequate'], ['insecure', 'embarrassed'], ['anxious', 'overwhelmed']]],
  ['Joyful', '#EDBE68', [['excited', 'daring'], ['sensuous', 'fascinating'], ['energetic', 'stimulating'], ['cheerful', 'amused'], ['creative', 'playful'], ['hopeful', 'optimistic']]],
  ['Powerful', '#E9A16C', [['aware', 'surprised'], ['proud', 'successful'], ['respected', 'worthwhile'], ['appreciated', 'valuable'], ['important', 'discerning'], ['faithful', 'confident']]],
  ['Peaceful', '#A9C47F', [['nurturing', 'thankful'], ['trusting', 'secure'], ['loving', 'serene'], ['intimate', 'responsive'], ['thoughtful', 'pensive'], ['content', 'relaxed']]],
  ['Sad', '#7F92AB', [['tired', 'sleepy'], ['bored', 'apathetic'], ['lonely', 'isolated'], ['depressed', 'inferior'], ['ashamed', 'stupid'], ['guilty', 'remorseful']]]]; }
// the feelings set the rest of the app reads: [family, colour, words] with the core word first, then middle, then outer
function wheelSet() { return wheelDef().map(([f, c, ps]) => [f, c, [f.toLowerCase()].concat(ps.map((p) => p[0]), ps.map((p) => p[1]))]); }
// ring of a word: core 3 (strongest colour), middle 2, outer 1 (softest), like the reference's tints
function wheelRing(w) { for (const [f, , ps] of wheelDef()) { if (f.toLowerCase() === w) return 3; if (ps.some((p) => p[0] === w)) return 2; if (ps.some((p) => p[1] === w)) return 1; } return 2; }
const WBG = '#F1E9DA', WASH = { 3: 0.66, 2: 0.76, 1: 0.85 }, // unpicked: a light wash of the family colour, a little stronger toward the centre (2026-11-06)
   WLINE = TH.card; // the grid is the pop-up's own off-white
// the wheel's radius: the whole width of the pop-up, centre on its left edge (2026-11-06)
const WR = 372;
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
function wheelSvg(picked) {
  const R = WR, r1 = Math.round(WR * 0.27), r2 = Math.round(WR * 0.63); const rot = (S.wheelRot ?? 30); const out = [], up = [];
  const pt = (a, r) => { const t = (a - 90) * Math.PI / 180; return [R + r * Math.cos(t), R + r * Math.sin(t)]; };
  const seg = (a0, a1, ri, ro) => { const [x0, y0] = pt(a0, ro), [x1, y1] = pt(a1, ro), [x2, y2] = pt(a1, ri), [x3, y3] = pt(a0, ri); const big = a1 - a0 > 180 ? 1 : 0;
    return ri ? `M${x0} ${y0}A${ro} ${ro} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 ${big} 0 ${x3} ${y3}Z` : `M${R} ${R}L${x0} ${y0}A${ro} ${ro} 0 ${big} 1 ${x1} ${y1}Z`; };
  // rounded wedges (2026-11-06): each wedge is drawn shrunk by WI and then stroked in its own colour with round joins,
  // which gives corners rounded by WI - 1 and an even 2 unit gap of the off-white background between wedges
  const WI = 6; const dg = (x) => x * 180 / Math.PI;
  const rseg = (a0, a1, ri, ro) => { const ro2 = ro - WI, dO = dg(Math.asin(WI / ro2)); const [x0, y0] = pt(a0 + dO, ro2), [x1, y1] = pt(a1 - dO, ro2);
    if (!ri) { const [xa, ya] = pt((a0 + a1) / 2, WI / Math.sin((a1 - a0) / 2 * Math.PI / 180)); return `M${xa} ${ya}L${x0} ${y0}A${ro2} ${ro2} 0 0 1 ${x1} ${y1}Z`; }
    const ri2 = ri + WI, dI = dg(Math.asin(WI / ri2)); const [x2, y2] = pt(a1 - dI, ri2), [x3, y3] = pt(a0 + dI, ri2);
    return `M${x0} ${y0}A${ro2} ${ro2} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${ri2} ${ri2} 0 0 0 ${x3} ${y3}Z`; };
  // a label along the radius; flipped when it would read upside down at the current spin
  const lab = (w, a, rm, size) => { const vis = ((a + rot) % 360 + 360) % 360; const flip = vis > 180; const [x, y] = pt(a, rm);
    return `<text x="${x}" y="${y}" data-a0="${a}" data-f="${flip ? 1 : 0}" transform="rotate(${a - 90 + (flip ? 180 : 0)} ${x} ${y})" font-size="${size}" text-anchor="middle" dominant-baseline="central">${cap(w)}</text>`; };
  wheelDef().forEach(([f, c0, ps], i) => { const a0 = -30 + 60 * i; const core = f.toLowerCase(); const c = feelCol(f, c0);
    // the wheel is off-white; picking a word colours it in its family colour, core strongest, outer softest (2026-11-06)
    const fill = (w, ring) => !picked.includes(w) ? mix(c, WLINE, WASH[ring]) : ring === 3 ? c : ring === 2 ? mix(c, WBG, 0.22) : mix(c, WBG, 0.42);
    // a picked word lifts out of the wheel (2026-11-06): it slides outward a little, in full colour, with a soft shadow, drawn on top
    const g = (w, d, ring, labHtml) => { const on = picked.includes(w);
      out.push(`<g class="ws ${on ? 'on' : ''}" data-w="${w}"><path d="${d}" fill="${fill(w, ring)}" stroke="${fill(w, ring)}" stroke-width="${2 * (WI - 1)}" stroke-linejoin="round"/>${labHtml}</g>`); };
    g(core, rseg(a0, a0 + 60, 0, r1), 3, lab(f, a0 + 30, r1 * 0.58, 15), a0 + 30);
    ps.forEach(([m, o], j) => { const b0 = a0 + 10 * j, b1 = b0 + 10;
      g(m, rseg(b0, b1, r1, r2), 2, lab(m, b0 + 5, (r1 + r2) / 2, 14), b0 + 5);
      g(o, rseg(b0, b1, r2, R), 1, lab(o, b0 + 5, (r2 + R) / 2, 14), b0 + 5); }); });
  // only the right half is drawn (centre on the left edge); the turn happens inside the drawing so it stays sharp
  return `<svg class="wheel" viewBox="${R} -2 ${R + 2} ${2 * R + 4}" preserveAspectRatio="xMinYMid meet" aria-hidden="true"><g class="wrot" transform="rotate(${rot} ${R} ${R})">${out.join('')}${up.join('')}</g></svg>`;
}
// spinning: drag turns the wheel around its centre (with a little glide on release); a tap without a drag picks the word
let wSpin = null;
document.addEventListener('pointerdown', (e) => { const box = e.target.closest && e.target.closest('.wheelbox'); if (!box) return;
  const sv = box.querySelector('.wheel'); const r = sv.getBoundingClientRect(); const cx = r.left, cy = r.top + r.height / 2;
  const ang = (ev) => Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
  wSpin = { sv, cx, cy, ang, a0: ang(e), rot0: (S.wheelRot ?? 30), x: e.clientX, y: e.clientY, moved: false, last: [[performance.now(), (S.wheelRot ?? 30)]], w: e.target.closest('[data-w]') };
  try { box.setPointerCapture(e.pointerId); } catch (_) {} });
document.addEventListener('pointermove', (e) => { if (!wSpin) return; if (Math.hypot(e.clientX - wSpin.x, e.clientY - wSpin.y) > 6) wSpin.moved = true; if (!wSpin.moved) return;
  let d = wSpin.ang(e) - wSpin.a0; S.wheelRot = wSpin.rot0 + d; wheelTurn(wSpin.sv); wheelFlip(wSpin.sv);
  wSpin.last.push([performance.now(), S.wheelRot]); if (wSpin.last.length > 5) wSpin.last.shift(); });
document.addEventListener('pointerup', (e) => { if (!wSpin) return; const w = wSpin; wSpin = null;
  if (!w.moved) { if (w.w) { const v = w.w.dataset.w; change(() => { const ws = (M.feel[T0] || []).slice(); const i = ws.indexOf(v); if (i >= 0) ws.splice(i, 1); else ws.push(v); M.feel[T0] = ws; }); renderLayer(); } return; }
  // glide: keep turning at the release speed, slowing down, then redraw so the labels face the right way
  const [t0, r0] = w.last[0], [t1, r1] = w.last[w.last.length - 1]; let v = t1 > t0 ? (r1 - r0) / (t1 - t0) * 16 : 0; v = Math.max(-25, Math.min(25, v));
  // then it settles on the main wedges, 60° at a time, so exactly three whole ones show on the right (2026-11-06)
  // always on to the next wedge in the direction I pulled, never back (2026-11-06)
  const snapDir = (r, dir) => { const k = (r - 30) / 60; return (dir > 0 ? Math.ceil(k - 1e-6) : dir < 0 ? Math.floor(k + 1e-6) : Math.round(k)) * 60 + 30; }; let tgt = null;
  const step = () => { if (!document.body.contains(w.sv)) return;
    if (tgt === null && Math.abs(v) < 2.5) tgt = snapDir(S.wheelRot, Math.abs(v) > 0.05 ? Math.sign(v) : Math.sign(S.wheelRot - w.rot0));
    if (tgt !== null) { const d = tgt - S.wheelRot; if (Math.abs(d) < 0.05) { S.wheelRot = tgt; renderLayer(); return; } S.wheelRot += d * 0.22; }
    else { S.wheelRot += v; v *= 0.93; }
    wheelTurn(w.sv); wheelFlip(w.sv); requestAnimationFrame(step); };
  requestAnimationFrame(step); });
document.addEventListener('pointercancel', () => { wSpin = null; });
// keep every word the right way up while the wheel turns (2026-11-06): a word on the left half of its turn is turned round
function wheelTurn(sv) { const g = sv.querySelector('.wrot'); if (g) g.setAttribute('transform', `rotate(${S.wheelRot} ${WR} ${WR})`); wheelFlip(sv); }
function wheelFlip(sv) { const rot = (S.wheelRot ?? 30); sv.querySelectorAll('text').forEach((t) => { const a = +t.dataset.a0; const vis = ((a + rot) % 360 + 360) % 360; const f = vis > 180 ? 1 : 0;
  if (+t.dataset.f !== f) { t.dataset.f = f; t.setAttribute('transform', `rotate(${a - 90 + (f ? 180 : 0)} ${t.getAttribute('x')} ${t.getAttribute('y')})`); } }); }
function wheelBlock(ws) {
  const wheelWords = new Set(wheelSet().flatMap((x) => x[2]));
  const picked = ws.filter((w) => wheelWords.has(w));
  const col = (w) => { const f = wheelSet().find((x) => x[2].includes(w)); return f ? stepTone(f[1], wheelRing(w)) : '#9A9387'; };
  // no picked-word tags above the wheel (2026-11-06): the darker wedges show what I picked
  return `<div class="wheelbox" role="group" aria-label="Feeling wheel">${wheelSvg(ws)}</div>`;
}
// my own colour for a wheel family (edit mode › Health › Feelings), else the default
function feelCol(f, def) { const x = ((M.settings || {}).feelings || []).find((y) => y[0] === f); return (x && x[1]) || def; }
// edit mode on the Health page: one row per feeling family with its colour dot (2026-11-06)
function feelColRows() { const fams = wheelDef().map((x) => x[0]); // no Dysregulation colour here (2026-11-06)
  return lcard(null, 'Feelings', null, `` + fams.map((f) => `<div class="tg"><span class="hdot" style="background:${feelCol(f, '#9A9387')};width:14px;height:14px" data-col="fc:${esc(f)}" role="button" aria-label="Change the ${esc(f)} colour"></span><span class="l">${esc(f)}</span></div>`).join('')); }
