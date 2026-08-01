import * as THREE from "three";

type AnyCamera = THREE.PerspectiveCamera | THREE.OrthographicCamera | null | undefined;

/**
 * Visible scene height in world units at a given world-Z plane.
 * Works for both PerspectiveCamera and OrthographicCamera.
 */
export function visibleHeightAtDepth(camera: AnyCamera, worldZ: number, fallback = 10): number {
  if (!camera) return fallback;

  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const cam = camera as THREE.PerspectiveCamera;
    const distance = Math.abs(worldZ - cam.position.z);
    return 2 * Math.tan((cam.fov * Math.PI) / 180 / 2) * distance;
  }

  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const cam = camera as THREE.OrthographicCamera;
    return (cam.top - cam.bottom) / cam.zoom;
  }

  return fallback;
}

/**
 * Visible scene height in world units for a perspective camera, from raw
 * numbers rather than a live camera object.
 *
 * Exists so layout code can solve for a camera position and lay content out
 * against the *resulting* frustum in the same pass, without depending on
 * whoever mutates `camera.position` having already run. Reading the live
 * camera makes the result order-dependent; this does not.
 */
export function visibleHeightAtDistance(fovDegrees: number, distance: number): number {
  return 2 * Math.tan((fovDegrees * Math.PI) / 180 / 2) * Math.abs(distance);
}

/** Visible scene width in world units for a perspective camera. See above. */
export function visibleWidthAtDistance(
  fovDegrees: number,
  distance: number,
  aspect: number,
): number {
  return visibleHeightAtDistance(fovDegrees, distance) * aspect;
}

/**
 * Re-express a half-width measured at world Z `fromZ` as the half-width at
 * world Z `toZ` that subtends the same angle from a camera at `cameraZ`.
 *
 * Needed whenever you lay content out on one plane so it clears an object on a
 * different plane. Comparing raw world widths across planes silently
 * over-reserves space for anything further from the camera than the content —
 * a 9-unit-wide model at z=0 only "costs" 6.6 units of the z=6 plane when the
 * camera sits at z=22.5.
 */
export function projectHalfWidthToDepth(
  halfWidth: number,
  cameraZ: number,
  fromZ: number,
  toZ: number,
): number {
  const fromDistance = Math.abs(cameraZ - fromZ);
  if (fromDistance < 1e-6) return halfWidth;
  return (halfWidth * Math.abs(cameraZ - toZ)) / fromDistance;
}

/**
 * Visible scene width in world units at a given world-Z plane.
 */
export function visibleWidthAtDepth(camera: AnyCamera, worldZ: number, fallback = 10): number {
  if (!camera) return fallback;

  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const cam = camera as THREE.OrthographicCamera;
    return (cam.right - cam.left) / cam.zoom;
  }

  const h = visibleHeightAtDepth(camera, worldZ, fallback);
  const aspect = (camera as THREE.PerspectiveCamera).aspect ?? 1;
  return h * aspect;
}
