<script lang="ts">
  import { Canvas } from "@threlte/core";
  import BaseScene from "./scene/BaseScene.svelte";
  import LoadingScreen from "./ui/LoadingScreen.svelte";
  import ModalManager from "./ui/ModalManager.svelte";
  import type { Link } from "~/types/baseSchemas";
  import { onMount } from "svelte";
  import Icon from "@iconify/svelte";

  // Reactive viewport dimensions
  let innerWidth = $state(0);
  let innerHeight = $state(0);

  // Show/hide info panel - show by default
  let showInfoPanel = $state(true);

  // Active category
  let activeCategory = $state<string | undefined>(undefined);

  // Category descriptions
  const categoryDescriptions = $state<{ [key: string]: string }>({
    personal:
      "My personal social media accounts where I share my daily life and interests.",
    professional:
      "My professional profiles and work portfolio showcasing my expertise in software engineering and AI.",
    projects:
      "A collection of my recent work, including web, mobile, and AI projects.",
    downloads:
      "Downloadable resources including my resume and contact information.",
  });

  // For keyboard navigation
  let keyboardMode = $state(false);

  // Loading state
  let isLoading = $state(true);
  let loadingProgress = $state(0);
  let loadingMessage = $state("Initializing medieval realm...");

  // Modal state for 2D overlay
  let modalManager = $state<{ showModal: (link: Link, x: number, y: number) => void; hideModal: () => void } | null>(null);
  let modalVisible = $state(false);
  let modalLink = $state<Link | null>(null);
  let modalClickPosition = $state<{ x: number; y: number } | null>(null);

  function handleLoadingStateChange(loading: boolean, progress: number, message: string) {
    isLoading = loading;
    loadingProgress = progress;
    loadingMessage = message;
  }

  onMount(() => {
    // Set up keyboard listeners for accessibility
    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        keyboardMode = true;
      }
    });

    window.addEventListener("mousedown", () => {
      keyboardMode = false;
    });
  });

  function handleDragonClick() {
    // This can be used for other functionality now
  }

  function handleInteract(category?: string) {
    activeCategory = category === undefined ? undefined : category;
  }

  function toggleInfoPanel() {
    showInfoPanel = !showInfoPanel;
  }

  const links = $state<Link[]>([
    {
      name: "GitHub",
      url: "https://github.com/zachhandley",
      icon: "simple-icons:github",
      type: "url" as Link["type"],
      category: "personal",
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com/in/zachhandley",
      icon: "simple-icons:linkedin",
      type: "url" as Link["type"],
      category: "personal",
    },
    {
      name: "Resume",
      url: "/files/resume.pdf",
      icon: "mdi:file-pdf-box",
      type: "download" as Link["type"],
      category: "downloads",
    },
    {
      name: "Contact",
      url: "/files/contact.vcf",
      icon: "mdi:card-account-details",
      type: "contact" as Link["type"],
      category: "downloads",
    },
    {
      name: "Black Leaf",
      url: "https://blackleafdigital.com",
      type: "url" as Link["type"],
      category: "professional",
    },
    {
      name: "Socialaize",
      url: "https://socialaize.com",
      type: "url" as Link["type"],
      category: "projects",
    },
    {
      name: "Instagram",
      icon: "simple-icons:instagram",
      url: "https://instagram.com/zachhandley",
      type: "url" as Link["type"],
      category: "personal",
    },
    {
      name: "TikTok",
      icon: "simple-icons:tiktok",
      url: "https://tiktok.com/@zachhandley",
      type: "url" as Link["type"],
      category: "personal",
    },
    {
      name: "Cash App",
      icon: "simple-icons:cashapp",
      url: "https://cash.app/$zachhandley",
      type: "url" as Link["type"],
      category: "personal",
    },
    {
      name: "Server Hosting",
      url: "https://hetzner.cloud/?ref=qPYPJwLBdFg2",
      type: "url" as Link["type"],
      category: "professional",
    },
    {
      name: "DraxSocial",
      url: "https://draxsocial.com",
      type: "url" as Link["type"],
      category: "projects",
    },
    {
      name: "VibzTalentAgency",
      url: "https://vibztalentagency.com",
      type: "url" as Link["type"],
      category: "projects",
    },
    {
      name: "USA Parts & More",
      url: "https://usapartsandmore.com",
      type: "url" as Link["type"],
      category: "projects",
    },
  ]);
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div
  class="w-screen relative max-w-screen h-screen overflow-hidden bg-gray-900"
