// Thin Svelte adapter over `centerthree`. Owns only the reactive plumbing —
// subscribes to Threlte's `size` store, exposes `$derived` getters. All math
// (frustum, sizing curves, camera shifts) lives in the centerthree package.

import * as THREE from "three";
import { useThrelte } from "@threlte/core";
import {
  visibleHeightAtDepth,
  visibleWidthAtDepth,
  continuousCrateSize,
  backButtonDimensions,
  perspectiveCenterShift,
} from "centerthree";

export { perspectiveCenterShift };

export interface ViewportLayoutOptions {
  /** Z plane where crates live. Default: 6 (matches BaseScene's LINKS_Z_DEPTH). */
  zDepth?: number;
  /** Pixel breakpoint below which `isMobile` is true. Default: 768. */
  mobileBreakpoint?: number;
}

export interface ViewportLayout {
  readonly frustumWidth: number;
  readonly frustumHeight: number;
  readonly aspect: number;
  /** Informational only — visual sizing keys off the continuous curves. */
  readonly isMobile: boolean;
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
  const zDepth = opts?.zDepth ?? 6;
  const mobileBreakpoint = opts?.mobileBreakpoint ?? 768;

  let sizeW = $state(0);
  let sizeH = $state(0);
  $effect(() =>
    ctx.size.subscribe((s) => {
      sizeW = s.width;
      sizeH = s.height;
    }),
  );

  // `camera.current` is imperative (not a signal) — touch sizeW/sizeH inside
  // the derive so it re-evaluates on resize, when the camera's aspect/projection
  // also update.
  const frustumWidth = $derived.by(() => {
    void sizeW;
    void sizeH;
    return visibleWidthAtDepth(
      ctx.camera.current as THREE.PerspectiveCamera | THREE.OrthographicCamera,
      zDepth,
    );
  });
  const frustumHeight = $derived.by(() => {
    void sizeW;
    void sizeH;
    return visibleHeightAtDepth(
      ctx.camera.current as THREE.PerspectiveCamera | THREE.OrthographicCamera,
      zDepth,
    );
  });
  const aspect = $derived(sizeH > 0 ? sizeW / sizeH : 1);
  const isMobile = $derived(sizeW > 0 && sizeW < mobileBreakpoint);

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
