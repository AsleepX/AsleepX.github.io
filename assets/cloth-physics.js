// A woven sheet resists stretching along its yarns, but yields a little in shear.
// The top and side hems are fixed; the cut lower edge is free. Pointer contact is
// integrated in time, so high-rate mice cannot inject a series of large kicks.
export class ClothNet {
  constructor(width, height, spacing = 8) {
    this.width = width;
    this.height = height;
    this.cols = Math.ceil(width / spacing) + 1;
    this.rows = Math.ceil(height / spacing) + 1;
    this.count = this.cols * this.rows;
    this.stepX = width / (this.cols - 1);
    this.stepY = height / (this.rows - 1);
    this.offset = new Float32Array(this.count * 3);
    this.velocity = new Float32Array(this.count * 3);
    this.force = new Float32Array(this.count * 3);
    this.mesh = new Float32Array(this.count * 8);
    this.contacts = [];
    this.contactTime = 0;
    this.awake = false;
    this.links = [];
    const c = Math.cos(-.4), s = Math.sin(-.4);
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        if (i + di < 0 || i + di >= this.cols || j + dj >= this.rows) continue;
        const x = di * this.stepX, y = dj * this.stepY, length = Math.hypot(x, y);
        const ux = x / length, uy = y / length;
        const warp = ux * c + uy * s, weft = -ux * s + uy * c;
        this.links.push({a: (j * this.cols + i) * 3, b: ((j + dj) * this.cols + i + di) * 3,
          ux, uy, length, stiffness: (1250 * warp ** 4 + 950 * weft ** 4) * (di && dj ? .6 : 1)});
      }
    }
  }
  pinned(i, j) { return i === 0 || j === 0 || i === this.cols - 1; }
  reset() {
    this.offset.fill(0); this.velocity.fill(0);
    this.contacts.length = 0; this.contactTime = 0;
    this.awake = false;
  }
  stroke(from, to, seconds = 1 / 60) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < .01 || !Number.isFinite(length)) return;
    const duration = Math.max(1 / 1000, Math.min(.05, seconds));
    this.contacts.push({x: from.x, y: from.y, dx, dy, length, duration, elapsed: 0});
    this.contactTime += duration;
    // Recover from a stalled frame without replaying an old cursor trail.
    while (this.contactTime > .09 && this.contacts.length > 1) {
      const old = this.contacts.shift();
      this.contactTime -= old.duration - old.elapsed;
    }
    this.awake = true;
  }
  contactForces(dt) {
    let remaining = dt;
    while (remaining > .000001 && this.contacts.length) {
      const contact = this.contacts[0];
      const used = Math.min(remaining, contact.duration - contact.elapsed);
      const t = (contact.elapsed + used * .5) / contact.duration;
      const x = contact.x + contact.dx * t, y = contact.y + contact.dy * t;
      const ux = contact.dx / contact.length, uy = contact.dy / contact.length;
      const speed = contact.length / contact.duration;
      // Dry friction saturates: a fast sweep slips over the fibres instead of
      // pulling them farther. The leading side forms only a shallow crease.
      const grip = Math.min(19, speed * .055);
      const c = Math.cos(-.4), s = Math.sin(-.4);
      const row0 = Math.max(1, Math.floor((y - 27) / this.stepY));
      const row1 = Math.min(this.rows - 1, Math.ceil((y + 27) / this.stepY));
      const col0 = Math.max(1, Math.floor((x - 27) / this.stepX));
      const col1 = Math.min(this.cols - 2, Math.ceil((x + 27) / this.stepX));
      for (let j = row0; j <= row1; j++) for (let i = col0; i <= col1; i++) {
        const n = (j * this.cols + i) * 3;
        const dx = i * this.stepX + this.offset[n] - x;
        const dy = j * this.stepY + this.offset[n + 1] - y;
        const a = (dx * c + dy * s) / 25, b = (-dx * s + dy * c) / 18;
        const r2 = a * a + b * b;
        if (r2 >= 1) continue;
        const weight = (1 - r2) ** 2 * used / dt;
        this.force[n] += (ux * grip - this.velocity[n]) * 62 * weight;
        this.force[n + 1] += (uy * grip - this.velocity[n + 1]) * 62 * weight;
        const leading = (dx * ux + dy * uy) / 25;
        this.force[n + 2] += (leading * 260 - 38) * weight * Math.min(1, speed / 120);
      }
      contact.elapsed += used; remaining -= used; this.contactTime -= used;
      if (contact.elapsed >= contact.duration - .000001) this.contacts.shift();
    }
    this.contactTime = Math.max(0, this.contactTime);
  }
  step(seconds) {
    if (!this.awake) return false;
    const elapsed = Math.max(0, Math.min(seconds, .05));
    const steps = Math.max(1, Math.ceil(elapsed * 240)), dt = elapsed / steps;
    const p = this.offset, v = this.velocity, f = this.force;
    let energy = 0;
    for (let sub = 0; sub < steps; sub++) {
      energy = 0;
      for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
        const n = (j * this.cols + i) * 3;
        const edge = Math.max(0, (j * this.stepY - (this.height - 30)) / 30);
        // Contact compresses yarns a little; friction damps their return without
        // a rubbery bounce. Loose cut ends have less backing than the main cloth.
        for (let axis = 0; axis < 3; axis++) {
          const stiffness = (axis === 2 ? 62 : 34) * (1 - edge * .5);
          const limit = axis === 2 ? .85 : 1.7;
          const hardening = 1 + (Math.abs(p[n + axis]) / limit) ** 4 * 6;
          f[n + axis] = -stiffness * hardening * p[n + axis] - (axis === 2 ? 24 : 27) * v[n + axis];
        }
      }
      for (const link of this.links) {
        const {a, b, ux, uy, length, stiffness} = link;
        const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
        const stretch = dx * ux + dy * uy + dz * dz / (2 * length);
        const strain = stretch / length;
        const tension = stiffness * stretch * (1 + Math.min(5, (Math.abs(strain) / .035) ** 2));
        const relative = (v[b] - v[a]) * ux + (v[b + 1] - v[a + 1]) * uy;
        const axial = tension + relative * 4.5;
        const fx = axial * ux + dx * 25;
        const fy = axial * uy + dy * 25;
        const fz = dz * 68 + (v[b + 2] - v[a + 2]) * 2.5 + tension * dz / length;
        f[a] += fx; f[b] -= fx;
        f[a + 1] += fy; f[b + 1] -= fy;
        f[a + 2] += fz; f[b + 2] -= fz;
      }
      this.contactForces(dt);
      for (let j = 1; j < this.rows; j++) for (let i = 1; i < this.cols - 1; i++) {
        const n = (j * this.cols + i) * 3;
        for (let axis = 0; axis < 3; axis++) {
          const k = n + axis;
          v[k] += f[k] * dt;
          p[k] += v[k] * dt;
          energy = Math.max(energy, Math.abs(p[k]), Math.abs(v[k]) * .04);
        }
      }
    }
    if (!this.contacts.length && energy < .001) this.reset();
    return this.awake;
  }
  vertices() {
    const result = this.mesh, p = this.offset;
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      const n = j * this.cols + i, k = n * 3, b = n * 8;
      const i0 = Math.max(0, i - 1), i1 = Math.min(this.cols - 1, i + 1);
      const j0 = Math.max(0, j - 1), j1 = Math.min(this.rows - 1, j + 1);
      result[b] = i * this.stepX + p[k];
      result[b + 1] = j * this.stepY + p[k + 1] + p[k + 2] * .2;
      result[b + 2] = -(p[(j * this.cols + i1) * 3 + 2] - p[(j * this.cols + i0) * 3 + 2]) / ((i1 - i0) * this.stepX);
      result[b + 3] = -(p[(j1 * this.cols + i) * 3 + 2] - p[(j0 * this.cols + i) * 3 + 2]) / ((j1 - j0) * this.stepY);
      result[b + 4] = 1;
      result[b + 5] = i / (this.cols - 1);
      result[b + 6] = j / (this.rows - 1);
      result[b + 7] = p[k + 2];
    }
    return result;
  }
  indices() {
    const result = new Uint16Array((this.cols - 1) * (this.rows - 1) * 6);
    let n = 0;
    for (let j = 0; j < this.rows - 1; j++) for (let i = 0; i < this.cols - 1; i++) {
      const a = j * this.cols + i, b = a + 1, c = a + this.cols, d = c + 1;
      result.set([a, c, b, b, c, d], n); n += 6;
    }
    return result;
  }
}
