export const FUSION_DELAY = 4000;

export const isFaceSurface = id => /^portrait-(left-eye|right-eye|nose|mouth)$/.test(id ?? '');

export function overFace(cat, portrait) {
  if (!portrait.width || !portrait.height) return false;
  const centerX = (cat.left + cat.width / 2 - portrait.left) / portrait.width;
  const pawsY = (cat.top + cat.height * 39 / 44 - portrait.top) / portrait.height;
  // A cat poised over a shoulder is below the face even if its head overlaps it.
  if (pawsY >= .74 && (centerX <= .43 || centerX >= .63)) return false;
  const x = (centerX - .49) / .25;
  const y = ((cat.top + cat.height / 2 - portrait.top) / portrait.height - .53) / .23;
  return x * x + y * y <= 1;
}

// Only a held cat over the face or one manually landed on a facial feature is eligible.
export function fusionDwell() {
  let entered = null;
  return (inside, now, eligible) => {
    if (!inside || !eligible) entered = null;
    else if (entered === null) entered = now;
    return entered !== null && now - entered >= FUSION_DELAY;
  };
}
