import { hairstyles, nextHairstyle } from './portrait-hairstyles.js?v=3c90981d';

const portrait = document.querySelector('.portrait');
const svg = portrait?.querySelector('.portrait-live');
if (svg) {
  const ns = 'http://www.w3.org/2000/svg';
  const originalImage = svg.querySelector('image');
  // Complementary masks split the traced artwork without clipping its volume.
  // The face/clothing stay anchored while a subtle ruffle moves only the hair.
  const core = 'M356 545L372 510L372 468Q441 460 527 470L639 470Q704 431 809 449L844 515L868 543L940 528L951 596L870 683L822 792L781 852L791 875L840 940L1110 990L1115 1210H160V1010L447 942L493 882L520 871L438 817L376 730L342 633Z';
  for (const hair of [false,true]) {
    const mask = document.createElementNS(ns,'mask');
    mask.id = hair ? 'portrait-hair-region' : 'portrait-core-region';
    mask.setAttribute('maskUnits','userSpaceOnUse');
    mask.setAttribute('x','0'); mask.setAttribute('y','0');
    mask.setAttribute('width','1254'); mask.setAttribute('height','1254');
    // A tiny overlap avoids antialiasing seams between complementary masks.
    mask.innerHTML = `<rect width="1254" height="1254" fill="${hair?'white':'black'}"/><path d="${core}" fill="${hair?'black':'white'}" stroke="${hair?'none':'white'}" stroke-width="3" stroke-linejoin="round"/>`;
    svg.querySelector('defs').append(mask);
  }
  // Keep the original as a stationary base. A feathered overlay moves its hair
  // without opening seams at the fringe, cheeks or collar of the raster image.
  const feather = document.createElementNS(ns,'filter');
  feather.id = 'portrait-original-feather';
  feather.innerHTML = '<feGaussianBlur stdDeviation="16"/>';
  const originalHairMask = document.createElementNS(ns,'mask');
  originalHairMask.id = 'portrait-original-hair';
  originalHairMask.setAttribute('maskUnits','userSpaceOnUse');
  originalHairMask.setAttribute('x','0'); originalHairMask.setAttribute('y','0');
  originalHairMask.setAttribute('width','1254'); originalHairMask.setAttribute('height','1254');
  originalHairMask.innerHTML = `<rect width="1254" height="1254" fill="white"/><path d="${core}" fill="black" stroke="black" stroke-width="32" filter="url(#portrait-original-feather)"/><rect y="910" width="1254" height="344" fill="black"/>`;
  svg.querySelector('defs').append(feather,originalHairMask);
  const original = document.createElementNS(ns,'g');
  original.classList.add('portrait-original');
  original.setAttribute('mask','url(#face-features)');
  const originalHair = originalImage.cloneNode(true);
  originalHair.removeAttribute('mask');
  originalHair.classList.add('hair-shape');
  const originalHairWindow = document.createElementNS(ns,'g');
  originalHairWindow.setAttribute('mask','url(#portrait-original-hair)');
  originalHairWindow.append(originalHair);
  originalImage.replaceWith(original);
  originalImage.removeAttribute('mask');
  original.append(originalImage,originalHairWindow);

  const art = document.createElementNS(ns,'g');
  art.classList.add('portrait-restyled');
  art.setAttribute('mask','url(#face-features)');
  art.setAttribute('fill','#0b0c09');
  art.setAttribute('fill-rule','evenodd');
  const face = document.createElementNS(ns,'path');
  face.setAttribute('mask','url(#portrait-core-region)');
  const hairWindow = document.createElementNS(ns,'g');
  hairWindow.setAttribute('mask','url(#portrait-hair-region)');
  const hair = document.createElementNS(ns,'path');
  hair.classList.add('hair-shape');
  hairWindow.append(hair);
  art.append(face,hairWindow);
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
  let animations = [], revision = 0, snapshotURL = null;
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
    animations.forEach(animation => animation.cancel());
    if (!reduced.matches && announce) {
      animations = [...svg.querySelectorAll('.hair-shape')].map(layer => layer.animate([
        {transform:'rotate(-.7deg)'},
        {transform:'rotate(.3deg)',offset:.45},
        {transform:'rotate(0deg)'},
      ],{duration:480,easing:'cubic-bezier(.22,.7,.25,1)'}));
    }
    snapshot();
  }
  function clearGesture() {
    if (gesture && button.hasPointerCapture(gesture.id)) button.releasePointerCapture(gesture.id);
    gesture = null;
    portrait.style.removeProperty('--hair-ruffle');
    portrait.classList.remove('is-ruffling');
  }
  button.addEventListener('pointerdown',event => {
    if (event.button !== 0 || gesture) return;
    suppressClick = false;
    animations.forEach(animation => animation.cancel());
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
    if (!reduced.matches) portrait.style.setProperty('--hair-ruffle',`${Math.max(-2,Math.min(2,(event.clientX-gesture.start)/14))}deg`);
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
