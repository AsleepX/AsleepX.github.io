import test from 'node:test';
import assert from 'node:assert/strict';
import { lineSlots } from '../assets/cat-text-flow.js';

test('text can flow on both sides of the cat without entering its padded bounds', () => {
  const cat={left:90,right:170,top:10,bottom:60};
  assert.deepEqual(lineSlots(320,20,24,cat),[{x:0,width:90},{x:170,width:150}]);
  assert.deepEqual(lineSlots(320,60,24,cat),[{x:0,width:320}]);
  assert.deepEqual(lineSlots(320,-24,24,cat),[{x:0,width:320}]);
});

test('a cat covering a narrow text column leaves a blank band instead of overlapping letters', () => {
  assert.deepEqual(lineSlots(60,0,24,{left:-10,right:70,top:0,bottom:44}),[]);
  assert.deepEqual(lineSlots(60,48,24,{left:-10,right:70,top:0,bottom:44}),[{x:0,width:60}]);
});

test('text does not collapse into single-letter slivers or change for a distant cat', () => {
  assert.deepEqual(lineSlots(300,0,24,{left:8,right:90,top:0,bottom:44}),[{x:90,width:210}]);
  assert.deepEqual(lineSlots(300,0,24,{left:310,right:390,top:0,bottom:44}),[{x:0,width:300}]);
});

test('each text band follows the narrow head or wide body rather than a shared rectangle', () => {
  const shape={left:0,right:100,top:0,bottom:10,scale:1,padding:0,
    rows:Array.from({length:10},(_,y)=>y<5?[[40,60]]:[[10,90]])};
  assert.deepEqual(lineSlots(100,0,3,shape,1),[{x:0,width:40},{x:60,width:40}]);
  assert.deepEqual(lineSlots(100,6,3,shape,1),[{x:0,width:10},{x:90,width:10}]);
});

test('empty silhouette regions do not push text and overlapping contour runs are merged', () => {
  const shape={left:0,right:100,top:0,bottom:3,scale:1,padding:0,
    rows:[[],[[20,40],[70,80]],[[30,50],[72,85]]]};
  assert.deepEqual(lineSlots(100,0,1,shape,1),[{x:0,width:100}]);
  assert.deepEqual(lineSlots(100,1,2,shape,1),[{x:0,width:20},{x:50,width:20},{x:85,width:15}]);
  assert.deepEqual(lineSlots(100,-1,.5,shape,1),[{x:0,width:100}]);
});
