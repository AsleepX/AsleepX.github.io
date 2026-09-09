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
