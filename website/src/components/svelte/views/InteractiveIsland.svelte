<script lang="ts">
  import { onMount } from "svelte";
  import { Canvas } from "@threlte/core";
  import BaseScene from "~/components/svelte/scene/BaseScene.svelte";
  import LoadingScreen from "~/components/svelte/ui/LoadingScreen.svelte";
  import ModalManager from "~/components/svelte/ui/ModalManager.svelte";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = { links: Link[] };
  const { links }: Props = $props();

  let innerWidth = $state(0);
  let innerHeight = $state(0);
  const isMobile = $derived(innerWidth > 0 && innerWidth < 768);

  let isLoading = $state(true);
  let loadingProgress = $state(0);
  let loadingMessage = $state("initializing scene...");
  let activeCategory = $state<string | undefined>(undefined);
  let modalManager = $state<{
    showModal: (link: Link, x: number, y: number) => void;
    hideModal: () => void;
  } | null>(null);

  let stop: (() => Promise<void> | void) | null = null;

  function handleLoadingStateChange(loading: boolean, progress: number, message: string) {
    isLoading = loading;
    loadingProgress = progress;
    loadingMessage = message;
  }

  function handleDragonClick() {
    /* reserved */
  }

  function handleInteract(category?: string) {
    activeCategory = category;
  }

  onMount(() => {
    publicLinksStore.init(links);
    publicLinksStore.start().then((s) => {
      stop = s;
    });
    return () => {
      stop?.();
    };
  });
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div id="main" class="fixed inset-0 bg-bg text-fg">
  {#if isMobile}
    <div class="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        ~/zachhandley/interactive
      </p>
      <h1 class="font-mono text-2xl text-fg">3d scene on desktop</h1>
      <p class="max-w-sm font-sans text-sm leading-relaxed text-fg-muted">
        The medieval realm needs a keyboard and pointer. Open on a desktop, or
        browse the rest of the site from here.
      </p>
      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <a
          href="/work"
          class="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 py-2 font-mono text-sm text-accent-fg hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          see my work
        </a>
        <a
          href="/links"
          class="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 py-2 font-mono text-sm text-fg hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          see all links
        </a>
      </div>
    </div>
  {:else}
    <h1 class="sr-only">interactive 3d scene</h1>
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
    <LoadingScreen visible={isLoading} progress={loadingProgress} message={loadingMessage} />
    <ModalManager bind:this={modalManager} />

    <!-- Hint how to escape -->
    <div
      class="pointer-events-none fixed bottom-12 left-1/2 z-20 -translate-x-1/2 rounded-md border border-border bg-bg-elev/80 px-3 py-1.5 font-mono text-xs text-fg-muted backdrop-blur"
      aria-hidden="true"
    >
      <kbd class="rounded border border-border bg-bg px-1.5 py-0.5">⌘K</kbd> for commands · <a
        href="/"
        class="pointer-events-auto text-accent hover:text-accent-strong">exit scene</a
      >
    </div>
  {/if}
</div>
