<script lang="ts">
  import { onMount } from "svelte";

  type Props = { storageKey?: string };
  const { storageKey = "zh_seen_intro" }: Props = $props();

  let visible = $state(false);

  onMount(() => {
    try {
      if (!localStorage.getItem(storageKey)) visible = true;
    } catch {
      /* localStorage unavailable; keep hidden */
    }
  });

  function dismiss() {
    visible = false;
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  }
</script>

{#if visible}
  <aside
    aria-live="polite"
    class="pointer-events-auto fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-border bg-bg-elev/90 px-4 py-3 shadow-xl backdrop-blur"
    style="animation: rise var(--dur-mid) var(--ease-out);"
  >
    <div class="flex items-center gap-3">
      <p class="font-mono text-xs text-fg-muted">
        click a category to explore — or press <kbd class="rounded bg-bg-elev-2 px-1 py-0.5 text-fg"
          >m</kbd
        > for 2D mode
      </p>
      <button
        type="button"
        onclick={dismiss}
        class="rounded-md border border-border px-2 py-1 font-mono text-xs text-fg-muted hover:border-accent hover:text-accent"
      >
        ok
      </button>
    </div>
  </aside>
{/if}

<style>
  @keyframes rise {
    from {
      opacity: 0;
      transform: translate(-50%, 8px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
</style>
