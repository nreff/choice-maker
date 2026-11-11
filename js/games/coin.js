// MAGIC COIN toss, football style: side view of a field. A referee flips the coin, two players watch it,
// it bounces on the turf and settles, then a replay-style close-up reveals the face (the pick).
// It's a magic coin, so it works for any number of choices: the face is whatever the pick is.
// With more than two choices it tells you so (jokingly).
(() => {
  const { $, fit } = CM;
  const JOKES = [
    n => `A COIN WITH ${n} SIDES? IT'S MAGIC. DON'T ASK.`,
    n => `PHYSICISTS ARE FURIOUS. THIS COIN HAS ${n} SIDES.`,
    n => `THE REF ALLOWED IT. ${n} SIDES. LEGAL IN ALL 50 STATES.`,
    n => `THE LEAGUE IS INVESTIGATING A ${n}-SIDED COIN.`,
    n => `${n} SIDES, ZERO QUESTIONS. THE COIN HAS SPOKEN.`
  ];
  const G = 92;                                  // ground line (svg is 160 x 110)
  let raf = 0, scene = null, players = [], refArm = null, coinG = null, coinE = null, coinE2 = null, shadow = null, timers = [];

  const rect = (x, y, w, h, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${extra}/>`;

  function player(id, x, flip, jersey, helmet) {
    return `<g id="${id}" data-x="${x}" data-flip="${flip}" transform="translate(${x} ${G}) scale(${flip} 1)">
      ${rect(-6, -12, 4, 12, '#e8e8e8')}${rect(1, -12, 4, 12, '#e8e8e8')}
      ${rect(-7, -2, 6, 2, '#222')}${rect(0, -2, 6, 2, '#222')}
      ${rect(-8, -26, 16, 14, jersey)}${rect(-4, -22, 8, 3, '#fff')}
      ${rect(-11, -25, 3, 11, jersey)}${rect(8, -25, 3, 11, jersey)}
      <g class="head" transform="translate(0 -26)">
        ${rect(-7, -11, 14, 10, helmet)}${rect(-1, -11, 2, 10, '#fff', 'opacity=".7"')}
        ${rect(3, -7, 6, 5, '#e0ac84')}${rect(3, -8, 7, 1, '#222')}${rect(5, -3, 5, 1, '#222')}
      </g></g>`;
  }

  function referee(x) {
    let stripes = rect(-8, -26, 16, 14, '#fff');
    for (let i = 0; i < 4; i++) stripes += rect(-7 + i * 4, -26, 2, 14, '#222');
    return `<g transform="translate(${x} ${G})">
      ${rect(-5, -12, 4, 12, '#222')}${rect(1, -12, 4, 12, '#222')}
      ${rect(-6, -2, 5, 2, '#000')}${rect(1, -2, 6, 2, '#000')}
      ${stripes}${rect(-11, -25, 3, 11, '#222')}
      <g id="ref-arm" transform="translate(8 -25) rotate(-170)">${rect(0, 0, 3, 10, '#222')}${rect(0, 10, 3, 3, '#e0ac84')}</g>
      ${rect(-4, -34, 8, 8, '#e0ac84')}${rect(-5, -36, 10, 3, '#fff')}${rect(-5, -34, 10, 1, '#222')}
    </g>`;
  }

  function buildScene() {
    // stadium: night sky, crowd rows, wall, turf with yard lines
    let crowd = '';
    const cols = ['#b13e53', '#ffcd75', '#41a6f6', '#a7f070', '#f4f4f4', '#ef7d57'];
    for (let row = 0; row < 4; row++) for (let i = 0; i < 40; i++) {
      crowd += rect(i * 4 + (row % 2) * 2, 40 + row * 6, 2, 3, cols[(i * 7 + row * 3) % cols.length], 'opacity=".75"');
    }
    let turf = rect(0, G, 160, 110 - G, '#2f8f46');
    for (let i = 0; i < 8; i++) turf += rect(i * 22 - 6, G, 11, 110 - G, '#38a152');
    turf += rect(0, G, 160, 1, '#f4f4f4');
    return `<svg id="coin-svg" viewBox="0 0 160 110" shape-rendering="crispEdges">
      ${rect(0, 0, 160, 110, '#1a1c2c')}${rect(0, 0, 160, 30, '#262b44')}
      ${crowd}${rect(0, 64, 160, 28, '#3b3f5c')}${rect(0, 64, 160, 2, '#566c86')}
      ${turf}
      <ellipse id="coin-shadow" cx="100" cy="${G + 2}" rx="5" ry="1.4" fill="#000" opacity=".4"/>
      ${player('pl-a', 24, 1, '#1d5fd6', '#ffcd75')}
      ${player('pl-b', 140, -1, '#b13e53', '#f4f4f4')}
      ${referee(62)}
      <g id="coin-g" transform="translate(71 52)">
        <ellipse id="coin-e2" cx="0" cy="1.2" rx="5" ry="1.4" fill="#8a5a1d"/>
        <ellipse id="coin-e" cx="0" cy="0" rx="5" ry="5" fill="#ffcd75" stroke="#8a5a1d" stroke-width="1"/>
      </g>
    </svg>`;
  }

  function look(a) {            // players' heads follow the coin
    players.forEach(p => {
      const h = p.querySelector('.head');
      h.setAttribute('transform', `translate(0 -26) rotate(${a})`);
    });
  }
  function bounce(dy) {
    players.forEach(p => {
      p.setAttribute('transform', `translate(${p.dataset.x} ${G - dy}) scale(${p.dataset.flip} 1)`);
    });
  }
  function reset() {
    cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = [];
    if (!scene) return;
    $('coin-reveal').className = '';
    refArm.setAttribute('transform', 'translate(8 -25) rotate(-170)');
    coinG.setAttribute('transform', 'translate(71 52)');
    look(0); bounce(0);
  }

  // timeline (ms)
  const T_UP = 1000;
  const BOUNCES = [{ d: 380, h: 26 }, { d: 240, h: 10 }, { d: 150, h: 3 }];
  const T_SETTLE = 500;
  const X0 = 71, X1 = 98, Y0 = 52, YG = G - 1.6;

  CM.register({
    id: 'coin', name: 'MAGIC COIN', action: 'FLIP!',
    hint: ctx => ctx.choices.length === 2 ? 'TAP THE FIELD TO FLIP' : `THIS MAGIC COIN HAS ${ctx.choices.length} SIDES. DON'T ASK.`,
    mount(stage, ctx) {
      stage.innerHTML = `<div id="coin-scene" role="button" tabindex="0" aria-label="Flip the coin">${buildScene()}
        <div id="coin-reveal"><div id="coin-big"><div id="coin-face"></div></div><div id="coin-tag"></div><div id="coin-joke"></div></div></div>`;
      scene = $('coin-scene');
      players = [$('pl-a'), $('pl-b')];
      refArm = $('ref-arm'); coinG = $('coin-g'); coinE = $('coin-e'); coinE2 = $('coin-e2'); shadow = $('coin-shadow');
      look(0);
      scene.addEventListener('click', () => ctx.trigger());
      scene.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      reset();
      const pick = CM.ctx.choices[idx];
      const tBounceEnd = T_UP + BOUNCES.reduce((a, b) => a + b.d, 0);
      const tSettleEnd = tBounceEnd + T_SETTLE;
      const spin0 = 30 + Math.random() * 6, phase0 = Math.random() * Math.PI;
      const events = [
        [0, () => { CM.audio.ting(1.2, 0.8); CM.audio.whoosh(0.6, 500, 2600); }],
        [T_UP, () => { CM.audio.thud(0.6); CM.audio.ting(0.9, 0.9); }]
      ];
      let tt = T_UP;
      BOUNCES.forEach((b, i) => { tt += b.d; events.push([tt, () => { CM.audio.ting(1 - i * 0.05, 0.7 - i * 0.2); CM.audio.thud(0.3 - i * 0.08); }]); });
      events.push([tSettleEnd, () => { CM.audio.chime(); CM.audio.roar(1.6); showReveal(); }]);
      let ei = 0, revealed = false, tReveal = 0;

      const showReveal = () => {
        revealed = true; tReveal = performance.now();
        const f = $('coin-face');
        f.textContent = pick; f.style.fontSize = Math.round(fit(pick) * 1.2) + 'px';
        const n = CM.ctx.choices.length;
        $('coin-tag').textContent = n === 2 ? 'THE COIN SAYS' : 'THE MAGIC COIN SAYS';
        $('coin-joke').textContent = n === 2 ? '' : JOKES[CM.randInt(JOKES.length)](n);
        $('coin-reveal').className = 'pop';
        timers.push(setTimeout(() => done('> ' + pick.toUpperCase()), 900));
      };

      const start = performance.now();
      const step = now => {
        const t = now - start;
        while (ei < events.length && t >= events[ei][0]) { events[ei][1](); ei++; }
        let x, y, sy, shade;
        if (t < T_UP) {                                         // the toss
          const u = t / T_UP;
          x = X0 + (X1 - X0) * (1 - Math.pow(1 - u, 2));
          y = Y0 + (YG - Y0) * u - 4 * 66 * u * (1 - u);
          const ph = phase0 + spin0 * t / 1000;
          sy = Math.abs(Math.cos(ph)); shade = Math.cos(ph) > 0;
          look(-35 * Math.min(1, Math.sin(Math.PI * u) * 2));   // eyes up while it's in the air
          const armUp = Math.max(0, 1 - t / 150);
          refArm.setAttribute('transform', `translate(8 -25) rotate(${-170 * armUp})`);
        } else if (t < tBounceEnd) {                            // bouncing on the turf
          let rel = t - T_UP, b = 0, acc = 0, X = X1;
          while (b < BOUNCES.length - 1 && rel >= acc + BOUNCES[b].d) { acc += BOUNCES[b].d; X += 5 - b * 2; b++; }
          const u = (rel - acc) / BOUNCES[b].d;
          x = X + (5 - b * 2) * u;
          y = YG - 4 * BOUNCES[b].h * u * (1 - u);
          const ph = phase0 + spin0 * 0.6 * t / 1000;
          sy = Math.max(0.2, Math.abs(Math.cos(ph))); shade = Math.cos(ph) > 0;
          look(8);
        } else {                                                // wobbling to rest
          const u = Math.min(1, (t - tBounceEnd) / T_SETTLE);
          x = X1 + 5 + 3 + 1;
          y = YG;
          sy = 0.28 * (1 - u) * Math.abs(Math.cos(u * 14)) + 0.18;
          shade = true;
          look(12);
        }
        const h = G - y;
        coinG.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        coinE.setAttribute('ry', (5 * sy).toFixed(2));
        coinE.setAttribute('fill', shade ? '#ffcd75' : '#d99a3b');
        coinE2.setAttribute('cy', (1 + 1.2 * sy).toFixed(2));
        coinE2.setAttribute('ry', (5 * sy).toFixed(2));
        shadow.setAttribute('cx', x.toFixed(2));
        shadow.setAttribute('rx', Math.max(2, 5 - h / 20).toFixed(2));
        shadow.setAttribute('opacity', Math.max(0.1, 0.45 - h / 150).toFixed(2));
        if (revealed) bounce(Math.abs(Math.sin((now - tReveal) / 90)) * 4);   // players jump
        if (!revealed || now - tReveal < 900) raf = requestAnimationFrame(step);
        else bounce(0);
      };
      raf = requestAnimationFrame(step);
    },
    unmount() { reset(); scene = null; }
  });
})();
