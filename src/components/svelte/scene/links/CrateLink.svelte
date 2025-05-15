<script lang="ts">
  import { T, useTask } from "@threlte/core";
  import { HTML } from "@threlte/extras";
  import * as THREE from "three";
  import { Spring } from "svelte/motion";
  import { onMount, onDestroy } from "svelte";
  import type { Link as LinkType } from "~/types/baseSchemas";
  import type { Snippet } from "svelte";
  import { fetchIconData } from "~/utils/iconify";
  import { useGltf } from "@threlte/extras";
  import type { DRACOLoader } from "three/examples/jsm/Addons.js";

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
    explodeDuration = 1, // in seconds
    resetDelay = 3000, // time before the crate rebuilds itself
    enableRotation = true,
    autoReset = false, // whether to automatically reset after exploding
    onLinkClick,
    dracoLoader,
    opacity = 1,
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
    enableRotation?: boolean;
    autoReset?: boolean;
    onLinkClick?: (
      url: string,
      type: LinkType["type"],
      position: THREE.Vector3,
      category?: string,
      action?: () => void
    ) => void;
    dracoLoader: DRACOLoader;
    opacity?: number;
  } & { ref?: THREE.Group } = $props();

  // Extract link properties for easier access
  const {
    url = "",
    name: title = "",
    type = "url",
    category,
    icon,
    action,
  } = link || {};

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

  // Static color cache
  const colorCache = {
    url: "#FFA726", // Orange
    download: "#4CAF50", // Green
    contact: "#2196F3", // Blue
    urlHover: "#ffffff", // White for hover
  };

  // Get link color based on type and hover state
  function getLinkColor(
    linkType: LinkType["type"] = "url",
    hovered: boolean = false
  ): string {
    if (hovered) return colorCache.urlHover;

    switch (linkType) {
      case "download":
        return colorCache.download;
      case "contact":
        return colorCache.contact;
      default:
        return colorCache.url;
    }
  }

  // Model dimensions - these will be calculated dynamically using bounding box
  let modelWidth = $state(1);
  let modelHeight = $state(1);
  let modelDepth = $state(1);
  let boundingBoxCalculated = $state(false);

  // Convert any position format to array
  const positionArray = $derived(
    Array.isArray(position) ? position : [position, 0, 0]
  );

  // Convert any rotation format to array
  const rotationArray = $derived(
    Array.isArray(rotation) ? rotation : [0, rotation, 0]
  );

  // Calculate scale based on measured bounding box and desired width/height
  const calculatedScale = $derived.by(() => {
    // If bounding box not yet calculated, return initial scale
    if (!boundingBoxCalculated) {
      return [1, 1, 1];
    }

    // Calculate scale factors
    const scaleX = width / modelWidth;
    const scaleY = height / modelHeight;
    const scaleZ = depth / modelDepth;

    return [scaleX, scaleY, scaleZ];
  });

  // Content Z position (how far in front of the crate the content should be)
  const contentZOffset = $derived(modelDepth / 2 + 0.1);

  type GLTFResult = {
    nodes: {
      Cube200: THREE.Mesh;
      Cube200_1: THREE.Mesh;
    };
    materials: {
      Wood_Light: THREE.MeshStandardMaterial;
      Wood: THREE.MeshStandardMaterial;
    };
  };

  const gltf = useGltf<GLTFResult>("/models/Crate-transformed.glb", {
    dracoLoader,
  });

  // Define state for the component
  let group = $state<THREE.Group>();
  let boundingBoxTask = $state<ReturnType<typeof useTask> | null>(null);
  let isExploding = $state(false);
  let isResetting = $state(false); // Add state to track if we're resetting
  let contentVisible = $state(true);
  let resetTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let modelOpacity = $state(1);
  let contentOpacity = $state(1);

  // Scale animation for hover
  const scaleSpring = new Spring(1, {
    stiffness: 0.1,
    damping: 0.4,
  });
  let hoverScale = $derived(scaleSpring.current);

  // Link state
  let hovering = $state(false);
  let isLoading = $state(true);
  let iconSvgData = $state<string | null>(null);
  let faviconFailed = $state(false);

  function onPointerEnter() {
    hovering = true;
  }

  function onPointerLeave() {
    hovering = false;
  }

  $effect(() => {
    if (hovering && !isExploding) {
      scaleSpring.set(1.05);
    } else if (!isExploding) {
      scaleSpring.set(1);
    }
  });

  // Calculate bounding box using useTask
  boundingBoxTask = useTask(() => {
    // Check if group and model are loaded - if not, continue running task
    if (!group || !$gltf) return true;

    // If we've already calculated the bounding box, stop the task
    if (boundingBoxCalculated) return false;

    // Temporarily reset scale to measure original dimensions
    const originalScale = group.scale.clone();
    group.scale.set(1, 1, 1);

    // Create a bounding box
    const boundingBox = new THREE.Box3().setFromObject(group);
    const size = boundingBox.getSize(new THREE.Vector3());

    // Store original dimensions
    modelWidth = size.x;
    modelHeight = size.y;
    modelDepth = size.z;

    // Restore original scale
    group.scale.copy(originalScale);

    boundingBoxCalculated = true;

    // This is a one-time calculation, so stop the task
    return false;
  });

  // Declare animationTask once, outside both functions
  let animationTask = $state<ReturnType<typeof useTask> | null>(
    useTask((delta) => {
      // If not exploding or resetting, do nothing
      if (!isExploding && !isResetting) return false;

      const progress = Math.min(1, delta / explodeDuration);

      if (isResetting) {
        // Reset animation logic (fade in)
        if (progress < 0.5) {
          modelOpacity = progress * 2;
          contentOpacity = 0;
        } else {
          modelOpacity = 1;
          contentVisible = true;
          contentOpacity = (progress - 0.5) * 2;
        }
      } else {
        // Explode animation logic (fade out)
        if (progress < 0.5) {
          contentOpacity = 1 - progress * 2;
        } else {
          contentOpacity = 0;
          contentVisible = progress < 0.51; // Hide content after fade out
          modelOpacity = 1 - (progress - 0.5) * 2;
        }
      }

      // Apply opacity to materials
      if ($gltf) {
        $gltf.materials.Wood.opacity = modelOpacity;
        $gltf.materials.Wood.transparent = true;
        $gltf.materials.Wood_Light.opacity = modelOpacity;
        $gltf.materials.Wood_Light.transparent = true;
      }

      // If animation is complete
      if (progress >= 1) {
        if (isResetting) {
          // Reset is complete
          isResetting = false;
          isExploding = false;
        } else if (autoReset) {
          // Set a timeout to reset the crate
          resetTimeout = setTimeout(() => {
            reset();
          }, resetDelay);
        }

        return false; // Stop the animation
      }

      return true; // Continue the animation
    })
  );

  // SIMPLIFIED: Instead of exploding with pieces, just fade out
  function explode() {
    if (isExploding) return;

    // Clear any pending reset timeout
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }

    isExploding = true;
    isResetting = false;

    // Restart the animation task if it's not running
    if (animationTask && !animationTask.started) {
      animationTask.start();
    }
  }

  // Reset the crate - fade back in
  function reset() {
    if (!isExploding) return;

    // Clear any pending reset timeout
    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }

    isResetting = true;

    // Restart the animation task if it's not running
    if (animationTask && !animationTask.started) {
      animationTask.start();
    }
  }

  // Handle link click
  function handleClick(event: any) {
    event.stopPropagation();

    // Create position vector
    const positionVector = new THREE.Vector3(
      positionArray[0],
      positionArray[1] + height / 2,
      positionArray[2]
    );

    // Don't pass onLinkClick directly - we'll explode first, then call it after
    onLinkClick?.(url, type, positionVector, category, explode);
  }

  // Test explosion on double-click
  function handleDoubleClick(event: any) {
    event.stopPropagation();
    explode();
  }

  // Handle favicon loading error
  function handleFaviconError() {
    faviconFailed = true;
  }

  // Initialize component - FIXED: Only load icon if explicitly defined
  onMount(async () => {
    try {
      // Priority 1: Only try to get SVG data if icon is explicitly defined in the link
      if (link.icon) {
        const svgData = await fetchIconData(link);
        if (svgData) {
          iconSvgData = svgData;
        }
        // If SVG data fetch fails, we'll fall back to favicon or backup icon
      }
      // If no icon defined, we don't fetch anything here
      // We'll try favicon for URLs in the render section
    } catch (error: any) {
      console.error("Error loading icon:", error);
    } finally {
      isLoading = false;
    }
  });

  // Clean up on component destruction
  onDestroy(() => {
    if (animationTask) {
      animationTask.stop();
    }

    if (boundingBoxTask) {
      boundingBoxTask.stop();
    }

    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }
  });

  // Expose functions to parent
  export { explode, reset };
