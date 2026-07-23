(function initFluidPointerBackground() {
  'use strict';

  const canvas = document.getElementById('pointer-fire');
  if (!canvas) return;

  canvas.hidden = false;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);

  let reducedMotion = reducedMotionQuery.matches;
  let coarsePointer = coarsePointerQuery.matches;
  let viewportWidth = Math.max(1, document.documentElement.clientWidth || window.innerWidth || 1);
  let viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
  let resizePending = true;
  let fallbackActive = false;
  let fallbackFrame = 0;

  const pointer = {
    x: viewportWidth * 0.62,
    y: viewportHeight * 0.38,
    targetX: viewportWidth * 0.62,
    targetY: viewportHeight * 0.38,
    isInside: false,
    lastInteraction: 0
  };

  function setCssPointer(x, y) {
    document.documentElement.style.setProperty('--pointer-x', `${x}px`);
    document.documentElement.style.setProperty('--pointer-y', `${y}px`);
  }

  function updatePointer(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    pointer.targetX = Math.max(0, Math.min(viewportWidth, x));
    pointer.targetY = Math.max(0, Math.min(viewportHeight, y));
    pointer.isInside = true;
    pointer.lastInteraction = performance.now();
    setCssPointer(pointer.targetX, pointer.targetY);
  }

  function onPointer(event) {
    if (event.isPrimary === false) return;
    updatePointer(event.clientX, event.clientY);
  }

  function onTouch(event) {
    const touch = event.touches && event.touches[0];
    if (touch) updatePointer(touch.clientX, touch.clientY);
  }

  function onPointerLeave() {
    pointer.isInside = false;
  }

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  document.documentElement.addEventListener('mouseleave', onPointerLeave, { passive: true });

  function getViewportSize() {
    return {
      width: Math.max(1, document.documentElement.clientWidth || window.innerWidth || 1),
      height: Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1)
    };
  }

  function markResize() {
    const next = getViewportSize();
    viewportWidth = next.width;
    viewportHeight = next.height;
    resizePending = true;
  }

  window.addEventListener('resize', markResize, { passive: true });
  window.addEventListener('orientationchange', markResize, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', markResize, { passive: true });
  }

  function animateFallback(now) {
    if (!fallbackActive) return;

    if (!reducedMotion) {
      const t = now * 0.00022;
      const x = viewportWidth * (0.50 + Math.sin(t * 1.17) * 0.23 + Math.sin(t * 0.47) * 0.05);
      const y = viewportHeight * (0.45 + Math.cos(t * 0.91) * 0.20);
      setCssPointer(x, y);
    }

    fallbackFrame = window.requestAnimationFrame(animateFallback);
  }

  function activateFallback() {
    if (fallbackActive) return;
    fallbackActive = true;
    canvas.classList.add('pointer-fire--css-fallback');
    canvas.width = 1;
    canvas.height = 1;
    setCssPointer(pointer.targetX, pointer.targetY);
    fallbackFrame = window.requestAnimationFrame(animateFallback);
  }

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false
  });

  if (!gl) {
    activateFallback();
    return;
  }

  const trailCount = coarsePointer || isSafari ? 8 : 10;
  const fbmOctaves = coarsePointer || isSafari ? 4 : 5;

  const vertexSource = `
    attribute vec2 aPosition;
    void main(){
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uTrail[${trailCount}];
    uniform float uActivity;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p){
      float value = 0.0;
      float amplitude = 0.5;
      mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
      for (int i = 0; i < ${fbmOctaves}; i++){
        value += amplitude * noise(p);
        p = rotation * p * 2.03 + 17.1;
        amplitude *= 0.5;
      }
      return value;
    }

    void main(){
      vec2 frag = gl_FragCoord.xy;
      vec2 uv = frag / uResolution;
      vec2 p = (frag - 0.5 * uResolution) / min(uResolution.x, uResolution.y);

      float t = uTime * 0.12;
      vec2 warpA = vec2(
        fbm(p * 1.55 + vec2(t, -t * 0.7)),
        fbm(p * 1.55 + vec2(4.2 - t * 0.5, 1.7 + t))
      );
      vec2 warpB = vec2(
        fbm(p * 2.4 + warpA * 1.7 - vec2(t * 0.3, t)),
        fbm(p * 2.1 - warpA * 1.3 + vec2(t, 5.0))
      );
      float cloud = fbm(p * 2.25 + warpA * 1.8 + warpB * 0.65);
      float ridges = 1.0 - abs(2.0 * cloud - 1.0);
      ridges = smoothstep(0.40, 0.92, ridges);

      float trail = 0.0;
      float hot = 0.0;
      for (int i = 0; i < ${trailCount}; i++){
        vec2 m = uTrail[i];
        vec2 mp = (m * uResolution - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        vec2 delta = p - mp;
        delta.x += 0.035 * sin(delta.y * 15.0 + t * 8.0 + float(i));
        float distanceToTrail = length(delta);
        float weight = 1.0 - float(i) / ${trailCount.toFixed(1)};
        trail += exp(-distanceToTrail * distanceToTrail * (15.0 + float(i) * 1.2)) * weight;
        hot += exp(-distanceToTrail * distanceToTrail * (48.0 + float(i) * 2.0)) * weight;
      }

      trail = clamp(trail * 0.42, 0.0, 1.0) * uActivity;
      hot = clamp(hot * 0.28, 0.0, 1.0) * uActivity;

      float ambient = smoothstep(0.58, 0.92, cloud) * 0.16;
      float smoke = ridges * (0.10 + trail * 0.85) + ambient;
      smoke *= 0.78 + 0.22 * fbm(p * 4.4 - warpB + t);

      vec3 deepBlue = vec3(0.0, 0.018, 0.075);
      vec3 blue = vec3(0.0, 0.40, 1.0);
      vec3 luminousBlue = vec3(0.62, 0.80, 1.0);
      vec3 pearlWhite = vec3(0.985, 0.99, 1.0);
      vec3 blushPink = vec3(1.0, 0.92, 0.95);
      vec3 palePeach = vec3(1.0, 0.88, 0.79);

      vec3 color = mix(deepBlue, blue, clamp(smoke * 1.4, 0.0, 1.0));
      color = mix(color, luminousBlue, hot * (0.32 + 0.35 * ridges));

      float pearlPhase = smoothstep(0.52, 0.90, cloud) * hot * ridges;
      vec3 pearlTint = mix(pearlWhite, blushPink, smoothstep(0.48, 0.78, cloud));
      pearlTint = mix(pearlTint, palePeach, smoothstep(0.76, 0.95, cloud) * 0.32);
      color = mix(color, pearlTint, pearlPhase * 0.075);

      float vignette = 1.0 - smoothstep(0.24, 1.08, length((uv - 0.5) * vec2(1.05, 0.92)));
      float alpha = clamp((smoke * 0.72 + hot * 0.24) * vignette, 0.0, 0.72);
      gl_FragColor = vec4(color * alpha, alpha);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Studio Rage background shader:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    activateFallback();
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Studio Rage background program:', gl.getProgramInfoLog(program));
    activateFallback();
    return;
  }

  gl.useProgram(program);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
  const timeLocation = gl.getUniformLocation(program, 'uTime');
  const trailLocation = gl.getUniformLocation(program, 'uTrail[0]');
  const activityLocation = gl.getUniformLocation(program, 'uActivity');

  const trail = Array.from({ length: trailCount }, () => ({ x: pointer.x, y: pointer.y }));
  const packedTrail = new Float32Array(trailCount * 2);

  let activity = coarsePointer ? 0.68 : 0.45;
  let targetActivity = activity;
  let dpr = 1;
  let start = performance.now();
  let previousFrame = 0;
  let renderedReducedFrame = false;
  let animationFrame = 0;
  let stopped = false;

  function chooseDpr() {
    const nativeDpr = Math.max(1, window.devicePixelRatio || 1);
    const dprLimit = coarsePointer ? 1.5 : 2;
    const pixelBudget = coarsePointer ? 1200000 : 6500000;
    const budgetDpr = Math.sqrt(pixelBudget / Math.max(1, viewportWidth * viewportHeight));
    return Math.max(1, Math.min(nativeDpr, dprLimit, budgetDpr));
  }

  function resizeCanvas() {
    if (!resizePending) return;
    resizePending = false;

    const next = getViewportSize();
    viewportWidth = next.width;
    viewportHeight = next.height;
    dpr = chooseDpr();

    const width = Math.max(1, Math.round(viewportWidth * dpr));
    const height = Math.max(1, Math.round(viewportHeight * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      gl.viewport(0, 0, width, height);
      renderedReducedFrame = false;
    }
  }

  function updateAutopilot(now) {
    if (reducedMotion) {
      pointer.targetX = viewportWidth * 0.62;
      pointer.targetY = viewportHeight * 0.38;
      targetActivity = 0.52;
      return;
    }

    const shouldDrift = coarsePointer || !pointer.isInside;
    if (shouldDrift) {
      const t = (now - start) / 1000;
      pointer.targetX = viewportWidth * (0.51 + Math.sin(t * 0.23) * 0.22 + Math.sin(t * 0.09) * 0.05);
      pointer.targetY = viewportHeight * (0.43 + Math.cos(t * 0.19) * 0.19);
      targetActivity = coarsePointer ? 0.72 : 0.48;
    } else {
      targetActivity += (0.52 - targetActivity) * 0.006;
    }
  }

  function render(now) {
    animationFrame = window.requestAnimationFrame(render);
    if (stopped || document.visibilityState === 'hidden') return;

    resizeCanvas();

    const nativeDpr = Math.max(1, window.devicePixelRatio || 1);
    const targetFps = coarsePointer ? 30 : (isSafari || nativeDpr > 1.5 ? 45 : 60);
    const frameInterval = 1000 / targetFps;
    if (!reducedMotion && now - previousFrame < frameInterval) return;
    if (reducedMotion && renderedReducedFrame && !resizePending) return;
    previousFrame = now;

    updateAutopilot(now);

    pointer.x += (pointer.targetX - pointer.x) * (coarsePointer ? 0.045 : 0.11);
    pointer.y += (pointer.targetY - pointer.y) * (coarsePointer ? 0.045 : 0.11);

    trail[0].x += (pointer.x - trail[0].x) * 0.28;
    trail[0].y += (pointer.y - trail[0].y) * 0.28;
    for (let i = 1; i < trail.length; i += 1) {
      const follow = Math.max(0.08, 0.17 - i * 0.008);
      trail[i].x += (trail[i - 1].x - trail[i].x) * follow;
      trail[i].y += (trail[i - 1].y - trail[i].y) * follow;
    }

    activity += (targetActivity - activity) * 0.035;

    for (let i = 0; i < trail.length; i += 1) {
      packedTrail[i * 2] = trail[i].x / viewportWidth;
      packedTrail[i * 2 + 1] = 1 - trail[i].y / viewportHeight;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, reducedMotion ? 0 : (now - start) / 1000);
    gl.uniform2fv(trailLocation, packedTrail);
    gl.uniform1f(activityLocation, activity);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    renderedReducedFrame = reducedMotion;
  }

  function updateMediaPreferences() {
    reducedMotion = reducedMotionQuery.matches;
    coarsePointer = coarsePointerQuery.matches;
    resizePending = true;
    renderedReducedFrame = false;
    if (!reducedMotion) start = performance.now();
  }

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', updateMediaPreferences);
    coarsePointerQuery.addEventListener('change', updateMediaPreferences);
  } else {
    reducedMotionQuery.addListener(updateMediaPreferences);
    coarsePointerQuery.addListener(updateMediaPreferences);
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stopped = true;
    window.cancelAnimationFrame(animationFrame);
    activateFallback();
  }, false);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      previousFrame = 0;
      resizePending = true;
    }
  });

  window.addEventListener('pagehide', () => {
    stopped = true;
    window.cancelAnimationFrame(animationFrame);
    window.cancelAnimationFrame(fallbackFrame);
  }, { once: true });

  setCssPointer(pointer.x, pointer.y);
  resizeCanvas();
  animationFrame = window.requestAnimationFrame(render);
})();
