import { containedPhotoRect, mapPhotoCat } from './cat-photo-view.js?v=ced79417';

(() => {
  const links = [...document.querySelectorAll('.photo-link')];
  const dialog = document.querySelector('.photo-lightbox');
  if (!dialog || !links.length) return;
  const image = dialog.querySelector('.photo-full');
  const cat = document.querySelector('.cat');
  const stage = dialog.querySelector('.photo-cat-stage');
  const projection = dialog.querySelector('.photo-cat');
  let mirrorFrame = 0;
  let index = 0, opener, savedOverflow;
  function mirrorCat() {
    mirrorFrame = 0;
    if (!dialog.open) return;
    const source = links[index].querySelector('img');
    const target = containedPhotoRect(image.getBoundingClientRect(), source.naturalWidth, source.naturalHeight);
    if (cat && target && !cat.hidden && cat.classList.contains('is-roaming')) {
      const mapped = mapPhotoCat(source.getBoundingClientRect(), target, cat.getBoundingClientRect());
      stage.hidden = !mapped?.visible;
      if (mapped?.visible) {
        const bounds = dialog.getBoundingClientRect();
        Object.assign(stage.style, {
          left:`${target.left-bounds.left}px`,top:`${target.top-bounds.top}px`,
          width:`${target.width}px`,height:`${target.height}px`,
        });
        projection.style.transform = `translate(${mapped.x}px, ${mapped.y}px) scale(${mapped.scale})`;
        projection.style.setProperty('--cat-direction', getComputedStyle(cat).getPropertyValue('--cat-direction') || '1');
        // Mirror the live rig, including paws, head, tail, and jump poses.
        projection.replaceChildren(cat.querySelector('svg').cloneNode(true));
      }
    } else stage.hidden = true;
    mirrorFrame = requestAnimationFrame(mirrorCat);
  }
  function show(next) {
    index = (next + links.length) % links.length;
    image.src = links[index].href;
    image.alt = links[index].querySelector('img').alt;
    dialog.querySelector('.photo-counter').textContent = `${index + 1} / ${links.length}`;
    stage.hidden = true;
  }
  links.forEach((link, i) => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    show(i);
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    cancelAnimationFrame(mirrorFrame);
    mirrorFrame = requestAnimationFrame(mirrorCat);
  }));
  dialog.querySelector('.photo-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.photo-previous').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.photo-next').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(mirrorFrame);
    mirrorFrame = 0;
    stage.hidden = true;
    projection.replaceChildren();
    document.body.style.overflow = savedOverflow;
    opener?.focus({preventScroll:true});
  });
})();
