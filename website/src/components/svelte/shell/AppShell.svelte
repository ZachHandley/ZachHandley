<script lang="ts">
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";
  import type { Link } from "~/types/baseSchemas";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";
  import ActivityBar from "./ActivityBar.svelte";
  import ContextPanel from "./ContextPanel.svelte";
  import StatusBar from "./StatusBar.svelte";
  import CommandPalette from "./CommandPalette.svelte";

  type Props = {
    links: Link[];
    contextTitle?: string;
    contextEyebrow?: string;
    contextPanel?: Snippet;
    children?: Snippet;
  };

  const {
    links,
    contextTitle,
    contextEyebrow,
    contextPanel,
    children,
  }: Props = $props();

  let stop: (() => Promise<void> | void) | null = null;

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

<div class="flex min-h-dvh flex-col bg-bg text-fg">
  <ActivityBar />

  <div class="flex flex-1 md:pl-12">
    {#if contextPanel}
      <ContextPanel title={contextTitle ?? "explorer"} eyebrow={contextEyebrow}>
        {@render contextPanel()}
      </ContextPanel>
    {/if}

    <main id="main" class="flex-1 pb-16 md:pb-9">
      {@render children?.()}
    </main>
  </div>

  <CommandPalette />
  <StatusBar />
</div>
