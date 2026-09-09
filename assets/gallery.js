(() => {
  const links = [...document.querySelectorAll('.photo-link')];
  const dialog = document.querySelector('.photo-lightbox');
  if (!dialog || !links.length) return;
  const image = dialog.querySelector('.photo-full');
  let index = 0, opener, savedOverflow;
  function show(next) {
    index = (next + links.length) % links.length;
    image.src = links[index].href;
    image.alt = links[index].querySelector('img').alt;
    dialog.querySelector('.photo-counter').textContent = `${index + 1} / ${links.length}`;
  }
  links.forEach((link, i) => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    show(i);
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
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
    document.body.style.overflow = savedOverflow;
    opener?.focus({preventScroll:true});
  });
})();
