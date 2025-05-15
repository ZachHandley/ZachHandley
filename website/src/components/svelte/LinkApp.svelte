<script lang="ts">
  import { Canvas } from "@threlte/core";
  import BaseScene from "./scene/BaseScene.svelte";
  import type { Link } from "~/types/baseSchemas";
  import { onMount } from "svelte";

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
  <!-- 3D Canvas with the scene - adjusted with padding-top -->
  <div
    class="h-full"
    style="padding-top: {showInfoPanel
      ? '20vh'
      : '40px'}; transition: padding-top 0.3s ease;"
  >
    <Canvas toneMapping={undefined}>
      <BaseScene
        {handleDragonClick}
        {links}
        {handleInteract}
        {activeCategory}
      />
    </Canvas>
  </div>

  <!-- Top info panel with toggle -->
  <div class="absolute top-0 left-0 right-0 z-10 pointer-events-none">
    <!-- Info panel - conditionally shown -->
    <div
      class="w-full text-center transition-all duration-300 pointer-events-auto"
      style="background-color: rgba(0,0,0,0.65); backdrop-filter: blur(8px);
             height: {showInfoPanel ? '20vh' : innerWidth < 768 ? '10vh' : '5vh'};
             overflow: hidden;"
    >
      <!-- Title always visible -->
      <div class="py-1 mb-2 px-4">
        <h1
          class="text-xl sm:text-2xl md:text-4xl font-bold text-white text-shadow-lg"
        >
          ZachHandley's Site
        </h1>
      </div>

      <!-- Content only visible when expanded -->
      <div
        class="transition-opacity duration-300 px-3"
        style="opacity: {showInfoPanel ? '1' : '0'}; 
               max-height: {showInfoPanel ? '20vh' : '0'};"
      >
        <p class="text-xs sm:text-sm text-white/90 max-w-xl mx-auto mb-1">
          Welcome to my interactive portfolio. Click on the crates to explore
          different categories.
        </p>

        <!-- Biography - condensed -->
        <div class="bg-black/20 p-2 rounded-lg max-w-xl mx-auto">
          <p class="text-xs sm:text-sm text-white/90 leading-tight">
            I'm Zach Handley, a software engineer, full-stack developer, and AI
            specialist based in Los Angeles. At Black Leaf Digital, I create
            innovative web, mobile, and AI solutions with expertise in Azure and
            GPT integration. As a self-taught developer, I'm passionate about
            solving complex problems and making technology accessible.
          </p>
        </div>
      </div>
    </div>

    <!-- Toggle button (centered at bottom) -->
    <button
      class="absolute left-1/2 -translate-x-1/2 top-full bg-black/60 text-white py-2 px-4 rounded-full shadow-lg z-20 hover:bg-black/80 transition-all pointer-events-auto flex items-center gap-2 backdrop-blur-sm border border-white/20"
      onclick={toggleInfoPanel}
      aria-label={showInfoPanel
        ? "Hide information panel"
        : "Show information panel"}
    >
      <span class="text-xs sm:text-sm font-medium">
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
          <!-- Minimize icon -->
          <polyline points="18 15 12 9 6 15"></polyline>
        {:else}
          <!-- Maximize icon -->
          <polyline points="6 9 12 15 18 9"></polyline>
        {/if}
      </svg>
    </button>

    <!-- Category description -->
    {#if activeCategory}
      <div
        class="absolute bottom-16 left-0 right-0 text-center pointer-events-none"
      >
        <div
          class="bg-black/40 backdrop-blur-sm py-2 px-4 rounded-lg inline-block max-w-xs mx-auto"
        >
          <h3
            class="text-xs sm:text-sm font-semibold text-white capitalize mb-1"
          >
            {activeCategory}
          </h3>
          <p class="text-xs text-white/80">
            {categoryDescriptions[activeCategory.toLowerCase()] ||
              "Explore this category."}
          </p>
        </div>
      </div>
    {/if}

    <!-- Visible in keyboard navigation mode only -->
    {#if keyboardMode}
      <div
        class="fixed inset-0 bg-black/80 z-40 flex items-center justify-center pointer-events-auto"
        aria-label="Keyboard navigation menu"
      >
        <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
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
  </div>

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
