import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeMarkerRects} from '../assets/marker-stroke.js';

test('a selected phrase remains one stroke across adjacent inline text fragments',()=>{
  const fragments=[{x:20,y:100,width:34,height:28},{x:54,y:100,width:72,height:28}];
  assert.deepEqual(mergeMarkerRects(fragments),[{x:20,y:100,width:106,height:28}]);
  assert.equal(fragments[0].width,34);
});

test('selecting wrapped text or a second column does not highlight the intervening space',()=>{
  const fragments=[
    {x:20,y:100,width:110,height:28},
    {x:320,y:100,width:240,height:28},
    {x:20,y:142,width:190,height:28},
  ];
  assert.deepEqual(mergeMarkerRects(fragments),fragments);
});

test('partial-letter selections retain their fractional bounds and hidden fragments add no ink',()=>{
  const partial={x:25.375,y:40.125,width:8.625,height:26.5};
  assert.deepEqual(mergeMarkerRects([{x:0,y:0,width:0,height:0},partial]),[partial]);
});
