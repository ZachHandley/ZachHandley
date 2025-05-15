<script lang="ts">
  import { T } from "@threlte/core";
  import { HTML } from "@threlte/extras";
  import * as THREE from "three";
  import { Spring } from "svelte/motion";
  import { onMount } from "svelte";
  import type { Link as LinkType } from "~/types/baseSchemas";
  import type { Snippet } from "svelte";
  import { fetchIconData } from "~/utils/iconify";

  // Props for the component
  let {
    link,
    position = [0, 0, 0],
    columnKey = "",
    index = 0,
    width = 4,
    height = 4,
    depth = 0.5,
    onLinkClick,
    titleContent,
    loadingContent,
    domainContent,
    opacity = 1, // Added opacity for fade transitions
  }: {
    link: LinkType;
    position?: [number, number, number];
    columnKey?: string;
    index?: number;
    width?: number;
    height?: number;
    depth?: number;
    onLinkClick?: (
      url: string,
      type: LinkType["type"],
      position: THREE.Vector3,
      action?: () => void
    ) => void;
    titleContent?: Snippet<[{ width: number; height: number; z: number }]>;
    loadingContent?: Snippet<[{ width: number; height: number; z: number }]>;
    domainContent?: Snippet<
      [{ width: number; height: number; z: number; domain: string }]
    >;
    opacity?: number;
  } = $props();

  // Extract link properties for easier access
  const {
    url = "",
    name: title = "",
    type = "url",
    category,
    icon,
    action,
  } = link || {};

  // Scale animation using spring
  const scaleSpring = new Spring(1, {
    stiffness: 0.1,
    damping: 0.4,
  });

  // State for hover and animations - all initialized directly
  let isLoading = $state(true);
  let iconSvgData = $state<string | null>(null);
  let faviconFailed = $state(false);
  let scale = $derived(scaleSpring.current);

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

  // Cursor and hover effects
  // Simplified hover state
  let hovering = $state(false);

  function onPointerEnter() {
    hovering = true;
  }

  function onPointerLeave() {
    hovering = false;
  }

  $effect(() => {
    if (hovering) {
      scaleSpring.set(1.05);
    } else {
      scaleSpring.set(1);
    }
  });

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

  // Handle link click
  function handleClick(event: any) {
    event.stopPropagation();
    const positionVector = new THREE.Vector3(
      position[0],
      position[1],
      position[2]
    );
    onLinkClick?.(url, type, positionVector, action);
  }

  // Handle favicon loading error
  function handleFaviconError() {
    console.log(`Favicon failed for ${domain}`);
    faviconFailed = true;
  }

  // Initialize component - load icon immediately
  onMount(async () => {
    console.log(`Link component mounted: ${title}`);

    try {
      // Try to get SVG data from Iconify
      const svgData = await fetchIconData(link);

      if (svgData) {
        iconSvgData = svgData;
      } else {
        // If icon fetch failed, mark favicon as failed to use fallback
        faviconFailed = true;
      }
    } catch (error: any) {
      console.error("Icon loading failed completely:", error);
      faviconFailed = true;
    } finally {
      isLoading = false;
    }
  });
</script>

<T.Group {position} name={`link-${columnKey}-${index}`} oncreate={(ref) => {}}>
  <T.Mesh
    scale.x={scale}
    scale.y={scale}
    scale.z={scale}
    onclick={handleClick}
    onpointerenter={onPointerEnter}
    onpointerleave={onPointerLeave}
  >
    <T.BoxGeometry args={[width, height, depth]} />
    <T.MeshStandardMaterial
      color={hovering ? colorCache.urlHover : getLinkColor(type)}
      emissive={getLinkColor(type)}
      emissiveIntensity={hovering ? 0.5 : 0}
      transparent={true}
      {opacity}
    />

    <!-- Content Container - Always visible -->
    <T.Group
      position.z={depth / 2 + 0.01}
      name={`link-content-${columnKey}-${index}`}
    >
      <!-- Title text - Always visible -->
      <T.Group
        position.y={height * 0.25}
        name={`link-title-${columnKey}-${index}`}
      >
        <HTML
          center
          position.z={0.1}
          occlude={false}
          pointerEvents="none"
          visible={true}
        >
          <div
            style="color: white; font-size: {Math.max(
              12,
              height * 4
            )}px; text-align: center; font-weight: bold; opacity: {opacity}; width: {Math.max(
              80,
              height * 20
            )}px;"
          >
            {title}
          </div>
        </HTML>
      </T.Group>

      <!-- Icon area - moved down to add spacing from title -->
      <T.Group
        position.y={-height * 0.05}
        name={`link-icon-${columnKey}-${index}`}
      >
        {#if isLoading}
          <!-- Loading indicator -->
          <HTML
            center
            position.z={0.1}
            occlude={false}
            pointerEvents="none"
            visible={true}
          >
            <div
              style="color: white; font-size: 12px; text-align: center; opacity: {opacity};"
            >
              Loading...
            </div>
          </HTML>
        {:else}
          <!-- Always show some icon but with reduced size -->
          <HTML
            position.z={0.1}
            center
            occlude={false}
            pointerEvents="none"
            visible={true}
          >
            <div
              style="display: flex; justify-content: center; align-items: center; width: {Math.max(
                24,
                height * 8
              )}px; height: {Math.max(
                24,
                height * 8
              )}px; position: relative; opacity: {opacity};"
            >
              {#if iconSvgData}
                <!-- Use SVG from Iconify API -->
                <div
                  style="width: 100%; height: 100%; color: white;"
                  class="icon-container"
                >
                  <!-- Directly embed SVG -->
                  {@html `<svg viewBox="0 0 24 24">${iconSvgData}</svg>`}
                </div>
              {:else if !faviconFailed && type === "url"}
                <!-- Try favicon as fallback for normal links -->
                <img
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                  alt={domain}
                  width="100%"
                  height="100%"
                  style="object-fit: contain;"
                  onerror={handleFaviconError}
                />
              {:else}
                <!-- Try to fetch fallback icon one more time -->
                {#await fetchIconData(link) then fallbackIcon}
                  <div
                    style="width: 100%; height: 100%; color: white;"
                    class="icon-container"
                  >
                    <!-- Directly embed SVG -->
                    {@html `<svg viewBox="0 0 24 24">${fallbackIcon || '<path d="M13.5 17.5L8.5 12.5L13.5 7.5"/>'}</svg>`}
                  </div>
                {/await}
              {/if}
            </div>
          </HTML>
        {/if}
      </T.Group>

      <!-- Domain text at bottom - Moved further down to add space -->
      <T.Group position.y={-height * 0.35}>
        <HTML
          center
          position.z={0.1}
          occlude={false}
          pointerEvents="none"
          visible={true}
        >
          <div
            style="color: white; font-size: {Math.max(
              10,
              height * 3
            )}px; text-align: center; opacity: {opacity}; width: {Math.max(
              80,
              height * 20
            )}px; overflow: hidden; text-overflow: ellipsis; background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none;"
          >
            {domain}
          </div>
        </HTML>
      </T.Group>
    </T.Group>
  </T.Mesh>
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
