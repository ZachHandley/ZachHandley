<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Spring, Tween } from "svelte/motion";
  import { cubicOut, backOut } from "svelte/easing";
  import Icon from "@iconify/svelte";
  import type { Link } from "~/types/baseSchemas";

  let {
    link,
    isVisible = $bindable(),
    clickPosition,
    onNavigate,
    onClose,
  }: {
    link: Link | null;
    isVisible: boolean;
    clickPosition: { x: number; y: number } | null;
    onNavigate: (url: string, type: Link["type"]) => void;
    onClose: () => void;
  } = $props();

  // Animation states
  let modalElement = $state<HTMLDivElement | null>(null);
  let mounted = $state(false);

  // Scale animation for the modal appearance
  const scaleSpring = new Spring(0, {
    stiffness: 0.3,
    damping: 0.6,
  });

  // Opacity animation
  const opacityTween = new Tween(0, {
    duration: 200,
    easing: cubicOut,
  });

  // Position animation for smooth positioning
  const positionSpring = new Spring({ x: 0, y: 0 }, {
    stiffness: 0.4,
    damping: 0.7,
  });

  let scale = $derived(scaleSpring.current);
  let opacity = $derived(opacityTween.current);
  let position = $derived(positionSpring.current);

  // Simple responsive modal positioning - just center it
  function calculateModalPosition(clickPos: { x: number; y: number } | null): { x: number; y: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Center the modal on screen for reliability
    return {
      x: (viewportWidth - 320) / 2, // 320px modal width
      y: (viewportHeight - 280) / 2  // 280px modal height
    };
  }

  // Handle modal visibility changes
  $effect(() => {
    console.log(`🎬 LinkModal $effect triggered:`, {
      isVisible,
      hasLink: !!link,
      linkName: link?.name,
      hasClickPosition: !!clickPosition,
      clickPosition,
      mounted
    });
    
    if (isVisible && link && clickPosition) {
      console.log(`🎬 Modal showing - calculating position and animating in`);
      
      // Calculate safe position
      const safePosition = calculateModalPosition(clickPosition);
      console.log(`🎬 Safe position calculated:`, safePosition);
      
      // Set initial position
      positionSpring.set(safePosition);
      
      // Animate in
      setTimeout(() => {
        console.log(`🎬 Starting modal animation`);
        scaleSpring.set(1);
        opacityTween.set(1);
      }, 10);
    } else {
      console.log(`🎬 Modal hiding or conditions not met - animating out`);
      // Animate out
      scaleSpring.set(0);
      opacityTween.set(0);
    }
  });

  // Handle clicks outside modal
  function handleOutsideClick(event: MouseEvent) {
    if (modalElement && !modalElement.contains(event.target as Node)) {
      onClose();
    }
  }

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  onMount(() => {
    mounted = true;
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener("click", handleOutsideClick);
    document.removeEventListener("keydown", handleKeydown);
  });

  // Handle navigation
  function handleNavigation() {
    if (link?.url && link.type) {
      onNavigate(link.url, link.type);
      onClose();
    }
  }

  // Get domain from URL
  function getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0];
    }
  }

  // Get icon based on link type - use existing icons from link or fallback
  function getTypeIcon(type: Link["type"]): string {
    switch (type) {
      case "download":
        return "mdi:download";
      case "contact":
        return "mdi:card-account-details";
      case "category":
        return "mdi:folder";
      case "action":
        return "mdi:lightning-bolt";
      default:
        return "mdi:link";
    }
  }

  // Get action text based on link type
  function getActionText(type: Link["type"]): string {
    switch (type) {
      case "download":
        return "Download";
      case "contact":
        return "Add Contact";
      case "category":
        return "Navigate";
      case "action":
        return "Execute";
      default:
        return "Visit";
    }
  }

  // Get theme colors based on link type to match your existing theme
  function getThemeColors(type: Link["type"]): { bg: string; border: string; accent: string } {
    switch (type) {
      case "download":
        return { 
          bg: "from-green-900/90 to-green-800/90", 
          border: "border-green-500/50", 
          accent: "text-green-400" 
        };
      case "contact":
        return { 
          bg: "from-blue-900/90 to-blue-800/90", 
          border: "border-blue-500/50", 
          accent: "text-blue-400" 
        };
      case "category":
        return { 
          bg: "from-purple-900/90 to-purple-800/90", 
          border: "border-purple-500/50", 
          accent: "text-purple-400" 
        };
      case "action":
        return { 
          bg: "from-amber-900/90 to-amber-800/90", 
          border: "border-amber-500/50", 
          accent: "text-amber-400" 
        };
      default:
        return { 
          bg: "from-orange-900/90 to-orange-800/90", 
          border: "border-orange-500/50", 
          accent: "text-orange-400" 
        };
    }
  }

  // Get the appropriate icon - prioritize link's icon over type icon
  function getDisplayIcon(): string {
    if (link?.icon) {
      // Convert icon object to string if needed
      if (typeof link.icon === 'object' && 'prefix' in link.icon && 'name' in link.icon) {
        return `${link.icon.prefix}:${link.icon.name}`;
      } else if (typeof link.icon === 'string') {
        return link.icon;
      }
    }
    return getTypeIcon(link?.type || 'url');
  }
