// Match the original 620ms CSS ease-in-out swing, including diagonal leg pairs.
export function walkingLeg(index, elapsed) {
  const delayed = index === 0 || index === 3;
  const cycle = ((elapsed / 620 + (delayed ? .5 : 0)) % 1 + 1) % 1;
  const progress = cycle < .5 ? cycle * 2 : (1 - cycle) * 2;
  let low = 0, high = 1;
  for (let i = 0; i < 14; i++) {
    const t = (low + high) / 2;
    const x = 3 * (1 - t) ** 2 * t * .42 + 3 * (1 - t) * t * t * .58 + t ** 3;
    if (x < progress) low = t; else high = t;
  }
  const t = (low + high) / 2, eased = t * t * (3 - 2 * t);
  const angle = (-18 + 36 * eased) * Math.PI / 180;
  const points = [
    [20,26,24,33,21,39], [43,25,42,33,44,39],
    [20,26,16,33,18,39], [43,25,46,33,44,39],
  ][index];
  const [x, y] = points;
  const rotate = (px, py) => ({x:x+(px-x)*Math.cos(angle)-(py-y)*Math.sin(angle), y:y+(px-x)*Math.sin(angle)+(py-y)*Math.cos(angle)});
  return {root:{x,y}, knee:rotate(points[2],points[3]), paw:rotate(points[4],points[5])};
}

// SVG-space leg proportions stay fixed even when the terrain drops sharply.
export function groundedPaw(root, target) {
  const dx = target.x - root.x, dy = target.y - root.y;
  const distance = Math.hypot(dx, dy);
  const release = Math.max(0, Math.min(1, (distance - 16) / 5));
  const blend = release * release * (3 - 2 * release);
  // Lose contact gradually and let the paw hang beneath its shoulder/hip.
  let x = dx * (1 - blend) + Math.max(-2, Math.min(2, dx)) * blend;
  let y = dy * (1 - blend) + 13 * blend;
  const scale = Math.min(1, 17 / Math.max(1, Math.hypot(x, y)));
  return { x: root.x + x * scale, y: root.y + y * scale };
}
