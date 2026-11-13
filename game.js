/* Memory Road: a little walking game. Sadi walks through each year of us; he waits at the end. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const W = 4000, H = 1100;
const CTRL = [[160,600],[560,540],[950,660],[1350,540],[1750,650],[2150,530],[2550,660],[2950,540],[3350,640],[3820,580]];
const STATION_T = [.13, .3, .47, .64, .81];
let built = false, running = false, raf = 0, last = 0, stepT = 0;
let cv, ctx, bg, path = [], lens = [], total = 0;
let girl, boy, stations = [], hearts = [], target = null, popOpen = false, finished = false, zoom = 1, vw = 0, vh = 0, dpr = 1;
const joy = { x: 0, y: 0, active: false };
const keys = {};

/* ---------- path ---------- */
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}
function buildPath() {
  const P = [CTRL[0], ...CTRL, CTRL[CTRL.length - 1]];
  for (let i = 0; i < P.length - 3; i++) for (let s = 0; s < 30; s++) path.push(catmull(P[i], P[i + 1], P[i + 2], P[i + 3], s / 30));
  path.push(CTRL[CTRL.length - 1]);
  lens = [0]; for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  total = lens[lens.length - 1];
}
function at(t) { const d = t * total; let i = lens.findIndex(l => l >= d); if (i <= 0) return path[0].slice(); const f = (d - lens[i - 1]) / (lens[i] - lens[i - 1]);
  return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * f, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * f]; }
function distToPath(x, y) { let m = 1e9; for (let i = 0; i < path.length; i += 2) m = Math.min(m, Math.hypot(path[i][0] - x, path[i][1] - y)); return m; }

/* ---------- seeded random so the world looks the same each time ---------- */
let seed = 1411; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- background ---------- */
function buildBG() {
  bg = document.createElement('canvas'); bg.width = W; bg.height = H; const c = bg.getContext('2d');
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#d4f3cb'); g.addColorStop(1, '#bfe9b5'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { c.fillStyle = rnd() < .5 ? 'rgba(90,170,90,.08)' : 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(rnd() * W, rnd() * H, 20 + rnd() * 60, 10 + rnd() * 30, rnd() * 3, 0, 7); c.fill(); }
  for (let i = 0; i < 2600; i++) { const x = rnd() * W, y = rnd() * H; c.strokeStyle = 'rgba(80,160,80,.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - .5) * 6, y - 6 - rnd() * 6); c.stroke(); }
  // pond
  c.fillStyle = '#bfe6ff'; c.beginPath(); c.ellipse(2050, 930, 200, 100, .1, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; c.beginPath(); c.ellipse(2010, 910, 90, 36, .1, 3.6, 5.2); c.stroke();
  // path
  const line = (w, col, dash) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash || []); c.beginPath(); path.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.setLineDash([]); };
  line(100, '#ff9cc2'); line(84, '#ffe0ec'); line(10, 'rgba(255,255,255,.95)', [2, 26]);
  // flowers
  const FL = ['#ff5c97', '#e60039', '#ffffff', '#ffa6c9', '#ffd23f'];
  for (let i = 0; i < 700; i++) { const x = rnd() * W, y = rnd() * H; if (distToPath(x, y) < 60) continue; const col = FL[Math.floor(rnd() * FL.length)];
    c.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k * 1.256; c.beginPath(); c.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3.2, 0, 7); c.fill(); } c.fillStyle = '#ffe066'; c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); }
  // trees
  const trees = []; for (let i = 0; i < 700 && trees.length < 120; i++) { const x = 60 + rnd() * (W - 120), y = 60 + rnd() * (H - 120);
    if (distToPath(x, y) < 120 || Math.hypot(x - 2050, y - 930) < 240 || trees.some(t => Math.hypot(t[0] - x, t[1] - y) < 90)) continue; trees.push([x, y, 34 + rnd() * 22]); }
  trees.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
    c.fillStyle = 'rgba(120,40,70,.12)'; c.beginPath(); c.ellipse(x, y + 6, r * .9, r * .35, 0, 0, 7); c.fill();
    c.fillStyle = '#b07a5c'; c.fillRect(x - 6, y - r * .6, 12, r * .65);
    const blossom = rnd() < .6;
    (blossom ? [['#ff9cc2', 0, -r * 1.05, r], ['#ffb3cf', -r * .5, -r * .8, r * .7], ['#ffb3cf', r * .5, -r * .8, r * .7], ['#ffd3e4', -r * .15, -r * 1.25, r * .55]] : [['#7fcf7a', 0, -r * 1.05, r], ['#93da8b', -r * .5, -r * .8, r * .7], ['#93da8b', r * .5, -r * .8, r * .7], ['#aee6a3', -r * .15, -r * 1.25, r * .55]]).forEach(([col, dx, dy, rr]) => { c.fillStyle = col; c.beginPath(); c.arc(x + dx, y + dy, rr, 0, 7); c.fill(); });
    if (rnd() < .5) { c.fillStyle = blossom ? '#ffffff' : '#ff5c97'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + (rnd() - .5) * r * 1.2, y - r * (.7 + rnd() * .6), 4, 0, 7); c.fill(); } }
  });
  // start sign
  c.font = '700 26px Quicksand, sans-serif'; c.fillStyle = '#e60039'; c.textAlign = 'center'; c.fillText('Start here  →', CTRL[0][0] + 40, CTRL[0][1] + 84);
}

