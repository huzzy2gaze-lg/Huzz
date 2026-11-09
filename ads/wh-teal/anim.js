// 15-second animation timeline for the Margalla Sunrise ad (layout C, mountain scene).
// Active only with ?anim=1. Deterministic: window.renderAt(t) draws the frame at t seconds,
// so render-video.js can capture it frame by frame.
(() => {
  if (!new URLSearchParams(location.search).get('anim')) return;
  const ad = document.getElementById('ad');
  const $ = s => ad.querySelector(s), $$ = s => [...ad.querySelectorAll(s)];
  const UR = ad.classList.contains('ur');

  const clamp = v => Math.max(0, Math.min(1, v));
  const E = {
    outCubic: p => 1 - Math.pow(1 - p, 3),
    outQuart: p => 1 - Math.pow(1 - p, 4),
    inOutSine: p => -(Math.cos(Math.PI * p) - 1) / 2,
    outBack: p => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  };
  const lerp = (a, b, p) => a + (b - a) * p;
  const prog = (t, start, dur, ease = 'outCubic') => E[ease](clamp((t - start) / dur));

  // ---- entrance tweens: element goes from `from` to its resting state ----
  const tweens = [];
  const tw = (els, start, dur, from, ease = 'outCubic', stagger = 0) => {
    (Array.isArray(els) ? els : [els]).filter(Boolean).forEach((el, i) =>
      tweens.push({ el, start: start + i * stagger, dur, from, ease }));
  };

  // gold shine strip on the Orchards ticket
  const us = $('.tk.us');
  const shine = document.createElement('div');
  shine.style.cssText = 'position:absolute;top:-20%;bottom:-20%;width:34%;left:0;pointer-events:none;z-index:2;' +
    'background:linear-gradient(100deg,transparent,rgba(255,255,255,.55) 50%,transparent);transform:translateX(-160%) skewX(-18deg)';
  us.style.overflow = 'hidden';
  us.appendChild(shine);

  // count-up target in the savings line
  const saveNum = $$('.saveline .lat').find(e => /3\.8/.test(e.textContent));
  const saveTpl = saveNum ? saveNum.textContent : '';
  if (saveNum) saveNum.style.fontVariantNumeric = 'tabular-nums';

  // ---------------- TIMELINE (seconds) ----------------
  tw($('.lyr-back'), 0.0, 1.8, { y: 260 });
  tw($('.lyr-mid'), 0.2, 1.9, { y: 340 });
  tw($('.lyr-front'), 0.4, 2.0, { y: 460 });
  tw($('.sun'), 0.9, 2.2, { y: 230 }, 'inOutSine');
  tw($('.head'), 0.3, 0.9, { o: 0, y: -30 });
  tw($('.eyebrow'), 1.1, 0.8, { o: 0, y: 24 });
  tw($('.headline .l1'), 1.6, 0.9, { o: 0, y: 44 });
  tw($('.headline .l2'), 2.4, 1.2, { o: 0, wipe: 1 }, 'outQuart');
  tw($('.tk.them'), 3.7, 0.9, { o: 0, x: UR ? 140 : -140 });
  tw($('.arrow'), 5.0, 0.55, { o: 0, s: 0, r: -90 }, 'outBack');
  tw(us, 5.4, 0.9, { o: 0, y: -90, s: 0.88 }, 'outBack');
  tw($('.saveline'), 6.9, 0.8, { o: 0, y: 34 });
  tw($('.checks'), 7.9, 0.5, { o: 0 });
  tw($$('.checks .ck'), 8.0, 0.55, { o: 0, x: UR ? 36 : -36 }, 'outCubic', 0.3);
  tw($$('.checks .ck i'), 8.05, 0.5, { s: 0 }, 'outBack', 0.3);
  tw($('.cta'), 10.2, 0.9, { o: 0, y: 170 });
  tw($('.disc'), 11.0, 0.7, { o: 0 });

  const apply = (el, st) => {
    const tf = [];
    if (st.x || st.y) tf.push(`translate(${st.x || 0}px,${st.y || 0}px)`);
    if (st.s !== undefined && st.s !== 1) tf.push(`scale(${st.s})`);
    if (st.r) tf.push(`rotate(${st.r}deg)`);
    el.style.transform = tf.join(' ');
    el.style.opacity = st.o === undefined ? '' : st.o;
    el.style.clipPath = st.wipe ? (UR ? `inset(0 0 0 ${st.wipe * 100}%)` : `inset(0 ${st.wipe * 100}% 0 0)`) : '';
  };

  window.ANIM_DURATION = 15;
  window.renderAt = t => {
    for (const { el, start, dur, from, ease } of tweens) {
      const p = prog(t, start, dur, ease);
      const st = {};
      for (const k in from) {
        const rest = k === 'o' || k === 's' ? 1 : 0;
        st[k] = lerp(from[k], rest, p);
      }
      if (from.s !== undefined) st.s = lerp(from.s, 1, p);
      apply(el, st);
    }
    // strike-through draws across the old price
    const them = $('.tk.them .big');
    if (them) them.style.setProperty('--strike', prog(t, 4.6, 0.55, 'outCubic'));
    // count-up 0 -> 3.8
    if (saveNum) {
      const v = 3.8 * prog(t, 7.0, 1.3, 'outCubic');
      saveNum.textContent = saveTpl.replace('3.8', v.toFixed(1));
    }
    // shine sweeps across the gold ticket (once on arrival, once in the hold)
    const sw = Math.max(prog(t, 6.2, 0.9, 'inOutSine') * (t < 7.4 ? 1 : 0), prog(t, 12.6, 0.9, 'inOutSine') * (t >= 12.6 ? 1 : 0));
    shine.style.transform = `translateX(${lerp(-160, 420, sw)}%) skewX(-18deg)`;
    // sun glow breathes
    const glow = ad.querySelector('.sun-glow');
    if (glow) glow.setAttribute('r', 190 + 14 * Math.sin(t * 2.2));
    // hold: BOOK NOW pulses, phone icon rings
    const by = $('.cta .by'), ph = $('.cta .ph svg');
    if (t > 11.3) {
      const k = (t - 11.3) * Math.PI * 2 / 1.3;
      if (by) { by.style.transform = `scale(${1 + 0.045 * Math.max(0, Math.sin(k))})`; by.style.boxShadow = `0 0 ${18 * Math.max(0, Math.sin(k))}px rgba(176,71,97,.85)`; }
      const ring = ((t - 11.3) % 2.6) < 0.6 ? Math.sin((t - 11.3) % 2.6 * 40) * 14 : 0;
      if (ph) ph.style.transform = `rotate(${ring}deg)`;
    } else {
      if (by) { by.style.transform = ''; by.style.boxShadow = ''; }
      if (ph) ph.style.transform = '';
    }
  };
  window.renderAt(0);
})();
