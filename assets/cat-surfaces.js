// Collision data comes from rasterized ink, not line boxes or image rectangles.
export const portraitRegions = [
  {id:'left-eye',left:.30,right:.425,top:.415,bottom:.493},
  {id:'right-eye',left:.52,right:.65,top:.403,bottom:.485},
  {id:'nose',left:.44,right:.49,top:.50,bottom:.56},
  {id:'mouth',left:.44,right:.54,top:.585,bottom:.615},
  {id:'left-shoulder',left:.17,right:.43,top:.74,bottom:.95},
  {id:'right-shoulder',left:.63,right:.85,top:.74,bottom:.95},
];
export function scanContour(data, width, height, scale, left, top, dark = false, bounds = null) {
  const xStart = Math.max(0, Math.floor(bounds?.left ?? 0));
  const xEnd = Math.min(width, Math.ceil(bounds?.right ?? width));
  const yStart = Math.max(0, Math.floor(bounds?.top ?? 0));
  const yEnd = Math.min(height, Math.ceil(bounds?.bottom ?? height));
  const firstColumn = Math.floor(xStart / scale);
  const profileLeft = left + firstColumn;
  const contour = new Float64Array(Math.ceil(xEnd / scale) - firstColumn).fill(NaN);
  for (let x = xStart; x < xEnd; x++) {
    for (let y = yStart; y < yEnd; y++) {
      const i = (y * width + x) * 4;
      const ink = data[i + 3] > 90 && (!dark || (data[i] + data[i + 1] + data[i + 2]) / 3 < 100);
      if (!ink) continue;
      const column = Math.floor(x / scale) - firstColumn, value = top + y / scale;
      if (!Number.isFinite(contour[column]) || value < contour[column]) contour[column] = value;
      break;
    }
  }
  const occupied = [...contour].filter(Number.isFinite);
  return occupied.length ? { left:profileLeft, right:profileLeft + contour.length - 1, y:Math.min(...occupied), profileLeft, contour } : null;
}
export function contactAt(platform, x, reach = 7) {
  if (!platform.contour) return x >= platform.left && x <= platform.right ? { x, y: platform.y } : null;
  const column = Math.round(x - platform.profileLeft);
  // Search only within a paw's reach; never fill an entire word-space with air.
  for (let distance = 0; distance <= reach; distance++) {
    for (const offset of distance ? [-distance, distance] : [0]) {
      const i = column + offset;
      if (i < 0 || i >= platform.contour.length) continue;
      const y = platform.contour[i];
      if (Number.isFinite(y)) return { x: platform.profileLeft + i, y };
    }
  }
  return null;
}
export function standingHeight(platform, x) {
  if (!platform.contour) return platform.y;
  const back = contactAt(platform, x - 10.5), front = contactAt(platform, x + 10.5);
  if (back && front) return (back.y + front.y) / 2;
  return (back || front || contactAt(platform, x))?.y ?? NaN;
}
function canvasFor(width, height) {
  const scale = Math.max(2, Math.min(3, devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.scale(scale, scale);
  return { canvas, context, scale };
}
export function textContours(text) {
  const parent = text.parentElement, style = getComputedStyle(parent);
  const range = document.createRange();
  range.selectNodeContents(text);
  const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
  if (!rects.length) return [];
  // A zero-size inline baseline marker measures the browser's real baseline.
  // It is removed synchronously, before paint, and does not change the text node.
  const marker = document.createElement('span');
  marker.setAttribute('aria-hidden', 'true');
  marker.className = 'cat-baseline-probe';
  marker.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline;';
  parent.insertBefore(marker, text.nextSibling);
  const baseline = marker.getBoundingClientRect().top;
  marker.remove();
  const lastTop = rects.at(-1).top;
  const lines = rects.map(r => {
    const pad = 4;
    const layer = canvasFor(r.width + pad * 2, r.height + pad * 2);
    layer.rect = r;
    layer.left = r.left - pad;
    layer.top = r.top - pad;
    layer.baseline = baseline - lastTop + r.top;
    layer.context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    layer.context.textBaseline = 'alphabetic';
    layer.context.fillStyle = '#000';
    return layer;
  });
  // DOM character positions retain the browser's kerning and letter spacing.
  for (let i = 0; i < text.length;) {
    const char = String.fromCodePoint(text.textContent.codePointAt(i));
    range.setStart(text, i); range.setEnd(text, i + char.length);
    i += char.length;
    if (!char.trim()) continue;
    const r = range.getBoundingClientRect();
    const line = lines.find(line => Math.abs(line.rect.top - r.top) < 2);
    if (!line) continue;
    const glyph = style.textTransform === 'uppercase' ? char.toUpperCase() : style.textTransform === 'lowercase' ? char.toLowerCase() : char;
    line.context.fillText(glyph, r.left - line.left, line.baseline - line.top);
  }
  return lines.map(({ canvas, context, scale, left, top }) => scanContour(
    context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height,
    scale, left + scrollX, top + scrollY)).filter(Boolean);
}
export function imageContour(image, region = null) {
  if (!image?.complete || !image.naturalWidth) return null;
  const r = image.getBoundingClientRect();
  const { canvas, context, scale } = canvasFor(r.width, r.height);
  context.drawImage(image, 0, 0, r.width, r.height);
  return scanContour(context.getImageData(0, 0, canvas.width, canvas.height).data,
    canvas.width, canvas.height, scale, r.left + scrollX, r.top + scrollY, true,
    region && {left:region.left*canvas.width,right:region.right*canvas.width,
      top:region.top*canvas.height,bottom:region.bottom*canvas.height});
}
