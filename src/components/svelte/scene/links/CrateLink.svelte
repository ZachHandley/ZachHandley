<script lang="ts">
  import { T, useTask, useThrelte } from "@threlte/core";
  import { Text, useGltf } from "@threlte/extras";
  import * as THREE from "three";
  import { Spring } from "svelte/motion";
  import { onMount, onDestroy } from "svelte";
  import type { Link as LinkType } from "~/types/baseSchemas";
  import { fetchIconData } from "~/utils/iconify";
  import { createSvgMesh, calculateVisualScale } from "~/utils/svgUtils";
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
    explodeDuration = 1,
    resetDelay = 3000,
    enableRotation = true,
    autoReset = false,
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

  // Get Threlte context
  const { camera } = useThrelte();

  // Extract link properties
  const {
    url = "",
    name: title = "",
    type = "url",
    category,
    icon,
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

  const domain = getDomain(url);

  // Color cache
  const colorCache = {
    url: "#FFA726",
    download: "#4CAF50",
    contact: "#2196F3",
    urlHover: "#ffffff",
    category: "#E91E63",
    action: "#9C27B0",
  };

  function getLinkColor(
    linkType: LinkType["type"] = "url",
    hovered = false
  ): string {
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

  // Position and rotation
  const positionArray = Array.isArray(position) ? position : [position, 0, 0];
  const rotationArray = Array.isArray(rotation) ? rotation : [0, rotation, 0];

  // States
  let group = $state<THREE.Group>();
  let modelWidth = $state(1);
  let modelHeight = $state(1);
  let modelDepth = $state(1);
  let boundingBoxCalculated = $state(false);
  let hovering = $state(false);
  let isExploding = $state(false);
  let isResetting = $state(false);
  let contentVisible = $state(true);
  let modelOpacity = $state(1);
  let contentOpacity = $state(1);
  let isLoadingIcon = $state(true);
  let svgGroup = $state<THREE.Group | null>(null);
  let faviconTexture = $state<THREE.Texture | null>(null);
  let faviconLoaded = $state(false);
  let faviconLoadFailed = $state(false);
  let faviconAspectRatio = $state(1); // Default 1:1 aspect ratio
  let resetTimeout: ReturnType<typeof setTimeout> | null = null;

  // Content Z position - store as state instead of derived
  let contentZOffset = $state(0.3);

  // Content positions
  let titleY = $state(0);
  let iconY = $state(0);
  let domainY = $state(0);

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

  // GLTF loader
  const gltf = useGltf<{
    nodes: {
      Cube200: THREE.Mesh;
      Cube200_1: THREE.Mesh;
    };
    materials: {
      Wood_Light: THREE.MeshStandardMaterial;
      Wood: THREE.MeshStandardMaterial;
    };
  }>("/models/Crate-transformed.glb", {
    dracoLoader,
  });

  // Calculate bounding box and content positions
  const boundingBoxTask = useTask(() => {
    if (!group || !$gltf) return true;
    if (boundingBoxCalculated) return false;

    // Temporarily reset scale to measure
    const originalScale = group.scale.clone();
    group.scale.set(1, 1, 1);

    // Calculate dimensions
    const boundingBox = new THREE.Box3().setFromObject(group);
    const size = boundingBox.getSize(new THREE.Vector3());

    modelWidth = size.x;
    modelHeight = size.y;
    modelDepth = size.z;

    // Ensure content appears in front of crate
    // Reduced base offset from 0.3 to 0.15 to bring text closer to crate
    contentZOffset = modelDepth / 2 + 0.15;

    // Calculate content positions sequentially
    calculateContentPositions();

    // Restore scale
    group.scale.copy(originalScale);
    boundingBoxCalculated = true;

    return false;
  });

  // Calculate content positions based on crate dimensions
  function calculateContentPositions() {
    // Perspective compensation for crates below camera level
    // Get dynamic camera position from Threlte context
    const cameraY = camera.current?.position.y || 7.5; // fallback to 7.5
    const crateWorldY = positionArray[1];
    const perspectiveOffset = crateWorldY < cameraY ? (cameraY - crateWorldY) * 0.03 : 0;
    
    // Improve positioning for small crates to prevent text from going off-screen
    const isSmallCrate = height < 2.5;
    const titlePercent = isSmallCrate ? 0.75 : 0.9;
    const iconPercent = isSmallCrate ? 0.5 : 0.8;
    const domainPercent = isSmallCrate ? 0.25 : 0.1;
    
    // Title position - top with perspective compensation
    titleY = height * titlePercent + perspectiveOffset;

    // Icon position - centered vertically with perspective compensation
    iconY = height * iconPercent + perspectiveOffset;

    // Domain position - bottom with perspective compensation
    domainY = height * domainPercent + perspectiveOffset;
  }

  // Animation task
  const animationTask = useTask((delta) => {
    if (!isExploding && !isResetting) return false;

    const progress = Math.min(1, delta / explodeDuration);

    if (isResetting) {
      // Reset animation
      if (progress < 0.5) {
        modelOpacity = progress * 2;
        contentOpacity = 0;
      } else {
        modelOpacity = 1;
        contentVisible = true;
        contentOpacity = (progress - 0.5) * 2;
      }
    } else {
      // Explode animation
      if (progress < 0.5) {
        contentOpacity = 1 - progress * 2;
      } else {
        contentOpacity = 0;
        contentVisible = progress < 0.51;
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

    // Animation completion
    if (progress >= 1) {
      if (isResetting) {
        isResetting = false;
        isExploding = false;
      } else if (autoReset) {
        resetTimeout = setTimeout(reset, resetDelay);
      }
      return false;
    }

    return true;
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

  // Explode animation
  function explode() {
    if (isExploding) return;

    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }

    isExploding = true;
    isResetting = false;

    if (animationTask && !animationTask.started) {
      animationTask.start();
    }
  }

  // Reset animation
  function reset() {
    if (!isExploding) return;

    if (resetTimeout) {
      clearTimeout(resetTimeout);
      resetTimeout = null;
    }

    isResetting = true;

    if (animationTask && !animationTask.started) {
      animationTask.start();
    }
  }

  // Click handlers
  function handleClick(event: any) {
    event.stopPropagation();

    const positionVector = new THREE.Vector3(
      positionArray[0],
      positionArray[1] + height / 2,
      positionArray[2]
    );

    onLinkClick?.(url, type, positionVector, category, explode);
  }

  function handleDoubleClick(event: any) {
    event.stopPropagation();
    explode();
  }

  // Update opacity on all materials in the SVG group
  function updateSvgMaterials() {
    if (!svgGroup) return;

    // Recursively traverse all objects in the group
    svgGroup.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        if (Array.isArray(object.material)) {
          // Handle multi-material meshes
          object.material.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.transparent = true;
              mat.opacity = contentOpacity * opacity;

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
                  opacity: contentOpacity * opacity,
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
          object.material.opacity = contentOpacity * opacity;

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
              opacity: contentOpacity * opacity,
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
  async function loadFaviconWithFetch(
    url: string
  ): Promise<THREE.Texture | null> {
    try {
      // Use a proxy service or create a server-side proxy for CORS issues
      // For local development/demo, we'll try a direct fetch but this often fails due to CORS
      const response = await fetch(
        `${import.meta.env.SITE}/api/utils/${encodeURIComponent(url)}.json`
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

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
          }
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
          faviconAspectRatio =
            texture.image.width / Math.max(texture.image.height, 1);
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
          }
        }
      }
    } catch (error) {
      console.error("Error loading icon:", error);
      faviconLoadFailed = true;
    } finally {
      isLoadingIcon = false;
    }
  });

  // Update SVG materials when opacity changes
  $effect(() => {
    updateSvgMaterials();
  });

  // Clean up on destroy
  onDestroy(() => {
    if (animationTask && animationTask.started) {
      animationTask.stop();
    }

    if (boundingBoxTask && boundingBoxTask.started) {
      boundingBoxTask.stop();
    }

    if (resetTimeout) {
      clearTimeout(resetTimeout);
    }

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

  // Recalculate positions when dimensions change
  $effect(() => {
    if (boundingBoxCalculated) {
      calculateContentPositions();
    }
  });

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

  // Expose functions to parent
  export { explode, reset };
</script>

<!-- Main container -->
<T.Group
  position={[positionArray[0], positionArray[1], positionArray[2]]}
  rotation={[rotationArray[0], rotationArray[1], rotationArray[2]]}
  name={`crate-link-${columnKey}-${index}`}
>
  <!-- Crate model container -->
  <T.Group
    bind:ref={group}
    scale={getCalculatedScale() as [number, number, number]}
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
      <!-- Error state - fallback box -->
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
      rotation={[0, 0, 0]}
      name={`crate-content-${columnKey}-${index}`}
      onclick={handleClick}
      scale={[hoverScale, hoverScale, hoverScale]}
    >
      {#if link.inlineIcon && svgGroup}
        <!-- Inline icon + text layout for buttons like "← Back" -->
        <T.Group position={[0, iconY, 0]}>
          <!-- Icon positioned close to left of center -->
          <T.Group position={[-0.25, 0.05, 0]} scale={[height * 0.2, height * 0.2, 1]}>
            <T is={svgGroup} />
          </T.Group>
          <!-- Text positioned close to icon -->
          <T.Group position={[0.1, 0, 0]}>
            <Text
              text={title}
              color="white"
              fontSize={height * 0.16}
              fontWeight="bold"
              whiteSpace="nowrap"
              anchorX="left"
              anchorY="middle"
              maxWidth={width * 0.8}
              textAlign="left"
              fillOpacity={contentOpacity * opacity}
              transparent={true}
            />
          </T.Group>
        </T.Group>
      {:else}
        <!-- Normal 3-section layout -->
        <!-- Title text at top -->
        <T.Group position={[0, titleY, 0]}>
          <Text
            text={title}
            color="white"
            fontSize={height * 0.15}
            fontWeight="bold"
            whiteSpace="nowrap"
            anchorX="center"
            anchorY="middle"
            maxWidth={width * 0.9}
            textAlign="center"
            fillOpacity={contentOpacity * opacity}
            transparent={true}
          />
        </T.Group>

        <!-- Icon area in center -->
        <T.Group position={[0, iconY, 0]}>
          {#if isLoadingIcon}
            <Text
              text="..."
              color="white"
              fontSize={height * 0.15}
              anchorX="center"
              anchorY="middle"
              fillOpacity={contentOpacity * opacity}
              transparent={true}
            />
          {:else if svgGroup}
            <!-- Use SVG icon if available -->
            <T.Group scale={[height * 0.3, height * 0.3, 1]}>
              <T is={svgGroup} />
            </T.Group>
          {:else if faviconLoaded && faviconTexture}
            <!-- Use favicon texture with proper scaling -->
            <T.Mesh
              scale={[
                getFaviconScale()[0],
                getFaviconScale()[1],
                getFaviconScale()[2],
              ]}
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
            <!-- Fallback icon -->
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
      {#if !link.inlineIcon}
        {#if domain}
          <T.Group position={[0, domainY, 0]}>
            <Text
              text={domain}
              color="white"
              fontSize={height * 0.1}
              anchorX="center"
              anchorY="middle"
              maxWidth={width * 0.9}
              fillOpacity={contentOpacity * opacity}
              transparent={true}
            />
          </T.Group>
        {:else if category}
          <T.Group position={[0, domainY, 0]}>
            <Text
              text={category}
              color="white"
              fontSize={height * 0.1}
              anchorX="center"
              anchorY="middle"
              maxWidth={width * 0.9}
              fillOpacity={contentOpacity * opacity}
              transparent={true}
            />
          </T.Group>
        {/if}
      {/if}
    </T.Group>
  {/if}
</T.Group>
