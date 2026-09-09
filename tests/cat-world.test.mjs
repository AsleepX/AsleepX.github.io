import test from 'node:test';
import assert from 'node:assert/strict';
import { firstLanding, findRoute } from '../assets/cat-world.js';
import { scanContour, contactAt, standingHeight } from '../assets/cat-surfaces.js';
import { groundedPaw } from '../assets/cat-pose.js';

test('steep terrain never stretches a leg beyond its normal reach', () => {
  const root = {x:20, y:26};
  for (let dx = -60; dx <= 60; dx += 2) {
    for (let dy = -80; dy <= 100; dy += 2) {
      const paw = groundedPaw(root, {x:root.x+dx, y:root.y+dy});
      assert(Math.hypot(paw.x-root.x, paw.y-root.y) <= 17.00001);
    }
  }
  assert.deepEqual(groundedPaw(root, {x:20,y:40}), {x:20,y:40});
  assert.deepEqual(groundedPaw(root, {x:20,y:100}), {x:20,y:39});
});

test('ink sampling keeps individual glyph heights and empty columns', () => {
  const rgba = new Uint8ClampedArray(8 * 8 * 4);
  for (const [x, y] of [[0, 1], [1, 1], [5, 4], [6, 3], [7, 4]]) rgba[(y * 8 + x) * 4 + 3] = 255;
  const surface = scanContour(rgba, 8, 8, 1, 20, 100);
  assert.equal(surface.contour[0], 101);
  assert.equal(surface.contour[5], 104);
  assert(Number.isNaN(surface.contour[3]));
  assert.equal(contactAt(surface, 23, 0), null);
});

test('avatar contour ignores opaque white background', () => {
  const rgba = new Uint8ClampedArray(4 * 4 * 4).fill(255);
  rgba.set([0, 0, 0, 255], (2 * 4 + 1) * 4);
  const surface = scanContour(rgba, 4, 4, 2, 0, 50, true);
  assert.equal(surface.contour[0], 51);
  assert(Number.isNaN(surface.contour[1]));
});

test('separate shoulder layers catch drops below hair on either side', () => {
  const rgba = new Uint8ClampedArray(80*80*4).fill(255);
  const ink = (x,y) => rgba.set([0,0,0,255],(y*80+x)*4);
  for (let x=10;x<70;x++) ink(x,10);
  for (let x=14;x<34;x++) ink(x,66-Math.floor((x-14)/5));
  for (let x=50;x<68;x++) ink(x,63+Math.floor((x-50)/5));
  const hair = {id:'portrait',...scanContour(rgba,80,80,1,100,100,true)};
  const left = {id:'left',...scanContour(rgba,80,80,1,100,100,true,{left:13,right:35,top:59,bottom:76})};
  const right = {id:'right',...scanContour(rgba,80,80,1,100,100,true,{left:50,right:68,top:59,bottom:76})};
  const platforms=[hair,left,right,{id:'home',left:100,right:180,y:220}];
  assert.equal(firstLanding(platforms,124,135).id,'left');
  assert.equal(firstLanding(platforms,159,135).id,'right');
  assert.equal(firstLanding(platforms,140,135).id,'home');
  assert.equal(firstLanding(platforms,124,90).id,'portrait');
  for (const p of [left,right]) {
    const x=(p.left+p.right)/2;
    assert.equal(findRoute(platforms,{x,y:standingHeight(p,x),platform:p.id},140).at(-1)?.platform,'home');
  }
});

test('landing and independent paw contacts follow local curves rather than the highest point', () => {
  const contour = Float64Array.from({length:100}, (_, x) => 100 + x / 2);
  const surface = {id:'glyph',left:0,right:99,y:100,profileLeft:0,contour};
  const rear = contactAt(surface, 30), front = contactAt(surface, 51);
  assert.equal(front.y - rear.y, 10.5);
  assert.equal(standingHeight(surface, 40.5), 120.25);
  assert.equal(firstLanding([surface], 40.5, 110).y, 120.25);
});

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

test('horizontal jump cap also applies to fallback routes; travel uses walking', () => {
  const surfaces=[{id:'home',left:0,right:500,y:100},{id:'floor',left:0,right:500,y:240}];
  let from={x:30,y:240,platform:'floor'};
  const path=findRoute(surfaces,from,450);
  assert(path.length>1);
  for(const to of path) {
    if(from.platform!==to.platform) assert(Math.abs(to.x-from.x)<=96);
    from=to;
  }
  assert.equal(from.x,450);
  assert.equal(from.platform,'home');
});
