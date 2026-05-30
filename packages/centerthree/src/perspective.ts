import * as THREE from "three";
import type { Vec3 } from "./types.ts";

type AnyCamera = THREE.PerspectiveCamera | THREE.OrthographicCamera;

/**
 * For content sitting in a plane parallel to the camera at world Z = `contentZ`,
 * intended to appear centered on the visible face of an off-axis target at world
 * position `targetWorld`, return the (x, y) shift to APPLY to the content's
 * natural position (targetWorld.x, targetWorld.y) so that viewed through the
 * camera the content lands on the projected position of the target's center.
 *
 * Derivation: project the line through camera C and target K onto the content
 * plane. Let `f = (contentZ - C.z) / (K.z - C.z)`. Then:
 *   idealPos = C.xy + f * (K.xy - C.xy)
 *   shift    = idealPos - K.xy = (f - 1) * (K.xy - C.xy)
 *
 * For OrthographicCamera, returns (0, 0) — no parallax.
 */
export function perspectiveCenterShift(
  camera: AnyCamera,
  targetWorld: Vec3 | THREE.Vector3,
  contentZ: number,
): { x: number; y: number } {
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    return { x: 0, y: 0 };
  }

  const C = camera.position;
  const dz = targetWorld.z - C.z;
  if (Math.abs(dz) < 1e-6) return { x: 0, y: 0 };

  const f = (contentZ - C.z) / dz;
  return {
    x: (f - 1) * (targetWorld.x - C.x),
    y: (f - 1) * (targetWorld.y - C.y),
  };
}
