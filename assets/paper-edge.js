import {paperTexture,paperPixelIndex} from './paper-texture.js?v=24fd34dc';

// One restrained, non-repeating paper profile for rendering and paw contact.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function noise(x,seed) {
  const hash=i=>{
    let n=Math.imul(i+seed*97,374761393);
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967295*2-1;
  };
  const i=Math.floor(x),f=x-i,t=f*f*(3-2*f);
  return hash(i)*(1-t)+hash(i+1)*t;
}
export function paperEdgeAt(x) {
  return 6.8+noise(x/94,7)*1.65+noise(x/27,23)*.85
    +noise(x/6.8,39)*.34+noise(x/1.6,53)*.13;
}

export function overlayPaperEdge(image,scale=1,origin={x:0,y:0}) {
  const {width,height,data}=image;
  const texture=paperTexture(scale);
  // Beyond 27 CSS pixels the shadow is imperceptible; leave the wood untouched.
  const lastRow=Math.min(height,Math.ceil(27*scale));
  for (let px=0;px<width;px++) {
    const x=(px+.5)/scale,edge=paperEdgeAt(x);
    const castEdge=paperEdgeAt(x-.8)+.65;
    const lift=.85+(noise(x/117,61)+1)*.22;
    for (let py=0;py<lastRow;py++) {
      const y=(py+.5)/scale,d=y-edge,i=(py*width+px)*4;
      // Subpixel coverage keeps the tiny torn fibres soft on standard displays.
      const paper=clamp(.5-d*scale,0,1);
      const distance=Math.max(0,y-castEdge);
      const shadow=.13*Math.exp(-distance/(1.05*lift))
        +.065*Math.exp(-distance/(3.2*lift));
      const rim=Math.exp(-Math.pow((d+.3)/.45,2));
      const texel=paper ? paperPixelIndex(texture,x+origin.x,y+origin.y) : 0;
      for (let c=0;c<3;c++) {
        const timber=data[i+c]*(1-shadow);
        const sheet=texture.data[texel+c]-rim*(c===2 ? 7 : 5);
        data[i+c]=timber*(1-paper)+sheet*paper;
      }
    }
  }
}
