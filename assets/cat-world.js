// The page is a set of one-way platforms: jumps pass through from below.
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function collectPlatforms(track) {
  const platforms = [];
  const add = (id, left, right, y) => {
    left = Math.max(28, left);
    right = Math.min(document.documentElement.clientWidth - 28, right);
    if (right - left >= 12 && Number.isFinite(y)) platforms.push({ id, left, right, y });
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
  const portrait = document.querySelector('.portrait');
  if (portrait) {
    const r = rect(portrait);
    add('portrait', r.left + (r.right - r.left) * .2, r.right - (r.right - r.left) * .16,
      r.top + (r.right - r.left) * .075);
  }
  // Range rectangles preserve actual text wrapping, including responsive line breaks.
  const walker = document.createTreeWalker(document.querySelector('.page'), NodeFilter.SHOW_TEXT);
  let text;
  let i = 0;
  while ((text = walker.nextNode())) {
    if (!text.textContent.trim() || text.parentElement.closest('.cat, svg, script, .skip-link')) continue;
    const style = getComputedStyle(text.parentElement);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const range = document.createRange();
    range.selectNodeContents(text);
    for (const r of range.getClientRects()) {
      if (r.width > 12 && r.height > 0) add(`text-${i++}`, r.left + scrollX, r.right + scrollX,
        r.top + scrollY + parseFloat(style.fontSize) * .16);
    }
  }
  const home = rect(track);
  if (!platforms.some(p => p.id === 'home')) add('home', home.left, home.right, home.top);
  add('floor', 8, document.documentElement.clientWidth - 8,
    Math.max(document.documentElement.scrollHeight, innerHeight) - 6);
  return platforms.sort((a, b) => a.y - b.y);
}
export function firstLanding(platforms, x, feetY) {
  return platforms.find(p => x >= p.left && x <= p.right && p.y >= feetY - 1);
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
    for (const x of xs) nodes.push({ x, y: p.y, platform: p.id });
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
      if (!same && (dx > (extended ? 270 : 190) || dy < -(extended ? sparseGap : 130) || dy > 260)) continue;
      if (!same && !clearLandingArc(a, b, platforms)) continue;
      const cost = same ? dx : jumpLength(a, b);
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
