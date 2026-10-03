// Join only adjacent fragments on the same line. Never bridge separate columns
// or collapse the gap between wrapped lines into a single highlighted box.
export function mergeMarkerRects(rects) {
  const result=[];
  const sorted=rects.filter(r=>r.width>.3&&r.height>1)
    .map(r=>({...r})).sort((a,b)=>a.y-b.y||a.x-b.x);
  for (const r of sorted) {
    const line=result.find(p=>{
      const overlap=Math.min(p.y+p.height,r.y+r.height)-Math.max(p.y,r.y);
      return overlap>=Math.min(p.height,r.height)*.82
        &&Math.max(p.height,r.height)<Math.min(p.height,r.height)*1.4
        &&r.x<=p.x+p.width+Math.min(7,r.height*.25)
        &&r.x+r.width>=p.x-1;
    });
    if (!line) result.push(r);
    else {
      const right=Math.max(line.x+line.width,r.x+r.width);
      const bottom=Math.max(line.y+line.height,r.y+r.height);
      line.x=Math.min(line.x,r.x); line.y=Math.min(line.y,r.y);
      line.width=right-line.x; line.height=bottom-line.y;
    }
  }
  return result;
}

function random(i,seed) {
  let n=Math.imul(i+seed*97,374761393);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function wave(x,seed) {
  const i=Math.floor(x),f=x-i,t=f*f*(3-2*f);
  return (random(i,seed)*(1-t)+random(i+1,seed)*t)*2-1;
}

export function drawMarkerStroke(ctx,rect,documentX=0,documentY=0) {
  const seed=Math.round((rect.y+documentY)*3+rect.height*7);
  const pad=Math.min(3.5,Math.max(1.2,rect.height*.07));
  const left=rect.x-pad,right=rect.x+rect.width+pad;
  const top=rect.y+rect.height*.18,height=rect.height*.70;
  const bottom=top+height,slant=Math.min(4,height*.14);
  const edge=Math.min(.95,Math.max(.4,height*.032));
  const count=Math.max(2,Math.ceil((right-left)/9));
  const outline=new Path2D();
  outline.moveTo(left+slant,top+.5);
  for (let i=1;i<=count;i++) {
    const x=left+slant+(right-left-slant)*i/count;
    outline.lineTo(x,top+wave((x+documentX)/14,seed)*edge);
  }
  outline.lineTo(right-slant*.45,bottom-.2);
  for (let i=count-1;i>=0;i--) {
    const x=left+(right-left-slant*.45)*i/count;
    outline.lineTo(x,bottom+wave((x+documentX)/19,seed+13)*edge);
  }
  outline.closePath();
  ctx.save();
  // A translucent, slightly feathered chisel-tip pass lets the paper show through.
  ctx.filter='blur(.45px)';
  ctx.fillStyle='rgba(250,226,48,.12)'; ctx.fill(outline);
  ctx.filter='none';
  const ink=ctx.createLinearGradient(0,top,0,bottom);
  ink.addColorStop(0,'rgba(250,227,54,.26)');
  ink.addColorStop(.13,'rgba(250,228,61,.44)');
  ink.addColorStop(.55,'rgba(250,226,48,.48)');
  ink.addColorStop(.86,'rgba(248,224,41,.46)');
  ink.addColorStop(1,'rgba(250,227,54,.28)');
  ctx.fillStyle=ink; ctx.fill(outline); ctx.clip(outline);
  // The nib leaves a few lengthwise streaks, with small dry gaps and denser ink.
  const fibres=Math.max(7,Math.ceil(height/1.6));
  for (let i=0;i<fibres;i++) {
    const y=top+(i+.25+random(i,seed)*.5)/fibres*height;
    const bend=wave((left+documentX)/41,seed+i)*.32;
    ctx.beginPath(); ctx.moveTo(left,y);
    ctx.bezierCurveTo(left+(right-left)*.32,y+bend,
      left+(right-left)*.71,y-bend,right,y+random(i,seed+3)*.2);
    ctx.lineWidth=.3+random(i,seed+7)*.5;
    const dry=random(i,seed+17)>.63;
    ctx.globalCompositeOperation=dry?'destination-out':'source-over';
    ctx.strokeStyle=dry?'rgba(0,0,0,.075)':'rgba(244,218,34,.055)';
    ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';
  // Slight pooling where the felt tip first touches and lifts from the sheet.
  const start=ctx.createLinearGradient(left,0,left+Math.min(13,(right-left)*.22),0);
  start.addColorStop(0,'rgba(242,216,33,.14)');
  start.addColorStop(1,'rgba(242,216,33,0)');
  ctx.fillStyle=start; ctx.fillRect(left,top,Math.min(13,(right-left)*.22),height);
  ctx.restore();
}
