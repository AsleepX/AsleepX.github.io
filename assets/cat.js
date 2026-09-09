(() => {
  const cat = document.querySelector('.cat');
  const track = document.querySelector('.cat-track');
  if (!cat || !track) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let position = 0;
  let running = null;
  let poseFrame = 0;
  let bodyFrame = 0;
  let busy = false;
  const body = cat.querySelector('.cat-body');
  const head = cat.querySelector('.cat-head');
  const tail = cat.querySelector('.cat-tail');
  const legs = cat.querySelector('.cat-legs');
  const legPaths = [...legs.querySelectorAll('.cat-leg')];
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
  function shapeBody(path, arch = 0, stretch = 0, sway = 0) {
    // Flex the back and belly while keeping the neck and limb junctions fixed.
    const offsets = {
      3: -arch * .35, 4: -stretch, 5: -arch * .8 + sway,
      6: -stretch * .4, 7: -arch + sway * .5,
      8: stretch * .4, 9: -arch * .8 - sway * .5,
      10: stretch, 11: -arch * .35 - sway,
      21: arch * .18, 23: arch * .18,
    };
    let index = 0;
    return path.replace(/-?\d+(?:\.\d+)?/g, value =>
      (Number(value) + (offsets[index++] || 0)).toFixed(3));
  }
  function pose(value, settling = false) {
    // Tail unfurls first; head rises, then the torso and grounded legs extend.
    tail.setAttribute('d', morph(tailSleep, tailStand, phase(value, 0, .55)));
    head.setAttribute('transform', `translate(0 ${5 * (1 - phase(value, .18, .75))})`);
    const lift = phase(value, .3, .95);
    const flex = Math.sin(Math.PI * phase(value, .15, 1));
    body.setAttribute('d', shapeBody(morph(bodySleep, bodyStand, lift),
      0, flex * .15));
    // Each root follows its shoulder/hip. Bent knees unfold behind the torso;
    // feet emerge from the belly instead of scaling upward from the ground.
    const extend = phase(value, .32, 1);
    const drop = 5 * (1 - lift);
    const mix = (a, b) => a + (b - a) * extend;
    const joints = [
      [20, 26, 24, 34, 24, 33, 25, 35, 21, 39],
      [43, 25, 40, 32, 42, 33, 40, 33, 44, 39],
      [20, 26, 24, 34, 16, 33, 25, 35, 18, 39],
      [43, 25, 40, 32, 46, 33, 40, 33, 44, 39],
    ];
    legPaths.forEach((leg, i) => {
      const [x, y, kx0, ky0, kx1, ky1, fx0, fy0, fx1, fy1] = joints[i];
      leg.setAttribute('d', `M${x} ${y + drop}Q${mix(kx0, kx1)} ${mix(ky0, ky1)} ${mix(fx0, fx1)} ${mix(fy0, fy1)}`);
    });
    legs.style.visibility = value === 0 ? 'hidden' : 'visible';
  }
  function changePose(from, to, duration, done) {
    const start = performance.now();
    function step(now) {
      const progress = Math.min(1, (now - start) / duration);
      pose(from + (to - from) * progress, to < from);
      if (progress < 1) poseFrame = requestAnimationFrame(step);
      else { poseFrame = 0; done(); }
    }
    poseFrame = requestAnimationFrame(step);
  }
  function walkBody(duration) {
    const start = performance.now();
    function step(now) {
      if (!running) return;
      const elapsed = now - start;
      const envelope = phase(elapsed, 0, 200) * (1 - phase(elapsed, duration - 200, duration));
      const stride = elapsed / 620 * Math.PI * 2;
      body.setAttribute('d', shapeBody(bodyStand,
        0, Math.sin(stride) * .15 * envelope, 0));
      bodyFrame = requestAnimationFrame(step);
    }
    bodyFrame = requestAnimationFrame(step);
  }
  const limit = () => Math.max(0, track.clientWidth - cat.offsetWidth);
  const place = x => {
    position = Math.max(0, Math.min(limit(), x));
    cat.style.setProperty('--cat-x', `${position}px`);
  };
  const sleep = () => {
    cancelAnimationFrame(poseFrame);
    cancelAnimationFrame(bodyFrame);
    bodyFrame = 0;
    poseFrame = 0;
    if (running) running.cancel();
    running = null;
    busy = false;
    cat.classList.remove('is-waking', 'is-running', 'is-settling');
    pose(0);
  };

  pose(0);
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
      const duration = Math.max(1100, Math.abs(position - start) / .09);
      running = cat.animate([
        { transform: `translateX(${start}px)` },
        { transform: `translateX(${position}px)` },
      ], { duration, easing: 'cubic-bezier(.25,.1,.65,1)' });
      walkBody(duration);
      running.onfinish = () => {
        cancelAnimationFrame(bodyFrame);
        bodyFrame = 0;
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
