// Wheel of Fortune style spinner: pegs on the rim click past a flexible pointer, and the spin slows to a crawl.
(() => {
  const { $, esc } = CM;
  const COLORS = ['#ffcd75', '#73eff7', '#a7f070', '#ef7d57', '#b13e53', '#41a6f6', '#f4f4f4', '#b4b4ff'];
  const C = 160, R = 140;                       // svg is 320x320
  const DUR = 6000;                             // ms
  const LABEL_END = R - 9, HUB = 28;            // labels end just inside the rim and may not reach the hub

  // Largest font (<= 13px) whose text both fits along the radius and is narrower than the slice where it
  // starts (the inner end is the tightest spot). Press Start 2P is monospace: width = chars * font size.
  // Too long even at 6px: shorten with an ellipsis dot.
  function fitLabel(text, sliceDeg) {
    const half = sliceDeg * Math.PI / 360;
    for (let len = text.length; len >= 1; len--) {
      const t = len < text.length ? text.slice(0, len - 1) + '.' : text;
      for (let fs = 13; fs >= 6; fs--) {
        const inner = LABEL_END - t.length * fs;
        if (inner >= HUB && fs <= 0.78 * 2 * inner * Math.sin(half)) return { t, fs };
      }
    }
    return { t: '.', fs: 6 };
  }
  let rot = 0, raf = 0, blink = null, wheel = null, ptr = null, slices = [], colors = [];

  const pt = (deg, r) => {
    const a = deg * Math.PI / 180;
    return [(C + r * Math.sin(a)).toFixed(2), (C - r * Math.cos(a)).toFixed(2)];
  };

  function build(choices) {
    const n = choices.length, s = 360 / n;
    colors = [];
    let out = `<circle cx="${C}" cy="${C}" r="${R + 14}" fill="#000"/>`;
    for (let i = 0; i < n; i++) {
      let ci = i % COLORS.length;
      if (i === n - 1 && i > 0 && ci === 0) ci = 3;          // avoid matching slice 0 across the seam
      colors.push(COLORS[ci]);
      const [x0, y0] = pt(i * s, R), [x1, y1] = pt((i + 1) * s, R);
      const large = s > 180 ? 1 : 0;
      out += `<path id="ws${i}" d="M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z" fill="${COLORS[ci]}" stroke="#000" stroke-width="3"/>`;
      // Labels hang from the rim and read inward, where a slice is widest.
      const { t: label, fs } = fitLabel(choices[i], s);
      const mid = (i + 0.5) * s;
      out += `<text transform="translate(${C} ${C}) rotate(${mid - 90})" x="${LABEL_END}" y="${(fs * 0.4).toFixed(1)}" text-anchor="end" font-size="${fs}" fill="#000" font-family="'Press Start 2P',monospace" pointer-events="none">${esc(label)}</text>`;
    }
    // pegs on the rim, one at every slice boundary
    for (let i = 0; i < n; i++) {
      const [px, py] = pt(i * s, R + 7);
      out += `<circle cx="${px}" cy="${py}" r="4" fill="#f4f4f4" stroke="#000" stroke-width="2"/>`;
    }
    out += `<circle cx="${C}" cy="${C}" r="18" fill="#000"/><circle cx="${C}" cy="${C}" r="10" fill="#ffcd75"/>`;
    wheel.innerHTML = out;
    slices = [...Array(n).keys()].map(i => $('ws' + i));
  }

  function stopBlink() {
    clearInterval(blink);
    slices.forEach((p, i) => p && p.setAttribute('fill', colors[i]));
  }

  CM.register({
    id: 'wheel', name: 'WHEEL', action: 'SPIN!', hint: 'TAP THE WHEEL TO SPIN',
    mount(stage, ctx) {
      rot = 0;
      stage.innerHTML = `<div id="wheel-wrap" role="button" tabindex="0" aria-label="Spin the wheel">
        <div id="wheel-ptr"></div>
        <svg id="wheel" viewBox="0 0 320 320"></svg></div>`;
      wheel = $('wheel'); ptr = $('wheel-ptr');
      build(ctx.choices);
      const wrap = $('wheel-wrap');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      stopBlink(); cancelAnimationFrame(raf);
      const choices = CM.ctx.choices, n = choices.length, s = 360 / n;
      // Land the middle of slice `idx` (plus jitter that stays inside the slice) under the pointer.
      const target = -((idx + 0.5) * s + (Math.random() - 0.5) * 0.7 * s);
      const from = rot;
      const delta = (((target - from) % 360) + 360) % 360;
      const total = 360 * (6 + CM.randInt(2)) + delta;
      rot = from + total;
      const start = performance.now();
      let lastK = Math.floor(-from / s), flap = 0;
      const step = now => {
        const t = Math.min(1, (now - start) / DUR);
        const e = 1 - Math.pow(1 - t, 4);                       // fast start, long slow crawl
        const angle = from + total * e;
        wheel.style.transform = `rotate(${angle}deg)`;
        const k = Math.floor(-angle / s);                       // a peg just passed the pointer
        if (k !== lastK) {
          lastK = k; flap = 1;
          CM.audio.tick(0.6 + 0.4 * (1 - e), 0.9 + Math.random() * 0.2);
        }
        flap *= 0.8;                                            // flexible pointer springs back
        ptr.style.transform = `translateX(-50%) rotate(${(-flap * 32).toFixed(1)}deg)`;
        if (t < 1) { raf = requestAnimationFrame(step); return; }
        wheel.style.transform = `rotate(${rot}deg)`;
        ptr.style.transform = 'translateX(-50%)';
        CM.audio.chime();
        let flashes = 0;
        blink = setInterval(() => {
          const p = slices[idx];
          if (p) p.setAttribute('fill', flashes % 2 ? colors[idx] : '#ffffff');
          if (++flashes > 6) { clearInterval(blink); if (p) p.setAttribute('fill', colors[idx]); }
        }, 130);
        done('> ' + choices[idx].toUpperCase());
      };
      raf = requestAnimationFrame(step);
    },
    unmount() { cancelAnimationFrame(raf); clearInterval(blink); }
  });
})();
