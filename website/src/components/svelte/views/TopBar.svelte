<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { Link } from "~/types/baseSchemas";
  import SocialRail from "./SocialRail.svelte";

  type Mode = "3d" | "2d";

  type Props = {
    links: Link[];
    mode: Mode;
    canToggleMode: boolean;
    isAdmin: boolean;
    onToggleMode: () => void;
    onOpenDrawer: () => void;
    onNavigate: (sectionId: string) => void;
  };

  const {
    links,
    mode,
    canToggleMode,
    isAdmin,
    onToggleMode,
    onOpenDrawer,
    onNavigate,
  }: Props = $props();

  const navItems = [
    { id: "work", label: "work" },
    { id: "projects", label: "rust" },
    { id: "all", label: "all links" },
    { id: "contact", label: "contact" },
  ];
</script>

<header
  class="absolute top-0 left-0 right-0 z-30 border-b border-border backdrop-blur-md"
  style="background: color-mix(in oklch, var(--color-bg) 78%, transparent);"
>
  <div class="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
    <!-- Wordmark -->
    <a
      href="/"
      class="font-mono text-sm text-fg hover:text-accent transition-colors"
      style="transition-duration: var(--dur-fast);"
    >
      <span class="text-accent">~/</span>zachhandley
    </a>

    <!-- Center nav (desktop) -->
    <nav aria-label="Sections" class="ml-6 hidden items-center gap-1 md:flex">
      {#each navItems as item (item.id)}
        <button
          type="button"
          onclick={() => onNavigate(item.id)}
          class="rounded-md px-2.5 py-1 font-mono text-xs lowercase tracking-tight text-fg-muted hover:bg-bg-elev hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          style="transition-duration: var(--dur-fast);"
        >
          {item.label}
        </button>
      {/each}
    </nav>

    <div class="ml-auto flex items-center gap-2">
      <!-- Socials (desktop only — mobile shows them in a bottom bar) -->
      <div class="hidden md:block">
        <SocialRail {links} size={18} />
      </div>

      <!-- Admin (server-rendered only when authenticated) -->
      {#if isAdmin}
        <a
          href="/admin"
          class="hidden rounded-md border border-border px-2 py-1 font-mono text-xs text-fg-muted hover:border-accent hover:text-accent md:inline-block"
        >
          admin
        </a>
      {/if}

      <!-- Mode toggle -->
      {#if canToggleMode}
        <button
          type="button"
          onclick={onToggleMode}
          aria-label={mode === "3d" ? "Switch to 2D view" : "Switch to 3D view"}
          title={mode === "3d" ? "Switch to 2D view (press M)" : "Switch to 3D view (press M)"}
          class="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-2.5 py-1 font-mono text-xs text-fg hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          style="transition-duration: var(--dur-fast);"
        >
          {#if mode === "3d"}
            <Icon icon="ph:browsers-bold" width="14" height="14" />
            2D
          {:else}
            <Icon icon="ph:cube-bold" width="14" height="14" />
            3D
          {/if}
        </button>
      {/if}

      <!-- Drawer / mobile menu trigger -->
      <button
        type="button"
        onclick={onOpenDrawer}
        aria-label="Open navigation drawer"
        title="Open menu (Tab)"
        class="inline-flex items-center justify-center rounded-md border border-border p-1.5 text-fg-muted hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
        style="transition-duration: var(--dur-fast);"
      >
        <Icon icon="ph:list-bold" width="18" height="18" />
      </button>
    </div>
  </div>
</header>
