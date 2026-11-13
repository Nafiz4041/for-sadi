/* Sadi's birthday — decrypts the photos in the browser and runs the page. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const norm = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '').replace(/qalb/g, 'qulb').replace(/sukun/g, 'sukoon');
const b64 = { to: u => btoa(String.fromCharCode(...new Uint8Array(u))), from: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)) };
const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch {} } };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${MONTHS[+m - 1]} ${y}`; };

let KEY = null, DATA = null;
const urlCache = new Map();

async function decryptBuf(buf) {
  const u = new Uint8Array(buf);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, KEY, u.slice(12));
}
async function blobURL(name, type = 'image/jpeg') {
  if (urlCache.has(name)) return urlCache.get(name);
  const p = fetch(`data/${name}.bin`).then(r => r.arrayBuffer()).then(decryptBuf)
    .then(b => URL.createObjectURL(new Blob([b], { type })));
  urlCache.set(name, p);
  return p;
}
window.SB = { blobURL, fmtDate, get data() { return DATA; } };

/* ---------- LOCK ---------- */
let LOCK;
async function deriveKey(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(pw)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64.from(LOCK.salt), iterations: LOCK.iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}
async function tryKey(k) {
  KEY = k;
  const buf = await fetch('data/m.bin').then(r => r.arrayBuffer());
  DATA = JSON.parse(new TextDecoder().decode(await decryptBuf(buf)));
}
async function initLock() {
  if (!window.crypto || !crypto.subtle) { $('#err').textContent = 'Please open this page over https.'; return; }
  LOCK = await fetch('data/lock.json').then(r => r.json());
  $('#hint').textContent = LOCK.hint ? `Hint: ${LOCK.hint}` : '';
  const saved = ss.get('sb-key');
  if (saved) {
    try { await tryKey(await crypto.subtle.importKey('raw', b64.from(saved), 'AES-GCM', true, ['decrypt'])); return unlock(false); }
    catch { KEY = null; }
  }
  $('#lockForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (!norm($('#pw').value)) { $('#err').textContent = 'Please enter the password 🎀'; SFX.play('sad'); return; }
    const btn = $('#lockForm button'); btn.disabled = true; btn.textContent = '…'; $('#err').textContent = '';
    try {
      const k = await deriveKey($('#pw').value);
      await tryKey(k);
      ss.set('sb-key', b64.to(await crypto.subtle.exportKey('raw', k)));
      unlock(true);
    } catch {
      $('#err').textContent = "That's not it, try again 💗"; SFX.play('sad');
      $('.lock-card').classList.remove('shake'); void $('.lock-card').offsetWidth; $('.lock-card').classList.add('shake');
      btn.disabled = false; btn.textContent = 'Open';
    }
  });
}
function unlock(fromClick) {
  $('#lock').classList.add('gone');
  document.body.classList.remove('locked');
  $('#app').hidden = false;
  setTimeout(() => $('#lock').remove(), 900);
  build();
  SFX.play('unlock');
  const sb = $('#soundBtn'); sb.hidden = false; const paint = () => { sb.textContent = SFX.muted ? '🔇' : '🔊'; sb.classList.toggle('off', SFX.muted); };
  paint(); sb.onclick = () => { SFX.setMuted(!SFX.muted); paint(); };
  if (DATA.music) setupMusic(fromClick);
}

/* ---------- FX: confetti + hearts ---------- */
const fx = $('#fx'), fctx = fx.getContext('2d'); let parts = [], fxRun = false;
function sizeFx() { const d = Math.min(devicePixelRatio || 1, 2); fx.width = innerWidth * d; fx.height = innerHeight * d; fctx.setTransform(d, 0, 0, d, 0, 0); }
sizeFx(); addEventListener('resize', sizeFx);
const COLORS = ['#e60039', '#ff5c97', '#ffa6c9', '#ffffff', '#ffd3e4', '#ffd23f', '#ff86b4'];
function confetti(n = 160, x = innerWidth / 2, y = innerHeight * .55) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, g: .22, life: 120 + Math.random() * 80, t: 0,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .4,
      c: COLORS[i % COLORS.length], heart: Math.random() < .25 });
  }
  if (!fxRun) { fxRun = true; requestAnimationFrame(fxLoop); }
}
window.SB.confetti = confetti;
function drawHeart(c, s) { c.beginPath(); c.moveTo(0, s * .3); c.bezierCurveTo(0, 0, -s * .5, 0, -s * .5, s * .3); c.bezierCurveTo(-s * .5, s * .6, 0, s * .8, 0, s); c.bezierCurveTo(0, s * .8, s * .5, s * .6, s * .5, s * .3); c.bezierCurveTo(s * .5, 0, 0, 0, 0, s * .3); c.fill(); }
window.SB.drawHeart = drawHeart;
function fxLoop() {
  fctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.t < p.life);
  for (const p of parts) {
    p.t++; p.vy += p.g; p.vx *= .99; p.vy *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    fctx.save(); fctx.globalAlpha = Math.max(0, 1 - p.t / p.life); fctx.translate(p.x, p.y); fctx.rotate(p.rot); fctx.fillStyle = p.c;
    if (p.heart) { fctx.translate(0, -8); drawHeart(fctx, 16); } else fctx.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.cos(p.t / 8)) * p.h + 1);
    fctx.restore();
  }
  if (parts.length) requestAnimationFrame(fxLoop); else { fxRun = false; fctx.clearRect(0, 0, innerWidth, innerHeight); }
}

