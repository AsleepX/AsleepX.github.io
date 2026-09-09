(() => {
  const cat = document.querySelector('.cat');
  const track = document.querySelector('.cat-track');
  if (!cat || !track) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let position = 0;
  let running = null;
  let poseFrame = 0;
  let busy = false;
  const body = cat.querySelector('.cat-body');
  const head = cat.querySelector('.cat-head');
  const tail = cat.querySelector('.cat-tail');
  const legs = cat.querySelector('.cat-legs');
  const bodySleep = 'M11 31C10 23 16 18 25 18C33 18 36 22 43 23C48 24 50 29 46 34C42 40 16 40 11 36Q9 34 11 31Z';
  const bodyStand = 'M11 26C10 18 16 13 25 13C33 13 36 17 43 18C48 19 50 24 46 29C40 35 18 37 13 31Q11 29 11 26Z';
  const tailSleep = 'M13 31C5 34 10 40 22 39C30 39 39 39 44 36';
  const tailStand = 'M13 26C5 28 2 21 5 16C6 13 9 14 8 17';
  function morph(from, to, amount) {
    const target = to.match(/-?\d+(?:\.\d+)?/g).map(Number);
    let index = 0;
    return from.replace(/-?\d+(?:\.\d+)?/g, value =>
      (Number(value) + (target[index++] - Number(value)) * amount).toFixed(3));
  }
  function phase(value, start, end) {
    const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return t * t * (3 - 2 * t);
  }
  function pose(value) {
    // Tail unfurls first; head rises, then the torso and grounded legs extend.
    tail.setAttribute('d', morph(tailSleep, tailStand, phase(value, 0, .55)));
    head.setAttribute('transform', `translate(0 ${5 * (1 - phase(value, .18, .75))})`);
    body.setAttribute('d', morph(bodySleep, bodyStand, phase(value, .3, .95)));
    legs.style.transform = `scaleY(${.12 + .88 * phase(value, .35, 1)})`;
  }
  function changePose(from, to, duration, done) {
    const start = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      pose(from + (to - from) * progress);
      if (progress < 1) poseFrame = requestAnimationFrame(step);
      else { poseFrame = 0; done(); }
    }
    poseFrame = requestAnimationFrame(step);
  }
  const limit = () => Math.max(0, track.clientWidth - cat.offsetWidth);
  const place = x => {
    position = Math.max(0, Math.min(limit(), x));
    cat.style.setProperty('--cat-x', `${position}px`);
  };
  const sleep = () => {
    cancelAnimationFrame(poseFrame);
    poseFrame = 0;
    if (running) running.cancel();
    running = null;
    busy = false;
    cat.classList.remove('is-waking', 'is-running', 'is-settling');
    pose(0);
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
    changePose(0, 1, 1200, () => {
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
        changePose(1, 0, 1100, sleep);
      };
    });
  });
  window.addEventListener('resize', () => { sleep(); place(position); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); });
  reducedMotion.addEventListener('change', sleep);
})();
