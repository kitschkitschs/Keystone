// ===================== Shopping list (2026-11-09) =====================
// Part of Home with its own button on the landing. Items are plain lines (M.shop), not tasks, so they never show on Today.
// The + sheet adds to it from anywhere. Copy gives the open items as a tidy text list to paste in a message.
function shMigrate(m) { m.shop = Array.isArray(m.shop) ? m.shop : []; m.shopLists = Array.isArray(m.shopLists) && m.shopLists.length ? m.shopLists : [{ id: 'sl-main', name: 'To get' }]; m.shop.forEach((x) => { if (!m.shopLists.some((l) => l.id === x.list)) x.list = m.shopLists[0].id; }); m.pages = m.pages || {}; m.pages.shopping = m.pages.shopping || { name: 'Shopping list', color: '#EDBB3A' }; }
// a number in the text is the amount (2026-11-26): "eggs 2", "2 eggs", "2x eggs", "eggs x2" all become 2x Eggs
function shopParse(t) { t = (t || '').replace(/\s+/g, ' ').trim(); let q = null;
  const m = t.match(/(?:^|\s)(?:x\s?)?(\d+(?:[.,]\d+)?)(?:\s?x)?(?=\s|$)/i);
  if (m) { const rest = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim(); if (rest) { q = m[1].replace(',', '.'); t = rest; } }
  return { name: t.replace(/^./, (c) => c.toUpperCase()), qty: q }; }
const shopLabel = (x) => (x.qty ? x.qty + 'x ' : '') + x.name;
const shopOpen = () => (M.shop || []).filter((x) => !x.got);
const shopGot = () => (M.shop || []).filter((x) => x.got);
const shopLists = () => M.shopLists || [];
const shopIn = (lid) => shopOpen().filter((x) => x.list === lid);
const shopCur = () => (shopLists().find((l) => l.id === S.shopList) || shopLists()[0] || {}).id;
// several lists with something in them: each gets its name as a heading (2026-11-11)
const shopText = () => { const L = shopLists().filter((l) => shopIn(l.id).length); const lines = (l) => shopIn(l.id).map((x) => '• ' + shopLabel(x)).join('\n'); return L.length > 1 ? L.map((l) => l.name + ':\n' + lines(l)).join('\n\n') : L.map(lines).join(''); };
// the landing card: a small, simple version of the other Home cards (2026-11-09): the name and how many to get
function shopBtn() { const n = shopOpen().length;
  return `<button class="vcard vmini shopcard" data-a="vgo" data-v="shopping"><span class="mono">Shopping list</span><span class="vchev" aria-hidden="true">${icon('chevron-right', 16)}</span><span class="vword">${n ? n + ' to get' : 'Nothing to get'}</span></button>`; } // neutral, not a verdict colour (2026-11-09)
function shopRow(x) {
  return `<div class="row${x.got ? ' shgot' : ''}"><button class="tickbtn" data-a="shoptick" data-v="${x.id}" aria-label="${x.got ? 'Put ' + esc(x.name) + ' back on the list' : 'Got ' + esc(x.name)}" aria-pressed="${!!x.got}"><span class="circ ${x.got ? 'done' : ''}" style="--c:var(--faint)">${x.got ? '✓' : ''}</span></button>${S.shopEdit === x.id ? `<input class="lbl shname" id="shed-${x.id}" value="${esc(shopLabel(x))}" enterkeyhint="done" autocomplete="off" aria-label="Name">` : `<button class="lbl" data-a="shopname" data-v="${x.id}" style="text-align:left" aria-label="Rename ${esc(shopLabel(x))}">${x.qty ? `<span class="shqty">${esc(x.qty)}x</span>` : ''}${esc(x.name)}</button>`}${S.edit ? `<button class="hb" data-a="shopdel" data-v="${x.id}" aria-label="Delete ${esc(x.name)}">${icon('x', 18)}</button>` : ''}</div>`; }
