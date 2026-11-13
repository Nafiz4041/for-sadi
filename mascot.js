/* Mascots = real photo heads (decrypted at runtime) on small cartoon bodies.
   Sadi has moods: smile, happy, pout, shy. */
(() => {
'use strict';
const HEAD = { sadi: { x: 22, y: -6, w: 156, h: 184 }, him: { x: 40, y: -10, w: 120, h: 188 } };

function body(kind, { legs = true, uid = kind } = {}) {
  const u = uid;
  if (kind === 'him') return `
<ellipse cx="100" cy="272" rx="44" ry="7" fill="rgba(120,40,70,.18)"/>
${legs ? `<g class="leg leg-l"><rect x="83" y="226" width="14" height="40" rx="6" fill="#3d3a4a"/><ellipse cx="88" cy="267" rx="11" ry="6" fill="#2a2633"/></g>
<g class="leg leg-r"><rect x="103" y="226" width="14" height="40" rx="6" fill="#3d3a4a"/><ellipse cx="112" cy="267" rx="11" ry="6" fill="#2a2633"/></g>` : ''}
<g class="body">
  <path d="M100 160 C72 160 60 170 56 186 L50 240 Q100 250 150 240 L144 186 C140 170 128 160 100 160Z" fill="#fffaf3" stroke="#eadfcf" stroke-width="2"/>
  <path d="M100 166 L100 206" stroke="#e8d9c4" stroke-width="2"/><circle cx="100" cy="182" r="2.6" fill="#e60039"/><circle cx="100" cy="196" r="2.6" fill="#e60039"/>
  <g class="arm arm-l"><path d="M60 178 Q44 200 50 218" stroke="#fffaf3" stroke-width="15" stroke-linecap="round" fill="none"/><circle cx="50" cy="220" r="8" fill="#e2ad86"/></g>
  <g class="arm arm-r"><path d="M140 178 Q156 200 150 218" stroke="#fffaf3" stroke-width="15" stroke-linecap="round" fill="none"/><circle cx="150" cy="220" r="8" fill="#e2ad86"/></g>
</g>`;
  return `
<defs>
  <linearGradient id="${u}dr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa6c9"/><stop offset="1" stop-color="#ff86b4"/></linearGradient>
  <pattern id="${u}dot" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.4" fill="#fff"/><circle cx="12" cy="12" r="2.4" fill="#fff"/></pattern>
</defs>
<ellipse cx="100" cy="272" rx="46" ry="7" fill="rgba(120,40,70,.18)"/>
${legs ? `<g class="leg leg-l"><rect x="83" y="226" width="13" height="40" rx="6" fill="#fff"/><ellipse cx="88" cy="267" rx="11" ry="6" fill="#e60039"/></g>
<g class="leg leg-r"><rect x="104" y="226" width="13" height="40" rx="6" fill="#fff"/><ellipse cx="112" cy="267" rx="11" ry="6" fill="#e60039"/></g>` : ''}
<g class="body">
  <path d="M100 158 C70 158 58 170 52 186 L40 238 Q100 254 160 238 L148 186 C142 170 130 158 100 158Z" fill="url(#${u}dr)"/>
  <path d="M100 158 C70 158 58 170 52 186 L40 238 Q100 254 160 238 L148 186 C142 170 130 158 100 158Z" fill="url(#${u}dot)" opacity=".55"/>
  <path d="M44 226 Q100 242 156 226 L160 238 Q100 254 40 238Z" fill="#fff"/>
  <g transform="translate(100 196)"><path d="M0 0 C-7 -11 -21 -11 -21 0 C-21 11 -7 11 0 0Z M0 0 C7 -11 21 -11 21 0 C21 11 7 11 0 0Z" fill="#e60039"/><circle r="5" fill="#c4002f"/></g>
  <g class="arm arm-l"><path d="M58 178 Q40 200 46 218" stroke="url(#${u}dr)" stroke-width="15" stroke-linecap="round" fill="none"/><circle cx="46" cy="220" r="8" fill="#f3c6a6"/></g>
  <g class="arm arm-r"><path d="M142 178 Q160 200 154 218" stroke="url(#${u}dr)" stroke-width="15" stroke-linecap="round" fill="none"/><circle cx="154" cy="220" r="8" fill="#f3c6a6"/></g>
</g>`;
}

/* decrypted head URLs, by kind + mood */
const heads = {};
function key(kind, mood) { const m = window.SB.data.mascot; return kind === 'him' ? m.him : (m.sadi[mood] || m.sadi.smile); }
function headURL(kind, mood = 'smile') { const k = kind + ':' + mood; return heads[k] || (heads[k] = window.SB.blobURL(key(kind, mood), 'image/png')); }
function preload() { ['smile', 'happy', 'pout', 'shy'].forEach(m => headURL('sadi', m)); headURL('him'); }

/* inline SVG for the page */
function svg(kind, url, opts = {}) {
  const h = HEAD[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -12 200 292" class="mascot-svg">${body(kind, opts)}
<g class="head"><image href="${url}" x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" preserveAspectRatio="xMidYMax meet"/></g></svg>`;
}
async function mount(el, kind, mood = 'smile', opts = {}) { el.innerHTML = svg(kind, await headURL(kind, mood), opts); el.dataset.mood = mood; }
async function mood(el, m) {
  if (!el || el.dataset.mood === m) return; el.dataset.mood = m;
  const url = await headURL('sadi', m), img = el.querySelector('image'); if (!img) return;
  img.setAttribute('href', url);
  const g = el.querySelector('.head'); g.classList.remove('swap'); void g.getBoundingClientRect(); g.classList.add('swap');
  g.addEventListener('animationend', () => g.classList.remove('swap'), { once: true });
}

/* canvas sprites for the game: body (no legs) + head per mood */
const cache = {};
function sprite(kind) {
  if (cache[kind]) return cache[kind];
  const b = new Image();
  b.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="400" height="560">${body(kind, { legs: false, uid: kind + 'g' })}</svg>`);
  const hs = {};
  (kind === 'him' ? ['smile'] : ['smile', 'happy', 'pout', 'shy']).forEach(m => { const i = new Image(); headURL(kind, m).then(u => i.src = u); hs[m] = i; });
  return (cache[kind] = { body: b, heads: hs, box: HEAD[kind] });
}
window.Mascot = { svg, mount, mood, sprite, preload, headURL, HEAD };
})();
