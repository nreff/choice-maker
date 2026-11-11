// Plinko: a ball bounces down a board of pegs into labelled slots.
// The winning slot is decided first (by the app). The ball's route is built BACKWARDS from that slot as a
// random walk, so it looks chaotic but always ends in the right place -- no physics, no bias.
(() => {
  const { $, esc, randInt } = CM;
  const W = 320, TOP = 38, ROWS = 11, RG = 24, SLOT_TOP = TOP + ROWS * RG + 12, SLOT_BOT = SLOT_TOP + 58, H = SLOT_BOT + 6;
  const BR = 5;                                        // ball radius
  const COLORS = ['#ffcd75', '#73eff7', '#a7f070', '#ef7d57', '#b13e53', '#41a6f6', '#f4f4f4', '#b4b4ff'];
  let raf = 0, g = null, svg = null, ball = null, slotEls = [], flash = 0;

  // Peg lattice measured in half-spacings ("units"); slots are m*dx wide with m odd so their centres line up.
  function geometry(n) {
    const sw = W / n;
    let m = 1; while (sw / m > 40) m += 2;
    return { n, sw, m, dx: sw / m, U: 2 * n * m };
  }
  const ux = u => u * g.dx / 2;
  const pegY = r => TOP + r * RG;
  const lo = r => (r % 2 ? 1 : 2), hi = r => (r % 2 ? g.U - 1 : g.U - 2);

  // Returns the peg unit hit on each row, plus the unit the ball lands at after the last peg.
  function makePath(idx) {
    const { m } = g, cands = [];
    for (let e = Math.max(2, 2 * m * idx); e <= Math.min(g.U - 2, 2 * m * (idx + 1)); e += 2) cands.push(e);
    const e = cands[randInt(cands.length)];
    const dir = e === 2 * m * idx ? 1 : e === 2 * m * (idx + 1) ? -1 : (randInt(2) ? 1 : -1);
    const us = Array(ROWS); us[ROWS - 1] = e;
    for (let r = ROWS - 2; r >= 0; r--) {
      const opts = [us[r + 1] - 1, us[r + 1] + 1].filter(u => u >= lo(r) && u <= hi(r));
      us[r] = opts[randInt(opts.length)];
    }
    return { us, xf: ux(e + dir) };
  }

  function fitLabel(text, availLen, availThick, maxFs) {
    for (let len = text.length; len >= 1; len--) {
      const t = len < text.length ? text.slice(0, len - 1) + '.' : text;
      const fs = Math.min(maxFs, Math.floor(availLen / t.length), Math.floor(availThick));
      if (fs >= 6) return { t, fs };
    }
    return { t: '.', fs: 6 };
  }

  function build(choices) {
    const n = choices.length;
    g = geometry(n);
    let o = `<rect x="0" y="0" width="${W}" height="${H}" fill="#1a1c2c"/>`;
    o += `<rect x="0" y="0" width="${W}" height="${TOP - 6}" fill="#262b44"/>`;
    o += `<text x="${W / 2}" y="${TOP - 14}" text-anchor="middle" font-size="8" fill="#ffcd75" font-family="'Press Start 2P',monospace">DROP</text>`;
    // slots
    for (let j = 0; j < n; j++) {
      const x0 = j * g.sw, col = COLORS[j % COLORS.length];
      o += `<rect id="sl${j}" x="${x0 + 1}" y="${SLOT_TOP}" width="${g.sw - 2}" height="${SLOT_BOT - SLOT_TOP}" fill="${col}" opacity=".9"/>`;
      const horiz = n <= 4, cx = x0 + g.sw / 2;
      if (horiz) {
        const { t, fs } = fitLabel(choices[j], g.sw - 10, 12, 11);
        o += `<text x="${cx}" y="${(SLOT_TOP + SLOT_BOT) / 2 + fs * 0.4}" text-anchor="middle" font-size="${fs}" fill="#000" font-family="'Press Start 2P',monospace">${esc(t)}</text>`;
      } else {
        const { t, fs } = fitLabel(choices[j], SLOT_BOT - SLOT_TOP - 8, g.sw - 4, 11);
        o += `<text transform="translate(${cx + fs * 0.38} ${SLOT_BOT - 5}) rotate(-90)" font-size="${fs}" fill="#000" font-family="'Press Start 2P',monospace">${esc(t)}</text>`;
      }
    }
    // dividers and walls
    for (let j = 0; j <= n; j++) o += `<rect x="${j * g.sw - 1.5}" y="${SLOT_TOP - 4}" width="3" height="${SLOT_BOT - SLOT_TOP + 4}" fill="#f4f4f4"/>`;
    o += `<rect x="0" y="0" width="3" height="${SLOT_TOP}" fill="#566c86"/><rect x="${W - 3}" y="0" width="3" height="${SLOT_TOP}" fill="#566c86"/>`;
    // pegs
    for (let r = 0; r < ROWS; r++) for (let u = lo(r); u <= hi(r); u += 2) {
      o += `<circle cx="${ux(u).toFixed(1)}" cy="${pegY(r)}" r="3" fill="#f4f4f4" stroke="#000" stroke-width="1"/>`;
    }
    o += `<g id="pl-ball" transform="translate(${W / 2} 14)"><circle r="${BR}" fill="#ef7d57" stroke="#000" stroke-width="1.5"/><circle cx="-1.6" cy="-1.6" r="1.4" fill="#ffd2b8"/></g>`;
    svg.innerHTML = o;
    ball = $('pl-ball');
    slotEls = [...Array(n).keys()].map(j => $('sl' + j));
  }

  CM.register({
    id: 'plinko', name: 'PLINKO', action: 'DROP!', hint: 'TAP THE BOARD TO DROP THE BALL',
    mount(stage, ctx) {
      stage.innerHTML = `<div id="plinko-wrap" role="button" tabindex="0" aria-label="Drop the ball"><svg id="plinko-svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges"></svg></div>`;
      svg = $('plinko-svg');
      build(ctx.choices);
      const wrap = $('plinko-wrap');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      cancelAnimationFrame(raf); clearInterval(flash);
      slotEls.forEach((el, j) => el.setAttribute('fill', COLORS[j % COLORS.length]));
      const { us, xf } = makePath(idx), choices = CM.ctx.choices;
      const ballTop = (x, y) => [x, y - BR - 3];
      // timeline of segments: each moves the ball from `a` to `b`
      const segs = [];
      const x0 = ux(us[0]);
      segs.push({ d: 420, a: [x0, 12], b: ballTop(x0, pegY(0)), kind: 'drop', peg: true, r: 0 });
      for (let r = 0; r < ROWS - 1; r++) {
        segs.push({ d: 250, a: ballTop(ux(us[r]), pegY(r)), b: ballTop(ux(us[r + 1]), pegY(r + 1)), hop: 9, peg: true, r: r + 1 });
      }
      const last = ballTop(ux(us[ROWS - 1]), pegY(ROWS - 1)), floor = SLOT_BOT - BR - 2;
      segs.push({ d: 330, a: last, b: [xf, floor], hop: 6, kind: 'fall', slot: true });
      const cx = (idx + 0.5) * g.sw;
      segs.push({ d: 220, a: [xf, floor], b: [(xf + cx) / 2, floor], hop: 8, slot: true });
      segs.push({ d: 160, a: [(xf + cx) / 2, floor], b: [cx, floor], hop: 3, slot: true });
      let k = 0, tSeg = performance.now();
      const step = now => {
        let s = segs[k];
        while (now - tSeg >= s.d) {
          tSeg += s.d;
          if (s.peg) CM.audio.tick(0.8, 0.75 + Math.random() * 0.6);
          if (s.slot) CM.audio.thud(0.35);
          if (++k >= segs.length) {
            ball.setAttribute('transform', `translate(${cx} ${floor})`);
            slotEls[idx].setAttribute('fill', '#ffffff');
            let f = 0;
            flash = setInterval(() => {
              slotEls[idx].setAttribute('fill', f % 2 ? COLORS[idx % COLORS.length] : '#ffffff');
              if (++f > 7) { clearInterval(flash); slotEls[idx].setAttribute('fill', '#ffffff'); }
            }, 130);
            CM.audio.chime();
            done('> ' + choices[idx].toUpperCase());
            return;
          }
          s = segs[k];
        }
        const u = (now - tSeg) / s.d;
        const x = s.a[0] + (s.b[0] - s.a[0]) * u;
        let y = s.kind === 'drop' ? s.a[1] + (s.b[1] - s.a[1]) * u * u : s.a[1] + (s.b[1] - s.a[1]) * u;
        if (s.hop) y -= s.hop * 4 * u * (1 - u);
        ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
    unmount() { cancelAnimationFrame(raf); clearInterval(flash); }
  });
})();
