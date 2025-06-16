<script lang="ts">
  import { T, useThrelte } from "@threlte/core";
  import { HTML, interactivity, Text, useDraco } from "@threlte/extras";
  import * as THREE from "three";
  import type { Link as LinkType } from "~/types/baseSchemas";
  import { onMount, tick } from "svelte";
  import { Spring, Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import CrateLink from "./links/CrateLink.svelte";
  import CrateLinkExplode from "./links/CrateLinkExplode.svelte";

  // Props with proper TypeScript typing
  let {
    links,
    onLinkClick,
    visible = true,
    useExplodingCrates = false,
    onExplodeRequest,
    sceneController,
    screenWidth,
    screenHeight,
  }: {
    links: LinkType[];
    onLinkClick?: (
      url: string,
      type: LinkType["type"],
      position: THREE.Vector3,
      category?: string,
      action?: () => void | Promise<void>,
      crateId?: string
    ) => void;
    visible?: boolean;
    useExplodingCrates?: boolean;
    onExplodeRequest?: (crateId: string) => Promise<void>;
    sceneController?: any;
    screenWidth: number;
    screenHeight: number;
  } = $props();

  // Get Threlte context
  const { size, camera } = useThrelte();
  const dracoLoader = useDraco();

  // Define categories with their Iconify icons - split for left/right sides
  const leftCategories = [
    {
      id: "personal",
      name: "Personal",
      icon: { prefix: "mdi", name: "account" },
    },
    {
      id: "professional",
      name: "Professional",
      icon: { prefix: "mdi", name: "briefcase" },
    },
  ];

  const rightCategories = [
    {
      id: "projects",
      name: "Projects",
      icon: { prefix: "mdi", name: "code-braces" },
    },
    {
      id: "downloads",
      name: "Downloads",
      icon: { prefix: "mdi", name: "download" },
    },
  ];

  // Combined categories for filtering
  const allCategories = [...leftCategories, ...rightCategories];

  // Reactive state for device type - using passed screenWidth for consistency
  let isMobile = $derived(screenWidth < 768);

  // UI State
  let selectedCategory = $state<string | null>(null);
  let categoryIcons = $state<Record<string, string>>({});
  let showingCategories = $state(true);
  let transitioning = $state(false);

  // Tweens for smooth animations
  const categoryOpacityTween = new Tween(1, {
    duration: 300,
    easing: cubicInOut,
  });
  const linksOpacityTween = new Tween(0, {
    duration: 300,
    easing: cubicInOut,
  });
  const backButtonOpacityTween = new Tween(0, {
    duration: 300,
    easing: cubicInOut,
  });

  // Reactive state from tweens
  let categoryOpacity = $derived(categoryOpacityTween.current);
  let linksOpacity = $derived(linksOpacityTween.current);
  let backButtonOpacity = $derived(backButtonOpacityTween.current);

  // Create back button scale spring
  const backButtonScale = new Spring(1, {
    stiffness: 0.1,
    damping: 0.4,
  });

  // Track back button scale for component updates
  let backButtonScaleValue = $state(1);
  $effect(() => {
    backButtonScaleValue = backButtonScale.current;
  });

  // Get all links once for filtering by category
  const allLinks = links;

  // Fetch icons for category buttons
  async function fetchCategoryIcons() {
    for (const category of allCategories) {
      try {
        const { prefix, name } = category.icon;
        const response = await fetch(
          `https://api.iconify.design/${prefix}.json?icons=${name}`,
          {
            mode: "cors",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          console.error(`Failed to fetch icon for ${category.name}`);
          continue;
        }

        const data = await response.json();
        if (data && data.icons && data.icons[name] && data.icons[name].body) {
          categoryIcons[category.id] = data.icons[name].body;
        }
      } catch (error) {
        console.error(`Error fetching icon for ${category.name}:`, error);
      }
    }
  }

  // Filtered links based on selected category - using $derived to prevent infinite loops
  let filteredLinks = $derived.by(() => {
    // Only filter when we have a selected category and not transitioning
    if (!selectedCategory || transitioning) {
      return [];
    }
    
    // Filter links directly by their category property
    const filtered = allLinks.filter(
      (link) => link.category === selectedCategory
    );
    
    console.log(`📦 Filtered ${filtered.length} links for "${selectedCategory}":`, $state.snapshot(filtered).map(l => l.name));
    return filtered;
  });

  // Z depth for links and UI - in front of the dragon
  const LINKS_Z_DEPTH = 6;
  
  // Consistent back button Y position for both component types (using $derived)
  let backButtonYPosition = $derived(visibleHeightAtZDepth(LINKS_Z_DEPTH) * 0.05);

  // Dimensions are derived from camera - FIXED CALCULATION
  function visibleHeightAtZDepth(depth: number): number {
    if (!camera.current) return 10; // Default fallback

    // Convert from z-depth to distance from camera
    const distance = Math.abs(depth - camera.current.position.z);

    // Fixed calculation using proper formula
    return (
      2 *
      Math.tan(
        ((camera.current as THREE.PerspectiveCamera).fov * Math.PI) / 180 / 2
      ) *
      distance
    );
  }

  function visibleWidthAtZDepth(depth: number): number {
    if (!camera.current) {
      console.warn("Camera is not available when calculating width");
      return 10; // Default fallback
    }

    const height = visibleHeightAtZDepth(depth);
    const aspect = (camera.current as THREE.PerspectiveCamera).aspect || 1;
    console.log(
      `Camera aspect: ${aspect}, Height: ${height}, Calculated width: ${height * aspect}`
    );
    return height * aspect;
  }

  // Calculate grid layout for links with equidistant spacing and floor constraints
  function calculateGridLayout(links: LinkType[]) {
    if (!camera.current || links.length === 0 || !size) {
      return { leftPositions: [], rightPositions: [], linkSize: 4 };
    }

    // Get visible dimensions at the links' Z depth
    const visibleHeight = visibleHeightAtZDepth(LINKS_Z_DEPTH);
    const visibleWidth = visibleWidthAtZDepth(LINKS_Z_DEPTH);

    // Split links between left and right sides
    const leftLinks = links.slice(0, Math.ceil(links.length / 2));
    const rightLinks = links.slice(Math.ceil(links.length / 2));
    const maxPerSide = Math.max(leftLinks.length, rightLinks.length);

    // Calculate dragon bounding box (adjust as needed based on your dragon model)
    const DRAGON_WIDTH = 3; // Assuming ENVIRONMENT_SCALE from parent component
    const DRAGON_CENTER_X = 0; // Assuming dragon is centered at x=0

    // Calculate how far from center we should place the links
    // On mobile: position links closer to screen edge to ensure visibility
    const dragonEdgeX = DRAGON_CENTER_X + DRAGON_WIDTH / 2;
    const screenEdgeX = visibleWidth / 2;
    const availableSpace = screenEdgeX - dragonEdgeX;

    const distanceFromCenter = dragonEdgeX + availableSpace * 0.5;

    // Position links
    let leftX = -distanceFromCenter;
    let rightX = distanceFromCenter;

    // Check if positions are within screen bounds and adjust if necessary
    // Account for link size in the check (using half the maxLinkSize for now)
    const maxLinkSize = isMobile ? 2.5 : 4;
    const linkRadius = maxLinkSize / 2;

    // Function to check if an object is on screen
    function isOnScreen(x: number): boolean {
      // Check if the object with its size/radius would be fully visible on screen
      return Math.abs(x) + linkRadius < screenEdgeX;
    }

    // Adjust positions if they would be off-screen
    if (!isOnScreen(leftX)) {
      // Move it inward so it's visible (with a small margin)
      leftX = -screenEdgeX + linkRadius + 0.5; // 0.5 is margin
      console.warn("Left links would be off-screen - adjusting X position");
    }

    if (!isOnScreen(rightX)) {
      // Move it inward so it's visible (with a small margin)
      rightX = screenEdgeX - linkRadius - 0.5; // 0.5 is margin
      console.warn("Right links would be off-screen - adjusting X position");
    }

    // Define vertical boundaries
    const TOP_BOUNDARY = visibleHeight * 0.45; // Top 45% of screen
    const BOTTOM_BOUNDARY = -0.85; // Floor level
    const availableVerticalSpace = TOP_BOUNDARY - BOTTOM_BOUNDARY;

    // Calculate link size based on available vertical space and device type
    // Make links smaller on mobile
    const linkSize = Math.min(
      (availableVerticalSpace * 0.8) / Math.max(maxPerSide, 1), // Use 80% of available height
      maxLinkSize // Maximum size cap (smaller on mobile)
    );

    // Calculate positions with equidistant spacing
    const leftPositions: [number, number, number][] = [];
    const rightPositions: [number, number, number][] = [];

    if (leftLinks.length > 0) {
      // Calculate spacing for left column
      // For one link, it should be centered. For multiple links, they should be equidistant.
      const leftTotalSpace = leftLinks.length * linkSize;
      const leftSpacing =
        (availableVerticalSpace - leftTotalSpace) / (leftLinks.length + 1);

      // Position each link with equal spacing
      for (let i = 0; i < leftLinks.length; i++) {
        // Start from top boundary and work down with equal spacing
        // TOP_BOUNDARY - (spacing for top) - (i * (link size + spacing between links)) - (half linkSize)
        const y =
          TOP_BOUNDARY -
          leftSpacing -
          i * (linkSize + leftSpacing) -
          linkSize / 2;

        // Ensure we're not going below the floor
        if (y - linkSize / 2 < BOTTOM_BOUNDARY) {
          console.warn("Link would be below floor - adjusting position");
          // Position at floor level plus half link size to keep it above floor
          leftPositions.push([
            leftX,
            BOTTOM_BOUNDARY + linkSize / 2,
            LINKS_Z_DEPTH,
          ]);
        } else {
          leftPositions.push([leftX, y, LINKS_Z_DEPTH]);
        }
      }
    }

    if (rightLinks.length > 0) {
      // Calculate spacing for right column
      const rightTotalSpace = rightLinks.length * linkSize;
      const rightSpacing =
        (availableVerticalSpace - rightTotalSpace) / (rightLinks.length + 1);

      // Position each link with equal spacing
      for (let i = 0; i < rightLinks.length; i++) {
        // Start from top boundary and work down with equal spacing
        const y =
          TOP_BOUNDARY -
          rightSpacing -
          i * (linkSize + rightSpacing) -
          linkSize / 2;

        // Ensure we're not going below the floor
        if (y - linkSize / 2 < BOTTOM_BOUNDARY) {
          console.warn("Link would be below floor - adjusting position");
          // Position at floor level plus half link size to keep it above floor
          rightPositions.push([
            rightX,
            BOTTOM_BOUNDARY + linkSize / 2,
            LINKS_Z_DEPTH,
          ]);
        } else {
          rightPositions.push([rightX, y, LINKS_Z_DEPTH]);
        }
      }
    }

    return { leftPositions, rightPositions, linkSize };
  }

  // Store grid layout state
  let gridLayout = $state({
    leftPositions: [] as [number, number, number][],
    rightPositions: [] as [number, number, number][],
    linkSize: 4,
  });

  // Handle category selection
  async function selectCategory(categoryId: string) {
    console.log(`🎯 selectCategory called with categoryId: "${categoryId}"`);
    console.log(`🎯 Current state: transitioning=${$state.snapshot(transitioning)}, selectedCategory="${$state.snapshot(selectedCategory)}", showingCategories=${$state.snapshot(showingCategories)}`);
    
    // Prevent infinite loops and re-entry
    if (transitioning) {
      console.log(`🚫 selectCategory blocked - already transitioning`);
      return;
    }
    
    if (selectedCategory === categoryId && !showingCategories) {
      console.log(`🚫 selectCategory blocked - already showing this category`);
      return;
    }
    
    // Allow execution from any view state to support fireball navigation
    console.log(`✅ selectCategory proceeding from any view state`);
    
    transitioning = true;
    console.log(`🔒 Transition started for category: "${categoryId}"`);

    // Fade out categories first
    await categoryOpacityTween.set(0);
    console.log(`🌫️ Categories faded out`);

    // Update category and view state simultaneously  
    selectedCategory = categoryId;
    showingCategories = false;
    console.log(`📝 State updated: selectedCategory="${$state.snapshot(selectedCategory)}", showingCategories=${$state.snapshot(showingCategories)}`);

    // Wait for reactive effects to process
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Wait for reactive systems to update grid layout
    await tick();
    console.log(`📊 Grid layout will be calculated by reactive system for category "${categoryId}"`);

    // Fade in links and back button
    await Promise.all([
      linksOpacityTween.set(1),
      backButtonOpacityTween.set(1),
    ]);
    console.log(`✨ Links and back button faded in`);

    // Reset back button to default state when entering links view
    const backButtonComponent = crateComponents["back-button"];
    if (backButtonComponent && backButtonComponent.resetToDefault) {
      backButtonComponent.resetToDefault();
    }

    transitioning = false;
    console.log(`✅ Category selection complete for "${categoryId}"`);
  }

  // Handle back button
  async function goBack() {
    if (transitioning) return;
    transitioning = true;

    // Fade out links and back button
    await Promise.all([
      linksOpacityTween.set(0),
      backButtonOpacityTween.set(0),
    ]);

    // Switch view
    selectedCategory = null;
    showingCategories = true;

    await tick();
    calculateCategoryPositions();
    gridLayout.leftPositions = [];
    gridLayout.rightPositions = [];

    // Reset all category crates to default state when returning to category view
    console.log(`🔄 Resetting category crates to default state`);
    leftCategories.forEach((category) => {
      const leftCrateId = `category-left-${category.id}`;
      const leftComponent = crateComponents[leftCrateId];
      if (leftComponent && leftComponent.resetToDefault) {
        console.log(`🔄 Resetting left crate: ${leftCrateId}`);
        leftComponent.resetToDefault();
      }
    });
    
    rightCategories.forEach((category) => {
      const rightCrateId = `category-right-${category.id}`;
      const rightComponent = crateComponents[rightCrateId];
      if (rightComponent && rightComponent.resetToDefault) {
        console.log(`🔄 Resetting right crate: ${rightCrateId}`);
        rightComponent.resetToDefault();
      }
    });

    // Fade in categories
    await categoryOpacityTween.set(1);

    transitioning = false;
  }

  // Scale springs for category buttons
  let categoryScales = $state<Record<string, Spring<number>>>({});
  let categoryScaleValues = $state<Record<string, number>>({});

  // Initialize scales for all category buttons
  function initScales() {
    allCategories.forEach((category) => {
      categoryScales[category.id] = new Spring(1, {
        stiffness: 0.1,
        damping: 0.4,
      });
      categoryScaleValues[category.id] = 1;
    });
  }

  // Update scale values for reactivity
  $effect(() => {
    allCategories.forEach((category) => {
      if (categoryScales[category.id]) {
        categoryScaleValues[category.id] = categoryScales[category.id].current;
      }
    });
  });

  // Calculate positions for category buttons with equidistant spacing
  function calculateCategoryPositions() {
    if (!camera.current) return;

    const visHeight = visibleHeightAtZDepth(LINKS_Z_DEPTH);
    const visWidth = visibleWidthAtZDepth(LINKS_Z_DEPTH);

    // Calculate dragon bounding box width - adjust as needed based on your dragon model
    const DRAGON_WIDTH = 6 * 1.5; // Assuming ENVIRONMENT_SCALE from parent component
    const DRAGON_CENTER_X = 0; // Assuming dragon is centered at x=0

    // Calculate how far from center we should place the categories
    // On mobile: position categories closer to screen edge to ensure visibility
    const dragonEdgeX = DRAGON_CENTER_X + DRAGON_WIDTH / 2;
    const screenEdgeX = visWidth / 2;
    const availableSpace = screenEdgeX - dragonEdgeX;

    const distanceFromCenter =
      dragonEdgeX + availableSpace * (isMobile ? 0.75 : 0.5);

    // Fixed size for category buttons - smaller on mobile
    const categorySize = isMobile ? 3 : 4;
    const categoryRadius = categorySize / 2;

    // Function to check if an object is on screen
    function isOnScreen(x: number): boolean {
      // Check if the object with its size/radius would be fully visible on screen
      return Math.abs(x) + categoryRadius < screenEdgeX;
    }

    // Calculate adjusted X positions for left and right categories
    let leftX = -distanceFromCenter;
    let rightX = distanceFromCenter;

    // Adjust positions if they would be off-screen
    if (!isOnScreen(leftX)) {
      // Move it inward so it's visible (with a small margin)
      leftX = -screenEdgeX + categoryRadius + 0.5; // 0.5 is margin
      console.warn(
        "Left categories would be off-screen - adjusting X position"
      );
    }

    if (!isOnScreen(rightX)) {
      // Move it inward so it's visible (with a small margin)
      rightX = screenEdgeX - categoryRadius - 0.5; // 0.5 is margin
      console.warn(
        "Right categories would be off-screen - adjusting X position"
      );
    }

    // Define vertical boundaries
    const TOP_BOUNDARY = visHeight * 0.45; // Top 45% of screen
    const BOTTOM_BOUNDARY = -1; // Floor level
    const availableVerticalSpace = TOP_BOUNDARY - BOTTOM_BOUNDARY;

    // Calculate positions for left categories with equal spacing
    if (leftCategories.length > 0) {
      const leftTotalSpace = leftCategories.length * categorySize;
      const leftSpacing =
        (availableVerticalSpace - leftTotalSpace) / (leftCategories.length + 1);

      leftCategories.forEach((cat, i) => {
        // Start from top boundary and work down
        const y =
          TOP_BOUNDARY -
          leftSpacing -
          i * (categorySize + leftSpacing) -
          categorySize / 2;

        // Ensure we're not going below the floor
        if (y - categorySize / 2 < BOTTOM_BOUNDARY) {
          categoryPositions[cat.id] = [
            leftX,
            BOTTOM_BOUNDARY + categorySize / 2,
            LINKS_Z_DEPTH,
          ];
        } else {
          categoryPositions[cat.id] = [leftX, y, LINKS_Z_DEPTH];
        }
      });
    }

    // Calculate positions for right categories with equal spacing
    if (rightCategories.length > 0) {
      const rightTotalSpace = rightCategories.length * categorySize;
      const rightSpacing =
        (availableVerticalSpace - rightTotalSpace) /
        (rightCategories.length + 1);

      rightCategories.forEach((cat, i) => {
        // Start from top boundary and work down
        const y =
          TOP_BOUNDARY -
          rightSpacing -
          i * (categorySize + rightSpacing) -
          categorySize / 2;

        // Ensure we're not going below the floor
        if (y - categorySize / 2 < BOTTOM_BOUNDARY) {
          categoryPositions[cat.id] = [
            rightX,
            BOTTOM_BOUNDARY + categorySize / 2,
            LINKS_Z_DEPTH,
          ];
        } else {
          categoryPositions[cat.id] = [rightX, y, LINKS_Z_DEPTH];
        }
      });
    }
  }

  // Calculate grid layout reactively using $derived
  let calculatedGridLayout = $derived.by(() => {
    // Only calculate when showing links, not transitioning, and have filtered links
    if (
      transitioning ||
      showingCategories ||
      filteredLinks.length === 0 ||
      !$size ||
      $size.width <= 0
    ) {
      return { leftPositions: [], rightPositions: [], linkSize: 4 };
    }
    
    console.log(`🔧 Calculating grid layout for ${$state.snapshot(filteredLinks).length} links`);
    const layout = calculateGridLayout(filteredLinks);
    console.log(`🔧 New grid layout:`, layout);
    return layout;
  });
  
  // Update gridLayout when calculatedGridLayout changes
  $effect(() => {
    gridLayout = calculatedGridLayout;
  });

  // Store category positions with validation
  let categoryPositions = $state<Record<string, [number, number, number]>>({});
  
  // Default/fallback positions for when calculations aren't ready
  const defaultPositions = {
    personal: [-6, 2, LINKS_Z_DEPTH] as [number, number, number],
    professional: [-6, 0, LINKS_Z_DEPTH] as [number, number, number],
    projects: [6, 2, LINKS_Z_DEPTH] as [number, number, number],
    downloads: [6, 0, LINKS_Z_DEPTH] as [number, number, number],
  };
  
  // Function to get safe position with fallback
  function getSafePosition(categoryId: string): [number, number, number] {
    const calculated = categoryPositions[categoryId];
    const fallback = defaultPositions[categoryId as keyof typeof defaultPositions];
    
    if (calculated && calculated.every(coord => isFinite(coord))) {
      return calculated;
    }
    
    console.warn(`⚠️ Using fallback position for category: ${categoryId}`);
    return fallback || [0, 0, LINKS_Z_DEPTH];
  }
  
  // Function to get safe link position with fallback
  function getSafeLinkPosition(positions: [number, number, number][], index: number): [number, number, number] | null {
    const position = positions[index];
    
    if (position && position.every(coord => isFinite(coord))) {
      return position;
    }
    
    console.warn(`⚠️ Link position at index ${index} is invalid:`, position);
    return null;
  }

  // Registry for exploding crate components
  let crateComponents = $state<Record<string, { explodeCrate: () => void; resetCrate: () => void; resetToDefault: () => void; explodeWithAction: (action?: () => void) => Promise<void> }>>({});

  // Function to trigger explosion on a specific crate
  export async function triggerCrateExplosion(crateId: string): Promise<void> {
    const crate = crateComponents[crateId];
    if (crate && crate.explodeCrate) {
      crate.explodeCrate();
      // Wait for explosion animation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Initialize category positions when camera and size are available
  $effect(() => {
    if (!$size || !camera.current || transitioning) return;
    
    console.log(`📍 Calculating category positions...`);
    calculateCategoryPositions();
  });

  // Throttled effect to update layout when window/camera changes
  let lastLayoutUpdate = 0;
  $effect(() => {
    // Dependencies - any of these changing should trigger an update
    const deps = [
      (camera.current as THREE.PerspectiveCamera)?.aspect,
      (camera.current as THREE.PerspectiveCamera)?.position.z,
      (camera.current as THREE.PerspectiveCamera)?.fov,
      $size?.width,
      $size?.height,
      isMobile,
    ];

    // Prevent layout updates during transitions
    if (transitioning) return;
    
    // Throttle updates to prevent excessive recalculations
    const now = performance.now();
    if (now - lastLayoutUpdate < 200) return;
    lastLayoutUpdate = now;

    if (showingCategories) {
      calculateCategoryPositions();
    }
    // Note: gridLayout is now handled by the derived value above
  });

  // Register crates with SceneController - split into separate effects to prevent loops
  
  // Register category crates when positions and components are ready
  $effect(() => {
    if (!sceneController || transitioning || !showingCategories) return;
    
    console.log(`🎯 Registering category crates...`);
    
    // Register left category crates
    leftCategories.forEach((category) => {
      const leftCrateId = `category-left-${category.id}`;
      const leftComponent = crateComponents[leftCrateId];
      
      if (leftComponent) {
        const safePosition = getSafePosition(category.id);
        const positionVector = new THREE.Vector3(...safePosition);
        
        console.log(`🎯 Registering left category ${category.id} at position:`, safePosition);
        
        sceneController.registerCrate(leftCrateId, {
          explode: () => {
            console.log(`💥 Registry explosion for left category: ${category.id}`);
            if (leftComponent?.explodeWithAction) {
              leftComponent.explodeWithAction(() => selectCategory(category.id));
            }
          },
          reset: () => leftComponent.resetCrate?.()
        }, positionVector);
      }
    });
    
    // Register right category crates  
    rightCategories.forEach((category) => {
      const rightCrateId = `category-right-${category.id}`;
      const rightComponent = crateComponents[rightCrateId];
      
      if (rightComponent) {
        const safePosition = getSafePosition(category.id);
        const positionVector = new THREE.Vector3(...safePosition);
        
        console.log(`🎯 Registering right category ${category.id} at position:`, safePosition);
        
        sceneController.registerCrate(rightCrateId, {
          explode: () => {
            console.log(`💥 Registry explosion for right category: ${category.id}`);
            if (rightComponent?.explodeWithAction) {
              rightComponent.explodeWithAction(() => selectCategory(category.id));
            }
          },
          reset: () => rightComponent.resetCrate?.()
        }, positionVector);
      }
    });
  });
  
  // Register link crates when in links view
  $effect(() => {
    if (!sceneController || transitioning || showingCategories || filteredLinks.length === 0) return;
    
    console.log(`🎯 Registering ${$state.snapshot(filteredLinks).length} link crates...`);
    
    // Register link crates
    filteredLinks.forEach((link, i) => {
      const isLeftSide = i < Math.ceil(filteredLinks.length / 2);
      const leftIndex = i;
      const rightIndex = i - Math.ceil(filteredLinks.length / 2);
      
      if (isLeftSide) {
        // Left side link
        const leftCrateId = `link-left-${link.name}-${i}`;
        const leftComponent = crateComponents[leftCrateId];
        const safePosition = getSafeLinkPosition(gridLayout.leftPositions, leftIndex);
        
        if (leftComponent && safePosition) {
          const positionVector = new THREE.Vector3(...safePosition);
          console.log(`🎯 Registering left link ${link.name} at position:`, safePosition);
          
          sceneController.registerCrate(leftCrateId, {
            explode: () => leftComponent.explodeCrate?.(),
            reset: () => leftComponent.resetCrate?.()
          }, positionVector);
        } else {
          console.warn(`⚠️ Cannot register left link ${link.name}: component=${!!leftComponent}, position=${!!safePosition}`);
        }
      } else {
        // Right side link
        const rightCrateId = `link-right-${link.name}-${rightIndex}`;
        const rightComponent = crateComponents[rightCrateId];
        const safePosition = getSafeLinkPosition(gridLayout.rightPositions, rightIndex);
        
        if (rightComponent && safePosition) {
          const positionVector = new THREE.Vector3(...safePosition);
          console.log(`🎯 Registering right link ${link.name} at position:`, safePosition);
          
          sceneController.registerCrate(rightCrateId, {
            explode: () => rightComponent.explodeCrate?.(),
            reset: () => rightComponent.resetCrate?.()
          }, positionVector);
        } else {
          console.warn(`⚠️ Cannot register right link ${link.name}: component=${!!rightComponent}, position=${!!safePosition}`);
        }
      }
    });
    
    // Register back button
    const backButtonComponent = crateComponents["back-button"];
    if (backButtonComponent) {
      const backButtonPosition = new THREE.Vector3(0, backButtonYPosition, LINKS_Z_DEPTH + 3);
      sceneController.registerCrate("back-button", {
        explode: () => {
          console.log(`💥 Registry explosion for back button`);
          if (backButtonComponent?.explodeWithAction) {
            backButtonComponent.explodeWithAction(() => goBack());
          }
        },
        reset: () => backButtonComponent.resetCrate?.()
      }, backButtonPosition);
    }
  });

  // Initialize on mount
  onMount(async () => {
    initScales();
    await fetchCategoryIcons();
    calculateCategoryPositions();
  });

  // Enable interactivity
  interactivity();
</script>

<!-- Categories view -->
{#if visible}
  {#if showingCategories}
    <T.Group visible={true}>
      <!-- Left side categories as Link components -->
      {#each leftCategories as category, i}
        <!-- Category link object -->
        {#if useExplodingCrates}
          <CrateLinkExplode
            {dracoLoader}
            {screenWidth}
            link={{
              name: category.name,
              type: "category" as any,
              icon: category.icon,
              category: category.name,
            }}
            position={getSafePosition(category.id)}
            index={i}
            columnKey="left"
            width={isMobile ? 3 : 4}
            height={isMobile ? 3 : 4}
            opacity={categoryOpacity}
            crateId={`category-left-${category.id}`}
            bind:this={crateComponents[`category-left-${category.id}`]}
            onLinkClick={(url, type, position, action) => {
              // Use fireball system with immediate action execution for categories
              onLinkClick!(url, type, position, category.name, () =>
                selectCategory(category.id), `category-left-${category.id}`
              );
            }}
          />
        {:else}
          <CrateLink
            {dracoLoader}
            link={{
              name: category.name,
              type: "category" as any,
              icon: category.icon,
              category: category.name,
            }}
            position={getSafePosition(category.id)}
            index={i}
            columnKey="left"
            width={isMobile ? 3 : 4}
            height={isMobile ? 3 : 4}
            opacity={categoryOpacity}
            onLinkClick={(url, type, position, action) => {
              // Use fireball system with immediate action execution for categories
              onLinkClick!(url, type, position, category.name, () =>
                selectCategory(category.id), `category-left-${category.id}`
              );
            }}
          />
        {/if}
      {/each}

      <!-- Right side categories as Link components -->
      {#each rightCategories as category, i}
        <!-- Category link object -->
        {#if useExplodingCrates}
          <CrateLinkExplode
            {dracoLoader}
            {screenWidth}
            link={{
              name: category.name,
              type: "category" as any,
              icon: category.icon,
              category: category.name,
            }}
            position={getSafePosition(category.id)}
            index={i}
            columnKey="right"
            width={isMobile ? 3 : 4}
            height={isMobile ? 3 : 4}
            opacity={categoryOpacity}
            crateId={`category-right-${category.id}`}
            bind:this={crateComponents[`category-right-${category.id}`]}
            onLinkClick={(url, type, position, action) => {
              // Use fireball system with immediate action execution for categories
              onLinkClick!(url, type, position, category.name, () =>
                selectCategory(category.id), `category-right-${category.id}`
              );
            }}
          />
        {:else}
          <CrateLink
            {dracoLoader}
            link={{
              name: category.name,
              type: "category" as any,
              icon: category.icon,
              category: category.name,
            }}
            position={getSafePosition(category.id)}
            index={i}
            columnKey="right"
            width={isMobile ? 3 : 4}
            height={isMobile ? 3 : 4}
            opacity={categoryOpacity}
            onLinkClick={(url, type, position, action) => {
              // Use fireball system with immediate action execution for categories
              onLinkClick!(url, type, position, category.name, () =>
                selectCategory(category.id), `category-right-${category.id}`
              );
            }}
          />
        {/if}
      {/each}
    </T.Group>
  {:else}
    <T.Group visible={true}>
      <!-- Left side links -->
      {#each filteredLinks.slice(0, Math.ceil(filteredLinks.length / 2)) as link, i}
        {#if i < gridLayout.leftPositions.length}
          {#if useExplodingCrates}
            <CrateLinkExplode
              {dracoLoader}
              {screenWidth}
              {link}
              position={gridLayout.leftPositions[i]}
              index={i}
              columnKey="left"
              width={gridLayout.linkSize}
              height={gridLayout.linkSize}
              onLinkClick={onLinkClick}
              opacity={linksOpacity}
              crateId={`link-left-${link.name}-${i}`}
              bind:this={crateComponents[`link-left-${link.name}-${i}`]}
            />
          {:else}
            <CrateLink
              {dracoLoader}
              {link}
              position={gridLayout.leftPositions[i]}
              index={i}
              columnKey="left"
              width={gridLayout.linkSize}
              height={gridLayout.linkSize}
              {onLinkClick}
              opacity={linksOpacity}
            />
          {/if}
        {/if}
      {/each}

      <!-- Right side links -->
      {#each filteredLinks.slice(Math.ceil(filteredLinks.length / 2)) as link, i}
        {#if i < gridLayout.rightPositions.length}
          {#if useExplodingCrates}
            <CrateLinkExplode
              {dracoLoader}
              {screenWidth}
              {link}
              position={gridLayout.rightPositions[i]}
              index={i + Math.ceil(filteredLinks.length / 2)}
              columnKey="right"
              width={gridLayout.linkSize}
              height={gridLayout.linkSize}
              onLinkClick={onLinkClick}
              opacity={linksOpacity}
              crateId={`link-right-${link.name}-${i}`}
              bind:this={crateComponents[`link-right-${link.name}-${i}`]}
            />
          {:else}
            <CrateLink
              {dracoLoader}
              {link}
              position={gridLayout.rightPositions[i]}
              index={i + Math.ceil(filteredLinks.length / 2)}
              columnKey="right"
              width={gridLayout.linkSize}
              height={gridLayout.linkSize}
              {onLinkClick}
              opacity={linksOpacity}
            />
          {/if}
        {/if}
      {/each}

      <!-- Back button - positioned at the bottom -->
      {#if useExplodingCrates}
        <CrateLinkExplode
          {dracoLoader}
          {screenWidth}
          link={{
            name: "Back",
            type: "action",
            icon: "mdi:arrow-left",
            inlineIcon: true,
          }}
          position={[
            0,
            backButtonYPosition,
            LINKS_Z_DEPTH + 2,
          ]}
          index={0}
          columnKey="bottom"
          height={isMobile ? 1.5 : 2}
          width={isMobile ? 2.5 : 3}
          opacity={backButtonOpacity}
          crateId="back-button"
          bind:this={crateComponents["back-button"]}
          onLinkClick={(url, type, position, action) => {
            // Use fireball system with immediate action execution for back button
            onLinkClick!(url, type, position, undefined, goBack, "back-button");
          }}
        />
      {:else}
        <CrateLink
          {dracoLoader}
          link={{
            name: "Back",
            type: "action",
            icon: "mdi:arrow-left",
            inlineIcon: true,
          }}
          position={[
            0,
            backButtonYPosition,
            LINKS_Z_DEPTH + 4,
          ]}
          index={0}
          columnKey="bottom"
          height={isMobile ? 1.5 : 2}
          width={isMobile ? 2.5 : 3}
          opacity={backButtonOpacity}
          onLinkClick={(url, type, position, action) => {
            // Use fireball system with immediate action execution for back button
            onLinkClick!(url, type, position, undefined, goBack);
          }}
        />
      {/if}
    </T.Group>
  {/if}
{/if}

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
