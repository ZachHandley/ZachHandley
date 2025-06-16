<script lang="ts">
  import { T, useTask, useLoader } from "@threlte/core";
  import { useAudioListener, Audio } from "@threlte/extras";
  import { elasticOut } from "svelte/easing";
  import * as THREE from "three";
  import { AudioLoader } from "three";
  import FireAnimation from "../../models/FireAnimation.svelte";
  import { type FireballGLTFResult } from "~/types/fireballTypes";

  let {
    startPosition,
    endPosition,
    direction, // Accept direction vector from parent
    onComplete,
    id = 0,
    preloadedAudio,
    preloadedTexture,
    preloadedModel,
    preloadedFireballParticles,
    preloadedExplosionParticles,
    getParticleSystemFromPool,
    returnParticleSystemToPool,
    createParticleSystemAsync,
    particlePoolContainer,
  }: {
    startPosition: THREE.Vector3;
    endPosition: THREE.Vector3;
    direction?: THREE.Vector3; // Optional to maintain backward compatibility
    onComplete?: (id: number) => void;
    id?: number;
    preloadedAudio?: AudioBuffer;
    preloadedTexture?: THREE.Texture;
    preloadedModel?: FireballGLTFResult;
    preloadedFireballParticles?: THREE.Object3D;
    preloadedExplosionParticles?: THREE.Object3D;
    getParticleSystemFromPool?: (type: 'fireball' | 'explosion') => THREE.Object3D | null;
    returnParticleSystemToPool?: (system: THREE.Object3D, type: 'fireball' | 'explosion') => void;
    createParticleSystemAsync?: (type: 'fireball' | 'explosion') => Promise<THREE.Object3D | null>;
    particlePoolContainer?: THREE.Group | null | undefined;
  } = $props();

  // References and state
  let fireballRef = $state<THREE.Group | undefined>();
  let fireballLightRef = $state<THREE.PointLight | undefined>();
  let fireballSoundRef = $state<THREE.Audio | undefined>();
  let explosionSoundRef = $state<THREE.Audio | undefined>();
  let isActive = $state(true);
  let shouldPlaySound = $state(true); // Set to true immediately to play on launch
  const { listener } = useAudioListener("default");

  // Animation mode state for FireAnimation
  let fireAnimationMode = $state<"travel" | "explosion">("travel");

  // Load fireball and explosion sounds
  const { load } = useLoader(AudioLoader);
  const fireballSound = preloadedAudio || load("/sounds/Fireball.wav");

  // Animation parameters - smaller explosion scale
  const TRAVEL_DURATION = 750; // ms
  const EXPLOSION_DURATION = 400; // ms - slightly reduced
  const FADEOUT_DURATION = 250; // ms - slightly reduced

  // Scale values
  const TRAVEL_SCALE = 1.0; // Reduced as we now have the mesh core
  const MAX_EXPLOSION_SCALE = 3.0; // Much smaller with the mesh core

  // Animation state
  let animationPhase = $state<"travel" | "explosion" | "fadeout">("travel");
  let animationStartTime = $state<number>(performance.now());

  // Calculate direction vector for orientation
  const travelDirection =
    direction ||
    new THREE.Vector3().subVectors(endPosition, startPosition).normalize();

  // Precompute the bezier control point once
  const bezierControlPoint = (() => {
    // Calculate a reasonable control point for the arc
    const midX = (startPosition.x + endPosition.x) / 2;
    // Use a more moderate arc height that doesn't overshoot
    let arcHeight = 2.0;

    // Adjust arc height based on distance - longer distances get higher arcs
    const distance = startPosition.distanceTo(endPosition);
    arcHeight = Math.min(distance * 0.15, 3.0); // Max height of 3.0 units

    const midY = Math.max(startPosition.y, endPosition.y) + arcHeight;
    const midZ = (startPosition.z + endPosition.z) / 2;

    return new THREE.Vector3(midX, midY, midZ);
  })();

  // Keep track of last position for orientation updates
  let lastYPosition = startPosition.y;

  // Calculate initial tangent direction for orientation
  // This gives us the starting direction of movement
  const initialTangent = new THREE.Vector3(
    2 * (bezierControlPoint.x - startPosition.x),
    2 * (bezierControlPoint.y - startPosition.y),
    2 * (bezierControlPoint.z - startPosition.z)
  ).normalize();

  // Calculate the rotation to face the direction of travel
  function calculateRotationFromDirection(dir: THREE.Vector3): THREE.Euler {
    // Create a quaternion that rotates from the default forward vector (0,0,1) to our direction
    const quaternion = new THREE.Quaternion();

    // Default forward vector in three.js
    const forward = new THREE.Vector3(0, 0, 1);

    // Set the quaternion to represent the rotation from forward to our direction
    quaternion.setFromUnitVectors(forward, dir);

    // Create and return the euler rotation
    const rotation = new THREE.Euler();
    rotation.setFromQuaternion(quaternion);

    return rotation;
  }

  // Get initial rotation based on travel direction
  const initialRotation = calculateRotationFromDirection(travelDirection);

  // Helper function to safely cleanup when animation completes
  function cleanupAndComplete() {
    if (!isActive) return; // Prevent duplicate calls

    console.log("Fireball animation complete, calling onComplete with ID:", id);
    isActive = false;

    // Call onComplete directly instead of in setTimeout
    if (onComplete) {
      try {
        onComplete(id);
      } catch (error) {
        console.error("Error in onComplete callback:", error);
      }
    }
  }

  // Function to create explosion effect
  function createExplosionEffect() {
    if (!fireballRef) return;

    // Transition FireAnimation to explosion mode
    fireAnimationMode = "explosion";

    // Play explosion sound
    if (explosionSoundRef && !explosionSoundRef.isPlaying) {
      try {
        explosionSoundRef.play();
      } catch (error) {
        console.warn("Could not play explosion sound:", error);
      }
    }

    // Brighten the light at explosion start
    if (fireballLightRef) {
      fireballLightRef.intensity = 8;
      fireballLightRef.distance = 50;
      fireballLightRef.color.set("#ffaa00");
    }
  }

  // Create the animation task that runs on each frame
  useTask((delta) => {
    if (!isActive || !fireballRef || !startPosition || !endPosition) {
      return;
    }

    const currentTime = performance.now();
    const elapsedTime = currentTime - animationStartTime;

    try {
      if (animationPhase === "travel") {
        // Travel phase
        if (elapsedTime < TRAVEL_DURATION) {
          const progress = elapsedTime / TRAVEL_DURATION;

          // Play sound at the beginning of travel (launch)
          if (
            progress < 0.1 &&
            fireballSoundRef &&
            shouldPlaySound &&
            !fireballSoundRef.isPlaying
          ) {
            try {
              fireballSoundRef.play();
              shouldPlaySound = false;
            } catch (error) {
              console.warn("Could not play fireball sound:", error);
            }
          }

          // Calculate position along the bezier curve
          // We precompute the control point only once when the component is created,
          // not on every frame
          const t = progress; // Normalized time (0-1)
          const t1 = 1 - t; // Inverse time (1-0)

          // Use the precomputed control point
          // Quadratic bezier formula for position
          const x =
            t1 * t1 * startPosition.x +
            2 * t1 * t * bezierControlPoint.x +
            t * t * endPosition.x;
          const y =
            t1 * t1 * startPosition.y +
            2 * t1 * t * bezierControlPoint.y +
            t * t * endPosition.y;
          const z =
            t1 * t1 * startPosition.z +
            2 * t1 * t * bezierControlPoint.z +
            t * t * endPosition.z;

          // Update fireball position
          if (fireballRef) {
            fireballRef.position.set(x, y, z);

            // ORIENTATION UPDATE OPTIMIZATION:
            // Only update orientation for significant vertical movement
            // This prevents constantly recalculating orientation which could cause instability

            // Calculate the current height difference from the last recorded height
            const heightDifference = Math.abs(y - lastYPosition);

            // If there's significant vertical movement (more than 0.2 units), update orientation
            if (heightDifference > 0.2) {
              // TANGENT CALCULATION ONLY FOR SIGNIFICANT HEIGHT CHANGES:
              const tangentX =
                2 * t1 * (bezierControlPoint.x - startPosition.x) +
                2 * t * (endPosition.x - bezierControlPoint.x);
              const tangentY =
                2 * t1 * (bezierControlPoint.y - startPosition.y) +
                2 * t * (endPosition.y - bezierControlPoint.y);
              const tangentZ =
                2 * t1 * (bezierControlPoint.z - startPosition.z) +
                2 * t * (endPosition.z - bezierControlPoint.z);

              // Create normalized tangent vector (direction of movement)
              const tangent = new THREE.Vector3(
                tangentX,
                tangentY,
                tangentZ
              ).normalize();

              // Calculate a point along the tangent to look at
              const lookTarget = new THREE.Vector3(
                x + tangent.x,
                y + tangent.y,
                z + tangent.z
              );

              // Use lookAt for orientation
              const tempObj = new THREE.Object3D();
              tempObj.position.copy(fireballRef.position);
              tempObj.lookAt(lookTarget);

              // Apply rotation with adjustment for flame direction
              fireballRef.rotation.set(
                tempObj.rotation.x - Math.PI / 2, // -90 degrees X for flame direction
                tempObj.rotation.y,
                tempObj.rotation.z
              );

              // Update last Y position
              lastYPosition = y;
            }
          }

          // Update light position
          if (fireballLightRef) {
            fireballLightRef.position.set(x, y, z);

            // Gradually increase light intensity during travel
            fireballLightRef.intensity = 2 + progress * 2;
            fireballLightRef.distance = 30 + progress * 10;
          }
        } else {
          // Position at the end point
          if (fireballRef) {
            fireballRef.position.copy(endPosition);
          }
          if (fireballLightRef) {
            fireballLightRef.position.copy(endPosition);
          }

          // Transition to explosion phase
          animationPhase = "explosion";
          animationStartTime = currentTime;

          // Create explosion effect
          createExplosionEffect();
        }
      } else if (animationPhase === "explosion") {
        // Explosion phase
        if (elapsedTime < EXPLOSION_DURATION) {
          const progress = elapsedTime / EXPLOSION_DURATION;

          // Use elasticOut for explosive appearance
          const scale =
            TRAVEL_SCALE +
            (MAX_EXPLOSION_SCALE - TRAVEL_SCALE) * elasticOut(progress);

          // Animate light during explosion
          if (fireballLightRef) {
            // Start bright then fade
            fireballLightRef.intensity = 8 * (1 - progress * 0.3);
            fireballLightRef.distance = 50 * (1 - progress * 0.2);

            // Color shift from yellow to red
            const hue = 0.1 - progress * 0.1; // 0.1 (yellow-orange) to 0 (red)
            const saturation = 1.0;
            const lightness = 0.5 + 0.3 * (1 - progress);

            const color = new THREE.Color().setHSL(hue, saturation, lightness);
            fireballLightRef.color.copy(color);
          }
        } else {
          // Transition to fadeout phase
          animationPhase = "fadeout";
          animationStartTime = currentTime;
        }
      } else if (animationPhase === "fadeout") {
        // Fadeout phase
        if (elapsedTime < FADEOUT_DURATION) {
          const progress = elapsedTime / FADEOUT_DURATION;

          // Decrease light intensity
          if (fireballLightRef) {
            fireballLightRef.intensity = 5 * (1 - progress);
            fireballLightRef.distance = 40 * (1 - progress);
          }
        } else {
          // End animation safely
          cleanupAndComplete();
        }
      }
    } catch (error) {
      console.error("Animation error:", error);
      cleanupAndComplete();
    }
  });

  // Cleanup on component destroy
  function cleanup() {
    isActive = false;
    if (fireballSoundRef && fireballSoundRef.isPlaying) {
      try {
        fireballSoundRef.stop();
      } catch (error) {
        console.warn("Error stopping audio:", error);
      }
    }
    if (explosionSoundRef && explosionSoundRef.isPlaying) {
      try {
        explosionSoundRef.stop();
      } catch (error) {
        console.warn("Error stopping explosion audio:", error);
      }
    }
  }