/* ---------- characters ---------- */
const K = .38; // world px per mascot-SVG unit
let girlMood = 'smile', moodTimer = 0;
function setMood(m, ms) { girlMood = m; clearTimeout(moodTimer); if (ms) moodTimer = setTimeout(() => girlMood = 'smile', ms); }
function drawSprite(c, kind, x, y, ph, moving, dir) {
  const sp = window.Mascot.sprite(kind), bx = sp.box;
  const bob = moving ? -Math.abs(Math.sin(ph)) * 4 : Math.sin(ph / 3) * 1;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(120,40,70,.18)'; c.beginPath(); c.ellipse(0, 0, 20, 7, 0, 0, 7); c.fill();
  const l = moving ? Math.sin(ph) * 5 : 0;
  const legC = kind === 'him' ? '#3d3a4a' : '#ffffff', shoeC = kind === 'him' ? '#2a2633' : '#e60039';
  [[-7, -l], [2, l]].forEach(([lx, off]) => {
    c.fillStyle = legC; c.fillRect(lx, -15 - Math.max(0, off), 5, 15);
    c.fillStyle = shoeC; c.beginPath(); c.ellipse(lx + 2.5, -1 - Math.max(0, off), 4.5, 3, 0, 0, 7); c.fill(); });
  c.translate(0, bob); if (moving) c.rotate(dir * .04);
  if (sp.body.complete) c.drawImage(sp.body, -100 * K, -262 * K, 200 * K, 280 * K);
  const hd = sp.heads[(kind === 'sadi' && girlMood) || 'smile'];
  const head = hd && hd.complete && hd.naturalWidth ? hd : sp.heads.smile;
  if (head.complete && head.naturalWidth) {
    const hb = moving ? Math.sin(ph * 2) * 1.2 : 0, hh = bx.h * K, hw = Math.min(bx.w * K, hh * head.naturalWidth / head.naturalHeight);
    c.drawImage(head, -hw / 2 + (bx.x + bx.w / 2 - 100) * K, (bx.y - 262) * K + hb, hw, hh);
  }
  c.restore();
}
function drawGirl(c, x, y, dir, ph, moving) { drawSprite(c, 'sadi', x, y, ph, moving, dir); }
function drawBow(c) {
  c.fillStyle = '#e60039';
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-10, -16, -30, -16, -30, 0); c.bezierCurveTo(-30, 16, -10, 16, 0, 0); c.fill();
  c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(10, -16, 30, -16, 30, 0); c.bezierCurveTo(30, 16, 10, 16, 0, 0); c.fill();
  c.fillStyle = '#b8002e'; c.beginPath(); c.arc(0, 0, 7, 0, 7); c.fill();
}
function drawBoy(c, x, y, t) {
  c.save(); c.translate(x, y);
  c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.beginPath(); c.moveTo(-70, 0); c.lineTo(-70, -120); c.arc(0, -120, 70, Math.PI, 0); c.lineTo(70, 0); c.stroke();
  const FL = ['#ff5c97', '#e60039', '#ffffff', '#ffa6c9'];
  for (let i = 0; i <= 20; i++) { const a = Math.PI + i / 20 * Math.PI; c.fillStyle = FL[i % 4]; c.beginPath(); c.arc(Math.cos(a) * 70, -120 + Math.sin(a) * 70, 8, 0, 7); c.fill(); }
  for (let i = 0; i < 7; i++) { c.fillStyle = FL[i % 4]; c.beginPath(); c.arc(-70, -110 + i * 17, 7, 0, 7); c.arc(70, -110 + i * 17, 7, 0, 7); c.fill(); }
  c.save(); c.translate(0, -192); c.scale(.9, .9); drawBow(c); c.restore();
  [[-34, -150, '#ff5c97'], [0, -172, '#e60039'], [32, -146, '#ffa6c9']].forEach(([bx, by, col], i) => {
    const sw = Math.sin(t / 600 + i) * 4; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(19, -16); c.quadraticCurveTo(bx, by + 50, bx + sw, by + 14); c.stroke();
    c.fillStyle = col; c.save(); c.translate(bx + sw, by - 10); window.SB.drawHeart(c, 28); c.restore(); });
  c.restore();
  drawSprite(c, 'him', x, y, t / 300, false, 1);
}
function drawStation(c, s, t) {
  const [x, y] = s.pos, pulse = (Math.sin(t / 400 + s.i) + 1) / 2;
  c.save(); c.translate(x, y);
  c.fillStyle = s.visited ? 'rgba(230,0,57,.22)' : `rgba(255,92,151,${.18 + pulse * .2})`;
  c.beginPath(); c.ellipse(0, 0, 52 + pulse * 10, 22 + pulse * 4, 0, 0, 7); c.fill();
  c.fillStyle = '#ffffff'; c.fillRect(-4, -70, 8, 70);
  c.fillStyle = s.visited ? '#e60039' : '#ffffff'; c.strokeStyle = '#ff5c97'; c.lineWidth = 4;
  c.beginPath(); c.roundRect ? c.roundRect(-48, -114, 96, 48, 14) : c.rect(-48, -114, 96, 48); c.fill(); c.stroke();
  c.fillStyle = s.visited ? '#ffffff' : '#e60039'; c.font = '700 27px Quicksand, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s.year, 0, -89);
  c.save(); c.translate(36, -112); c.rotate(.3); c.scale(.6, .6); drawBow(c); c.restore();
  c.fillStyle = s.visited ? '#e60039' : '#ff5c97'; c.save(); c.translate(0, -152 - pulse * 6); window.SB.drawHeart(c, 26); c.restore();
  c.restore();
}