/* ---------- STARS ---------- */
function stars() {
  const c = $('#stars'), x = c.getContext('2d'); let W, H, S = [], hearts = [];
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = c.clientWidth; H = c.clientHeight; c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
    S = Array.from({ length: Math.round(W * H / 4000) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, p: Math.random() * 6 })); };
  size(); addEventListener('resize', size);
  let vis = true; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(c);
  (function loop(t) {
    if (vis) {
      x.clearRect(0, 0, W, H);
      for (const s of S) { x.globalAlpha = .35 + .65 * Math.abs(Math.sin(t / 900 + s.p)); x.fillStyle = '#fff'; x.beginPath(); x.arc(s.x, s.y, s.r * 1.6, 0, 7); x.fill(); }
      if (Math.random() < .06) hearts.push({ x: Math.random() * W, y: H + 20, s: 10 + Math.random() * 18, v: .5 + Math.random(), w: Math.random() * 6, c: ['#ff5c97', '#e60039', '#ffffff', '#ffa6c9'][Math.floor(Math.random() * 4)] });
      hearts = hearts.filter(h => h.y > -40);
      for (const h of hearts) { h.y -= h.v; x.save(); x.globalAlpha = .7; x.fillStyle = h.c; x.translate(h.x + Math.sin(h.y / 40 + h.w) * 12, h.y); drawHeart(x, h.s); x.restore(); }
    }
    requestAnimationFrame(loop);
  })(0);
}

/* ---------- LAZY IMAGES ---------- */
const lazyIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; lazyIO.unobserve(e.target);
  const img = e.target; blobURL(img.dataset.k).then(u => { img.onload = () => img.classList.add('ok'); img.src = u; });
}), { rootMargin: '800px 0px' });
function lazyImg(k, alt = '') { const i = el('img', 'lz'); i.dataset.k = k; i.alt = alt; i.decoding = 'async'; lazyIO.observe(i); return i; }
const revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); if (e.target.classList.contains('year-head')) window.SFX && SFX.play('pop'); } }), { threshold: .15 });

