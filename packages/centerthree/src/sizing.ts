/**
 * Continuous crate-size curves and back-button dimensions.
 *
 * Replaces breakpoint-quantized "isMobile ? small : large" sizing with a
 * clamped linear interpolation over the visible frustum width, optionally
 * dampened by a portrait-aspect penalty.
 */

export type CrateKind = "category" | "link" | "back";

/**
 * The `min` values are floors for readability/tap targets, not the intended
 * size on any real viewport. They were previously set high enough (2.6 / 1.8 /
 * 1.8) that on a phone-width frustum every curve floored out — the continuous
 * sizing degenerated to fixed sizes and the portrait penalty below was computed
 * and then thrown away by the clamp. They are now low enough that the curve
 * actually governs down to phone widths, while still clearing a ~44px tap
 * target at the narrowest viewport the rig dollies to.
 */
const SIZE_CLAMPS: Record<CrateKind, { min: number; max: number; coef: number }> = {
  category: { min: 1.55, max: 5.5, coef: 0.13 },
  link: { min: 1.05, max: 4.5, coef: 0.1 },
  back: { min: 1.05, max: 3.5, coef: 0.085 },
};

/** Clamp profile for a crate kind. Exposed so camera-rig math can seat a crate
 *  against the floor size without having to re-derive the whole size curve
 *  (which depends on the frustum, which depends on the camera — circular). */
export function crateSizeClamp(kind: CrateKind): { min: number; max: number; coef: number } {
  return SIZE_CLAMPS[kind];
}

/**
 * Portrait damping, continuous in aspect. Was a binary step at aspect 1.0
 * (`aspect < 1 ? 0.85 : 1`), which meant a 1.01-aspect window and a 0.99-aspect
 * window sized crates 15% apart across one pixel of resize. Ramps instead, and
 * is exactly 1 for every aspect >= 1 so landscape sizing is unchanged.
 */
function portraitPenalty(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  return Math.min(1, 0.7 + 0.3 * aspect);
}

export interface ContinuousCrateSizeInput {
  /** Visible scene width in world units at the crate's Z plane. */
  frustumWidth: number;
  /** Visible scene height in world units at the crate's Z plane. */
  frustumHeight: number;
  /** Viewport aspect ratio (width / height). Values < 1 trigger a portrait penalty. */
  aspect: number;
  /** Which clamp profile to use. */
  kind: "category" | "link" | "back";
  /** For 'link' only: caps the size to `(availableVerticalSpace * 0.8) / count`. */
  countPerColumn?: number;
  /** For 'link' only: usable vertical space in world units. */
  availableVerticalSpace?: number;
}

/**
 * Continuous crate edge length in world units. Driven by frustum width with a
 * clamp range and a portrait-aspect penalty.
 */
export function continuousCrateSize(opts: ContinuousCrateSizeInput): number {
  const { min, max, coef } = SIZE_CLAMPS[opts.kind];
  let size = opts.frustumWidth * coef * portraitPenalty(opts.aspect);

  if (
    opts.kind === "link" &&
    opts.countPerColumn &&
    opts.countPerColumn > 0 &&
    opts.availableVerticalSpace &&
    opts.availableVerticalSpace > 0
  ) {
    const verticalCap = (opts.availableVerticalSpace * 0.8) / opts.countPerColumn;
    size = Math.min(size, verticalCap);
  }

  return Math.max(min, Math.min(max, size));
}

/**
 * Back-button crate dimensions. Width follows the `back` continuous curve;
 * height is ~60% of width, clamped to a comfortable readable range.
 */
export function backButtonDimensions(opts: {
  frustumWidth: number;
  frustumHeight: number;
  aspect: number;
}): { width: number; height: number } {
  const width = continuousCrateSize({ ...opts, kind: "back" });
  const height = Math.max(1.1, Math.min(2.1, width * 0.6));
  return { width, height };
}
