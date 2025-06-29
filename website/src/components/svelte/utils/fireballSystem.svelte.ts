import * as THREE from 'three';
import type { Link } from '~/types/baseSchemas';

/**
 * FireballSystem - Centralized fireball management and coordination
 */

export interface FireballData {
  id: number;
  active: boolean;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  direction: THREE.Vector3;
  url: string;
  type: Link['type'];
  category?: string;
  crateId?: string;
  action?: () => void | Promise<void>; // Store the action to execute after visual sequence
}

export interface FireballSystemOptions {
  maxFireballs: number;
  dragonMouthOffset: THREE.Vector3;
  rotationDuration: number;
}

export class FireballSystem {
  private fireballPool: FireballData[] = [];
  private nextFireballId = 0;
  private vectorPool: THREE.Vector3[] = [];
  private updateCallback?: () => void;
  
  constructor(private options: FireballSystemOptions, updateCallback?: () => void) {
    this.updateCallback = updateCallback;
    this.initializePool();
  }

  /**
   * Trigger update callback to notify subscribers
   */
  private triggerUpdate(): void {
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Initialize the fireball pool and vector pool for performance
   */
  private initializePool(): void {
    // Pre-allocate fireball objects
    for (let i = 0; i < this.options.maxFireballs; i++) {
      this.fireballPool.push({
        id: i,
        active: false,
        startPosition: new THREE.Vector3(),
        endPosition: new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, 1),
        url: '',
        type: 'url',
        category: undefined,
        action: undefined,
      });
    }

    // Pre-allocate vector objects to reduce GC pressure
    this.vectorPool = Array(this.options.maxFireballs * 4)
      .fill(null)
      .map(() => new THREE.Vector3());
      
    this.nextFireballId = this.options.maxFireballs;
  }

  /**
   * Get a reusable vector from the pool
   */
  private getVector(index: number): THREE.Vector3 {
    return this.vectorPool[index % this.vectorPool.length];
  }

  /**
   * Calculate dragon mouth position based on orientation
   */
  private calculateMouthPosition(dragonRef: THREE.Group): THREE.Vector3 {
    // Get the dragon's orientation vectors after rotation
    const dragonForward = new THREE.Vector3(0, 0, 1).applyQuaternion(dragonRef.quaternion);
    const dragonUp = new THREE.Vector3(0, 1, 0).applyQuaternion(dragonRef.quaternion);
    const dragonRight = new THREE.Vector3(1, 0, 0).applyQuaternion(dragonRef.quaternion);

    // Calculate mouth position using orientation vectors
    const mouthPosition = this.getVector(0).copy(dragonRef.position);
    
    // Add offsets in each direction
    mouthPosition.add(dragonRight.multiplyScalar(this.options.dragonMouthOffset.x));
    mouthPosition.add(dragonUp.multiplyScalar(this.options.dragonMouthOffset.y));
    mouthPosition.add(dragonForward.multiplyScalar(this.options.dragonMouthOffset.z));

    return mouthPosition;
  }

  /**
   * Rotate dragon to face target position on Y-axis (horizontal turning)
   */
  async rotateDragonToTarget(
    dragonRef: THREE.Group,
    targetPosition: THREE.Vector3,
    rotationTween: any,
    dragonRotationTask: any
  ): Promise<void> {
    // Calculate direction from dragon to target
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, dragonRef.position)
      .normalize();

    // Calculate Y rotation (horizontal turning) to face the target
    const targetYRotation = Math.atan2(direction.x, direction.z);

    console.log(`🔄 Dragon rotation: Current Y=${dragonRef.rotation.y.toFixed(2)}, Target Y=${targetYRotation.toFixed(2)}`);

    // Set up rotation tween
    rotationTween.set({ y: targetYRotation });

    // Start the rotation task
    dragonRotationTask.start();

