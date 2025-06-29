<script lang="ts">
  import { T, useThrelte, useTask } from "@threlte/core";
  import { Sky, AudioListener, HTML } from "@threlte/extras";
  import * as THREE from "three";
  import { onDestroy, onMount } from "svelte";
  import { Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import Dragon from "../models/Dragon.svelte";
  import Ground from "./Ground.svelte";
  import Fireball from "./effects/Fireball.svelte";
  import StackedLinks from "./StackedLinks.svelte";
  import ModalManager from "../ui/ModalManager.svelte";
  import type { Link } from "~/types/baseSchemas";
  import CrateExplode from "../models/CrateExplode.svelte";
  import { SceneController } from "~/components/svelte/utils/sceneController.svelte.ts";

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
    modalManager?: { showModal: (link: Link, x: number, y: number) => void; hideModal: () => void } | null;
  } = $props();

  const { size: rendererSize } = useThrelte();

  // Core scene references
  let cameraRef = $state<THREE.PerspectiveCamera | undefined>(undefined);
  let audioListenerRef = $state<THREE.AudioListener | undefined>(undefined);
  let dragonRef = $state<THREE.Group | null>(null);
  let dragonEyeGlow = $state(0);
  let mounted = $state(false);
  let testCrateRef = $state<{ explode: () => void; reset: () => void } | null>(null);
  let prevRendererSize = $state<{ width: number; height: number } | undefined>(undefined);
  let particlePoolContainer = $state<THREE.Group | undefined>(undefined);

  // Debug modal manager binding
  $effect(() => {
    console.log(`🎮 BaseScene: modalManager binding status:`, {
      hasModalManager: !!modalManager,
      modalManagerType: typeof modalManager
    });
  });

  // Statically define these to avoid recreating them
  const ENVIRONMENT_SCALE = 1.5;
  const cameraPosition = { x: 0, y: 7.5, z: 15 * ENVIRONMENT_SCALE };
  const cameraTarget = { x: 0, y: 5, z: 0 };

  // Initialize the scene controller
  const sceneController = new SceneController({
    environmentScale: ENVIRONMENT_SCALE,
    zDepth: 6, // LINKS_Z_DEPTH
    dragonWidth: 6 * ENVIRONMENT_SCALE,
    maxFireballs: 10,
    onLoadingStateChange,
    onCategoryInteraction: handleInteract
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

  // Firefox optimization: Camera update throttling
  let lastCameraUpdate = 0;

  // Setup for perspective camera
  $effect(() => {
    if (!cameraRef || !$rendererSize) return;

    // Firefox optimization: Throttle camera updates to reduce GC pressure
    const now = performance.now();
    if (lastCameraUpdate && now - lastCameraUpdate < 200) return;

    // Only update if dimensions actually changed by a meaningful amount
    if (
      !prevRendererSize ||
      Math.abs($rendererSize.width - prevRendererSize.width) > 5 ||
      Math.abs($rendererSize.height - prevRendererSize.height) > 5
    ) {
      console.log("Camera aspect updated");
      cameraRef.aspect = $rendererSize.width / $rendererSize.height;
      cameraRef.updateProjectionMatrix();
      prevRendererSize = {
        width: $rendererSize.width,
        height: $rendererSize.height,
      };
      if (!mounted) mounted = true;
      lastCameraUpdate = now;
    }
  });

  // Get active fireballs from SceneController (reactive)
  const activeFireballs = $derived(sceneController.getActiveFireballs());
  
  // Debug active fireballs
  $effect(() => {
    console.log(`🔮 Active fireballs count: ${activeFireballs.length}`, activeFireballs);
  });

  // For dragon rotation tweening (used by SceneController)
  let rotationTween = new Tween({ y: 0 }, {
    duration: 800,
    easing: cubicInOut,
  });

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
    crateId?: string
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
      dragonRotationTask
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
    
    // Initialize particle pool container after assets are loaded
    // Wait for particle pre-warming to complete, then initialize pool
    setTimeout(() => {
      initializeParticlePool();
    }, 1000);
  });
  
  // Initialize the particle pool container
  function initializeParticlePool(): void {
    console.log('🎯 Starting particle pool initialization...');
    
    if (!particlePoolContainer) {
      console.warn('Particle pool container not available yet');
      return;
    }
    
    // Position the pool container far off-screen
    particlePoolContainer.position.set(1000, 1000, 1000);
    console.log('📍 Pool container positioned at (1000, 1000, 1000)');
    
    // Get all pre-warmed systems from AssetManager and add them to pool container
    const prewarmedSystems = sceneController.getAssetManager().getAllPrewarmedSystems();
    console.log(`🔥 Found ${prewarmedSystems.length} pre-warmed systems`);
    
    if (prewarmedSystems.length === 0) {
      console.warn('⚠️ No pre-warmed systems found! Particle effects may not work.');
      // Log pool stats to understand why
      const poolStats = sceneController.getAssetManager().getPoolStats();
      console.log('📊 Pool stats:', poolStats);
      return;
    }
    
    prewarmedSystems.forEach((system, index) => {
      if (particlePoolContainer) {
        // Spread systems out a bit to avoid overlap (though they're scaled to 0)
        system.position.set(index * 10, 0, 0);
        particlePoolContainer.add(system);
        console.log(`✅ Added system ${index + 1}/${prewarmedSystems.length} to pool container`);
      }
    });
    
    console.log(`✅ Pool initialization complete: ${prewarmedSystems.length} systems ready`);
  }

  onDestroy(() => {
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
  fov={60}
  aspect={$rendererSize ? $rendererSize.width / $rendererSize.height : 1}
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
  useExplodingCrates={true}
  sceneController={sceneController}
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
    preloadedFireballParticles={sceneController.getAssetManager().getAssets()?.fireballParticleSystem}
    preloadedExplosionParticles={sceneController.getAssetManager().getAssets()?.explosionParticleSystem}
    getParticleSystemFromPool={(type) => sceneController.getAssetManager().getAvailableParticleSystem(type)}
    returnParticleSystemToPool={(system, type) => sceneController.getAssetManager().returnParticleSystemToPool(system, type)}
    createParticleSystemAsync={(type) => sceneController.getAssetManager().createParticleSystemAsync(type)}
    particlePoolContainer={particlePoolContainer}
  />
{/each}

<!-- Modal system moved to 2D overlay in parent component -->
