<script lang="ts">
  import { T, useThrelte } from "@threlte/core";
  import { Text, useGltf } from "@threlte/extras";
  import CrateExplode from "../../models/CrateExplode.svelte";
  import * as THREE from "three";
  import { Spring, Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import { onMount, onDestroy } from "svelte";
  import type { Link as LinkType } from "~/types/baseSchemas";
  import { fetchIconData } from "~/utils/iconify";
  import { createSvgMesh, calculateVisualScale } from "~/utils/svgUtils";
  import type { DRACOLoader } from "three/examples/jsm/Addons.js";
  import { perspectiveCenterShift } from "~/components/svelte/utils/viewportLayout.svelte";
  import {
    measureObject3D,
    measureTroikaText,
    layoutInlineRow,
    findPrimaryMesh,
  } from "centerthree";

  // Typography scale factors (fractions of crate height). These are design knobs,
  // not measurements — adjust as needed but don't pretend they're derived from anything.
  const TITLE_FONT_RATIO = 0.15;
  const ICON_SCALE_RATIO = 0.3;
  const DOMAIN_FONT_RATIO = 0.1;
  const INLINE_ICON_RATIO = 0.28;
  const INLINE_TEXT_RATIO = 0.18;
  const INLINE_GAP_RATIO = 0.06;

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
    depth = 0.5,
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
    modalManager?: {
      showModal: (link: LinkType, x: number, y: number) => void;
      hideModal: () => void;
    } | null;
    /** When true, the crate mounts with content faded out, then plays the
     *  reassembly animation once. Used for the back button to give it a
     *  little entrance flourish on category view. */
    reassembleOnMount?: boolean;
  } & { ref?: THREE.Group } = $props();

  // Get Threlte context
  const { size, camera } = useThrelte();

  // Mobile detection - prefer Threlte renderer size, fallback to passed screenWidth
  let isMobile = $derived(($size?.width ?? screenWidth) < 768);

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
  let hovering = $state(false);
  let isExploding = $state(false);
  let isExploded = $state(false);
  let isFadingOut = $state(false);
  let isResetting = $state(false);
  let isReassembling = $state(false);
  let contentVisible = $state(true);
  let actionExecuted = $state(false); // Flag to prevent duplicate coordinatedAction execution
  let materialsCloned = $state(false); // Flag to track if materials have been cloned for this instance
  let clonedMaterials = $state<THREE.Material[]>([]); // Store cloned materials for this instance

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

  // Content Z position - store as state instead of derived
  let contentZOffset = $state(0.3);

  // Dynamic container offsets based on crate dimensions (using $derived for reactive computation)
  let containerZOffset = $derived(depth * 0.4);

  // ---- measurement state ----
  // All content positioning is driven by these measured bboxes, not by guess
  // percentages. Each piece stays at opacity 0 until its bbox is known.
  let iconLocalSize = $state<{ width: number; height: number } | null>(null);
  let textLocalSize = $state<{ width: number; height: number } | null>(null);
  let titleSize = $state<{ width: number; height: number } | null>(null);
  let domainSize = $state<{ width: number; height: number } | null>(null);
  let inlineTextMesh = $state<THREE.Mesh | null>(null);
  let titleTextMesh = $state<THREE.Mesh | null>(null);
  let domainTextMesh = $state<THREE.Mesh | null>(null);

  // Y center of the scaled crate model's primary mesh, relative to the parent
  // group. Used to derive containerYOffset so the model sits centered at parent
  // Y=0 — eliminating the legacy `height * -0.7` guess.
  let modelCenterY = $state<number | null>(null);

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

  // ---- perspective center shift (off-axis content) ----
  // ENVIRONMENT_SCALE matches BaseScene; positionArray is in local (pre-scale) coords.
  const ENV_SCALE = 1.5;
  const contentShift = $derived.by(() => {
    const cam = camera.current as THREE.PerspectiveCamera | null;
    if (!cam) return { x: 0, y: 0 };
    const targetWorld = {
      x: positionArray[0] * ENV_SCALE,
      y: positionArray[1] * ENV_SCALE,
      z: positionArray[2] * ENV_SCALE,
    };
    const contentZWorld = targetWorld.z + contentZOffset * ENV_SCALE;
    const s = perspectiveCenterShift(cam, targetWorld, contentZWorld);
    return { x: s.x / ENV_SCALE, y: s.y / ENV_SCALE };
  });

  function onInlineTextSync() {
    if (!inlineTextMesh) return;
    textLocalSize = measureTroikaText(inlineTextMesh as any);
  }
  function onTitleTextSync() {
    if (!titleTextMesh) return;
    titleSize = measureTroikaText(titleTextMesh as any);
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

  // Calculate bounding box and content positions reactively
  $effect(() => {
    if (!group || !$gltf) return;

    if (boundingBoxCalculated) return;

    // Temporarily reset scale to measure
    const originalScale = group.scale.clone();
    group.scale.set(1, 1, 1);

    // Measure the primary mesh of the crate (filters out explode-piece geometry).
    // Falls back to the largest mesh by bbox volume if the named match is missing.
    const primary = findPrimaryMesh(group, { name: "Cube200" }) ?? group;
    const { size, center: rawCenter } = measureObject3D(primary);

    modelWidth = size.x;
    modelHeight = size.y;
    modelDepth = size.z;

    // Capture the scaled center Y so `containerYOffset` lands the visible bbox
    // at parent Y=0 — replacing the legacy `height * -0.7` guess.
    const scaleY = height / Math.max(modelHeight, 1e-6);
    modelCenterY = rawCenter.y * scaleY;

    // Ensure content appears in front of crate. 0.03 is enough margin to avoid
    // z-fighting with the textured front face for SDF text/icons.
    contentZOffset = modelDepth / 2 + 0.03;

    // Clone materials for this instance to prevent shared material issues
    if (!materialsCloned) {
      console.log(`🎨 Cloning materials for '${title}' to prevent shared opacity issues`);
      group.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          if (Array.isArray(object.material)) {
            // Clone each material in the array
            const clonedMaterialArray = object.material.map((mat) => {
              const cloned = mat.clone();
              clonedMaterials.push(cloned);
              return cloned;
            });
            object.material = clonedMaterialArray;
          } else {
            // Clone single material
            const cloned = object.material.clone();
            clonedMaterials.push(cloned);
            object.material = cloned;
          }
        }
      });
      materialsCloned = true;
      console.log(`✅ Cloned ${clonedMaterials.length} materials for '${title}'`);
    }

    // Restore scale
    group.scale.copy(originalScale);
    boundingBoxCalculated = true;
  });

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

  function playReassembly() {
    if (crateExplodeRef && typeof crateExplodeRef.reset === "function") {
      crateExplodeRef.reset();
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

  // Pointer events
  function onPointerEnter() {
    hovering = true;
    scaleSpring.set(1.05);
    if (typeof document !== "undefined") {
      document.body.classList.add("cursor-pointer");
    }
  }

  function onPointerLeave() {
    hovering = false;
    scaleSpring.set(1);
    if (typeof document !== "undefined") {
      document.body.classList.remove("cursor-pointer");
    }
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
  async function startReassembly(): Promise<void> {
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
      playReassembly();
    });
  }

  // Legacy reset function for external calls (e.g., modal triggers)
  async function resetCrate(): Promise<void> {
    console.log(`🔄 External reset called for '${title}' - delegating to startReassembly`);
    return startReassembly();
  }

  // Click handlers
  function handleClick(event: any) {
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

    event.stopPropagation();

    // Reset the action executed flag for new click
    actionExecuted = false;

    const positionVector = new THREE.Vector3(
      positionArray[0],
      positionArray[1] + height / 2,
      positionArray[2],
    );

    console.log(`📡 Calling parent onLinkClick for '${title}' (${type}), passing action callback`);

    // Modal-based navigation with fallback for accessibility/reliability
    const coordinatedAction = () => {
      // Prevent duplicate execution (fireball system calls this again)
      if (actionExecuted) {
        console.log(`🚫 Coordinated action already executed for '${title}' - skipping duplicate`);
        return;
      }

      actionExecuted = true;
      console.log(
        `🎯 Coordinated action executing for '${title}' (${type}) - Modal system with fallback`,
      );
      console.log(`📋 Debug info:`, {
        type,
        hasModalManager: !!modalManager,
        hasUrl: !!url,
        url,
        isModalType: type === "url" || type === "download" || type === "contact",
      });

      // For regular navigation links, show modal if available
      if ((type === "url" || type === "download" || type === "contact") && modalManager && url) {
        console.log(`✅ Modal conditions met - proceeding with modal display`);

        try {
          // Convert 3D crate position to screen coordinates for modal positioning
          if (camera.current && $size) {
            console.log(`📐 Converting 3D position to screen coordinates...`);
            console.log(`📐 Input data:`, {
              cameraAvailable: !!camera.current,
              sizeAvailable: !!$size,
              size: $size,
              positionArray,
              height,
            });

            const screenPosition = new THREE.Vector3();
            screenPosition.copy(
              new THREE.Vector3(positionArray[0], positionArray[1] + height / 2, positionArray[2]),
            );
            screenPosition.project(camera.current);

            // Convert from normalized device coordinates to screen coordinates
            const screenX = ((screenPosition.x + 1) * $size.width) / 2;
            const screenY = ((-screenPosition.y + 1) * $size.height) / 2;

            console.log(`🌟 Calculated screen position:`, {
              normalizedPosition: { x: screenPosition.x, y: screenPosition.y },
              screenX,
              screenY,
              isFinite: isFinite(screenX) && isFinite(screenY),
            });

            // Validate coordinates and show modal
            if (isFinite(screenX) && isFinite(screenY)) {
              console.log(`🚀 Calling modalManager.showModal() with:`, {
                link: link.name,
                screenX,
                screenY,
              });
              modalManager.showModal(link, screenX, screenY);
            } else {
              console.warn(`⚠️ Invalid coordinates, using center fallback`);
              modalManager.showModal(link, screenWidth / 2, screenWidth * 0.6);
            }
          } else {
            console.warn(`⚠️ Camera or size not available:`, {
              camera: !!camera.current,
              size: !!$size,
              screenWidth,
            });
            // Use center of screen as fallback
            console.log(`🚀 Calling modalManager.showModal() with fallback position`);
            modalManager.showModal(link, screenWidth / 2, screenWidth * 0.6);
          }

          // DO NOT reset immediately after modal - let the explosion/fade cycle complete naturally
          console.log(`🎬 Modal displayed - letting explosion animation complete naturally`);
        } catch (error) {
          console.error(`❌ Modal positioning failed:`, error);
        }
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
    }

    // Optional entrance flourish: start exploded, then reassemble. Only fires
    // once per mount. Crate model + content stay invisible until reassembly
    // completes, at which point the reassembly callback restores their opacity.
    if (reassembleOnMount && crateExplodeRef?.setReassemblyCallback) {
      modelOpacityTween.set(0);
      contentOpacityTween.set(0);
      contentVisible = false;
      isExploded = true;
      void startReassembly();
    }
  });

  // Update SVG materials when opacity changes
  $effect(() => {
    updateSvgMaterials();
  });

  // Update crate model materials opacity (now using cloned materials per instance)
  $effect(() => {
    if (!group || !$gltf || !materialsCloned) return;

    // Log opacity changes for debugging
    console.log(
      `🎨 Updating opacity for '${title}': modelOpacity=${modelOpacity.toFixed(2)}, isReassembling=${isReassembling}`,
    );

    // Traverse all meshes in the group and update their material opacity
    // Skip main body meshes (Cube001, Cube001_1) as CrateExplode handles their opacity
    // Since materials are now cloned per instance, this only affects this component
    group.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        // Skip main body meshes - let CrateExplode handle their opacity
        if (
          object.name === "Cube001" ||
          object.name === "Cube001_1" ||
          object.name === "Cube.002"
        ) {
          return;
        }

        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.transparent = modelOpacity < 1;
              mat.opacity = modelOpacity;
              mat.needsUpdate = true;
            }
          });
        } else if (object.material instanceof THREE.MeshStandardMaterial) {
          object.material.transparent = modelOpacity < 1;
          object.material.opacity = modelOpacity;
          object.material.needsUpdate = true;
        }
      }
    });
  });

  // Clean up on destroy
  onDestroy(() => {
    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }

    // Clean up cloned materials to prevent memory leaks
    clonedMaterials.forEach((material) => {
      material.dispose();
    });
    clonedMaterials = [];

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

    const scaleX = width / modelWidth;
    const scaleY = height / modelHeight;
    const scaleZ = depth / modelDepth;

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

    // Reset the CrateExplode component if available
    if (crateExplodeRef && typeof crateExplodeRef.reset === "function") {
      crateExplodeRef.reset();
    }
  }

  // Function for modal system to call when modal is closed - triggers reassembly
  function onModalClosed(): Promise<void> {
    console.log(`🖼️ Modal closed for '${title}' - triggering reassembly`);
    return startReassembly();
  }

  // Explosion function that can be called from registry with action
  function explodeWithAction(actionFunction?: () => void): Promise<void> {
    console.log(
      `🎯 explodeWithAction called for '${title}' (crateId='${crateId}') with action:`,
      !!actionFunction,
    );

    if (type === "category" || type === "action") {
      console.log(`🔄 Navigation link - triggering action immediately for '${title}'`);
      // For navigation links: trigger action IMMEDIATELY before explosion
      if (actionFunction) {
        actionFunction();
      }
      // Start explosion animation (visual feedback only, no fade-out, no auto-reassembly)
      return explodeVisualOnly();
    } else {
      console.log(`🔗 Regular link - normal explosion with auto-reassembly for '${title}'`);
      // For regular links: normal explosion with automatic reassembly
      return explodeCrate();
    }
  }

  // Expose functions to parent
  export {
    explodeCrate,
    resetCrate,
    startReassembly,
    resetToDefault,
    explodeVisualOnly,
    explodeWithAction,
    onModalClosed,
  };
