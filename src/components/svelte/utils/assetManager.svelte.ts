import * as THREE from 'three';
import { useGltf, useDraco } from '@threlte/extras';
import { AudioLoader, TextureLoader } from 'three';
import type { FireballGLTFResult } from '~/types/fireballTypes';
import {
  createParticleSystem,
  type ParticleSystemConfig,
  type Shape,
  type LifeTimeCurve,
} from '@newkrok/three-particles';

/**
 * AssetManager - Centralized asset loading and management
 */

export interface PreloadedAssets {
  fireModel?: FireballGLTFResult;
  fireTexture?: THREE.Texture;
  fireballSound?: AudioBuffer;
  crateModel?: any;
  dragonModel?: any;
  fireballParticleSystem?: THREE.Object3D;
  explosionParticleSystem?: THREE.Object3D;
}

export interface ParticleSystemPool {
  fireballSystems: {
    available: THREE.Object3D[];
    active: Set<THREE.Object3D>;
  };
  explosionSystems: {
    available: THREE.Object3D[];
    active: Set<THREE.Object3D>;
  };
}

export interface LoadingState {
  loading: boolean;
  progress: number;
  message: string;
  errors: string[];
}

export interface AssetLoadingStep {
  name: string;
  loaded: boolean;
  error?: string;
}

export class AssetManager {
  private assets: PreloadedAssets = {};
  private particlePool: ParticleSystemPool = {
    fireballSystems: {
      available: [],
      active: new Set()
    },
    explosionSystems: {
      available: [],
      active: new Set()
    }
  };
  private loadingSteps: Record<string, AssetLoadingStep> = {};
  private loadingState: LoadingState = {
    loading: false,
    progress: 0,
    message: 'Ready',
    errors: []
  };

  private onStateChange?: (state: LoadingState) => void;

  constructor(onStateChange?: (state: LoadingState) => void) {
    this.onStateChange = onStateChange;
  }

  /**
   * Initialize loading steps
   */
  private initializeSteps(): void {
    this.loadingSteps = {
      fireAssets: { name: 'Interactive Elements', loaded: false },
      dragon: { name: 'Dragon Model', loaded: false },
      ground: { name: 'Scene Environment', loaded: false },
      scene: { name: 'Final Setup', loaded: false }
    };
  }

  /**
   * Update loading progress and notify listeners
   */
  private updateProgress(): void {
    const steps = Object.values(this.loadingSteps);
    const completedSteps = steps.filter(step => step.loaded).length;
    const progress = (completedSteps / steps.length) * 100;
    
    this.loadingState.progress = progress;
    
    if (this.onStateChange) {
      this.onStateChange({ ...this.loadingState });
    }
    
    if (progress === 100) {
      this.loadingState.message = 'Welcome to my portfolio!';
      this.loadingState.loading = false;
      
      // Complete loading immediately without delay
      if (this.onStateChange) {
        this.onStateChange({ ...this.loadingState });
      }
    }
  }

  /**
   * Mark a loading step as completed
   */
  completeStep(stepName: string, message?: string): void {
    if (this.loadingSteps[stepName]) {
      this.loadingSteps[stepName].loaded = true;
      if (message) {
        this.loadingState.message = message;
      }
      this.updateProgress();
    }
  }

  /**
   * Mark a loading step as failed
   */
  failStep(stepName: string, error: string): void {
    if (this.loadingSteps[stepName]) {
      this.loadingSteps[stepName].error = error;
      this.loadingSteps[stepName].loaded = true; // Still mark as "done" to prevent hanging
      this.loadingState.errors.push(error);
      this.updateProgress();
    }
  }

  /**
   * Start the loading process
   */
  startLoading(): void {
    this.initializeSteps();
    this.loadingState.loading = true;
    this.loadingState.progress = 0;
    this.loadingState.message = 'Initializing portfolio...';
    this.loadingState.errors = [];
    
    if (this.onStateChange) {
      this.onStateChange({ ...this.loadingState });
    }
  }

