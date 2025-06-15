import * as THREE from 'three';
import type { Link } from '~/types/baseSchemas';
import { calculateViewportDimensions, calculateGridPositions, type ViewportDimensions } from '~/utils/cameraUtils';

/**
 * CrateController - Manages crate positioning, scaling, and explosion coordination
 */

export interface CrateComponent {
  explode: () => void;
  reset: () => void;
}

export interface RegisteredCrate {
  component: CrateComponent;
  position: THREE.Vector3;
}

export interface CrateLayout {
  leftPositions: [number, number, number][];
  rightPositions: [number, number, number][];
  linkSize: number;
}

export interface CrateControllerOptions {
  zDepth: number;
  environmentScale: number;
  dragonWidth: number;
  isMobile: boolean;
}

export class CrateController {
  private crateRegistry = new Map<string, RegisteredCrate>();
  private camera: THREE.PerspectiveCamera | null = null;
  private viewport: ViewportDimensions | null = null;
  
  constructor(private options: CrateControllerOptions) {}

  /**
   * Update camera reference and recalculate viewport
   */
  updateCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
    this.viewport = calculateViewportDimensions(camera, this.options.zDepth);
  }

  /**
   * Register a crate component for explosion coordination
   */
  registerCrate(id: string, component: CrateComponent, position: THREE.Vector3): void {
    this.crateRegistry.set(id, {
      component,
      position: position.clone() // Clone to avoid reference issues
    });
  }

  /**
   * Unregister a crate component
   */
  unregisterCrate(id: string): void {
    this.crateRegistry.delete(id);
  }

  /**
   * Trigger explosion on a specific crate
   */
  async triggerExplosion(crateId: string): Promise<void> {
    const registeredCrate = this.crateRegistry.get(crateId);
    if (registeredCrate) {
      registeredCrate.component.explode();
      // Wait for explosion animation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.warn(`CrateController: Crate ${crateId} not found in registry`);
    }
  }

  /**
   * Calculate layout for category buttons
   */
  calculateCategoryLayout(categories: { left: any[]; right: any[] }): Record<string, [number, number, number]> {
    if (!this.camera || !this.viewport) {
      console.warn('CrateController: Camera not set, using default positions');
      return {};
    }

    const positions: Record<string, [number, number, number]> = {};
    
    // Calculate distance from center based on dragon width and available space
    const dragonEdgeX = this.options.dragonWidth / 2;
    const screenEdgeX = this.viewport.width / 2;
    const availableSpace = screenEdgeX - dragonEdgeX;
    const distanceFromCenter = dragonEdgeX + availableSpace * (this.options.isMobile ? 0.75 : 0.5);
    
    // Category size based on device
    const categorySize = this.options.isMobile ? 3 : 4;
    
    // Calculate positions with grid utility
    const totalCategories = categories.left.length + categories.right.length;
    const layout = calculateGridPositions(
      totalCategories,
      this.viewport,
      categorySize,
      2, // Two columns
      {
        topBoundary: this.viewport.height * 0.45,
        bottomBoundary: -1,
        centerOffset: distanceFromCenter
      }
    );

    // Assign positions to left categories
    categories.left.forEach((cat, i) => {
      if (i < layout.leftPositions.length) {
        positions[cat.id] = [
          layout.leftPositions[i][0],
          layout.leftPositions[i][1],
          this.options.zDepth
        ];
      }
    });

    // Assign positions to right categories
    categories.right.forEach((cat, i) => {
      if (i < layout.rightPositions.length) {
        positions[cat.id] = [
          layout.rightPositions[i][0],
          layout.rightPositions[i][1],
          this.options.zDepth
        ];
      }
    });

    return positions;
  }

  /**
   * Calculate layout for links within a category
   */
  calculateLinksLayout(links: Link[]): CrateLayout {
    if (!this.camera || !this.viewport) {
      console.warn('CrateController: Camera not set, using default layout');
      return { leftPositions: [], rightPositions: [], linkSize: 4 };
    }

    // Calculate optimal link size based on device and space
    const maxLinkSize = this.options.isMobile ? 2.5 : 4;
    
    // Use the same dragon avoidance logic as categories
    const dragonEdgeX = this.options.dragonWidth / 2;
    const screenEdgeX = this.viewport.width / 2;
    const availableSpace = screenEdgeX - dragonEdgeX;
    const distanceFromCenter = dragonEdgeX + availableSpace * 0.5;

    const layout = calculateGridPositions(
      links.length,
      this.viewport,
      maxLinkSize,
      2, // Two columns
      {
        topBoundary: this.viewport.height * 0.45,
        bottomBoundary: -0.85,
        centerOffset: distanceFromCenter
      }
    );

    // Add Z depth to all positions
    const leftPositions: [number, number, number][] = layout.leftPositions.map(pos => 
      [pos[0], pos[1], this.options.zDepth]
    );
    const rightPositions: [number, number, number][] = layout.rightPositions.map(pos => 
      [pos[0], pos[1], this.options.zDepth]
    );

    return {
      leftPositions,
      rightPositions,
      linkSize: layout.linkSize
    };
  }

  /**
   * Calculate bounding box scale for a crate to fit target dimensions
   */
  calculateCrateScale(
    boundingBox: THREE.Box3,
    targetWidth: number,
    targetHeight: number,
    targetDepth: number
  ): [number, number, number] {
    const size = boundingBox.getSize(new THREE.Vector3());
    
    return [
      targetWidth / size.x,
      targetHeight / size.y,
      targetDepth / size.z
    ];
  }

  /**
   * Calculate content positions within a crate (for text and icons)
   */
  calculateContentPositions(
    crateHeight: number,
    containerYOffset: number = 2.95
  ): { titleY: number; iconY: number; domainY: number; contentZOffset: number } {
    // Compensate for container offset
    const yOffset = containerYOffset;
    
    return {
      titleY: crateHeight * 0.9 + yOffset,
      iconY: crateHeight * 0.8 + yOffset,
      domainY: crateHeight * 0.1 + yOffset,
      contentZOffset: 0.3 // Distance in front of crate
    };
  }

  /**
   * Get current viewport dimensions (readonly)
   */
  get currentViewport(): ViewportDimensions | null {
    return this.viewport;
  }

  /**
   * Find the closest crate to a given position
   */
  findCrateAtPosition(targetPosition: THREE.Vector3, tolerance: number = 2.0): string | null {
    let closestCrateId: string | null = null;
    let closestDistance = tolerance;

    for (const [crateId, registeredCrate] of this.crateRegistry.entries()) {
      const distance = targetPosition.distanceTo(registeredCrate.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCrateId = crateId;
      }
    }

    if (closestCrateId) {
      console.log(`🎯 Found crate '${closestCrateId}' at distance ${closestDistance.toFixed(2)} from target position`);
    } else {
      console.log(`⚠️ No crate found within tolerance ${tolerance} of target position`);
    }

    return closestCrateId;
  }

  /**
   * Get all registered crate IDs
   */
  getRegisteredCrateIds(): string[] {
    return Array.from(this.crateRegistry.keys());
  }

  /**
   * Get all registered crate positions
   */
  getRegisteredCratePositions(): Record<string, THREE.Vector3> {
    const positions: Record<string, THREE.Vector3> = {};
    for (const [crateId, registeredCrate] of this.crateRegistry.entries()) {
      positions[crateId] = registeredCrate.position.clone();
    }
    return positions;
  }

  /**
   * Update controller options
   */
  updateOptions(newOptions: Partial<CrateControllerOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Recalculate viewport if camera is available
    if (this.camera) {
      this.viewport = calculateViewportDimensions(this.camera, this.options.zDepth);
    }
  }
}