</script>

<!-- Main container - Position is passed directly to place in scene -->
<T.Group
  position={[positionArray[0], positionArray[1], positionArray[2]]}
  rotation={[rotationArray[0], rotationArray[1], rotationArray[2]]}
  name={`crate-link-${columnKey}-${index}`}
>
  <!-- Crate model container - Apply calculated scale once bounding box is measured -->
  <T.Group
    bind:ref={group}
    scale={boundingBoxCalculated
      ? [calculatedScale[0], calculatedScale[1], calculatedScale[2]]
      : [1, 1, 1]}
    {height}
    {width}
    {depth}
  >
    {#await gltf}
      <!-- Loading state -->
    {:then gltfData}
      <T.Mesh
        castShadow
        receiveShadow
        geometry={gltfData.nodes.Cube200.geometry}
        material={gltfData.materials.Wood_Light}
        scale={[hoverScale, hoverScale, hoverScale]}
        onclick={handleClick}
        ondblclick={handleDoubleClick}
        onpointerenter={onPointerEnter}
        onpointerleave={onPointerLeave}
      />
      <T.Mesh
        castShadow
        receiveShadow
        geometry={gltfData.nodes.Cube200_1.geometry}
        material={gltfData.materials.Wood}
        scale={[hoverScale, hoverScale, hoverScale]}
      />
    {:catch error}
      <!-- Error state - fallback simple box -->
      <T.Mesh
        castShadow
        receiveShadow
        scale={[hoverScale, hoverScale, hoverScale]}
        onclick={handleClick}
        ondblclick={handleDoubleClick}
        onpointerenter={onPointerEnter}
        onpointerleave={onPointerLeave}
      >
        <T.BoxGeometry args={[width, height, depth]} />
        <T.MeshStandardMaterial
          color={hovering ? colorCache.urlHover : getLinkColor(type)}
          emissive={getLinkColor(type)}
          emissiveIntensity={hovering ? 0.5 : 0}
          transparent={true}
          opacity={modelOpacity * opacity}
        />
      </T.Mesh>
    {/await}
  </T.Group>

  <!-- Content Container -->
  {#if contentVisible}
    <T.Group
      position={[0, 0, contentZOffset]}
      name={`crate-content-${columnKey}-${index}`}
    >
      <!-- Title text -->
      <T.Group
        position={[0, height * 0.8, 0]}
        name={`crate-title-${columnKey}-${index}`}
      >
        <HTML center occlude={false} pointerEvents="none" visible={true}>
          <div
            style="color: white; font-size: {Math.max(
              12,
              height * 4
            )}px; text-align: center; font-weight: bold; opacity: {contentOpacity *
              opacity}; width: {Math.max(80, height * 20)}px;"
          >
            {title}
          </div>
        </HTML>
      </T.Group>

      <!-- Icon area -->
      <T.Group
        position={[0, height * 0.5, 0]}
        name={`crate-icon-${columnKey}-${index}`}
      >
        {#if isLoading}
          <HTML center occlude={false} pointerEvents="none" visible={true}>
            <div
              style="color: white; font-size: 12px; text-align: center; opacity: {contentOpacity *
                opacity};"
            >
              Loading...
            </div>
          </HTML>
        {:else}
          <HTML center occlude={false} pointerEvents="none" visible={true}>
            <div
              style="display: flex; justify-content: center; align-items: center; width: {Math.max(
                24,
                height * 8
              )}px; height: {Math.max(
                24,
                height * 8
              )}px; position: relative; opacity: {contentOpacity * opacity};"
            >
              <!-- FIXED: Proper priority order for icons -->
              {#if iconSvgData}
                <!-- Priority 1: Icon provided with Link type -->
                <div
                  style="width: 100%; height: 100%; color: white;"
                  class="icon-container"
                >
                  {@html `<svg viewBox="0 0 24 24">${iconSvgData}</svg>`}
                </div>
              {:else if type === "url" && !faviconFailed}
                <!-- Priority 2: Favicon of website, if URL -->
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                  alt={domain}
                  width="100%"
                  height="100%"
                  style="object-fit: contain;"
                  onerror={handleFaviconError}
                />
              {:else}
                <!-- Priority 3: Backup icon -->
                <div
                  style="width: 100%; height: 100%; color: white;"
                  class="icon-container"
                >
                  <!-- Simple default icon -->
                  {@html `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`}
                </div>
              {/if}
            </div>
          </HTML>
        {/if}
      </T.Group>

      <!-- Domain text -->
      {#if domain}
        <T.Group position={[0, height * 0.1, 0]}>
          <HTML center occlude={false} pointerEvents="none" visible={true}>
            <div
              style="color: white; font-size: {Math.max(
                10,
                height * 3
              )}px; text-align: center; opacity: {contentOpacity *
                opacity}; width: {Math.max(
                80,
                height * 20
              )}px; overflow: hidden; text-overflow: ellipsis; background: transparent;"
            >
              {domain}
            </div>
          </HTML>
        </T.Group>
      {/if}
    </T.Group>
  {/if}
</T.Group>

<style>
  :global(.icon-container svg) {
    width: 100% !important;
    height: 100% !important;
    fill: currentColor !important;
  }

  :global(.icon-container) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
</style>
