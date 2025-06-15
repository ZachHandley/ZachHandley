import * as THREE from 'three';
import type { Link } from '~/types/baseSchemas';
import { CrateController, type CrateControllerOptions } from './crateController.svelte.ts';
import { FireballSystem, type FireballSystemOptions, type FireballData } from './fireballSystem.svelte.ts';
import { AssetManager, type LoadingState } from './assetManager.svelte.ts';

/**
 * SceneController - Main coordinator for the 3D scene
 * Manages all subsystems and provides a unified interface
 */

export interface SceneControllerOptions {
  environmentScale: number;
  zDepth: number;
  dragonWidth: number;
  maxFireballs: number;
  onLoadingStateChange?: (loading: boolean, progress: number, message: string) => void;
  onCategoryInteraction?: (category?: string) => void;
}

export class SceneController {
  private crateController: CrateController;
  private fireballSystem: FireballSystem;
  private assetManager: AssetManager;
  
  private camera: THREE.PerspectiveCamera | null = null;
  private dragonRef: THREE.Group | null = null;
  private isMobile = false;
  private updateTrigger = $state(0);

  constructor(private options: SceneControllerOptions) {
    // Initialize subsystems
    this.assetManager = new AssetManager((state: LoadingState) => {
      if (this.options.onLoadingStateChange) {
        this.options.onLoadingStateChange(state.loading, state.progress, state.message);
      }
    });

    this.crateController = new CrateController({
      zDepth: options.zDepth,
      environmentScale: options.environmentScale,
      dragonWidth: options.dragonWidth,
      isMobile: this.isMobile
    });

    this.fireballSystem = new FireballSystem({
      maxFireballs: options.maxFireballs,
      dragonMouthOffset: new THREE.Vector3(0, 3, 0.5),
      rotationDuration: 800
    }, () => {
      // Trigger reactivity update when fireballs change
      this.updateTrigger++;
    });
  }

  /**
   * Initialize the scene and start loading assets
   */
  async initialize(): Promise<void> {
    this.assetManager.startLoading();
    
    // Load ground assets immediately
    this.assetManager.completeStep('ground', 'Setting up the scene...');
    
    // Load dragon assets immediately
    this.assetManager.completeStep('dragon', 'Awakening the dragon...');
    
    // Load fire assets (loads texture, model, audio AND pre-warms particle pool)
    await this.assetManager.preloadFireAssets();
    
    // Complete scene setup immediately
    this.assetManager.completeStep('scene', 'Finalizing portfolio...');
  }

  /**
   * Update camera reference and mobile state
   */
  updateCamera(camera: THREE.PerspectiveCamera, rendererSize: { width: number; height: number }): void {
    this.camera = camera;
    this.isMobile = rendererSize.width < rendererSize.height * 1.2;
    
    // Update subsystems
    this.crateController.updateCamera(camera);
    this.crateController.updateOptions({ isMobile: this.isMobile });
  }

  /**
   * Set dragon reference
   */
  setDragonRef(dragonRef: THREE.Group): void {
    this.dragonRef = dragonRef;
  }

  /**
   * Get the crate controller
   */
  getCrateController(): CrateController {
    return this.crateController;
  }

  /**
   * Get the fireball system
   */
  getFireballSystem(): FireballSystem {
    return this.fireballSystem;
  }

  /**
   * Get active fireballs (reactive)
   */
  getActiveFireballs(): FireballData[] {
    // Access updateTrigger to make this reactive
    const _ = this.updateTrigger;
    return this.fireballSystem.getActiveFireballs();
  }

  /**
   * Get the asset manager
   */
  getAssetManager(): AssetManager {
    return this.assetManager;
  }

  /**
   * Handle link clicks - creates fireballs and manages interactions
   */
  async handleLinkClick(
    url: string,
    type: Link['type'],
    position: THREE.Vector3,
    category?: string,
    action?: () => void | Promise<void>,
    crateId?: string,
    rotationTween?: any,
    dragonRotationTask?: any
  ): Promise<void> {
    console.log(`🎯 SceneController.handleLinkClick called:`, { url, type, category, position });
    
    if (!this.dragonRef) {
      console.warn('🚫 SceneController: Dragon reference not set');
      return;
    }

    // Note: Particle systems are already pre-warmed during initialization

    console.log(`🐉 Dragon ref available, creating fireball with stored action...`);
    
    const fireballId = await this.fireballSystem.createFireball(
      this.dragonRef,
      position,
      url,
      type,
      category,
      crateId,
      rotationTween,
      dragonRotationTask,
      action // Pass the action to be executed after visual sequence
    );

    if (fireballId === null) {
      console.warn('🚫 SceneController: Failed to create fireball');
    } else {
      console.log(`✅ SceneController: Fireball created with ID ${fireballId}, action will execute after visual sequence`);
    }
  }

  /**
   * Handle fireball completion
   */
  async handleFireballComplete(id: number): Promise<void> {
    await this.fireballSystem.completeFireball(
      id,
      this.handleExplodeCrate.bind(this),
      this.navigateToExternalLink.bind(this),
      this.options.onCategoryInteraction
    );
  }

  /**
   * Handle crate explosion - simplified approach: always explode the specific crate
   */
  private async handleExplodeCrate(crateId: string): Promise<void> {
    console.log(`💥 SceneController: Exploding crate: ${crateId}`);
    await this.crateController.triggerExplosion(crateId);
  }

  /**
   * Navigate to external links with popup blocker avoidance
   */
  private navigateToExternalLink(url: string, type: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener noreferrer';
    
    if (type === 'download') {
      a.download = url.split('/').pop() || 'download';
      a.target = '_self';
    } else if (type === 'contact') {
      a.download = 'contact.vcf';
      a.target = '_self';
    } else {
      a.target = '_blank';
      a.setAttribute('data-user-initiated', 'true');
    }
    
    document.body.appendChild(a);
    
    setTimeout(() => {
      a.click();
      document.body.removeChild(a);
    }, 50);
  }

  /**
   * Trigger crate explosion by ID
   */
  async triggerCrateExplosion(crateId: string): Promise<void> {
    return this.crateController.triggerExplosion(crateId);
  }

  /**
   * Register a crate component
   */
  registerCrate(id: string, component: { explode: () => void; reset: () => void }, position: THREE.Vector3): void {
    this.crateController.registerCrate(id, component, position);
  }

  /**
   * Unregister a crate component
   */
  unregisterCrate(id: string): void {
    this.crateController.unregisterCrate(id);
  }

  /**
   * Get system statistics for debugging
   */
  getSystemStats(): {
    fireballs: { active: number; available: number; total: number };
    assets: { total: number; loaded: number; failed: number; pending: number };
    loading: LoadingState;
  } {
    return {
      fireballs: this.fireballSystem.getStats(),
      assets: this.assetManager.getStats(),
      loading: this.assetManager.getLoadingState()
    };
  }

  /**
   * Cleanup all systems
   */
  dispose(): void {
    this.fireballSystem.clearAll();
    this.assetManager.dispose();
  }

  /**
   * Get current mobile state
   */
  get isMobileDevice(): boolean {
    return this.isMobile;
  }

  /**
   * Get current camera
   */
  get currentCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  /**
   * Get current dragon reference
   */
  get currentDragon(): THREE.Group | null {
    return this.dragonRef;
  }
}