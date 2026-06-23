<script lang="ts">
  import { onMount, tick } from "svelte";
  import Icon from "@iconify/svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = {
    open: boolean;
    links: Link[];
    onClose: () => void;
    onLinkClick?: (link: Link) => void;
  };

  const { open, links, onClose, onLinkClick }: Props = $props();

  // Groups in stable display order.
  const groupOrder = ["projects", "professional", "personal", "downloads"];
  const groups = $derived(
    groupOrder
      .map((cat) => ({
        cat,
        label:
          cat === "projects"
            ? "Projects"
            : cat === "professional"
              ? "Work"
              : cat === "personal"
                ? "Personal"
                : "Downloads",
        items: links.filter((l) => (l.category ?? "") === cat),
      }))
      .filter((g) => g.items.length > 0),
  );

  // Focus trap + restore on close.
  let drawer = $state<HTMLElement | null>(null);
  let prevFocus: HTMLElement | null = null;

  $effect(() => {
    if (open) {
      prevFocus = document.activeElement as HTMLElement | null;
      tick().then(() => {
        const first = drawer?.querySelector<HTMLElement>(
          "a, button, [tabindex]:not([tabindex='-1'])",
        );
        first?.focus();
      });
    } else if (prevFocus) {
      prevFocus.focus();
      prevFocus = null;
    }
  });

  function onKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const root = drawer;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>("a, button, [tabindex]:not([tabindex='-1'])"),
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });

  function iconFor(link: Link): string | undefined {
    if (typeof link.icon === "string") return link.icon;
    if (link.icon && typeof link.icon === "object") return `${link.icon.prefix}:${link.icon.name}`;
    return undefined;
  }
</script>

<!-- Scrim -->
{#if open}
  <div
    role="presentation"
    onclick={onClose}
    class="fixed inset-0 z-40 bg-bg/60 backdrop-blur-sm"
    style="animation: fade var(--dur-mid) var(--ease-out);"
  ></div>
{/if}

<!-- Drawer -->
<aside
  bind:this={drawer}
  aria-label="All links"
  aria-hidden={!open}
  class="fixed right-0 top-0 z-50 flex h-full w-[min(28rem,90vw)] flex-col border-l border-border bg-bg-elev shadow-2xl transition-transform"
  style="transition-duration: var(--dur-mid); transition-timing-function: var(--ease-out); transform: translateX({open
    ? '0'
    : '100%'});"
>
  <div class="flex items-center justify-between border-b border-border px-4 py-3">
    <span class="font-mono text-sm text-fg-muted">all links</span>
    <button
      type="button"
      onclick={onClose}
      aria-label="Close drawer"
      class="inline-flex items-center justify-center rounded-md p-1.5 text-fg-muted hover:bg-bg-elev-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Icon icon="ph:x-bold" width="18" height="18" />
    </button>
  </div>

  <div class="flex-1 overflow-y-auto px-4 py-4">
    {#each groups as group (group.cat)}
      <section class="mb-6">
        <h2 class="mb-2 font-mono text-xs uppercase tracking-wider text-fg-subtle">
          {group.label}
        </h2>
        <ul class="space-y-1">
          {#each group.items as link (link.name)}
            {@const ic = iconFor(link)}
            <li>
              <a
                href={link.url ?? "#"}
                target={link.type === "url" ? "_blank" : undefined}
                rel={link.type === "url" ? "noopener noreferrer" : undefined}
                download={link.type === "download" || link.type === "contact" ? "" : undefined}
                onclick={() => onLinkClick?.(link)}
                class="group flex items-center gap-3 rounded-md border border-transparent px-2 py-1.5 text-sm text-fg-muted hover:border-border hover:bg-bg-elev-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {#if ic}
                  <Icon icon={ic} width="18" height="18" />
                {:else}
                  <span class="inline-block w-[18px]"></span>
                {/if}
                <span class="flex-1 truncate">{link.name}</span>
                {#if link.type !== "url" || link.featured}
                  <span class="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {link.featured ? "featured" : link.type}
                  </span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</aside>

<style>
  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
