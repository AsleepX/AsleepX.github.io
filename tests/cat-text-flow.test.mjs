import test from 'node:test';
import assert from 'node:assert/strict';
import { glyphOffsets, springStep } from '../assets/cat-text-flow.js';

const letter = (left,top=2,width=6,height=10) => ({left,right:left+width,top,bottom:top+height});

test('only letters at the cat move; the rest of the line stays anchored', () => {
  const letters=[letter(10),letter(42),letter(54),letter(70),letter(150)];
  assert.deepEqual(glyphOffsets(letters,{left:40,right:62,top:0,bottom:20}),[0,-12,-12,0,0]);
});

test('moving right restores passed letters instead of accumulating displacement', () => {
  const letters=[letter(10),letter(42),letter(54),letter(80),letter(150)];
  const original=structuredClone(letters);
  glyphOffsets(letters,{left:40,right:62,top:0,bottom:20});
  assert.deepEqual(glyphOffsets(letters,{left:78,right:90,top:0,bottom:20}),[0,0,0,-12,0]);
  assert.deepEqual(glyphOffsets(letters,{left:250,right:270,top:0,bottom:20}),[0,0,0,0,0]);
  assert.deepEqual(letters,original);
});

test('adjacent letters of one word are independent collision units', () => {
  assert.deepEqual(glyphOffsets([letter(0,2,12),letter(13,2,3),letter(17,2,9)],{left:14,right:16,top:0,bottom:20}),[0,-12,0]);
});

test('neighboring lines may overlap instead of forcing a letter to leap over them', () => {
  const cat = {left:40,right:60,top:0,bottom:20};
  assert.deepEqual(glyphOffsets([letter(42,-15),letter(42)],cat),[0,-12]);
  assert.equal(glyphOffsets([letter(42)],cat)[0],-12);
});

test('large letters collide with painted strokes, not empty parts of their rectangles', () => {
  const o = {...letter(0,0,20,30),ink:{scale:1,columns:Array.from({length:20},(_,x)=>
    x < 3 || x > 16 ? [[0,30]] : [[0,3],[27,30]])}};
  const cat = {left:7,right:12,top:10,bottom:15,scale:1,padding:0,columns:Array.from({length:5},()=>[[0,5]])};
  assert.equal(glyphOffsets([o],cat)[0],0,'hole inside o is empty');
  assert.notEqual(glyphOffsets([o],{...cat,left:1,right:6})[0],0,'side stroke displaces o');
  assert.notEqual(glyphOffsets([o],{...cat,top:0,bottom:5})[0],0,'top stroke displaces o');
});

test('spring displacement and return are gradual, damped and refresh-rate independent', () => {
  const simulate = (hz,target,initial={position:0,velocity:0}) => {
    let state = initial;
    for (let i=0;i<hz/2;i++) state = springStep(state.position,state.velocity,target,1/hz);
    return state;
  };
  const first = springStep(0,0,20,1/60);
  assert(first.position > 0 && first.position < 2);
  const held = simulate(60,20);
  assert(held.position > 19.9 && held.position <= 20);
  assert(Math.abs(held.position - simulate(120,20).position) < 1e-10);
  const released = springStep(held.position,held.velocity,0,1/60);
  assert(released.position > 18 && released.position < held.position);
  const returned = simulate(60,0,held);
  assert(returned.position > 0 && returned.position < .4);
});

test('silhouette whitespace does not displace letters and page-top bounds are respected', () => {
  const shape={left:0,right:100,top:0,bottom:10,scale:1,padding:0,
    rows:Array.from({length:10},(_,y)=>y<5?[[40,60]]:[[10,90]])};
  assert.equal(glyphOffsets([letter(10,0,6,3)],shape)[0],0);
  assert.notEqual(glyphOffsets([letter(45,0,6,3)],shape)[0],0);
  assert.equal(glyphOffsets([letter(42,5,6,7)],{left:40,right:60,top:0,bottom:20},0)[0],15);
});
