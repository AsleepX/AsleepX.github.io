import test from 'node:test';
import assert from 'node:assert/strict';
import {hairDisplacementAt,createHairDisplacementPixels,HAIR_MAP_SCALE} from '../assets/portrait-hair-motion.js';

test('the complete right side lock moves, including its pointed end',() => {
  for (const [x,y] of [[840,770],[815,810],[800,820]]) {
    assert.ok(Math.hypot(...hairDisplacementAt(x,y))>6,`frozen side lock at ${x},${y}`);
  }
});
test('ear, face, both collar tips and raised left shoulder stay anchored',() => {
  for (const [x,y] of [[880,530],[892,566],[914,614],[865,648],[600,675],
    [515,901],[791,884],[814,907],[470,954],[360,976],[420,956],[900,973],[1000,1050]]) {
    assert.equal(Math.hypot(...hairDisplacementAt(x,y)),0,`moving anchor at ${x},${y}`);
  }
});
test('both ruffle directions preserve a continuous surface without folds',() => {
  for (let y=50;y<990;y+=7) for (let x=100;x<1150;x+=7) {
    const c=hairDisplacementAt(x,y),r=hairDisplacementAt(x+1,y),b=hairDisplacementAt(x,y+1);
    for (const sign of [-1,1]) {
      const determinant=(1+sign*(r[0]-c[0]))*(1+sign*(b[1]-c[1]))-(b[0]-c[0])*(r[1]-c[1]);
      assert.ok(determinant>.25,`fold near ${x},${y} in direction ${sign}`);
    }
  }
});
test('the map stays inside filter displacement bounds',() => {
  for (let y=0;y<=1254;y+=11) for (let x=0;x<=1254;x+=11) {
    assert.ok(hairDisplacementAt(x,y).every(v=>Number.isFinite(v)&&Math.abs(v)<HAIR_MAP_SCALE/2));
  }
});
test('stationary anchors are excluded from the composited moving source',() => {
  const size=128,{data,mask}=createHairDisplacementPixels(size);
  for (const [x,y] of [[600,650],[885,580],[790,920],[420,980],[1000,1100]]) {
    const index=(Math.floor(y/1254*size)*size+Math.floor(x/1254*size))*4;
    assert.equal(mask[index],0);
    assert.equal(data[index],128);
    assert.equal(data[index+1],128);
  }
});