</script>

<!-- Main container -->
<T.Group
  position={[positionArray[0], positionArray[1], positionArray[2]]}
  rotation={[rotationArray[0], rotationArray[1], rotationArray[2]]}
  name={`crate-link-${columnKey}-${index}`}
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
    <!-- Use CrateExplode component for animation -->
    <CrateExplode
      bind:this={crateExplodeRef}
      onclick={handleClick}
      onpointerenter={onPointerEnter}
      onpointerleave={onPointerLeave}
      scale={[hoverScale, hoverScale, hoverScale]}
    />
  </T.Group>

  <!-- Content Container -->
  {#if contentVisible}
    <T.Group
      position={[
        link.inlineIcon ? 0 : contentShift.x,
        link.inlineIcon ? 0 : contentShift.y,
        contentZOffset,
      ]}
      rotation={[0, 0, 0]}
      name={`crate-content-${columnKey}-${index}`}
      onclick={handleClick}
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
            fontSize={height * TITLE_FONT_RATIO}
            fontWeight="bold"
            whiteSpace="nowrap"
            anchorX="center"
            anchorY="middle"
            maxWidth={width * 0.9}
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
            <T.Mesh
              scale={[getFaviconScale()[0], getFaviconScale()[1], getFaviconScale()[2]]}
              position.y={-height / 3}
            >
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
