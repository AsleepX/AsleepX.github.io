import { prepareWithSegments, layoutNextLine, clearCache } from './vendor/pretext-0.0.9/layout.js';

const targets = '.brand, nav a, #name, .bio, .info-row h2, .statement, .detail, .email, address, footer span';

// Carve each text ink band against the silhouette, not the SVG bounding box.
export function lineSlots(width, y, lineHeight, obstacle, minimum = 24) {
  if (!obstacle || y + lineHeight <= obstacle.top || y >= obstacle.bottom ||
      obstacle.right <= 0 || obstacle.left >= width) return [{x:0, width}];
  const intervals = [];
  if (obstacle.rows) {
    const {scale, padding = 2} = obstacle;
    const first = Math.max(0, Math.floor((y - obstacle.top - padding) * scale));
    const last = Math.min(obstacle.rows.length - 1, Math.ceil((y + lineHeight - obstacle.top + padding) * scale) - 1);
    for (let row = first; row <= last; row++) {
      for (const [left, right] of obstacle.rows[row]) {
        intervals.push([obstacle.left + left / scale - padding, obstacle.left + right / scale + padding]);
      }
    }
  } else intervals.push([obstacle.left, obstacle.right]);
  intervals.sort((a,b) => a[0] - b[0]);
  const slots = [];
  let x = 0;
  for (const [left, right] of intervals) {
    const edge = Math.max(0, Math.min(width, left));
    if (edge > x) slots.push({x, width:edge - x});
    x = Math.max(x, Math.min(width, right));
  }
  if (x < width) slots.push({x, width:width - x});
  return slots.filter(slot => slot.width >= Math.min(minimum, width));
}

export function flowLines(paragraphs, width, lineHeight, obstacle, minimum, ink = {top:0,bottom:lineHeight}) {
  const lines = [];
  let y = 0;
  for (const prepared of paragraphs) {
    let cursor = {segmentIndex:0, graphemeIndex:0};
    let done = false;
    while (!done) {
      const slots = lineSlots(width, y + ink.top, ink.bottom - ink.top, obstacle, minimum);
      for (const slot of slots) {
        const line = layoutNextLine(prepared, cursor, slot.width);
        if (!line) { done = true; break; }
        lines.push({text:line.text, x:slot.x, y, width:line.width});
        cursor = line.end;
        if (!layoutNextLine(prepared, cursor, width)) { done = true; break; }
      }
      y += lineHeight;
    }
  }
  return {lines, height:y};
}

function silhouette(rig) {
  const rect = rig.getBoundingClientRect();
  const margin = 3, scale = 2;
  const left = rect.left - margin, top = rect.top - margin;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((rect.width + margin * 2) * scale);
  canvas.height = Math.ceil((rect.height + margin * 2) * scale);
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  // Screen matrices include the grasp rotation, articulated limbs and mirroring.
  for (const path of rig.querySelectorAll('path')) {
    const style = getComputedStyle(path), m = path.getScreenCTM();
    if (!m || style.visibility === 'hidden' || style.display === 'none') continue;
    ctx.setTransform(m.a * scale,m.b * scale,m.c * scale,m.d * scale,(m.e-left)*scale,(m.f-top)*scale);
    const shape = new Path2D(path.getAttribute('d'));
    if (style.fill !== 'none') { ctx.fillStyle = style.fill; ctx.fill(shape); }
    if (style.stroke !== 'none') {
      ctx.strokeStyle = style.stroke; ctx.lineWidth = parseFloat(style.strokeWidth);
      ctx.lineCap = style.strokeLinecap; ctx.lineJoin = style.strokeLinejoin; ctx.stroke(shape);
    }
  }
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const rows = [];
  for (let y=0;y<canvas.height;y++) {
    const runs = [];
    let start = -1;
    for (let x=0;x<=canvas.width;x++) {
      const filled = x < canvas.width && data[(y*canvas.width+x)*4+3] > 40;
      if (filled && start < 0) start = x;
      else if (!filled && start >= 0) { runs.push([start,x]); start = -1; }
    }
    rows.push(runs);
  }
  return {rows, scale, margin, width:canvas.width/scale, height:canvas.height/scale, padding:2};
}