/* ---------- game setup ---------- */
function setup() {
  cv = $('#world'); ctx = cv.getContext('2d');
  buildPath(); buildBG();
  const D = window.SB.data;
  stations = D.years.slice(0, STATION_T.length).map((y, i) => ({ i, year: y.year, data: y, pos: at(STATION_T[i]), visited: false, near: false }));
  boy = { pos: CTRL[CTRL.length - 1].slice(), near: false };
  girl = { x: CTRL[0][0], y: CTRL[0][1] - 10, dir: 1, ph: 0, moving: false };
  const prog = $('#gProg'); prog.innerHTML = stations.map(s => `<i>${s.year}</i>`).join('') + '<i>💗</i>';
  // joystick
  const J = $('#joy'), K = $('#knob'); const R = 46;
  const moveJ = e => { const r = J.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy); if (m > R) { dx *= R / m; dy *= R / m; } joy.x = dx / R; joy.y = dy / R; K.style.transform = `translate(${dx}px,${dy}px)`; };
  J.addEventListener('pointerdown', e => { joy.active = true; target = null; J.setPointerCapture(e.pointerId); moveJ(e); hideHint(); });
  J.addEventListener('pointermove', e => joy.active && moveJ(e));
  const end = () => { joy.active = false; joy.x = joy.y = 0; K.style.transform = ''; };
  J.addEventListener('pointerup', end); J.addEventListener('pointercancel', end);
  // tap to walk
  cv.addEventListener('pointerdown', e => { if (popOpen) return; const cam = camera(); target = [cam[0] + (e.clientX - vw / 2) / zoom, cam[1] + (e.clientY - vh / 2) / zoom]; hideHint(); });
  addEventListener('keydown', e => { if (!running) return; keys[e.key.toLowerCase()] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); hideHint(); });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('resize', size);
  $('#gClose').onclick = close;
  $('#gpBtn').onclick = closePop;
  built = true;
}
function hideHint() { $('#gHint').style.opacity = 0; }
function size() { if (!cv) return; dpr = Math.min(devicePixelRatio || 1, 2); vw = innerWidth; vh = innerHeight; cv.width = vw * dpr; cv.height = vh * dpr;
  zoom = Math.max(1, Math.min(1.7, Math.min(vw, vh) / 360)); }
