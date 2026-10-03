import { hairstyles, nextHairstyle } from './portrait-hairstyles.js?v=3c90981d';
import { createHairDisplacementPixels, HAIR_MAP_SCALE } from './portrait-hair-motion.js?v=94218485';

const portrait = document.querySelector('.portrait');
const svg = portrait?.querySelector('.portrait-live');
if (svg) {
  const ns = 'http://www.w3.org/2000/svg';
  const originalImage = svg.querySelector('image');
  // Warp the hair continuously instead of rotating artwork through a fixed
  // face cutout. The motion map is zero over the face, ears, neck and clothing.
  const {data,mask,width,height} = createHairDisplacementPixels();
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  const encode = pixels => {
    context.putImageData(new ImageData(pixels,width,height),0,0);
    return canvas.toDataURL();
  };
  const mapURL = encode(data), windowURL = encode(mask);
  const filter = document.createElementNS(ns,'filter');
  filter.id = 'portrait-hair-warp';
  filter.setAttribute('filterUnits','userSpaceOnUse');
  filter.setAttribute('x','0'); filter.setAttribute('y','0');
  filter.setAttribute('width','1254'); filter.setAttribute('height','1254');
  filter.setAttribute('color-interpolation-filters','sRGB');
  filter.innerHTML = `<feImage href="${mapURL}" x="0" y="0" width="1254" height="1254" preserveAspectRatio="none" result="map"/><feComponentTransfer in="map" result="movement"><feFuncR type="linear" slope="${255/254}" intercept="${-1/254}"/><feFuncG type="linear" slope="${255/254}" intercept="${-1/254}"/></feComponentTransfer><feDisplacementMap in="SourceGraphic" in2="movement" scale="0" xChannelSelector="R" yChannelSelector="G"/>`;
  const displacement = filter.querySelector('feDisplacementMap');
  const motionMask = document.createElementNS(ns,'mask');
  motionMask.id = 'portrait-hair-motion-region';
  motionMask.setAttribute('maskUnits','userSpaceOnUse');
  motionMask.setAttribute('x','0'); motionMask.setAttribute('y','0');
  motionMask.setAttribute('width','1254'); motionMask.setAttribute('height','1254');
  motionMask.innerHTML = `<image href="${windowURL}" width="1254" height="1254"/>`;
  svg.querySelector('defs').append(filter,motionMask);
  const windows = [];
  function movingLayer(source) {
    const window = document.createElementNS(ns,'g');
    window.classList.add('portrait-hair-motion');
    window.setAttribute('mask','url(#portrait-hair-motion-region)');
    window.setAttribute('display','none');
    const warped = document.createElementNS(ns,'g');
    warped.setAttribute('filter','url(#portrait-hair-warp)');
    // Opaque white travels with the ink, erasing the old silhouette underneath.
    // The window fades only where displacement has already approached zero.
    const background = document.createElementNS(ns,'rect');
    background.setAttribute('width','1254'); background.setAttribute('height','1254');
    background.setAttribute('fill','white');
    warped.append(background,source); window.append(warped); windows.push(window);
    return window;
  }
  const original = document.createElementNS(ns,'g');
  original.classList.add('portrait-original');
  original.setAttribute('mask','url(#face-features)');
  originalImage.replaceWith(original);
  originalImage.removeAttribute('mask');
  original.append(originalImage,movingLayer(originalImage.cloneNode(true)));

  const art = document.createElementNS(ns,'g');
  art.classList.add('portrait-restyled');
  art.setAttribute('mask','url(#face-features)');
  art.setAttribute('fill','#0b0c09');
  art.setAttribute('fill-rule','evenodd');
  const face = document.createElementNS(ns,'path');
  const hair = document.createElementNS(ns,'path');
  art.append(face,movingLayer(hair));
  original.before(art);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hair-touch';
  button.setAttribute('aria-label','Ruffle hair to change hairstyle');
  button.setAttribute('aria-describedby','hair-hint');
  button.title = 'Swipe to restyle · Ruffle to surprise · Double-tap to reset';
  const hint = document.createElement('span');
  hint.className = 'hair-hint'; hint.id = 'hair-hint';
  hint.textContent = 'Swipe to change hairstyle, ruffle for a surprise, or double-tap to restore the original.';
  const status = document.createElement('span');
  status.className = 'hair-status'; status.setAttribute('role','status');
  portrait.append(button,hint,status);
  portrait.classList.add('has-hairstyles');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0, gesture = null, clickTimer = 0, suppressClick = false;
  let revision = 0, snapshotURL = null;
  let amount = 0, target = 0, motionFrame = 0, motionTime = 0;
  function renderMotion() {
    displacement.setAttribute('scale',(amount*HAIR_MAP_SCALE/2).toFixed(3));
    for (const window of windows) window.setAttribute('display',Math.abs(amount) > .005 ? 'inline' : 'none');
  }
  function stopMotion() {
    cancelAnimationFrame(motionFrame); motionFrame = 0; motionTime = 0;
    amount = target = 0; renderMotion();
  }
  function tickMotion(now) {
    const dt = Math.min(.05,motionTime ? (now-motionTime)/1000 : 1/60);
    motionTime = now;
    amount += (target-amount)*(1-Math.exp(-dt/(gesture ? .035 : .085)));
    if (Math.abs(target-amount) < .005) amount = target;
    renderMotion();
    if (amount !== target) motionFrame = requestAnimationFrame(tickMotion);
    else { motionFrame = 0; motionTime = 0; }
  }
  function moveHair(value) {
    if (reduced.matches) { stopMotion(); return; }
    target = Math.max(-2,Math.min(2,value));
    if (!motionFrame) motionFrame = requestAnimationFrame(tickMotion);
  }
  reduced.addEventListener('change',() => { if (reduced.matches) stopMotion(); });
  // A matching static snapshot also keeps no-motion rendering and the existing
  // portrait surface sampling aligned with the selected silhouette.
  async function snapshot() {
    const token = ++revision, fallback = portrait.querySelector('.portrait-fallback');
    if (!selected) { fallback.src = 'assets/me.png'; return; }
    const copy = svg.cloneNode(true);
    copy.setAttribute('xmlns',ns); copy.setAttribute('width','1254'); copy.setAttribute('height','1254');
    copy.removeAttribute('class');
    copy.querySelector('.portrait-original').remove();
    copy.querySelector('.tongue').remove();
    copy.querySelectorAll('.portrait-hair-motion').forEach(layer => layer.remove());
    copy.querySelector('#portrait-hair-warp').remove();
    copy.querySelector('#portrait-hair-motion-region').remove();
    const background = document.createElementNS(ns,'rect');
    background.setAttribute('width','1254'); background.setAttribute('height','1254'); background.setAttribute('fill','white');
    copy.prepend(background);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
    const ready = new Image(); ready.src = url;
    try { await ready.decode(); } catch { URL.revokeObjectURL(url); return; }
    if (token !== revision) { URL.revokeObjectURL(url); return; }
    const previous = snapshotURL; snapshotURL = url; fallback.src = url;
    if (previous) URL.revokeObjectURL(previous);
  }
  function choose(index, announce = true) {
    clearTimeout(clickTimer); clickTimer = 0;
    selected = index;
    const style = hairstyles[index];
    face.setAttribute('d',style.path);
    hair.setAttribute('d',style.path);
    portrait.dataset.hairstyle = style.id;
    if (announce) status.textContent = `${style.name} hairstyle. Swipe to change; double-tap to reset.`;
    try { localStorage.setItem('portrait-hairstyle',style.id); } catch { /* Storage is optional. */ }
    stopMotion();
    if (!reduced.matches && announce) {
      amount = -.7; renderMotion(); moveHair(0);
    }
    snapshot();
  }
  function clearGesture() {
    if (gesture && button.hasPointerCapture(gesture.id)) button.releasePointerCapture(gesture.id);
    gesture = null;
    moveHair(0);
    portrait.classList.remove('is-ruffling');
  }
  button.addEventListener('pointerdown',event => {
    if (event.button !== 0 || gesture) return;
    suppressClick = false;
    stopMotion();
    gesture = {id:event.pointerId,start:event.clientX,last:event.clientX,turn:event.clientX,sign:0,reversals:0,distance:0};
    button.setPointerCapture(event.pointerId);
    portrait.classList.add('is-ruffling');
  });
  button.addEventListener('pointermove',event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const threshold = Math.max(8,portrait.clientWidth*.06);
    const delta = event.clientX - gesture.turn;
    if (Math.abs(delta) >= threshold) {
      const sign = Math.sign(delta);
      if (gesture.sign && sign !== gesture.sign) gesture.reversals++;
      gesture.sign = sign; gesture.turn = event.clientX;
    }
    gesture.distance += Math.abs(event.clientX - gesture.last);
    gesture.last = event.clientX;
    moveHair((event.clientX-gesture.start)/14);
  });
  button.addEventListener('pointerup',event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const {start,last,distance,reversals} = gesture;
    clearGesture();
    if (distance < Math.max(14,portrait.clientWidth*.12)) return;
    clearTimeout(clickTimer); clickTimer = 0;
    suppressClick = true;
    choose(reversals >= 2 ? nextHairstyle(selected,1 + Math.floor(Math.random()*(hairstyles.length-1))) : nextHairstyle(selected,last < start ? -1 : 1));
  });
  button.addEventListener('click',event => {
    if (suppressClick) { suppressClick = false; return; }
    if (!event.detail) { choose(nextHairstyle(selected)); return; }
    if (clickTimer || event.detail > 1) { clearTimeout(clickTimer); clickTimer = 0; choose(0); return; }
    clickTimer = setTimeout(() => { clickTimer = 0; choose(nextHairstyle(selected)); },240);
  });
  button.addEventListener('dblclick',event => event.preventDefault());
  button.addEventListener('keydown',event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home') {
      event.preventDefault(); choose(event.key === 'Home' ? 0 : nextHairstyle(selected,event.key === 'ArrowLeft' ? -1 : 1));
    }
    if (event.key === 'Escape') clearGesture();
  });
  button.addEventListener('pointercancel',() => { clearGesture(); clearTimeout(clickTimer); clickTimer = 0; });
  button.addEventListener('lostpointercapture',clearGesture);
  window.addEventListener('blur',() => { clearGesture(); clearTimeout(clickTimer); clickTimer = 0; });
  let saved;
  try { saved = localStorage.getItem('portrait-hairstyle'); } catch { /* Keep the original. */ }
  choose(Math.max(0,hairstyles.findIndex(style => style.id === saved)),false);
}
