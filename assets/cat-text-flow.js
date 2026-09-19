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

export function glyphOffsets(glyphs, obstacle, minY = -Infinity) {
  return glyphs.map(glyph => {
    if (!obstacle || glyph.right < obstacle.left - 2 || glyph.left > obstacle.right + 2 ||
        glyph.bottom < obstacle.top - 2 || glyph.top > obstacle.bottom + 2) return 0;
    const intervals = [];
    if (glyph.ink && obstacle.columns) {
      // Each interval is a forbidden vertical displacement between actual ink
      // runs. Counters (such as the hole in o) and serif whitespace stay empty.
      const {scale, padding = 2} = obstacle;
      glyph.ink.columns.forEach((runs, x) => {
        if (!runs.length) return;
        const worldX = glyph.left + (x + .5) / glyph.ink.scale;
        const first = Math.max(0, Math.floor((worldX - obstacle.left - padding) * scale));
        const last = Math.min(obstacle.columns.length - 1, Math.ceil((worldX - obstacle.left + padding) * scale));
        for (let column = first; column <= last; column++) {
          for (const [catTop, catBottom] of obstacle.columns[column]) {
            for (const [top,bottom] of runs) intervals.push([
              obstacle.top + catTop/scale - padding - glyph.top - bottom/glyph.ink.scale,
              obstacle.top + catBottom/scale + padding - glyph.top - top/glyph.ink.scale,
            ]);
          }
        }
      });
    } else {
      for (const [top,bottom] of catIntervals(glyph, obstacle)) intervals.push([top - glyph.bottom,bottom - glyph.top]);
    }
    intervals.sort((a,b) => a[0] - b[0]);
    const merged = [];
    for (const interval of intervals) {
      const previous = merged.at(-1);
      if (previous && interval[0] <= previous[1]) previous[1] = Math.max(previous[1], interval[1]);
      else merged.push([...interval]);
    }
    if (!merged.some(([top,bottom]) => top < -.01 && bottom > .01)) return 0;
    const candidates = merged.flat()
      .filter(dy => glyph.top + dy >= minY)
      .sort((a,b) => Math.abs(a) - Math.abs(b) || a - b);
    // Other letters are deliberately not obstacles: neighboring rows may
    // overlap temporarily, rather than forcing a letter to leap over a line.
    return candidates.find(value => !merged.some(([top,bottom]) => value > top + .01 && value < bottom - .01)) ?? 0;
  });
}

export function springStep(position, velocity, target, dt) {
  // Exact critically damped spring; stable across refresh rates, no bouncing.
  const omega = target === 0 ? 12 : 18;
  const error = position - target, impulse = velocity + omega * error;
  const decay = Math.exp(-omega * dt);
  return {position:target + (error + impulse * dt) * decay,
    velocity:(velocity - omega * impulse * dt) * decay};
}

