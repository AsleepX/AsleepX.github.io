// Hand-traced support edges for these photographs, in normalized image coordinates.
// Each polyline follows an object, rather than treating the whole image as solid.
export const photoScenes = {
  'quiet-room': [
    ['refrigerator', [[0,.313],[.12,.314],[.215,.317],[.247,.365]]],
    ['fridge-door', [[.252,.351],[.343,.347],[.42,.344]]],
    ['table', [[.433,.706],[.492,.685],[.57,.699],[.643,.694],[.675,.705]]],
    ['chair-back', [[.699,.625],[.719,.618],[.757,.63]]],
    ['chair-seat', [[.677,.809],[.701,.806],[.749,.839]]],
    ['window-sill', [[.764,.623],[.843,.64],[.93,.652],[1,.662]]],
    ['floor', [[.26,.92],[.39,.884],[.55,.918],[.71,.918],[.86,.934],[1,.955]]],
  ],
  'passing-cat': [
    ['chair-back', [[.155,.324],[.182,.281],[.22,.258],[.263,.25],[.30,.257],[.338,.283],[.367,.326],[.382,.366]]],
    ['chair-seat', [[.046,.592],[.15,.588],[.247,.593],[.34,.609]]],
    ['window-sill', [[.451,.523],[.585,.525],[.719,.522],[.802,.518]]],
    ['ground', [[0,.96],[.18,.925],[.4,.918],[.6,.94],[.82,.932],[1,.957]]],
  ],
  'open-sky': [
    ['left-roof', [[0,.396],[.06,.397],[.15,.398],[.192,.40],[.206,.452]]],
    ['left-trees', [[0,.519],[.035,.493],[.09,.514],[.132,.524],[.157,.577],[.19,.564]]],
    ['tall-tree', [[.202,.548],[.219,.45],[.245,.398],[.267,.357],[.282,.376],[.295,.432],[.313,.523],[.338,.56]]],
    ['middle-trees', [[.315,.682],[.355,.644],[.401,.635],[.44,.624],[.474,.64],[.517,.639],[.545,.606],[.58,.604],[.617,.607],[.65,.575],[.686,.584],[.717,.63]]],
    ['right-tree', [[.701,.446],[.72,.334],[.743,.249],[.77,.218],[.794,.239],[.817,.22],[.843,.256],[.866,.316],[.897,.347],[.916,.425]]],
    ['right-roof', [[.875,.151],[.906,.124],[1,.129]]],
    ['lawn', [[0,.823],[.18,.814],[.35,.792],[.5,.806],[.68,.806],[.85,.816],[1,.824]]],
  ],
};

export function photoPlatforms(scene, rect) {
  if (!photoScenes[scene] || rect.width <= 0 || rect.height <= 0) return [];
  const prefix = `photo-${scene}`;
  const result = [
    {id:`${prefix}-edge`,left:rect.left,right:rect.left+rect.width,y:rect.top,photo:scene},
    {id:`${prefix}-bottom`,left:rect.left,right:rect.left+rect.width,y:rect.top+rect.height,photo:scene},
  ];
  for (const [name, points] of photoScenes[scene]) {
    const left = rect.left + points[0][0] * rect.width;
    const right = rect.left + points.at(-1)[0] * rect.width;
    const contour = new Float64Array(Math.ceil(right-left)+1);
    let segment = 0;
    for (let i=0; i<contour.length; i++) {
      const x = Math.min(points.at(-1)[0], (left+i-rect.left)/rect.width);
      while (segment < points.length-2 && x > points[segment+1][0]) segment++;
      const a=points[segment], b=points[segment+1];
      const t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));
      contour[i]=rect.top+(a[1]+(b[1]-a[1])*t)*rect.height;
    }
    result.push({id:`${prefix}-${name}`,left,right,y:Math.min(...contour),profileLeft:left,contour,photo:scene});
  }
  return result;
}
