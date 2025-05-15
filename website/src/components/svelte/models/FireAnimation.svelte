<script lang="ts">
  import * as THREE from "three";
  import {
    Group,
    TextureLoader,
    AdditiveBlending,
    Color,
    Clock,
    Vector3,
  } from "three";
  import type { Snippet } from "svelte";
  import { T, type Props, useTask } from "@threlte/core";
  import { useGltf, useGltfAnimations, useDraco } from "@threlte/extras";
  import {
    updateParticleSystems,
    createParticleSystem,
    type ParticleSystemConfig,
    type Shape,
    type LifeTimeCurve,
  } from "@newkrok/three-particles";

  const dracoLoader = useDraco();

  // Define props with proper types
  type ScaleArray = [number, number, number];

  let {
    fallback,
    error,
    children,
    ref = $bindable(),
    mode = "travel", // "travel" or "explosion"
    scale = [1, 1, 1] as ScaleArray,
    ...props
  }: Props<THREE.Group> & {
    ref?: THREE.Group;
    children?: Snippet<[{ ref: THREE.Group }]>;
    fallback?: Snippet;
    error?: Snippet<[{ error: Error }]>;
    mode?: "travel" | "explosion";
    scale?: ScaleArray;
  } = $props();

  ref = new Group();

  // Create references for particles and state
  let particleRef = $state<THREE.Group | undefined>();
  let gltfRef = $state<THREE.Group | undefined>();
  
  // Instead of a single instance, maintain two pre-created systems
  let fireballSystem = $state<THREE.Object3D | undefined>();
  let explosionSystem = $state<THREE.Object3D | undefined>();
  
  let isActive = $state<boolean>(true);
  let systemsInitialized = $state<boolean>(false);

  // Type for our animation cycle data
  interface CycleData {
    now: number;
    pauseStartTime: number;
    totalPauseTime: number;
    elapsed: number;
    delta: number;
  }

  // Setup clock and cycle data for animation updates
  const clock = new Clock();
  const cycleData: CycleData = {
    now: 0,
    pauseStartTime: 0,
    totalPauseTime: 0,
    elapsed: 0,
    delta: 0,
  };

  // GLTF Type Definitions
  type ActionName = "Take 001";
  type GLTFResult = {
    nodes: {
      flame01_phong2_0: THREE.Mesh;
      flame02_phong2_0: THREE.Mesh;
      flame03_phong2_0: THREE.Mesh;
      flame04_phong2_0: THREE.Mesh;
      flame05_phong2_0: THREE.Mesh;
      flame06_phong2_0: THREE.Mesh;
      flame07_phong2_0: THREE.Mesh;
      flame08_phong2_0: THREE.Mesh;
      flame09_phong2_0: THREE.Mesh;
      flame10_phong2_0: THREE.Mesh;
      flame11_phong2_0: THREE.Mesh;
      flame12_phong2_0: THREE.Mesh;
      flame13_phong2_0: THREE.Mesh;
      flame14_phong2_0: THREE.Mesh;
      flame16_phong2_0: THREE.Mesh;
      flame15_phong2_0: THREE.Mesh;
      flame17_phong2_0: THREE.Mesh;
    };
    materials: {
      phong2: THREE.MeshStandardMaterial;
    };
  };

  // Load the GLTF model
  const gltf = useGltf<GLTFResult>("/models/fire_animation-transformed.glb", {
    dracoLoader: dracoLoader,
  });

  // Set up animations
  export const { actions, mixer } = useGltfAnimations<ActionName>(gltf, ref);

  // FIREBALL EFFECT - Improved particle system with better colors
  const fireballEffect: ParticleSystemConfig = {
    duration: 0.5,
    looping: true,
    // Particles die after 0.7 seconds
    startLifetime: { min: 0.6, max: 0.7 },
    // Speed controls how fast particles move outward
    startSpeed: { min: 0.9, max: 1.1 },
    // Start small, grow larger over time
    startSize: { min: 0.8, max: 1.2 },
    // Random rotation for variety
    startRotation: { min: -180, max: 180 },
    // Proper fire colors - orange/red/yellow range
    startColor: {
      min: {
        r: 0.8, // More reddish/orange
        g: 0.3,
        b: 0.05,
      },
      max: {
        r: 1.0, // Bright orange/yellow
        g: 0.6,
        b: 0.1,
      },
    },
    transform: { rotation: new Vector3(0, 0, 0) },
    // No gravity in the travel effect
    gravity: 0,
    // Reduced particle count for better performance
    maxParticles: 500,
    emission: { rateOverTime: 1500 },
    // SPHERE shape for emission around the core
    shape: {
      shape: "SPHERE" as Shape,
      sphere: {
        radius: 0.5, // Emission radius
      },
    },
    // Additive blending for the brightness effect
    renderer: {
      blending: AdditiveBlending,
      discardBackgroundColor: false,
      backgroundColorTolerance: 0,
      backgroundColor: new Color(0, 0, 0),
      transparent: true,
      depthTest: true,
      depthWrite: false,
    },
    // Size over lifetime curve
    sizeOverLifetime: {
      isActive: true,
      lifetimeCurve: {
        type: "BEZIER" as LifeTimeCurve.BEZIER,
        bezierPoints: [
          { x: 0, y: 0, percentage: 0 }, // Start at size 0
          { x: 0.4, y: 0.6 },
          { x: 0.7, y: 0.9 },
          { x: 1, y: 1, percentage: 1 }, // End at max size
        ],
        scale: 1,
      },
    },
    // Opacity over lifetime
    opacityOverLifetime: {
      isActive: true,
      lifetimeCurve: {
        type: "BEZIER" as LifeTimeCurve.BEZIER,
        bezierPoints: [
          { x: 0, y: 0.5, percentage: 0 }, // Start at 50% opacity
          { x: 0.1, y: 1.0 }, // Quickly reach full opacity
          { x: 0.8, y: 1.0 }, // Maintain full opacity for most of life
          { x: 1, y: 0.3, percentage: 1 }, // Fade at the end for softer look
        ],
        scale: 1,
      },
    },
    rotationOverLifetime: { isActive: true, min: -50, max: 50 },
    // Small amount of noise for more natural movement
    noise: {
      isActive: true,
      useRandomOffset: true,
      strength: 0.05,
      positionAmount: 0.1,
      rotationAmount: 0.5,
      frequency: 1,
      octaves: 1,
      sizeAmount: 0.5,
    },
    map: undefined, // Will be set after loading
  };

  // Explosion effect - more violent and faster
  const explosionEffect: ParticleSystemConfig = {
    duration: 0.5,
    looping: true,
    startLifetime: { min: 0.2, max: 0.5 },
    // Much faster outward movement for explosion
    startSpeed: { min: 5.0, max: 10.0 },
    startSize: { min: 1.0, max: 2.5 },
    startRotation: { min: -180, max: 180 },
    // More intense reddish explosion colors
    startColor: {
      min: {
        r: 0.9, // More red for explosion
        g: 0.2,
        b: 0.02,
      },
      max: {
        r: 1.0,
        g: 0.7, // Orange/yellow for explosion
        b: 0.1,
      },
    },
    transform: { rotation: new Vector3(0, 0, 0) },
    // Slight rise for explosion
    gravity: 0.1,
    // Fewer particles for performance
    maxParticles: 400,
    emission: { rateOverTime: 1000 },
    // Sphere shape but larger radius for explosion
    shape: {
      shape: "SPHERE" as Shape,
      sphere: {
        radius: 1.0, // Larger emission radius
      },
    },
    // Additive blending for brightness
    renderer: {
      blending: AdditiveBlending,
      discardBackgroundColor: false,
      backgroundColorTolerance: 0,
      backgroundColor: new Color(0, 0, 0),
      transparent: true,
      depthTest: true,
      depthWrite: false,
    },
    // Start large, then decrease slightly
    sizeOverLifetime: {
      isActive: true,
      lifetimeCurve: {
        type: "BEZIER" as LifeTimeCurve.BEZIER,
        bezierPoints: [
          { x: 0, y: 0.8, percentage: 0 },
          { x: 0.2, y: 1.0 },
          { x: 0.6, y: 0.9 },
          { x: 1, y: 0.3, percentage: 1 },
        ],
        scale: 1,
      },
    },
    // Start fully opaque, then fade
    opacityOverLifetime: {
      isActive: true,
      lifetimeCurve: {
        type: "BEZIER" as LifeTimeCurve.BEZIER,
        bezierPoints: [
          { x: 0, y: 1.0, percentage: 0 },
          { x: 0.4, y: 0.9 },
          { x: 0.7, y: 0.5 },
          { x: 1, y: 0, percentage: 1 },
        ],
        scale: 1,
      },
    },
    // More rotation for chaos
    rotationOverLifetime: { isActive: true, min: -90, max: 90 },
    // More noise for chaotic explosion
    noise: {
      isActive: true,
      useRandomOffset: true,
      strength: 0.2,
      positionAmount: 0.3,
      rotationAmount: 0.7,
      frequency: 1.5,
      octaves: 2,
      sizeAmount: 0.6,
    },
    map: undefined, // Will be set after loading
  };

  // Use the flame texture for particles
  const textureLoader = new TextureLoader();
  textureLoader.load(
    "/textures/flame.webp", // Use the existing texture
    (texture: THREE.Texture) => {
      // Configure texture
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // Apply to both effects
      fireballEffect.map = texture;
      explosionEffect.map = texture;

      // Initialize particle systems if group exists
      if (particleRef && isActive) {
        initParticleSystems(particleRef);
      }
    },
    undefined,
    (err: unknown) => {
      console.error("Error loading flame texture:", err);
    }
  );

  // Pre-create both particle systems
  function initParticleSystems(group: THREE.Group): void {
    if (!group || !isActive || systemsInitialized) return;

    try {
      // Initialize cycleData
      cycleData.now = Date.now();

      // Create fireball system
      if (fireballEffect.map) {
        const fireballResult = createParticleSystem(fireballEffect as any, cycleData.now);
        if (fireballResult && fireballResult.instance) {
          fireballSystem = fireballResult.instance;
          // Set initial state based on mode
          fireballSystem.scale.set(mode === "travel" ? 1 : 0, mode === "travel" ? 1 : 0, mode === "travel" ? 1 : 0);
          group.add(fireballSystem);
        }
      }

      // Create explosion system
      if (explosionEffect.map) {
        const explosionResult = createParticleSystem(explosionEffect as any, cycleData.now);
        if (explosionResult && explosionResult.instance) {
          explosionSystem = explosionResult.instance;
          // Set initial state based on mode
          explosionSystem.scale.set(mode === "explosion" ? 1 : 0, mode === "explosion" ? 1 : 0, mode === "explosion" ? 1 : 0);
          group.add(explosionSystem);
        }
      }

      // Update GLTF visibility based on mode
      if (gltfRef) {
        gltfRef.visible = mode === "travel";
      }

      // Mark as initialized to prevent recreation
      systemsInitialized = true;
    } catch (error) {
      console.error("Failed to initialize particle systems:", error);
    }
  }

  // Update the particle system and GLTF model based on mode
  useTask((delta: number) => {
    if (!isActive || !systemsInitialized) return;
    
    const isExplosionMode = mode === "explosion";
    
    // Only update if both systems are available
    if (fireballSystem && explosionSystem) {
      // Toggle systems using scale instead of destroying/recreating
      if (isExplosionMode) {
        // Show explosion, hide fireball
        explosionSystem.scale.set(1, 1, 1);
        fireballSystem.scale.set(0, 0, 0);
      } else {
        // Show fireball, hide explosion
        explosionSystem.scale.set(0, 0, 0);
        fireballSystem.scale.set(1, 1, 1);
      }
    }
    
    // Update GLTF visibility
    if (gltfRef) {
      gltfRef.visible = !isExplosionMode;
    }
    
    // Update cycle data
    const rawDelta = clock.getDelta();
    cycleData.now = Date.now() - cycleData.totalPauseTime;
    cycleData.delta = rawDelta > 0.1 ? 0.1 : rawDelta;
    cycleData.elapsed = clock.getElapsedTime();
    
    // Update particle systems - only need to call once for all systems
    updateParticleSystems(cycleData);
    
    // Update GLTF animations
    if (mixer) {
      mixer.update(delta);
    }
  });

  // Cleanup when component is destroyed
  function cleanup(): void {
    isActive = false;
    
    if (particleRef) {
      // Remove both systems
      if (fireballSystem) {
        particleRef.remove(fireballSystem);
        fireballSystem = undefined;
      }
      
      if (explosionSystem) {
        particleRef.remove(explosionSystem);
        explosionSystem = undefined;
      }
    }
  }