const shopInput = (id, ph) => `<div class="addrow condadd"><button class="plus" data-a="shopadd" data-v="${id}" aria-label="Add to the list">+</button><input id="${id}" placeholder="${ph}" enterkeyhint="enter" autocomplete="off"></div>`;
function shopListCard(l) { const O = shopIn(l.id), fid = 'shop-' + l.id;
  const hd = S.edit ? `<button class="nm mono" data-a="shoplistedit" data-v="${l.id}" style="flex:1;text-align:left;min-height:44px;border-bottom:1px dashed var(--quiet)" aria-label="Rename ${esc(l.name)}">${esc(l.name)}</button>${shopLists().length > 1 ? `<button class="hb" data-a="shoplistdel" data-v="${l.id}" aria-label="Delete the list ${esc(l.name)}">${icon('x', 18)}</button>` : ''}` : `<span class="nm mono" style="flex:1">${esc(l.name)}</span><span class="cnt">${O.length || ''}</span>`;
  // every list has its own add row under it (2026-11-11)
  const add = addOpen(fid) ? shopInput(fid, 'Add') : `<button class="addrow" data-a="openadd" data-v="${fid}"><span class="plus" aria-hidden="true">+</span>Add</button>`;
  return `<section class="card lcard" style="margin-bottom:12px"><div class="bhead">${hd}</div><div class="list">${O.map(shopRow).join('')}${add}</div></section>`; }
function shopPage() {
  const D = shopGot();
  const tools = `<button class="fbtn" data-a="shopcopy" aria-label="Copy the list">${icon('copy', 18)}</button>`;
  let h = crumbs([['Home', ''], ['Shopping list']]).replace(/<\/nav>$/, `<span class="crtools">${tools}</span></nav>`);
  h += `<div style="margin-top:14px">` + shopLists().map(shopListCard).join('') + '</div>';
  if (D.length) h += sect('shop:got', 'Got', String(D.length), `<div class="card lcard"><div class="list">${D.map(shopRow).join('')}</div></div><button class="btn soft shopcopy" data-a="shopclear">Clear what I got</button>`);
  return h;
}
function shopSheet() { const L = shopLists(), cur = shopCur(), O = shopIn(cur);
  const pick = L.length > 1 ? `<div class="seg" style="margin-bottom:8px">${L.map((l) => `<button class="chip${l.id === cur ? ' on' : ''}" data-a="shoplistpick" data-v="${l.id}" aria-pressed="${l.id === cur}">${esc(l.name)}</button>`).join('')}</div>` : '';
  return pick + shopInput('shopq', 'Add something to get').replace('<input', '<input data-autofocus') + (O.length ? `<div class="list" style="margin-top:6px">${O.map(shopRow).join('')}</div>` : '<p class="empty">Nothing on the list yet.</p>'); }
function shopListSheet(s) { const l = shopLists().find((x) => x.id === s.id);
  return `<div class="fld"><span class="mono">Name</span><input class="inp" id="shlname" data-autofocus value="${esc(l ? l.name : '')}" enterkeyhint="done" autocomplete="off"></div><button class="btn dark" data-a="shoplistsave" style="width:100%;margin-top:12px">Save</button>`; }
function shopListSave() { const f = document.getElementById('shlname'); const name = f && f.value.replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase()); if (!name) { flash('Write a name first'); if (f) f.focus(); return; }
  const id = S.sheet && S.sheet.id, l = shopLists().find((x) => x.id === id);
  if (shopLists().some((x) => x !== l && x.name.toLowerCase() === name.toLowerCase())) { flash('I already have a list called ' + name); return; }
  S.sheet = null; let nid = null;
  change(() => { if (l) l.name = name; else { nid = uid('sl'); M.shopLists.push({ id: nid, name }); } }, (l ? 'Renamed list ' : 'Added list ') + name);
  if (nid) { S.area = 'home'; S.page = 'shopping'; S.openAdd = 'shop-' + nid; render(); const el = document.getElementById('shop-' + nid); if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } } }
