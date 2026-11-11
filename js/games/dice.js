// Dice: a real 3D cube thrown onto a felt table. It tumbles, bounces (with clacks) and settles with the pick facing you.
(() => {
  const { $, randInt, fit } = CM;
  const SIZE = 96;                                           // cube edge in px
  const DUR = 2000;                                          // ms
  // [start, end, peak height] of each hop; first entry is the initial drop from height 90
  const HOPS = [[0.28, 0.50, 40], [0.50, 0.66, 16], [0.66, 0.78, 6], [0.78, 0.86, 2]];
  const FACES = [                                            // front is the one that ends up facing you
    `rotateY(0deg)`, `rotateY(90deg)`, `rotateY(180deg)`, `rotateY(-90deg)`, `rotateX(90deg)`, `rotateX(-90deg)`
  ];
  let raf = 0, cube = null, shadow = null, faceEls = [];

  function label(el, text) {
    el.firstChild.textContent = text;
    el.style.fontSize = Math.round(fit(text) * 0.95) + 'px';
  }

  // Put the pick on the front face and other (shuffled) choices on the rest.
  function dress(choices, idx) {
    const others = choices.map((_, i) => i).filter(i => i !== idx);
    for (let i = others.length - 1; i > 0; i--) { const j = randInt(i + 1); [others[i], others[j]] = [others[j], others[i]]; }
    label(faceEls[0], choices[idx]);
    for (let f = 1; f < 6; f++) label(faceEls[f], others.length ? choices[others[(f - 1) % others.length]] : choices[idx]);
  }

  CM.register({
    id: 'dice', name: 'DICE', action: 'ROLL!', hint: 'TAP THE DIE TO ROLL',
    mount(stage, ctx) {
      stage.innerHTML = `<div id="dice-box" role="button" tabindex="0" aria-label="Roll the die">
        <div id="dice-scene">
          <div id="dice-felt"></div>
          <div id="dice-shadow"></div>
          <div id="cube">${FACES.map((tr, i) =>
            `<div class="face" style="transform:${tr} translateZ(${SIZE / 2}px)"><span></span></div>`).join('')}</div>
        </div>
        <div id="die-cap">THROW IT!</div></div>`;
      cube = $('cube'); shadow = $('dice-shadow');
      faceEls = [...document.querySelectorAll('#cube .face')];
      const c = ctx.choices;
      faceEls.forEach((el, i) => label(el, c[i % c.length]));
      cube.style.transform = 'rotateX(-16deg) rotateY(-24deg)';
      const box = $('dice-box');
      box.addEventListener('click', () => ctx.trigger());
      box.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      cancelAnimationFrame(raf);
      dress(CM.ctx.choices, idx);
      $('die-cap').textContent = '...';
      // resting pose, and how many full turns to burn off on the way (multiples of 360 so it lands exact)
      const fx = -16 + randInt(9) - 4, fy = -24 + randInt(13) - 6;
      const ax = 360 * (2 + randInt(3)) * (randInt(2) ? 1 : -1);
      const ay = 360 * (3 + randInt(3)) * (randInt(2) ? 1 : -1);
      const az = 360 * (1 + randInt(2)) * (randInt(2) ? 1 : -1);
      const x0 = -120 + randInt(30), start = performance.now();
      const contacts = [0.28, 0.50, 0.66, 0.78, 0.86];
      let ci = 0;
      const step = now => {
        const t = Math.min(1, (now - start) / DUR);
        const e = 1 - Math.pow(1 - Math.min(1, t / 0.9), 3);        // spin eases out
        const k = 1 - e;
        cube.style.transform = `rotateX(${fx + ax * k}deg) rotateY(${fy + ay * k}deg) rotateZ(${az * k}deg)`;
        let h = 0;
        if (t < HOPS[0][0]) { const u = t / HOPS[0][0]; h = 90 * (1 - u * u); }
        else for (const [a, b, peak] of HOPS) {
          if (t >= a && t < b) { const u = (t - a) / (b - a); h = 4 * peak * u * (1 - u); break; }
        }
        const x = x0 * Math.pow(1 - Math.min(1, t / 0.8), 2);       // slides in from the left
        cube.parentNode.style.setProperty('--h', h.toFixed(1) + 'px');
        cube.style.translate = `${x.toFixed(1)}px ${(-h).toFixed(1)}px`;
        shadow.style.transform = `translateX(${x.toFixed(1)}px) scale(${(1 - h / 160).toFixed(3)})`;
        shadow.style.opacity = (0.55 - h / 400).toFixed(2);
        while (ci < contacts.length && t >= contacts[ci]) {          // clack on every impact
          CM.audio.clack(1 - ci * 0.17, 0.9 + Math.random() * 0.25); ci++;
        }
        if (t < 1) { raf = requestAnimationFrame(step); return; }
        cube.style.transform = `rotateX(${fx}deg) rotateY(${fy}deg)`;
        cube.style.translate = '0 0';
        $('die-cap').textContent = 'D6';
        done('> ' + CM.ctx.choices[idx].toUpperCase());
      };
      raf = requestAnimationFrame(step);
    },
    unmount() { cancelAnimationFrame(raf); }
  });
})();
