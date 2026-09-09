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
