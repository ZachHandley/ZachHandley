// Thin Svelte adapter over `centerthree`. Owns only the reactive plumbing —
// subscribes to Threlte's `size` store, exposes `$derived` getters. All math
// (frustum, sizing curves, camera shifts) lives in the centerthree package.

import { useThrelte } from "@threlte/core";
import {
  visibleHeightAtDistance,
  visibleWidthAtDistance,
  projectHalfWidthToDepth,
  continuousCrateSize,
  backButtonDimensions,
  perspectiveCenterShift,
} from "centerthree";
import {
  CAMERA_FOV,
  DRAGON_Z,
  DRAGON_WIDTH_FALLBACK,
  LINKS_Z_DEPTH,
  solveCameraZ,
} from "~/components/svelte/scene/rig";

export { perspectiveCenterShift };

export interface ViewportLayoutOptions {
  /** Z plane where crates live. Default: `LINKS_Z_DEPTH` from the rig. */
  zDepth?: number;
  /** Pixel breakpoint below which `isMobile` is true. Default: 768. */
  mobileBreakpoint?: number;
  /**
   * Measured world-space width of the dragon. Reactive — pass a getter, not a
   * snapshot, so the layout re-solves once the model has actually mounted.
   */
  dragonWidth?: () => number;
}

export interface ViewportLayout {
  readonly frustumWidth: number;
  readonly frustumHeight: number;
  readonly aspect: number;
  /** Informational only — visual sizing keys off the continuous curves. */
  readonly isMobile: boolean;
  /** Camera Z this layout was solved against. BaseScene applies the same value. */
  readonly cameraZ: number;
  /**
   * Half-width the dragon occupies *on the crate plane* — i.e. how much of the
   * crate plane's horizontal budget it actually costs, accounting for it being
   * further from the camera than the crates are.
   */
  readonly dragonHalfWidthAtCrateDepth: number;
  readonly categorySize: { width: number; height: number };
  readonly linkSize: { width: number; height: number };
  readonly backButtonSize: { width: number; height: number };
}

/**
 * Reactive layout values driven by the active camera + viewport size.
 * Call inside a component setup. All returned values are `$derived` — read
 * them in markup or other `$derived`s and they update reactively.
 */
export function useViewportLayout(opts?: ViewportLayoutOptions): ViewportLayout {
  const ctx = useThrelte();
  const zDepth = opts?.zDepth ?? LINKS_Z_DEPTH;
  const mobileBreakpoint = opts?.mobileBreakpoint ?? 768;

  let sizeW = $state(0);
  let sizeH = $state(0);
  $effect(() =>
    ctx.size.subscribe((s) => {
      sizeW = s.width;
      sizeH = s.height;
    }),
  );

  const aspect = $derived(sizeH > 0 ? sizeW / sizeH : 1);
  const isMobile = $derived(sizeW > 0 && sizeW < mobileBreakpoint);
  const dragonWidth = $derived(opts?.dragonWidth?.() || DRAGON_WIDTH_FALLBACK);

  // Solve the camera from the viewport rather than reading `ctx.camera.current`.
  //
  // The camera is imperative, not a signal, so a derive that read it could only
  // re-run by cheating (`void sizeW`) — and now that the camera itself MOVES with
  // aspect, that cheat becomes a correctness bug: the layout would compute
  // against whatever camera position happened to be installed at read time, which
  // depends on whether BaseScene's effect ran first. Deriving both from `aspect`
  // means the two agree by construction, in any effect order.
  const cameraZ = $derived(solveCameraZ(aspect, dragonWidth));
  const cameraDistance = $derived(cameraZ - zDepth);

  const frustumWidth = $derived(visibleWidthAtDistance(CAMERA_FOV, cameraDistance, aspect));
  const frustumHeight = $derived(visibleHeightAtDistance(CAMERA_FOV, cameraDistance));
  const dragonHalfWidthAtCrateDepth = $derived(
    projectHalfWidthToDepth(dragonWidth / 2, cameraZ, DRAGON_Z, zDepth),
  );

  const categorySize = $derived.by(() => {
    const s = continuousCrateSize({
      frustumWidth,
      frustumHeight,
      aspect,
      kind: "category",
    });
    return { width: s, height: s };
  });
  const linkSize = $derived.by(() => {
    const s = continuousCrateSize({
      frustumWidth,
      frustumHeight,
      aspect,
      kind: "link",
    });
    return { width: s, height: s };
  });
  const backButtonSize = $derived.by(() =>
    backButtonDimensions({ frustumWidth, frustumHeight, aspect }),
  );

  return {
    get frustumWidth() {
      return frustumWidth;
    },
    get frustumHeight() {
      return frustumHeight;
    },
    get aspect() {
      return aspect;
    },
    get isMobile() {
      return isMobile;
    },
    get cameraZ() {
      return cameraZ;
    },
    get dragonHalfWidthAtCrateDepth() {
      return dragonHalfWidthAtCrateDepth;
    },
    get categorySize() {
      return categorySize;
    },
    get linkSize() {
      return linkSize;
    },
    get backButtonSize() {
      return backButtonSize;
    },
  };
}
