# centerthree

Camera-aware positioning and bbox measurement helpers for Three.js scenes.

Pure TypeScript, framework-agnostic. Depends only on `three` (declared as a
peer). Designed to be lifted into its own repo when the API stabilizes.

## Install

```bash
pnpm add centerthree three
```

`three` is a peer dependency — bring your own.

## Usage

### Frustum dimensions at a depth

```ts
import { visibleHeightAtDepth, visibleWidthAtDepth } from "centerthree";

const h = visibleHeightAtDepth(camera, /* worldZ */ 6);
const w = visibleWidthAtDepth(camera, /* worldZ */ 6);
```

Works for both `PerspectiveCamera` and `OrthographicCamera`.

### Measuring rendered bboxes

```ts
import { measureObject3D, measureTroikaText } from "centerthree";

// For any Object3D — typically a freshly-built SVG group:
const { size } = measureObject3D(svgGroup);
//   size.x, size.y, size.z are in world units after the group's transform.

// For a troika-three-text Mesh after .sync() completes:
const textSize = measureTroikaText(textMesh);
//   { width, height } in local units of the text mesh.

// For GLBs with multiple meshes, pick the main body before measuring:
const primary = findPrimaryMesh(gltfRoot, { name: "Cube200" });
// falls back to largest mesh by bbox volume if no name match.
const { size, center } = measureObject3D(primary ?? gltfRoot);
```

The Threlte `<Text>` component fires `onsync` after layout; bind a ref and call
`measureTroikaText` in that callback.

### Perspective center shift

```ts
import { perspectiveCenterShift } from "centerthree";

const shift = perspectiveCenterShift(camera, crateWorldPosition, contentZ);
contentGroup.position.x += shift.x;
contentGroup.position.y += shift.y;
```

`shift` returns `{ x, y }` to add to the content's natural position so that,
viewed from an off-center perspective camera, the content lands on the
projected position of the target. Orthographic cameras get `{ x: 0, y: 0 }`.

### Inline row layout

```ts
import { layoutInlineRow } from "centerthree";

const row = layoutInlineRow(
  [
    { size: { width: 0.5, height: 0.5 }, anchorX: "center" },
    { size: { width: 1.2, height: 0.4 }, anchorX: "left" },
  ],
  /* gap */ 0.1,
);
// row.positions[0] → icon X (centered)
// row.positions[1] → text left edge X (since anchorX: "left")
```

### Continuous crate sizing

```ts
import { continuousCrateSize, backButtonDimensions } from "centerthree";

const cat = continuousCrateSize({
  frustumWidth: 18,
  frustumHeight: 10,
  aspect: 1.8,
  kind: "category",
});

const back = backButtonDimensions({ frustumWidth: 18, frustumHeight: 10, aspect: 1.8 });
```

## Math notes

**Perspective shift derivation.** Camera at `C`, target at `K`, content plane
parallel to camera at world Z = `contentZ`. The line `C + t(K - C)` hits the
content plane at `t = (contentZ - C.z) / (K.z - C.z) = f`. The ideal content
position is `C.xy + f(K.xy - C.xy)`. The natural position (rigid copy of `K` at
`contentZ`) is `K.xy`. Their difference is `(f - 1)(K.xy - C.xy)` — what this
function returns.

**Aspect penalty.** Portrait viewports (`aspect < 1`) get crates scaled by
`0.85` so they don't dominate the vertical space.

## Status

`v0.1.0` — initial cut, used internally by the zachhandley.com portfolio site.
API may shift before `v1.0.0`.
