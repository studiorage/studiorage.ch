(function initFluidPointerBackground(){
  const canvas = document.getElementById('pointer-fire');
  if (!canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (reduceMotion || coarsePointer) {
    canvas.hidden = true;
    return;
  }

  // macOS has a dedicated, texture-driven renderer. It avoids the expensive
  // nested procedural noise used by the desktop-PC renderer and therefore
  // stays smooth on Retina displays and older Intel GPUs. Non-Mac platforms
  // return to the original code below without any visual or behavioural change.
  const reportedPlatform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  const useMacRenderer = /^mac/i.test(reportedPlatform) || /Macintosh|Mac OS X/i.test(navigator.userAgent);
  if (useMacRenderer) {
    initMacFluidRenderer(canvas);
    return;
  }

  function initMacFluidRenderer(macCanvas){
    const gl = macCanvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      desynchronized: true
    });

    if (!gl) {
      macCanvas.classList.add('pointer-fire--fallback');
      window.addEventListener('pointermove', event => {
        document.documentElement.style.setProperty('--pointer-x', event.clientX + 'px');
        document.documentElement.style.setProperty('--pointer-y', event.clientY + 'px');
      }, { passive: true });
      return;
    }

    macCanvas.dataset.fireRenderer = 'mac-texture-fluid';
    macCanvas.style.imageRendering = 'auto';
    macCanvas.style.backfaceVisibility = 'hidden';

    const vertexSource = `
      attribute vec2 aPosition;
      void main(){
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // This renderer uses a small, linearly filtered noise texture instead of
    // evaluating several complete FBM trees for every Retina pixel. The visual
    // remains a soft blue/pearl fluid trail, but the GPU cost is dramatically
    // lower and does not expose Safari's tiled/square artefacts.
    const fragmentSource = `
      precision mediump float;
      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec2 uTrail[8];
      uniform float uActivity;
      uniform sampler2D uNoise;

      float noiseSample(vec2 p){
        return texture2D(uNoise, fract(p)).r;
      }

      void main(){
        vec2 frag = gl_FragCoord.xy;
        vec2 uv = frag / uResolution;
        float minSide = min(uResolution.x, uResolution.y);
        vec2 p = (frag - 0.5 * uResolution) / minSide;
        float t = uTime * 0.055;

        float n0 = noiseSample(p * 0.72 + vec2(t * 0.34, -t * 0.22));
        vec2 warp = vec2(
          noiseSample(p * 1.15 + vec2(-t * 0.28, t * 0.19) + n0 * 0.16),
          noiseSample(p * 1.08 + vec2(t * 0.21, t * 0.31) - n0 * 0.14)
        ) - 0.5;
        float n1 = noiseSample(p * 1.58 + warp * 0.42 + vec2(t * 0.17, -t * 0.26));
        float n2 = noiseSample(p * 3.05 - warp * 0.30 + vec2(-t * 0.38, t * 0.24));
        float cloud = clamp(n0 * 0.34 + n1 * 0.46 + n2 * 0.20, 0.0, 1.0);
        float ridges = 1.0 - abs(2.0 * cloud - 1.0);
        ridges = smoothstep(0.34, 0.91, ridges);

        float trail = 0.0;
        float hot = 0.0;
        float mist = 0.0;
        for (int i = 0; i < 8; i++){
          vec2 m = uTrail[i];
          vec2 mp = (m * uResolution - 0.5 * uResolution) / minSide;
          vec2 delta = p - mp;
          float fi = float(i);
          float weight = 1.0 - fi / 8.0;
          delta.x += (0.026 + fi * 0.0018) * sin(delta.y * 13.0 + t * 82.0 + fi * 0.83);
          delta.y += 0.012 * cos(delta.x * 10.0 - t * 67.0 + fi * 0.57);
          float d2 = dot(delta, delta);
          trail += exp2(-d2 * (20.5 + fi * 1.45)) * weight;
          hot += exp2(-d2 * (68.0 + fi * 3.2)) * weight;
          mist += exp2(-d2 * (8.8 + fi * 0.55)) * weight;
        }

        trail = clamp(trail * 0.29, 0.0, 1.0) * uActivity;
        hot = clamp(hot * 0.18, 0.0, 1.0) * uActivity;
        mist = clamp(mist * 0.16, 0.0, 1.0) * uActivity;

        float flowingTrail = trail * (0.54 + 0.58 * cloud + 0.20 * ridges);
        float smoke = mist * (0.20 + 0.60 * ridges) + flowingTrail;
        smoke += smoothstep(0.72, 0.94, cloud) * 0.055;

        vec3 deepBlue = vec3(0.0, 0.014, 0.060);
        vec3 blue = vec3(0.0, 0.39, 1.0);
        vec3 luminousBlue = vec3(0.54, 0.77, 1.0);
        vec3 pearlWhite = vec3(0.985, 0.992, 1.0);
        vec3 blushPink = vec3(1.0, 0.925, 0.955);
        vec3 palePeach = vec3(1.0, 0.89, 0.82);

        vec3 color = mix(deepBlue, blue, clamp(smoke * 1.30, 0.0, 1.0));
        color = mix(color, luminousBlue, hot * (0.28 + 0.42 * ridges));
        float pearlPhase = hot * smoothstep(0.45, 0.89, ridges) * smoothstep(0.52, 0.91, cloud);
        vec3 pearlTint = mix(pearlWhite, blushPink, smoothstep(0.50, 0.78, cloud));
        pearlTint = mix(pearlTint, palePeach, smoothstep(0.80, 0.96, cloud) * 0.26);
        color = mix(color, pearlTint, pearlPhase * 0.085);

        float vignette = 1.0 - smoothstep(0.27, 1.10, length((uv - 0.5) * vec2(1.04, 0.93)));
        float alpha = clamp((smoke * 0.67 + hot * 0.25) * vignette, 0.0, 0.70);
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `;

    function compile(type, source){
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Studio Rage macOS background shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) {
      macCanvas.classList.add('pointer-fire--fallback');
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Studio Rage macOS background program:', gl.getProgramInfoLog(program));
      macCanvas.classList.add('pointer-fire--fallback');
      return;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
    const timeLocation = gl.getUniformLocation(program, 'uTime');
    const trailLocation = gl.getUniformLocation(program, 'uTrail[0]');
    const activityLocation = gl.getUniformLocation(program, 'uActivity');
    const noiseLocation = gl.getUniformLocation(program, 'uNoise');

    function latticeRandom(x, y, period, seed){
      x = ((x % period) + period) % period;
      y = ((y % period) + period) % period;
      let h = Math.imul(x + seed * 17, 374761393) ^ Math.imul(y + seed * 31, 668265263);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }

    function smoothValueNoise(nx, ny, cells, seed){
      const x = nx * cells;
      const y = ny * cells;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx0 = x - x0;
      const fy0 = y - y0;
      const fx = fx0 * fx0 * (3 - 2 * fx0);
      const fy = fy0 * fy0 * (3 - 2 * fy0);
      const a = latticeRandom(x0, y0, cells, seed);
      const b = latticeRandom(x0 + 1, y0, cells, seed);
      const c = latticeRandom(x0, y0 + 1, cells, seed);
      const d = latticeRandom(x0 + 1, y0 + 1, cells, seed);
      const top = a + (b - a) * fx;
      const bottom = c + (d - c) * fx;
      return top + (bottom - top) * fy;
    }

    function createNoiseTexture(){
      const size = 128;
      const data = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const nx = x / size;
          const ny = y / size;
          const value =
            smoothValueNoise(nx, ny, 4, 11) * 0.50 +
            smoothValueNoise(nx, ny, 8, 29) * 0.30 +
            smoothValueNoise(nx, ny, 16, 47) * 0.14 +
            smoothValueNoise(nx, ny, 32, 71) * 0.06;
          const v = Math.max(0, Math.min(255, Math.round(value * 255)));
          const offset = (y * size + x) * 4;
          data[offset] = v;
          data[offset + 1] = v;
          data[offset + 2] = v;
          data[offset + 3] = 255;
        }
      }

      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.uniform1i(noiseLocation, 0);
      return texture;
    }

    const noiseTexture = createNoiseTexture();
    let viewportWidth = Math.max(1, window.innerWidth);
    let viewportHeight = Math.max(1, window.innerHeight);
    const pointer = {
      x: viewportWidth * 0.64,
      y: viewportHeight * 0.34,
      targetX: viewportWidth * 0.64,
      targetY: viewportHeight * 0.34
    };
    const trail = Array.from({ length: 8 }, () => ({ x: pointer.x, y: pointer.y }));
    const packedTrail = new Float32Array(trail.length * 2);
    let activity = 0.45;
    let targetActivity = 0.45;
    let renderScale = 1;
    let lastDrawTime = -Infinity;
    const drawInterval = 1000 / 45;
    let start = performance.now();
    let animationFrame = 0;
    let isRunning = false;
    let hasRendered = false;
    let resizeFrame = 0;

    function resize(){
      viewportWidth = Math.max(1, window.innerWidth);
      viewportHeight = Math.max(1, window.innerHeight);

      // Retina CSS pixels already provide enough visual resolution for this
      // soft effect. Capping the backing buffer prevents 4K/5K fragment loads.
      renderScale = Math.min(1, 1440 / viewportWidth, 900 / viewportHeight);
      const width = Math.max(1, Math.round(viewportWidth * renderScale));
      const height = Math.max(1, Math.round(viewportHeight * renderScale));
      if (macCanvas.width !== width || macCanvas.height !== height) {
        macCanvas.width = width;
        macCanvas.height = height;
        macCanvas.style.width = viewportWidth + 'px';
        macCanvas.style.height = viewportHeight + 'px';
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
        gl.uniform2f(resolutionLocation, width, height);
      }
    }

    function queueResize(){
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        resize();
      });
    }

    function move(event){
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      targetActivity = 1.0;
    }

    function leave(){
      targetActivity = 0.38;
    }

    function render(now){
      if (!isRunning) return;

      pointer.x += (pointer.targetX - pointer.x) * 0.13;
      pointer.y += (pointer.targetY - pointer.y) * 0.13;
      trail[0].x += (pointer.x - trail[0].x) * 0.31;
      trail[0].y += (pointer.y - trail[0].y) * 0.31;
      for (let i = 1; i < trail.length; i++) {
        const follow = 0.19 - i * 0.0105;
        trail[i].x += (trail[i - 1].x - trail[i].x) * follow;
        trail[i].y += (trail[i - 1].y - trail[i].y) * follow;
      }
      activity += (targetActivity - activity) * 0.035;
      targetActivity += (0.45 - targetActivity) * 0.010;

      if (now - lastDrawTime >= drawInterval - 1) {
        for (let i = 0; i < trail.length; i++) {
          packedTrail[i * 2] = trail[i].x / viewportWidth;
          packedTrail[i * 2 + 1] = 1 - trail[i].y / viewportHeight;
        }

        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
        gl.uniform1f(timeLocation, (now - start) / 1000);
        gl.uniform2fv(trailLocation, packedTrail);
        gl.uniform1f(activityLocation, activity);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        lastDrawTime = now;
        hasRendered = true;
      }

      animationFrame = requestAnimationFrame(render);
    }

    function startRendering(){
      if (isRunning || document.visibilityState === 'hidden') return;
      if (!hasRendered) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
        trail.forEach(point => {
          point.x = pointer.x;
          point.y = pointer.y;
        });
        activity = 0.45;
        targetActivity = 0.45;
        start = performance.now();
      }
      isRunning = true;
      animationFrame = requestAnimationFrame(render);
    }

    function stopRendering(){
      isRunning = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    macCanvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      stopRendering();
    }, false);

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerleave', leave, { passive: true });
    window.addEventListener('resize', queueResize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') stopRendering();
      else if (!document.body.classList.contains('is-loader-active')) startRendering();
    });

    resize();
    if (document.body.classList.contains('is-loader-active')) {
      document.addEventListener('loaderComplete', startRendering, { once: true });
    } else {
      startRendering();
    }
  }

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    desynchronized: true
  });

  if (!gl) {
    canvas.classList.add('pointer-fire--fallback');
    window.addEventListener('pointermove', event => {
      document.documentElement.style.setProperty('--pointer-x', event.clientX + 'px');
      document.documentElement.style.setProperty('--pointer-y', event.clientY + 'px');
    }, { passive: true });
    return;
  }

  const vertexSource = `
    attribute vec2 aPosition;
    void main(){
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec2 uTrail[10];
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
      for (int i = 0; i < 5; i++){
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
      vec2 warpA = vec2(fbm(p * 1.55 + vec2(t, -t * 0.7)), fbm(p * 1.55 + vec2(4.2 - t * 0.5, 1.7 + t)));
      vec2 warpB = vec2(fbm(p * 2.4 + warpA * 1.7 - vec2(t * 0.3, t)), fbm(p * 2.1 - warpA * 1.3 + vec2(t, 5.0)));
      float cloud = fbm(p * 2.25 + warpA * 1.8 + warpB * 0.65);
      float ridges = 1.0 - abs(2.0 * cloud - 1.0);
      ridges = smoothstep(0.40, 0.92, ridges);

      float trail = 0.0;
      float hot = 0.0;
      for (int i = 0; i < 10; i++){
        vec2 m = uTrail[i];
        vec2 mp = (m * uResolution - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
        vec2 delta = p - mp;
        delta.x += 0.035 * sin(delta.y * 15.0 + t * 8.0 + float(i));
        float distanceToTrail = length(delta);
        float weight = 1.0 - float(i) / 10.0;
        trail += exp(-distanceToTrail * distanceToTrail * (15.0 + float(i) * 1.2)) * weight;
        hot += exp(-distanceToTrail * distanceToTrail * (48.0 + float(i) * 2.0)) * weight;
      }

      trail = clamp(trail * 0.37, 0.0, 1.0) * uActivity;
      hot = clamp(hot * 0.24, 0.0, 1.0) * uActivity;

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

  function compile(type, source){
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
  if (!vertex || !fragment) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Studio Rage background program:', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolutionLocation = gl.getUniformLocation(program, 'uResolution');
  const timeLocation = gl.getUniformLocation(program, 'uTime');
  const trailLocation = gl.getUniformLocation(program, 'uTrail[0]');
  const activityLocation = gl.getUniformLocation(program, 'uActivity');

  let viewportWidth = Math.max(1, window.innerWidth);
  let viewportHeight = Math.max(1, window.innerHeight);
  const pointer = { x: viewportWidth * 0.64, y: viewportHeight * 0.34, targetX: viewportWidth * 0.64, targetY: viewportHeight * 0.34 };
  const trail = Array.from({ length: 10 }, () => ({ x: pointer.x, y: pointer.y }));
  const packedTrail = new Float32Array(trail.length * 2);
  let activity = 0.45;
  let targetActivity = 0.45;
  let dpr = 1;
  const isMacOS = /Macintosh|Mac OS X/i.test(navigator.userAgent);
  const minimumDrawInterval = isMacOS ? 1000 / 30 : 0;
  let lastDrawTime = -Infinity;
  let start = performance.now();
  let animationFrame = 0;
  let isRunning = false;
  let hasRendered = false;

  function resize(){
    viewportWidth = Math.max(1, window.innerWidth);
    viewportHeight = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(viewportWidth * dpr));
    const height = Math.max(1, Math.round(viewportHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = viewportWidth + 'px';
      canvas.style.height = viewportHeight + 'px';
      gl.viewport(0, 0, width, height);
      gl.uniform2f(resolutionLocation, width, height);
    }
  }

  function move(event){
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
    targetActivity = 1.0;
  }

  function leave(){
    targetActivity = 0.38;
  }

  function render(now){
    if (!isRunning) return;
    pointer.x += (pointer.targetX - pointer.x) * 0.11;
    pointer.y += (pointer.targetY - pointer.y) * 0.11;
    trail[0].x += (pointer.x - trail[0].x) * 0.28;
    trail[0].y += (pointer.y - trail[0].y) * 0.28;
    for (let i = 1; i < trail.length; i++) {
      const follow = 0.17 - i * 0.008;
      trail[i].x += (trail[i - 1].x - trail[i].x) * follow;
      trail[i].y += (trail[i - 1].y - trail[i].y) * follow;
    }
    activity += (targetActivity - activity) * 0.025;
    targetActivity += (0.45 - targetActivity) * 0.008;

    // Keep pointer/trail simulation at the display refresh rate. On macOS,
    // only the expensive fragment pass is limited to 30 fps, preserving the
    // exact geometry and pointer response while halving GPU work.
    if (!minimumDrawInterval || now - lastDrawTime >= minimumDrawInterval - 1) {
      for (let i = 0; i < trail.length; i++) {
        packedTrail[i * 2] = trail[i].x / viewportWidth;
        packedTrail[i * 2 + 1] = 1 - trail[i].y / viewportHeight;
      }

      gl.uniform1f(timeLocation, (now - start) / 1000);
      gl.uniform2fv(trailLocation, packedTrail);
      gl.uniform1f(activityLocation, activity);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      lastDrawTime = now;
      hasRendered = true;
    }
    animationFrame = requestAnimationFrame(render);
  }

  function startRendering(){
    if (isRunning || document.visibilityState === 'hidden') return;
    if (!hasRendered) {
      // The opaque intro covered the shader. Start with the trail already
      // settled at the latest pointer position, matching its visible state.
      pointer.x = pointer.targetX;
      pointer.y = pointer.targetY;
      trail.forEach(point => {
        point.x = pointer.x;
        point.y = pointer.y;
      });
      activity = 0.45;
      targetActivity = 0.45;
    }
    isRunning = true;
    animationFrame = requestAnimationFrame(render);
  }

  function stopRendering(){
    isRunning = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerleave', leave, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopRendering();
    else if (!document.body.classList.contains('is-loader-active')) startRendering();
  });

  resize();
  if (document.body.classList.contains('is-loader-active')) {
    document.addEventListener('loaderComplete', startRendering, { once: true });
  } else {
    startRendering();
  }
})();
