// Spinner wheel: one slice per choice, fixed pointer at the top.
(() => {
  const { $, esc } = CM;
  const COLORS = ['#ffcd75', '#73eff7', '#a7f070', '#ef7d57', '#b13e53', '#41a6f6', '#f4f4f4', '#b4b4ff'];
  const C = 160, R = 148;                       // svg is 320x320
  let rot = 0, timer = null, wheel = null;

  const pt = (deg, r) => {
    const a = deg * Math.PI / 180;
    return [(C + r * Math.sin(a)).toFixed(2), (C - r * Math.cos(a)).toFixed(2)];
  };

  function build(choices) {
    const n = choices.length, s = 360 / n;
    let out = `<circle cx="${C}" cy="${C}" r="${R + 6}" fill="#000"/>`;
    for (let i = 0; i < n; i++) {
      let ci = i % COLORS.length;
      if (i === n - 1 && i > 0 && ci === 0) ci = 3;          // avoid matching slice 0 across the seam
      const [x0, y0] = pt(i * s, R), [x1, y1] = pt((i + 1) * s, R);
      const large = s > 180 ? 1 : 0;
      out += `<path d="M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z" fill="${COLORS[ci]}" stroke="#000" stroke-width="3"/>`;
      // label runs outward along the slice's middle ray
      let label = choices[i];
      if (label.length > 16) label = label.slice(0, 15) + '.';
      const fs = Math.max(6, Math.min(12, Math.floor(96 / label.length), Math.floor(362 / n)));
      const mid = (i + 0.5) * s;
      out += `<text transform="translate(${C} ${C}) rotate(${mid - 90})" x="${R * 0.2}" y="${fs * 0.35}" font-size="${fs}" fill="#000" font-family="'Press Start 2P',monospace">${esc(label)}</text>`;
    }
    out += `<circle cx="${C}" cy="${C}" r="16" fill="#000"/><circle cx="${C}" cy="${C}" r="9" fill="#ffcd75"/>`;
    wheel.innerHTML = out;
  }

  CM.register({
    id: 'wheel', name: 'WHEEL', action: 'SPIN!', hint: 'TAP THE WHEEL TO SPIN',
    mount(stage, ctx) {
      rot = 0;
      stage.innerHTML = `<div id="wheel-wrap" role="button" tabindex="0" aria-label="Spin the wheel">
        <div id="wheel-ptr"></div>
        <svg id="wheel" viewBox="0 0 320 320"></svg></div>`;
      wheel = $('wheel');
      build(ctx.choices);
      const wrap = $('wheel-wrap');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      const choices = CM.ctx.choices, n = choices.length, s = 360 / n;
      // Put the middle of slice `idx` (plus a little jitter that stays inside the slice) under the pointer.
      const target = -((idx + 0.5) * s + (Math.random() - 0.5) * 0.7 * s);
      const delta = (((target - rot) % 360) + 360) % 360;
      rot += 360 * 5 + delta;
      wheel.style.transition = 'transform 4s cubic-bezier(.12,.6,.12,1)';
      wheel.style.transform = `rotate(${rot}deg)`;
      timer = setTimeout(() => done('> ' + choices[idx].toUpperCase()), 4100);
    },
    unmount() { clearTimeout(timer); }
  });
})();