  /**
   * Preload fire-related assets (GLTF, texture, sound)
   */
  async preloadFireAssets(): Promise<void> {
    this.loadingState.message = 'Loading interactive elements...';
    
    try {
      // Load GLTF model
      const gltfPromise = useGltf<FireballGLTFResult>(
        '/models/fire_animation-transformed.glb',
        { dracoLoader: useDraco() }
      );
      
      // Load texture
      const texturePromise = new Promise<THREE.Texture>((resolve, reject) => {
        new TextureLoader().load(
          '/textures/flame.webp',
          (texture) => {
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            resolve(texture);
          },
          undefined,
          reject
        );
      });
      
      // Load sound
      const soundPromise = new Promise<AudioBuffer>((resolve, reject) => {
        new AudioLoader().load(
          '/sounds/Fireball.wav',
          resolve,
          undefined,
          (error) => {
            console.warn('Could not load fireball sound:', error);
            reject(error);
          }
        );
      });
      
      // Wait for all assets
      const [fireModel, fireTexture, fireballSound] = await Promise.all([
        gltfPromise, texturePromise, soundPromise
      ]);
      
      // Store results
      this.assets.fireModel = fireModel;
      this.assets.fireTexture = fireTexture;
      this.assets.fireballSound = fireballSound;
      
      // Create and pre-warm particle systems now that we have the texture
      await this.preloadParticleSystems();
      
      this.completeStep('fireAssets', 'Interactive elements loaded');
      
    } catch (error) {
      console.error('Failed to preload fire assets:', error);
      this.failStep('fireAssets', `Failed to load interactive elements: ${error}`);
    }
  }

  /**
   * Preload crate explosion model
   */
  async preloadCrateModel(): Promise<void> {
    try {
      const crateModel = await useGltf('/models/CrateExplode-transformed.glb', {
        dracoLoader: useDraco()
      });
      
      this.assets.crateModel = crateModel;
      
    } catch (error) {
      console.error('Failed to preload crate model:', error);
    }
  }

  /**
   * Preload dragon model
   */
  async preloadDragonModel(): Promise<void> {
    try {
      const dragonModel = await useGltf('/models/Dragon-transformed.glb', {
        dracoLoader: useDraco()
      });
      
      this.assets.dragonModel = dragonModel;
      this.completeStep('dragon', 'Dragon awakened');
      
    } catch (error) {
      console.error('Failed to preload dragon model:', error);
      this.failStep('dragon', `Failed to load dragon: ${error}`);
    }
  }

  /**
   * Create particle systems on-demand (lazy loading for better startup performance)
   */
  async createParticleSystemsOnDemand(): Promise<void> {
    // If particle systems already exist, don't recreate them
    if (this.assets.fireballParticleSystem && this.assets.explosionParticleSystem) {
      return;
    }
    
    await this.preloadParticleSystems();
  }

  /**
   * Pre-warm the particle system pool with off-screen systems
   * These systems will be added to the scene graph to receive updates
   */
  async preWarmParticlePool(poolSize: number = 5): Promise<void> {
    if (!this.assets.fireTexture) {
      console.warn('Fire texture not loaded yet, skipping pool pre-warming');
      return;
    }

    console.log(`🔥 Pre-warming particle pool with ${poolSize} systems of each type...`);
    
    const now = Date.now();
    
    try {
      // Create fireball systems pool
      for (let i = 0; i < poolSize; i++) {
        const fireballConfig = this.createFireballConfig();
        fireballConfig.map = this.assets.fireTexture;
        
        const fireballResult = createParticleSystem(fireballConfig as any, now + i);
        if (fireballResult?.instance) {
          // Systems will be positioned off-screen when added to pool container
          // Initial scale set to 0 (invisible but ready)
          fireballResult.instance.scale.set(0, 0, 0);
          fireballResult.instance.visible = true; // Keep visible but scaled to 0
          
          this.particlePool.fireballSystems.available.push(fireballResult.instance);
        }
      }
      
      // Create explosion systems pool
      for (let i = 0; i < poolSize; i++) {
        const explosionConfig = this.createExplosionConfig();
        explosionConfig.map = this.assets.fireTexture;
        
        const explosionResult = createParticleSystem(explosionConfig as any, now + poolSize + i);
        if (explosionResult?.instance) {
          // Systems will be positioned off-screen when added to pool container
          // Initial scale set to 0 (invisible but ready)
          explosionResult.instance.scale.set(0, 0, 0);
          explosionResult.instance.visible = true; // Keep visible but scaled to 0
          
          this.particlePool.explosionSystems.available.push(explosionResult.instance);
        }
      }
      
      console.log(`✅ Pool pre-warmed: ${this.particlePool.fireballSystems.available.length} fireball, ${this.particlePool.explosionSystems.available.length} explosion systems`);
      
    } catch (error) {
      console.error('Failed to pre-warm particle pool:', error);
    }
  }
  
