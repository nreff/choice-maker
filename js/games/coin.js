// Coin flip. Two choices: heads/tails. More than two: a "magic coin" whose face changes every flip.
(() => {
  const { $, randInt, fit } = CM;
  let raf = 0, coin = null, face = null;

  function setFace(text, k) {
    face.textContent = text;
    face.style.fontSize = fit(text) + 'px';
    coin.style.background = k % 2 ? '#d99a3b' : '#ffcd75';
  }

  CM.register({
    id: 'coin', name: 'COIN', action: 'FLIP!', hint: 'TAP THE COIN TO FLIP',
    mount(stage, ctx) {
      stage.innerHTML = `<div id="coin-wrap" role="button" tabindex="0" aria-label="Flip the coin">
        <div id="coin"><div id="coin-face"></div></div><div id="coin-shadow"></div></div>`;
      coin = $('coin'); face = $('coin-face');
      setFace(ctx.choices.length === 2 ? ctx.choices[0] : '?', 0);
      const wrap = $('coin-wrap');
      wrap.addEventListener('click', () => ctx.trigger());
      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.trigger(); }
      });
    },
    roll(idx, done) {
      const choices = CM.ctx.choices, n = choices.length;
      let h = 8 + randInt(3);                                   // number of half-turns
      if (n === 2 && h % 2 !== idx % 2) h++;                    // heads (even) / tails (odd) must match the pick
      const dur = 1800 + h * 60, start = performance.now(), shadow = $('coin-shadow');
      let lastK = -1;
      const step = now => {
        const t = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - t, 2);                       // ease out
        const theta = e * h * Math.PI;
        const k = Math.floor((theta + Math.PI / 2) / Math.PI);  // which face is showing
        if (k !== lastK) {
          lastK = k;
          setFace(n === 2 ? choices[k % 2] : (k === h ? choices[idx] : choices[randInt(n)]), k);
        }
        const hop = Math.sin(Math.PI * t) * 90;
        coin.style.transform = `translateY(${-hop}px) scaleX(${Math.max(0.06, Math.abs(Math.cos(theta))).toFixed(3)})`;
        shadow.style.transform = `scale(${(1 - hop / 220).toFixed(3)})`;
        shadow.style.opacity = (0.5 - hop / 300).toFixed(2);
        if (t < 1) raf = requestAnimationFrame(step);
        else done('> ' + choices[idx].toUpperCase());
      };
      raf = requestAnimationFrame(step);
    },
    unmount() { cancelAnimationFrame(raf); }
  });
})();