</script>

{#if isVisible && link && mounted}
  <!-- Modal backdrop -->
  <div 
    class="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
    style="opacity: {opacity}"
  >
    <!-- Modal container -->
    <div
      bind:this={modalElement}
      class="fixed bg-gradient-to-br {getThemeColors(link.type).bg} rounded-2xl shadow-2xl border {getThemeColors(link.type).border} p-6 max-w-sm backdrop-blur-lg"
      style="
        left: {position.x}px;
        top: {position.y}px;
        transform: scale({scale});
        opacity: {opacity};
        transform-origin: center;
      "
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center rounded-lg bg-black/20 backdrop-blur-sm">
            <Icon icon={getDisplayIcon()} class="w-6 h-6 {getThemeColors(link.type).accent}" />
          </div>
          <div>
            <h3 class="text-white font-bold text-lg">{link.name}</h3>
            {#if link.type === "url" && link.url}
              <p class="text-gray-300 text-sm">{getDomain(link.url)}</p>
            {:else if link.category}
              <p class="text-gray-300 text-sm capitalize">{link.category}</p>
            {/if}
          </div>
        </div>
        
        <!-- Close button -->
        <button
          onclick={onClose}
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/20 transition-colors"
          aria-label="Close modal"
        >
          <Icon icon="mdi:close" class="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <!-- Content preview -->
      {#if link.type === "url" && link.url}
        <div class="mb-4 p-3 bg-black/20 rounded-lg backdrop-blur-sm">
          <p class="text-xs {getThemeColors(link.type).accent} uppercase tracking-wide mb-1">Website</p>
          <p class="text-gray-200 text-sm break-all">{link.url}</p>
        </div>
      {:else if link.type === "download" && link.url}
        <div class="mb-4 p-3 bg-black/20 rounded-lg backdrop-blur-sm">
          <p class="text-xs {getThemeColors(link.type).accent} uppercase tracking-wide mb-1">Download</p>
          <p class="text-gray-200 text-sm">{link.url.split('/').pop() || 'File'}</p>
        </div>
      {:else if link.type === "contact"}
        <div class="mb-4 p-3 bg-black/20 rounded-lg backdrop-blur-sm">
          <p class="text-xs {getThemeColors(link.type).accent} uppercase tracking-wide mb-1">Contact Info</p>
          <p class="text-gray-200 text-sm">vCard contact information</p>
        </div>
      {/if}

      <!-- Action buttons -->
      <div class="flex gap-3">
        <button
          onclick={handleNavigation}
          class="flex-1 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm border border-white/20 hover:border-white/30 hover:scale-105"
        >
          <Icon icon={getDisplayIcon()} class="w-4 h-4" />
          {getActionText(link.type)}
        </button>
        
        <button
          onclick={onClose}
          class="px-4 py-3 bg-black/30 hover:bg-black/40 text-gray-300 rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-gray-600/30 hover:border-gray-500/50"
        >
          Cancel
        </button>
      </div>

      <!-- Decorative elements that match your medieval theme -->
      <div class="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br {getThemeColors(link.type).accent.replace('text-', 'from-')} to-transparent rounded-full opacity-60"></div>
      <div class="absolute -bottom-1 -left-1 w-3 h-3 bg-gradient-to-tr {getThemeColors(link.type).accent.replace('text-', 'from-')} to-transparent rounded-full opacity-40"></div>
      
      <!-- Medieval-style corner accents -->
      <div class="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-white/20 rounded-tl-lg"></div>
      <div class="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-white/20 rounded-br-lg"></div>
    </div>
  </div>
{/if}

<style>
  /* Add glassmorphism effects for better visual hierarchy */
  .modal-container {
    backdrop-filter: blur(16px);
  }
</style>