  /**
   * Get all pre-warmed particle systems for adding to scene graph
   */
  getAllPrewarmedSystems(): THREE.Object3D[] {
    return [
      ...this.particlePool.fireballSystems.available,
      ...this.particlePool.explosionSystems.available
    ];
  }

  /**
   * Preload particle systems for fireballs and explosions (optimized for on-demand creation)
   */
  async preloadParticleSystems(): Promise<void> {
    try {
      if (!this.assets.fireTexture) {
        console.warn('Fire texture not loaded yet, skipping particle system creation');
        return;
      }

      console.log('🔥 Creating particle systems during asset loading...');
      
      // Helper function to create safe values (copied from FireAnimation)
      const safeValue = (value: number, fallback: number, min: number, max: number): number => {
        if (!isFinite(value) || isNaN(value)) {
          return fallback;
        }
        if (value < min) {
          return min;
        }
        if (value > max) {
          return max;
        }
        return value;
      };

      // Helper function to create safe color values
      const safeColor = (r: number, g: number, b: number) => {
        return {
          r: safeValue(r, 1.0, 0, 1),
          g: safeValue(g, 1.0, 0, 1),
          b: safeValue(b, 1.0, 0, 1),
        };
      };

      const now = Date.now();

      // Fireball particle configuration
      const fireballConfig: ParticleSystemConfig = {
        duration: safeValue(0.5, 0.5, 0.1, 10),
        looping: true,
        startLifetime: { 
          min: safeValue(0.6, 0.6, 0.1, 5), 
          max: safeValue(0.7, 0.7, 0.1, 5) 
        },
        startSpeed: { 
          min: safeValue(0.9, 0.9, 0, 10), 
          max: safeValue(1.1, 1.1, 0, 10) 
        },
        startSize: { 
          min: safeValue(0.8, 0.8, 0.1, 5), 
          max: safeValue(1.2, 1.2, 0.1, 5) 
        },
        startRotation: { 
          min: safeValue(-180, -180, -360, 360), 
          max: safeValue(180, 180, -360, 360) 
        },
        startColor: {
          min: safeColor(0.8, 0.3, 0.05),
          max: safeColor(1.0, 0.6, 0.1),
        },
        transform: { rotation: new THREE.Vector3(0, 0, 0) },
        gravity: safeValue(0, 0, -10, 10),
        maxParticles: Math.floor(safeValue(150, 150, 50, 2000)), // Reduced from 500 for faster startup
        emission: { rateOverTime: safeValue(800, 800, 100, 5000) }, // Reduced from 1500
        shape: {
          shape: "SPHERE" as Shape,
          sphere: {
            radius: safeValue(0.2, 0.2, 0.1, 2),
          },
        },
        renderer: {
          blending: THREE.AdditiveBlending,
          discardBackgroundColor: false,
          backgroundColorTolerance: 0,
          backgroundColor: new THREE.Color(0, 0, 0),
          transparent: true,
          depthTest: true,
          depthWrite: false,
        },
        map: this.assets.fireTexture
      };

      // Explosion particle configuration
      const explosionConfig: ParticleSystemConfig = {
        duration: safeValue(0.5, 0.5, 0.1, 10),
        looping: true,
        startLifetime: { 
          min: safeValue(0.2, 0.2, 0.1, 5), 
          max: safeValue(0.5, 0.5, 0.1, 5) 
        },
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
        startColor: {
          min: safeColor(0.9, 0.2, 0.02),
          max: safeColor(1.0, 0.7, 0.1),
        },
        transform: { rotation: new THREE.Vector3(0, 0, 0) },
        gravity: safeValue(0.1, 0.1, -10, 10),
        maxParticles: Math.floor(safeValue(120, 120, 50, 2000)), // Reduced from 400 for faster startup
        emission: { rateOverTime: safeValue(600, 600, 100, 5000) }, // Reduced from 1000
        shape: {
          shape: "SPHERE" as Shape,
          sphere: {
            radius: safeValue(1.0, 1.0, 0.1, 5),
          },
        },
        renderer: {
          blending: THREE.AdditiveBlending,
          discardBackgroundColor: false,
          backgroundColorTolerance: 0,
          backgroundColor: new THREE.Color(0, 0, 0),
          transparent: true,
          depthTest: true,
          depthWrite: false,
        },
        map: this.assets.fireTexture
      };

      // Create template particle systems for the pool
      const fireballResult = createParticleSystem(fireballConfig as any, now);
      const explosionResult = createParticleSystem(explosionConfig as any, now);

      if (fireballResult?.instance) {
        this.assets.fireballParticleSystem = fireballResult.instance;
        console.log('✅ Fireball particle system template created');
      } else {
        throw new Error('Failed to create fireball particle system');
      }

      if (explosionResult?.instance) {
        this.assets.explosionParticleSystem = explosionResult.instance;
        console.log('✅ Explosion particle system template created');
      } else {
        throw new Error('Failed to create explosion particle system');
      }
      
      // Pre-warm the pool with 5 systems of each type
      await this.preWarmParticlePool(5);

    } catch (error) {
      console.error('Failed to preload particle systems:', error);
      // Don't fail the whole loading process for particle systems
    }
  }

