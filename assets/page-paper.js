import {paperTexture,PAPER_SIZE} from './paper-texture.js?v=24fd34dc';

let currentScale=0,frame=0;
function render() {
  frame=0;
  const scale=Math.min(devicePixelRatio||1,2);
  if (scale===currentScale) return;
  const texture=paperTexture(scale),canvas=document.createElement('canvas');
  canvas.width=texture.width; canvas.height=texture.height;
  const context=canvas.getContext('2d',{alpha:false});
  if (!context) return;
  const image=context.createImageData(texture.width,texture.height);
  image.data.set(texture.data); context.putImageData(image,0,0);
  document.body.style.setProperty('--paper-texture',`url("${canvas.toDataURL()}")`);
  document.body.style.setProperty('--paper-tile-size',`${PAPER_SIZE}px`);
  currentScale=scale;
}
render();
window.addEventListener('resize',()=>{
  if (!frame) frame=requestAnimationFrame(render);
},{passive:true});
