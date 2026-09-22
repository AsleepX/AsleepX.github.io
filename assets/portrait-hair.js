import { hairstyles, restyledFace, nextHairstyle } from './portrait-hairstyles.js?v=1b69f7a9';

const portrait = document.querySelector('.portrait');
const svg = portrait?.querySelector('.portrait-live');
if (svg) {
  const ns = 'http://www.w3.org/2000/svg';
  const original = svg.querySelector('image');
  original.classList.add('portrait-original');
  const shirt = document.createElementNS(ns,'clipPath');
  shirt.id = 'portrait-shirt';
  shirt.innerHTML = '<path d="M524 843Q549 882 535 921L523 945Q506 932 514 910Q518 892 499 899Q466 906 450 946C361 965 256 1032 218 1088Q198 1120 229 1138C422 1204 853 1206 1037 1144Q1074 1135 1050 1091C1012 1027 916 990 839 957Q826 905 791 882Q775 873 758 884L758 813Z"/>';
  svg.querySelector('defs').append(shirt);
  const back = document.createElementNS(ns,'g');
  back.classList.add('hair-shape','hair-back','portrait-restyled');
  back.setAttribute('fill','#0b0c09');
  const face = document.createElementNS(ns,'g');
  face.classList.add('portrait-restyled');
  face.innerHTML = restyledFace;
  const front = document.createElementNS(ns,'g');
  front.classList.add('hair-shape','hair-front','portrait-restyled');
  front.setAttribute('fill','#0b0c09');
  const detail = document.createElementNS(ns,'g');
  detail.classList.add('hair-shape','portrait-restyled');
  detail.setAttribute('fill','white');
  original.before(back,face);
  original.after(front,detail);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hair-touch';
  button.setAttribute('aria-label','Ruffle hair to change hairstyle');
  button.setAttribute('aria-describedby','hair-hint');
  button.title = 'Swipe to restyle · Ruffle to surprise · Double-tap to reset';
  const hint = document.createElement('span');
  hint.className = 'hair-hint'; hint.id = 'hair-hint';
  hint.innerHTML = '<span class="hair-name">Original</span><span class="hair-instruction">Ruffle my hair ↔</span>';
  const status = document.createElement('span');
  status.className = 'hair-status'; status.setAttribute('role','status');
  portrait.append(button,hint,status);
  portrait.classList.add('has-hairstyles');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0, gesture = null, clickTimer = 0, suppressClick = false;
  let animations = [], revision = 0, snapshotURL = null;
  // A matching static snapshot also keeps no-motion rendering and the existing
  // portrait surface sampling aligned with the selected silhouette.
  const originalData = fetch('assets/me.png').then(r => {
    if (!r.ok) throw new Error('Portrait image unavailable');
    return r.blob();
  }).then(blob => new Promise((resolve,reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result);
    reader.onerror = reject; reader.readAsDataURL(blob);
  })).catch(() => null);
  async function snapshot() {
    const token = ++revision, fallback = portrait.querySelector('.portrait-fallback');
    if (!selected) { fallback.src = 'assets/me.png'; return; }
    const data = await originalData;
    if (!data || token !== revision) return;
    const copy = svg.cloneNode(true);
    copy.setAttribute('xmlns',ns); copy.setAttribute('width','1254'); copy.setAttribute('height','1254');
    copy.removeAttribute('class');
    copy.querySelector('.portrait-original').remove();
    copy.querySelector('.tongue').remove();
    copy.querySelectorAll('image').forEach(image => image.setAttribute('href',data));
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
    back.innerHTML = style.back ? `<path d="${style.back}"/>` : '';
    front.innerHTML = style.front ? `<path d="${style.front}"/>` : '';
    detail.innerHTML = style.detail ? `<path d="${style.detail}"/>` : '';
    portrait.dataset.hairstyle = style.id;
    hint.querySelector('.hair-name').textContent = style.name;
    if (announce) status.textContent = `${style.name} hairstyle. Swipe to change; double-tap to reset.`;
    try { localStorage.setItem('portrait-hairstyle',style.id); } catch { /* Storage is optional. */ }
    animations.forEach(animation => animation.cancel());
    if (!reduced.matches && announce) {
      animations = [...svg.querySelectorAll('.hair-shape')].map(layer => layer.animate([
        {transform:'rotate(-1.8deg)'},
        {transform:'rotate(.8deg)',offset:.45},
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
    if (!reduced.matches) portrait.style.setProperty('--hair-ruffle',`${Math.max(-5,Math.min(5,(event.clientX-gesture.start)/6))}deg`);
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
