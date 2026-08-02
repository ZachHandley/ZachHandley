<script module lang="ts">
  // `cursor-pointer` is a single class on a single <body>, but N crates are
  // mounted at once and each used to add/remove it unconditionally. Sweep the
  // pointer from crate A onto crate B and back off B and B's leave stripped the
  // class while A was still hovered — the cursor silently stopped reflecting
  // hover for the rest of that pass. Refcount the class at module scope instead
  // so it only flips on the 0->1 and 1->0 transitions and overlapping hovers
  // compose. Module scope is what makes this shared across instances; an
  // instance-scope counter would just be the old bug with more steps.
  let cursorPointerHolders = 0;

  function acquireCursorPointer(): void {
    if (typeof document === "undefined") return;
    cursorPointerHolders += 1;
    if (cursorPointerHolders === 1) document.body.classList.add("cursor-pointer");
  }

  function releaseCursorPointer(): void {
    if (typeof document === "undefined") return;
    cursorPointerHolders = Math.max(0, cursorPointerHolders - 1);
    if (cursorPointerHolders === 0) document.body.classList.remove("cursor-pointer");
  }
</script>

<script lang="ts">
  import { T, useThrelte, useTask } from "@threlte/core";
  import { Text, useGltf } from "@threlte/extras";
  import type { IntersectionEvent } from "@threlte/extras";
  import CrateExplode from "../../models/CrateExplode.svelte";
  import * as THREE from "three";
  import { Spring, Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import { onMount, onDestroy } from "svelte";
  import type { Link as LinkType } from "~/types/baseSchemas";
  import { fetchIconData } from "~/utils/iconify";
  import { createSvgMesh, calculateVisualScale } from "~/utils/svgUtils";
  import type { DRACOLoader } from "three/examples/jsm/Addons.js";
  import {
    measureObject3D,
    measureTroikaText,
    layoutInlineRow,
    findPrimaryMesh,
  } from "centerthree";
  import { useViewportLayout } from "~/components/svelte/utils/viewportLayout.svelte";

  // Typography scale factors (fractions of crate height). These are design knobs,
  // not measurements — adjust as needed but don't pretend they're derived from anything.
  const TITLE_FONT_RATIO = 0.15;
  // Fraction of the crate face the title may occupy before it is scaled down.
  const TITLE_MAX_WIDTH_RATIO = 0.9;
  const ICON_SCALE_RATIO = 0.3;
  const DOMAIN_FONT_RATIO = 0.1;
  const INLINE_ICON_RATIO = 0.28;
  const INLINE_TEXT_RATIO = 0.18;
  const INLINE_GAP_RATIO = 0.06;

  // Minimum comfortable touch target in CSS pixels (Apple HIG and WCAG 2.5.5
  // both land on 44). The crate itself is sized by the layout curves and can
  // legitimately land below this on a phone, so the hit proxy floors it.
  const MIN_TAP_CSS_PX = 44;

  // The hit proxy sits this far in FRONT of the content plane so the raycaster
  // reaches it before the crate body — which matters because its handler is the
  // one that calls stopPropagation() (see handleClick).
  const TAP_PROXY_Z_EPSILON = 0.01;

  // Props for the component
  let {
    link,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [40, 40, 10],
    columnKey = "",
    index = 0,
    width = 4,
    height = 4,
    depth = undefined,
    explodeDistance = 5,
    explodeDuration = 1,
    resetDelay = 1500,
    resetDuration = 0.27,
    enableRotation = true,
    autoReset = false,
    onLinkClick,
    dracoLoader,
    opacity = 1,
    crateId = "",
    screenWidth = 1024,
    modalManager,
    reassembleOnMount = false,
    ref = $bindable(),
  }: {
    link: LinkType;
    position?: [number, number, number] | number;
    rotation?: [number, number, number] | number;
    scale?: [number, number, number] | number;
    columnKey?: string;
    index?: number;
    width?: number;
    height?: number;
    depth?: number;
    explodeDistance?: number;
    explodeDuration?: number;
    resetDelay?: number;
    resetDuration?: number;
    enableRotation?: boolean;
    autoReset?: boolean;
    onLinkClick?: (
      url: string,
      type: LinkType["type"],
      position: THREE.Vector3,
      category?: string,
      action?: () => void,
      crateId?: string,
    ) => void;
    dracoLoader: DRACOLoader;
    opacity?: number;
    crateId?: string;
    screenWidth?: number;
    /** `showModal` takes no coordinates: LinkModal centers itself in CSS and
     *  never read the position it used to be handed. */
    modalManager?: {
      showModal: (link: LinkType) => void;
      hideModal: () => void;
    } | null;
    /** When true, the crate mounts with content faded out, then plays the
     *  reassembly animation once. Used for the back button to give it a
     *  little entrance flourish on category view. */
    reassembleOnMount?: boolean;
  } & { ref?: THREE.Group } = $props();

  // Get Threlte context
  const { size } = useThrelte();

  // Same layout lib StackedLinks solves this crate's position and size from, so
  // the frustum the tap-target floor is measured against is the frustum the
  // crate is actually laid out in. Instantiated without the measured dragon
  // width (that lives in BaseScene), which only shifts the aspect-driven camera
  // dolly a few percent — irrelevant to a minimum.
  const layout = useViewportLayout();

  // Extract link properties (reactive to prop changes)
  const url = $derived(link?.url ?? "");
  const title = $derived(link?.name ?? "");
  const type = $derived(link?.type ?? "url");
  const category = $derived(link?.category);
  const icon = $derived(link?.icon);

  // Extract domain for icons
  function getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0];
    }
  }

  const domain = $derived(getDomain(url));

  // Color cache
  const colorCache = {
    url: "#FFA726",
    download: "#4CAF50",
    contact: "#2196F3",
    urlHover: "#ffffff",
    category: "#E91E63",
    action: "#9C27B0",
  };

  function getLinkColor(linkType: LinkType["type"] = "url", hovered = false): string {
    if (hovered) return colorCache.urlHover;

    switch (linkType) {
      case "download":
        return colorCache.download;
      case "contact":
        return colorCache.contact;
      case "category":
        return colorCache.category;
      case "action":
        return colorCache.action;
      default:
        return colorCache.url;
    }
  }

  // Position and rotation (reactive to respond to parent resize recalculations)
  let positionArray = $derived(
    Array.isArray(position)
      ? (position as [number, number, number])
      : ([position, 0, 0] as [number, number, number]),
  );
  let rotationArray = $derived(
    Array.isArray(rotation)
      ? (rotation as [number, number, number])
      : ([0, rotation, 0] as [number, number, number]),
  );

  // States
  let group = $state<THREE.Group>();
  let modelWidth = $state(1);
  let modelHeight = $state(1);
  let modelDepth = $state(1);
  let boundingBoxCalculated = $state(false);
  // Whether THIS instance currently holds a cursor-pointer refcount. It used to
  // be written and never read; it is load-bearing now, because the unmount path
  // (onDestroy) has no other way to know it still owes a release.
  let hovering = $state(false);
  let isExploding = $state(false);
  let isExploded = $state(false);
  let isFadingOut = $state(false);
  let isResetting = $state(false);
  let isReassembling = $state(false);
  let contentVisible = $state(true);
  let actionExecuted = $state(false); // Flag to prevent duplicate coordinatedAction execution

  // Tweens for smooth opacity animations
  const modelOpacityTween = new Tween(1, {
    duration: 500,
    easing: cubicInOut,
  });
  const contentOpacityTween = new Tween(1, {
    duration: 300,
    easing: cubicInOut,
  });

  // Reactive opacity values from tweens
  let modelOpacity = $derived(modelOpacityTween.current);
  let contentOpacity = $derived(contentOpacityTween.current * opacity);
  let isLoadingIcon = $state(true);
  let svgGroup = $state<THREE.Group | null>(null);
  let faviconTexture = $state<THREE.Texture | null>(null);
  let faviconLoaded = $state(false);
  let faviconLoadFailed = $state(false);
  let faviconAspectRatio = $state(1); // Default 1:1 aspect ratio
  let resetTimeout: ReturnType<typeof setTimeout> | null = null;
  let actualAnimationDuration = $derived(explodeDuration);

  // ---- measurement state ----
  // All content positioning is driven by these measured bboxes, not by guess
  // percentages. Each piece stays at opacity 0 until its bbox is known.
  let iconLocalSize = $state<{ width: number; height: number } | null>(null);
  let textLocalSize = $state<{ width: number; height: number } | null>(null);
  let titleSize = $state<{ width: number; height: number } | null>(null);
  let titleWidthPerFontUnit = $state<number | null>(null);
  let domainSize = $state<{ width: number; height: number } | null>(null);
  let inlineTextMesh = $state<THREE.Mesh | null>(null);
  let titleTextMesh = $state<THREE.Mesh | null>(null);
  let domainTextMesh = $state<THREE.Mesh | null>(null);

  // Raw mesh-local measurements at scale=1. These are properties of the GLB
  // geometry, invariant across prop changes and instance lifetime. Written
  // exactly once by the boundingBoxTask when Cube002 mounts. All position
  // values derive reactively from these + current width/height/depth props,
  // so changing prop dims (category → link-grid view → back button) updates
  // the layout instead of freezing at first-measurement values.
  let localCenterY = $state<number | null>(null);
  let localMaxZ = $state<number | null>(null);

  // Derived scales — used both by getCalculatedScale() and by the offset
  // derivations below. When width/height/depth change, these recompute.
  const scaleX = $derived(width / Math.max(modelWidth, 1e-6));
  const scaleY = $derived(height / Math.max(modelHeight, 1e-6));

  // Z scale matches X unless a caller explicitly asks for a depth. `depth` used
  // to default to 0.5 against a modelDepth of ~1.9, and nothing in the scene
  // ever passed it, so every crate was squashed to ~26% along the camera axis.
  // A still crate viewed head-on hides that; the explosion does not, because it
  // throws shards outward in all three axes — flattening Z turns a burst into an
  // in-plane shatter.
  const scaleZ = $derived(depth != null ? depth / Math.max(modelDepth, 1e-6) : scaleX);

  // Scaled model center Y in the model group's local frame. NULL until the
  // bbox has been measured; downstream uses fall back gracefully.
  const modelCenterY = $derived(localCenterY === null ? null : localCenterY * scaleY);

  // Dynamic container offsets. This was `depth * 0.4`, which with the old
  // never-overridden default of 0.5 was always exactly 0.2 — so it is pinned to
  // that, rather than growing with the now-correct depth and shoving every crate
  // toward the camera. `contentZOffset` below still tracks the real depth via
  // scaleZ, which is what actually needs to follow the crate's front face.
  const MODEL_GROUP_Z_NUDGE = 0.2;
  const containerZOffset = $derived(depth != null ? depth * 0.4 : MODEL_GROUP_Z_NUDGE);

  // Content Z = front face of the model in the outer crate's local frame,
  // plus 0.03 z-fight margin. Chain: outer → model group at (0, *, containerZOffset)
  // with scaleZ → Cube002 children with local max.z = localMaxZ. So
  // outer-local front face = containerZOffset + scaleZ * localMaxZ.
  const contentZOffset = $derived(
    localMaxZ === null ? 0.3 : containerZOffset + scaleZ * localMaxZ + 0.03,
  );

  // ---- tap target ----
  // At 390x844 the rig solves to ~34.5 CSS px per world unit on the crate plane,
  // so a link crate sitting on its 1.05-world floor (`crateSizeClamp` in
  // centerthree) renders ~36px and the back button ~36x38px — both under the 44px
  // minimum, on the two crates a phone user has to hit most. Scaling the crates up
  // to compensate would blow up the layout they were solved into, so the visible
  // geometry keeps its size and an invisible proxy carries the touch.
  //
  // World-per-pixel is just the frustum width at the crate plane over the canvas
  // width in CSS px (Threlte's `size` is getBoundingClientRect-based, so it is
  // already CSS px, not device px). `$derived` rather than a mount-time constant
  // because both terms move on every resize and orientation change.
  //
  // Measured at LINKS_Z_DEPTH; the back button parks 2 units nearer the camera
  // and so already reads larger than that plane, which only makes its floor
  // conservative. A tap target erring large is the harmless direction.
  const canvasWidthPx = $derived($size?.width ?? 0);
  const MIN_TAP_WORLD = $derived(
    canvasWidthPx > 0 ? (MIN_TAP_CSS_PX * layout.frustumWidth) / canvasWidthPx : 0,
  );
  const tapW = $derived(Math.max(width, MIN_TAP_WORLD));
  const tapH = $derived(Math.max(height, MIN_TAP_WORLD));

  // Stable identifier for this crate's scene-graph objects. See the note above
  // the template for why this is keyed off crateId rather than column/index.
  const sceneKey = $derived(crateId || `${columnKey}-${index}`);

  // Usable label width on the crate's front panel — the crate face inset by the
  // model's wooden frame.
  const titleMaxWidth = $derived(width * TITLE_MAX_WIDTH_RATIO);

  // Shrink the title only as far as it needs to fit. Long labels used to render
  // at full size and spill past the panel (see onTitleTextSync).
  const titleFontSize = $derived.by(() => {
    const base = height * TITLE_FONT_RATIO;
    if (!titleWidthPerFontUnit || titleWidthPerFontUnit <= 0) return base;
    return Math.min(base, titleMaxWidth / titleWidthPerFontUnit);
  });

  const inlineMeasured = $derived(
    iconLocalSize !== null && textLocalSize !== null && modelCenterY !== null,
  );
  const normalMeasured = $derived(
    titleSize !== null && iconLocalSize !== null && domainSize !== null && modelCenterY !== null,
  );
  const contentMeasured = $derived(link.inlineIcon ? inlineMeasured : normalMeasured);

  // Push the model so its visible bbox center sits at parent Y=0. Falls back
  // to the legacy estimate while the measurement is still pending so first
  // frame doesn't snap.
  const containerYOffset = $derived(modelCenterY !== null ? -modelCenterY : height * -0.7);

  // ---- inline (icon + text) layout ----
  const inlineIconScale = $derived(height * INLINE_ICON_RATIO);
  const inlineGap = $derived(height * INLINE_GAP_RATIO);
  const inlineLayout = $derived.by(() => {
    if (!iconLocalSize || !textLocalSize) {
      return { iconX: 0, textX: 0, totalWidth: 0 };
    }
    const iconWorld = {
      width: iconLocalSize.width * inlineIconScale,
      height: iconLocalSize.height * inlineIconScale,
    };
    const row = layoutInlineRow(
      [
        { size: iconWorld, anchorX: "center" },
        { size: textLocalSize, anchorX: "left" },
      ],
      inlineGap,
    );
    return { iconX: row.positions[0], textX: row.positions[1], totalWidth: row.totalWidth };
  });

  // ---- 3-section (title / icon / domain) layout ----
  // Vertical distribution: top-margin + title + gap + icon + gap + domain + bottom-margin.
  // All four "free slots" equal, computed from the measured item heights.
  const normalIconScale = $derived(height * ICON_SCALE_RATIO);
  const normalLayout = $derived.by(() => {
    if (!titleSize || !iconLocalSize || !domainSize) {
      return { titleY: 0, iconY: 0, domainY: 0 };
    }
    const tH = titleSize.height;
    const iH = iconLocalSize.height * normalIconScale;
    const dH = domainSize.height;
    const free = Math.max(0, height - tH - iH - dH);
    const gap = free / 4;
    const titleY = height / 2 - gap - tH / 2;
    const iconY = titleY - tH / 2 - gap - iH / 2;
    const domainY = iconY - iH / 2 - gap - dH / 2;
    return { titleY, iconY, domainY };
  });

  // No parallax correction needed: the content group is a child of the same
  // outer crate group as the model. They share a single world transform and
  // project to the same screen coordinates by construction. The previous
  // `perspectiveCenterShift` math computed a fictitious off-axis offset
  // (worse, against an `ENV_SCALE`-shifted target that StackedLinks doesn't
  // live under), which was the entire source of the horizontal label drift.

  function onInlineTextSync() {
    if (!inlineTextMesh) return;
    textLocalSize = measureTroikaText(inlineTextMesh as any);
  }
  function onTitleTextSync() {
    if (!titleTextMesh) return;
    titleSize = measureTroikaText(titleTextMesh as any);

    // Record the title's width per unit of font size. Troika honours `maxWidth`
    // by WRAPPING, which `whiteSpace="nowrap"` disables — so a long single word
    // like "Professional" silently overflows the crate's front panel and gets
    // clipped by its wooden frame. Rendered width is linear in font size, so
    // dividing it out gives a font-size-independent constant; deriving the font
    // size back from that converges in one sync instead of oscillating.
    const usedFontSize = (titleTextMesh as unknown as { fontSize?: number }).fontSize;
    if (titleSize && usedFontSize && usedFontSize > 0 && titleSize.width > 0) {
      titleWidthPerFontUnit = titleSize.width / usedFontSize;
    }
  }
  function onDomainTextSync() {
    if (!domainTextMesh) return;
    domainSize = measureTroikaText(domainTextMesh as any);
  }

  // Scale spring for hover effect
  const scaleSpring = new Spring(1, {
    stiffness: 0.1,
    damping: 0.4,
  });
  let hoverScale = $state(1);

  // Update hover scale when spring changes
  $effect(() => {
    hoverScale = scaleSpring.current;
  });

  // Create texture loader
  const textureLoader = new THREE.TextureLoader();

  // Simple GLTF type for bounding box calculations only
  type GLTFResult = {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.MeshStandardMaterial>;
  };

  // Load GLTF only for bounding box calculations. Wrapped in an IIFE so the
  // `dracoLoader` prop read is inside a function scope (silences
  // `state_referenced_locally`) while keeping `gltf` as a direct store binding —
  // required for the `$gltf` auto-subscription used below.
  const gltf = (() =>
    useGltf<GLTFResult>("/models/CrateExplode-transformed.glb", {
      dracoLoader,
    }))();

  // CrateExplode component reference for animations
  let crateExplodeRef: any = null;

  // Calculate bounding box and content positions on every frame until the
  // CrateExplode child has actually mounted Cube002 into the scene tree.
  // Why useTask instead of $effect:
  //   This component spawns a child <CrateExplode> that loads the same GLB
  //   via its own useGltf + {#await gltf}{:then} render block. There's no
  //   synchronous signal from "our $gltf resolved" to "child has rendered
  //   Cube002 into our group". An $effect that fires on $gltf can run BEFORE
  //   the child's {:then} block, in which case getObjectByName returns null,
  //   setFromObject returns an empty Box3 (Infinity bounds), scaleY blows up,
  //   and crates render at huge scale off-screen. useTask polls every frame
  //   until the bbox is real, then stops.
  const boundingBoxTask = useTask(
    () => {
      if (!group || !$gltf) return;
      if (boundingBoxCalculated) return;

      // CrateExplode.svelte wraps the visible crate body in
      //   <T.Group name="Cube002" position={[0, 2.95, -0.2]} scale={1.21}>
      //     <T.Mesh name="Cube001" .../>
      //     <T.Mesh name="Cube001_1" .../>
      //   </T.Group>
      // Measure in PURE LOCAL FRAME — bypass matrixWorld entirely. The
      // GLTF animation mixer (useGltfAnimations in CrateExplode.svelte)
      // mutates intermediate matrixWorld values once the explode/reassemble
      // mixer has been primed; setFromObject(cube002) then returns world
      // coords whose offset doesn't match the bind:ref group's world
      // position, and the subtraction-based local-frame derivation breaks.
      //
      // Only the GEOMETRY bbox is animation-invariant. Cube002's own
      // position/scale are NOT: the GLB's `Cube.002Action` clip keyframes that
      // exact node — decoding it shows scale 1.21370 -> 0.00285 by t=0.0833s and
      // translation flung out to [-73.357, 5.3053, 75.915], clamped there for the
      // rest of the explosion. Sampling those mid- or post-explosion would report
      // a model ~426x shorter than it is and inflate scaleY by the same factor.
      // So this must run exactly once, BEFORE any explosion can start. Two things
      // guarantee that: the `boundingBoxCalculated` latch (which also stops the
      // task — see the `running` option), and stage ordering — this task is on
      // Threlte's mainStage, which the render stage is created `after`, so the
      // measurement lands on the first frame Cube002 exists while an explosion
      // can only be triggered by a click on an already-rendered frame.
      const cube002 = group.getObjectByName("Cube002");
      if (!cube002 || cube002.children.length === 0) return;
      const cube001 = group.getObjectByName("Cube001") as THREE.Mesh | null;
      if (!cube001 || !cube001.geometry) return;
      if (!cube001.geometry.boundingBox) cube001.geometry.computeBoundingBox();
      const bb = cube001.geometry.boundingBox;
      if (!bb || bb.isEmpty()) return;

      // The visible body is TWO submeshes: Cube001 is the panel (Material.003)
      // and Cube001_1 is the wooden frame (Material.004). The frame is the
      // frontmost geometry — its local max.z is 1.0 against the panel's 0.9737 —
      // so the content plane has to clear the FRAME, not the panel, or the frame
      // renders in front of the label and eats the first and last glyph.
      //
      // This only became visible once the crate's depth was corrected: at the old
      // squashed scaleZ (~0.26) the frame stood 0.007 world units proud of the
      // panel and the 0.03 margin below cleared it by accident. At true depth it
      // stands 0.054 proud, and the margin no longer covers it.
      const cube001Frame = group.getObjectByName("Cube001_1") as THREE.Mesh | null;
      let frontLocalMaxZ = bb.max.z;
      if (cube001Frame?.geometry) {
        if (!cube001Frame.geometry.boundingBox) cube001Frame.geometry.computeBoundingBox();
        const fbb = cube001Frame.geometry.boundingBox;
        if (fbb && !fbb.isEmpty()) frontLocalMaxZ = Math.max(frontLocalMaxZ, fbb.max.z);
      }

      const c2sx = cube002.scale.x;
      const c2sy = cube002.scale.y;
      const c2sz = cube002.scale.z;

      // Width/height/centre stay keyed to the panel: that is the face the label
      // and icon are laid out against, and it is what `width`/`height` mean to
      // callers. Only the content's Z clearance needs the frame.
      modelWidth = (bb.max.x - bb.min.x) * c2sx;
      modelHeight = (bb.max.y - bb.min.y) * c2sy;
      modelDepth = (bb.max.z - bb.min.z) * c2sz;
      localCenterY = ((bb.min.y + bb.max.y) / 2) * c2sy + cube002.position.y;
      localMaxZ = frontLocalMaxZ * c2sz + cube002.position.z;

      boundingBoxCalculated = true;
    },
    // useTask's callback return value is IGNORED in Threlte 8 — the signature is
    // `(delta: number) => void` — so the `return true` / `return false` this used
    // to end on stopped nothing and every crate re-ran this measurement on every
    // frame for its whole lifetime. `running` is the supported switch (`start` /
    // `stop` are deprecated in 8), and it takes a getter so the `$state` latch
    // drives it.
    { running: () => !boundingBoxCalculated },
  );

  // Simple animation functions using CrateExplode component
  function playExplosion() {
    console.log(`🎬 playExplosion called for '${title}' - crateExplodeRef:`, crateExplodeRef);
    if (crateExplodeRef && typeof crateExplodeRef.explode === "function") {
      console.log(`🎬 Calling crateExplodeRef.explode() for '${title}'`);
      crateExplodeRef.explode();
    } else {
      console.warn(`🎬 Cannot call explode - ref not available for '${title}'`);
    }
  }

  // `seedTime` is only passed by the mount flourish, which needs the shards
  // scattered to a state the crate was never actually in. A real reassembly
  // rewinds from wherever the explosion got to.
  function playReassembly(seedTime?: number) {
    if (crateExplodeRef && typeof crateExplodeRef.reset === "function") {
      crateExplodeRef.reset(seedTime);
    }
  }

  // Handle opacity animations with proper timing coordination
  $effect(() => {
    const isNavigationLink = type === "category" || type === "action";

    if (isExploding) {
      if (isNavigationLink) {
        // Navigation links: Keep content/model visible during explosion for visual feedback
        // The actual view transition will handle overall fading via parent opacity
        contentVisible = true;
        modelOpacityTween.set(1);
        contentOpacityTween.set(1);
      } else {
        // Regular links: Hide content during explosion, keep model visible to show explosion
        contentOpacityTween.set(0);
        contentVisible = false;
        modelOpacityTween.set(1); // Keep model visible during explosion
      }
    } else if (isReassembling) {
      // During reassembly: Hide content, let CrateExplode component handle its own opacity
      contentOpacityTween.set(0);
      contentVisible = false;
      modelOpacityTween.set(1); // Let CrateExplode handle individual piece opacity
    } else if (isFadingOut) {
      // Fade out exploded pieces after explosion completes
      modelOpacityTween.set(0);
      contentOpacityTween.set(0);
      contentVisible = false;
    } else if (isExploded && !isFadingOut && !isReassembling) {
      // Exploded and faded out - stay hidden until reassembly
      modelOpacityTween.set(0);
      contentOpacityTween.set(0);
      contentVisible = false;
    } else if (!isExploded) {
      // Normal state - fade everything in
      contentOpacityTween.set(1);
      contentVisible = true;
      modelOpacityTween.set(1);
    }
  });

  // Pointer events.
  //
  // Hover is a mouse-only affordance. A tap on a touchscreen still produces a
  // pointerenter, so on a phone every tap used to swell the crate to 1.05 and
  // paint a `cursor-pointer` nobody can see — and the matching leave is not
  // reliable (see onDestroy), so it could stick. Threlte hands the underlying DOM
  // event through as `nativeEvent`, which is the only place `pointerType`
  // survives the raycast. `!== "mouse"` rather than `=== "touch"` so pen input
  // is excluded too — it has no hover state either.
  function onPointerEnter(event: IntersectionEvent<PointerEvent>) {
    const pointerType = event.nativeEvent?.pointerType;
    if (pointerType && pointerType !== "mouse") return;
    scaleSpring.set(1.05);
    // Guarded so this instance can never hold more than one refcount, whatever
    // the enter/leave pairing happens to be — an unmatched acquire would pin the
    // class on for the rest of the page's life.
    if (hovering) return;
    hovering = true;
    acquireCursorPointer();
  }

  // Deliberately NOT pointerType-guarded: a leave only ever resets state, so
  // refusing to run one can strand the crate scaled up with the cursor class
  // held. endHover is idempotent, so a leave with no matching enter (the tap we
  // skipped above) just re-settles the spring and touches no refcount.
  function onPointerLeave() {
    endHover();
  }

  // The one teardown for a hover, shared by the two ways one can end: the
  // pointer leaving, and this crate being destroyed while still under it.
  function endHover() {
    scaleSpring.set(1);
    if (!hovering) return;
    hovering = false;
    releaseCursorPointer();
  }

  // Explode animation - no automatic reassembly, modal system handles timing
  async function explodeCrate(): Promise<void> {
    console.log(
      `🧨 EXPLODE CALLED for '${title}' (${type}) with crateId='${crateId}' - Current state: exploding=${isExploding}, exploded=${isExploded}`,
    );
    console.log(
      `🧨 EXPLODE DEBUG: title='${title}', type='${type}', crateId='${crateId}', position=${JSON.stringify(positionArray)}`,
    );

    if (isExploding || isResetting || isReassembling || isExploded || isFadingOut) {
      console.log(`🚫 EXPLODE BLOCKED for '${title}' due to current state`);
      return;
    }

    if (resetTimeout) clearTimeout(resetTimeout);
    resetTimeout = null;

    isExploding = true;
    isResetting = false;
    isReassembling = false;
    isFadingOut = false;

    console.log(`🎬 Starting explosion animation for '${title}'`);

    // Phase 1: Explosion animation
    playExplosion();

    // Wait for explosion animation to complete
    console.log(`⏱️ Waiting ${actualAnimationDuration} seconds for explosion to complete`);
    await new Promise((resolve) => setTimeout(resolve, actualAnimationDuration * 1000));

    isExploding = false;
    isExploded = true;
    console.log(`✅ Explosion complete for '${title}'`);

    // Phase 2: Immediate reassembly for regular links
    const isNavigationLink = type === "category" || type === "action";

    if (!isNavigationLink) {
      // Regular links: start reassembly immediately after explosion
      console.log(`🔄 Starting immediate reassembly for '${title}' after explosion`);
      await startReassembly();
    } else {
      // Navigation links: stay exploded until view changes (no auto-reassembly)
      console.log(`🚪 Navigation link '${title}' exploded - staying visible until view changes`);
    }
  }

  // Reassembly animation - plays reverse explosion with fade-in (mixer-based timing)
  async function startReassembly(seedTime?: number): Promise<void> {
    if (isResetting || isReassembling) {
      console.log(`🚫 Reassembly blocked for '${title}' - already resetting/reassembling`);
      return;
    }
    if (resetTimeout) clearTimeout(resetTimeout);
    resetTimeout = null;

    console.log(`🔄 Starting reassembly sequence for '${title}'`);

    isReassembling = true;
    isResetting = false;
    isExploding = false;
    isFadingOut = false;

    return new Promise((resolve) => {
      // Set callback for when animation actually completes
      if (crateExplodeRef && crateExplodeRef.setReassemblyCallback) {
        crateExplodeRef.setReassemblyCallback(() => {
          console.log(`🎬 Animation mixer reports reassembly complete for '${title}'`);

          // Fade in the solid crate model and content after pieces have reassembled
          modelOpacityTween.set(1);
          contentOpacityTween.set(1);
          contentVisible = true;

          isExploded = false;
          isReassembling = false;

          console.log(`✅ Reassembly complete for '${title}' (mixer-based timing)`);
          resolve();
        });
      } else {
        console.warn(`⚠️ No crateExplodeRef available for '${title}' - falling back to timer`);
        // Fallback to timer if ref not available
        setTimeout(() => {
          modelOpacityTween.set(1);
          contentOpacityTween.set(1);
          contentVisible = true;
          isExploded = false;
          isReassembling = false;
          resolve();
        }, resetDuration * 1000);
      }

      // Start the reassembly animation
      playReassembly(seedTime);
    });
  }

  // Legacy reset function for external calls (e.g., modal triggers)
  async function resetCrate(): Promise<void> {
    console.log(`🔄 External reset called for '${title}' - delegating to startReassembly`);
    return startReassembly();
  }

  // The crate's ONE click handler, registered on the hit proxy only. It used to
  // be bound on both <CrateExplode> and the content group; two registrations on
  // two objects in one interactivity context both raycast-hit a tap that lands on
  // the text/icon plane, so the whole sequence ran twice.
  function handleClick(event: any) {
    // Stop first, before the state guard. CrateExplode keeps its own
    // `onclick={explode}` on the model group behind us, and nothing overrides it
    // now that this handler lives on the proxy instead of on the component — so a
    // click we decline (mid-reassembly, say) would fall through to that raw
    // explode() and desync the model from this component's state machine.
    event.stopPropagation();

    console.log(
      `🖱️ CLICK on '${title}' (${type}) - Current state: exploding=${isExploding}, exploded=${isExploded}`,
    );
    console.log(`🖱️ Modal manager available for '${title}':`, {
      hasModalManager: !!modalManager,
      modalManagerType: typeof modalManager,
      linkType: type,
      shouldShowModal:
        (type === "url" || type === "download" || type === "contact") && !!modalManager && !!url,
    });

    if (isExploded || isExploding || isResetting || isReassembling || isFadingOut) {
      console.log(`🚫 CLICK BLOCKED on '${title}' due to current state`);
      return;
    }

    // Reset the action executed flag for new click
    actionExecuted = false;

    const positionVector = new THREE.Vector3(
      positionArray[0],
      positionArray[1] + height / 2,
      positionArray[2],
    );

    console.log(`📡 Calling parent onLinkClick for '${title}' (${type}), passing action callback`);

    // Modal-based navigation
    const coordinatedAction = () => {
      // Prevent duplicate execution (fireball system calls this again)
      if (actionExecuted) {
        console.log(`🚫 Coordinated action already executed for '${title}' - skipping duplicate`);
        return;
      }

      actionExecuted = true;
      console.log(`🎯 Coordinated action executing for '${title}' (${type})`);
      console.log(`📋 Debug info:`, {
        type,
        hasModalManager: !!modalManager,
        hasUrl: !!url,
        url,
        isModalType: type === "url" || type === "download" || type === "contact",
      });

      // For regular navigation links, show modal if available
      if ((type === "url" || type === "download" || type === "contact") && modalManager && url) {
        // No screen coordinates. This used to project the crate's world position
        // through the camera into pixels, with two fallbacks that passed
        // `screenWidth * 0.6` — a WIDTH-derived number — as the Y coordinate. All
        // three were dead: LinkModal's calculateModalPosition ignored the position
        // it was handed and centered the modal regardless. LinkModal now centers
        // in CSS and showModal takes the link alone.
        console.log(`🚀 Modal conditions met - showing modal for '${link.name}'`);
        modalManager.showModal(link);

        // DO NOT reset immediately after modal - let the explosion/fade cycle complete naturally
        console.log(`🎬 Modal displayed - letting explosion animation complete naturally`);
      } else {
        console.log(`❌ Modal conditions NOT met:`, {
          correctType: type === "url" || type === "download" || type === "contact",
          hasModalManager: !!modalManager,
          hasUrl: !!url,
          linkType: type,
        });
      }
    };

    // Pass the coordinated action function to the parent
    console.log(`🚀 Calling onLinkClick with crateId: '${crateId}' for '${title}'`);
    onLinkClick?.(url, type, positionVector, category, coordinatedAction, crateId);
  }

  // Visual-only explosion for navigation links (no fade-out, no auto-reassembly)
  async function explodeVisualOnly(): Promise<void> {
    console.log(`🎨 VISUAL-ONLY EXPLODE for navigation link '${title}'`);

    if (isExploding || isResetting || isReassembling || isExploded || isFadingOut) {
      console.log(`🚫 VISUAL EXPLODE BLOCKED for '${title}' due to current state`);
      return;
    }

    if (resetTimeout) clearTimeout(resetTimeout);
    resetTimeout = null;

    isExploding = true;
    isResetting = false;
    isReassembling = false;
    isFadingOut = false;

    console.log(`🎬 Starting visual explosion animation for '${title}'`);

    // Phase 1: Explosion animation only
    playExplosion();

    // Wait for explosion to complete
    await new Promise((resolve) => setTimeout(resolve, actualAnimationDuration * 1000));

    isExploding = false;
    isExploded = true;

    console.log(
      `🎨 Visual explosion complete for '${title}' - staying exploded until view changes`,
    );

    // Navigation links stay exploded and visible - they will be reset when view changes
    // No fade-out animation, no auto-reassembly - the view transition handles cleanup
  }

  // Update opacity on all materials in the SVG group.
  // For inline links (back button), the icon stays at opacity 0 until both the
  // icon bbox and text bbox have been measured — same gate as the text's
  // fillOpacity below — so the pair fades in together rather than the icon
  // popping in at a stale position before the text resolves.
  function updateSvgMaterials() {
    if (!svgGroup) return;
    const gate = link.inlineIcon ? (inlineMeasured ? 1 : 0) : normalMeasured ? 1 : 0;
    const targetOpacity = contentOpacity * opacity * gate;

    // Recursively traverse all objects in the group
    svgGroup.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        if (Array.isArray(object.material)) {
          // Handle multi-material meshes
          object.material.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.transparent = true;
              mat.opacity = targetOpacity;

              // Make it emissive to ensure visibility
              if ("emissive" in mat) {
                mat.emissive = new THREE.Color(0xffffff);
                mat.emissiveIntensity = 0.7;
              } else {
                // Replace with a material that supports emission if needed
                const newMat = new THREE.MeshStandardMaterial({
                  color: 0xffffff,
                  emissive: 0xffffff,
                  emissiveIntensity: 0.7,
                  transparent: true,
                  opacity: targetOpacity,
                  side: THREE.DoubleSide,
                });
                object.material = newMat;
              }

              mat.needsUpdate = true;
            }
          });
        } else if (object.material instanceof THREE.MeshStandardMaterial) {
          // Handle single materials
          object.material.transparent = true;
          object.material.opacity = targetOpacity;

          // Make it emissive to ensure visibility
          if ("emissive" in object.material) {
            object.material.emissive = new THREE.Color(0xffffff);
            object.material.emissiveIntensity = 0.7;
          } else {
            // Replace with a material that supports emission
            const newMat = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              emissive: 0xffffff,
              emissiveIntensity: 0.7,
              transparent: true,
              opacity: targetOpacity,
              side: THREE.DoubleSide,
            });
            object.material = newMat;
          }

          object.material.needsUpdate = true;
        }
      }
    });
  }

  // Load favicon using fetch to avoid CORS issues
  async function loadFaviconWithFetch(url: string): Promise<THREE.Texture | null> {
    try {
      // Use a proxy service or create a server-side proxy for CORS issues
      // For local development/demo, we'll try a direct fetch but this often fails due to CORS
      const response = await fetch(
        `${import.meta.env.SITE}/api/utils/${encodeURIComponent(url)}.json`,
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      // Get the blob
      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob);

      // Load the texture using the blob URL
      return new Promise((resolve, reject) => {
        textureLoader.load(
          blobUrl,
          (texture) => {
            // Set proper filtering
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;

            // Clean up the blob URL after texture is loaded
            URL.revokeObjectURL(blobUrl);

            resolve(texture);
          },
          undefined,
          (error) => {
            URL.revokeObjectURL(blobUrl); // Clean up on error too
            reject(error);
          },
        );
      });
    } catch (error) {
      console.warn(`Failed to load favicon from ${url}:`, error);
      return null;
    }
  }

  // Try to load favicon from several sources
  async function loadFavicon() {
    if (!domain || type === "category" || type === "action") {
      faviconLoadFailed = true;
      return;
    }

    try {
      const texture = await loadFaviconWithFetch(domain);
      if (texture) {
        faviconTexture = texture;
        faviconLoaded = true;

        // Calculate aspect ratio for proper scaling
        if (texture.image) {
          faviconAspectRatio = texture.image.width / Math.max(texture.image.height, 1);
        }

        // Populate iconLocalSize so the layout gate (contentMeasured) doesn't
        // wait on an SVG that will never load. The favicon plane is rendered
        // at the size returned by getFaviconScale() (height * 0.4 in world
        // units, aspect-corrected); we represent that here as a unit-height
        // intrinsic with the matching aspect — normalLayout multiplies by
        // normalIconScale (=height*ICON_SCALE_RATIO) when allocating the row,
        // and the favicon plane scales independently via its own getFaviconScale.
        iconLocalSize = {
          width: faviconAspectRatio,
          height: 1,
        };

        return; // Success, no need to try other URLs
      }

      // If all attempts failed, try a fallback approach using a browser image
      // (this won't work in all environments but worth trying)
      await loadFallbackFavicon();
    } catch (error) {
      console.error("Error loading favicon:", error);
      faviconLoadFailed = true;
    }
  }

  // Alternative approach using HTML Image element (may work in some environments)
  async function loadFallbackFavicon() {
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined") {
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = "same-origin";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);

          // Create texture from canvas
          const texture = new THREE.Texture(canvas);
          texture.needsUpdate = true;
          faviconTexture = texture;
          faviconLoaded = true;
          faviconAspectRatio = img.width / Math.max(img.height, 1);
          // Same reasoning as loadFavicon: populate iconLocalSize so the
          // layout gate doesn't stick waiting for an SVG measurement.
          iconLocalSize = {
            width: faviconAspectRatio,
            height: 1,
          };
        }

        resolve();
      };

      img.onerror = () => {
        faviconLoadFailed = true;
        resolve();
      };

      // Try Google's service which often works
      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

      // Set a timeout just in case
      setTimeout(() => {
        if (!faviconLoaded) {
          faviconLoadFailed = true;
          resolve();
        }
      }, 3000);
    });
  }

  // One-time initialization
  onMount(async () => {
    try {
      // First try to load icon specified in link
      if (link.icon) {
        const svgData = await fetchIconData(link);
        if (svgData) {
          // Create SVG mesh with increased extrusion
          svgGroup = createSvgMesh(svgData, {
            color: "white",
            fillColor: "white",
            scale: 0.05,
            center: true,
            // Increased extrusion for better visibility
            extrude: 0.2,
          });

          // Set materials to be emissive and properly visible
          updateSvgMaterials();

          // Measure the SVG group's intrinsic bbox for the inline layout.
          // measureObject3D forces updateMatrixWorld; safe to call on an
          // unparented helper.
          if (svgGroup) {
            const { size } = measureObject3D(svgGroup);
            iconLocalSize = {
              width: size.x || 1,
              height: size.y || 1,
            };
          }
        } else if (type === "url" && domain) {
          // If icon from link fails but it's a URL type, try favicon
          await loadFavicon();
        }
      } else if (type === "url" && domain) {
        // No icon specified but we have a URL - try to load favicon
        await loadFavicon();
      } else {
        // Try with default globe icon for URL types
        if (type === "url") {
          const defaultIcon = { prefix: "mdi", name: "earth" };
          const svgData = await fetchIconData({ ...link, icon: defaultIcon });

          if (svgData) {
            svgGroup = createSvgMesh(svgData, {
              color: "white",
              fillColor: "white",
              scale: 0.05,
              center: true,
              extrude: 0.2,
            });

            updateSvgMaterials();

            if (svgGroup) {
              const { size } = measureObject3D(svgGroup);
              iconLocalSize = {
                width: size.x || 1,
                height: size.y || 1,
              };
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading icon:", error);
      faviconLoadFailed = true;
    } finally {
      isLoadingIcon = false;
      // Failsafe: if no icon path populated iconLocalSize (e.g. all icon
      // sources failed and there's no domain to favicon-fall-back on),
      // default it. Otherwise the contentMeasured gate sticks at false and
      // the title/domain text never render — i.e. a row with an empty
      // `icon` field would silently hide all its text.
      if (iconLocalSize === null) {
        iconLocalSize = { width: 1, height: 1 };
      }
    }

    // Optional entrance flourish: start exploded, then reassemble. Only fires
    // once per mount. Crate model + content stay invisible until reassembly
    // completes, at which point the reassembly callback restores their opacity.
    if (reassembleOnMount && crateExplodeRef?.setReassemblyCallback) {
      modelOpacityTween.set(0);
      contentOpacityTween.set(0);
      contentVisible = false;
      isExploded = true;
      // Seed to `explodeDuration`, not the end of the clip. The shard clips run
      // 10.4s but an explosion only ever plays their first second, so seeding to
      // the end scattered the back button ~1024 units and took ~10s to converge —
      // it was still raining debris by the time you could click it.
      void startReassembly(explodeDuration);
    }
  });

  // Update SVG materials when opacity changes
  $effect(() => {
    updateSvgMaterials();
  });

  // Crate material opacity is NOT handled here — `modelOpacity` is handed to
  // <CrateExplode>, which owns it. This component used to re-clone the material
  // of all ~55 meshes inside the frame task and then write opacity onto them
  // here, which (a) orphaned the two per-instance clones CrateExplode had already
  // made, (b) left Threlte's declared `material=` prop permanently pointing at a
  // different object than the live `mesh.material`, and (c) disposed in a
  // component that never created them. The name-skip that spared Cube001 /
  // Cube001_1 / Cube.002 "so CrateExplode can handle their opacity" rested on a
  // false premise: `opacity=` on a T.Mesh/T.Group is an inert no-op (Object3D has
  // no opacity), so the crate body never faded at all — the shards went
  // transparent while the coplanar body stayed fully opaque, and the result read
  // as z-fighting speckle rather than a fade.

  // Clean up on destroy
  onDestroy(() => {
    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }

    // A crate can be destroyed mid-hover — which is exactly what tapping a
    // category crate does: explode, transition, unmount, with the pointer still
    // on it. Threlte's cancelPointer then looks up handlers for an object whose
    // entry the interactivity plugin's own cleanup already dropped via
    // removeInteractiveObject, so onPointerLeave never fires and the body class
    // would stay on for the rest of the session. Release what we still hold.
    endHover();

    // Clean up textures
    if (faviconTexture) {
      faviconTexture.dispose();
    }
  });

  // Calculate scale based on bounding box
  function getCalculatedScale() {
    if (!boundingBoxCalculated) {
      return [1, 1, 1];
    }

    return [scaleX, scaleY, scaleZ];
  }

  // Get favicon scale to maintain aspect ratio
  function getFaviconScale() {
    const iconSize = height * 0.4; // Base icon size (40% of crate height)

    // Ensure favicon maintains its aspect ratio
    if (faviconAspectRatio > 1) {
      // Wider than tall - constrain by width
      return [iconSize, iconSize / faviconAspectRatio, 1.25];
    } else {
      // Taller than wide or square - constrain by height
      return [iconSize * faviconAspectRatio, iconSize, 1.25];
    }
  }

  // External reset function for view changes (immediate, no animation)
  function resetToDefault(): void {
    console.log(`🔄 Resetting '${title}' to default state (view change)`);

    // Clear any pending timeouts
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }

    // Reset all states to default
    isExploding = false;
    isExploded = false;
    isFadingOut = false;
    isResetting = false;
    isReassembling = false;
    contentVisible = true;
    actionExecuted = false; // Reset action flag

    // Reset opacity tweens to full
    modelOpacityTween.set(1);
    contentOpacityTween.set(1);

    // Snap, don't animate. This function's whole contract is "immediate, no
    // animation" — it runs on view changes, against crates that were just
    // mounted and have nothing to play back. Calling the animated reset() here
    // is what made every category crate visibly explode-and-reassemble on each
    // Back press.
    if (crateExplodeRef && typeof crateExplodeRef.snapToRest === "function") {
      crateExplodeRef.snapToRest();
    }
  }

  // Function for modal system to call when modal is closed - triggers reassembly
  function onModalClosed(): Promise<void> {
    console.log(`🖼️ Modal closed for '${title}' - triggering reassembly`);
    return startReassembly();
  }

  /**
   * Explosion entry point for the crate registry (i.e. "a fireball just hit me").
   *
   * Purely visual — it does NOT run the navigation action, despite the name it
   * inherited. FireballSystem.completeFireball already owns that sequencing: it
   * calls this, waits 1500ms so the burst is actually on screen, and only then
   * awaits the stored action.
   *
   * This used to invoke `actionFunction()` itself, at t=0. For a category crate
   * that meant `selectCategory` flipped the view and unmounted the crate roughly
   * 300ms into its own explosion, so the burst was never visible — measured peak
   * shard displacement 6.32 world units against a resting 2.92, where a burst
   * that plays out reaches ~455. It also meant the action ran TWICE: once here
   * and again from completeFireball 1.5s later, which is why one tap of the back
   * button fired goBack() twice.
   */
  function explodeFromFireball(): Promise<void> {
    // Navigation crates stay exploded until the view change unmounts them;
    // regular links auto-reassemble and fade back in.
    return type === "category" || type === "action" ? explodeVisualOnly() : explodeCrate();
  }

  // Expose functions to parent
  export {
    explodeCrate,
    resetCrate,
    startReassembly,
    resetToDefault,
    explodeVisualOnly,
    explodeFromFireball,
    onModalClosed,
  };
</script>

<!-- Scene-graph object names. Keyed off `crateId` — the same key the crate is
     registered under in CrateController — so an object found in the scene can be
     traced straight back to its registry entry. The old `${columnKey}-${index}`
     naming collided: the back button passes neither, so it took the same name as
     the first left-column crate. Falls back to column/index for any caller that
     does not supply a crateId. -->
<!-- Main container -->
<T.Group
  position={[positionArray[0], positionArray[1], positionArray[2]]}
  rotation={[rotationArray[0], rotationArray[1], rotationArray[2]]}
  name={`crate-link-${sceneKey}`}
>
  <!-- Crate model container (offsets applied here so only the model moves, not the content) -->
  <T.Group
    bind:ref={group}
    scale={getCalculatedScale() as [number, number, number]}
    position={[0, containerYOffset, containerZOffset]}
    {height}
    {width}
    {depth}
  >
    <!-- Use CrateExplode component for animation. It is the single owner of the
         crate's material opacity: it clones the GLB's two shared materials
         per-instance and writes modelOpacity into them, so nothing out here may
         touch mesh materials. Pointer handlers live on the hit proxy below, not
         on this component — one registration per crate. -->
    <CrateExplode
      bind:this={crateExplodeRef}
      {modelOpacity}
      scale={[hoverScale, hoverScale, hoverScale]}
    />
  </T.Group>

  <!-- Tap proxy: the crate's only click/hover target.
       `visible={false}` would be the wrong tool — three's raycaster does not
       consult `visible`, so the mesh would still be hit and we'd have hidden it
       for nothing. `colorWrite={false}` is what actually makes it contribute no
       pixels while staying raycastable, and `depthWrite={false}` keeps it out of
       the depth buffer so it cannot occlude the text sitting just behind it.
       Sized to the crate but never smaller than MIN_TAP_WORLD, so a crate that
       renders below 44 CSS px is still comfortably hittable. -->
  <T.Mesh
    position={[0, 0, contentZOffset + TAP_PROXY_Z_EPSILON]}
    name={`crate-hit-${sceneKey}`}
    onclick={handleClick}
    onpointerenter={onPointerEnter}
    onpointerleave={onPointerLeave}
  >
    <T.PlaneGeometry args={[tapW, tapH]} />
    <T.MeshBasicMaterial transparent={true} opacity={0} depthWrite={false} colorWrite={false} />
  </T.Mesh>

  <!-- Content Container -->
  <!-- Anchored at outer-frame (0, 0, contentZOffset). No X/Y offset: model
       and content share this outer group, so their screen projection
       coincides automatically. contentZOffset is computed from the model's
       measured front-face Z + 0.03 z-fight margin (see boundingBoxTask). -->
  {#if contentVisible}
    <T.Group
      position={[0, 0, contentZOffset]}
      rotation={[0, 0, 0]}
      name={`crate-content-${sceneKey}`}
      scale={[hoverScale, hoverScale, hoverScale]}
    >
      {#if link.inlineIcon && svgGroup}
        <!-- Inline icon + text layout for buttons like "← Back".
             The crate model is centered at parent Y=0 (via measured containerYOffset),
             so this group sits at Y=0 to land on the model's vertical center.
             Icon + text X positions come from layoutInlineRow over measured bboxes. -->
        <T.Group position={[0, 0, 0]}>
          <T.Group
            position={[inlineLayout.iconX, 0, 0]}
            scale={[inlineIconScale, inlineIconScale, 1]}
          >
            <T is={svgGroup} />
          </T.Group>
          <T.Group position={[inlineLayout.textX, 0, 0]}>
            <Text
              bind:ref={inlineTextMesh as any}
              text={title}
              color="white"
              fontSize={height * INLINE_TEXT_RATIO}
              fontWeight="bold"
              whiteSpace="nowrap"
              anchorX="left"
              anchorY="middle"
              maxWidth={width * 0.8}
              textAlign="left"
              fillOpacity={contentMeasured ? contentOpacity * opacity : 0}
              transparent={true}
              onsync={onInlineTextSync}
            />
          </T.Group>
        </T.Group>
      {:else}
        <!-- Normal 3-section layout — Y positions computed from measured bboxes
             via normalLayout. Each Text binds a ref + onsync so its rendered
             height feeds back into the layout math. -->
        <T.Group position={[0, normalLayout.titleY, 0]}>
          <Text
            bind:ref={titleTextMesh as any}
            text={title}
            color="white"
            fontSize={titleFontSize}
            fontWeight="bold"
            whiteSpace="nowrap"
            anchorX="center"
            anchorY="middle"
            maxWidth={titleMaxWidth}
            textAlign="center"
            fillOpacity={contentMeasured ? contentOpacity * opacity : 0}
            transparent={true}
            onsync={onTitleTextSync}
          />
        </T.Group>

        <!-- Icon area in center -->
        <T.Group position={[0, normalLayout.iconY, 0]}>
          {#if isLoadingIcon}
            <Text
              text="..."
              color="white"
              fontSize={height * TITLE_FONT_RATIO}
              anchorX="center"
              anchorY="middle"
              fillOpacity={contentOpacity * opacity}
              transparent={true}
            />
          {:else if svgGroup}
            <T.Group scale={[normalIconScale, normalIconScale, 1]}>
              <T is={svgGroup} />
            </T.Group>
          {:else if faviconLoaded && faviconTexture}
            <T.Mesh scale={[getFaviconScale()[0], getFaviconScale()[1], getFaviconScale()[2]]}>
              <T.PlaneGeometry args={[1, 1, 1]} />
              <T.MeshStandardMaterial
                map={faviconTexture}
                roughness={0.1}
                metalness={0.1}
                transparent={true}
                opacity={contentOpacity * opacity}
                side={THREE.DoubleSide}
              />
            </T.Mesh>
          {:else}
            <T.Mesh scale={[height * 0.25, height * 0.25, 1]}>
              <T.CircleGeometry args={[1, 32]} />
              <T.MeshBasicMaterial
                color="white"
                transparent={true}
                opacity={contentOpacity * opacity}
              />
            </T.Mesh>
          {/if}
        </T.Group>
      {/if}

      <!-- Domain/category text at bottom (only for normal layout) -->
      {#if !link.inlineIcon && (domain || category)}
        <T.Group position={[0, normalLayout.domainY, 0]}>
          <Text
            bind:ref={domainTextMesh as any}
            text={domain ?? category ?? ""}
            color="white"
            fontSize={height * DOMAIN_FONT_RATIO}
            anchorX="center"
            anchorY="middle"
            maxWidth={width * 0.9}
            fillOpacity={contentMeasured ? contentOpacity * opacity : 0}
            transparent={true}
            onsync={onDomainTextSync}
          />
        </T.Group>
      {/if}
    </T.Group>
  {/if}
</T.Group>