/* ---------- BUILD ---------- */
let ALL = [];
function build() {
  const D = DATA;
  ALL = [];
  D.years.forEach(y => y.photos.forEach(p => ALL.push({ ...p, year: y.year })));
  D.future.forEach(p => ALL.push({ ...p, year: 'Future' }));

  // intro
  $('#herName').textContent = D.name;
  $('#nickEn').textContent = D.nick ? `my ${D.nick}` : '';
  const hb = $('#hb'); 'Happy Birthday'.split('').forEach((ch, i) => { const s = el('span', '', ch === ' ' ? '&nbsp;' : ch); s.style.animationDelay = (.3 + i * .07) + 's'; hb.appendChild(s); });
  requestAnimationFrame(() => ['#herName', '.nick', '#cake'].forEach(s => $(s).classList.add('in')));
  setTimeout(() => confetti(120, innerWidth / 2, innerHeight * .35), 1400);
  stars();
  introScene(D);

  // journey
  const yrs = $('#years');
  const betweens = ['and then came', 'and then', 'still us in', 'and now'];
  D.years.forEach((y, yi) => {
    const sec = el('article', 'year'); sec.id = 'y' + y.year;
    sec.appendChild(el('div', 'year-head reveal', `<div class="year-num">${y.year}</div><div class="year-title">${y.title}</div><p class="year-cap">${y.caption}</p>`));
    const g = el('div', 'polas');
    (y.photos.some(p => p.f) ? y.photos.filter(p => p.f) : pickFeatured(y.photos, 8)).forEach((p, i) => {
      const f = el('figure', 'pola'); f.style.setProperty('--r', ((i * 37 % 11) - 5) + 'deg'); f.style.setProperty('--d', (i % 4) * .08 + 's');
      const ph = el('div', 'ph'); ph.appendChild(lazyImg(p.thumb)); f.appendChild(ph); f.appendChild(el('figcaption', 'd', fmtDate(p.date)));
      f.addEventListener('click', () => openLB(ALL.indexOf(ALL.find(a => a.thumb === p.thumb))));
      g.appendChild(f); revealIO.observe(f);
    });
    sec.appendChild(g); yrs.appendChild(sec);
    if (yi < D.years.length - 1) { const b = el('p', 'between reveal', `<span>${betweens[yi % betweens.length]} ${D.years[yi + 1].year}…</span>`); yrs.appendChild(b); }
  });
  document.querySelectorAll('.reveal').forEach(e => revealIO.observe(e));
  roadScroll();

  // gallery
  const chips = $('#chips'), grid = $('#grid');
  const groups = ['All', ...D.years.map(y => y.year)];
  groups.forEach((gname, i) => { const c = el('button', 'chip' + (i ? '' : ' on'), gname); c.onclick = () => { chips.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); c.classList.add('on'); fillGrid(gname); }; chips.appendChild(c); });
  function fillGrid(f) {
    grid.innerHTML = '';
    ALL.forEach((p, i) => {
      if (p.year === 'Future' || (f !== 'All' && p.year !== f)) return;
      const c = el('div', 'cell'); const im = lazyImg(p.thumb); im.width = 560; im.height = Math.round(560 * p.h / p.w); c.appendChild(im);
      c.appendChild(el('span', '', fmtDate(p.date))); c.onclick = () => openLB(i); grid.appendChild(c); revealIO.observe(c);
    });
  }
  fillGrid('All');

  // ending
  const fut = $('#future');
  D.future.forEach(p => { const f = el('figure'); const im = lazyImg(p.full); im.width = p.w; im.height = p.h; f.appendChild(im); f.onclick = () => openLB(ALL.findIndex(a => a.full === p.full)); fut.appendChild(f); revealIO.observe(f); });
  const L = $('#letter'); D.letter.forEach(t => L.appendChild(el('p', '', t)));
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); [...L.children].forEach((p, i) => setTimeout(() => p.classList.add('in'), 400 + i * 900)); } }, { threshold: .3 }).observe(L);
  $('#yellow').appendChild(lazyImg(D.yellow.full, 'You are my yellow'));
  $('#finaleTitle').textContent = `Happy Birthday, ${D.nick || D.name} 💗`;
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); confetti(220, innerWidth / 2, innerHeight * .6); SFX.play('love'); } }, { threshold: .6 }).observe($('.finale'));

  $('#playBtn').onclick = () => { SFX.play('tap'); window.Game && window.Game.open(); };
  const duo = $('#duoSadi');
  Mascot.mount(duo, 'sadi', 'smile', { uid: 'd1' }); Mascot.mount($('#duoHim'), 'him', 'smile', { uid: 'd2' });
  new IntersectionObserver(es => { Mascot.mood(duo, es[0].isIntersecting ? 'happy' : 'smile'); }, { threshold: .6 }).observe(duo);
  const fin = $('#finSadi');
  Mascot.mount(fin, 'sadi', 'smile', { uid: 'f1' }); Mascot.mount($('#finHim'), 'him', 'smile', { uid: 'f2' });
  new IntersectionObserver(es => { if (es[0].isIntersecting) setTimeout(() => Mascot.mood(fin, 'shy'), 900); }, { threshold: .7 }).observe(fin);
  $('#againBtn').onclick = () => { confetti(260); SFX.play('party'); Mascot.mood(fin, 'happy'); setTimeout(() => Mascot.mood(fin, 'shy'), 2500); };
  // little Sadi travelling down the journey road
  Mascot.headURL('sadi', 'smile').then(u => $('.traveler').style.backgroundImage = `url(${u})`);
  document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => b.id !== 'blowBtn' && b.id !== 'againBtn' && b.id !== 'playBtn' && SFX.play('tap')));
}
/* Sadi walks in (smiling), gets excited at the cake, pouts to blow, then laughs */
async function introScene(D) {
  const m = $('#mascot'), cake = $('#cake'), btn = $('#blowBtn'), msg = $('#tapMsg');
  Mascot.preload();
  await Mascot.mount(m, 'sadi', 'smile', { uid: 'im' });
  await new Promise(r => setTimeout(r, 1500));
  m.classList.add('walking'); msg.textContent = 'Look who is here… 🎀';
  const steps = setInterval(() => SFX.play('step'), 320);
  m.addEventListener('animationend', function arrived(e) {
    if (e.animationName !== 'walkin') return; m.removeEventListener('animationend', arrived); clearInterval(steps);
    m.classList.remove('walking'); m.classList.add('here'); Mascot.mood(m, 'happy');
    msg.textContent = 'Your cake is ready, birthday girl!'; btn.classList.add("show"); SFX.play('appear');
  });
  let done = false;
  const blow = () => {
    if (done || !m.classList.contains('here')) return; done = true; btn.classList.remove("show"); msg.textContent = '';
    Mascot.mood(m, 'pout'); m.classList.add('blowing'); $('#wind').classList.add('go'); SFX.play('whoosh');
    setTimeout(() => { cake.classList.add('out'); const r = cake.getBoundingClientRect(); confetti(240, r.left + r.width / 2, r.top + 20); SFX.play('party'); }, 450);
    setTimeout(() => { m.classList.remove('blowing'); m.classList.add('hop'); Mascot.mood(m, 'happy'); msg.textContent = 'Now make a wish ✨'; }, 1000);
    setTimeout(() => Mascot.mood(m, 'shy'), 3200);
    setTimeout(() => $('#scrollCue').classList.add('in'), 1800);
  };
  btn.addEventListener('click', blow); cake.addEventListener('click', blow);
  cake.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') blow(); });
}
function pickFeatured(arr, n) {
  if (arr.length <= n) return arr;
  const out = []; for (let i = 0; i < n; i++) out.push(arr[Math.round(i * (arr.length - 1) / (n - 1))]); return out;
}
function roadScroll() {
  const j = $('#journey'), road = $('.road'), fill = $('.road-fill'), tr = $('.traveler');
  let ticking = false;
  const upd = () => { ticking = false; const r = road.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight * .6 - r.top) / r.height));
    fill.style.height = (p * 100) + '%'; tr.style.top = (p * 100) + '%'; const done = p > .97; if (done !== tr._done) { tr._done = done; Mascot.headURL('sadi', done ? 'happy' : 'smile').then(u => tr.style.backgroundImage = `url(${u})`); } };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true }); upd();
}