function camera() { return [girl.x + 60, girl.y - 40]; }

/* ---------- popups ---------- */
function popup({ eyebrow, title, text, photos, btn, big }) {
  popOpen = true; $('#gpYear').textContent = eyebrow; $('#gpTitle').textContent = title; $('#gpText').textContent = text;
  const box = $('#gpPhotos'); box.innerHTML = ''; box.className = 'g-pop-photos' + (big ? ' two' : '');
  photos.forEach(p => { const im = new Image(); im.alt = ''; window.SB.blobURL(big ? p.full : p.thumb).then(u => im.src = u);
    if (!big) im.onclick = () => window.SB.openLBByKey(p.thumb); box.appendChild(im); });
  $('#gpBtn').textContent = btn || 'Keep walking'; $('#gPop').hidden = false; joy.x = joy.y = 0; target = null;
}
function closePop() { $('#gPop').hidden = true; popOpen = false;
  if (finished === 'ending') { finished = true; close(); document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' }); } }
function spread(arr, n) { if (arr.length <= n) return arr; return Array.from({ length: n }, (_, i) => arr[Math.round((i + .5) * arr.length / n - .5)]); }

/* ---------- loop ---------- */
function update(dt, t) {
  let mx = joy.x, my = joy.y;
  if (keys['arrowleft'] || keys['a']) mx = -1; if (keys['arrowright'] || keys['d']) mx = 1;
  if (keys['arrowup'] || keys['w']) my = -1; if (keys['arrowdown'] || keys['s']) my = 1;
  if (!mx && !my && target) { const dx = target[0] - girl.x, dy = target[1] - girl.y, d = Math.hypot(dx, dy); if (d < 8) target = null; else { mx = dx / d; my = dy / d; } }
  if (popOpen) mx = my = 0;
  const m = Math.min(1, Math.hypot(mx, my)); girl.moving = m > .1;
  if (girl.moving) { stepT -= dt; if (stepT <= 0) { stepT = .3; SFX.play('step'); }
    const sp = 280 * m, n = Math.hypot(mx, my); girl.x += mx / n * sp * dt; girl.y += my / n * sp * dt; if (Math.abs(mx) > .15) girl.dir = mx > 0 ? 1 : -1; girl.ph += dt * 14;
    if (Math.random() < dt * 6) hearts.push({ x: girl.x + (Math.random() - .5) * 16, y: girl.y - 30, v: 30 + Math.random() * 30, life: 1, s: 8 + Math.random() * 8, c: Math.random() < .5 ? '#ff5c97' : '#e60039' }); }
  else girl.ph += dt * 3;
  girl.x = Math.max(30, Math.min(W - 30, girl.x)); girl.y = Math.max(80, Math.min(H - 20, girl.y));
  hearts.forEach(h => { h.y -= h.v * dt; h.life -= dt * .8; }); hearts = hearts.filter(h => h.life > 0);
  if (popOpen) return;
  for (const s of stations) {
    const d = Math.hypot(s.pos[0] - girl.x, s.pos[1] - girl.y);
    if (d < 70 && !s.near) { s.near = true; s.visited = true; $('#gProg').children[s.i].classList.add('on');
      window.SB.confetti(60, vw / 2, vh / 2 - 40); SFX.play('sparkle'); setMood('happy', 4000);
      popup({ eyebrow: s.year, title: s.data.title, text: s.data.caption, photos: s.data.photos.some(p => p.g) ? s.data.photos.filter(p => p.g) : spread(s.data.photos, 3) }); return; }
    if (d > 130) s.near = false;
  }
  const db = Math.hypot(boy.pos[0] - girl.x, boy.pos[1] - girl.y);
  if (db < 80 && !boy.near) { boy.near = true;
    const left = stations.filter(s => !s.visited).map(s => s.year);
    if (left.length) { SFX.play('sad'); setMood('pout', 3500); } if (left.length) popup({ eyebrow: 'Wait, my love', title: 'Almost there…', text: `Go visit ${left.join(', ')} first, then come back to me 💗`, photos: [], btn: 'Okay!' });
    else { SFX.play('love'); setMood('shy'); $('#gProg').lastChild.classList.add('on'); for (let i = 0; i < 4; i++) setTimeout(() => window.SB.confetti(120, vw * (.2 + .2 * i), vh * .5), i * 250);
      const D = window.SB.data; finished = 'ending';
      popup({ eyebrow: 'You found me', title: `Happy Birthday, ${D.name} 💗`, text: 'Every road I walk ends with you. I will always be right here, waiting at the end of it.', photos: [D.future[1] || D.future[0]], big: true, btn: 'See all our photos' }); }
  }
  if (db > 150) boy.near = false;
}
function nextTarget() { const s = stations.find(s => !s.visited); return s ? s.pos : boy.pos; }
function render(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, vw, vh);
  const [cx, cy] = camera(), sw = vw / zoom, sh = vh / zoom, sx = cx - sw / 2, sy = cy - sh / 2;
  ctx.fillStyle = '#c8eec0'; ctx.fillRect(0, 0, vw, vh);
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, -sx * dpr * zoom, -sy * dpr * zoom);
  const x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(W, sx + sw), y1 = Math.min(H, sy + sh);
  if (x1 > x0 && y1 > y0) ctx.drawImage(bg, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  const items = [...stations.map(s => ({ y: s.pos[1], d: () => drawStation(ctx, s, t) })), { y: boy.pos[1], d: () => drawBoy(ctx, boy.pos[0], boy.pos[1], t) },
    { y: girl.y, d: () => drawGirl(ctx, girl.x, girl.y, girl.dir, girl.ph, girl.moving) }];
  items.sort((a, b) => a.y - b.y).forEach(i => i.d());
  hearts.forEach(h => { ctx.save(); ctx.globalAlpha = Math.max(0, h.life); ctx.fillStyle = h.c; ctx.translate(h.x, h.y); window.SB.drawHeart(ctx, h.s); ctx.restore(); });
  // guide arrow
  const [tx, ty] = nextTarget(), dx = tx - girl.x, dy = ty - girl.y, d = Math.hypot(dx, dy);
  if (d > 220 && !popOpen) { const a = Math.atan2(dy, dx), r = 52 + Math.sin(t / 250) * 4;
    ctx.save(); ctx.translate(girl.x + Math.cos(a) * r, girl.y - 34 + Math.sin(a) * r); ctx.rotate(a); ctx.fillStyle = '#e60039'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -9); ctx.lineTo(-3, 0); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
}
function loop(t) { if (!running) return; const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; update(dt, t); render(t); raf = requestAnimationFrame(loop); }

function open() {
  if (!window.SB.data) return;
  $('#game').hidden = false; document.body.style.overflow = 'hidden';
  if (!built) setup(); size(); setMood('happy', 2500); running = true; last = performance.now(); raf = requestAnimationFrame(loop);
}
function close() { running = false; cancelAnimationFrame(raf); $('#game').hidden = true; document.body.style.overflow = ''; }
window.Game = { open, close };
})();
