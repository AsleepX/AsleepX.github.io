// Solid oak, sampled in each plank's own grain coordinates. No bitmap assets.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
function hash(x,y,seed=0) {
  let n=Math.imul(x+seed*97,374761393)^Math.imul(y+seed*31,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(x,y,seed) {
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
  return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),fx),
    mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),fx),fy)*2-1;
}

// The panel is cropped at the page edges, not drawn as a separate tabletop.
const angle=-14*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
const boardWidth=76;
function makeBoard(row,index,start,length) {
  const seed=173+row*313+index*53;
  const random=salt=>hash(index,row,seed+salt);
  const center=length*(.18+random(1)*.65);
  const columns=[];
  // Cache low-frequency longitudinal variation; subpixel interpolation keeps
  // the diagonal grain smooth at different display densities.
  for (let u=0;u<=Math.ceil(length)+1;u++) columns.push({
    bend:noise(u*.007,0,seed)*3.2+noise(u*.027,0,seed+1)*.65,
    wash:noise(u*.003,0,seed+2)*5.5+noise(u*.023,0,seed+3)*1.3,
  });
  return {seed,start,length,columns,center,
    pith:random(2)<.38 ? -3+random(3)*16
      : (random(2)>.65 ? boardWidth+18+random(3)*40 : -18-random(3)*40),
    depth:14+random(21)*24,
    stretch:5+random(4)*7,spacing:3.3+random(5)*2.8,
    cathedral:random(6)>.23,tone:(random(7)-.5)*23,hue:(random(8)-.5)*5,
    knot:random(9)>.69 ? {x:length*(.15+random(10)*.70),y:boardWidth*(.22+random(11)*.56),rx:13+random(12)*13,ry:3.5+random(13)*3.8} : null,
  };
}
export function woodBoards(width,height) {
  const rows=[],minV=0,maxV=-width*sin+height*cos;
  const minU=height*sin,maxU=width*cos;
  for (let row=Math.floor(minV/boardWidth);row<=Math.floor(maxV/boardWidth);row++) {
    const length=240+hash(row,0,31)*120;
    const offset=hash(row,0,43)*length;
    const first=Math.floor((minU+offset)/length),last=Math.floor((maxU+offset)/length);
    const boards=[];
    for (let i=first;i<=last;i++) boards.push(makeBoard(row,i,i*length-offset,length));
    rows.push({row,length,offset,first,boards});
  }
  return rows;
}

