import {paintWoodPanel} from './wood-panel.js?v=407b7883';

const footer=document.querySelector('.footer--wood');
if (footer) {
  const canvas=document.createElement('canvas');
  canvas.className='footer-wood';
  canvas.setAttribute('aria-hidden','true');
  footer.prepend(canvas);
  let frame=0,visible=false,width=0,height=0,scale=0,originX=0,originY=0;
  function render() {
    frame=0;
    if (!visible) return;
    const rect=footer.getBoundingClientRect();
    const nextScale=Math.min(devicePixelRatio||1,2);
    const nextX=rect.left+scrollX,nextY=rect.top+scrollY;
    if (rect.width<=0 || rect.height<=0 || (width===rect.width && height===rect.height && scale===nextScale && originX===nextX && originY===nextY)) return;
    width=rect.width; height=rect.height; scale=nextScale;
    originX=nextX; originY=nextY;
    paintWoodPanel(canvas,width,height,scale,{x:originX,y:originY});
    footer.classList.add('has-wood');
  }
  function schedule() { if (visible && !frame) frame=requestAnimationFrame(render); }
  new ResizeObserver(schedule).observe(footer);
  new ResizeObserver(schedule).observe(document.body);
  new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if (visible) schedule();
  },{rootMargin:'180px'}).observe(footer);
  window.addEventListener('resize',schedule,{passive:true});
}
