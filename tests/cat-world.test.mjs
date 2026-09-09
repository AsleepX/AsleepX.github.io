import test from 'node:test';
import assert from 'node:assert/strict';
import { firstLanding, findRoute } from '../assets/cat-world.js';

test('falling lands on the first surface directly below, not adjacent text', () => {
  const surfaces = [
    { id:'text',left:0,right:80,y:100 },
    { id:'avatar',left:100,right:200,y:140 },
    { id:'home',left:0,right:300,y:300 },
  ];
  assert.equal(firstLanding(surfaces, 150, 50).id, 'avatar');
  assert.equal(firstLanding(surfaces, 150, 150).id, 'home');
});
test('return route uses intermediate text/platforms for a high climb', () => {
  const surfaces = [
    { id:'home',left:0,right:300,y:100 },
    { id:'text',left:40,right:250,y:280 },
    { id:'floor',left:0,right:300,y:470 },
  ];
  const path = findRoute(surfaces, {x:120,y:470,platform:'floor'}, 120);
  assert(path.some(p=>p.platform==='text'));
  assert.equal(path.at(-1).platform,'home');
  assert.equal(path.at(-1).x,120);
  for (const p of path) {
    const surface=surfaces.find(s=>s.id===p.platform);
    assert(p.x>=surface.left && p.x<=surface.right);
  }
});
test('divider can be reached from below and is not treated as a wall', () => {
  const surfaces=[{id:'home',left:0,right:300,y:100},{id:'text',left:0,right:300,y:240}];
  const path=findRoute(surfaces,{x:100,y:240,platform:'text'},100);
  assert.equal(path.at(-1).y,100);
});
test('same-platform shortest route is walking directly home', () => {
  const path=findRoute([{id:'home',left:0,right:300,y:100}],{x:30,y:100,platform:'home'},230);
  assert.deepEqual(path,[{x:230,y:100,platform:'home'}]);
});
test('descending onto an intermediate surface cannot pass through it', () => {
  const surfaces=[{id:'top',left:0,right:300,y:0},{id:'text',left:0,right:300,y:120},{id:'home',left:0,right:300,y:240}];
  const path=findRoute(surfaces,{x:100,y:0,platform:'top'},100);
  assert(path.some(p=>p.platform==='text'));
});