</script>

{#if isActive}
  <T.Group
    bind:ref={fireballRef}
    oncreate={(group) => {
      // Initial setup
      if (group) {
        // First position the fireball at the start position
        group.position.copy(startPosition);

        // Use the precomputed initialTangent for orientation
        const initialLookTarget = new THREE.Vector3(
          startPosition.x + initialTangent.x,
          startPosition.y + initialTangent.y,
          startPosition.z + initialTangent.z
        );

        // Create a temp object to calculate the look rotation
        const tempObj = new THREE.Object3D();
        tempObj.position.copy(startPosition);
        tempObj.lookAt(initialLookTarget);

        // Apply the rotation with adjustment for flame direction
        group.rotation.set(
          tempObj.rotation.x - Math.PI / 2, // -90 degrees X for flame direction
          tempObj.rotation.y,
          tempObj.rotation.z
        );
      }
    }}
    ondestroy={cleanup}
  >
    <!-- Use FireAnimation with mode based on animation phase -->
    <FireAnimation
      scale={[1.2, 1, 1.2]}
      mode={fireAnimationMode}
      {preloadedModel}
      {preloadedTexture}
      {preloadedFireballParticles}
      {preloadedExplosionParticles}
      {getParticleSystemFromPool}
      {returnParticleSystemToPool}
      {createParticleSystemAsync}
      {particlePoolContainer}
    />

    <!-- Point light that follows the fireball -->
    <T.PointLight
      bind:ref={fireballLightRef}
      color="#ff7700"
      intensity={3}
      distance={40}
      decay={1.5}
    />

    <!-- Add audio -->
    {#if listener}
      {#await fireballSound then sound}
        <Audio
          bind:ref={fireballSoundRef}
          src={sound}
          {listener}
          volume={0.6}
          oncreate={(audio) => {
            if (audio && sound) {
              audio.setBuffer(sound);
              audio.setVolume(0.4);
              audio.setLoop(false);
            }
          }}
        />
      {/await}

      <!-- {#await explosionSound then sound}
        <Audio
          bind:ref={explosionSoundRef}
          src={sound}
          {listener}
          volume={0.8}
          oncreate={(audio) => {
            if (audio && sound) {
              audio.setBuffer(sound);
              audio.setVolume(0.6);
              audio.setLoop(false);
            }
          }}
        />
      {/await} -->
    {/if}
  </T.Group>
{/if}
