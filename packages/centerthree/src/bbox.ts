import * as THREE from "three";
import type { Size } from "./types.ts";

export interface MeasuredObject {
  box: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
}

export interface FindPrimaryMeshOptions {
  /** If provided, return the first descendant mesh whose `name` exactly matches. */
  name?: string;
  /**
   * Strategy when no name is provided, or no name match is found:
   *   "largest" → mesh with the largest axis-aligned bounding-box volume.
   *   "first"   → first mesh encountered in traversal order.
   *   "none"    → return null (caller handles the miss).
   * Default: "largest".
   */
  fallback?: "largest" | "first" | "none";
}

/**
 * Walk `root`'s descendants and pick the most representative mesh.
 *
 * Useful for GLBs that contain multiple meshes (primary body + decorative
 * extras + explode pieces) when you only want to measure the main body.
 *
 * Composes with `measureObject3D`:
 *   const primary = findPrimaryMesh(gltfRoot, { name: "Cube200" });
 *   const { size, center } = measureObject3D(primary ?? gltfRoot);
 */
export function findPrimaryMesh(
  root: THREE.Object3D,
  opts: FindPrimaryMeshOptions = {},
): THREE.Mesh | null {
  const fallback = opts.fallback ?? "largest";
  let nameMatch: THREE.Mesh | undefined;
  let first: THREE.Mesh | undefined;
  let largestMesh: THREE.Mesh | undefined;
  let largestVolume = -Infinity;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (opts.name && mesh.name === opts.name && !nameMatch) {
      nameMatch = mesh;
    }
    if (!first) first = mesh;
    if (fallback === "largest" && mesh.geometry) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox?.();
      const bb = mesh.geometry.boundingBox;
      if (bb) {
        const s = bb.getSize(new THREE.Vector3());
        const volume = s.x * s.y * s.z;
        if (volume > largestVolume) {
          largestVolume = volume;
          largestMesh = mesh;
        }
      }
    }
  });

  if (nameMatch) return nameMatch;
  if (fallback === "first") return first ?? null;
  if (fallback === "none") return null;
  return largestMesh ?? first ?? null;
}

/**
 * Force matrix update and measure the world-axis-aligned bbox of an Object3D.
 * Useful for unparented helpers (SVG groups, freshly-created loaders) whose
 * matrices may not have been propagated yet.
 *
 * Returns fresh Vector3/Box3 instances each call — fine for one-shot
 * measurements; if you need to measure repeatedly per frame, allocate reusable
 * instances at the call site and use `setFromObject` directly.
 */
export function measureObject3D(object: THREE.Object3D): MeasuredObject {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return { box, size, center };
}

type TroikaTextLike = THREE.Mesh & {
  textRenderInfo?: {
    blockBounds?: [number, number, number, number];
    visibleBounds?: [number, number, number, number];
  };
};

/**
 * Measure a troika-three-text Mesh after `.sync()` has completed (in @threlte/extras,
 * that's after the `onsync` callback fires).
 *
 * Prefers `textRenderInfo.blockBounds` when available — tighter than
 * `geometry.boundingBox`, which includes SDF padding around the rendered glyphs.
 *
 * Returns null if neither bounds source is populated yet.
 */
export function measureTroikaText(mesh: TroikaTextLike): Size | null {
  const block = mesh.textRenderInfo?.blockBounds;
  if (block) {
    return {
      width: block[2] - block[0],
      height: block[3] - block[1],
    };
  }

  if (!mesh.geometry?.boundingBox) {
    mesh.geometry?.computeBoundingBox?.();
  }
  const bb = mesh.geometry?.boundingBox;
  if (!bb) return null;

  return {
    width: bb.max.x - bb.min.x,
    height: bb.max.y - bb.min.y,
  };
}
