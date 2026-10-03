// A fine, pressed writing-paper surface, generated locally rather than scanned.
// The weak colour variation and short fibres suggest smooth cream MD paper.
export const PAPER_SIZE=512;
export const PAPER_RGB=[250,248,239];
const cache=new Map();
const mod=(n,m)=>(n%m+m)%m;
function hash(x,y,seed) {
  let n=Math.imul(x+seed*97,374761393)^Math.imul(y+seed*31,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(x,y,cells,seed) {
  const u=x/PAPER_SIZE*cells,v=y/PAPER_SIZE*cells;
  const ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;
  const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=hash(mod(ix,cells),mod(iy,cells),seed);
  const b=hash(mod(ix+1,cells),mod(iy,cells),seed);
  const c=hash(mod(ix,cells),mod(iy+1,cells),seed);
  const d=hash(mod(ix+1,cells),mod(iy+1,cells),seed);
  return ((a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy)*2-1;
}

export function paperTexture(scale=1) {
  const size=Math.round(PAPER_SIZE*Math.min(2,Math.max(1,scale)));
  if (cache.has(size)) return cache.get(size);
  const density=size/PAPER_SIZE;
  const relief=new Float32Array(size*size);
  for (let py=0;py<size;py++) {
    const y=(py+.5)/density;
    for (let px=0;px<size;px++) {
      const x=(px+.5)/density;
      // Pulp formation at three scales, plus very fine surface tooth. All fields
      // wrap smoothly; there are no hard tile edges or conspicuous flecks.
      relief[py*size+px]=noise(x,y,4,11)*.42+noise(x,y,32,29)*.64
        +noise(x,y,128,43)*1.05+noise(x,y,512,71)*1.08;
    }
  }
  // Short, randomly oriented cellulose fibres. A bright lip and a weaker shade
  // give them shallow relief, rather than drawing dark hairs on top of the sheet.
  for (let f=0;f<5800;f++) {
    const x=hash(f,0,101)*PAPER_SIZE,y=hash(f,0,103)*PAPER_SIZE;
    const angle=hash(f,0,107)*Math.PI*2;
    const length=1.4+hash(f,0,109)*5.2;
    const bend=(hash(f,0,113)-.5)*.9;
    const strength=.3+hash(f,0,127)*1.2;
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const steps=Math.ceil(length*density*1.5);
    for (let step=0;step<=steps;step++) {
      const t=step/steps,curve=Math.sin(t*Math.PI)*bend;
      const cx=(x+dx*length*t-dy*curve)*density;
      const cy=(y+dy*length*t+dx*curve)*density;
      const ix=Math.floor(cx),iy=Math.floor(cy),fx=cx-ix,fy=cy-iy;
      const weight=Math.sin(t*Math.PI)*strength*.55;
      for (let oy=0;oy<2;oy++) for (let ox=0;ox<2;ox++) {
        const k=mod(iy+oy,size)*size+mod(ix+ox,size);
        const amount=weight*(ox?fx:1-fx)*(oy?fy:1-fy);
        relief[k]+=amount;
        const shadow=mod(iy+oy+1,size)*size+mod(ix+ox+1,size);
        relief[shadow]-=amount*.65;
      }
    }
  }
  const data=new Uint8ClampedArray(size*size*4);
  for (let i=0;i<relief.length;i++) {
    const variation=relief[i];
    data[i*4]=PAPER_RGB[0]+variation;
    data[i*4+1]=PAPER_RGB[1]+variation;
    data[i*4+2]=PAPER_RGB[2]+variation*1.08;
    data[i*4+3]=255;
  }
  const texture={width:size,height:size,data,scale:density};
  cache.set(size,texture);
  return texture;
}

// Match the paper's document coordinates at the overlapping footer edge.
export function paperPixelIndex(texture,x,y) {
  return (mod(Math.floor(y*texture.scale),texture.height)*texture.width
    +mod(Math.floor(x*texture.scale),texture.width))*4;
}
