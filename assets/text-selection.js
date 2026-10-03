import {mergeMarkerRects,drawMarkerStroke} from './marker-stroke.js?v=6b843fe0';

// Keep the browser's Selection untouched: keyboard selection, touch handles,
// accessibility and copying continue to operate on the original text nodes.
const layer=document.createElement('canvas');
layer.className='text-selection-marker';
layer.setAttribute('aria-hidden','true');
document.body.append(layer);
const context=layer.getContext('2d');
const forcedColours=matchMedia('(forced-colors: active)');
let frame=0,signature='';

function selectedRects(selection) {
  const rects=[];
  for (let i=0;i<selection.rangeCount;i++) {
    const selected=selection.getRangeAt(i);
    const root=selected.commonAncestorContainer;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node=root.nodeType===Node.TEXT_NODE?root:walker.nextNode();
    while (node) {
      const element=node.parentElement;
      if (node.textContent.trim()&&selected.intersectsNode(node)&&element
        &&!element.closest('script,style,svg,canvas,textarea,input,select,[contenteditable],dialog[open],[aria-hidden="true"],.hair-hint,.hair-status,.skip-link')) {
        const style=getComputedStyle(element);
        if (style.visibility!=='hidden'&&style.userSelect!=='none') {
          const start=selected.startContainer===node?selected.startOffset:0;
          const end=selected.endContainer===node?selected.endOffset:node.length;
          if (end>start) {
            const fragment=document.createRange();
            fragment.setStart(node,start); fragment.setEnd(node,end);
            for (const r of fragment.getClientRects()) rects.push({x:r.x,y:r.y,width:r.width,height:r.height});
          }
        }
      }
      node=walker.nextNode();
    }
  }
  return mergeMarkerRects(rects);
}

function clear() {
  document.documentElement.classList.remove('has-marker-selection');
  layer.hidden=true; signature='';
}
function render() {
  frame=0;
  const selection=getSelection();
  if (!context||forcedColours.matches||!selection||selection.isCollapsed||!selection.rangeCount
    ||document.querySelector('dialog[open]')
    ||document.activeElement?.matches('input,textarea,select,[contenteditable]')) return clear();
  const width=document.documentElement.clientWidth;
  // Store ink in document coordinates, so compositor scrolling moves it with
  // the text. A fixed viewport canvas repainted on scroll lags by a frame.
  const rects=selectedRects(selection).map(r=>({...r,x:r.x+scrollX,y:r.y+scrollY}));
  if (!rects.length) return clear();
  const top=Math.max(0,Math.floor(Math.min(...rects.map(r=>r.y))-4));
  const bottom=Math.ceil(Math.max(...rects.map(r=>r.y+r.height))+4);
  const height=Math.max(1,bottom-top);
  const scale=Math.min(devicePixelRatio||1,2);
  const next=[width,height,top,scale,...rects.flatMap(r=>[r.x,r.y,r.width,r.height])].join(',');
  if (next===signature) return;
  signature=next;
  const pixelWidth=Math.ceil(width*scale),pixelHeight=Math.ceil(height*scale);
  if (layer.width!==pixelWidth||layer.height!==pixelHeight) {
    layer.width=pixelWidth; layer.height=pixelHeight;
  }
  layer.style.top=`${top}px`;
  layer.style.width=`${width}px`; layer.style.height=`${height}px`;
  context.setTransform(scale,0,0,scale,0,-top*scale);
  context.clearRect(0,top,width,height);
  for (const rect of rects) drawMarkerStroke(context,rect);
  layer.hidden=false;
  document.documentElement.classList.add('has-marker-selection');
}
function schedule() { if (!frame) frame=requestAnimationFrame(render); }
document.addEventListener('selectionchange',schedule);
window.addEventListener('resize',schedule,{passive:true});
window.visualViewport?.addEventListener('resize',schedule,{passive:true});
forcedColours.addEventListener('change',schedule);
document.fonts?.addEventListener('loadingdone',schedule);
new ResizeObserver(schedule).observe(document.body);
clear();
