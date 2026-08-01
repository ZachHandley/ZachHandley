import { projectHalfWidthToDepth, visibleWidthAtDistance } from "./frustum.ts";

/**
 * Aspect-driven camera dolly.
 *
 * A fixed perspective rig has an aspect-independent visible HEIGHT and a visible
 * WIDTH that scales linearly with aspect (see frustum.ts). So a portrait viewport
 * loses horizontal budget and nothing else. A layout that flanks a centered
 * object with content therefore runs out of room long before it runs out of
 * pixels, and no amount of shrinking the content fixes it once the centered
 * object alone is wider than the frustum.
 *
 * The fix is to dolly the camera back until the content plane is wide enough to
 * seat the obstacle plus the content on either side. Dollying (rather than
 * widening fov) keeps the perspective character of the shot and avoids the
 * wide-angle distortion that a fov large enough to matter would introduce.
 *
 * Self-referential, hence the fixed-point iteration: moving the camera back also
 * changes how wide the obstacle appears on the content plane. It converges in a
 * couple of passes because the coupling is weak (a ratio of two distances that
 * both grow together).
 */
export interface CameraDollyInput {
  /** Viewport aspect ratio (width / height). */
  aspect: number;
  /** Vertical field of view in degrees. */
  fov: number;
  /** Camera Z for the framing the rig was designed at. Never dollies closer than this. */
  baseCameraZ: number;
  /** World Z of the plane the content is laid out on. */
  contentZ: number;
  /** World Z of the object the content has to clear. */
  obstacleZ: number;
  /** Full world-space width of that object. */
  obstacleWidth: number;
  /** Full width of one piece of content, in world units on the content plane. */
  contentWidth: number;
  /** Breathing room on each side, in world units on the content plane. */
  margin: number;
  /** Hard cap on how far back we'll go, as a multiple of the base distance. */
  maxDollyRatio?: number;
}

/**
 * Camera Z that leaves room on the content plane for the obstacle plus one
 * piece of content (and `margin`) on each side. Returns `baseCameraZ` unchanged
 * whenever the base framing already fits — which is every landscape viewport,
 * so desktop framing is bit-for-bit unaffected.
 */
export function solveCameraZ(input: CameraDollyInput): number {
  const {
    aspect,
    fov,
    baseCameraZ,
    contentZ,
    obstacleZ,
    obstacleWidth,
    contentWidth,
    margin,
    maxDollyRatio = 1.75,
  } = input;

  if (!Number.isFinite(aspect) || aspect <= 0) return baseCameraZ;

  const baseDistance = Math.abs(baseCameraZ - contentZ);
  const maxDistance = baseDistance * maxDollyRatio;

  let cameraZ = baseCameraZ;

  for (let i = 0; i < 4; i++) {
    // How wide the obstacle reads on the content plane at the current camera Z.
    const obstacleHalf = projectHalfWidthToDepth(obstacleWidth / 2, cameraZ, obstacleZ, contentZ);
    // Half the content plane has to seat: the obstacle's half-width, then a
    // whole crate beside it, then a margin before the screen edge.
    const requiredWidth = 2 * (obstacleHalf + contentWidth + margin);
    const availableWidth = visibleWidthAtDistance(fov, cameraZ - contentZ, aspect);

    if (availableWidth >= requiredWidth) break;

    // Width scales linearly with distance, so the distance that yields
    // requiredWidth is a straight ratio off the current one.
    const distance = Math.abs(cameraZ - contentZ);
    const next = distance * (requiredWidth / Math.max(availableWidth, 1e-6));
    const clamped = Math.min(Math.max(next, baseDistance), maxDistance);
    cameraZ = contentZ + clamped;

    if (clamped >= maxDistance) break;
  }

  return Math.max(cameraZ, baseCameraZ);
}
