// Portrait coordinates match the unchanged 1254 x 1254 source artwork.
// These are anchors, not cutouts: displacement eases to zero around each one.
const SIZE = 1254;
export const HAIR_MAP_SCALE = 64;
const FACE = [[350,545],[368,505],[370,470],[440,473],[530,486],[637,481],[708,460],[799,460],[824,509],[837,553],[834,642],[828,695],[818,728],[795,766],[760,805],[716,839],[656,870],[619,878],[586,873],[542,855],[492,829],[441,792],[406,745],[377,686],[351,622]];
const EAR = [[864,544],[892,531],[916,544],[923,566],[914,603],[889,635],[861,655]];
const NECK = [[515,830],[550,853],[620,880],[686,856],[756,810],[752,878],[763,923],[769,948],[690,1020],[625,1160],[553,1032],[517,963],[532,919]];
const CLOTHES = [[0,985],[335,985],[375,970],[404,960],[435,950],[467,940],[478,908],[497,882],[530,866],[748,855],[783,854],[816,872],[837,899],[846,923],[866,942],[941,965],[1018,985],[1254,985],[1254,1254],[0,1254]];

function distanceToPolygon(x,y,polygon) {
  let inside = false, nearestSquared = Infinity;
  for (let i=0,j=polygon.length-1; i<polygon.length; j=i++) {
    const [ax,ay] = polygon[j], [bx,by] = polygon[i];
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside = !inside;
    const vx = bx-ax, vy = by-ay;
    const t = Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/(vx*vx+vy*vy)));
    const dx = x-ax-t*vx, dy = y-ay-t*vy;
    nearestSquared = Math.min(nearestSquared,dx*dx+dy*dy);
  }
  const distance = Math.sqrt(nearestSquared);
  return inside ? -distance : distance;
}
function smooth(value) {
  const t = Math.max(0,Math.min(1,value));
  return t*t*(3-2*t);
}
function motionDistance(x,y) {
  return Math.min(
    distanceToPolygon(x,y,FACE)-9,
    distanceToPolygon(x,y,EAR)-12,
    distanceToPolygon(x,y,NECK)-5,
    distanceToPolygon(x,y,CLOTHES)-9,
  );
}
function displacement(x,y,distance) {
  const weight = smooth(distance/48)*smooth(Math.min(x,y,SIZE-x,SIZE-y)/32);
  // Inverse sampling for a two-degree ruffle; the runtime scales both directions.
  const radians = Math.PI/90;
  return [(y-460)*radians*weight,-(x-627)*radians*weight];
}
export function hairDisplacementAt(x,y) {
  return displacement(x,y,motionDistance(x,y));
}
export function createHairDisplacementPixels(size=628) {
  const data = new Uint8ClampedArray(size*size*4);
  const mask = new Uint8ClampedArray(size*size*4);
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const px = (x+.5)*SIZE/size, py = (y+.5)*SIZE/size;
    const distance = motionDistance(px,py), [dx,dy] = displacement(px,py,distance);
    const i = (y*size+x)*4;
    data[i] = 128+dx*254/HAIR_MAP_SCALE;
    data[i+1] = 128+dy*254/HAIR_MAP_SCALE;
    data[i+2] = 128; data[i+3] = 255;
    // The exact original remains visible on the anchors. The opaque moving
    // source takes over while its displacement is still below a quarter pixel.
    const opacity = Math.round(smooth(distance/4)*255);
    mask[i] = mask[i+1] = mask[i+2] = opacity; mask[i+3] = 255;
  }
  return {data,mask,width:size,height:size};
}
