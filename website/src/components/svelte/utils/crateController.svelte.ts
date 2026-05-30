import * as THREE from 'three';

/**
 * CrateController — owns the registry of mounted crate components and routes
 * explosion / reset / position-update calls to them. Layout math (sizing,
 * positions, content offsets) lives in `viewportLayout.svelte.ts` now; this
 * controller no longer concerns itself with that.
 */

export interface CrateComponent {
  explode: () => void;
  reset: () => void;
}

export interface RegisteredCrate {
  component: CrateComponent;
  position: THREE.Vector3;
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

  constructor(private options: CrateControllerOptions) {}

  /** Update camera reference. (Kept for symmetry; not used by layout.) */
  updateCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  /** Register a crate component for explosion coordination. */
  registerCrate(id: string, component: CrateComponent, position: THREE.Vector3): void {
    this.crateRegistry.set(id, {
      component,
      position: position.clone(),
    });
  }

  /** Unregister a crate component. */
  unregisterCrate(id: string): void {
    this.crateRegistry.delete(id);
  }

  /** Update an existing crate's stored position in place. No-op if not registered. */
  updateCratePosition(id: string, position: THREE.Vector3): void {
    const entry = this.crateRegistry.get(id);
    if (entry) {
      entry.position.copy(position);
    }
  }

  /** Trigger explosion on a specific crate. */
  async triggerExplosion(crateId: string): Promise<void> {
    const registeredCrate = this.crateRegistry.get(crateId);
    if (registeredCrate) {
      registeredCrate.component.explode();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      console.warn(`CrateController: Crate ${crateId} not found in registry`);
    }
  }

  /** Get all registered crate IDs. */
  getRegisteredCrateIds(): string[] {
    return Array.from(this.crateRegistry.keys());
  }

  /** Check whether a crate is already registered. */
  hasCrate(id: string): boolean {
    return this.crateRegistry.has(id);
  }

  /** Update controller options (isMobile, dragonWidth, etc.). */
  updateOptions(newOptions: Partial<CrateControllerOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /** Current camera reference, if any. */
  get currentCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }
}
