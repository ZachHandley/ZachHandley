<script lang="ts">
  import { T, useThrelte } from "@threlte/core";
  import { HTML, interactivity, Text, useDraco } from "@threlte/extras";
  import * as THREE from "three";
  import type { Link as LinkType } from "~/types/baseSchemas";
  import Link from "./links/Link.svelte";
  import { onMount } from "svelte";
  import { Spring, Tween } from "svelte/motion";
  import { cubicInOut } from "svelte/easing";
  import CrateLink from "./links/CrateLink.svelte";

  // Props with proper TypeScript typing
  let {
    links,
    cameraRef,
    onLinkClick,
    visible = true,
  }: {
    links: LinkType[];
    cameraRef?: THREE.PerspectiveCamera;
    onLinkClick?: (
      url: string,
      type: LinkType["type"],
      position: THREE.Vector3,
      category?: string,
      action?: () => void | Promise<void>
    ) => void;
    visible?: boolean;
  } = $props();

  // Get Threlte context
  const { size } = useThrelte();
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

  // Filtered links based on selected category
  let filteredLinks = $state<LinkType[]>([]);

  $effect(() => {
    if (!selectedCategory) {
      filteredLinks = [];
    } else {
      // Filter links directly by their category property
      filteredLinks = allLinks.filter(
        (link) => link.category === selectedCategory
      );
    }
  });

  // Z depth for links and UI - in front of the dragon
  const LINKS_Z_DEPTH = 6;

  // Dimensions are derived from camera - FIXED CALCULATION
  function visibleHeightAtZDepth(depth: number): number {
    if (!cameraRef) return 10; // Default fallback

    // Convert from z-depth to distance from camera
    const distance = Math.abs(depth - cameraRef.position.z);

    // Fixed calculation using proper formula
    return 2 * Math.tan((cameraRef.fov * Math.PI) / 180 / 2) * distance;
  }

  function visibleWidthAtZDepth(depth: number): number {
    if (!cameraRef) return 10; // Default fallback

    const height = visibleHeightAtZDepth(depth);
    return height * (cameraRef.aspect || 1);
  }

  // Calculate grid layout for links
  function calculateGridLayout(links: LinkType[]) {
    if (!cameraRef || links.length === 0) {
      return { leftPositions: [], rightPositions: [], linkSize: 4 };
    }

    // Get visible dimensions at the links' Z depth
    const visibleHeight = visibleHeightAtZDepth(LINKS_Z_DEPTH);
    const visibleWidth = visibleWidthAtZDepth(LINKS_Z_DEPTH);

    // Calculate link size based on visible area and number of links
    const maxPerSide = Math.ceil(links.length / 2);
    const linkSize = Math.min(
      (visibleHeight * 0.6) / maxPerSide, // 60% of visible height
      visibleWidth * 0.25, // 25% of visible width
      2.5 // Maximum link size cap to prevent oversized links
    );

    // Calculate spacing between links
    const spacing = Math.min(
      linkSize * 1.5,
      (visibleHeight * 0.5) / maxPerSide
    );

    // Calculate X position for left and right columns (30% from center)
    const leftX = -visibleWidth * 0.3;
    const rightX = visibleWidth * 0.3;

    // Distribute links evenly between left and right
    const leftLinks = links.slice(0, Math.ceil(links.length / 2));
    const rightLinks = links.slice(Math.ceil(links.length / 2));

    // Calculate positions for left side
    const leftPositions: [number, number, number][] = [];
    for (let i = 0; i < Math.min(leftLinks.length, maxPerSide); i++) {
      // Start from 10% below top instead of at the very top
      const y = visibleHeight * 0.4 - i * spacing;
      leftPositions.push([leftX, y, LINKS_Z_DEPTH]);
    }

    // Calculate positions for right side
    const rightPositions: [number, number, number][] = [];
    for (let i = 0; i < Math.min(rightLinks.length, maxPerSide); i++) {
      // Start from 10% below top instead of at the very top
      const y = visibleHeight * 0.4 - i * spacing;
      rightPositions.push([rightX, y, LINKS_Z_DEPTH]);
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
    if (transitioning) return;
    transitioning = true;

    selectedCategory = categoryId;

    // Fade out categories
    await categoryOpacityTween.set(0);

    // Switch view
    showingCategories = false;

    // Fade in links and back button
    await Promise.all([
      linksOpacityTween.set(1),
      backButtonOpacityTween.set(1),
    ]);

    transitioning = false;
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

  // Calculate positions for category buttons - IMPROVED SPACING
  function calculateCategoryPositions() {
    if (!cameraRef) return;

    const visHeight = visibleHeightAtZDepth(LINKS_Z_DEPTH);
    const visWidth = visibleWidthAtZDepth(LINKS_Z_DEPTH);

    // Left categories - adjusted y spacing
    leftCategories.forEach((cat, i) => {
      const y = visHeight * 0.5 - i * visHeight * 0.35; // Increased base position from 0.3 to 0.5 to elevate off ground
      categoryPositions[cat.id] = [-visWidth * 0.3, y, LINKS_Z_DEPTH];
    });

    // Right categories - adjusted y spacing
    rightCategories.forEach((cat, i) => {
      const y = visHeight * 0.5 - i * visHeight * 0.35; // Increased base position from 0.3 to 0.5 to elevate off ground
      categoryPositions[cat.id] = [visWidth * 0.3, y, LINKS_Z_DEPTH];
    });
  }

  // Update grid layout when filtered links change
  $effect(() => {
    if (!showingCategories && filteredLinks.length > 0) {
      gridLayout = calculateGridLayout(filteredLinks);
    }
  });

  // Store category positions
  let categoryPositions = $state<Record<string, [number, number, number]>>({});

  // Effect to update layout when window/camera changes
  $effect(() => {
    // Dependencies - any of these changing should trigger an update
    const _ = [
      cameraRef?.aspect,
      cameraRef?.position.z,
      cameraRef?.fov,
      $size?.width,
      $size?.height,
    ];

    if (showingCategories) {
      calculateCategoryPositions();
    } else if (filteredLinks.length > 0) {
      gridLayout = calculateGridLayout(filteredLinks);
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
        <CrateLink
          {dracoLoader}
          link={{
            name: category.name,
            type: "category" as any,
            icon: category.icon,
            category: category.name,
          }}
          position={categoryPositions[category.id] || [
            -4,
            2 - i * 2,
            LINKS_Z_DEPTH,
          ]}
          index={i}
          columnKey="left"
          width={4}
          height={4}
          opacity={categoryOpacity}
          onLinkClick={(url, type, position, action) => {
            onLinkClick!(url, type, position, category.name, () =>
              selectCategory(category.id)
            );
          }}
        />
      {/each}

      <!-- Right side categories as Link components -->
      {#each rightCategories as category, i}
        <!-- Category link object -->
        <CrateLink
          {dracoLoader}
          link={{
            name: category.name,
            type: "category" as any,
            icon: category.icon,
            category: category.name,
          }}
          position={categoryPositions[category.id] || [
            4,
            2 - i * 2,
            LINKS_Z_DEPTH,
          ]}
          index={i}
          columnKey="right"
          width={4}
          height={4}
          opacity={categoryOpacity}
          onLinkClick={(url, type, position, action) => {
            onLinkClick!(url, type, position, category.name, () =>
              selectCategory(category.id)
            );
          }}
        />
      {/each}
    </T.Group>
  {:else}
    <T.Group visible={true}>
      <!-- Left side links -->
      {#each filteredLinks.slice(0, Math.ceil(filteredLinks.length / 2)) as link, i}
        {#if i < gridLayout.leftPositions.length}
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
      {/each}

      <!-- Right side links -->
      {#each filteredLinks.slice(Math.ceil(filteredLinks.length / 2)) as link, i}
        {#if i < gridLayout.rightPositions.length}
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
      {/each}

      <!-- Back button - positioned at the bottom -->
      <CrateLink
        {dracoLoader}
        link={{
          name: "Back",
          type: "action",
          icon: "mdi:arrow-left",
        }}
        position={[
          0,
          visibleHeightAtZDepth(LINKS_Z_DEPTH) * 0.1,
          LINKS_Z_DEPTH + 6,
        ]}
        index={0}
        columnKey="bottom"
        height={2}
        width={3}
        opacity={backButtonOpacity}
        onLinkClick={(url, type, position, action) => {
          onLinkClick!(url, type, position, undefined, goBack);
        }}
      />
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
