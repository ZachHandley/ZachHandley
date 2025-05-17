<script lang="ts">
  import { Canvas } from "@threlte/core";
  import BaseScene from "./scene/BaseScene.svelte";
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
  <div class="h-full w-full" style="padding-top: 45px;">
    <Canvas toneMapping={undefined}>
      <BaseScene
        {handleDragonClick}
        {links}
        {handleInteract}
        {activeCategory}
      />
    </Canvas>
  </div>

  <!-- Sliding info panel - slides down from the top -->
  <div
    class="absolute top-0 left-0 right-0 z-10 transition-all duration-300 ease-in-out"
    style="transform: translateY({showInfoPanel ? '45px' : '-100%'}); 
           height: {innerWidth < 768
      ? showInfoPanel
        ? 'calc(100vh - 45px)'
        : '0'
      : showInfoPanel
        ? '40vh'
        : '0'}; 
           background-color: rgba(0,0,0,0.85); 
           backdrop-filter: blur(8px);
           overflow: hidden;"
  >
    <div class="w-full h-full px-4">
      <!-- EVERYTHING is full width now -->

      <!-- Bio section -->
      <div class="w-full pt-3 mb-4">
        <h2 class="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2">
          About Me
        </h2>
        <p class="text-sm sm:text-base text-white/90">
          I'm Zach Handley, a software engineer, full-stack developer, and AI
          specialist based in Los Angeles. At Black Leaf Digital, I create
          innovative web, mobile, and AI solutions with expertise in Azure and
          GPT integration. As a self-taught developer, I'm passionate about
          solving complex problems and making technology accessible.
        </p>
      </div>

      <!-- Categories section - full width for everything -->
      <div class="w-full flex flex-col">
        <h2 class="text-lg sm:text-xl font-bold text-white mb-2">
          Explore My Work
        </h2>
        <p class="text-sm text-white/80 mb-3">
          Click on the crates in the 3D space to explore different categories of
          links.
        </p>

        <!-- Full-width grid with responsive columns -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <!-- All boxes in a single row on larger screens -->
          <div
            class="bg-black/30 p-3 rounded-lg border border-white/10 hover:bg-black/40 transition-colors"
          >
            <h3
              class="text-base sm:text-lg font-semibold text-white capitalize mb-1"
            >
              Personal
            </h3>
            <p class="text-xs sm:text-sm text-white/70">
              {categoryDescriptions.personal}
            </p>
          </div>

          <div
            class="bg-black/30 p-3 rounded-lg border border-white/10 hover:bg-black/40 transition-colors"
          >
            <h3
              class="text-base sm:text-lg font-semibold text-white capitalize mb-1"
            >
              Professional
            </h3>
            <p class="text-xs sm:text-sm text-white/70">
              {categoryDescriptions.professional}
            </p>
          </div>

          <div
            class="bg-black/30 p-3 rounded-lg border border-white/10 hover:bg-black/40 transition-colors"
          >
            <h3
              class="text-base sm:text-lg font-semibold text-white capitalize mb-1"
            >
              Projects
            </h3>
            <p class="text-xs sm:text-sm text-white/70">
              {categoryDescriptions.projects}
            </p>
          </div>

          <div
            class="bg-black/30 p-3 rounded-lg border border-white/10 hover:bg-black/40 transition-colors"
          >
            <h3
              class="text-base sm:text-lg font-semibold text-white capitalize mb-1"
            >
              Downloads
            </h3>
            <p class="text-xs sm:text-sm text-white/70">
              {categoryDescriptions.downloads}
            </p>
          </div>
        </div>
        <!-- Toggle button -->
         <div class="flex justify-center mt-4">
           <button
             class="bg-black/40 text-white py-1 px-3 rounded-full shadow-md hover:bg-black/60 transition-all flex items-center gap-1 backdrop-blur-sm border border-white/10 text-lg"
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
             >
               {#if showInfoPanel}
                 <polyline points="18 15 12 9 6 15"></polyline>
               {:else}
                 <polyline points="6 9 12 15 18 9"></polyline>
               {/if}
             </svg>
           </button>
         </div>
      </div>
    </div>
  </div>

  <!-- Always visible title bar at top -->
  <div
    class="absolute top-0 left-0 right-0 z-20"
    style="background-color: rgba(0,0,0,0.75); backdrop-filter: blur(5px); border-bottom: 1px solid rgba(255,255,255,0.1);"
  >
    <div class="py-2 px-4 flex justify-between items-center h-11">
      <h1
        class="text-xl sm:text-2xl md:text-3xl font-bold text-white text-shadow-lg"
      >
        ZachHandley's Site
      </h1>

      <div class="flex items-center gap-3">
        <!-- GitHub icon link -->
        <a
          href="https://github.com/zachhandley/zachhandley"
          target="_blank"
          rel="noopener noreferrer"
          class="text-white hover:text-white/80 transition-colors"
          aria-label="Visit Zach's GitHub profile"
        >
          <Icon icon="simple-icons:github" width="20" height="20" />
        </a>

        <!-- Toggle button -->
        <button
          class="bg-black/40 text-white py-1 px-3 rounded-full shadow-md hover:bg-black/60 transition-all flex items-center gap-1 backdrop-blur-sm border border-white/10 text-lg"
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
          >
            {#if showInfoPanel}
              <polyline points="18 15 12 9 6 15"></polyline>
            {:else}
              <polyline points="6 9 12 15 18 9"></polyline>
            {/if}
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Category description tooltip -->
  {#if activeCategory && !showInfoPanel}
    <div
      class="absolute bottom-8 left-0 right-0 text-center pointer-events-none"
    >
      <div
        class="bg-black/70 backdrop-blur-sm py-2 px-4 rounded-lg inline-block max-w-xs mx-auto shadow-lg border border-white/10"
      >
        <h3 class="text-sm font-semibold text-white capitalize mb-1">
          {activeCategory}
        </h3>
        <p class="text-xs text-white/80">
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
</div>

<style>
  :global(body) {
    overflow: hidden;
    margin: 0;
    padding: 0;
  }

  .text-shadow-lg {
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
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