  /**
   * Get preloaded assets
   */
  getAssets(): PreloadedAssets {
    return { ...this.assets };
  }

  /**
   * Get specific asset
   */
  getAsset<T extends keyof PreloadedAssets>(key: T): PreloadedAssets[T] {
    return this.assets[key];
  }

  /**
   * Check if all critical assets are loaded
   */
  areCriticalAssetsLoaded(): boolean {
    return !!(this.assets.fireModel && this.assets.fireTexture);
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  /**
   * Cleanup assets
   */
  dispose(): void {
    if (this.assets.fireTexture) {
      this.assets.fireTexture.dispose();
    }
    
    // Don't dispose particle systems as they may be shared/reused
    // They will be garbage collected when no longer referenced
    
    // Clear references
    this.assets = {};
  }

  /**
   * Get an available particle system from the pool (fireball or explosion)
   * Returns a system positioned off-screen with scale 0, ready to be moved and scaled
   */
  getAvailableParticleSystem(type: 'fireball' | 'explosion'): THREE.Object3D | null {
    const pool = type === 'fireball' ? this.particlePool.fireballSystems : this.particlePool.explosionSystems;
    
    if (pool.available.length > 0) {
      const system = pool.available.pop()!;
      pool.active.add(system);
      
      // System is already positioned off-screen with scale 0
      // The consumer will move it to the correct position and scale it to 1
      console.log(`🎯 Retrieved pre-warmed ${type} system from pool (${pool.available.length} remaining)`);
      return system;
    }
    
    console.warn(`⚠️ No available ${type} systems in pool, will need async creation`);
    return null;
  }

  /**
   * Return a particle system to the pool when done
   * The system will be moved back to the pool container by the caller
   */
  returnParticleSystemToPool(system: THREE.Object3D, type: 'fireball' | 'explosion'): void {
    const pool = type === 'fireball' ? this.particlePool.fireballSystems : this.particlePool.explosionSystems;
    
    if (pool.active.has(system)) {
      pool.active.delete(system);
      
      // Reset the system state (position will be set by pool container)
      system.rotation.set(0, 0, 0);
      system.scale.set(0, 0, 0); // Scale to 0 for instant reuse
      system.visible = true; // Keep visible but scaled to 0
      
      // Note: Parent management is handled by the pool container
      // The caller will move this system back to the pool container
      
      pool.available.push(system);
      console.log(`♻️ Returned ${type} system to pool (${pool.available.length} available)`);
    }
  }

  /**
   * Create a new particle system asynchronously if pool is empty
   */
  async createParticleSystemAsync(type: 'fireball' | 'explosion'): Promise<THREE.Object3D | null> {
    if (!this.assets.fireTexture) {
      console.warn('Fire texture not available for async particle creation');
      return null;
    }

    return new Promise((resolve) => {
      // Use setTimeout to avoid blocking the main thread
      setTimeout(() => {
        try {
          const now = Date.now();
          const config = type === 'fireball' ? this.createFireballConfig() : this.createExplosionConfig();
          config.map = this.assets.fireTexture;
          
          const result = createParticleSystem(config as any, now);
          if (result?.instance) {
            console.log(`✅ Created new ${type} system asynchronously`);
            resolve(result.instance);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error(`Failed to create ${type} system async:`, error);
          resolve(null);
        }
      }, 0);
    });
  }

  /**
   * Get particle pool statistics
   */
  getPoolStats(): {
    fireball: { available: number; active: number };
    explosion: { available: number; active: number };
  } {
    return {
      fireball: {
        available: this.particlePool.fireballSystems.available.length,
        active: this.particlePool.fireballSystems.active.size
      },
      explosion: {
        available: this.particlePool.explosionSystems.available.length,
        active: this.particlePool.explosionSystems.active.size
      }
    };
  }

  /**
   * Helper method to create fireball configuration (extracted for reuse)
   */
  private createFireballConfig(): ParticleSystemConfig {
    const safeValue = (value: number, fallback: number, min: number, max: number): number => {
      if (!isFinite(value) || isNaN(value)) return fallback;
      if (value < min) return min;
      if (value > max) return max;
      return value;
    };

    const safeColor = (r: number, g: number, b: number) => {
      return {
        r: safeValue(r, 1.0, 0, 1),
        g: safeValue(g, 1.0, 0, 1),
        b: safeValue(b, 1.0, 0, 1),
      };
    };

    return {
      duration: safeValue(0.5, 0.5, 0.1, 10),
      looping: true,
      startLifetime: { 
        min: safeValue(0.6, 0.6, 0.1, 5), 
        max: safeValue(0.7, 0.7, 0.1, 5) 
      },
      startSpeed: { 
        min: safeValue(0.9, 0.9, 0, 10), 
        max: safeValue(1.1, 1.1, 0, 10) 
      },
      startSize: { 
        min: safeValue(0.8, 0.8, 0.1, 5), 
        max: safeValue(1.2, 1.2, 0.1, 5) 
      },
      startRotation: { 
        min: safeValue(-180, -180, -360, 360), 
        max: safeValue(180, 180, -360, 360) 
      },
      startColor: {
        min: safeColor(0.8, 0.3, 0.05),
        max: safeColor(1.0, 0.6, 0.1),
      },
      transform: { rotation: new THREE.Vector3(0, 0, 0) },
      gravity: safeValue(0, 0, -10, 10),
      maxParticles: Math.floor(safeValue(150, 150, 50, 2000)),
      emission: { rateOverTime: safeValue(800, 800, 100, 5000) },
      shape: {
        shape: "SPHERE" as Shape,
        sphere: {
          radius: safeValue(0.2, 0.2, 0.1, 2),
        },
      },
      renderer: {
        blending: THREE.AdditiveBlending,
        discardBackgroundColor: false,
        backgroundColorTolerance: 0,
        backgroundColor: new THREE.Color(0, 0, 0),
        transparent: true,
        depthTest: true,
        depthWrite: false,
      },
      map: undefined
    };
  }

  /**
   * Helper method to create explosion configuration (extracted for reuse)
   */
  private createExplosionConfig(): ParticleSystemConfig {
    const safeValue = (value: number, fallback: number, min: number, max: number): number => {
      if (!isFinite(value) || isNaN(value)) return fallback;
      if (value < min) return min;
      if (value > max) return max;
      return value;
    };

    const safeColor = (r: number, g: number, b: number) => {
      return {
        r: safeValue(r, 1.0, 0, 1),
        g: safeValue(g, 1.0, 0, 1),
        b: safeValue(b, 1.0, 0, 1),
      };
    };

    return {
      duration: safeValue(0.5, 0.5, 0.1, 10),
      looping: true,
      startLifetime: { 
        min: safeValue(0.2, 0.2, 0.1, 5), 
        max: safeValue(0.5, 0.5, 0.1, 5) 
      },
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
      startColor: {
        min: safeColor(0.9, 0.2, 0.02),
        max: safeColor(1.0, 0.7, 0.1),
      },
      transform: { rotation: new THREE.Vector3(0, 0, 0) },
      gravity: safeValue(0.1, 0.1, -10, 10),
      maxParticles: Math.floor(safeValue(120, 120, 50, 2000)),
      emission: { rateOverTime: safeValue(600, 600, 100, 5000) },
      shape: {
        shape: "SPHERE" as Shape,
        sphere: {
          radius: safeValue(1.0, 1.0, 0.1, 5),
        },
      },
      renderer: {
        blending: THREE.AdditiveBlending,
        discardBackgroundColor: false,
        backgroundColorTolerance: 0,
        backgroundColor: new THREE.Color(0, 0, 0),
        transparent: true,
        depthTest: true,
        depthWrite: false,
      },
      map: undefined
    };
  }

  /**
   * Get loading statistics
   */
  getStats(): { total: number; loaded: number; failed: number; pending: number } {
    const steps = Object.values(this.loadingSteps);
    const loaded = steps.filter(step => step.loaded && !step.error).length;
    const failed = steps.filter(step => step.error).length;
    const pending = steps.filter(step => !step.loaded).length;
    
    return {
      total: steps.length,
      loaded,
      failed,
      pending
    };
  }
}