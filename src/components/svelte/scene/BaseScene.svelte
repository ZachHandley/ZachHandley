<script lang="ts">
  import { T, useThrelte, useTask } from "@threlte/core";
  import { Sky, AudioListener, HTML } from "@threlte/extras";
  import * as THREE from "three";
  import { onDestroy, onMount } from "svelte";
  import { measureObject3D } from "centerthree";
  import { Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import Dragon from "../models/Dragon.svelte";
  import Ground from "./Ground.svelte";
  import Fireball from "./effects/Fireball.svelte";
  import StackedLinks from "./StackedLinks.svelte";
  import type { Link } from "~/types/baseSchemas";
  import { SceneController } from "~/components/svelte/utils/sceneController.svelte.ts";
  import {
    CAMERA_BASE_POSITION,
    CAMERA_FOV,
    CAMERA_TARGET,
    DRAGON_WIDTH_FALLBACK,
    ENVIRONMENT_SCALE,
    LINKS_Z_DEPTH,
    solveCameraZ,
  } from "./rig";

  let {
    handleDragonClick,
    links,
    handleInteract,
    activeCategory,
    onLoadingStateChange,
    screenWidth,
    screenHeight,
    modalManager,
  }: {
    handleDragonClick: () => void;
    handleInteract?: (category?: string) => void;
    activeCategory?: string | null;
    links: Link[];
    onLoadingStateChange?: (loading: boolean, progress: number, message: string) => void;
    screenWidth: number;
    screenHeight: number;
    modalManager?: {
      showModal: (link: Link) => void;
      hideModal: () => void;
    } | null;
  } = $props();

  const { size: rendererSize, renderer, scene } = useThrelte();

  // Core scene references
  let cameraRef = $state<THREE.PerspectiveCamera | undefined>(undefined);
  let audioListenerRef = $state<THREE.AudioListener | undefined>(undefined);
  let dragonRef = $state<THREE.Group | null>(null);
  let dragonEyeGlow = $state(0);
  let mounted = $state(false);
  let prevRendererSize = $state<{ width: number; height: number } | undefined>(undefined);
  let particlePoolContainer = $state<THREE.Group | undefined>(undefined);

  // Debug modal manager binding
  $effect(() => {
    console.log(`🎮 BaseScene: modalManager binding status:`, {
      hasModalManager: !!modalManager,
      modalManagerType: typeof modalManager,
    });
  });

  // Camera rig constants now live in ./rig so the layout solves against the same
  // numbers instead of re-guessing them (see rig.ts).
  const cameraTarget = CAMERA_TARGET;

  // Measured once the dragon model mounts. The layout has to know how much
  // horizontal room the dragon actually takes; it previously hardcoded two
  // different guesses (9 in calculateCategoryPositions, 3 in calculateGridLayout).
  let dragonWidth = $state(DRAGON_WIDTH_FALLBACK);
  let dragonMeasured = $state(false);

  // Measured per-frame rather than in an $effect, for two reasons that a
  // one-shot effect gets wrong:
  //
  //  1. Dragon.svelte assigns `dragonRef = ref` the moment its outer T.Group
  //     exists, which is BEFORE its `{#await gltf}` block mounts any geometry.
  //     An $effect keyed on `dragonRef` therefore measures an empty Box3, and
  //     never re-runs, because the group's object identity never changes. That
  //     silently pinned the rig to DRAGON_WIDTH_FALLBACK (9) when the real
  //     dragon is ~5.3 wide — over-dollying the camera on every portrait
  //     viewport and shrinking the whole scene for no reason.
  //  2. The dragon is animated, so any single frame is a sample of a wing
  //     cycle. Take the widest reading over a short window instead of trusting
  //     whichever frame happened to be first.
  const DRAGON_SAMPLE_FRAMES = 30;
  let dragonSamples = 0;
  let dragonWidestSeen = 0;

  const dragonMeasureTask = useTask(
    () => {
      if (!dragonRef) return;
      const { size } = measureObject3D(dragonRef);
      if (!Number.isFinite(size.x) || size.x <= 0) return; // geometry not mounted yet
      dragonWidestSeen = Math.max(dragonWidestSeen, size.x);
      if (++dragonSamples < DRAGON_SAMPLE_FRAMES) return;
      // Clamp so a pathological measurement can't destroy the layout.
      dragonWidth = Math.min(
        DRAGON_WIDTH_FALLBACK * 1.6,
        Math.max(DRAGON_WIDTH_FALLBACK * 0.3, dragonWidestSeen),
      );
      dragonMeasured = true;
    },
    { running: () => !dragonMeasured },
  );

  const viewportAspect = $derived(
    $rendererSize && $rendererSize.height > 0 ? $rendererSize.width / $rendererSize.height : 1,
  );

  // Portrait viewports lose horizontal frustum width (visible height is
  // aspect-independent), so the camera pulls back until a category crate fits
  // beside the dragon. Returns the art-directed z unchanged for every aspect >= 1.
  const cameraZ = $derived(solveCameraZ(viewportAspect, dragonWidth));
  const cameraPosition = $derived({
    x: CAMERA_BASE_POSITION.x,
    y: CAMERA_BASE_POSITION.y,
    z: cameraZ,
  });

  // Initialize the scene controller
  const sceneController = new SceneController({
    environmentScale: ENVIRONMENT_SCALE,
    zDepth: LINKS_Z_DEPTH,
    dragonWidth: DRAGON_WIDTH_FALLBACK,
    maxFireballs: 10,
    onLoadingStateChange: (loading, progress, message) =>
      onLoadingStateChange?.(loading, progress, message),
    onCategoryInteraction: (category) => handleInteract?.(category),
  });

  // Update scene controller when camera changes
  $effect(() => {
    if (cameraRef && $rendererSize) {
      sceneController.updateCamera(cameraRef, $rendererSize);
    }
  });

  // Update scene controller when dragon is available
  $effect(() => {
    if (dragonRef) {
      sceneController.setDragonRef(dragonRef);
    }
  });

  // Clamp DPR to reduce GPU cost
  $effect(() => {
    try {
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    } catch {}
  });

  // Dev-only scene handle. There is no way to reach a Threlte scene graph from
  // outside the component tree, which made every past change here verifiable
  // only by eyeballing screenshots. With this, a headless browser can assert on
  // the real thing — crate transforms, material identity, camera dolly.
  // `import.meta.env.DEV` is compile-time, so this is absent from prod builds.
  if (import.meta.env.DEV) {
    $effect(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__zhScene = scene;
      w.__zhCamera = cameraRef;
      w.__zhTHREE = THREE;
    });
  }

  // Camera update debounce timer (trailing-edge debounce guarantees final value fires)
  let cameraUpdateTimer: ReturnType<typeof setTimeout> | null = null;

  // Keep the camera pointed at the same spot after an aspect-driven dolly.
  // The rig used to be immobile, so a single lookAt in `oncreate` was enough;
  // now that z moves with aspect, the view has to be re-aimed or the framing
  // drifts upward as the camera pulls back.
  $effect(() => {
    if (!cameraRef) return;
    void cameraPosition.z;
    cameraRef.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
  });

  // Setup for perspective camera
  $effect(() => {
    if (!cameraRef || !$rendererSize) return;

    // Only update if dimensions actually changed by a meaningful amount
    if (
      !prevRendererSize ||
      Math.abs($rendererSize.width - prevRendererSize.width) > 5 ||
      Math.abs($rendererSize.height - prevRendererSize.height) > 5
    ) {
      const doUpdate = () => {
        if (!cameraRef || !$rendererSize) return;
        cameraRef.aspect = $rendererSize.width / $rendererSize.height;
        cameraRef.updateProjectionMatrix();
        prevRendererSize = {
          width: $rendererSize.width,
          height: $rendererSize.height,
        };
        if (!mounted) mounted = true;
      };

      // First call (no prevRendererSize) executes immediately; subsequent calls debounce
      if (!prevRendererSize) {
        doUpdate();
      } else {
        if (cameraUpdateTimer) clearTimeout(cameraUpdateTimer);
        cameraUpdateTimer = setTimeout(doUpdate, 100);
      }
    }
  });

  // Get active fireballs from SceneController (reactive)
  const activeFireballs = $derived(sceneController.getActiveFireballs());

  // Debug active fireballs
  $effect(() => {
    console.log(`🔮 Active fireballs count: ${activeFireballs.length}`, activeFireballs);
  });

  // For dragon rotation tweening (used by SceneController)
  let rotationTween = new Tween(
    { y: 0 },
    {
      duration: 800,
      easing: cubicInOut,
    },
  );

  // Define the rotation task outside the function
  const dragonRotationTask = useTask(() => {
    // Only run if we have a dragon and rotation tween
    if (!dragonRef) return;

    // Update the dragon's rotation from the tween
    dragonRef.rotation.y = rotationTween.current.y;
  });

  // By default, the task is stopped
  dragonRotationTask.stop();

  // Dragon click handler
  function handleDragonClickInternal() {
    // Make the dragon's eyes glow when clicked
    dragonEyeGlow = 0.5;

    // Call user-provided handler
    if (handleDragonClick) {
      handleDragonClick();
    }

    // Reset glow after 1 second
    setTimeout(() => {
      dragonEyeGlow = 0;
    }, 1000);
  }

  // Simplified link click handler using SceneController
  async function handleLinkClick(
    url: string,
    type: Link["type"],
    position: THREE.Vector3,
    category?: string,
    action?: (() => void) | (() => Promise<void>),
    crateId?: string,
  ): Promise<void> {
    console.log(`🎮 BaseScene.handleLinkClick called:`, { url, type, category, position, crateId });

    await sceneController.handleLinkClick(
      url,
      type,
      position,
      category,
      action,
      crateId,
      rotationTween,
      dragonRotationTask,
    );
  }

  // Simplified fireball completion handler using SceneController
  async function handleFireballComplete(id: number): Promise<void> {
    await sceneController.handleFireballComplete(id);
  }

  // Apply visual highlighting to crates based on activeCategory
  $effect(() => {
    // This would be implemented in your StackedLinks component
    // For now, we're just making sure the prop is reactive
    console.log("Active category changed:", activeCategory);
  });

  onMount(async () => {
    // Initialize scene using SceneController
    await sceneController.initialize();

    // Initialize particle pool container immediately after assets are loaded
    initializeParticlePool();
  });

  // Initialize the particle pool container
  function initializeParticlePool(): void {
    if (!particlePoolContainer) {
      console.warn("Particle pool container not available yet");
      return;
    }

    // Position the pool container far off-screen
    particlePoolContainer.position.set(1000, 1000, 1000);

    // Get all pre-warmed systems from AssetManager and add them to pool container
    const prewarmedSystems = sceneController.getAssetManager().getAllPrewarmedSystems();

    if (prewarmedSystems.length === 0) {
      console.warn("No pre-warmed systems found. Particle effects may not work.");
      return;
    }

    prewarmedSystems.forEach((system, index) => {
      if (particlePoolContainer) {
        // Spread systems out a bit to avoid overlap (though they're scaled to 0)
        system.position.set(index * 10, 0, 0);
        particlePoolContainer.add(system);
      }
    });

    // Pre-compile shaders behind the loading screen, under the lighting state a
    // fireball will actually create.
    //
    // The measured cost of the first fireball was ~233ms in production (1x CPU),
    // and it is not the particles or the 17 flame meshes — isolating it showed a
    // bare PointLight added to this scene costs 117ms on its own, and 0ms every
    // time after. Fireball mounts a <T.PointLight>, taking the scene from 0 to 1
    // point lights, which changes three's program cache key for every lit
    // material in the scene: 157 unique materials across 1417 drawables all
    // relink on that frame.
    //
    // Compiling only `particlePoolContainer` (as this did) cannot prevent that —
    // it compiles a handful of unlit particle materials under 0 point lights,
    // i.e. the wrong state entirely. Compiling the whole scene with a throwaway
    // point light present populates the numPointLights=1 programs up front, so
    // the first real fireball is a cache hit.
    if (renderer && cameraRef) {
      try {
        const warmupLight = new THREE.PointLight(0xff7700, 0, 40, 1.5);
        scene.add(warmupLight);
        renderer.compile(scene, cameraRef);
        scene.remove(warmupLight);
        warmupLight.dispose();
        console.log("Scene shaders pre-compiled (with point light present)");
      } catch (e) {
        console.warn("Could not pre-compile shaders:", e);
      }
    }

    console.log(`Pool initialization complete: ${prewarmedSystems.length} systems ready`);
  }

  onDestroy(() => {
    // Clean up debounce timer
    if (cameraUpdateTimer) clearTimeout(cameraUpdateTimer);
    // Clean up scene using SceneController
    sceneController.dispose();
  });
