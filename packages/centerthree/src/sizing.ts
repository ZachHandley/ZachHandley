/**
 * Continuous crate-size curves and back-button dimensions.
 *
 * Replaces breakpoint-quantized "isMobile ? small : large" sizing with a
 * clamped linear interpolation over the visible frustum width, optionally
 * dampened by a portrait-aspect penalty.
 */

const SIZE_CLAMPS: Record<
  "category" | "link" | "back",
  { min: number; max: number; coef: number }
> = {
  category: { min: 2.6, max: 5.5, coef: 0.13 },
  link: { min: 1.8, max: 4.5, coef: 0.1 },
  back: { min: 1.8, max: 3.5, coef: 0.085 },
};

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
  const portraitPenalty = opts.aspect < 1 ? 0.85 : 1;
  let size = opts.frustumWidth * coef * portraitPenalty;

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