/* ---------- LIGHTBOX ---------- */
let lbI = 0;
const lb = $('#lb'), lbImg = $('#lbImg');
async function showLB(i) {
  if (!lb.hidden && i !== lbI) SFX.play('swipe');
  lbI = (i + ALL.length) % ALL.length; const p = ALL[lbI];
  $('#lbCap').textContent = p.year === 'Future' ? 'Our future 💍' : fmtDate(p.date);
  lbImg.style.opacity = .4; lbImg.src = await blobURL(p.thumb);
  const full = await blobURL(p.full); if (ALL[lbI] === p) { lbImg.src = full; lbImg.style.opacity = 1; }
  blobURL(ALL[(lbI + 1) % ALL.length].full);
}
function openLB(i) { if (i < 0) return; lb.hidden = false; document.body.style.overflow = 'hidden'; showLB(i); }
function closeLB() { lb.hidden = true; if ($("#game").hidden) document.body.style.overflow = ""; }
window.SB.openLBByKey = k => openLB(ALL.findIndex(a => a.thumb === k));
$('#lbClose').onclick = closeLB; $('#lbPrev').onclick = () => showLB(lbI - 1); $('#lbNext').onclick = () => showLB(lbI + 1);
lb.addEventListener('click', e => { if (e.target === lb || e.target.id === 'lbStage') closeLB(); });
addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') closeLB(); if (e.key === 'ArrowRight') showLB(lbI + 1); if (e.key === 'ArrowLeft') showLB(lbI - 1); });
let sx = null, sy = 0;
lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
lb.addEventListener('touchmove', e => { if (sx == null) return; lbImg.style.transform = `translateX(${e.touches[0].clientX - sx}px)`; }, { passive: true });
lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; lbImg.style.transform = '';
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) showLB(lbI + (dx < 0 ? 1 : -1)); else if (dy > 120) closeLB(); sx = null; });

/* ---------- MUSIC ---------- */
async function setupMusic(autoplay) {
  const btn = $('#musicBtn'); const a = new Audio(await blobURL(DATA.music, 'audio/mpeg')); a.loop = true; a.volume = .6;
  btn.hidden = false; btn.classList.add('off');
  const play = () => a.play().then(() => btn.classList.remove('off')).catch(() => {});
  btn.onclick = () => a.paused ? play() : (a.pause(), btn.classList.add('off'));
  if (autoplay) play(); else addEventListener('pointerdown', play, { once: true });
  window.SB.audio = a;
}

initLock().catch(e => { $('#err').textContent = 'Could not load. Check your connection.'; console.error(e); });
})();
