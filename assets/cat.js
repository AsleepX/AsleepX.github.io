import { clamp, collectPlatforms, firstLanding, findRoute, jumpHeight, contactAt, standingHeight } from './cat-world.js?v=5e4a87a9';
import { groundedPaw, walkingLeg } from './cat-pose.js?v=380f73e8';

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
    body.removeAttribute('transform');
    tail.removeAttribute('transform');
    body.setAttribute('d', shapeBody(morph(bodySleep, bodyStand, lift),
      flex * (settling ? -.06 : .1), flex * .15));
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
  function walkShape(elapsed, duration) {
    const envelope = phase(elapsed, 0, 200) * (1 - phase(elapsed, duration - 200, duration));
    const stride = elapsed / 620 * Math.PI * 2;
    body.setAttribute('d', shapeBody(bodyStand,
      Math.sin(stride) * .08 * envelope, Math.sin(stride) * .15 * envelope, 0));
    return -.55 * (1 - Math.cos(stride)) * envelope;
  }
  function drawWalkingLeg(leg, {root, knee, paw}) {
    leg.setAttribute('d', `M${root.x} ${root.y}Q${knee.x} ${knee.y} ${paw.x} ${paw.y}`);
  }
  function walkBody(duration) {
    const start = performance.now();
    function step(now) {
      if (!running) return;
      const elapsed = now - start;
      // A small whole-body shift remains visible at the 56px display size.
      const rise = `translate(0 ${walkShape(elapsed, duration)})`;
      body.setAttribute('transform', rise);
      tail.setAttribute('transform', rise);
      head.setAttribute('transform', rise);
      legPaths.forEach((leg, i) => drawWalkingLeg(leg, walkingLeg(i, elapsed)));
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
    legPaths.forEach(leg => leg.style.removeProperty('transform'));
    pose(0);
  };

  pose(0);
  cat.hidden = false;
  place(limit() * .72);
  cat.addEventListener('click', event => {
    if (suppressClick || busy || limit() === 0) return;
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
  // Drag/drop and platform navigation share the same rig and cancellation scope.
  const rig = cat.querySelector('.cat-rig');
  const svg = cat.querySelector('svg');
  let drag = null;
  let roaming = false;
  let suppressClick = false;
  let journey = 0;
  let journeyFrame = 0;
  let holdTimer;
  let world = { x: 0, y: 0 }; // center of the paws in document coordinates
  const footOffset = 39;
  const halfWidth = 28;
  const homePoint = () => {
    const r = track.getBoundingClientRect();
    return { x: r.left + scrollX + limit() * .72 + halfWidth, y: r.top + scrollY };
  };
  function moveWorld(x, y) {
    world = { x, y };
    cat.style.transform = `translate(${x - halfWidth}px, ${y - footOffset}px)`;
  }
  function standOn(surface, x, { bend = 0, gait = null, duration = 0, offset = 0 } = {}) {
    const facing = cat.style.getPropertyValue('--cat-direction') === '-1' ? -1 : 1;
    const back = contactAt(surface, x - 10.5 * facing);
    const front = contactAt(surface, x + 10.5 * facing);
    const centerY = standingHeight(surface, x);
    if (!Number.isFinite(centerY)) return '';
    moveWorld(x, centerY + offset);
    cat.classList.add('is-grounded');
    const angle = back && front ? clamp(Math.atan2(front.y - back.y, 21) * 180 / Math.PI, -32, 32) : 0;
    const bob = gait === null ? 0 : walkShape(gait, duration);
    const dy = bend + bob;
    const transform = `translate(0 ${dy}) rotate(${angle} 32 25)`;
    body.setAttribute('transform', transform);
    head.setAttribute('transform', transform);
    tail.setAttribute('transform', transform);
    const radians = angle * Math.PI / 180;
    legPaths.forEach((leg, i) => {
      const step = gait === null ? null : walkingLeg(i, gait);
      // Flat platforms use exactly the click-to-walk pose.
      if (step && !surface.contour) {
        leg.style.removeProperty('transform');
        drawWalkingLeg(leg, step);
        return;
      }
      const isFront = i % 2 === 1;
      const rootX = isFront ? 43 : 20, rootY = isFront ? 25 : 26;
      const rx = 32 + (rootX - 32) * Math.cos(radians) - (rootY - 25) * Math.sin(radians);
      const ry = 25 + (rootX - 32) * Math.sin(radians) + (rootY - 25) * Math.cos(radians) + dy;
      const desiredX = x + ((step ? step.paw.x : isFront ? 44 : 20) - 32) * .875 * facing;
      const contact = contactAt(surface, desiredX) || (isFront ? front : back) || front || back;
      if (!contact) return;
      const footX = 32 + (contact.x - x) / (.875 * facing);
      const swing = step ? Math.max(0, 39 - step.paw.y) : 0;
      const footY = (contact.y - (world.y - footOffset) - 2.75) / .875 - 1.8 - swing;
      const paw = groundedPaw({ x: rx, y: ry }, { x: footX, y: footY });
      leg.style.removeProperty('transform');
      const kneeBend = step ? step.knee.x - (step.root.x + step.paw.x) / 2 : isFront ? 1 : -2;
      leg.setAttribute('d', `M${rx} ${ry}Q${(rx + paw.x) / 2 + kneeBend} ${(ry + paw.y) / 2} ${paw.x} ${paw.y}`);
    });
    return transform;
  }
  function cancelJourney() {
    journey++;
    cancelAnimationFrame(journeyFrame);
    journeyFrame = 0;
    sleep();
  }
  function portal() {
    if (roaming) return;
    const r = cat.getBoundingClientRect();
    const current = { x: r.left + scrollX + halfWidth, y: r.top + scrollY + footOffset };
    document.body.append(cat);
    cat.classList.add('is-roaming');
    roaming = true;
    moveWorld(current.x, current.y);
  }
  function restoreHome() {
    if (drag) {
      const pointerId = drag.pointerId;
      drag = null;
      if (cat.hasPointerCapture(pointerId)) cat.releasePointerCapture(pointerId);
    }
    cancelJourney();
    document.documentElement.classList.remove('cat-dragging');
    clearTimeout(holdTimer);
    rig.removeAttribute('transform');
    cat.classList.remove('is-held', 'is-looking', 'is-jumping', 'is-climbing', 'is-landing', 'is-grounded');
    cat.classList.remove('is-roaming');
    cat.removeAttribute('data-grab');
    cat.style.removeProperty('transform');
    track.append(cat);
    roaming = false;
    place(limit() * .72);
    pose(0);
  }
  function frameSequence(duration, render, token) {
    return new Promise(resolve => {
      const start = performance.now();
      function tick(now) {
        if (token !== journey) { resolve(false); return; }
        const t = Math.min(1, (now - start) / duration);
        render(t);
        if (t < 1) journeyFrame = requestAnimationFrame(tick);
        else { journeyFrame = 0; resolve(true); }
      }
      journeyFrame = requestAnimationFrame(tick);
    });
  }
  function heldPose(part) {
    pose(1);
    body.removeAttribute('transform');
    head.removeAttribute('transform');
    tail.removeAttribute('transform');
    // Each grasp uses the same silhouette, with different joint and gravity poses.
    const rotation = part === 'head' ? -68 : part === 'tail' ? 72 : 8;
    const pivot = part === 'head' ? [48, 21] : part === 'tail' ? [8, 16] : [29, 23];
    rig.setAttribute('transform', `rotate(${rotation} ${pivot.join(' ')})`);
    if (part === 'body') {
      head.setAttribute('transform', 'rotate(18 41 23) translate(0 2)');
      tail.setAttribute('d', 'M13 26C7 27 7 33 9 38C10 40 12 39 12 37');
    }
    // Free paws hang outward from their fixed shoulder and hip joints.
    legPaths.forEach((leg, i) => {
      const front = i % 2 === 1;
      const x = front ? 43 : 20, y = front ? 25 : 26;
      const dx = part === 'head' ? -11 : part === 'tail' ? 11 : 0;
      leg.setAttribute('d', `M${x} ${y}Q${x + dx * .5} ${y + 7} ${x + dx + (i < 2 ? -2 : 2)} ${y + 15}`);
    });
    return pivot;
  }
  function beginDrag(event) {
    if (!drag || drag.active) return;
    const local = drag.local;
    // Tail is the rear of the facing silhouette; head is the opposite end.
    const part = local.x < 17 ? 'tail' : local.x > 39 ? 'head' : 'body';
    portal();
    cat.setPointerCapture(drag.pointerId);
    cancelJourney();
    busy = true;
    drag.active = true;
    drag.part = part;
    suppressClick = true;
    cat.classList.remove('is-looking', 'is-jumping', 'is-climbing', 'is-landing', 'is-grounded');
    cat.classList.add('is-held');
    cat.dataset.grab = part;
    const pivot = heldPose(part);
    // Keep the actual grasp point directly under the pointer, including mirroring.
    const facing = getComputedStyle(cat).getPropertyValue('--cat-direction').trim() === '-1' ? -1 : 1;
    drag.offset = { x: (facing < 0 ? 64 - pivot[0] : pivot[0]) * .875, y: pivot[1] * .875 + 2.75 };
    moveWorld(event.pageX - drag.offset.x + halfWidth, event.pageY - drag.offset.y + footOffset);
  }
  cat.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    // Read the unrotated image coordinates before taking pointer capture.
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    drag = { pointerId: event.pointerId, local: point, startX: event.pageX, startY: event.pageY, active: false };
    cat.setPointerCapture(event.pointerId);
    document.documentElement.classList.add('cat-dragging');
    event.preventDefault();
    holdTimer = setTimeout(() => beginDrag(event), 140);
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active && Math.hypot(event.pageX - drag.startX, event.pageY - drag.startY) > 3) beginDrag(event);
    if (!drag.active) return;
    event.preventDefault();
    const x = clamp(event.pageX - drag.offset.x + halfWidth, 40, document.documentElement.clientWidth - 40);
    const y = Math.max(footOffset, event.pageY - drag.offset.y + footOffset);
    moveWorld(x, y);
  });
  async function landAndReturn() {
    const token = journey;
    pose(1);
    rig.removeAttribute('transform');
    cat.classList.remove('is-held');
    cat.removeAttribute('data-grab');
    let platforms = collectPlatforms(track);
    let surface = firstLanding(platforms, world.x, world.y);
    if (!surface) surface = platforms.find(p => p.id === 'floor');
    const start = { ...world };
    const distance = Math.max(0, surface.y - start.y);
    cat.classList.add('is-jumping');
    if (!await frameSequence(reducedMotion.matches ? 100 : Math.max(160, Math.sqrt(2 * distance / 1100) * 1000), t => {
      moveWorld(start.x, start.y + distance * t * t);
    }, token)) return;
    cat.classList.remove('is-jumping');
    standOn(surface, start.x);
    cat.classList.add('is-looking');
    if (!await frameSequence(reducedMotion.matches ? 100 : 1250, t => {
      const angle = Math.sin(t * Math.PI * 3) * 11;
      const ground = standOn(surface, start.x);
      head.setAttribute('transform', `${ground} rotate(${angle} 45 25)`);
    }, token)) return;
    cat.classList.remove('is-looking');
    pose(1);
    platforms = collectPlatforms(track);
    const home = homePoint();
    const route = findRoute(platforms, { ...world, platform: surface.id }, home.x);
    let from = { ...world, platform: surface.id };
    for (const to of route) {
      if (token !== journey) return;
      const walking = from.platform === to.platform;
      const support = platforms.find(p => p.id === to.platform);
      cat.classList.toggle('is-grounded', walking);
      cat.style.setProperty('--cat-direction', to.x < from.x ? '-1' : '1');
      cat.classList.toggle('is-running', walking);
      cat.classList.toggle('is-jumping', !walking);
      const climb = !walking && to.y < from.y - 42;
      const gripDepth = climb ? 6 : 0;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const duration = reducedMotion.matches ? 100 : walking ? Math.max(160, length / .09) : Math.max(520, length / .24);
      if (!await frameSequence(duration, t => {
        const rise = walking ? 0 : 4 * jumpHeight(from, to) * t * (1 - t);
        moveWorld(from.x + (to.x - from.x) * t, from.y + (to.y + gripDepth - from.y) * t - rise);
        if (!walking) {
          const tuck = Math.sin(t * Math.PI) * 13;
          legPaths.forEach((leg, i) => leg.style.transform = `rotate(${i % 2 ? tuck : -tuck}deg)`);
        } else {
          standOn(support, from.x + (to.x - from.x) * t, {
            gait: reducedMotion.matches ? null : t * duration, duration,
          });
        }
      }, token)) return;
      legPaths.forEach(leg => leg.style.removeProperty('transform'));
      pose(1);
      if (!walking) {
        cat.classList.remove('is-jumping');
        cat.classList.add('is-landing');
        // A brief catch, then a small knee bend and immediate extension.
        // Paws stay at the ledge while the body absorbs the landing.
        if (!await frameSequence(reducedMotion.matches ? 60 : 240, t => {
          const remaining = gripDepth * (1 - phase(t, 0, .25));
          const bendPhase = climb ? phase(t, .18, 1) : t;
          const bend = 2.2 * Math.sin(Math.PI * bendPhase);
          standOn(support, to.x, { bend, offset: remaining });
        }, token)) return;
        cat.classList.remove('is-landing');
        pose(1);
        standOn(support, to.x);
      }
      from = { ...to, y: world.y };
    }
    cat.classList.remove('is-running', 'is-jumping');
    if (!await frameSequence(reducedMotion.matches ? 100 : 1100, t => pose(1 - t, true), token)) return;
    restoreHome();
  }
  function release(event, canceled = false) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    clearTimeout(holdTimer);
    document.documentElement.classList.remove('cat-dragging');
    const active = drag.active;
    if (cat.hasPointerCapture(drag.pointerId)) cat.releasePointerCapture(drag.pointerId);
    drag = null;
    if (canceled) { if (active) restoreHome(); }
    else if (active) landAndReturn();
    // The click immediately following pointerup must not wake a just-dropped cat.
    setTimeout(() => { suppressClick = false; }, 0);
  }
  window.addEventListener('pointerup', event => release(event));
  window.addEventListener('pointercancel', event => release(event, true));
  cat.addEventListener('keydown', event => { if (event.key === 'Escape' && roaming) { release(null, true); restoreHome(); } });
  function terrainChanged() {
    if (!roaming || drag) return;
    cancelJourney();
    busy = true;
    cat.classList.remove('is-looking', 'is-jumping', 'is-landing', 'is-grounded');
    landAndReturn();
  }
  const contentChanges = new MutationObserver(records => {
    const relevant = records.some(record => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target?.closest('.cat, .portrait')) return false;
      if (record.type !== 'childList') return true;
      return [...record.addedNodes, ...record.removedNodes].some(node =>
        !(node.nodeType === 1 && node.matches('.cat, .cat-baseline-probe')));
    });
    if (relevant) terrainChanged();
  });
  contentChanges.observe(document.querySelector('.page'), {
    subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'],
  });
  document.fonts?.addEventListener('loadingdone', terrainChanged);
  document.querySelector('.portrait-fallback')?.addEventListener('load', terrainChanged);
  window.addEventListener('resize', () => {
    if (roaming) restoreHome(); else { sleep(); place(position); }
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (roaming) restoreHome(); else sleep(); }
  });
  window.addEventListener('blur', () => { if (drag) restoreHome(); });
  reducedMotion.addEventListener('change', () => { if (roaming) restoreHome(); else sleep(); });
})();
