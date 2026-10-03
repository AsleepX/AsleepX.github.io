import {createWoodTexture} from './wood-texture.js?v=f29167d3';
import {overlayPaperEdge} from './paper-edge.js?v=049ec4db';

// The boards, grain and their lighting share the same diagonal coordinates.
export function paintWoodPanel(canvas,width,height,scale=1,paperOrigin={x:0,y:0}) {
  canvas.width=Math.ceil(width*scale); canvas.height=Math.ceil(height*scale);
  const context=canvas.getContext('2d',{alpha:false});
  if (!context) return;
  const wood=createWoodTexture(width,height,scale);
  const image=context.createImageData(wood.width,wood.height);
  image.data.set(wood.data);
  overlayPaperEdge(image,scale,paperOrigin);
  context.putImageData(image,0,0);
}