export function createWoodTexture(width,height,scale=1) {
  const pixelWidth=Math.ceil(width*scale),pixelHeight=Math.ceil(height*scale);
  const image={width:pixelWidth,height:pixelHeight,data:new Uint8ClampedArray(pixelWidth*pixelHeight*4)};
  const rows=woodBoards(width,height),pixels=image.data;
  for (let py=0;py<pixelHeight;py++) {
    const y=(py+.5)/scale;
    for (let px=0;px<pixelWidth;px++) {
      const x=(px+.5)/scale;
      const along=x*cos+y*sin,across=-x*sin+y*cos;
      const row=Math.min(rows.length-1,Math.floor(across/boardWidth)),course=rows[row];
      const index=Math.floor((along+course.offset)/course.length)-course.first;
      const b=course.boards[clamp(index,0,course.boards.length-1)];
      const u=clamp(along-b.start,0,b.length),v=across-row*boardWidth;
      const column=Math.floor(u),fraction=u-column;
      const bend=mix(b.columns[column].bend,b.columns[column+1].bend,fraction);
      const wash=mix(b.columns[column].wash,b.columns[column+1].wash,fraction);
      let transverse=v-b.pith+bend;
      let knotCore=0,knotHalo=0,split=0;
      if (b.knot) {
        const kx=(u-b.knot.x)/b.knot.rx,ky=(v-b.knot.y)/b.knot.ry;
        const radius=Math.sqrt(kx*kx+ky*ky);
        // Grain diverts around the branch. No isolated circular decal.
        transverse+=Math.tanh(ky)*7*Math.exp(-kx*kx*.13-ky*ky*.1);
        knotCore=Math.exp(-radius*radius*2.1)*36;
        knotHalo=Math.pow(.5+.5*Math.sin(radius*24+noise(u*.25,v*.5,b.seed)*1.1),5)
          *Math.exp(-radius*radius*.6)*13;
        split=Math.exp(-Math.pow((ky+.09*Math.sin(kx*9))/.055,2))
          *Math.exp(-kx*kx*2.2)*22;
      }
      const radial=(u-b.center)/b.stretch;
      const grain=b.cathedral ? Math.sqrt(radial*radial+transverse*transverse+b.depth*b.depth) : transverse;
      const phase=grain/b.spacing+noise(grain*.045,0,b.seed+7)*1.3
        +noise(u*.009,v*.058,b.seed+8)*.20;
      const year=Math.floor(phase),cycle=phase-year;
      const ringWidth=.04+hash(year,0,b.seed+9)*.085;
      const latewood=Math.exp(-Math.pow((cycle-.81)/ringWidth,2))
        *(.4+hash(year,0,b.seed+10)*.9)*(.72+noise(u*.017,year,b.seed+11)*.30);
      const earlywood=Math.sin(cycle*Math.PI)*1.5;
      const ringShoulder=Math.exp(-Math.pow((cycle-.76)/.17,2))
        *(.2+hash(year,0,b.seed+22)*.8)*4;
      // Fine open vessels run with the fibres. Their lengths, spacing and depth
      // vary independently, with more pores in the early part of each ring.
      // Keep vessel width physical near the pith, where a radial coordinate
      // alone would stretch a tiny pore into a broad, mirrored dash.
      const vesselGrain=v+bend+radial*.09;
      const cellY=Math.floor(vesselGrain/1.05);
      const vesselAlong=u/6+hash(cellY,0,b.seed+24)*.95;
      const cellX=Math.floor(vesselAlong);
      const vessel=hash(cellX,cellY,b.seed+12);
      const localX=vesselAlong-cellX,localY=vesselGrain/1.05-cellY;
      const poreX=.1+hash(cellX,cellY,b.seed+13)*.8;
      const poreY=.1+hash(cellX,cellY,b.seed+14)*.8;
      const poreWidth=.04+vessel*.09;
      const pore=vessel>.59 ? Math.exp(-Math.pow((localX-poreX)/(.12+vessel*.28),4)
        -Math.pow((localY-poreY)/poreWidth,2))*(.55+.45*Math.sin(cycle*Math.PI)) : 0;
      const poreLip=vessel>.59 ? Math.exp(-Math.pow((localX-poreX)/(.12+vessel*.28),4)
        -Math.pow((localY-poreY+poreWidth*1.1)/(poreWidth*.6),2))*2.3 : 0;
      const fibres=noise(u*.075,grain*2.7,b.seed+15)*3.6;
      const dust=noise(u*.7,grain*6,b.seed+16)*1.8;
      const mottling=noise(u*.013,v*.08,b.seed+17)*3.1+noise(u*.0025,v*.038,b.seed+23)*6;
      // Sparse medullary rays appear as short satin flecks across the grain.
      const rayX=Math.floor(u/24),rayY=Math.floor(v/12),raySeed=hash(rayX,rayY,b.seed+18);
      const ray=raySeed>.86 ? Math.exp(-Math.pow((u/24-rayX-.5)/.019,2)
        -Math.pow((v/12-rayY-.5)/.33,4))*4 : 0;
      const upper=v+.10*noise(u*.12,0,b.seed+19);
      const lower=boardWidth-v+.08*noise(u*.13,0,b.seed+20);
      const end=Math.min(u,b.length-u);
      const edge=Math.min(upper,lower,end);
      // A narrow, irregular recessed seam and opposing rounded bevels create
      // actual directional relief without a heavy outline around the panel.
      const bevel=8*Math.exp(-Math.pow((upper-1.8)/1.1,2))
        -13*Math.exp(-Math.pow((lower-1.8)/1.2,2));
      const joint=edge<.52 ? 57*(1-.25*edge/.52) : 12*Math.exp(-(edge-.52)/.8);
      const bodyLight=Math.sin(v/boardWidth*Math.PI)*1.5;
      const variation=b.tone+wash+earlywood+fibres+dust+mottling+ray+bodyLight
        +bevel+poreLip-joint-knotCore-knotHalo-split-ringShoulder-pore*(19+vessel*13);
      const i=(py*pixelWidth+px)*4;
      pixels[i]=clamp(204+variation-latewood*20+b.hue,0,255);
      pixels[i+1]=clamp(189+variation-latewood*25+b.hue*.25,0,255);
      pixels[i+2]=clamp(165+variation-latewood*27-b.hue*.4,0,255);
      pixels[i+3]=255;
    }
  }
  return image;
}