</script>

<!-- Sky with static props -->
<Sky
  elevation={0.5}
  azimuth={180}
  exposure={0.37}
  mieCoefficient={0.005}
  mieDirectionalG={0.7}
  turbidity={10}
  rayleigh={3}
/>

<!-- Perspective Camera -->
<T.PerspectiveCamera
  bind:ref={cameraRef}
  makeDefault
  fov={CAMERA_FOV}
  aspect={viewportAspect}
  near={0.1}
  far={200}
  position={[cameraPosition.x, cameraPosition.y, cameraPosition.z]}
  oncreate={(camera) => {
    camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
  }}
>
  <AudioListener bind:ref={audioListenerRef} />
</T.PerspectiveCamera>

<!-- Lighting - simplified -->
<T.DirectionalLight position={[-5, 75, 100]} intensity={2} castShadow />

<!-- Environment -->
<T.Group scale={ENVIRONMENT_SCALE}>
  <Ground />
</T.Group>

<!-- Dragon -->
<Dragon
  {dragonEyeGlow}
  handleDragonClick={handleDragonClickInternal}
  bind:dragonRef
  initialFacingDirection={0}
  scale={ENVIRONMENT_SCALE}
/>

<!-- Stacked Links Component -->
<StackedLinks
  links={links as Link[]}
  onLinkClick={handleLinkClick}
  visible={mounted}
  {dragonWidth}
  {sceneController}
  {screenWidth}
  {screenHeight}
  {modalManager}
