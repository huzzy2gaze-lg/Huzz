// Animation timelines for ads2.html. Active with ?anim=1&cues=..&lens=..&dur=..
// cues/lens = start time and length (s) of each voice-over line, so every element lands on its line.
// window.renderAt(t) draws the frame at t seconds (deterministic, for frame-by-frame capture).
(() => {
  const P = new URLSearchParams(location.search);
  if (!P.get('anim')) return;
  const ad = document.getElementById('ad'), LAY = P.get('layout') || 'loc';
  const $ = s => ad.querySelector(s), $$ = s => [...ad.querySelectorAll(s)];
  const cues = P.get('cues').split(',').map(Number), lens = P.get('lens').split(',').map(Number);
  const c = i => cues[i], len = i => lens[i], LAST = cues.length - 1;

  const clamp = v => Math.max(0, Math.min(1, v));
  const E = {
    out: p => 1 - Math.pow(1 - p, 3), out4: p => 1 - Math.pow(1 - p, 4),
    sine: p => -(Math.cos(Math.PI * p) - 1) / 2,
    back: p => { const a = 1.5, b = a + 1; return 1 + b * Math.pow(p - 1, 3) + a * Math.pow(p - 1, 2); },
  };
  const prog = (t, s, d, e = 'out') => E[e](clamp((t - s) / d));
  const lerp = (a, b, p) => a + (b - a) * p;

  const tweens = [], fx = [];
  const tw = (els, start, dur, from, ease = 'out', stagger = 0) =>
    (Array.isArray(els) ? els : [els]).filter(Boolean).forEach((el, i) => tweens.push({ el, start: start + i * stagger, dur, from, ease }));
  const count = (el, start, dur) => {
    if (!el) return; const to = parseFloat(el.dataset.to);
    fx.push(t => { el.textContent = (to * prog(t, start, dur)).toFixed(1); });
  };
  const apply = (el, st) => {
    const tf = [];
    if (st.x || st.y) tf.push(`translate(${st.x || 0}px,${st.y || 0}px)`);
    if (st.s !== undefined && st.s !== 1) tf.push(`scale(${st.s})`);
    if (st.r) tf.push(`rotate(${st.r}deg)`);
    el.style.transform = tf.join(' ');
    el.style.opacity = st.o === undefined || st.o >= 1 ? '' : st.o;
    el.style.clipPath = st.wipe ? `inset(-10% ${st.wipe * 100}% -10% -2%)` : '';
  };

  // ---------- shared: header, eyebrow, call bar ----------
  tw($('.head'), 0.15, 0.8, { o: 0, y: -30 });
  tw($('.eyebrow'), 0.5, 0.7, { o: 0, y: 20 });
  tw($('.foot .bar'), c(LAST) + 0.1, 0.9, { o: 0, y: 140 });
  tw($('.disc'), c(LAST) + 0.9, 0.6, { o: 0 });
  const by = $('.bar .by'), ph = $('.bar .ph svg'), pulseFrom = c(LAST) + 1.4;
  fx.push(t => {
    if (t > pulseFrom) {
      const k = Math.max(0, Math.sin((t - pulseFrom) * Math.PI * 2 / 1.3));
      by.style.transform = `scale(${1 + 0.045 * k})`; by.style.boxShadow = `0 0 ${20 * k}px rgba(176,71,97,.85)`;
      const r = (t - pulseFrom) % 2.6; ph.style.transform = r < 0.6 ? `rotate(${Math.sin(r * 40) * 14}deg)` : '';
    } else { by.style.transform = ''; by.style.boxShadow = ''; ph.style.transform = ''; }
  });

  // ---------- 1. Location ----------
  if (LAY === 'loc') {
    tw($('h1 .l1'), 0.7, 0.8, { o: 0, y: 40 });
    tw($('h1 .l2'), c(0) + len(0) * 0.55, 1.0, { o: 0, wipe: 1 }, 'out4');
    tw($('.map .hills'), 0.3, 1.2, { o: 0, y: 40 });
    const rings = $$('.map .ring'); rings.forEach(r => r.style.transformOrigin = '500px 560px');
    tw(rings.reverse(), 0.6, 1.0, { o: 0, s: 0.3 }, 'out', 0.25);
    tw($('.map .road'), c(1) + len(1) * 0.3, 0.8, { o: 0 });
    tw($('.map .pin'), c(1) + 0.05, 0.75, { o: 0, y: -160 }, 'back');
    tw($('.map .pinlbl'), c(1) + 0.6, 0.6, { o: 0, y: 14 });
    tw($('.map .comsats'), c(1) + len(1) * 0.62, 0.6, { o: 0, s: 0.6 }, 'back');
    const spoke = (id, s) => { const el = $(`.spoke.s-${id}`); fx.push(t => el.style.setProperty('--draw', 1 - prog(t, s, 0.7))); tw($(`.dest.d-${id}`), s + 0.45, 0.55, { o: 0, s: 0.4 }, 'back'); };
    spoke('faiz', c(2) + 0.05);
    spoke('serena', c(2) + len(2) * 0.48);
    spoke('sec', c(2) + len(2) * 0.48 + 0.35);
    tw($('.chip'), c(3), 0.8, { o: 0, y: 50, s: 0.9 }, 'back');
    count($('.chip .cnt'), c(3) + 0.15, 1.1);
  }

  // ---------- 2. Why pay double ----------
  if (LAY === 'dbl') {
    tw($('h1 .l1'), c(0), 0.7, { o: 0, y: 60 });
    tw($('h1 .l2'), c(0) + len(0) * 0.2, 0.7, { o: 0, s: 1.5 }, 'back');
    tw($('.sub'), c(0) + len(0) * 0.7, 0.7, { o: 0, y: 24 });
    tw($('.chart'), c(0) + len(0) * 0.85, 0.6, { o: 0 });
    const them = $('.col.them .fill'), us = $('.col.us .fill');
    fx.push(t => { const p = prog(t, c(1) + 0.25, 1.4); them.style.height = p >= 1 ? '' : `${100 * p}%`; them.style.opacity = p > 0 ? '' : 0; });
    fx.push(t => { const p = prog(t, c(2) + 0.35, 1.1); us.style.height = p >= 1 ? '' : `${48 * p}%`; us.style.opacity = p > 0 ? '' : 0; });
    count($('.col.them .cnt'), c(1) + 0.25, 1.4);
    count($('.col.us .cnt'), c(2) + 0.35, 1.1);
    tw($('.names .them'), c(1) + 0.15, 0.6, { o: 0, y: 16 });
    tw($('.names .us'), c(2) + 0.2, 0.6, { o: 0, y: 16 });
    const big = $('.col.them .big');
    fx.push(t => big.style.setProperty('--strike', prog(t, c(2) + 1.5, 0.5)));
    tw($('.save'), c(3) + 0.05, 0.7, { o: 0, s: 0.6 }, 'back');
    count($('.save .cnt'), c(3) + 0.25, 1.2);
  }

  // ---------- 3. Five reasons ----------
  if (LAY === 'rsn') {
    tw($('h1 .l1'), 0.6, 0.8, { o: 0, y: 40 });
    tw($('h1 .l2'), c(0) + len(0) * 0.45, 1.0, { o: 0, wipe: 1 }, 'out4');
    $$('.rows .row').forEach((row, i) => {
      tw(row, c(i + 1) + 0.02, 0.6, { o: 0, x: -90 });
      tw(row.querySelector('.badge'), c(i + 1) + 0.12, 0.55, { s: 0, r: -120 }, 'back');
    });
  }

  window.renderAt = t => {
    for (const { el, start, dur, from, ease } of tweens) {
      const p = prog(t, start, dur, ease), st = {};
      for (const k in from) st[k] = lerp(from[k], k === 'o' || k === 's' ? 1 : 0, p);
      apply(el, st);
    }
    fx.forEach(f => f(t));
  };
  window.renderAt(0);
})();
