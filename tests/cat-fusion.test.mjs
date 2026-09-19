import test from 'node:test';
import assert from 'node:assert/strict';
import { fusionDwell, overFace, isFaceSurface } from '../assets/cat-fusion.js';

test('only facial features retain a manually dropped cat for fusion', () => {
  for (const feature of ['left-eye','right-eye','nose','mouth']) {
    assert.equal(isFaceSurface('portrait-'+feature),true);
  }
  for (const id of ['portrait','portrait-left-shoulder','portrait-right-shoulder','home',undefined]) {
    assert.equal(isFaceSurface(id),false);
  }
});

test('landing on a facial feature starts a fresh four-second fusion timer', () => {
  const dwell=fusionDwell();
  assert.equal(dwell(true,0,true),false);
  assert.equal(dwell(true,2000,false),false); // Released; the cat is still falling.
  assert.equal(dwell(true,2300,isFaceSurface('portrait-nose')),false);
  assert.equal(dwell(true,6299,true),false);
  assert.equal(dwell(true,6300,true),true);
});

test('holding over the crown or forehead does not start face fusion', () => {
  const portrait={left:100,top:100,width:200,height:200};
  for (const centerY of [.08,.2,.28]) {
    assert.equal(overFace({left:170,top:100+200*centerY-22,width:56,height:44},portrait),false);
  }
});

test('a shoulder drop does not trigger face fusion', () => {
  const portrait={left:100,top:100,width:200,height:200};
  for (const x of [.35,.66]) {
    const cat={left:100+200*x-28,top:100+200*.76-39,width:56,height:44};
    assert.equal(overFace(cat,portrait),false);
  }
});

test('holding still or moving inside the face fuses after four continuous seconds', () => {
  const dwell = fusionDwell();
  const portrait = {left:100,top:100,width:200,height:200};
  for (let now=0; now<=4000; now+=100) {
    const cat = {left:174+Math.sin(now/100)*12,top:170+Math.cos(now/100)*8,width:56,height:44};
    assert.equal(dwell(overFace(cat,portrait),now,true),now===4000);
  }
});

test('leaving the face clears dwell instead of accumulating separate visits', () => {
  const dwell = fusionDwell();
  assert.equal(dwell(true,0,true),false);
  assert.equal(dwell(true,3900,true),false);
  assert.equal(dwell(false,3950,true),false);
  assert.equal(dwell(true,4000,true),false);
  assert.equal(dwell(true,7999,true),false);
  assert.equal(dwell(true,8000,true),true);
});

test('releasing on the face cancels fusion and a new hold starts from zero', () => {
  const dwell=fusionDwell();
  assert.equal(dwell(true,0,true),false);
  assert.equal(dwell(true,3900,true),false);
  assert.equal(dwell(true,4000,false),false);
  assert.equal(dwell(true,10000,false),false);
  assert.equal(dwell(true,11000,true),false);
  assert.equal(dwell(true,14999,true),false);
  assert.equal(dwell(true,15000,true),true);
});

test('portrait whitespace and nearby text do not count as the face', () => {
  const portrait = {left:100,top:100,width:200,height:200};
  assert.equal(overFace({left:72,top:78,width:56,height:44},portrait),false);
  assert.equal(overFace({left:170,top:163,width:56,height:44},portrait),true);
  assert.equal(overFace({left:170,top:280,width:56,height:44},portrait),false);
});
