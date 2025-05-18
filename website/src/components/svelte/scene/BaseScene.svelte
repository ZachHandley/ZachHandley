<script lang="ts">
  import { T, useThrelte, useTask, type CurrentWritable } from "@threlte/core";
  import { Sky, AudioListener, useThrelteAudio, GLTF, useGltf, useDraco } from "@threlte/extras";
  import * as THREE from "three";
  import { onDestroy, onMount, tick, type Component } from "svelte";
  import { Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import Dragon from "../models/Dragon.svelte";
  import Ground from "./Ground.svelte";
  import Fireball from "./effects/Fireball.svelte";
  import StackedLinks from "./StackedLinks.svelte";
  import type { Link } from "~/types/baseSchemas";
  import FireAnimation from "../models/FireAnimation.svelte";
  import { type FireballGLTFResult } from "~/types/fireballTypes";
  import { AudioLoader, TextureLoader } from "three";

  let {
    handleDragonClick,
    links,
    handleInteract,
    activeCategory,
  }: {
    handleDragonClick: () => void;
    handleInteract?: (category?: string) => void;
    activeCategory?: string | null;
    links: Link[];
  } = $props();

  const { size: rendererSize } = useThrelte();

  // State
  let cameraRef = $state<THREE.PerspectiveCamera | undefined>(undefined);
  let audioListenerRef = $state<THREE.AudioListener | undefined>(undefined);
  let dragonRef = $state<THREE.Group | null>(null);
  let dragonEyeGlow = $state(0);
  let mounted = $state(false);
  let prevRendererSize = $state<{ width: number; height: number } | undefined>(
    undefined
  );

  let preloadedAssets = $state<{
    fireModel: FireballGLTFResult | undefined;
    fireTexture: THREE.Texture | undefined;
    fireballSound: AudioBuffer | undefined;
    loading: boolean;
  }>({
    fireModel: undefined,
    fireTexture: undefined,
    fireballSound: undefined,
    loading: false,
  });

  async function preloadFireAssets() {
  if (preloadedAssets.loading || 
      (preloadedAssets.fireModel && preloadedAssets.fireTexture && preloadedAssets.fireballSound)) {
    return; // Already loading or loaded
  }

  preloadedAssets.loading = true;
  console.log("Preloading fire assets in BaseScene");

  try {
    // Load GLTF model directly in BaseScene
    const gltfPromise = useGltf<FireballGLTFResult>(
      "/models/fire_animation-transformed.glb",
      { dracoLoader: useDraco() }
    );
    
    // Load texture directly in BaseScene
    const texturePromise = new Promise<THREE.Texture>((resolve, reject) => {
      new TextureLoader().load(
        "/textures/flame.webp",
        (texture) => {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
    
    // Load sound directly in BaseScene
    const soundPromise = new Promise<AudioBuffer>((resolve, reject) => {
      new AudioLoader().load(
        "/sounds/Fireball.wav",
        resolve,
        undefined,
        (error) => {
          console.warn("Could not load fireball sound:", error);
          reject(error);
        }
      );
    });
    
    // Wait for all to load
    const [fireModel, fireTexture, fireballSound] = await Promise.all([
      gltfPromise, texturePromise, soundPromise
    ]);
    
    // Store the results
    preloadedAssets.fireModel = fireModel;
    preloadedAssets.fireTexture = fireTexture;
    preloadedAssets.fireballSound = fireballSound;
    
    console.log("All assets preloaded successfully in BaseScene");
  } catch (error) {
    console.error("Failed to preload assets in BaseScene:", error);
  } finally {
    preloadedAssets.loading = false;
  }
}

  // Statically define these to avoid recreating them
  const ENVIRONMENT_SCALE = 1.5;
  const cameraPosition = { x: 0, y: 7.5, z: 15 * ENVIRONMENT_SCALE };
  const cameraTarget = { x: 0, y: 5, z: 0 };

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

  // Firefox optimization: Pre-allocate Vector3 objects
  const MAX_FIREBALLS = 10;
  const vectorPool = Array(MAX_FIREBALLS * 2)
    .fill(null)
    .map(() => new THREE.Vector3());

  // Reuse vector objects
  function getVector(index: number): THREE.Vector3 {
    return vectorPool[index % vectorPool.length];
  }

  // Firefox optimization: Pre-allocated fireball array with updated type
  let fireballPool = $state<
    {
      id: number;
      active: boolean;
      startPosition: THREE.Vector3;
      endPosition: THREE.Vector3;
      direction: THREE.Vector3; // ADDED: Store direction vector
      url: string;
      type: Link["type"];
      category?: string;
      action?: () => void;
    }[]
  >(
    Array(MAX_FIREBALLS)
      .fill(null)
      .map((_, i) => ({
        id: i,
        active: false,
        startPosition: getVector(i * 2),
        endPosition: getVector(i * 2 + 1),
        direction: new THREE.Vector3(0, 0, 1), // Default direction
        url: "",
        type: "url",
        category: undefined,
        action: undefined,
      }))
  );

  // Helper to get only active fireballs - computed from the pool
  const activeFireballs = $derived(fireballPool.filter((f) => f.active));

  // Counter for unique IDs
  let nextFireballId = $state(MAX_FIREBALLS);

  // For dragon rotation tweening
  let rotationTweenActive = $state(false);
  let rotationTween = $state<Tween<{ y: number }> | null>(null);
  let rotationPromise = $state<{ resolve: () => void } | null>(null);

  // Define the rotation task outside the function
  const dragonRotationTask = useTask(() => {
    // Only run if we're actively tweening and have a dragon
    if (!rotationTweenActive || !dragonRef || !rotationTween) return;

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

  async function handleLinkClick(
    url: string,
    type: Link["type"],
    position: THREE.Vector3,
    category?: string,
    action?: (() => void) | (() => Promise<void>)
  ): Promise<void> {
    if (!dragonRef) return;

    // Find an available fireball slot
    const availableIndex = fireballPool.findIndex((f) => !f.active);
    if (availableIndex === -1) {
      console.log("No available fireball slots");
      return;
    }

    // Create a temporary object to calculate the target rotation without affecting the actual dragon
    const tempObject = new THREE.Object3D();
    tempObject.position.copy(dragonRef.position);
    tempObject.rotation.copy(dragonRef.rotation);
    tempObject.lookAt(position);

    // Extract the Y rotation as that's what we want to tween
    const targetYRotation = tempObject.rotation.y;

    // Create a new tween for rotation
    rotationTween = new Tween(
      { y: dragonRef.rotation.y },
      { duration: 800, easing: cubicInOut }
    );

    // Set the target to start the tween
    rotationTween.set({ y: targetYRotation });

    // Start the task
    rotationTweenActive = true;
    dragonRotationTask.start();

    // Create a promise that will resolve when the rotation is complete
    await new Promise<void>((resolve) => {
      // Store the resolve function
      rotationPromise = { resolve };

      // Set a timeout for the tween duration
      setTimeout(async () => {
        // Wait for one more tick to ensure the final position is applied
        await tick();

        // Stop the task
        dragonRotationTask.stop();
        rotationTweenActive = false;

        // Clean up and resolve
        if (rotationPromise) {
          rotationPromise.resolve();
          rotationPromise = null;
        }

        resolve();
      }, 800); // Same as tween duration
    });

    // Force matrix update on the dragon after rotation completes
    dragonRef.updateMatrixWorld(true);

    // Use the dragon's forward direction to position the mouth
    // Trying to get the mouth to be correctly positioned based on the dragon's orientation

    // Define the mouth offset relative to the dragon's local coordinate system
    // Forward is +Z, Up is +Y, Right is +X in local space
    const mouthOffsetLocal = new THREE.Vector3(0, 3, 0.5); // Right/Left, Up/Down, Forward/Back

    // Get the dragon's forward, up, and right vectors after rotation
    const dragonForward = new THREE.Vector3(0, 0, 1).applyQuaternion(
      dragonRef.quaternion
    );
    const dragonUp = new THREE.Vector3(0, 1, 0).applyQuaternion(
      dragonRef.quaternion
    );
    const dragonRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
      dragonRef.quaternion
    );

    // Calculate the mouth position using the dragon's orientation vectors
    // Start with the dragon's position
    const dragonMouthPosition = getVector(0).copy(dragonRef.position);

    // Add the appropriate offsets in each direction
    dragonMouthPosition.add(dragonRight.multiplyScalar(mouthOffsetLocal.x));
    dragonMouthPosition.add(dragonUp.multiplyScalar(mouthOffsetLocal.y));
    dragonMouthPosition.add(dragonForward.multiplyScalar(mouthOffsetLocal.z));

    // Calculate direction from mouth to target - this is now accurate
    const direction = getVector(1)
      .subVectors(position, dragonMouthPosition)
      .normalize();

    // Update the fireball in place without creating new objects
    const fireball = fireballPool[availableIndex];
    fireball.active = true;
    fireball.id = nextFireballId++;
    fireball.startPosition.copy(dragonMouthPosition);
    fireball.endPosition.copy(position);
    fireball.direction.copy(direction);
    fireball.url = url;
    fireball.type = type;
    fireball.category = category || undefined;
    fireball.action = action;

    // Force state update with minimal object creation
    fireballPool = [...fireballPool];
  }

  // Firefox optimization: Mark fireballs as inactive instead of removing them
  function handleFireballComplete(id: number): void {
    try {
      console.log("Fireball completed with ID:", id);
      const completedFireball = fireballPool.find(
        (f) => f.active && f.id === id
      );

      // Call the handleInteract with just the category
      if (completedFireball && handleInteract) {
        handleInteract(completedFireball.category);
      }

      if (completedFireball) {
        const { url, type, action } = completedFireball;

        // Execute the action if it exists
        if (action) {
          console.log("Executing action for fireball");
          action();

          // Check if we need to also process the URL (non-category links)
          if (url && type !== "category" && type !== "action") {
            console.log("Processing URL after action:", url, type);
            // Process URL after a short delay to allow any visual effects from the action
            setTimeout(() => {
              navigateToExternalLink(url, type);
            }, 100);
          }
        }
        // If no action, handle URL directly
        else if (url) {
          console.log("Processing URL directly:", url, type);
          navigateToExternalLink(url, type);
        }

        // Mark as inactive
        completedFireball.active = false;

        // Update state with minimal object creation
        fireballPool = [...fireballPool];
      }
    } catch (error) {
      console.error("Error in fireball completion handler:", error);
    }
  }

  // Add a new function to handle external links properly that won't trigger popup blockers
  function navigateToExternalLink(url: string, type: string) {
    console.log("Navigating to external link:", url, type);
    
    // Create a single anchor element and reuse it
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener noreferrer"; // Security best practice
    
    if (type === "download") {
      a.download = url.split("/").pop() || "download";
      a.target = "_self"; // No need for new tab with downloads
    } else if (type === "contact") {
      a.download = "contact.vcf";
      a.target = "_self"; // No need for new tab with downloads
    } else {
      // For regular links, open in new tab but avoid popup detection
      a.target = "_blank";
      // Add event listeners for user interaction simulation - this helps avoid popup detection
      a.setAttribute("data-user-initiated", "true");
    }
    
    // Temporarily append to DOM to make the click work properly
    document.body.appendChild(a);
    
    // Add a small delay to help browsers recognize this as user-initiated action
    setTimeout(() => {
      a.click();
      document.body.removeChild(a);
    }, 50); // Small delay helps avoid popup detection
  }

  // Apply visual highlighting to crates based on activeCategory
  $effect(() => {
    // This would be implemented in your StackedLinks component
    // For now, we're just making sure the prop is reactive
    console.log("Active category changed:", activeCategory);
  });

  onMount(async () => {
    await preloadFireAssets();
  });

  // Firefox optimization: Clean up resources on component destruction
  onDestroy(() => {
    // Clear references to help Firefox's garbage collector
    fireballPool.forEach((fireball) => {
      fireball.active = false;
      fireball.startPosition.set(0, 0, 0);
      fireball.endPosition.set(0, 0, 0);
      fireball.direction.set(0, 0, 1);
      fireball.url = "";
      fireball.category = "";
    });
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
/>

<!-- Render only active fireballs with direction prop -->
{#each activeFireballs as fireball (fireball.id)}
  <Fireball
    id={fireball.id}
    startPosition={fireball.startPosition}
    endPosition={fireball.endPosition}
    direction={fireball.direction}
    onComplete={handleFireballComplete}
    preloadedModel={preloadedAssets.fireModel}
    preloadedTexture={preloadedAssets.fireTexture}
    preloadedAudio={preloadedAssets.fireballSound}
  />
{/each}

<FireAnimation position={[-900, -900, -900]} />