</script>

<T is={ref} dispose={false} {...props}>
  <!-- Particle effects container -->
  <T.Group
    bind:ref={particleRef}
    ondestroy={cleanup}
  >
    <!-- This group will contain the particle system -->
  </T.Group>

  <!-- GLTF Fire Animation Model - only visible during travel mode -->
  {#if $gltf}
    <T.Group
      bind:ref={gltfRef}
      name="Sketchfab_Scene"
      {scale}
      visible={mode === "travel"}
    >
      <T.Group
        name="Sketchfab_model"
        rotation={[-Math.PI / 2, 0, 0]}
        scale={0.4}
      >
        <T.Group
          name="7932a0dac3824e028da37f46ce28fafdfbx"
          rotation={[Math.PI / 2, 0, 0]}
        >
          <T.Group name="Object_2">
            <T.Group name="RootNode">
              <T.Group name="flame01">
                <T.Mesh
                  name="flame01_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame01_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame02">
                <T.Mesh
                  name="flame02_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame02_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame03">
                <T.Mesh
                  name="flame03_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame03_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame04">
                <T.Mesh
                  name="flame04_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame04_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame05">
                <T.Mesh
                  name="flame05_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame05_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame06">
                <T.Mesh
                  name="flame06_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame06_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame07" scale={[1, 1, 1.06]}>
                <T.Mesh
                  name="flame07_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame07_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame08" scale={[1, 1, 1.12]}>
                <T.Mesh
                  name="flame08_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame08_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame09" scale={[1, 1, 1.14]}>
                <T.Mesh
                  name="flame09_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame09_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame10">
                <T.Mesh
                  name="flame10_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame10_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame11">
                <T.Mesh
                  name="flame11_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame11_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame12">
                <T.Mesh
                  name="flame12_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame12_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame13">
                <T.Mesh
                  name="flame13_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame13_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame14">
                <T.Mesh
                  name="flame14_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame14_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame16">
                <T.Mesh
                  name="flame16_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame16_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame15">
                <T.Mesh
                  name="flame15_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame15_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
              <T.Group name="flame17">
                <T.Mesh
                  name="flame17_phong2_0"
                  castShadow
                  receiveShadow
                  geometry={$gltf.nodes.flame17_phong2_0.geometry}
                  material={$gltf.materials.phong2}
                />
              </T.Group>
            </T.Group>
          </T.Group>
        </T.Group>
      </T.Group>
    </T.Group>
  {/if}

  {@render children?.({ ref })}
</T>
