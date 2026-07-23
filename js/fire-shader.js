(function initFluidPointerBackground() {
  'use strict';

  const canvas = document.getElementById('pointer-fire');
  if (!canvas) return;

  const root = document.documentElement;
  const userAgent = navigator.userAgent || '';
  const isMacOS = /Macintosh|Mac OS X/i.test(userAgent) && !/iPhone|iPad|iPod/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS/i.test(userAgent);
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

  root.classList.toggle('is-macos', isMacOS);
  root.classList.toggle('is-safari', isSafari);
  canvas.hidden = false;

  let reducedMotion = reducedMotionQuery.matches;
  let coarsePointer = coarsePointerQuery.matches;
  let viewportWidth = Math.max(1, document.documentElement.clientWidth || window.innerWidth || 1);
  let viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
  let resizePending = true;
  let fallbackActive = false;
  let fallbackFrame = 0;
  let animationFrame = 0;
  let scrollingUntil = 0;
  let stopped = false;

  const pointer = {
    x: viewportWidth * 0.62,
    y: viewportHeight * 0.38,
    targetX: viewportWidth * 0.62,
    targetY: viewportHeight * 0.38,
    isInside: false,
    lastInteraction: 0
  };

  function setCssPointer(x, y) {
    root.style.setProperty('--pointer-x', `${x}px`);
    root.style.setProperty('--pointer-y', `${y}px`);
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

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  root.addEventListener('mouseleave', () => { pointer.isInside = false; }, { passive: true });
  window.addEventListener('scroll', () => { scrollingUntil = performance.now() + 180; }, { passive: true });

  function getViewportSize() {
    return {
      width: Math.max(1, document.documentElement.clientWidth || window.innerWidth || 1),
      height: Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1)
    };
  }

  function markResize() {
    const next = getViewportSize();
    if (Math.abs(next.width - viewportWidth) < 2 && Math.abs(next.height - viewportHeight) < 2) return;
    viewportWidth = next.width;
    viewportHeight = next.height;
    resizePending = true;
  }

  window.addEventListener('resize', markResize, { passive: true });
  window.addEventListener('orientationchange', markResize, { passive: true });

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
    root.classList.add('shader-fallback-active');
    canvas.classList.add('pointer-fire--css-fallback');
    canvas.width = 1;
    canvas.height = 1;
    setCssPointer(pointer.targetX, pointer.targetY);
    fallbackFrame = window.requestAnimationFrame(animateFallback);
  }

  const contextOptions = {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false
  };

  const gl = canvas.getContext('webgl', contextOptions);
  if (!gl) {
    activateFallback();
    return;
  }

  root.classList.add('shader-webgl-active');

  // The previous shader used repeated FBM/noise sampling on every pixel. On a
  // Retina display this was very expensive and its grid interpolation produced
  // visible square artefacts when the canvas was rescaled. This version uses
  // only smooth analytic fields, so it remains fluid at a lower render scale.
  const trailCount = coarsePointer || isMacOS || isSafari ? 6 : 8;

  const vertexSource = `
    attribute vec2 aPosition;
    void main() {
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

    void main() {
      vec2 frag = gl_FragCoord.xy;
      vec2 uv = frag / uResolution;
      float minSide = min(uResolution.x, uResolution.y);
      vec2 p = (frag - 0.5 * uResolution) / minSide;
      float t = uTime;

      float body = 0.0;
      float core = 0.0;
      float halo = 0.0;

      for (int i = 0; i < ${trailCount}; i++) {
        vec2 mousePx = uTrail[i] * uResolution;
        vec2 mouse = (mousePx - 0.5 * uResolution) / minSide;
        vec2 d = p - mouse;
        float fi = float(i);
        float weight = 1.0 - fi / ${trailCount.toFixed(1)};

        d.x += sin(d.y * 8.0 + t * 1.15 + fi * 0.72) * (0.018 + fi * 0.0015);
        d.y += sin(d.x * 6.0 - t * 0.82 + fi * 0.51) * 0.010;

        vec2 bodyShape = d * vec2(0.76, 1.16);
        vec2 coreShape = d * vec2(0.90, 1.30);
        float bodyDistance = dot(bodyShape, bodyShape);
        float coreDistance = dot(coreShape, coreShape);

        body += exp(-bodyDistance * (9.0 + fi * 1.35)) * weight;
        core += exp(-coreDistance * (31.0 + fi * 2.8)) * weight;
        halo += exp(-bodyDistance * (3.8 + fi * 0.48)) * weight;
      }

      body = clamp(body * 0.58, 0.0, 1.0) * uActivity;
      core = clamp(core * 0.34, 0.0, 1.0) * uActivity;
      halo = clamp(halo * 0.20, 0.0, 1.0) * uActivity;

      float flowingBand = 0.5 + 0.5 * sin(
        p.x * 5.2 + p.y * 3.4 + t * 0.72 +
        sin(p.y * 4.0 - t * 0.36) * 0.65
      );
      body *= 0.88 + flowingBand * 0.12;

      vec3 navy = vec3(0.0, 0.018, 0.070);
      vec3 electricBlue = vec3(0.0, 0.36, 1.0);
      vec3 iceBlue = vec3(0.48, 0.76, 1.0);
      vec3 pearl = vec3(0.965, 0.985, 1.0);
      vec3 peach = vec3(1.0, 0.86, 0.80);

      vec3 color = mix(navy, electricBlue, smoothstep(0.02, 0.86, body + halo * 0.34));
      color = mix(color, iceBlue, smoothstep(0.18, 0.88, core) * 0.64);
      color = mix(color, pearl, smoothstep(0.50, 0.98, core) * 0.22);
      color = mix(color, peach, smoothstep(0.80, 1.0, core) * 0.045);

      vec2 vignetteUv = (uv - 0.5) * vec2(1.05, 0.92);
      float vignette = 1.0 - smoothstep(0.34, 0.94, length(vignetteUv));
      float alpha = clamp((body * 0.64 + core * 0.22 + halo * 0.14) * vignette, 0.0, 0.64);

      // Tiny per-pixel dither prevents colour banding without introducing a
      // visible noise grid or block pattern.
      float dither = fract(52.9829189 * fract(dot(frag, vec2(0.06711056, 0.00583715)))) - 0.5;
      color += dither / 255.0;

      gl_FragColor = vec4(color * alpha, alpha);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Studio Rage shader compilation:', gl.getShaderInfoLog(shader));
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
    console.error('Studio Rage shader program:', gl.getProgramInfoLog(program));
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

  let activity = coarsePointer ? 0.70 : 0.48;
  let targetActivity = activity;
  let start = performance.now();
  let previousFrame = 0;
  let renderedReducedFrame = false;

  function chooseRenderScale() {
    const nativeDpr = Math.max(1, window.devicePixelRatio || 1);
    const cssPixels = Math.max(1, viewportWidth * viewportHeight);

    let maxDpr = 1.65;
    let pixelBudget = 3200000;

    if (isMacOS || isSafari) {
      maxDpr = 1.18;
      pixelBudget = 1850000;
    }

    if (coarsePointer) {
      maxDpr = Math.min(maxDpr, 1.12);
      pixelBudget = Math.min(pixelBudget, 1050000);
    }

    const budgetScale = Math.sqrt(pixelBudget / cssPixels);
    return Math.max(0.55, Math.min(nativeDpr, maxDpr, budgetScale));
  }

  function resizeCanvas() {
    if (!resizePending) return;
    resizePending = false;

    const next = getViewportSize();
    viewportWidth = next.width;
    viewportHeight = next.height;

    const scale = chooseRenderScale();
    const width = Math.max(1, Math.round(viewportWidth * scale));
    const height = Math.max(1, Math.round(viewportHeight * scale));

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

    const shouldDrift = coarsePointer || !pointer.isInside || now - pointer.lastInteraction > 2400;
    if (shouldDrift) {
      const t = (now - start) / 1000;
      pointer.targetX = viewportWidth * (0.51 + Math.sin(t * 0.23) * 0.22 + Math.sin(t * 0.09) * 0.05);
      pointer.targetY = viewportHeight * (0.43 + Math.cos(t * 0.19) * 0.19);
      targetActivity = coarsePointer ? 0.72 : 0.49;
    } else {
      targetActivity = 0.56;
    }
  }

  function render(now) {
    animationFrame = window.requestAnimationFrame(render);
    if (stopped || fallbackActive || document.visibilityState === 'hidden') return;

    resizeCanvas();

    let targetFps = 50;
    if (isMacOS || isSafari || coarsePointer) targetFps = 30;
    if ((isMacOS || isSafari) && now < scrollingUntil) targetFps = 20;

    const frameInterval = 1000 / targetFps;
    if (!reducedMotion && now - previousFrame < frameInterval) return;
    if (reducedMotion && renderedReducedFrame && !resizePending) return;
    previousFrame = now;

    updateAutopilot(now);

    const pointerEase = coarsePointer ? 0.050 : 0.115;
    pointer.x += (pointer.targetX - pointer.x) * pointerEase;
    pointer.y += (pointer.targetY - pointer.y) * pointerEase;

    trail[0].x += (pointer.x - trail[0].x) * 0.30;
    trail[0].y += (pointer.y - trail[0].y) * 0.30;
    for (let i = 1; i < trail.length; i += 1) {
      const follow = Math.max(0.085, 0.18 - i * 0.012);
      trail[i].x += (trail[i - 1].x - trail[i].x) * follow;
      trail[i].y += (trail[i - 1].y - trail[i].y) * follow;
    }

    activity += (targetActivity - activity) * 0.040;

    for (let i = 0; i < trail.length; i += 1) {
      packedTrail[i * 2] = trail[i].x / viewportWidth;
      packedTrail[i * 2 + 1] = 1 - trail[i].y / viewportHeight;
    }

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
    previousFrame = 0;
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
