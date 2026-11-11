// Marble race: one marble per choice, one lane each. The winner is decided first; every marble has a scripted
// "progress" curve (with wobble so the lead changes) and the winner's curve reaches the line strictly first.
(() => {
  const { $, esc, randInt } = CM;
  const COLORS = ['#ef7d57', '#73eff7', '#ffcd75', '#a7f070', '#b4b4ff', '#41a6f6', '#b13e53', '#f4f4f4'];
  const W = 320, LBL = 84, FIN = 304, TOPY = 26, T_WIN = 5200;
  let raf = 0, timers = [], svg = null, marbles = [], lanes = [], lh = 0, mr = 0;

  const fitName = (text, fs) => {
    const maxc = Math.floor(76 / fs);
    return text.length > maxc ? text.slice(0, maxc - 1) + '.' : text;
  };

  function build(choices) {
    const n = choices.length;
    lh = Math.max(15, Math.min(36, Math.floor(300 / n)));
    mr = Math.max(4.5, lh * 0.34);
    const H = TOPY + n * lh + 22;
    let o = `<rect width="${W}" height="${H}" fill="#1a1c2c"/>`;
    for (let i = 0; i < n; i++) {
      const y = TOPY + i * lh;
      o += `<rect x="${LBL}" y="${y}" width="${FIN - LBL + 6}" height="${lh}" fill="${i % 2 ? '#2a2f4a' : '#222640'}"/>`;
      o += `<rect id="ln${i}" x="0" y="${y}" width="${W}" height="${lh}" fill="#ffcd75" opacity="0"/>`;
      const fs = Math.min(9, lh - 6);
      o += `<text x="4" y="${y + lh / 2 + fs * 0.4}" font-size="${fs}" fill="#f4f4f4" font-family="'Press Start 2P',monospace">${esc(fitName(choices[i], fs))}</text>`;
    }
    o += `<rect x="${LBL}" y="${TOPY - 4}" width="3" height="${n * lh + 8}" fill="#f4f4f4"/>`;     // start line
    // checkered finish
    const rows = Math.ceil(n * lh / 8);
    for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) {
      o += `<rect x="${FIN + 2 + c * 6}" y="${TOPY + r * 8}" width="6" height="8" fill="${(r + c) % 2 ? '#f4f4f4' : '#000'}"/>`;
    }
    o += `<text x="${(LBL + FIN) / 2}" y="14" text-anchor="middle" font-size="8" fill="#ffcd75" font-family="'Press Start 2P',monospace" id="mb-msg">READY?</text>`;
    for (let i = 0; i < n; i++) {
      const y = TOPY + i * lh + lh / 2;
      o += `<g id="mb${i}" transform="translate(${LBL + mr + 4} ${y})"><circle r="${mr}" fill="${COLORS[i % COLORS.length]}" stroke="#000" stroke-width="1.5"/>` +
        `<g class="spin"><rect x="${-mr * 0.12}" y="${-mr * 0.8}" width="${mr * 0.24}" height="${mr * 1.6}" fill="rgba(0,0,0,.35)"/></g>` +
        `<circle cx="${-mr * 0.35}" cy="${-mr * 0.35}" r="${Math.max(1, mr * 0.22)}" fill="#fff" opacity=".8"/></g>`;
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = o;
    marbles = [...Array(n).keys()].map(i => $('mb' + i));
    lanes = [...Array(n).keys()].map(i => $('ln' + i));
  }

  const xAt = p => LBL + mr + 4 + (FIN - LBL - 2 * mr - 8) * p;
  function place(i, p) {
    const y = TOPY + i * lh + lh / 2, x = xAt(p), m = marbles[i];
    m.setAttribute('transform', `translate(${x.toFixed(1)} ${y})`);
    m.querySelector('.spin').setAttribute('transform', `rotate(${((x - LBL) / mr * 57.3).toFixed(0)})`);
  }

  CM.register({
    id: 'marbles', name: 'MARBLES', action: 'RACE!', hint: 'TAP THE TRACK TO START THE RACE',
    mount(stage, ctx) {
      stage.innerHTML = `<div id="marbles-wrap" role="button" tabindex="0" aria-label="Start the race"><svg id="marbles-svg" shape-rendering="crispEdges"></svg></div>`;
      svg = $('marbles-svg');
      build(ctx.choices);
      marbles.forEach((_, i) => place(i, 0));
      const wrap = $('marbles-wrap');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = [];
      const choices = CM.ctx.choices, n = choices.length, msg = $('mb-msg');
      lanes.forEach(l => l.setAttribute('opacity', '0'));
      marbles.forEach((m, i) => { place(i, 0); m.setAttribute('opacity', '1'); });
      // per-marble race curves: the winner takes T_WIN, everyone else strictly longer
      const racers = choices.map((_, i) => ({
        T: i === idx ? T_WIN : T_WIN * (1.05 + Math.random() * 0.32),
        a: 0.018 + Math.random() * 0.022, f: 1.5 + Math.random() * 1.8, ph: Math.random() * 6.28
      }));
      const prog = (r, t) => {
        const u = Math.min(1, t / r.T);
        return u + r.a * Math.sin(6.283 * r.f * u + r.ph) * (1 - u) * Math.min(1, u * 8);
      };
      // countdown
      const cd = ['3', '2', '1', 'GO!'];
      cd.forEach((c, k) => timers.push(setTimeout(() => {
        msg.textContent = c; CM.audio.beep(k === 3 ? 990 : 520, k === 3 ? 0.3 : 0.12);
      }, k * 650)));
      timers.push(setTimeout(() => {
        const t0 = performance.now(); let won = false, lastTick = 0;
        const step = now => {
          const t = now - t0;
          let all = true;
          racers.forEach((r, i) => { const p = prog(r, t); place(i, p); if (p < 1) all = false; });
          if (now - lastTick > 90) { lastTick = now; CM.audio.geiger(0.5); }
          if (!won && t >= T_WIN) {
            won = true;
            msg.textContent = 'WINNER!';
            lanes[idx].setAttribute('opacity', '.35');
            marbles.forEach((m, i) => { if (i !== idx) m.setAttribute('opacity', '.45'); });
            CM.audio.chime(); CM.audio.roar(1.4);
            timers.push(setTimeout(() => done('> ' + choices[idx].toUpperCase()), 500));
          }
          if (!all) raf = requestAnimationFrame(step);
        };
        CM.audio.whoosh(0.5, 200, 1400);
        raf = requestAnimationFrame(step);
      }, 4 * 650));
    },
    unmount() { cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; }
  });
})();
