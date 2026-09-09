(() => {
  const cat = document.querySelector('.cat');
  const track = document.querySelector('.cat-track');
  if (!cat || !track) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let position = 0;
  let running = null;
  let phaseTimer;
  let busy = false;
  const limit = () => Math.max(0, track.clientWidth - cat.offsetWidth);
  const place = x => {
    position = Math.max(0, Math.min(limit(), x));
    cat.style.setProperty('--cat-x', `${position}px`);
  };
  const sleep = () => {
    clearTimeout(phaseTimer);
    if (running) running.cancel();
    running = null;
    busy = false;
    cat.classList.remove('is-waking', 'is-running', 'is-settling');
  };

  cat.hidden = false;
  place(limit() * .72);
  cat.addEventListener('click', event => {
    if (busy || limit() === 0) return;
    const bounds = track.getBoundingClientRect();
    // Keyboard activation uses the cat's position instead of synthetic (0, 0).
    const cursor = event.detail === 0
      ? position + cat.offsetWidth / 2
      : event.clientX - bounds.left;
    const distance = Math.min(220, Math.max(110, track.clientWidth * .3));
    const half = cat.offsetWidth / 2;
    const left = Math.max(0, position - distance);
    const right = Math.min(limit(), position + distance);
    const destination = Math.abs(left + half - cursor) > Math.abs(right + half - cursor)
      ? left : right;
    cat.style.setProperty('--cat-direction', destination < position ? '-1' : '1');
    if (reducedMotion.matches) { place(destination); return; }
    const start = position;
    busy = true;
    cat.classList.add('is-waking');
    phaseTimer = setTimeout(() => {
      cat.classList.remove('is-waking');
      cat.classList.add('is-running');
      place(destination);
      running = cat.animate([
        { transform: `translateX(${start}px)` },
        { transform: `translateX(${position}px)` },
      ], { duration: Math.max(1100, Math.abs(position - start) / .09), easing: 'cubic-bezier(.25,.1,.65,1)' });
      running.onfinish = () => {
        running = null;
        cat.classList.remove('is-running');
        cat.classList.add('is-settling');
        phaseTimer = setTimeout(sleep, 600);
      };
    }, 700);
  });
  window.addEventListener('resize', () => { sleep(); place(position); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); });
  reducedMotion.addEventListener('change', sleep);
})();
