// The cloth is drawn yarn by yarn. No photograph, bitmap asset or noise tile is
// loaded: even the irregular dye, twist, slubs and loose fibres are procedural.
const PITCH = 2.1;
const ANGLE = -.4;
export const FRAY_SPACE = 18;
const mod = (n, m) => (n % m + m) % m;
function grain(a, b, salt = 0) {
  let n = Math.imul(a + salt * 71, 374761393) ^ Math.imul(b + salt * 37, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
}
function ink(rgb, light = 1, lift = 0) {
  return 'rgb(' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v * light + lift)))).join(',') + ')';
}
function yarn(index, direction) {
  const stripe = mod(index + direction * 2, 46);
  const fleck = grain(index, direction, 9);
  let rgb;
  if (stripe < 19) {
    rgb = mod(index * 3 + direction, 7) < 3
      ? [145, 174, 151] : [216, 226, 205];
  } else if (stripe < 23 && mod(index, 3) !== 0) {
    rgb = [99, 139, 118];
  } else {
    rgb = [246, 239, 221];
  }
  return {rgb: rgb.map(v => v * (.95 + fleck * .08)), width: PITCH * (.73 + grain(index, direction, 3) * .26)};
}

// Several irregular scales make a hand-cut edge, without a repeating wave.
function edgeNoise(x, spacing, salt) {
  const cell = Math.floor(x / spacing), t = mod(x, spacing) / spacing;
  const blend = t * t * (3 - 2 * t);
  return (grain(cell, 0, salt) * (1 - blend) + grain(cell + 1, 0, salt) * blend) * 2 - 1;
}
function cutEdge(x, height) {
  return height - FRAY_SPACE - 2 + edgeNoise(x, 63, 71) * 2.8
    + edgeNoise(x, 17, 72) * 1.7 + edgeNoise(x, 3.1, 73) * .65;
}

function finishEdge(ctx, width, height, c, s) {
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(width, 0);
  for (let x = width; x >= 0; x -= 1) ctx.lineTo(x, cutEdge(x, height));
  ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';

  // Continue the actual warp/weft yarns at their cut intersections. They retain
  // their stripe colour and direction, then loosen into finer, curved fibres.
  for (let family = 0; family < 2; family++) {
    const coordinate = (x, y) => family === 0
      ? ((x - width / 2) * c + (y - height / 2) * s) / PITCH
      : (-(x - width / 2) * s + (y - height / 2) * c) / PITCH;
    const first = Math.floor(coordinate(0, cutEdge(0, height))) - 3;
    const last = Math.ceil(coordinate(width, cutEdge(width, height))) + 3;
    for (let index = first; index <= last; index++) {
      const seed = grain(index, family, 81);
      // Most cut yarns stay in the cloth; occasional ends loosen at the edge.
      if (seed < .67) continue;
      let x = width / 2, y = cutEdge(x, height);
      for (let solve = 0; solve < 5; solve++) {
        x = width / 2 + (family === 0
          ? (index * PITCH - (y - height / 2) * s) / c
          : ((y - height / 2) * c - index * PITCH) / s);
        y = cutEdge(x, height);
      }
      if (x < 0 || x > width) continue;
      const thread = yarn(index, family);
      const length = seed > .975 ? 6 + grain(index, family, 82) * 4 : 1.5 + grain(index, family, 82) * 3;
      const dx = family === 0 ? -s : -c, dy = family === 0 ? c : -s;
      const curl = (grain(index, family, 83) - .5) * length * .8;
      function looseFibre(offset, thickness, light, reach) {
        ctx.strokeStyle = ink(thread.rgb, light, 2);
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(x - dx * 1.5 + offset, y - dy * 1.5);
        ctx.bezierCurveTo(x + dx * reach * .3 + offset, y + dy * reach * .3,
          x + dx * reach * .85 + curl + offset, y + dy * reach * .8,
          x + dx * reach + curl * .65 + offset, y + dy * reach + Math.abs(curl) * .22);
        ctx.stroke();
      }
      looseFibre(0, thread.width * .48, .77, length * .55);
      for (let fibre = 0; fibre < 2; fibre++) {
        looseFibre((fibre - .5) * thread.width * .23, .18 + grain(index, fibre, 84) * .17,
          .78 + fibre * .12, length * (.76 + grain(index, fibre, 85) * .24));
      }
    }
  }

  // A light wash follows the cloth's alpha, including its loose ends;
  // a rectangular CSS overlay would conceal the cut edge.
  ctx.globalCompositeOperation = 'source-atop';
  const shade = ctx.createLinearGradient(0, 0, width, 0);
  const stops = width <= 680 ? [[0, .36], [.6, .28], [1, .34]]
    : [[0, .36], [.24, .24], [.42, .12], [.62, .28], [1, .4]];
  for (const [stop, alpha] of stops) shade.addColorStop(stop, `rgba(250,249,243,${alpha})`);
  ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
}

