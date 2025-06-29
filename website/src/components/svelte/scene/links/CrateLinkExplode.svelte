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
      crateId?: string
    ) => void;
    dracoLoader: DRACOLoader;
    opacity?: number;
    crateId?: string;
    screenWidth?: number;
    modalManager?: { showModal: (link: LinkType, x: number, y: number) => void; hideModal: () => void } | null;
  } & { ref?: THREE.Group } = $props();

  // Get Threlte context
  const { size, camera } = useThrelte();

  // Mobile detection based on screenWidth
  let isMobile = $derived(screenWidth < 768);

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
  let actualAnimationDuration = $state(explodeDuration);

  // Content Z position - store as state instead of derived
  let contentZOffset = $state(0.3);
  
  // Dynamic container offsets based on crate dimensions (using $derived for reactive computation)
  let containerYOffset = $derived(height * -0.7);  // Scale with height instead of hardcoded -2.95
  let containerZOffset = $derived(depth * 0.4);    // Scale with depth instead of hardcoded +0.2

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

  // Simple GLTF type for bounding box calculations only
  type GLTFResult = {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.MeshStandardMaterial>;
  };

  // Load GLTF only for bounding box calculations
  const gltf = useGltf<GLTFResult>("/models/CrateExplode-transformed.glb", {
    dracoLoader,
  });

  // CrateExplode component reference for animations
  let crateExplodeRef: any = null;
  

  // Calculate bounding box and content positions reactively
  $effect(() => {
    if (!group || !$gltf) return;
    
    if (boundingBoxCalculated) return;

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
    // Compensate for container Z offset (dynamic based on containerZOffset)
    // Reduced base offset from 0.3 to 0.15 to bring text closer to crate
    contentZOffset = modelDepth / 2 + 0.15 - containerZOffset;

    // Calculate content positions sequentially
    calculateContentPositions();

    // Clone materials for this instance to prevent shared material issues
    if (!materialsCloned) {
      console.log(`🎨 Cloning materials for '${title}' to prevent shared opacity issues`);
      group.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          if (Array.isArray(object.material)) {
            // Clone each material in the array
            const clonedMaterialArray = object.material.map(mat => {
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

    // Use default animation duration for timing
    actualAnimationDuration = explodeDuration;
  });

  // React to screen size changes by recalculating content positions
  $effect(() => {
    if (boundingBoxCalculated && $size) {
      calculateContentPositions();
    }
  });

  // Calculate content positions based on crate dimensions
  function calculateContentPositions() {
    // Compensate for container being moved down by containerYOffset
    // Since containerYOffset is negative (down), compensation is positive (up)
    const yCompensation = Math.abs(containerYOffset);
    
    // Perspective compensation for crates below camera level
    // Get dynamic camera position from Threlte context
    const cameraY = camera.current?.position.y || 7.5; // fallback to 7.5
    const crateWorldY = positionArray[1] + containerYOffset;
    const perspectiveOffset = crateWorldY < cameraY ? (cameraY - crateWorldY) * 0.03 : 0;
    
    // Improve positioning for small crates to prevent text from going off-screen
    const isSmallCrate = height < 2.5;
    const titlePercent = isSmallCrate ? 0.75 : 0.9;
    const iconPercent = isSmallCrate ? 0.5 : 0.8;
    const domainPercent = isSmallCrate ? 0.25 : 0.1;
    
    // Apply all compensations (container offset + perspective)
    const totalYOffset = yCompensation + perspectiveOffset;
    
    // Title position - top with all compensations
    titleY = height * titlePercent + totalYOffset;

    // Icon position - centered vertically with all compensations
    iconY = height * iconPercent + totalYOffset;

    // Domain position - bottom with all compensations
    domainY = height * domainPercent + totalYOffset;
  }

  // Simple animation functions using CrateExplode component
  function playExplosion() {
    console.log(`🎬 playExplosion called for '${title}' - crateExplodeRef:`, crateExplodeRef);
    if (crateExplodeRef && typeof crateExplodeRef.explode === 'function') {
      console.log(`🎬 Calling crateExplodeRef.explode() for '${title}'`);
      crateExplodeRef.explode();
    } else {
      console.warn(`🎬 Cannot call explode - ref not available for '${title}'`);
    }
  }

  function playReassembly() {
    if (crateExplodeRef && typeof crateExplodeRef.reset === 'function') {
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
    console.log(`🧨 EXPLODE CALLED for '${title}' (${type}) with crateId='${crateId}' - Current state: exploding=${isExploding}, exploded=${isExploded}`);
    console.log(`🧨 EXPLODE DEBUG: title='${title}', type='${type}', crateId='${crateId}', position=${JSON.stringify(positionArray)}`);
    
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
    await new Promise(resolve => setTimeout(resolve, actualAnimationDuration * 1000));
    
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
    console.log(`🖱️ CLICK on '${title}' (${type}) - Current state: exploding=${isExploding}, exploded=${isExploded}`);
    console.log(`🖱️ Modal manager available for '${title}':`, {
      hasModalManager: !!modalManager,
      modalManagerType: typeof modalManager,
      linkType: type,
      shouldShowModal: (type === "url" || type === "download" || type === "contact") && !!modalManager && !!url
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
      positionArray[2]
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
      console.log(`🎯 Coordinated action executing for '${title}' (${type}) - Modal system with fallback`);
      console.log(`📋 Debug info:`, {
        type,
        hasModalManager: !!modalManager,
        hasUrl: !!url,
        url,
        isModalType: type === "url" || type === "download" || type === "contact"
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
              height
            });
            
            const screenPosition = new THREE.Vector3();
            screenPosition.copy(new THREE.Vector3(
              positionArray[0],
              positionArray[1] + height / 2,
              positionArray[2]
            ));
            screenPosition.project(camera.current);
            
            // Convert from normalized device coordinates to screen coordinates
            const screenX = ((screenPosition.x + 1) * $size.width) / 2;
            const screenY = ((-screenPosition.y + 1) * $size.height) / 2;
            
            console.log(`🌟 Calculated screen position:`, { 
              normalizedPosition: { x: screenPosition.x, y: screenPosition.y },
              screenX, 
              screenY,
              isFinite: isFinite(screenX) && isFinite(screenY)
            });
            
            // Validate coordinates and show modal
            if (isFinite(screenX) && isFinite(screenY)) {
              console.log(`🚀 Calling modalManager.showModal() with:`, { link: link.name, screenX, screenY });
              modalManager.showModal(link, screenX, screenY);
            } else {
              console.warn(`⚠️ Invalid coordinates, using center fallback`);
              modalManager.showModal(link, screenWidth / 2, (screenWidth * 0.6));
            }
          } else {
            console.warn(`⚠️ Camera or size not available:`, { 
              camera: !!camera.current, 
              size: !!$size,
              screenWidth 
            });
            // Use center of screen as fallback
            console.log(`🚀 Calling modalManager.showModal() with fallback position`);
            modalManager.showModal(link, screenWidth / 2, (screenWidth * 0.6));
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
          linkType: type
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
    await new Promise(resolve => setTimeout(resolve, actualAnimationDuration * 1000));
    
    isExploding = false;
    isExploded = true;
    
    console.log(`🎨 Visual explosion complete for '${title}' - staying exploded until view changes`);
    
    // Navigation links stay exploded and visible - they will be reset when view changes
    // No fade-out animation, no auto-reassembly - the view transition handles cleanup
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

  // Update crate model materials opacity (now using cloned materials per instance)
  $effect(() => {
    if (!group || !$gltf || !materialsCloned) return;
    
    // Log opacity changes for debugging
    console.log(`🎨 Updating opacity for '${title}': modelOpacity=${modelOpacity.toFixed(2)}, isReassembling=${isReassembling}`);
    
    // Traverse all meshes in the group and update their material opacity
    // Skip main body meshes (Cube001, Cube001_1) as CrateExplode handles their opacity
    // Since materials are now cloned per instance, this only affects this component
    group.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        // Skip main body meshes - let CrateExplode handle their opacity
        if (object.name === "Cube001" || object.name === "Cube001_1" || object.name === "Cube.002") {
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
    clonedMaterials.forEach(material => {
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
    if (crateExplodeRef && typeof crateExplodeRef.reset === 'function') {
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
    console.log(`🎯 explodeWithAction called for '${title}' (crateId='${crateId}') with action:`, !!actionFunction);
    
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
  export { explodeCrate, resetCrate, startReassembly, resetToDefault, explodeVisualOnly, explodeWithAction, onModalClosed };
</script>

<!-- Main container -->
<T.Group
  position={[positionArray[0], positionArray[1] + containerYOffset, positionArray[2] + containerZOffset]}
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
      position={[link.inlineIcon ? 0 : (positionArray[0] > 0 ? -modelWidth / (isMobile ? 10 : 4) : modelWidth / (isMobile ? 10 : 4)), 0, contentZOffset]}
      rotation={[0, 0, 0]}
      name={`crate-content-${columnKey}-${index}`}
      onclick={handleClick}
      scale={[hoverScale, hoverScale, hoverScale]}
    >
      {#if link.inlineIcon && svgGroup}
        <!-- Inline icon + text layout for buttons like "← Back" -->
        <T.Group position={[0, height * 1.2, 0]}>
          <!-- Icon positioned to left of center, adjusted for text baseline alignment -->
          <T.Group position={[-0.5, isMobile ? 0.85 : 1, 0]} scale={[height * 0.25, height * 0.25, 1]}>
            <T is={svgGroup} />
          </T.Group>
          <!-- Text positioned to right of icon -->
          <T.Group position={[-0.15, 0.4, 0]}>
            <Text
              text={title}
              color="white"
              fontSize={height * 0.2}
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
