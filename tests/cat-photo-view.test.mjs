import test from 'node:test';
import assert from 'node:assert/strict';
import {containedPhotoRect, mapPhotoCat} from '../assets/cat-photo-view.js';

test('photo mapping excludes the lightbox letterboxing', () => {
  assert.deepEqual(containedPhotoRect({left:40,top:60,width:800,height:600},3,2),
    {left:40,top:60+(600-800*2/3)/2,width:800,height:800*2/3});
  assert.deepEqual(containedPhotoRect({left:20,top:40,width:900,height:600},1,1),
    {left:170,top:40,width:600,height:600});
});

test('live cat position, body size and movement use the same photograph scale', () => {
  const source={left:100,top:500,width:200,height:150};
  const target={left:40,top:120,width:800,height:600};
  const cat={left:130,top:540,width:56,height:44};
  assert.deepEqual(mapPhotoCat(source,target,cat),{x:120,y:160,scale:4,visible:true});
  const moved=mapPhotoCat(source,target,{...cat,left:140,top:535});
  assert.equal(moved.x,160);
  assert.equal(moved.y,140);
});

test('the projection disappears once the cat has jumped outside the photo', () => {
  const source={left:100,top:500,width:200,height:150};
  const target={left:0,top:0,width:800,height:600};
  assert.equal(mapPhotoCat(source,target,{left:150,top:450,width:56,height:44}).visible,false);
  assert.equal(mapPhotoCat(source,target,{left:150,top:475,width:56,height:44}).visible,true);
});
