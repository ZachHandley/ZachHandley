import type { Size } from "./types.ts";

export interface InlineRowItem {
  size: Size;
  /** Where on the item the returned position locates. Defaults to "center". */
  anchorX?: "left" | "center" | "right";
}

export interface InlineRowResult {
  /** X position for each item's anchor (in row order). */
  positions: number[];
  /** Total laid-out width of the row. */
  totalWidth: number;
}

/**
 * Lay out items left-to-right with `gap` between each, then center the whole
 * row at X=0. Each returned position is the X of the item's chosen anchor
 * (left edge, center, or right edge).
 *
 * Pure math — no Three.js types. Useful for inline icon+text rows, button
 * groups, etc.
 */
export function layoutInlineRow(items: InlineRowItem[], gap: number): InlineRowResult {
  if (items.length === 0) return { positions: [], totalWidth: 0 };

  const totalWidth = items.reduce((sum, it) => sum + it.size.width, 0) + gap * (items.length - 1);

  let cursor = -totalWidth / 2;
  const positions: number[] = [];

  for (const it of items) {
    const left = cursor;
    const anchor = it.anchorX ?? "center";
    if (anchor === "left") positions.push(left);
    else if (anchor === "right") positions.push(left + it.size.width);
    else positions.push(left + it.size.width / 2);
    cursor += it.size.width + gap;
  }

  return { positions, totalWidth };
}
