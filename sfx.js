/* Tiny synthesized sound effects (no audio files). Quiet on purpose. */
(() => {
'use strict';
let ctx = null, master = null, muted = false;
try { muted = localStorage.getItem('sb-muted') === '1'; } catch {}
function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : .55; master.connect(ctx.destination); return ctx;
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, ensure, { passive: true }));

function tone(f, d = .18, { type = 'sine', vol = .18, at = 0, to = null, attack = .008 } = {}) {
  if (!ensure() || muted) return; const t = ctx.currentTime + at;
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02);
}
function noise(d = .3, { vol = .12, at = 0, f = 1200, f2 = null, q = .8 } = {}) {
  if (!ensure() || muted) return; const t = ctx.currentTime + at;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * d), ctx.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = buf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(f, t); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + d);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + d * .25); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + d + .02);
}
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };
let stepAlt = false;
const S = {
  tap: () => tone(880, .07, { type: 'triangle', vol: .07 }),
  pop: () => tone(520, .12, { vol: .09, to: 900 }),
  unlock: () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, .5, { type: 'triangle', vol: .11, at: i * .09 })),
  step: () => { stepAlt = !stepAlt; noise(.06, { vol: .05, f: stepAlt ? 900 : 700, q: 2 }); },
  appear: () => [N.G5, N.C6].forEach((f, i) => tone(f, .25, { type: 'sine', vol: .1, at: i * .08 })),
  whoosh: () => noise(.7, { vol: .16, f: 500, f2: 2400, q: .6 }),
  party: () => { noise(.12, { vol: .14, f: 2500, q: .5 }); [N.C6, N.E6, N.G6].forEach((f, i) => tone(f, .35, { type: 'triangle', vol: .07, at: .08 + i * .06 })); },
  sparkle: () => [N.E6, N.G6, N.C6 * 2].forEach((f, i) => tone(f, .3, { type: 'sine', vol: .07, at: i * .07 })),
  sad: () => { tone(N.E5, .25, { type: 'triangle', vol: .08 }); tone(N.C5, .4, { type: 'triangle', vol: .08, at: .18 }); },
  love: () => [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6].forEach((f, i) => tone(f, .45, { type: 'triangle', vol: .09, at: i * .13 })),
  swipe: () => noise(.12, { vol: .05, f: 1800, f2: 900, q: 1.2 }),
};
function play(name) { try { S[name] && S[name](); } catch {} }
function setMuted(m) { muted = m; try { localStorage.setItem('sb-muted', m ? '1' : '0'); } catch {} if (master) master.gain.value = m ? 0 : .55; }
window.SFX = { play, setMuted, get muted() { return muted; } };
})();
