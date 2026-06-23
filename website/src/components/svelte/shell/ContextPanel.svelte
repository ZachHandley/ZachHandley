<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "@iconify/svelte";
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    eyebrow?: string;
    children?: Snippet;
  };

  const { title, eyebrow, children }: Props = $props();

  let open = $state(true);

  onMount(() => {
    try {
      const saved = localStorage.getItem("zh_context_open");
      if (saved === "0" || saved === "1") open = saved === "1";
    } catch {
      /* ignore */
    }
  });

  function toggle() {
    open = !open;
    try {
      localStorage.setItem("zh_context_open", open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
</script>

<aside
  aria-label="Context"
  class:open
  class="hidden h-[calc(100dvh-2.25rem)] flex-col border-r border-border bg-bg/60 md:flex"
  style="transition: width var(--dur-mid) var(--ease-out); width: {open ? '17rem' : '2.5rem'};"
>
  <div
    class="flex h-10 shrink-0 items-center justify-between border-b border-border px-2 font-mono text-xs uppercase tracking-wider text-fg-subtle"
  >
    {#if open}
      <div class="flex min-w-0 flex-col">
        {#if eyebrow}
          <span class="text-[10px] text-accent">{eyebrow}</span>
        {/if}
        <span class="truncate text-fg-muted">{title}</span>
      </div>
    {/if}
    <button
      type="button"
      class="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-fg-muted hover:bg-bg-elev hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style="transition: color var(--dur-fast), background-color var(--dur-fast);"
      aria-label={open ? "Collapse context panel" : "Expand context panel"}
      title={open ? "Collapse context panel" : "Expand context panel"}
      aria-expanded={open}
      onclick={toggle}
    >
      <Icon
        icon={open ? "lucide:panel-left-close" : "lucide:panel-left-open"}
        width={16}
        height={16}
      />
    </button>
  </div>

  {#if open}
    <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2 font-mono text-sm text-fg">
      {@render children?.()}
    </div>
  {/if}
</aside>
