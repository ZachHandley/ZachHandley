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
