(() => {
  const portrait = document.querySelector('.portrait');
  if (!portrait) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Set();
  let idleTimer;
  let frame = 0;
  let pointer = null;
  let current = { x: 0, y: 0 };
  let onScreen = true;
  const active = () => !reduceMotion.matches && !document.hidden && onScreen;

  function later(callback, delay) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (active()) callback();
    }, delay);
    timers.add(timer);
  }

  function express(className, duration) {
    portrait.classList.add(className);
    later(() => portrait.classList.remove(className), duration);
  }

  function blink() {
    express('is-blinking', 200);
    later(blink, 2600 + Math.random() * 3800);
  }

  function restartIdle() {
    clearTimeout(idleTimer);
    portrait.classList.remove('is-cheeky');
    if (active()) {
      idleTimer = setTimeout(() => {
        if (active()) portrait.classList.add('is-cheeky');
      }, 4000);
    }
  }

  function follow() {
    frame = 0;
    if (!active()) return;
    let x = 0;
    let y = 0;
    if (pointer) {
      const rect = portrait.getBoundingClientRect();
      const dx = pointer.x - (rect.left + rect.width * .486);
      const dy = pointer.y - (rect.top + rect.height * .45);
      // Work in the SVG's coordinates, with a soft, bounded gaze radius.
      const distance = Math.hypot(dx, dy);
      const strength = Math.min(distance / 240, 1);
      if (distance > 0) {
        x = dx / distance * 15 * strength;
        y = dy / distance * 10 * strength;
      }
    }
    current.x += (x - current.x) * .18;
    current.y += (y - current.y) * .18;
    portrait.style.setProperty('--gaze-x', `${current.x.toFixed(2)}px`);
    portrait.style.setProperty('--gaze-y', `${current.y.toFixed(2)}px`);
    if (Math.abs(x - current.x) + Math.abs(y - current.y) > .05) {
      frame = requestAnimationFrame(follow);
    }
  }

  function queueGaze() {
    if (!frame && active()) frame = requestAnimationFrame(follow);
  }

  function reset() {
    clearTimeout(idleTimer);
    timers.forEach(clearTimeout);
    timers.clear();
    cancelAnimationFrame(frame);
    frame = 0;
    portrait.classList.remove('is-blinking', 'is-cheeky');
    portrait.classList.toggle('is-alive', active());
    portrait.classList.toggle('is-paused', !active());
    if (active()) {
      queueGaze();
      later(blink, 1800 + Math.random() * 2200);
      restartIdle();
    } else {
      current = { x: 0, y: 0 };
      portrait.style.removeProperty('--gaze-x');
      portrait.style.removeProperty('--gaze-y');
    }
  }

  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    if (pointer && pointer.x === event.clientX && pointer.y === event.clientY) return;
    pointer = { x: event.clientX, y: event.clientY };
    restartIdle();
    queueGaze();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => {
    pointer = null;
    queueGaze();
  });
  window.addEventListener('blur', () => { pointer = null; queueGaze(); });
  window.addEventListener('scroll', queueGaze, { passive: true });
  window.addEventListener('resize', queueGaze, { passive: true });
  document.addEventListener('visibilitychange', reset);
  reduceMotion.addEventListener('change', reset);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (onScreen !== entry.isIntersecting) {
        onScreen = entry.isIntersecting;
        reset();
      }
    }).observe(portrait);
  }
  reset();
})();
