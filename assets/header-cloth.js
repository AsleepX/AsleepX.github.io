import { weaveTexture, FRAY_SPACE } from './cloth-texture.js?v=350f4b2f';
import { ClothNet } from './cloth-physics.js?v=5aa4450c';

function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', {alpha: true, antialias: false, depth: false, stencil: false});
  if (!gl) return null;
  const vertexSource = [
    'attribute vec2 a_position;',
    'attribute vec3 a_normal;',
    'attribute vec2 a_uv;',
    'uniform vec2 u_size;',
    'varying vec2 v_uv;',
    'varying vec3 v_normal;',
    'void main() {',
    '  gl_Position = vec4(a_position.x / u_size.x * 2.0 - 1.0, 1.0 - a_position.y / u_size.y * 2.0, 0.0, 1.0);',
    '  v_uv = a_uv; v_normal = a_normal;',
    '}',
  ].join('\n');
  const fragmentSource = [
    'precision highp float;',
    'uniform sampler2D u_cloth;',
    'varying vec2 v_uv;',
    'varying vec3 v_normal;',
    'void main() {',
    '  vec3 light = normalize(vec3(-0.28, -0.42, 1.0));',
    '  float relief = 1.0 + (dot(normalize(v_normal), light) - light.z) * 0.65;',
    '  vec4 yarn = texture2D(u_cloth, v_uv);',
    '  gl_FragColor = vec4(yarn.rgb * relief * yarn.a, yarn.a);',
    '}',
  ].join('\n');
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const positions = gl.createBuffer(), elements = gl.createBuffer(), texture = gl.createTexture();
  gl.bindBuffer(gl.ARRAY_BUFFER, positions);
  for (const [name, count, offset] of [['a_position', 2, 0], ['a_normal', 3, 8], ['a_uv', 2, 20]]) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, count, gl.FLOAT, false, 32, offset);
  }
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program, 'u_cloth'), 0);
  const size = gl.getUniformLocation(program, 'u_size');
  let count = 0;
  return {
    upload(material, net) {
      canvas.width = material.width; canvas.height = material.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(size, net.width, net.height);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, material);
      const indices = net.indices(); count = indices.length;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.bufferData(gl.ARRAY_BUFFER, net.count * 32, gl.DYNAMIC_DRAW);
    },
    draw(net) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, net.vertices());
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    },
  };
}

const header = document.querySelector('.header--woven');
if (header) {
  const canvas = document.createElement('canvas');
  canvas.className = 'header-cloth';
  canvas.setAttribute('aria-hidden', 'true');
  header.prepend(canvas);
  header.style.setProperty('--cloth-fray-space', `${FRAY_SPACE}px`);
  let renderer = createRenderer(canvas);
  let material, net, frame = 0, resizeFrame = 0, lastTime = 0, lastPointer = null;
  let visible = true, lost = false, width = 0, height = 0, scale = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = () => renderer && !lost && visible && !document.hidden && !reduced.matches;
  function stop() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0; lastPointer = null;
    if (net) { net.reset(); if (renderer && !lost) renderer.draw(net); }
  }
  function animate(now) {
    frame = 0;
    if (!active()) return;
    net.step(lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60);
    lastTime = now;
    renderer.draw(net);
    if (net.awake) frame = requestAnimationFrame(animate);
    else lastTime = 0;
  }
  function rebuild() {
    resizeFrame = 0;
    const rect = header.getBoundingClientRect();
    const nextScale = Math.min(devicePixelRatio || 1, 2);
    if (width === rect.width && height === rect.height + FRAY_SPACE && scale === nextScale) return;
    stop(); width = rect.width; height = rect.height + FRAY_SPACE; scale = nextScale;
    if (width <= 0 || height <= 0) return;
    const nextMaterial = weaveTexture(width, height, scale);
    nextMaterial.className = 'header-cloth header-cloth-base';
    nextMaterial.setAttribute('aria-hidden', 'true');
    if (material) material.replaceWith(nextMaterial);
    else canvas.before(nextMaterial);
    material = nextMaterial;
    net = new ClothNet(width, height);
    if (renderer && !lost) {
      renderer.upload(material, net); renderer.draw(net);
      material.style.visibility = 'hidden';
    }
    else canvas.style.visibility = 'hidden';
    header.classList.add('has-cloth');
  }
  header.addEventListener('pointermove', event => {
    if (!active() || !net || event.pointerType === 'touch') return;
    const rect = header.getBoundingClientRect();
    const point = {x: event.clientX - rect.left, y: event.clientY - rect.top, time: event.timeStamp};
    if (lastPointer) {
      net.stroke(lastPointer, point, (point.time - lastPointer.time) / 1000);
      if (net.awake && !frame) frame = requestAnimationFrame(animate);
    }
    lastPointer = point;
  }, {passive: true});
  header.addEventListener('pointerleave', () => { lastPointer = null; });
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  reduced.addEventListener('change', stop);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) stop();
  }).observe(header);
  const resize = () => { if (!resizeFrame) resizeFrame = requestAnimationFrame(rebuild); };
  new ResizeObserver(resize).observe(header);
  window.addEventListener('resize', resize, {passive: true});
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; canvas.style.visibility = 'hidden';
    if (material) material.style.visibility = '';
    stop();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    renderer = createRenderer(canvas); lost = false;
    if (renderer && material && net) {
      renderer.upload(material, net); renderer.draw(net); canvas.style.visibility = '';
      material.style.visibility = 'hidden';
    }
  });
  rebuild();
}
