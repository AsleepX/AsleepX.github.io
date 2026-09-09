import { textContours, imageContour, contactAt, standingHeight } from './cat-surfaces.js?v=83e46912';
export { contactAt, standingHeight } from './cat-surfaces.js?v=83e46912';
// The page is a set of one-way platforms: jumps pass through from below.
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function collectPlatforms(track) {
  const platforms = [];
  const add = (id, left, right, y, contour = null) => {
    left = Math.max(28, left);
    right = Math.min(document.documentElement.clientWidth - 28, right);
    if (right - left >= 12 && Number.isFinite(y)) platforms.push({ ...contour, id, left, right, y });
  };
  const rect = element => {
    const r = element.getBoundingClientRect();
    return { left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY };
  };
  document.querySelectorAll('.header, .info-row, footer').forEach((el, i) => {
    const r = rect(el);
    add(el.id === 'research' ? 'home' : `rule-${i}`, r.left, r.right,
      el.classList.contains('header') ? el.getBoundingClientRect().bottom + scrollY : r.top);
  });
  const portrait = imageContour(document.querySelector('.portrait-fallback'));
  if (portrait) add('portrait', portrait.left, portrait.right, portrait.y, portrait);
  // Range rectangles preserve actual text wrapping, including responsive line breaks.
  const walker = document.createTreeWalker(document.querySelector('.page'), NodeFilter.SHOW_TEXT);
  let text;
  let i = 0;
  while ((text = walker.nextNode())) {
    if (!text.textContent.trim() || text.parentElement.closest('.cat, svg, script, .skip-link')) continue;
    const style = getComputedStyle(text.parentElement);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    for (const contour of textContours(text)) {
      add(`text-${i++}`, contour.left, contour.right, contour.y, contour);
    }
  }
  const home = rect(track);
  if (!platforms.some(p => p.id === 'home')) add('home', home.left, home.right, home.top);
  add('floor', 8, document.documentElement.clientWidth - 8,
    Math.max(document.documentElement.scrollHeight, innerHeight) - 6);
  return platforms.sort((a, b) => a.y - b.y);
}
export function firstLanding(platforms, x, feetY) {
  return platforms.filter(p => x >= p.left && x <= p.right)
    .map(p => ({ ...p, y: standingHeight(p, x) }))
    .filter(p => Number.isFinite(p.y) && p.y >= feetY - 1)
    .sort((a, b) => a.y - b.y)[0];
}
const arcPoint = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t - 4 * jumpHeight(a, b) * t * (1 - t),
});
export function jumpHeight(a, b) {
  return Math.max(14, Math.min(30, Math.abs(a.x - b.x) * .09), Math.abs(a.y - b.y) * .27 + 4);
}
function jumpLength(a, b) {
  let previous = a, length = 0;
  for (let i = 1; i <= 16; i++) {
    const point = arcPoint(a, b, i / 16);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return length;
}
function clearLandingArc(a, b, platforms) {
  const height = jumpHeight(a, b);
  const A = 4 * height, B = b.y - a.y - 4 * height;
  for (const p of platforms) {
    if (p.id === b.platform || p.id === a.platform) continue;
    if (p.contour) {
      if (Math.max(a.x, b.x) < p.left || Math.min(a.x, b.x) > p.right) continue;
      // Sample descending crossings against the ink at that x, not its tallest glyph.
      let previous = a;
      for (let step = 1; step <= 32; step++) {
        const point = arcPoint(a, b, step / 32);
        if (point.y > previous.y && point.x >= p.left && point.x <= p.right) {
          const ground = standingHeight(p, point.x);
          if (Number.isFinite(ground) && previous.y < ground && point.y >= ground) return false;
        }
        previous = point;
      }
      continue;
    }
    const discriminant = B * B - 4 * A * (a.y - p.y);
    if (discriminant < 0) continue;
    // The positive root is the descending crossing. Rising through is allowed.
    const t = (-B + Math.sqrt(discriminant)) / (2 * A);
    if (t <= .002 || t >= .998) continue;
    const x = a.x + (b.x - a.x) * t;
    if (x >= p.left && x <= p.right) return false;
  }
  return true;
}
export function findRoute(platforms, start, homeX, extended = false) {
  const home = platforms.find(p => p.id === 'home');
  if (!home) return [];
  const levels = [...new Set(platforms.map(p => p.y))].sort((a, b) => a - b);
  const sparseGap = Math.max(170, ...levels.slice(1).map((y, i) => y - levels[i] + 1));
  const anchors = [start.x, homeX, ...platforms.flatMap(p => [p.left + 8, p.right - 8])];
  const nodes = [{ ...start }];
  const destination = { x: clamp(homeX, home.left, home.right), y: home.y, platform: home.id };
  nodes.push(destination);
  for (const p of platforms) {
    const xs = [...new Set(anchors.map(x => Math.round(clamp(x, p.left + 4, p.right - 4))))];
    for (const x of xs) {
      const y = standingHeight(p, x);
      if (Number.isFinite(y)) nodes.push({ x, y, platform: p.id });
    }
  }
  const byId = new Map(platforms.map(p => [p.id, p]));
  const walks = new Map();
  for (const p of platforms.filter(p => p.contour)) {
    const left = Math.floor(p.left), width = Math.ceil(p.right) - left + 1;
    const length = new Float64Array(width), gaps = new Uint32Array(width);
    let previousY = standingHeight(p, left);
    for (let i = 1; i < width; i++) {
      const y = standingHeight(p, left + i);
      const valid = Number.isFinite(y) && Number.isFinite(previousY);
      length[i] = length[i - 1] + (valid ? Math.hypot(1, y - previousY) : 0);
      gaps[i] = gaps[i - 1] + (valid ? 0 : 1);
      previousY = y;
    }
    walks.set(p.id, { left, width, length, gaps });
  }
  const distances = new Float64Array(nodes.length).fill(Infinity);
  const previous = new Int32Array(nodes.length).fill(-1);
  const visited = new Uint8Array(nodes.length);
  distances[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited[i] && (u < 0 || distances[i] < distances[u])) u = i;
    if (u < 0 || !Number.isFinite(distances[u])) break;
    if (u === 1) break;
    visited[u] = 1;
    const a = nodes[u];
    for (let v = 0; v < nodes.length; v++) {
      if (visited[v] || u === v) continue;
      const b = nodes[v], same = a.platform === b.platform;
      const dx = Math.abs(b.x - a.x), dy = b.y - a.y;
      if (!same && (dx > 96 || dy < -(extended ? sparseGap : 130) || dy > 260)) continue;
      if (!same && !clearLandingArc(a, b, platforms)) continue;
      let cost = same ? dx : jumpLength(a, b);
      if (same && byId.get(a.platform)?.contour) {
        const table = walks.get(a.platform);
        const ia = clamp(Math.round(a.x - table.left), 0, table.width - 1);
        const ib = clamp(Math.round(b.x - table.left), 0, table.width - 1);
        cost = table.gaps[ia] === table.gaps[ib] ? Math.abs(table.length[ia] - table.length[ib]) : Infinity;
      }
      // All jump arcs are one-way-platform traversals, not solid-wall collisions.
      if (distances[u] + cost < distances[v]) {
        distances[v] = distances[u] + cost;
        previous[v] = u;
      }
    }
  }
  if (!Number.isFinite(distances[1])) return extended ? [] : findRoute(platforms, start, homeX, true);
  const route = [];
  for (let v = 1; v !== 0; v = previous[v]) route.push(nodes[v]);
  return route.reverse();
}
