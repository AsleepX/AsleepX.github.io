import test from 'node:test';
import assert from 'node:assert/strict';
import {photoPlatforms, photoScenes} from '../assets/cat-photo-world.js';
import {firstLanding, findRoute, standingHeight} from '../assets/cat-world.js';

const rect = {left:50,top:500,width:360,height:240};
test('drops above a photo land on its edge; drops inside land on objects', () => {
  const platforms = photoPlatforms('quiet-room',rect);
  assert.equal(firstLanding(platforms,100,480).id,'photo-quiet-room-edge');
  assert.equal(firstLanding(platforms,100,530).id,'photo-quiet-room-refrigerator');
  assert.equal(firstLanding(platforms,250,630).id,'photo-quiet-room-table');
  assert.equal(firstLanding(platforms,300,700).id,'photo-quiet-room-floor');
});

test('chair backs and trees supply different heights along their contours', () => {
  const chair = photoPlatforms('passing-cat',rect).find(p=>p.id.endsWith('chair-back'));
  const tree = photoPlatforms('open-sky',rect).find(p=>p.id.endsWith('right-tree'));
  assert(new Set(chair.contour).size>10);
  assert(new Set(tree.contour).size>10);
});

test('the white doorframe bottom is not a standing surface', () => {
  const platforms = photoPlatforms('passing-cat', rect);
  assert(!platforms.some(p => p.id.includes('doorstep')));
  const landing = firstLanding(platforms, rect.left + rect.width * .22, rect.top + rect.height * .70);
  assert.equal(landing.id, 'photo-passing-cat-ground');
});

test('chair left arc follows the photographed tube rather than the space above it', () => {
  const platforms = photoPlatforms('passing-cat',{left:0,top:0,width:2200,height:1650});
  const chair = platforms.find(p=>p.id.endsWith('chair-back'));
  assert.equal(chair.left,352);
  // At x=.18 the real left tube is below y=.325, not at the old y≈.28.
  const landing = firstLanding(platforms,2200*.18,1650*.31);
  assert.equal(landing.id,'photo-passing-cat-chair-back');
  assert(landing.y>1650*.325 && landing.y<1650*.35);
  // Preserve the previously aligned right side.
  const rightY = chair.contour[Math.round(2200*.367-chair.profileLeft)];
  assert(Math.abs(rightY-1650*.326)<1);
});

test('support points track responsive image scaling and document position', () => {
  const a = photoPlatforms('quiet-room',rect).find(p=>p.id.endsWith('fridge-door'));
  const b = photoPlatforms('quiet-room',{left:100,top:800,width:720,height:480}).find(p=>p.id.endsWith('fridge-door'));
  assert.equal(b.left-100,2*(a.left-50));
  assert(Math.abs((b.y-800)-2*(a.y-500))<1);
  assert.deepEqual(photoPlatforms('unknown',rect),[]);
});

test('every pictured object can route back through the photo edge to the page', () => {
  for (const scene of Object.keys(photoScenes)) {
    const surfaces = [...photoPlatforms(scene,rect),{id:'home',left:0,right:500,y:380}];
    for (const p of surfaces.filter(p=>p.photo)) {
      const x=(p.left+p.right)/2;
      const start={x,y:standingHeight(p,x),platform:p.id};
      const route=findRoute(surfaces,start,260);
      assert.equal(route.at(-1)?.platform,'home',p.id);
      let from=start;
      for (const to of route) {
        if (from.platform!==to.platform) assert(Math.abs(to.x-from.x)<=96);
        from=to;
      }
    }
  }
});