/>

<!-- Particle Pool Container - holds all pre-warmed systems off-screen -->
<T.Group bind:ref={particlePoolContainer} name="ParticlePoolContainer" />

<!-- Render only active fireballs with direction prop -->
{#each activeFireballs as fireball (fireball.id)}
  <Fireball
    id={fireball.id}
    startPosition={fireball.startPosition}
    endPosition={fireball.endPosition}
    direction={fireball.direction}
    onComplete={handleFireballComplete}
    preloadedModel={sceneController.getAssetManager().getAssets()?.fireModel}
    preloadedTexture={sceneController.getAssetManager().getAssets()?.fireTexture}
    preloadedAudio={sceneController.getAssetManager().getAssets()?.fireballSound}
    preloadedFireballParticles={sceneController.getAssetManager().getAssets()
      ?.fireballParticleSystem}
    preloadedExplosionParticles={sceneController.getAssetManager().getAssets()
      ?.explosionParticleSystem}
    getParticleSystemFromPool={(type) =>
      sceneController.getAssetManager().getAvailableParticleSystem(type)}
    returnParticleSystemToPool={(system, type) =>
      sceneController.getAssetManager().returnParticleSystemToPool(system, type)}
    createParticleSystemAsync={(type) =>
      sceneController.getAssetManager().createParticleSystemAsync(type)}
    {particlePoolContainer}
  />
{/each}

<!-- Modal system moved to 2D overlay in parent component -->
