import test from 'node:test';
import assert from 'node:assert/strict';
import { glyphOffsets } from '../assets/cat-text-flow.js';

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

test('a displaced letter avoids fixed lines without moving those lines', () => {
  assert.deepEqual(glyphOffsets([letter(42,-15),letter(42)],{left:40,right:60,top:0,bottom:20}),[0,18]);
});

test('silhouette whitespace does not displace letters and page-top bounds are respected', () => {
  const shape={left:0,right:100,top:0,bottom:10,scale:1,padding:0,
    rows:Array.from({length:10},(_,y)=>y<5?[[40,60]]:[[10,90]])};
  assert.equal(glyphOffsets([letter(10,0,6,3)],shape)[0],0);
  assert.notEqual(glyphOffsets([letter(45,0,6,3)],shape)[0],0);
  assert.equal(glyphOffsets([letter(42,5,6,7)],{left:40,right:60,top:0,bottom:20},0)[0],15);
});
