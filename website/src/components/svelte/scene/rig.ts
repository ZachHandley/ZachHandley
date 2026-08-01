import { crateSizeClamp, solveCameraZ as solveCameraZBase } from "centerthree";

/**
 * The one description of the scene's camera rig.
 *
 * These numbers used to live in three places that had drifted apart:
 * BaseScene owned the camera and passed `dragonWidth: 6 * ENVIRONMENT_SCALE`
 * to SceneController, StackedLinks re-declared `LINKS_Z_DEPTH = 6`, and
 * `calculateCategoryPositions` / `calculateGridLayout` each hardcoded their own
 * (mutually contradictory — 9 vs 3) guess at how wide the dragon is.
 *
 * Both the camera and the layout now solve from this module, so they cannot
 * disagree, and neither has to read the other's mutated state to stay correct.
 */

export const ENVIRONMENT_SCALE = 1.5;

/** Vertical field of view, degrees. Matches <T.PerspectiveCamera fov={...}>. */
export const CAMERA_FOV = 60;

/** Camera position for the framing the scene was art-directed at (landscape). */
export const CAMERA_BASE_POSITION = { x: 0, y: 7.5, z: 15 * ENVIRONMENT_SCALE };
export const CAMERA_TARGET = { x: 0, y: 5, z: 0 };

/** World Z of the plane the link/category crates are laid out on. */
export const LINKS_Z_DEPTH = 6;

/** World Z of the dragon (Dragon.svelte renders at position=[0, y, 0]). */
export const DRAGON_Z = 0;

/**
 * Fallback dragon width, used only until the model has mounted and can be
 * measured. This is the value the layout previously hardcoded forever.
 */
export const DRAGON_WIDTH_FALLBACK = 6 * ENVIRONMENT_SCALE;

/** Breathing room between the dragon and a category crate, in world units. */
export const CATEGORY_CLEARANCE_MARGIN = 0.6;

/**
 * Camera Z for a given viewport aspect.
 *
 * Landscape returns `CAMERA_BASE_POSITION.z` exactly — the art-directed framing
 * is untouched at every aspect >= 1. Narrower than that, the visible width at
 * the crate plane shrinks linearly (visible height does not depend on aspect at
 * all), so the camera pulls back far enough to keep seating a category crate on
 * each side of the dragon.
 *
 * Seats against the category crate's floor size rather than its actual derived
 * size, because the derived size depends on the frustum, which depends on the
 * camera — this is the term that breaks the cycle.
 */
export function solveCameraZ(aspect: number, dragonWidth = DRAGON_WIDTH_FALLBACK): number {
  return solveCameraZBase({
    aspect,
    fov: CAMERA_FOV,
    baseCameraZ: CAMERA_BASE_POSITION.z,
    contentZ: LINKS_Z_DEPTH,
    obstacleZ: DRAGON_Z,
    obstacleWidth: dragonWidth,
    contentWidth: crateSizeClamp("category").min,
    margin: CATEGORY_CLEARANCE_MARGIN,
  });
}