function shopAdd(fid) { const f = document.getElementById(fid); const P = shopParse(f && f.value), name = P.name; if (!name) { if (f) f.focus(); return; }
  const lid = fid.indexOf('shop-') === 0 && shopLists().some((l) => l.id === fid.slice(5)) ? fid.slice(5) : shopCur();
  const same = (M.shop || []).find((x) => x.list === lid && x.name.toLowerCase() === name.toLowerCase());
  if (same && !same.got && P.qty && P.qty !== same.qty) { f.value = ''; change(() => { same.qty = P.qty; }, 'Now ' + shopLabel(same)); const g = document.getElementById(fid); if (g) g.focus(); return; }
  if (same && !same.got) { f.value = ''; flash(same.name + ' is already on the list'); const g = document.getElementById(fid); if (g) g.focus(); return; }
  change(() => { if (same) { same.got = false; same.qty = P.qty || undefined; } else M.shop.push(Object.assign({ id: uid('sh'), name, list: lid }, P.qty ? { qty: P.qty } : {})); }, 'Added ' + name);
  const g = document.getElementById(fid); if (g) g.focus(); }
// tap a name to rename it in place; only the tick box ticks (2026-11-26). Enter or tapping away saves, Escape leaves it as it was.
function shopNameOpen(id) { S.shopEdit = id; render(); const f = document.getElementById('shed-' + id); if (f) { f.focus(); const n = f.value.length; f.setSelectionRange(n, n); } }
function shopRename(id, keep) { if (S.shopEdit !== id) return; S.shopEdit = null; const x = (M.shop || []).find((s) => s.id === id), f = document.getElementById('shed-' + id);
  const P = !keep && f ? shopParse(f.value) : { name: '' }, name = P.name;
  if (!x || !name || (name === x.name && (P.qty || null) === (x.qty || null))) { render(); return; }
  const same = M.shop.find((s) => s !== x && s.list === x.list && !s.got && s.name.toLowerCase() === name.toLowerCase());
  if (same && !x.got) { flash(same.name + ' is already on the list'); render(); return; }
  change(() => { x.name = name; if (P.qty) x.qty = P.qty; else delete x.qty; }, 'Renamed ' + name); }
// copy as text: the clipboard where allowed, the old way if not, and as a last resort the text in a box to copy by hand
async function shopCopy() { const t = shopText(); if (!t) { flash('Nothing on the list to copy'); return; }
  try { await navigator.clipboard.writeText(t); return; /* no copied note, the phone shows its own (2026-11-24) */ } catch (e) {}
  try { const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); if (ok) return; } catch (e) {}
  openSheet({ kind: 'shoptext', title: 'Copy the list' }); const ta = document.getElementById('shoptxt'); if (ta) { ta.focus(); ta.select(); } }
function shopAction(act, a, ref, v) {
  switch (act) {
    case 'shopnew': openSheet({ kind: 'shop', title: 'Shopping list' }); return true;
    case 'shopname': shopNameOpen(v); return true;
    case 'shopadd': shopAdd(v || 'shopq'); return true;
    case 'shoplistpick': S.shopList = v; render(); { const el = document.getElementById('shopq'); if (el) el.focus(); } return true;
    case 'shoplistnew': openSheet({ kind: 'shoplist', title: 'New list' }); return true;
    case 'shoplistedit': openSheet({ kind: 'shoplist', title: 'Rename list', id: v }); return true;
    case 'shoplistsave': shopListSave(); return true;
    case 'shoplistdel': { const l = shopLists().find((x) => x.id === v); if (!l || shopLists().length < 2) return true; change(() => { M.shopLists = M.shopLists.filter((x) => x !== l); M.shop = M.shop.filter((x) => x.list !== l.id); }, 'Deleted list ' + l.name); return true; }
    case 'shoptick': { const x = M.shop.find((s) => s.id === v); if (!x) return true; change(() => { x.got = !x.got; }, (x.got ? 'Back on the list: ' : 'Got ') + x.name); return true; }
    case 'shopdel': { const x = M.shop.find((s) => s.id === v); if (!x) return true; change(() => { M.shop = M.shop.filter((s) => s !== x); }, 'Deleted ' + x.name); return true; }
    case 'shopclear': { const n = shopGot().length; change(() => { M.shop = shopOpen(); }, 'Cleared ' + n + (n === 1 ? ' item' : ' items')); return true; }
    case 'shopcopy': shopCopy(); return true;
  }
  return false;
}
