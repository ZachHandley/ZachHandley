<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "@iconify/svelte";
  import { Canvas } from "@threlte/core";
  import BaseScene from "~/components/svelte/scene/BaseScene.svelte";
  import CommandPalette from "~/components/svelte/shell/CommandPalette.svelte";
  import LoadingScreen from "~/components/svelte/ui/LoadingScreen.svelte";
  import ModalManager from "~/components/svelte/ui/ModalManager.svelte";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = { links: Link[] };
  const { links }: Props = $props();

  // Fed straight into BaseScene as screenWidth/screenHeight — the scene does its own
  // portrait/landscape camera work off these, so the route renders at every size.
  let innerWidth = $state(0);
  let innerHeight = $state(0);

  let isLoading = $state(true);
  let loadingProgress = $state(0);
  let loadingMessage = $state("initializing scene...");
  let activeCategory = $state<string | undefined>(undefined);
  let modalManager = $state<{
    showModal: (link: Link) => void;
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

<!-- h-[100svh] pins the box to the *small* viewport so an iOS URL-bar transition can't
     resize the drawing buffer mid-scene. -->
<div id="main" class="fixed inset-0 h-[100svh] w-screen bg-bg text-fg">
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

  <!-- This route does not use AppShell, so nothing else would mount the palette here.
       It owns the ⌘K listener and renders its own visible trigger button. -->
  <CommandPalette />

  <!--
    Way out of the scene. The wrapper stays pointer-events-none so drags over the empty
    space around the button still reach the canvas; the control itself re-enables them.
    It is NOT aria-hidden — this is the route's primary navigation affordance.
  -->
  <div class="exit-dock pointer-events-none fixed bottom-0 left-0 z-30 flex items-center gap-3">
    <a
      href="/"
      class="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md border border-border bg-bg-elev/90 px-4 font-mono text-sm text-fg shadow-lg backdrop-blur hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style="transition: color var(--dur-fast), border-color var(--dur-fast);"
    >
      <Icon icon="lucide:arrow-left" width={16} height={16} />
      <span>exit scene</span>
    </a>
    <span class="kbd-hint items-center gap-1.5 font-mono text-xs text-fg-muted">
      <kbd class="rounded border border-border bg-bg px-1.5 py-0.5">⌘K</kbd>
      for commands
    </span>
  </div>
</div>

<style>
  /* Clear the notch / home indicator. Only meaningful because /interactive opts into
     viewport-fit=cover via Layout's lockViewport; elsewhere these all resolve to 0. */
  .exit-dock {
    padding-left: calc(0.75rem + env(safe-area-inset-left));
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
  }

  /* Gate on pointer type, not width: a narrow desktop window still has a keyboard,
     and a large tablet still does not. */
  .kbd-hint {
    display: none;
  }

  @media (pointer: fine) {
    .kbd-hint {
      display: inline-flex;
    }
  }
</style>
