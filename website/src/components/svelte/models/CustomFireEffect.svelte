<script lang="ts">
  import * as THREE from "three";
  import { T, useTask } from "@threlte/core";
  import { onDestroy } from "svelte";

  // ---------------------------------------------------------------------------
  // Props -- mirrors FireAnimation's public interface so this can be swapped in
  // ---------------------------------------------------------------------------
  type ScaleArray = [number, number, number];

  let {
    ref = $bindable<THREE.Group | undefined>(),
    mode = "travel",
    scale = [1, 1, 1] as ScaleArray,
    preloadedTexture,
  }: {
    ref?: THREE.Group;
    mode?: "travel" | "explosion";
    scale?: ScaleArray;
    preloadedTexture?: THREE.Texture;
  } = $props();

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** Maximum live particles -- deliberately low for perf headroom */
  const MAX_PARTICLES = 80;

  // Fireball (travel) tuning
  const TRAVEL_EMIT_RATE = 60; // particles / sec
  const TRAVEL_LIFETIME_MIN = 0.35;
  const TRAVEL_LIFETIME_MAX = 0.60;
  const TRAVEL_SPEED_MIN = 0.4;
  const TRAVEL_SPEED_MAX = 0.9;
  const TRAVEL_SIZE_MIN = 0.6;
  const TRAVEL_SIZE_MAX = 1.4;
  const TRAVEL_SPAWN_RADIUS = 0.20;

  // Explosion tuning
  const EXPLOSION_BURST_COUNT = 60; // instant burst
  const EXPLOSION_LIFETIME_MIN = 0.15;
  const EXPLOSION_LIFETIME_MAX = 0.45;
  const EXPLOSION_SPEED_MIN = 3.0;
  const EXPLOSION_SPEED_MAX = 8.0;
  const EXPLOSION_SIZE_MIN = 1.0;
  const EXPLOSION_SIZE_MAX = 2.8;

  // Colour palette (orange-yellow-red)
  const COLOR_HOT = new THREE.Color(1.0, 0.85, 0.3); // bright yellow core
  const COLOR_MID = new THREE.Color(1.0, 0.45, 0.08); // orange
  const COLOR_COOL = new THREE.Color(0.7, 0.12, 0.02); // deep red / ember

  // ---------------------------------------------------------------------------
  // Per-particle ring-buffer data (zero allocations at runtime)
  // ---------------------------------------------------------------------------

  const posArr = new Float32Array(MAX_PARTICLES * 3); // xyz positions
  const velArr = new Float32Array(MAX_PARTICLES * 3); // velocity xyz
  const lifeArr = new Float32Array(MAX_PARTICLES); // remaining life (seconds)
  const maxLifeArr = new Float32Array(MAX_PARTICLES); // max life for ratio calc
  const baseSizeArr = new Float32Array(MAX_PARTICLES); // immutable base size per emit
  const displaySizeArr = new Float32Array(MAX_PARTICLES); // per-frame computed size (GPU attr)
  const colorData = new Float32Array(MAX_PARTICLES * 3); // per-particle RGB (GPU attr)

  let ringHead = 0; // next slot to emit into
  let emitAccumulator = 0;

  let isRunning = $state(true);
  let activeMode = $state<"travel" | "explosion">(mode);

  // ---------------------------------------------------------------------------
  // Three.js objects -- created once, mutated in-place each frame
  // ---------------------------------------------------------------------------

  const geometry = new THREE.BufferGeometry();

  // Position attribute
  const positionAttr = new THREE.BufferAttribute(posArr, 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttr);

  // Per-vertex size attribute (requires custom shader -- PointsMaterial ignores this)
  const sizeAttr = new THREE.BufferAttribute(displaySizeArr, 1);
  sizeAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aSize", sizeAttr);

  // Per-vertex colour attribute
  const colorAttr = new THREE.BufferAttribute(colorData, 3);
  colorAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aColor", colorAttr);

  geometry.setDrawRange(0, MAX_PARTICLES);
  // Static bounding sphere to prevent frustum-cull flicker
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 50);

  // ---------------------------------------------------------------------------
  // Minimal custom ShaderMaterial for per-vertex sized, textured, additive points
  // ---------------------------------------------------------------------------

  // Resolve the flame texture (preloaded or lazy-loaded)
  let flameTexture: THREE.Texture | null = preloadedTexture ?? null;

  if (!preloadedTexture) {
    const loader = new THREE.TextureLoader();
    loader.load("/textures/flame.webp", (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      flameTexture = tex;
      material.uniforms.uTexture.value = tex;
      material.uniforms.uHasTexture.value = 1.0;
      material.needsUpdate = true;
    });
  }

  const VERTEX_SHADER = /* glsl */ `
    attribute float aSize;
    attribute vec3 aColor;

    varying vec3 vColor;

    void main() {
      vColor = aColor;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

      // Size attenuation: scale point size by inverse distance (matches Three.js convention)
      gl_PointSize = aSize * (300.0 / -mvPosition.z);

      // Clamp to avoid zero-size or absurdly large sprites
      gl_PointSize = clamp(gl_PointSize, 0.0, 256.0);

      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const FRAGMENT_SHADER = /* glsl */ `
    uniform sampler2D uTexture;
    uniform float uHasTexture;

    varying vec3 vColor;

    void main() {
      // Sample the flame sprite or fall back to a soft radial gradient
      vec4 texColor;
      if (uHasTexture > 0.5) {
        texColor = texture2D(uTexture, gl_PointCoord);
      } else {
        // Fallback: soft circular gradient (no texture loaded yet)
        float dist = length(gl_PointCoord - vec2(0.5));
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        texColor = vec4(1.0, 1.0, 1.0, alpha);
      }

      // Multiply by per-vertex colour (which already has alpha baked in as brightness)
      gl_FragColor = vec4(vColor * texColor.rgb, texColor.a);

      // Discard fully transparent fragments early
      if (gl_FragColor.a < 0.01) discard;
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uTexture: { value: flameTexture },
      uHasTexture: { value: flameTexture ? 1.0 : 0.0 },
    },
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });

  // Temp colour to avoid per-frame allocation
  const _tmpColor = new THREE.Color();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function randRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Cheap 1D pseudo-noise for organic flickering.
   * Sums three sin waves at irrational-ish frequencies.
   */
  function noise1D(t: number): number {
    return (
      Math.sin(t * 7.13) * 0.5 +
      Math.sin(t * 13.37) * 0.3 +
      Math.sin(t * 23.71) * 0.2
    );
  }

  /** Emit a single particle at the given ring-buffer slot */
  function emitParticle(slot: number, currentMode: "travel" | "explosion"): void {
    const i3 = slot * 3;

    if (currentMode === "travel") {
      // Spawn near centre with small random offset (uniform sphere sampling)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * TRAVEL_SPAWN_RADIUS;
      posArr[i3] = r * Math.sin(phi) * Math.cos(theta);
      posArr[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      posArr[i3 + 2] = r * Math.cos(phi);

      // Velocity: drift outward with upward bias for trailing flame look
      const speed = randRange(TRAVEL_SPEED_MIN, TRAVEL_SPEED_MAX);
      velArr[i3] = (Math.random() - 0.5) * 0.6 * speed;
      velArr[i3 + 1] = randRange(0.3, 1.2) * speed; // upward
      velArr[i3 + 2] = (Math.random() - 0.5) * 0.6 * speed;

      lifeArr[slot] = randRange(TRAVEL_LIFETIME_MIN, TRAVEL_LIFETIME_MAX);
      maxLifeArr[slot] = lifeArr[slot];
      baseSizeArr[slot] = randRange(TRAVEL_SIZE_MIN, TRAVEL_SIZE_MAX);
      displaySizeArr[slot] = baseSizeArr[slot];
    } else {
      // Explosion: burst outward in sphere from origin
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      posArr[i3] = 0;
      posArr[i3 + 1] = 0;
      posArr[i3 + 2] = 0;

      const speed = randRange(EXPLOSION_SPEED_MIN, EXPLOSION_SPEED_MAX);
      velArr[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      velArr[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velArr[i3 + 2] = Math.cos(phi) * speed;

      lifeArr[slot] = randRange(EXPLOSION_LIFETIME_MIN, EXPLOSION_LIFETIME_MAX);
      maxLifeArr[slot] = lifeArr[slot];
      baseSizeArr[slot] = randRange(EXPLOSION_SIZE_MIN, EXPLOSION_SIZE_MAX);
      displaySizeArr[slot] = baseSizeArr[slot];
    }
  }

  /** Kill a particle (move offscreen, zero life and visuals) */
  function killParticle(slot: number): void {
    const i3 = slot * 3;
    posArr[i3] = 0;
    posArr[i3 + 1] = -9999;
    posArr[i3 + 2] = 0;
    velArr[i3] = 0;
    velArr[i3 + 1] = 0;
    velArr[i3 + 2] = 0;
    lifeArr[slot] = 0;
    maxLifeArr[slot] = 0;
    baseSizeArr[slot] = 0;
    displaySizeArr[slot] = 0;
    colorData[i3] = 0;
    colorData[i3 + 1] = 0;
    colorData[i3 + 2] = 0;
  }

  // Initialize all particles as dead
  for (let i = 0; i < MAX_PARTICLES; i++) {
    killParticle(i);
  }

  // ---------------------------------------------------------------------------
  // Public API (exported functions)
  // ---------------------------------------------------------------------------

  export function startEffect(): void {
    isRunning = true;
    emitAccumulator = 0;
  }

  export function stopEffect(): void {
    isRunning = false;
    // Existing particles die naturally rather than popping
  }

  export function switchMode(newMode: "travel" | "explosion"): void {
    activeMode = newMode;
    emitAccumulator = 0;

    if (newMode === "explosion") {
      // Instant burst: emit a batch immediately
      const burstCount = Math.min(EXPLOSION_BURST_COUNT, MAX_PARTICLES);
      for (let i = 0; i < burstCount; i++) {
        emitParticle(ringHead, "explosion");
        ringHead = (ringHead + 1) % MAX_PARTICLES;
      }
    }
  }

  export function dispose(): void {
    isRunning = false;
    geometry.dispose();
    material.dispose();
    if (flameTexture && !preloadedTexture) {
      // Only dispose texture if we loaded it ourselves
      flameTexture.dispose();
    }
  }

  // ---------------------------------------------------------------------------
  // React to prop changes
  // ---------------------------------------------------------------------------

  $effect(() => {
    if (mode !== activeMode) {
      switchMode(mode);
    }
  });

  // ---------------------------------------------------------------------------
  // Per-frame update via Threlte's useTask (runs in the render loop)
  // ---------------------------------------------------------------------------

  useTask((delta) => {
    // Cap delta to avoid huge jumps on tab-away, etc.
    const dt = Math.min(delta, 0.1);

    // ------ Emission ------
    if (isRunning && activeMode === "travel") {
      emitAccumulator += dt * TRAVEL_EMIT_RATE;
      while (emitAccumulator >= 1) {
        emitParticle(ringHead, "travel");
        ringHead = (ringHead + 1) % MAX_PARTICLES;
        emitAccumulator -= 1;
      }
    }
    // Explosion emits a single burst in switchMode(); no continuous emit

    // ------ Simulate all live particles ------
    const time = performance.now() * 0.001; // seconds for noise seed

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (lifeArr[i] <= 0) continue;

      // Decrement life
      lifeArr[i] -= dt;
      if (lifeArr[i] <= 0) {
        killParticle(i);
        continue;
      }

      const i3 = i * 3;
      const lifeRatio = 1.0 - lifeArr[i] / maxLifeArr[i]; // 0 at birth, 1 at death

      // --- Velocity perturbation (noise-based organic flickering) ---
      const noiseSeed = i * 17.3 + time;
      const noiseX = noise1D(noiseSeed) * 0.8;
      const noiseZ = noise1D(noiseSeed + 100) * 0.8;

      // Integrate position with noise-perturbed velocity
      posArr[i3] += (velArr[i3] + noiseX) * dt;
      posArr[i3 + 1] += velArr[i3 + 1] * dt;
      posArr[i3 + 2] += (velArr[i3 + 2] + noiseZ) * dt;

      // Mode-specific forces
      if (activeMode === "travel") {
        velArr[i3 + 1] += 0.3 * dt; // buoyancy
      } else {
        velArr[i3 + 1] -= 2.0 * dt; // gravity on explosion debris
      }

      // Drag (explosion decelerates faster)
      const drag = activeMode === "explosion" ? 0.97 : 0.99;
      velArr[i3] *= drag;
      velArr[i3 + 1] *= drag;
      velArr[i3 + 2] *= drag;

      // --- Size animation ---
      let sizeMult: number;
      if (activeMode === "travel") {
        // Bell curve peaking around mid-life
        sizeMult = Math.sin(lifeRatio * Math.PI) * 1.2;
        sizeMult = Math.max(sizeMult, 0.1);
      } else {
        // Quick quadratic shrink
        sizeMult = 1.0 - lifeRatio * lifeRatio;
        sizeMult = Math.max(sizeMult, 0.05);
      }
      displaySizeArr[i] = baseSizeArr[i] * sizeMult;

      // --- Colour based on life ratio ---
      if (lifeRatio < 0.3) {
        _tmpColor.lerpColors(COLOR_HOT, COLOR_MID, lifeRatio / 0.3);
      } else {
        _tmpColor.lerpColors(COLOR_MID, COLOR_COOL, (lifeRatio - 0.3) / 0.7);
      }

      // --- Alpha fade ---
      let alpha: number;
      if (lifeRatio < 0.1) {
        alpha = lifeRatio / 0.1; // quick fade-in
      } else if (lifeRatio > 0.7) {
        alpha = (1.0 - lifeRatio) / 0.3; // fade-out near death
      } else {
        alpha = 1.0;
      }

      // With additive blending, darkening toward black is equivalent to reducing alpha.
      colorData[i3] = _tmpColor.r * alpha;
      colorData[i3 + 1] = _tmpColor.g * alpha;
      colorData[i3 + 2] = _tmpColor.b * alpha;
    }

    // ------ Upload to GPU ------
    positionAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  onDestroy(() => {
    dispose();
  });
</script>

<!--
  Render: a T.Group containing a single T.Points object.
  The parent (Fireball.svelte) positions and rotates this group.
-->
<T.Group bind:ref {scale}>
  <T.Points {geometry} {material} frustumCulled={false} />
</T.Group>
