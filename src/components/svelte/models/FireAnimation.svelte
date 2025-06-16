<script lang="ts">
  import * as THREE from "three";
  import {
    Group,
    AdditiveBlending,
    Color,
    Clock,
    Vector3,
  } from "three";
  import type { Snippet } from "svelte";
  import { onDestroy } from "svelte";
  import { T, type Props, useTask } from "@threlte/core";
  import { useGltf, useGltfAnimations, useDraco } from "@threlte/extras";
  import {
    updateParticleSystems,
    createParticleSystem,
    type ParticleSystemConfig,
    type Shape,
    type LifeTimeCurve,
  } from "@newkrok/three-particles";
  import type { FireballGLTFResult } from "~/types/fireballTypes";
  import { writable } from "svelte/store";

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
    preloadedModel,
    preloadedTexture,
    preloadedFireballParticles,
    preloadedExplosionParticles,
    getParticleSystemFromPool: getParticleSystemFromPoolProp,
    returnParticleSystemToPool: returnParticleSystemToPoolProp,
    createParticleSystemAsync: createParticleSystemAsyncProp,
    particlePoolContainer,
    ...props
  }: Props<THREE.Group> & {
    ref?: THREE.Group;
    children?: Snippet<[{ ref: THREE.Group }]>;
    fallback?: Snippet;
    error?: Snippet<[{ error: Error }]>;
    mode?: "travel" | "explosion";
    scale?: ScaleArray;
    preloadedModel?: FireballGLTFResult;
    preloadedTexture?: THREE.Texture;
    preloadedFireballParticles?: THREE.Object3D;
    preloadedExplosionParticles?: THREE.Object3D;
    getParticleSystemFromPool?: (type: 'fireball' | 'explosion') => THREE.Object3D | null;
    returnParticleSystemToPool?: (system: THREE.Object3D, type: 'fireball' | 'explosion') => void;
    createParticleSystemAsync?: (type: 'fireball' | 'explosion') => Promise<THREE.Object3D | null>;
    particlePoolContainer?: THREE.Group | null | undefined;
  } = $props();

  // Ensure we have a valid group reference
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

  // Load the GLTF model, preferring preloaded model
  const gltf = preloadedModel
    ? writable(preloadedModel)
    : useGltf<GLTFResult>("/models/fire_animation-transformed.glb", {
        dracoLoader: dracoLoader,
      });

  // Set up animations
  export const { actions, mixer } = useGltfAnimations<ActionName>(gltf, ref);

  // Helper function to ensure valid numeric values
  function safeValue(value: number, fallback: number, min?: number, max?: number): number {
    if (!isFinite(value) || isNaN(value)) {
      console.warn(`⚠️ Invalid value ${value}, using fallback ${fallback}`);
      return fallback;
    }
    if (min !== undefined && value < min) {
      console.warn(`⚠️ Value ${value} below minimum ${min}, clamping`);
      return min;
    }
    if (max !== undefined && value > max) {
      console.warn(`⚠️ Value ${value} above maximum ${max}, clamping`);
      return max;
    }
    return value;
  }

  // Helper function to create safe color values
  function safeColor(r: number, g: number, b: number) {
    return {
      r: safeValue(r, 1.0, 0, 1),
      g: safeValue(g, 1.0, 0, 1),
      b: safeValue(b, 1.0, 0, 1),
    };
  }

  // FIREBALL EFFECT - Improved particle system with better colors and validation
  const fireballEffect: ParticleSystemConfig = {
    duration: safeValue(0.5, 0.5, 0.1, 10),
    looping: true,
    // Particles die after 0.7 seconds
    startLifetime: { 
      min: safeValue(0.6, 0.6, 0.1, 5), 
      max: safeValue(0.7, 0.7, 0.1, 5) 
    },
    // Speed controls how fast particles move outward
    startSpeed: { 
      min: safeValue(0.9, 0.9, 0, 10), 
      max: safeValue(1.1, 1.1, 0, 10) 
    },
    // Start small, grow larger over time
    startSize: { 
      min: safeValue(0.8, 0.8, 0.1, 5), 
      max: safeValue(1.2, 1.2, 0.1, 5) 
    },
    // Random rotation for variety
    startRotation: { 
      min: safeValue(-180, -180, -360, 360), 
      max: safeValue(180, 180, -360, 360) 
    },
    // Proper fire colors - orange/red/yellow range
    startColor: {
      min: safeColor(0.8, 0.3, 0.05), // More reddish/orange
      max: safeColor(1.0, 0.6, 0.1),  // Bright orange/yellow
    },
    transform: { rotation: new Vector3(0, 0, 0) },
    // No gravity in the travel effect
    gravity: safeValue(0, 0, -10, 10),
    // Reduced particle count for better performance
    maxParticles: Math.floor(safeValue(500, 500, 50, 2000)),
    emission: { rateOverTime: safeValue(1500, 1500, 100, 5000) },
    // SPHERE shape for emission around the core
    shape: {
      shape: "SPHERE" as Shape,
      sphere: {
        radius: safeValue(0.5, 0.5, 0.1, 2), // Emission radius
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
          { x: safeValue(0, 0, 0, 1), y: safeValue(0, 0, 0, 1), percentage: 0 }, // Start at size 0
          { x: safeValue(0.4, 0.4, 0, 1), y: safeValue(0.6, 0.6, 0, 1) },
          { x: safeValue(0.7, 0.7, 0, 1), y: safeValue(0.9, 0.9, 0, 1) },
          { x: safeValue(1, 1, 0, 1), y: safeValue(1, 1, 0, 1), percentage: 1 }, // End at max size
        ],
        scale: safeValue(1, 1, 0.1, 10),
      },
    },
    // Opacity over lifetime
    opacityOverLifetime: {
      isActive: true,
      lifetimeCurve: {
        type: "BEZIER" as LifeTimeCurve.BEZIER,
        bezierPoints: [
          { x: safeValue(0, 0, 0, 1), y: safeValue(0.5, 0.5, 0, 1), percentage: 0 }, // Start at 50% opacity
          { x: safeValue(0.1, 0.1, 0, 1), y: safeValue(1.0, 1.0, 0, 1) }, // Quickly reach full opacity
          { x: safeValue(0.8, 0.8, 0, 1), y: safeValue(1.0, 1.0, 0, 1) }, // Maintain full opacity for most of life
          { x: safeValue(1, 1, 0, 1), y: safeValue(0.3, 0.3, 0, 1), percentage: 1 }, // Fade at the end for softer look
        ],
        scale: safeValue(1, 1, 0.1, 10),
      },
    },
    rotationOverLifetime: { 
      isActive: true, 
      min: safeValue(-50, -50, -180, 180), 
      max: safeValue(50, 50, -180, 180) 
    },
    // Small amount of noise for more natural movement
    noise: {
      isActive: true,
      useRandomOffset: true,
      strength: safeValue(0.05, 0.05, 0, 1),
      positionAmount: safeValue(0.1, 0.1, 0, 1),
      rotationAmount: safeValue(0.5, 0.5, 0, 1),
      frequency: safeValue(1, 1, 0.1, 10),
      octaves: Math.floor(safeValue(1, 1, 1, 8)),
      sizeAmount: safeValue(0.5, 0.5, 0, 1),
    },
    map: undefined, // Will be set after loading
  };

  // Explosion effect - more violent and faster with validation
  const explosionEffect: ParticleSystemConfig = {
    duration: safeValue(0.5, 0.5, 0.1, 10),
    looping: true,
    startLifetime: { 
      min: safeValue(0.2, 0.2, 0.1, 5), 
      max: safeValue(0.5, 0.5, 0.1, 5) 
    },
    // Much faster outward movement for explosion
    startSpeed: { 
      min: safeValue(5.0, 5.0, 0, 20), 
      max: safeValue(10.0, 10.0, 0, 20) 
    },
    startSize: { 
      min: safeValue(1.0, 1.0, 0.1, 10), 
      max: safeValue(2.5, 2.5, 0.1, 10) 
    },
    startRotation: { 
      min: safeValue(-180, -180, -360, 360), 
      max: safeValue(180, 180, -360, 360) 
    },
    // More intense reddish explosion colors
    startColor: {
      min: safeColor(0.9, 0.2, 0.02), // More red for explosion
      max: safeColor(1.0, 0.7, 0.1),  // Orange/yellow for explosion
    },
    transform: { rotation: new Vector3(0, 0, 0) },
    // Slight rise for explosion
    gravity: safeValue(0.1, 0.1, -10, 10),
    // Fewer particles for performance
    maxParticles: Math.floor(safeValue(400, 400, 50, 2000)),
    emission: { rateOverTime: safeValue(1000, 1000, 100, 5000) },
    // Sphere shape but larger radius for explosion
    shape: {
      shape: "SPHERE" as Shape,
      sphere: {
        radius: safeValue(1.0, 1.0, 0.1, 5), // Larger emission radius
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
          { x: safeValue(0, 0, 0, 1), y: safeValue(0.8, 0.8, 0, 1), percentage: 0 },
          { x: safeValue(0.2, 0.2, 0, 1), y: safeValue(1.0, 1.0, 0, 1) },
          { x: safeValue(0.6, 0.6, 0, 1), y: safeValue(0.9, 0.9, 0, 1) },
          { x: safeValue(1, 1, 0, 1), y: safeValue(0.3, 0.3, 0, 1), percentage: 1 },
        ],
        scale: safeValue(1, 1, 0.1, 10),
      },
    },
    // Start fully opaque, then fade
    opacityOverLifetime: {
      isActive: true,
      lifetimeCurve: {
        type: "BEZIER" as LifeTimeCurve.BEZIER,
        bezierPoints: [
          { x: safeValue(0, 0, 0, 1), y: safeValue(1.0, 1.0, 0, 1), percentage: 0 },
          { x: safeValue(0.4, 0.4, 0, 1), y: safeValue(0.9, 0.9, 0, 1) },
          { x: safeValue(0.7, 0.7, 0, 1), y: safeValue(0.5, 0.5, 0, 1) },
          { x: safeValue(1, 1, 0, 1), y: safeValue(0, 0, 0, 1), percentage: 1 },
        ],
        scale: safeValue(1, 1, 0.1, 10),
      },
    },
    // More rotation for chaos
    rotationOverLifetime: { 
      isActive: true, 
      min: safeValue(-90, -90, -180, 180), 
      max: safeValue(90, 90, -180, 180) 
    },
    // More noise for chaotic explosion
    noise: {
      isActive: true,
      useRandomOffset: true,
      strength: safeValue(0.2, 0.2, 0, 1),
      positionAmount: safeValue(0.3, 0.3, 0, 1),
      rotationAmount: safeValue(0.7, 0.7, 0, 1),
      frequency: safeValue(1.5, 1.5, 0.1, 10),
      octaves: Math.floor(safeValue(2, 2, 1, 8)),
      sizeAmount: safeValue(0.6, 0.6, 0, 1),
    },
    map: undefined, // Will be set after loading
  };

  // Use pre-warmed particle system pool from AssetManager (zero-lag activation!)
  $effect(() => {
    // Only proceed if we have the essentials and haven't initialized yet
    if (!particleRef || !isActive || systemsInitialized) {
      return;
    }
    
    // Get pre-warmed systems from the pool - instant activation!
    if (mode === "travel") {
      // Try to get a pre-warmed fireball system from the pool
      fireballSystem = getParticleSystemFromPool('fireball');
      if (fireballSystem) {
        // Move system from pool container to active fireball container
        if (fireballSystem.parent) {
          fireballSystem.parent.remove(fireballSystem);
        }
        fireballSystem.position.set(0, 0, 0); // Reset position relative to new parent
        fireballSystem.scale.set(1, 1, 1); // Scale to full size (activate)
        particleRef.add(fireballSystem);
        console.log("⚡ Pre-warmed fireball system moved to active container - zero lag!");
      } else {
        console.log("⚠️ Pool empty, creating fireball system asynchronously");
        createParticleSystemAsync('fireball');
        return; // Exit early, async creation will handle the rest
      }
    } else if (mode === "explosion") {
      // Try to get a pre-warmed explosion system from the pool
      explosionSystem = getParticleSystemFromPool('explosion');
      if (explosionSystem) {
        // Move system from pool container to active fireball container
        if (explosionSystem.parent) {
          explosionSystem.parent.remove(explosionSystem);
        }
        explosionSystem.position.set(0, 0, 0); // Reset position relative to new parent
        explosionSystem.scale.set(1, 1, 1); // Scale to full size (activate)
        particleRef.add(explosionSystem);
        console.log("⚡ Pre-warmed explosion system moved to active container - zero lag!");
      } else {
        console.log("⚠️ Pool empty, creating explosion system asynchronously");
        createParticleSystemAsync('explosion');
        return; // Exit early, async creation will handle the rest
      }
    }
    
    // Update GLTF visibility based on mode
    if (gltfRef) {
      gltfRef.visible = mode === "travel";
    }
    
    // Set texture references in config objects for validation checks
    if (preloadedTexture) {
      fireballEffect.map = preloadedTexture;
      explosionEffect.map = preloadedTexture;
    }
    
    systemsInitialized = true;
    updateSystemHealth();
    console.log(`🎯 Pre-warmed particle system activated instantly for ${mode} mode!`);
  });

  // Helper function to get particle system from pool (will be provided via props)
  function getParticleSystemFromPool(type: 'fireball' | 'explosion'): THREE.Object3D | null {
    if (getParticleSystemFromPoolProp) {
      console.log(`🎯 Requesting ${type} system from pool...`);
      return getParticleSystemFromPoolProp(type);
    }
    console.warn('getParticleSystemFromPool prop not provided');
    return null;
  }

  // Helper function to return particle system to pool
  function returnParticleSystemToPool(system: THREE.Object3D, type: 'fireball' | 'explosion'): void {
    if (returnParticleSystemToPoolProp) {
      console.log(`♻️ Returning ${type} system to pool...`);
      returnParticleSystemToPoolProp(system, type);
    } else {
      console.warn('returnParticleSystemToPool prop not provided');
    }
  }

  // Helper function to create system asynchronously if pool is empty
  async function createParticleSystemAsync(type: 'fireball' | 'explosion'): Promise<void> {
    console.log(`⏳ Creating ${type} system asynchronously...`);
    
    if (createParticleSystemAsyncProp) {
      const newSystem = await createParticleSystemAsyncProp(type);
      if (newSystem && particleRef) {
        if (type === 'fireball') {
          fireballSystem = newSystem;
        } else {
          explosionSystem = newSystem;
        }
        newSystem.scale.set(1, 1, 1);
        particleRef.add(newSystem);
        systemsInitialized = true;
        updateSystemHealth();
        console.log(`✅ ${type} system created asynchronously and added`);
      }
    } else {
      console.warn('createParticleSystemAsync prop not provided, falling back to old method');
      // Fallback to old creation method if pool callback is not available
      if (preloadedTexture) {
        fireballEffect.map = preloadedTexture;
        explosionEffect.map = preloadedTexture;
      }
      
      // Final fallback - simple system initialization 
      systemsInitialized = true;
      console.log('⚠️ No pool callbacks available, particle system may not work optimally');
    }
  }

  // Validation function for particle system configurations
  function validateParticleConfig(config: ParticleSystemConfig, configName: string): boolean {
    debugLog(`Validating ${configName} particle configuration`);
    
    try {
      // Check for NaN or invalid values in particle config
      const checks = [
        { name: 'startLifetime.min', value: config.startLifetime.min },
        { name: 'startLifetime.max', value: config.startLifetime.max },
        { name: 'startSpeed.min', value: config.startSpeed.min },
        { name: 'startSpeed.max', value: config.startSpeed.max },
        { name: 'startSize.min', value: config.startSize.min },
        { name: 'startSize.max', value: config.startSize.max },
        { name: 'maxParticles', value: config.maxParticles },
        { name: 'emission.rateOverTime', value: config.emission.rateOverTime },
      ];
      
      for (const check of checks) {
        if (!isFinite(check.value) || isNaN(check.value) || check.value < 0) {
          const errorMsg = `Invalid ${configName} config - ${check.name}: ${check.value}`;
          trackError(errorMsg, 'validation');
          return false;
        }
      }
      
      // Validate shape configuration
      if (config.shape?.sphere?.radius && (!isFinite(config.shape.sphere.radius) || isNaN(config.shape.sphere.radius))) {
        const errorMsg = `Invalid ${configName} config - sphere radius: ${config.shape.sphere.radius}`;
        trackError(errorMsg, 'validation');
        return false;
      }
      
      debugLog(`${configName} particle configuration is valid`);
      return true;
    } catch (error) {
      trackError(`Error validating ${configName} config: ${error}`, 'validation');
      return false;
    }
  }

  // Smart validation function that only runs when needed
  function validateParticleSystemSmart(system: THREE.Object3D | undefined, systemName: string, forceValidation = false): boolean {
    if (!system) {
      return false; // Don't log warnings for inactive systems
    }
    
    // Check if system is active (scale > 0.1 means it's visible)
    const isActive = system.scale.x > 0.1 || system.scale.y > 0.1 || system.scale.z > 0.1;
    
    // Only validate active systems or when forced
    if (!isActive && !forceValidation) {
      return true; // Consider inactive systems as "valid" to avoid unnecessary work
    }
    
    // Rate limiting - only validate once per second unless forced
    const now = Date.now();
    if (!forceValidation && (now - lastValidationTime) < VALIDATION_INTERVAL) {
      return true; // Skip validation if too recent
    }
    
    try {
      let hasValidGeometry = false;
      let totalPositions = 0;
      let fixedCount = 0;
      
      // Check if the system has valid geometry
      system.traverse((child) => {
        if (child instanceof THREE.Points && child.geometry) {
          const geometry = child.geometry as THREE.BufferGeometry;
          const positionAttribute = geometry.getAttribute('position');
          
          if (positionAttribute && positionAttribute.array) {
            const positions = positionAttribute.array;
            totalPositions = positions.length;
            hasValidGeometry = true;
            
            // Sample check for NaN values first (performance optimization)
            let sampleHasNaN = false;
            const sampleSize = Math.min(positions.length, 50);
            for (let i = 0; i < sampleSize; i += 3) { // Check every 3rd position (x, y, z)
              if (!isFinite(positions[i]) || isNaN(positions[i])) {
                sampleHasNaN = true;
                break;
              }
            }
            
            // Only do full check if sample found issues
            if (sampleHasNaN) {
              let hasInvalidPositions = false;
              
              // Check ALL positions for NaN values and fix them
              for (let i = 0; i < positions.length; i++) {
                if (!isFinite(positions[i]) || isNaN(positions[i])) {
                  positions[i] = 0; // Replace NaN with 0
                  hasInvalidPositions = true;
                  fixedCount++;
                }
              }
              
              if (hasInvalidPositions) {
                console.warn(`⚠️ Fixed ${fixedCount} invalid positions in ${systemName} (active: ${isActive})`);
                validationFixCount += fixedCount;
                positionAttribute.needsUpdate = true;
                
                // Force bounding sphere recalculation with valid values
                geometry.computeBoundingSphere();
                
                // Verify the bounding sphere is now valid
                if (geometry.boundingSphere && (!isFinite(geometry.boundingSphere.radius) || isNaN(geometry.boundingSphere.radius))) {
                  console.warn(`⚠️ Manually setting bounding sphere for ${systemName}`);
                  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 10);
                }
                
                // If we're fixing too many positions, suggest recreation
                if (fixedCount > 100) {
                  console.warn(`⚠️ ${systemName} has too many invalid positions (${fixedCount}), consider recreation`);
                  trackError(`Too many invalid positions in ${systemName}: ${fixedCount}`, 'validation');
                }
              }
            }
          }
        }
      });
      
      // Update last validation time
      lastValidationTime = now;
      
      if (hasValidGeometry) {
        if (fixedCount > 0) {
          console.log(`🔧 ${systemName} validation fixed ${fixedCount} positions (active: ${isActive})`);
        } else {
          debugLog(`${systemName} validation passed - no fixes needed (active: ${isActive})`);
        }
        return true;
      } else {
        debugLog(`${systemName} has no valid geometry`, undefined, 'warn');
        return false;
      }
    } catch (error) {
      trackError(`Error validating ${systemName} system: ${error}`, 'validation');
      return false;
    }
  }

  // Async particle system creation - only create what's needed without blocking
  async function initParticleSystemsAsync(group: THREE.Group): Promise<void> {
    if (!group || !isActive || systemsInitialized || !fireballEffect.map) {
      console.log(`⚠️ Skipping particle system init: group=${!!group}, isActive=${isActive}, systemsInitialized=${systemsInitialized}, hasTexture=${!!fireballEffect.map}`);
      return;
    }

    try {
      console.log(`🚀 Initializing particle systems asynchronously (mode: ${mode})`);
      
      // Initialize cycleData with safe values
      const now = Date.now();
      if (!isFinite(now) || isNaN(now)) {
        console.error("❌ Invalid timestamp for cycleData initialization");
        return;
      }
      cycleData.now = now;

      // Only create the system needed for current mode
      if (mode === "travel") {
        // Validate fireball configuration
        if (!validateParticleConfig(fireballEffect, "fireball")) {
          trackError("Fireball configuration validation failed, aborting initialization", 'validation');
          return;
        }
        
        // Create only fireball system asynchronously
        debugLog("Creating fireball particle system asynchronously (travel mode)");
        fireballSystem = await createSingleParticleSystemAsync(group, fireballEffect, "fireball", 1);
      } else if (mode === "explosion") {
        // Validate explosion configuration  
        if (!validateParticleConfig(explosionEffect, "explosion")) {
          trackError("Explosion configuration validation failed, aborting initialization", 'validation');
          return;
        }
        
        // Create only explosion system asynchronously
        debugLog("Creating explosion particle system asynchronously (explosion mode)");
        explosionSystem = await createSingleParticleSystemAsync(group, explosionEffect, "explosion", 1);
      }

      // Update GLTF visibility based on mode
      if (gltfRef) {
        gltfRef.visible = mode === "travel";
      }

      // Mark as initialized if we successfully created the needed system
      if ((mode === "travel" && fireballSystem) || (mode === "explosion" && explosionSystem)) {
        systemsInitialized = true;
        updateSystemHealth();
        debugLog(`Particle system initialized asynchronously for ${mode} mode`);
      } else {
        trackError(`Failed to create particle system for ${mode} mode`, 'system');
      }
    } catch (error) {
      trackError(`Failed to initialize particle systems: ${error}`, 'system');
      systemsInitialized = false;
      // Cleanup on error
      if (fireballSystem) {
        try { group.remove(fireballSystem); } catch (e) { debugLog("Error removing fireball system:", e, 'warn'); }
        fireballSystem = undefined;
      }
      if (explosionSystem) {
        try { group.remove(explosionSystem); } catch (e) { debugLog("Error removing explosion system:", e, 'warn'); }
        explosionSystem = undefined;
      }
    }
  }

  // Async helper function to create a single particle system without blocking
  async function createSingleParticleSystemAsync(
    group: THREE.Group, 
    config: ParticleSystemConfig, 
    systemName: string, 
    scale: number
  ): Promise<THREE.Object3D | undefined> {
    try {
      debugLog(`Starting async creation of ${systemName} system`);
      
      // Use requestIdleCallback for non-blocking creation
      const result = await new Promise<any>((resolve) => {
        const createAsync = () => {
          try {
            const particleResult = createParticleSystem(config as any, cycleData.now);
            resolve(particleResult);
          } catch (error) {
            console.error(`Error in async particle creation: ${error}`);
            resolve(null);
          }
        };
        
        // Use requestIdleCallback with fallback
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(createAsync, { timeout: 50 });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(createAsync, 0);
        }
      });
      
      if (result && result.instance) {
        // Skip heavy validation during creation for performance
        if (isFinite(scale) && !isNaN(scale)) {
          result.instance.scale.set(scale, scale, scale);
          group.add(result.instance);
          trackSuccess('systemCreate');
          debugLog(`${systemName} system created asynchronously with scale: ${scale}`);
          
          // Defer validation to next frame to avoid blocking
          setTimeout(() => {
            validateParticleSystemSmart(result.instance, `${systemName}-deferred`, false);
          }, 0);
          
          return result.instance;
        } else {
          trackError(`Invalid scale value for ${systemName} system: ${scale}`, 'system');
        }
      } else {
        trackError(`Failed to create ${systemName} particle system`, 'system');
      }
    } catch (error) {
      trackError(`Exception creating ${systemName} system: ${error}`, 'system');
    }
    
    return undefined;
  }

  // Synchronous fallback for immediate creation when needed
  function createSingleParticleSystemSync(
    group: THREE.Group, 
    config: ParticleSystemConfig, 
    systemName: string, 
    scale: number
  ): THREE.Object3D | undefined {
    try {
      const result = createParticleSystem(config as any, cycleData.now);
      
      if (result && result.instance) {
        if (isFinite(scale) && !isNaN(scale)) {
          result.instance.scale.set(scale, scale, scale);
          group.add(result.instance);
          trackSuccess('systemCreate');
          debugLog(`${systemName} system created synchronously with scale: ${scale}`);
          return result.instance;
        } else {
          trackError(`Invalid scale value for ${systemName} system: ${scale}`, 'system');
        }
      } else {
        trackError(`Failed to create ${systemName} particle system`, 'system');
      }
    } catch (error) {
      trackError(`Exception creating ${systemName} system: ${error}`, 'system');
    }
    
    return undefined;
  }

  // Safe particle system update with validation
  function updateParticleSystemsSafely(): void {
    try {
      // Validate cycle data before updating
      const now = Date.now();
      if (!isFinite(now) || isNaN(now)) {
        console.error("❌ Invalid timestamp in updateParticleSystemsSafely");
        return;
      }
      
      const rawDelta = clock.getDelta();
      if (!isFinite(rawDelta) || isNaN(rawDelta) || rawDelta < 0) {
        console.warn(`⚠️ Invalid delta time: ${rawDelta}, skipping particle update`);
        return;
      }
      
      // Update cycle data with validated values
      cycleData.now = now - cycleData.totalPauseTime;
      cycleData.delta = rawDelta > 0.1 ? 0.1 : rawDelta; // Cap delta to prevent huge jumps
      cycleData.elapsed = clock.getElapsedTime();
      
      // Validate cycle data values
      if (!isFinite(cycleData.now) || !isFinite(cycleData.delta) || !isFinite(cycleData.elapsed)) {
        console.error(`❌ Invalid cycle data: now=${cycleData.now}, delta=${cycleData.delta}, elapsed=${cycleData.elapsed}`);
        return;
      }
      
      // Only update particle systems if at least one is active (visible)
      const fireballActive = fireballSystem && fireballSystem.scale.x > 0.1;
      const explosionActive = explosionSystem && explosionSystem.scale.x > 0.1;
      
      if (fireballActive || explosionActive) {
        try {
          updateParticleSystems(cycleData);
        } catch (updateError) {
          console.error(`❌ Error during particle system update: ${updateError}`);
          // Try to fix any invalid geometries after the failed update (force validation)
          if (fireballSystem) {
            validateParticleSystemSmart(fireballSystem, "fireball-error-recovery", true);
          }
          if (explosionSystem) {
            validateParticleSystemSmart(explosionSystem, "explosion-error-recovery", true);
          }
        }
        
        // Smart validation - only validate active systems and respect rate limiting
        if (fireballSystem) {
          validateParticleSystemSmart(fireballSystem, "fireball");
        }
        if (explosionSystem) {
          validateParticleSystemSmart(explosionSystem, "explosion");
        }
      }
    } catch (error) {
      console.error("❌ Error in updateParticleSystemsSafely:", error);
      // Don't propagate the error to avoid breaking the entire animation loop
    }
  }

  // Safe scale setting with validation - handles off-screen positioning
  function setSystemScaleSafely(system: THREE.Object3D | undefined, scale: number, systemName: string): void {
    if (!system) {
      console.warn(`⚠️ Cannot set scale on undefined ${systemName} system`);
      return;
    }
    
    if (!isFinite(scale) || isNaN(scale)) {
      console.error(`❌ Invalid scale value for ${systemName}: ${scale}`);
      return;
    }
    
    try {
      if (scale === 0) {
        // When scaling to 0, keep it in current position but invisible
        system.scale.set(0, 0, 0);
      } else {
        // When scaling to 1, ensure it's at the correct position (0,0,0 relative to parent)
        system.position.set(0, 0, 0);
        system.scale.set(scale, scale, scale);
      }
    } catch (error) {
      console.error(`❌ Error setting scale for ${systemName}:`, error);
    }
  }

  // Update the particle system and GLTF model based on mode with enhanced safety
  useTask((delta: number) => {
    if (!isActive || !systemsInitialized) return;
    
    // Validate delta parameter
    if (!isFinite(delta) || isNaN(delta) || delta < 0) {
      console.warn(`⚠️ Invalid useTask delta: ${delta}, skipping frame`);
      return;
    }

    // Additional safety check - ensure we have textures OR pre-created particle systems
    const hasTextures = (fireballEffect.map && explosionEffect.map) || 
                       (preloadedFireballParticles && preloadedExplosionParticles);
    if (!hasTextures) {
      console.warn(`⚠️ Particle systems not ready - missing textures`);
      return;
    }

    const isExplosionMode = mode === "explosion";

    // Lazy creation: create systems on-demand when mode changes (async)
    if (isExplosionMode && !explosionSystem && particleRef) {
      // Need explosion system but don't have it - create it asynchronously
      if (validateParticleConfig(explosionEffect, "explosion")) {
        debugLog("Lazy creating explosion particle system asynchronously");
        createSingleParticleSystemAsync(particleRef, explosionEffect, "explosion", 1).then(system => {
          explosionSystem = system;
        });
      }
    }
    
    if (!isExplosionMode && !fireballSystem && particleRef) {
      // Need fireball system but don't have it - create it asynchronously
      if (validateParticleConfig(fireballEffect, "fireball")) {
        debugLog("Lazy creating fireball particle system asynchronously");
        createSingleParticleSystemAsync(particleRef, fireballEffect, "fireball", 1).then(system => {
          fireballSystem = system;
        });
      }
    }

    // Toggle systems using scale based on what we have
    if (isExplosionMode) {
      // Show explosion, hide fireball (if it exists)
      if (explosionSystem) {
        setSystemScaleSafely(explosionSystem, 1, "explosion");
      }
      if (fireballSystem) {
        setSystemScaleSafely(fireballSystem, 0, "fireball");
      }
    } else {
      // Show fireball, hide explosion (if it exists)
      if (fireballSystem) {
        setSystemScaleSafely(fireballSystem, 1, "fireball");
      }
      if (explosionSystem) {
        setSystemScaleSafely(explosionSystem, 0, "explosion");
      }
    }

    // If we have no systems and haven't initialized, try to initialize
    if (!fireballSystem && !explosionSystem && particleRef && !systemsInitialized) {
      console.log("♾️ No systems available, attempting to initialize asynchronously");
      initParticleSystemsAsync(particleRef);
    }

    // Update GLTF visibility
    if (gltfRef) {
      gltfRef.visible = !isExplosionMode;
    }

    // Update particle systems safely
    updateParticleSystemsSafely();

    // Update GLTF animations with validation
    if (mixer && isFinite(delta) && !isNaN(delta)) {
      try {
        mixer.update(delta);
      } catch (error) {
        console.error("❌ Error updating GLTF mixer:", error);
      }
    }
  });

  // Enhanced cleanup with proper disposal and validation
  function cleanup(): void {
    console.log("🧽 Starting FireAnimation cleanup");
    isActive = false;
    systemsInitialized = false;

    if (particleRef) {
      // Return fireball system to off-screen pool instead of disposing
      if (fireballSystem) {
        try {
          console.log("📄 Returning fireball system to off-screen pool");
          
          // Remove from current parent
          particleRef.remove(fireballSystem);
          
          // Return to pool - will be moved back to pool container
          returnParticleSystemToPool(fireballSystem, 'fireball');
          
          // Move system back to pool container
          if (particlePoolContainer && fireballSystem) {
            fireballSystem.position.set(Math.random() * 100, 0, 0); // Spread out in pool
            fireballSystem.scale.set(0, 0, 0); // Scale to 0
            particlePoolContainer.add(fireballSystem);
          }
          
          console.log("✅ Fireball system returned to off-screen pool");
        } catch (error) {
          console.error("❌ Error returning fireball system to pool:", error);
        } finally {
          fireballSystem = undefined;
        }
      }

      // Return explosion system to off-screen pool instead of disposing
      if (explosionSystem) {
        try {
          console.log("📄 Returning explosion system to off-screen pool");
          
          // Remove from current parent
          particleRef.remove(explosionSystem);
          
          // Return to pool - will be moved back to pool container
          returnParticleSystemToPool(explosionSystem, 'explosion');
          
          // Move system back to pool container
          if (particlePoolContainer && explosionSystem) {
            explosionSystem.position.set(Math.random() * 100, 0, 0); // Spread out in pool
            explosionSystem.scale.set(0, 0, 0); // Scale to 0
            particlePoolContainer.add(explosionSystem);
          }
          
          console.log("✅ Explosion system returned to off-screen pool");
        } catch (error) {
          console.error("❌ Error returning explosion system to pool:", error);
        } finally {
          explosionSystem = undefined;
        }
      }
    }
    
    // Don't dispose preloaded textures - they're managed by AssetManager
    // Just reset references
    fireballEffect.map = undefined;
    explosionEffect.map = undefined;
    
    console.log("✅ FireAnimation cleanup completed");
  }
  
  // Force cleanup and reinitialize if needed
  function forceReinitialize(): void {
    console.log("🔄 Force reinitializing particle systems");
    
    // Clean up existing systems
    if (systemsInitialized) {
      cleanup();
    }
    
    // Reset state
    systemsInitialized = false;
    
    // Reinitialize if conditions are met
    if (particleRef && isActive && (preloadedTexture || fireballEffect.map)) {
      // Restore texture references if using preloaded texture
      if (preloadedTexture) {
        fireballEffect.map = preloadedTexture;
        explosionEffect.map = preloadedTexture;
      }
      
      // Initialize with a small delay to ensure cleanup is complete
      setTimeout(() => {
        if (isActive && particleRef) {
          initParticleSystemsAsync(particleRef);
        }
      }, 100);
    }
  }

  // Enhanced monitoring and debugging
  let debugStats = $state({
    particleSystemsCreated: 0,
    particleSystemsDestroyed: 0,
    textureLoadsSucceeded: 0,
    textureLoadsFailed: 0,
    validationErrors: 0,
    lastValidationError: '',
    lastError: '',
    systemHealth: 'unknown' as 'healthy' | 'warning' | 'error' | 'unknown'
  });

  // Validation throttling
  let lastValidationTime = 0;
  const VALIDATION_INTERVAL = 1000; // Only validate once per second
  let validationFixCount = 0;

  // Debug logging function with rate limiting
  let lastDebugLog = 0;
  function debugLog(message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info'): void {
    const now = Date.now();
    if (now - lastDebugLog < 100) return; // Rate limit debug logs
    lastDebugLog = now;
    
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📊';
    if (data) {
      console[level](`${prefix} [FireAnimation] ${message}`, data);
    } else {
      console[level](`${prefix} [FireAnimation] ${message}`);
    }
  }

  // System health monitoring
  function updateSystemHealth(): void {
    if (!isActive) {
      debugStats.systemHealth = 'unknown';
      return;
    }
    
    if (debugStats.validationErrors > 5 || debugStats.lastError) {
      debugStats.systemHealth = 'error';
    } else if (!systemsInitialized || debugStats.validationErrors > 0) {
      debugStats.systemHealth = 'warning';
    } else if (systemsInitialized && fireballSystem && explosionSystem) {
      debugStats.systemHealth = 'healthy';
    } else {
      debugStats.systemHealth = 'unknown';
    }
  }

  // Error tracking function
  function trackError(error: string, category: 'validation' | 'texture' | 'system' | 'general'): void {
    debugStats.lastError = error;
    if (category === 'validation') {
      debugStats.validationErrors++;
      debugStats.lastValidationError = error;
    }
    updateSystemHealth();
    debugLog(`Error tracked: ${error}`, { category, health: debugStats.systemHealth }, 'error');
  }

  // Success tracking function
  function trackSuccess(event: 'textureLoad' | 'systemCreate' | 'systemDestroy'): void {
    switch (event) {
      case 'textureLoad':
        debugStats.textureLoadsSucceeded++;
        break;
      case 'systemCreate':
        debugStats.particleSystemsCreated++;
        break;
      case 'systemDestroy':
        debugStats.particleSystemsDestroyed++;
        break;
    }
    updateSystemHealth();
    debugLog(`Success tracked: ${event}`, { stats: debugStats });
  }

  // Helper function to safely check if a model/texture is available
  function isModelAvailable(): boolean {
    try {
      // Check if we have a pre-loaded model
      if (preloadedModel && preloadedModel.nodes && preloadedModel.materials) {
        debugLog('Using preloaded model');
        return true;
      }

      // Check if gltf is loaded
      if ($gltf && $gltf.nodes && $gltf.materials) {
        debugLog('Using loaded GLTF model');
        return true;
      }

      debugLog('No model available yet', { preloadedModel: !!preloadedModel, gltf: !!$gltf });
      return false;
    } catch (error) {
      trackError(`Error checking model availability: ${error}`, 'general');
      return false;
    }
  }

  // Periodic system health check
  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (isActive) {
        updateSystemHealth();
        
        // Log health status periodically (every 30 seconds) if there are issues
        if (debugStats.systemHealth !== 'healthy') {
          debugLog(`System health check`, {
            health: debugStats.systemHealth,
            stats: debugStats,
            systemsInitialized,
            hasFireball: !!fireballSystem,
            hasExplosion: !!explosionSystem,
            mode
          }, debugStats.systemHealth === 'error' ? 'error' : 'warn');
        }
      }
    }, 30000); // Every 30 seconds
  }

  // Clean up particle systems when component is destroyed
  onDestroy(() => {
    console.log('🧹 FireAnimation onDestroy - cleaning up particle systems');
    cleanup();
  });