function textLines(element) {
  // Preserve authored <br> boundaries and collapse HTML indentation separately.
  const clone = element.cloneNode(true);
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\u0000'));
  return clone.textContent.split('\u0000').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export function createCatTextFlow(rig) {
  let active = false, dirty = false, frame = 0, entries = [];
  let layer = null, rules = null, mask = null;
  const page = document.querySelector('.page');
  const changed = new MutationObserver(records => {
    if (active && records.some(record => {
      const el = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (el?.closest('.cat, .portrait')) return false;
      if (record.type !== 'childList') return true;
      return [...record.addedNodes, ...record.removedNodes].some(node =>
        !(node.nodeType === 1 && node.matches('.cat, .cat-baseline-probe')));
    })) dirty = true;
  });

  function clearSources() {
    entries.forEach(({element}) => element.removeAttribute('data-cat-flow-source'));
    if (rules) rules.textContent = '';
    if (layer) layer.replaceChildren();
    entries = [];
  }

  function measure() {
    clearSources();
    entries = [...page.querySelectorAll(targets)].map((element, id) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const fontSize = parseFloat(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const inset = side => (parseFloat(style[`padding${side}`]) || 0) + (parseFloat(style[`border${side}Width`]) || 0);
      const texts = textLines(element).map(text => style.textTransform === 'uppercase' ? text.toUpperCase() : text);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = font;
      const metrics = ctx.measureText(texts.join(' '));
      const ascent = metrics.fontBoundingBoxAscent ?? fontSize * .8;
      const descent = metrics.fontBoundingBoxDescent ?? fontSize * .2;
      const baseline = (lineHeight - ascent - descent) / 2 + ascent;
      const ink = {top:baseline - metrics.actualBoundingBoxAscent, bottom:baseline + metrics.actualBoundingBoxDescent};
      const paragraphs = texts.map(text => prepareWithSegments(text, font, {letterSpacing:parseFloat(style.letterSpacing) || 0}));
      const host = document.createElement('div');
      host.className = 'cat-text-flow-block';
      Object.assign(host.style, {font, lineHeight:`${lineHeight}px`, letterSpacing:style.letterSpacing,
        color:style.color, textDecoration:style.textDecoration, fontKerning:style.fontKerning});
      layer.append(host);
      return {element, id, host, paragraphs, lineHeight, fontSize, ink, pool:[],
        inline:style.display === 'inline', baseHeight:rect.height,
        top:inset('Top'), bottom:inset('Bottom'), left:inset('Left'), right:inset('Right')};
    });
    dirty = false;
  }

  function render() {
    if (!active) return;
    // Read all geometry before writing styles. Pretext reuses measured segments;
    // only block anchors and the moving silhouette need fresh DOM rectangles.
    if (dirty) measure();
    const catRect = rig.getBoundingClientRect();
    const obstacle = {...mask, left:catRect.left - mask.margin, right:catRect.left - mask.margin + mask.width,
      top:catRect.top - mask.margin, bottom:catRect.top - mask.margin + mask.height};
    const boxes = entries.map(entry => entry.element.getBoundingClientRect());
    const styles = [];
    entries.forEach((entry, index) => {
      const {element, host, paragraphs, lineHeight, fontSize, pool, id} = entry;
      const box = boxes[index];
      const overlaps = box.width > 0 && obstacle.right > box.left && obstacle.left < box.right &&
        obstacle.bottom > box.top && obstacle.top < box.top + entry.baseHeight;
      if (!overlaps) {
        element.removeAttribute('data-cat-flow-source');
        host.hidden = true;
        return;
      }
      const top = box.top + (entry.inline ? (box.height - lineHeight) / 2 : entry.top);
      const left = box.left + entry.left;
      const width = Math.max(1, box.width - entry.left - entry.right);
      const local = {...obstacle, left:obstacle.left - left, right:obstacle.right - left,
        top:obstacle.top - top, bottom:obstacle.bottom - top};
      const layout = flowLines(paragraphs, width, lineHeight, local, Math.max(24, fontSize * 1.3), entry.ink);
      element.setAttribute('data-cat-flow-source', String(id));
      host.hidden = false;
      host.style.transform = `translate(${left + scrollX}px, ${top + scrollY}px)`;
      layout.lines.forEach((line, i) => {
        let span = pool[i];
        if (!span) { span = document.createElement('span'); host.append(span); pool.push(span); }
        span.hidden = false;
        if (span.textContent !== line.text) span.textContent = line.text;
        span.style.transform = `translate(${line.x}px, ${line.y}px)`;
      });
      for (let i = layout.lines.length; i < pool.length; i++) pool[i].hidden = true;
      if (!entry.inline) styles.push(`[data-cat-flow-source="${id}"]{min-height:${Math.max(entry.baseHeight, layout.height + entry.top + entry.bottom)}px!important}`);
    });
    const css = styles.join('\n');
    if (rules.textContent !== css) rules.textContent = css;
    frame = requestAnimationFrame(tick);
  }

  function tick() {
    try { render(); } catch (error) { stop(); console.warn('Cat text flow unavailable:', error); }
  }

  function stop() {
    active = false;
    cancelAnimationFrame(frame);
    frame = 0;
    changed.disconnect();
    clearSources();
    layer?.remove(); rules?.remove();
    layer = rules = mask = null;
  }

  return {
    start() {
      stop();
      layer = document.createElement('div');
      layer.className = 'cat-text-flow';
      layer.setAttribute('aria-hidden', 'true');
      rules = document.createElement('style');
      document.body.append(layer, rules);
      try { mask = silhouette(rig); measure(); } catch (error) { stop(); console.warn('Cat text flow unavailable:', error); return; }
      active = true;
      changed.observe(page, {subtree:true, childList:true, characterData:true,
        attributes:true, attributeFilter:['style','class']});
      frame = requestAnimationFrame(tick);
    },
    stop,
    invalidate() { clearCache(); if (active) dirty = true; },
  };
}
