import { prepareWithSegments, measureNaturalWidth, clearCache } from './vendor/pretext-0.0.9/layout.js';

const targets = '.brand, nav a, #name, .bio, .info-row h2, .statement, .detail, .email, address, footer span';

// Anchors never move: only letters whose ORIGINAL ink touches the cat can move.
function catIntervals(glyph, obstacle) {
  if (!obstacle || glyph.right <= obstacle.left || glyph.left >= obstacle.right) return [];
  const intervals = [];
  if (obstacle.rows) {
    const {scale, padding = 2} = obstacle;
    for (let row = 0; row < obstacle.rows.length; row++) {
      for (const [left, right] of obstacle.rows[row]) {
        if (glyph.right > obstacle.left + left / scale - padding && glyph.left < obstacle.left + right / scale + padding) {
          intervals.push([obstacle.top + row / scale - padding, obstacle.top + (row + 1) / scale + padding]);
          break;
        }
      }
    }
  } else intervals.push([obstacle.top, obstacle.bottom]);
  return intervals;
}

const intersects = (glyph, interval, dy = 0) => glyph.bottom + dy > interval[0] + .01 && glyph.top + dy < interval[1] - .01;

export function glyphOffsets(glyphs, obstacle, minY = -Infinity) {
  const bands = glyphs.map(glyph => catIntervals(glyph, obstacle));
  const touched = bands.map((intervals, i) => intervals.some(band => intersects(glyphs[i], band)));
  const occupied = glyphs.filter((_,i) => !touched[i]);
  return glyphs.map((glyph, i) => {
    if (!touched[i]) return 0;
    const intervals = [...bands[i]];
    for (const other of occupied) {
      if (glyph.left < other.right && glyph.right > other.left) intervals.push([other.top - 1, other.bottom + 1]);
    }
    intervals.sort((a,b) => a[0] - b[0]);
    const merged = [];
    for (const interval of intervals) {
      const previous = merged.at(-1);
      if (previous && interval[0] <= previous[1]) previous[1] = Math.max(previous[1], interval[1]);
      else merged.push([...interval]);
    }
    const candidates = merged.flatMap(([top,bottom]) => [top - glyph.bottom, bottom - glyph.top])
      .filter(dy => glyph.top + dy >= minY)
      .sort((a,b) => Math.abs(a) - Math.abs(b) || a - b);
    const dy = candidates.find(value => !merged.some(band => intersects(glyph, band, value))) ?? 0;
    occupied.push({...glyph, top:glyph.top + dy, bottom:glyph.bottom + dy});
    return dy;
  });
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

export function createCatTextFlow(rig) {
  let active = false, dirty = false, frame = 0, entries = [];
  let layer = null, mask = null;
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
    if (layer) layer.replaceChildren();
    entries = [];
  }

  function measure() {
    clearSources();
    const segmenter = new Intl.Segmenter(document.documentElement.lang || 'en', {granularity:'grapheme'});
    const metricsCache = new Map();
    entries = [...page.querySelectorAll(targets)].map((element, id) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const fontSize = parseFloat(style.fontSize);
      const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = font;
      const host = document.createElement('div');
      host.className = 'cat-text-flow-block';
      Object.assign(host.style, {font, lineHeight:`${lineHeight}px`, letterSpacing:style.letterSpacing,
        color:style.color, textDecoration:style.textDecoration, fontKerning:style.fontKerning, fontVariantLigatures:'none'});
      layer.append(host);
      const glyphs = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let node;
      while ((node = walker.nextNode())) {
        for (const {segment,index} of segmenter.segment(node.textContent)) {
          if (!segment.trim()) continue;
          range.setStart(node,index); range.setEnd(node,index + segment.length);
          const anchor = range.getBoundingClientRect();
          if (!anchor.width || !anchor.height) continue;
          const text = style.textTransform === 'uppercase' ? segment.toUpperCase() : segment;
          const key = `${font}|${style.letterSpacing}|${text}`;
          let metrics = metricsCache.get(key);
          if (!metrics) {
            const prepared = prepareWithSegments(text,font,{letterSpacing:parseFloat(style.letterSpacing) || 0});
            const ink = ctx.measureText(text);
            metrics = {width:measureNaturalWidth(prepared), left:ink.actualBoundingBoxLeft, right:ink.actualBoundingBoxRight,
              ascent:ink.actualBoundingBoxAscent, descent:ink.actualBoundingBoxDescent,
              fontAscent:ink.fontBoundingBoxAscent ?? fontSize*.8, fontDescent:ink.fontBoundingBoxDescent ?? fontSize*.2};
            metricsCache.set(key,metrics);
          }
          const x = anchor.left - rect.left;
          const y = anchor.top - rect.top + (anchor.height - lineHeight)/2;
          const baseline = y + (lineHeight - metrics.fontAscent - metrics.fontDescent)/2 + metrics.fontAscent;
          const span = document.createElement('span');
          span.textContent = text;
          span.style.width = `${metrics.width}px`;
          host.append(span);
          glyphs.push({span,x,y,left:x - metrics.left,right:x + metrics.right,
            top:baseline - metrics.ascent,bottom:baseline + metrics.descent});
        }
      }
      host.hidden = true;
      return {element, id, host, glyphs};
    });
    dirty = false;
  }

  function render() {
    if (!active) return;
    // Pretext measures each grapheme once. DOM ranges preserve the original
    // kerning and line anchors; moving the cat never recalculates paragraph flow.
    if (dirty) measure();
    const catRect = rig.getBoundingClientRect();
    const obstacle = {...mask, left:catRect.left - mask.margin, right:catRect.left - mask.margin + mask.width,
      top:catRect.top - mask.margin, bottom:catRect.top - mask.margin + mask.height};
    const boxes = entries.map(entry => entry.element.getBoundingClientRect());
    const letters = entries.flatMap((entry,i) => entry.glyphs.map(glyph => ({
      left:boxes[i].left + glyph.left, right:boxes[i].left + glyph.right,
      top:boxes[i].top + glyph.top, bottom:boxes[i].top + glyph.bottom,
    })));
    const offsets = glyphOffsets(letters, obstacle, 2 - scrollY);
    let letterIndex = 0;
    entries.forEach((entry, index) => {
      const {element, host, glyphs, id} = entry;
      const box = boxes[index];
      const movements = offsets.slice(letterIndex,letterIndex + glyphs.length);
      letterIndex += glyphs.length;
      if (!movements.some(dy => dy !== 0)) {
        element.removeAttribute('data-cat-flow-source');
        host.hidden = true;
        return;
      }
      element.setAttribute('data-cat-flow-source', String(id));
      host.hidden = false;
      host.style.transform = `translate(${box.left + scrollX}px, ${box.top + scrollY}px)`;
      glyphs.forEach((glyph, i) => {
        glyph.span.style.transform = `translate(${glyph.x}px, ${glyph.y + movements[i]}px)`;
      });
    });
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
    layer?.remove();
    layer = mask = null;
  }

  return {
    start() {
      stop();
      layer = document.createElement('div');
      layer.className = 'cat-text-flow';
      layer.setAttribute('aria-hidden', 'true');
      document.body.append(layer);
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