export function weaveTexture(width, height, scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#a7ad98';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(ANGLE);
  ctx.lineCap = 'round';
  const c = Math.cos(ANGLE), s = Math.sin(ANGLE);
  const across = Math.ceil((width * c + height * Math.abs(s)) / (2 * PITCH)) + 3;
  const down = Math.ceil((width * Math.abs(s) + height * c) / (2 * PITCH)) + 3;
  const warp = new Map(), weft = new Map();
  for (let i = -across; i <= across; i++) warp.set(i, yarn(i, 0));
  for (let j = -down; j <= down; j++) weft.set(j, yarn(j, 1));

  function stroke(x, y, vertical, offset, length, bend, thickness, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(x + offset, y - length);
      ctx.quadraticCurveTo(x + offset + bend, y, x + offset, y + length);
    } else {
      ctx.moveTo(x - length, y + offset);
      ctx.quadraticCurveTo(x, y + offset + bend, x + length, y + offset);
    }
    ctx.stroke();
  }
  function strand(i, j, vertical, over) {
    const seed = grain(i, j, vertical ? 12 : 23);
    const thread = vertical ? warp.get(i) : weft.get(j);
    const dye = .95 + grain(i, j, 4) * .08;
    const longDye = .99 + .025 * Math.sin((vertical ? j : i) * .14 + seed);
    const fadedPatch = .99 + .025 * Math.sin(i * .13 + Math.sin(j * .18)) + .018 * Math.sin(j * .27 + i * .08);
    const light = dye * longDye * fadedPatch * (over ? 1 : .8);
    const x = i * PITCH + Math.sin(j * .18 + i * 5.3) * .1;
    const y = j * PITCH + Math.sin(i * .15 + j * 2.7) * .1;
    const thickness = thread.width * (.93 + seed * .14);
    const bend = (seed - .5) * .25;
    const half = PITCH * .59;
    if (over) stroke(x + .17, y + .26, vertical, 0, half, bend, thickness + .48, 'rgba(39,40,36,.28)');
    stroke(x, y, vertical, 0, half, bend, thickness, ink(thread.rgb, light));
    // Longitudinal fibres and an off-centre highlight describe round, twisted
    // yarn rather than a flat checkerboard. Each crossover remains separate.
    stroke(x - .07, y - .09, vertical, -thickness * .22, half * .96, bend, thickness * .22, ink(thread.rgb, light * 1.16, over ? 9 : 0));
    stroke(x, y, vertical, thickness * .23, half, -bend, .16, ink(thread.rgb, light * .68));
    if (over) {
      const twist = Math.sin((vertical ? j : i) * 1.47 + (vertical ? i : j) * 2.1);
      stroke(x, y, vertical, twist * thickness * .27, half * .87, -.16, .12, ink(thread.rgb, light * 1.22, 8));
    }
    // Sparse cotton hairs and thickened slubs; randomness is stable on resize.
    if (over && seed > .948) {
      stroke(x, y, vertical, thickness * .53, half * 1.7, (seed - .98) * 18, .12, ink(thread.rgb, light * .86, 10));
    }
  }
  for (let j = -down; j <= down; j++) {
    for (let i = -across; i <= across; i++) {
      const px = i * PITCH * c - j * PITCH * s + width / 2;
      const py = i * PITCH * s + j * PITCH * c + height / 2;
      if (px < -5 || px > width + 5 || py < -5 || py > height + 5) continue;
      // Two-over, two-under twill gives staggered edges and longer yarn floats.
      const warpOnTop = mod(i + j, 4) < 2;
      strand(i, j, !warpOnTop, false);
      strand(i, j, warpOnTop, true);
    }
  }
  ctx.restore();
  finishEdge(ctx, width, height, c, s);
  return canvas;
}
