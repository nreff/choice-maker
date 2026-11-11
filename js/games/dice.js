// Dice: the die's shape matches the number of choices (d4 ... d20); it tumbles and the top face shows the pick.
(() => {
  const { $, randInt, fit } = CM;
  const DICE = [4, 6, 8, 10, 12, 20];
  // poly/inn = outer + facet polygons; tt/tw/th = text box (% of the die); ar = height / width
  const SHAPES = {
    4:  { ar: .9,  poly: 'polygon(50% 0,100% 100%,0 100%)',                       inn: 'polygon(50% 12%,90% 94%,10% 94%)',                                tt: 42, tw: 50, th: 40 },
    6:  { ar: 1,   poly: 'polygon(0 0,100% 0,100% 100%,0 100%)',                  inn: 'polygon(7% 7%,93% 7%,93% 93%,7% 93%)',                            tt: 12, tw: 76, th: 76 },
    8:  { ar: 1.1, poly: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',                inn: 'polygon(50% 8%,92% 50%,50% 92%,8% 50%)',                          tt: 26, tw: 50, th: 48 },
    10: { ar: 1.1, poly: 'polygon(50% 0,100% 38%,50% 100%,0 38%)',                inn: 'polygon(50% 8%,92% 38%,50% 90%,8% 38%)',                          tt: 20, tw: 56, th: 40 },
    12: { ar: .95, poly: 'polygon(50% 0,100% 38%,81% 100%,19% 100%,0 38%)',       inn: 'polygon(50% 8%,92% 38%,76% 92%,24% 92%,8% 38%)',                  tt: 18, tw: 70, th: 62 },
    20: { ar: .9,  poly: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)', inn: 'polygon(27% 8%,73% 8%,92% 50%,73% 92%,27% 92%,8% 50%)',           tt: 22, tw: 64, th: 56 }
  };
  // Nearest die for n choices; ties round up (n=2,3 -> d4).
  const dieFor = n => DICE.reduce((best, d) => {
    const e = Math.abs(d - n), eb = Math.abs(best - n);
    return e < eb || (e === eb && d > best) ? d : best;
  });

  let timer = null, timer2 = null, die = null, face = null;

  function setFace(text) {
    face.textContent = text;
    face.style.fontSize = Math.round(fit(text) * 1.1) + 'px';
  }

  CM.register({
    id: 'dice', name: 'DICE', action: 'ROLL!', hint: 'TAP THE DIE TO ROLL',
    mount(stage, ctx) {
      const d = dieFor(ctx.choices.length), sh = SHAPES[d];
      stage.innerHTML = `<div id="die-wrap" role="button" tabindex="0" aria-label="Roll the die">
        <div id="die"><div id="die-shape"></div><div id="die-face"></div></div>
        <div id="die-cap">D${d}</div></div>`;
      die = $('die'); face = $('die-face');
      die.style.cssText = `--ar:${sh.ar};--poly:${sh.poly};--poly-in:${sh.inn};--tt:${sh.tt}%;--tw:${sh.tw}%;--th:${sh.th}%;--tilt:0deg`;
      setFace('?');
      const wrap = $('die-wrap');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      const choices = CM.ctx.choices, n = choices.length;
      die.classList.remove('rolling');
      die.style.setProperty('--tilt', (randInt(13) - 6) + 'deg');
      void die.offsetWidth;
      die.classList.add('rolling');
      // The face flickers through random choices, slowing down, then lands on the pick.
      let delay = 60, elapsed = 0;
      const tick = () => {
        if (elapsed >= 1200) { setFace(choices[idx]); return; }
        setFace(choices[randInt(n)]);
        elapsed += delay; delay *= 1.18;
        timer = setTimeout(tick, delay);
      };
      tick();
      timer2 = setTimeout(() => done('> ' + choices[idx].toUpperCase()), 1500);
    },
    unmount() { clearTimeout(timer); clearTimeout(timer2); }
  });
})();
