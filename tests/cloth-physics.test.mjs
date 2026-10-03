import test from 'node:test';
import assert from 'node:assert/strict';
import { ClothNet } from '../assets/cloth-physics.js';

const magnitude = net => Math.max(...net.offset.map(Math.abs));
const brush = net => net.stroke({x: 430, y: 60}, {x: 470, y: 65});
function sweep(rate = 120, y = 65, speed = 200) {
  const net = new ClothNet(1000, 134);
  for (let i = 0; i < rate / 2; i++) {
    net.stroke({x: 390 + i * speed / rate, y}, {x: 390 + (i + 1) * speed / rate, y}, 1 / rate);
    net.step(1 / rate);
  }
  return net;
}
test('a passing pointer moves only nearby cloth while the upper and side hems stay pinned', () => {
  const net = new ClothNet(1000, 120);
  for (let i = 0; i < 6; i++) {
    net.stroke({x: 430 + i * 3.3, y: 65}, {x: 433.3 + i * 3.3, y: 65}, 1 / 60);
    net.step(1 / 60);
  }
  assert(magnitude(net) > .1);
  for (let j = 0; j < net.rows; j++) for (let i = 0; i < net.cols; i++) {
    const x = i * net.width / (net.cols - 1);
    const n = (j * net.cols + i) * 3;
    if (net.pinned(i, j)) {
      assert.deepEqual([...net.offset.slice(n, n + 3)], [0, 0, 0]);
    }
    if (x < 330 || x > 570) assert(net.offset.slice(n, n + 3).every(v => Math.abs(v) < .00001));
  }
});
test('repeated fast brushing cannot stretch the cloth into large waves', () => {
  const net = new ClothNet(1000, 120);
  for (let i = 0; i < 240; i++) { brush(net); net.step(1 / 120); }
  assert(magnitude(net) <= 3.21);
  assert(net.offset.every(Number.isFinite));
});
test('the cloth returns completely to rest and stops updating', () => {
  const net = new ClothNet(1000, 120);
  brush(net);
  for (let i = 0; i < 600 && net.awake; i++) net.step(1 / 120);
  assert.equal(net.awake, false);
  assert.equal(magnitude(net), 0);
  assert.equal(net.step(1 / 60), false);
});
test('30, 60 and 120 Hz produce matching material displacement', () => {
  const samples = [30, 60, 120].map(rate => {
    const net = new ClothNet(1000, 120); brush(net);
    for (let i = 0; i < rate / 2; i++) net.step(1 / rate);
    return net.offset;
  });
  for (let i = 0; i < samples[0].length; i++) {
    assert(Math.abs(samples[0][i] - samples[1][i]) < .00001);
    assert(Math.abs(samples[1][i] - samples[2][i]) < .00001);
  }
});
test('stopping motion restores the exact original mesh and leaves valid triangles', () => {
  const net = new ClothNet(350, 124), rest = new Float32Array(net.vertices());
  net.stroke({x: 100, y: 40}, {x: 160, y: 70}); net.step(1 / 60); net.reset();
  assert.deepEqual(net.vertices(), rest);
  assert.equal(net.awake, false);
  assert(net.indices().every(index => index < net.count));
});
test('the same timed stroke is consistent across display and mouse event rates', () => {
  const reference = sweep(120).offset;
  for (const rate of [30, 60, 240, 1000]) {
    const sample = sweep(rate).offset;
    assert(Math.max(...sample.map((v, i) => Math.abs(v - reference[i]))) < .015);
  }
});
test('yarns resist stretching while their cut edge remains softer than the body', () => {
  const body = sweep(), edge = sweep(120, 126);
  assert(magnitude(edge) > magnitude(body));
  const p = body.offset;
  for (const {a, b, ux, uy, length} of body.links) {
    const strain = Math.abs(((p[b] - p[a]) * ux + (p[b + 1] - p[a + 1]) * uy) / length);
    assert(strain < .04, `visible yarn stretch: ${strain}`);
  }
  const bottom = (edge.rows - 1) * edge.cols * 3;
  assert(edge.offset.slice(bottom).some(v => Math.abs(v) > .05));
});
test('a fast sweep slips across the cloth instead of amplifying its displacement', () => {
  assert(magnitude(sweep(120, 65, 800)) < magnitude(sweep(120, 65, 200)));
});
test('cloth settles without a noticeable rebound or a lingering ripple', () => {
  const net = sweep(), initial = magnitude(net);
  const strongest = net.offset.findIndex(v => Math.abs(v) === initial);
  const direction = Math.sign(net.offset[strongest]);
  let previous = initial;
  for (let i = 0; i < 240; i++) {
    net.step(1 / 120);
    assert(net.offset[strongest] * direction > -.01);
    const current = magnitude(net);
    assert(current <= previous + .002);
    previous = current;
    if (i === 59) assert(current < initial * .15);
  }
});
