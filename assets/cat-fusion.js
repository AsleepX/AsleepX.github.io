export const FUSION_DELAY = 4000;

export function overFace(cat, portrait) {
  if (!portrait.width || !portrait.height) return false;
  const x = ((cat.left + cat.width / 2 - portrait.left) / portrait.width - .49) / .31;
  const y = ((cat.top + cat.height / 2 - portrait.top) / portrait.height - .43) / .35;
  return x * x + y * y <= 1;
}

// Motion inside the face does not reset the dwell; leaving it does.
export function fusionDwell() {
  let entered = null;
  return (inside, now) => {
    if (!inside) entered = null;
    else if (entered === null) entered = now;
    return entered !== null && now - entered >= FUSION_DELAY;
  };
}