function inkColumns(canvas) {
  const {width,height} = canvas;
  const data = canvas.getContext('2d').getImageData(0,0,width,height).data;
  return Array.from({length:width}, (_,x) => {
    const runs = [];
    let start = -1;
    for (let y=0;y<=height;y++) {
      const filled = y < height && data[(y*width+x)*4+3] > 40;
      if (filled && start < 0) start = y;
      else if (!filled && start >= 0) { runs.push([start,y]); start = -1; }
    }
    return runs;
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
  return {rows, columns:inkColumns(canvas), scale, margin, width:canvas.width/scale, height:canvas.height/scale, padding:2};
}

export function createCatTextFlow(rig) {
  let active = false, dirty = false, frame = 0, entries = [];
  let layer = null, mask = null;
  let previousTime = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
            const scale = 2;
            const left = Math.floor(-metrics.left) - 1, top = Math.floor(-metrics.ascent) - 1;
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1,Math.ceil((metrics.right - left + 1) * scale));
            canvas.height = Math.max(1,Math.ceil((metrics.descent - top + 1) * scale));
            const paint = canvas.getContext('2d');
            paint.scale(scale,scale); paint.font = font;
            paint.fillText(text,-left,-top);
            metrics.ink = {columns:inkColumns(canvas),scale};
            metrics.inkLeft = left; metrics.inkTop = top;
            metrics.inkWidth = canvas.width/scale; metrics.inkHeight = canvas.height/scale;
            metricsCache.set(key,metrics);
          }
          const x = anchor.left - rect.left;
          const y = anchor.top - rect.top + (anchor.height - lineHeight)/2;
          const baseline = y + (lineHeight - metrics.fontAscent - metrics.fontDescent)/2 + metrics.fontAscent;
          const span = document.createElement('span');
          span.textContent = text;
          span.style.width = `${metrics.width}px`;
          host.append(span);
          glyphs.push({span,x,y,left:x + metrics.inkLeft,right:x + metrics.inkLeft + metrics.inkWidth,
            top:baseline + metrics.inkTop,bottom:baseline + metrics.inkTop + metrics.inkHeight,
            ink:metrics.ink,position:0,velocity:0});
        }
      }
      host.hidden = true;
      return {element, id, host, glyphs};
    });
    dirty = false;
  }

  function render(now) {
    if (!layer) return;
    const dt = Math.min(.05,Math.max(0,(now - previousTime)/1000));
    previousTime = now;
    // Pretext measures each grapheme once. DOM ranges preserve the original
    // kerning and line anchors; moving the cat never recalculates paragraph flow.
    if (dirty) measure();
    const catRect = rig.getBoundingClientRect();
    const obstacle = active ? {...mask, left:catRect.left - mask.margin, right:catRect.left - mask.margin + mask.width,
      top:catRect.top - mask.margin, bottom:catRect.top - mask.margin + mask.height} : null;
    const boxes = entries.map(entry => entry.element.getBoundingClientRect());
    const letters = entries.flatMap((entry,i) => entry.glyphs.map(glyph => ({
      left:boxes[i].left + glyph.left, right:boxes[i].left + glyph.right,
      top:boxes[i].top + glyph.top, bottom:boxes[i].top + glyph.bottom,
      ink:glyph.ink,
    })));
    const offsets = glyphOffsets(letters, obstacle, 2 - scrollY);
    let letterIndex = 0;
    let moving = false;
    entries.forEach((entry, index) => {
      const {element, host, glyphs, id} = entry;
      const box = boxes[index];
      const movements = offsets.slice(letterIndex,letterIndex + glyphs.length);
      letterIndex += glyphs.length;
      glyphs.forEach((glyph,i) => {
        const target = movements[i];
        const next = reducedMotion.matches ? {position:target,velocity:0} : springStep(glyph.position,glyph.velocity,target,dt);
        if (Math.abs(next.position - target) < .02 && Math.abs(next.velocity) < .1) {
          next.position = target; next.velocity = 0;
        }
        Object.assign(glyph,next);
      });
      if (!glyphs.some(glyph => glyph.position !== 0 || glyph.velocity !== 0)) {
        element.removeAttribute('data-cat-flow-source');
        host.hidden = true;
        return;
      }
      moving = true;
      element.setAttribute('data-cat-flow-source', String(id));
      host.hidden = false;
      host.style.transform = `translate(${box.left + scrollX}px, ${box.top + scrollY}px)`;
      glyphs.forEach(glyph => {
        glyph.span.style.transform = `translate(${glyph.x}px, ${glyph.y + glyph.position}px)`;
      });
    });
    if (!active && !moving) { stop(); return; }
    frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    try { render(now); } catch (error) { stop(); console.warn('Cat text flow unavailable:', error); }
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
      previousTime = performance.now();
      changed.observe(page, {subtree:true, childList:true, characterData:true,
        attributes:true, attributeFilter:['style','class']});
      frame = requestAnimationFrame(tick);
    },
    release() { active = false; changed.disconnect(); },
    stop,
    invalidate() { clearCache(); if (active) dirty = true; },
  };
}