>
  <!-- 3D Canvas with the scene -->
  <div class="h-full w-full pt-16 md:pt-11">
    <Canvas toneMapping={undefined}>
      <BaseScene
        {handleDragonClick}
        {links}
        {handleInteract}
        {activeCategory}
        onLoadingStateChange={handleLoadingStateChange}
        screenWidth={innerWidth}
        screenHeight={innerHeight}
        {modalManager}
      />
    </Canvas>
  </div>

  <!-- Sliding info panel - slides down from the top -->
  <div
    class="absolute top-16 md:top-11 left-0 right-0 z-10 transition-all duration-500 ease-in-out bg-gradient-to-b from-orange-900/30 via-black/40 to-black/50 backdrop-blur-xl border-b border-orange-500/20 shadow-2xl shadow-orange-500/20"
    style="transform: translateY({showInfoPanel ? '0' : '-100%'}); 
           height: {showInfoPanel ? 'auto' : '0'}; 
           min-height: {showInfoPanel ? 'auto' : '0'};
           overflow: {showInfoPanel ? 'visible' : 'hidden'};"
  >
    <div class="w-full px-4 md:px-6 py-4 md:py-6 max-h-[calc(100vh-8rem)] md:max-h-none overflow-y-auto">
      <!-- Bio section -->
      <div class="mb-6 md:mb-8">
        <h2 class="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4 text-white">
          About Me
        </h2>
        <p class="text-sm sm:text-base md:text-lg text-gray-100 leading-relaxed">
          I'm Zach Handley, a software engineer, full-stack developer, and AI
          specialist based in Los Angeles. At Black Leaf Digital, I create
          innovative web, mobile, and AI solutions with expertise in Azure and
          GPT integration. As a self-taught developer, I'm passionate about
          solving complex problems and making technology accessible.
        </p>
      </div>

      <!-- Categories section -->
      <div class="w-full flex flex-col mb-4 md:mb-6">
        <h2 class="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 text-white">
          Explore My Work
        </h2>
        <p class="text-sm md:text-base text-gray-200 mb-4 md:mb-6">
          Click on the crates in the 3D space to explore different categories of
          links.
        </p>

        <!-- Category cards grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div class="group relative bg-gradient-to-b from-orange-900/20 via-orange-900/10 to-black/30 hover:from-orange-800/30 hover:via-orange-900/20 hover:to-black/40 p-3 md:p-4 rounded-lg border border-orange-500/20 hover:border-orange-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 backdrop-blur-sm">
            <h3 class="text-base md:text-lg font-semibold text-orange-200 capitalize mb-1 md:mb-2 group-hover:text-orange-100 transition-colors">
              Personal
            </h3>
            <p class="text-xs md:text-sm text-orange-100/80 group-hover:text-orange-50 transition-colors leading-relaxed">
              {categoryDescriptions.personal}
            </p>
          </div>

          <div class="group relative bg-gradient-to-b from-orange-900/20 via-orange-900/10 to-black/30 hover:from-orange-800/30 hover:via-orange-900/20 hover:to-black/40 p-3 md:p-4 rounded-lg border border-orange-500/20 hover:border-orange-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 backdrop-blur-sm">
            <h3 class="text-base md:text-lg font-semibold text-orange-200 capitalize mb-1 md:mb-2 group-hover:text-orange-100 transition-colors">
              Professional
            </h3>
            <p class="text-xs md:text-sm text-orange-100/80 group-hover:text-orange-50 transition-colors leading-relaxed">
              {categoryDescriptions.professional}
            </p>
          </div>

          <div class="group relative bg-gradient-to-b from-orange-900/20 via-orange-900/10 to-black/30 hover:from-orange-800/30 hover:via-orange-900/20 hover:to-black/40 p-3 md:p-4 rounded-lg border border-orange-500/20 hover:border-orange-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 backdrop-blur-sm">
            <h3 class="text-base md:text-lg font-semibold text-orange-200 capitalize mb-1 md:mb-2 group-hover:text-orange-100 transition-colors">
              Projects
            </h3>
            <p class="text-xs md:text-sm text-orange-100/80 group-hover:text-orange-50 transition-colors leading-relaxed">
              {categoryDescriptions.projects}
            </p>
          </div>

          <div class="group relative bg-gradient-to-b from-orange-900/20 via-orange-900/10 to-black/30 hover:from-orange-800/30 hover:via-orange-900/20 hover:to-black/40 p-3 md:p-4 rounded-lg border border-orange-500/20 hover:border-orange-400/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 backdrop-blur-sm">
            <h3 class="text-base md:text-lg font-semibold text-orange-200 capitalize mb-1 md:mb-2 group-hover:text-orange-100 transition-colors">
              Downloads
            </h3>
            <p class="text-xs md:text-sm text-orange-100/80 group-hover:text-orange-50 transition-colors leading-relaxed">
              {categoryDescriptions.downloads}
            </p>
          </div>
        </div>
      </div>

      <!-- Toggle button -->
      <div class="flex justify-center pt-3 md:pt-4">
        <button
          class="bg-gradient-to-r from-orange-900/30 to-black/40 hover:from-orange-800/40 hover:to-orange-900/30 text-orange-100 py-2 px-4 rounded-full shadow-lg hover:shadow-orange-500/30 transition-all duration-300 flex items-center gap-2 backdrop-blur-sm border border-orange-500/30 hover:border-orange-400/50 text-sm md:text-base hover:scale-105"
          onclick={toggleInfoPanel}
          aria-label={showInfoPanel ? "Hide information" : "Show information"}
        >
          <span>
            {showInfoPanel ? "Hide Info" : "Show Info"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-transform duration-300"
            style="transform: {showInfoPanel ? 'rotate(180deg)' : 'rotate(0deg)'}"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Always visible title bar at top -->
  <div
    class="absolute top-0 left-0 right-0 z-20 bg-gradient-to-r from-orange-900/40 via-black/60 to-orange-900/40 backdrop-blur-lg border-b border-orange-500/20 shadow-lg shadow-orange-500/10"
  >
    <!-- Mobile: Two-row layout -->
    <div class="md:hidden">
      <!-- Row 1: Title -->
      <div class="py-2 px-4 text-center">
        <h1 class="text-base font-bold text-orange-100 drop-shadow-lg">
          ZachHandley's Portfolio
        </h1>
      </div>
      <!-- Row 2: Controls -->
      <div class="pb-2 px-4 flex justify-center items-center gap-4">
        <a
          href="https://github.com/zachhandley/zachhandley"
          target="_blank"
          rel="noopener noreferrer"
          class="text-orange-200 hover:text-orange-100 transition-all duration-300 hover:scale-110 hover:drop-shadow-lg hover:drop-shadow-orange-500/50"
          aria-label="Visit Zach's GitHub profile"
        >
          <Icon icon="simple-icons:github" width="18" height="18" />
        </a>
        <button
          class="bg-gradient-to-r from-orange-800/30 to-orange-900/40 hover:from-orange-700/40 hover:to-orange-800/50 text-orange-100 py-1 px-3 rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300 flex items-center gap-1 backdrop-blur-sm border border-orange-500/30 hover:border-orange-400/50 text-sm hover:scale-105"
          onclick={toggleInfoPanel}
          aria-label={showInfoPanel ? "Hide information" : "Show information"}
        >
          <span>
            {showInfoPanel ? "Hide" : "Info"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-transform duration-300"
            style="transform: {showInfoPanel ? 'rotate(180deg)' : 'rotate(0deg)'}"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Desktop: Single-row layout -->
    <div class="hidden md:block">
      <div class="py-2 px-4 flex justify-between items-center h-11">
        <h1 class="text-xl md:text-2xl lg:text-3xl font-bold text-orange-100 drop-shadow-lg whitespace-nowrap">
          ZachHandley's Portfolio
        </h1>
        <div class="flex items-center gap-3">
          <a
            href="https://github.com/zachhandley/zachhandley"
            target="_blank"
            rel="noopener noreferrer"
            class="text-orange-200 hover:text-orange-100 transition-all duration-300 hover:scale-110 hover:drop-shadow-lg hover:drop-shadow-orange-500/50"
            aria-label="Visit Zach's GitHub profile"
          >
            <Icon icon="simple-icons:github" width="20" height="20" />
          </a>
          <button
            class="bg-gradient-to-r from-orange-800/30 to-orange-900/40 hover:from-orange-700/40 hover:to-orange-800/50 text-orange-100 py-1 px-3 rounded-full shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-300 flex items-center gap-1 backdrop-blur-sm border border-orange-500/30 hover:border-orange-400/50 text-lg hover:scale-105"
            onclick={toggleInfoPanel}
            aria-label={showInfoPanel ? "Hide information" : "Show information"}
          >
            <span>
              {showInfoPanel ? "Hide Info" : "Show Info"}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="transition-transform duration-300"
              style="transform: {showInfoPanel ? 'rotate(180deg)' : 'rotate(0deg)'}"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Category description tooltip -->
  {#if activeCategory && !showInfoPanel}
    <div
      class="absolute bottom-8 left-0 right-0 text-center pointer-events-none z-30"
    >
      <div class="bg-gradient-to-r from-orange-900/40 via-black/70 to-orange-900/40 backdrop-blur-lg py-3 px-6 rounded-xl inline-block max-w-xs mx-auto shadow-2xl shadow-orange-500/30 border border-orange-500/30">
        <h3 class="text-sm font-semibold capitalize mb-1 text-orange-200">
          {activeCategory}
        </h3>
        <p class="text-xs text-orange-100/90">
          {categoryDescriptions[activeCategory.toLowerCase()] ||
            "Explore this category."}
        </p>
      </div>
    </div>
  {/if}

  <!-- Keyboard navigation mode -->
  {#if keyboardMode}
    <div
      class="fixed inset-0 bg-black/90 z-40 flex items-center justify-center pointer-events-auto"
      aria-label="Keyboard navigation menu"
    >
      <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 class="text-xl font-bold text-white mb-4">Keyboard Navigation</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {#each Object.keys(categoryDescriptions) as category}
            <div class="bg-gray-700 p-4 rounded-lg">
              <h3 class="text-lg font-semibold text-white capitalize mb-2">
                {category}
              </h3>
              <p class="text-xs text-gray-300 mb-3">
                {categoryDescriptions[category]}
              </p>

              <div class="space-y-2">
                {#each links.filter((link) => link.category === category) as link}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded flex items-center"
                  >
                    <span class="flex-1">{link.name}</span>
                    <span class="text-xs bg-gray-500 px-2 py-1 rounded"
                      >{link.type}</span
                    >
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <button
          class="mt-6 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
          onclick={() => (keyboardMode = false)}
        >
          Return to 3D View
        </button>
      </div>
    </div>
  {/if}

  <!-- Screen reader support -->
  <div class="sr-only">
    <div id="sr-instructions">
      <h2>Interactive 3D Portfolio Site</h2>
      <p>Click on crates to explore different categories of links.</p>
    </div>

    <!-- Skip to content link for screen readers -->
    <a
      href="#sr-links"
      class="focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-black focus:text-white focus:p-2 focus:rounded"
    >
      Skip to links navigation
    </a>

    <!-- Accessible links navigation -->
    <nav id="sr-links" aria-label="Accessible navigation">
      <h2>All Links by Category</h2>

      {#each Object.keys(categoryDescriptions) as category}
        <div>
          <h3 id={`sr-category-${category}`}>{category}</h3>
          <p>{categoryDescriptions[category]}</p>
          <ul aria-labelledby={`sr-category-${category}`}>
            {#each links.filter((link) => link.category === category) as link}
              <li>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${link.name} - ${link.type === "download" ? "Download" : "Visit website"}`}
                  class="focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-black focus:text-white focus:p-2 focus:rounded"
                >
                  {link.name}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </nav>
  </div>

  <!-- Loading Screen -->
  <LoadingScreen 
    visible={isLoading}
    progress={loadingProgress}
    message={loadingMessage}
  />

  <!-- 2D Modal Overlay (positioned outside 3D canvas) -->
  <ModalManager 
    bind:this={modalManager}
    bind:isVisible={modalVisible}
    bind:currentLink={modalLink}
    bind:clickPosition={modalClickPosition}
  />
</div>

<style>
  :global(body) {
    overflow: hidden;
    margin: 0;
    padding: 0;
  }

  /* Accessibility styles */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .focus\:not-sr-only:focus {
    position: absolute;
    width: auto;
    height: auto;
    padding: 0.5rem;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }
</style>