    // Return promise that resolves when rotation completes
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        dragonRotationTask.stop();
        dragonRef.updateMatrixWorld(true);
        console.log(`✅ Dragon rotation complete: Final Y=${dragonRef.rotation.y.toFixed(2)}`);
        resolve();
      }, this.options.rotationDuration);
    });
  }

  /**
   * Create a new fireball with given parameters
   */
  async createFireball(
    dragonRef: THREE.Group,
    targetPosition: THREE.Vector3,
    url: string,
    type: Link['type'],
    category?: string,
    crateId?: string,
    rotationTween?: any,
    dragonRotationTask?: any,
    action?: () => void | Promise<void>
  ): Promise<number | null> {
    console.log(`🔥 FireballSystem.createFireball called:`, { url, type, category });
    
    // Find available fireball slot
    const availableIndex = this.fireballPool.findIndex(f => !f.active);
    if (availableIndex === -1) {
      console.warn('🚫 FireballSystem: No available fireball slots');
      return null;
    }

    console.log(`📍 Found available fireball slot: ${availableIndex}`);

    // Rotate dragon to target if rotation system provided
    if (rotationTween && dragonRotationTask) {
      console.log(`🔄 Rotating dragon to target...`);
      await this.rotateDragonToTarget(dragonRef, targetPosition, rotationTween, dragonRotationTask);
    } else {
      console.log(`⚠️ No rotation system provided - skipping dragon rotation`);
    }

    // Calculate fireball trajectory
    const mouthPosition = this.calculateMouthPosition(dragonRef);
    const direction = this.getVector(1)
      .subVectors(targetPosition, mouthPosition)
      .normalize();

    console.log(`📐 Calculated trajectory:`, { mouthPosition, targetPosition, direction });

    // Update fireball data in place
    const fireball = this.fireballPool[availableIndex];
    fireball.active = true;
    fireball.id = this.nextFireballId++;
    fireball.startPosition.copy(mouthPosition);
    fireball.endPosition.copy(targetPosition);
    fireball.direction.copy(direction);
    fireball.url = url;
    fireball.type = type;
    fireball.category = category || undefined;
    fireball.crateId = crateId;
    fireball.action = action; // Store the action to execute after visual sequence

    console.log(`🚀 Fireball created with ID: ${fireball.id}`);
    
    // Trigger update to notify reactive subscribers
    this.triggerUpdate();
    
    return fireball.id;
  }

  /**
   * Mark fireball as completed and handle cleanup
   */
  async completeFireball(
    id: number,
    onExplodeCrate?: (crateId: string) => void,
    onUrlNavigation?: (url: string, type: string) => void,
    onCategoryInteraction?: (category?: string) => void
  ): Promise<void> {
    const fireball = this.fireballPool.find(f => f.active && f.id === id);
    if (!fireball) return;

    const { url, type, category, crateId, action } = fireball;

    try {
      // ALWAYS explode the target crate if we have a crate ID
      if (crateId && onExplodeCrate) {
        console.log(`💥 Exploding crate: ${crateId}`);
        onExplodeCrate(crateId);
        
        // Wait for explosion animation to complete before executing action
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Execute the stored action after the visual sequence completes
      if (action) {
        console.log(`🎬 Executing stored action for ${type} after visual sequence`);
        try {
          await action();
        } catch (error) {
          console.error('Error executing stored action:', error);
        }
      } else {
        console.warn(`⚠️ No stored action found for ${type} link: ${url}`);
      }

    } catch (error) {
      console.error('FireballSystem: Error executing fireball completion:', error);
    } finally {
      // Mark as inactive
      fireball.active = false;
      
      // Trigger update to notify reactive subscribers
      this.triggerUpdate();
    }
  }

  /**
   * Get all active fireballs
   */
  getActiveFireballs(): FireballData[] {
    return this.fireballPool.filter(f => f.active);
  }

  /**
   * Get fireball by ID
   */
  getFireball(id: number): FireballData | undefined {
    return this.fireballPool.find(f => f.id === id);
  }

  /**
   * Clear all active fireballs
   */
  clearAll(): void {
    this.fireballPool.forEach(fireball => {
      fireball.active = false;
      fireball.startPosition.set(0, 0, 0);
      fireball.endPosition.set(0, 0, 0);
      fireball.direction.set(0, 0, 1);
      fireball.url = '';
      fireball.category = '';
      fireball.crateId = undefined;
      fireball.action = undefined;
    });
  }

  /**
   * Get pool statistics for debugging
   */
  getStats(): { active: number; available: number; total: number } {
    const active = this.fireballPool.filter(f => f.active).length;
    return {
      active,
      available: this.fireballPool.length - active,
      total: this.fireballPool.length
    };
  }
}