</script>

<T is={ref} dispose={false} {...props}>
  <!-- Particle effects container -->
  <T.Group bind:ref={particleRef} ondestroy={cleanup}>
    <!-- This group will contain the particle system -->
  </T.Group>

  <!-- GLTF Fire Animation Model - only visible during travel mode -->
  {#if isModelAvailable()}
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
              {#if preloadedModel?.nodes?.flame01_phong2_0?.geometry || $gltf?.nodes?.flame01_phong2_0?.geometry}
                <T.Group name="flame01">
                  <T.Mesh
                    name="flame01_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame01_phong2_0
                      ?.geometry || $gltf?.nodes?.flame01_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame02">
                  <T.Mesh
                    name="flame02_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame02_phong2_0
                      ?.geometry || $gltf?.nodes?.flame02_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame03">
                  <T.Mesh
                    name="flame03_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame03_phong2_0
                      ?.geometry || $gltf?.nodes?.flame03_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame04">
                  <T.Mesh
                    name="flame04_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame04_phong2_0
                      ?.geometry || $gltf?.nodes?.flame04_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame05">
                  <T.Mesh
                    name="flame05_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame05_phong2_0
                      ?.geometry || $gltf?.nodes?.flame05_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame06">
                  <T.Mesh
                    name="flame06_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame06_phong2_0
                      ?.geometry || $gltf?.nodes?.flame06_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame07" scale={[1, 1, 1.06]}>
                  <T.Mesh
                    name="flame07_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame07_phong2_0
                      ?.geometry || $gltf?.nodes?.flame07_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame08" scale={[1, 1, 1.12]}>
                  <T.Mesh
                    name="flame08_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame08_phong2_0
                      ?.geometry || $gltf?.nodes?.flame08_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame09" scale={[1, 1, 1.14]}>
                  <T.Mesh
                    name="flame09_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame09_phong2_0
                      ?.geometry || $gltf?.nodes?.flame09_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame10">
                  <T.Mesh
                    name="flame10_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame10_phong2_0
                      ?.geometry || $gltf?.nodes?.flame10_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame11">
                  <T.Mesh
                    name="flame11_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame11_phong2_0
                      ?.geometry || $gltf?.nodes?.flame11_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame12">
                  <T.Mesh
                    name="flame12_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame12_phong2_0
                      ?.geometry || $gltf?.nodes?.flame12_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame13">
                  <T.Mesh
                    name="flame13_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame13_phong2_0
                      ?.geometry || $gltf?.nodes?.flame13_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame14">
                  <T.Mesh
                    name="flame14_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame14_phong2_0
                      ?.geometry || $gltf?.nodes?.flame14_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame16">
                  <T.Mesh
                    name="flame16_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame16_phong2_0
                      ?.geometry || $gltf?.nodes?.flame16_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame15">
                  <T.Mesh
                    name="flame15_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame15_phong2_0
                      ?.geometry || $gltf?.nodes?.flame15_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
                <T.Group name="flame17">
                  <T.Mesh
                    name="flame17_phong2_0"
                    castShadow
                    receiveShadow
                    geometry={preloadedModel?.nodes?.flame17_phong2_0
                      ?.geometry || $gltf?.nodes?.flame17_phong2_0?.geometry}
                    material={preloadedModel?.materials?.phong2 ||
                      $gltf?.materials?.phong2}
                  />
                </T.Group>
              {/if}
            </T.Group>
          </T.Group>
        </T.Group>
      </T.Group>
    </T.Group>
  {/if}

  {@render children?.({ ref })}
</T>
