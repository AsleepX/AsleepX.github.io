export const FUSION_DELAY = 4000;

export function overFace(cat, portrait) {
  if (!portrait.width || !portrait.height) return false;
  const centerX = (cat.left + cat.width / 2 - portrait.left) / portrait.width;
  const pawsY = (cat.top + cat.height * 39 / 44 - portrait.top) / portrait.height;
  // A cat poised over a shoulder is below the face even if its head overlaps it.
  if (pawsY >= .74 && (centerX <= .43 || centerX >= .63)) return false;
  const x = ((cat.left + cat.width / 2 - portrait.left) / portrait.width - .49) / .31;
  const y = ((cat.top + cat.height / 2 - portrait.top) / portrait.height - .43) / .35;
  return x * x + y * y <= 1;
}

// Fusion requires one continuous hold; leaving or releasing resets the dwell.
export function fusionDwell() {
  let entered = null;
  return (inside, now, held) => {
    if (!inside || !held) entered = null;
    else if (entered === null) entered = now;
    return entered !== null && now - entered >= FUSION_DELAY;
  };
}
