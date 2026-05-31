<script lang="ts">
  import { Canvas } from "@threlte/core";
  import BaseScene from "./scene/BaseScene.svelte";
  import LoadingScreen from "./ui/LoadingScreen.svelte";
  import ModalManager from "./ui/ModalManager.svelte";
  import TopBar from "./views/TopBar.svelte";
  import SideDrawer from "./views/SideDrawer.svelte";
  import OnboardingHint from "./views/OnboardingHint.svelte";
  import PortfolioView from "./views/PortfolioView.svelte";
  import SocialRail from "./views/SocialRail.svelte";
  import type { Link } from "~/types/baseSchemas";
  import { onMount } from "svelte";
  import { Client, TablesDB, Query } from "appwrite";
  import {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_DATABASE_ID,
    COLL_LINKS,
  } from "astro:env/client";

  type Mode = "3d" | "2d";

  const __p = $props<{ links: Link[]; isAdmin?: boolean }>();
  let liveLinks = $state<Link[] | null>(null);
  let links = $derived(liveLinks ?? __p.links);
  let isAdmin = $derived(__p.isAdmin ?? false);

  let innerWidth = $state(0);
  let innerHeight = $state(0);
  const isMobile = $derived(innerWidth > 0 && innerWidth < 768);

  // 3D is the front door on desktop; mobile auto-falls-back to 2D and locks the toggle.
  // Persist explicit user preference across visits.
  let mode = $state<Mode>("3d");
  const canToggleMode = $derived(!isMobile);

  let activeCategory = $state<string | undefined>(undefined);
  let drawerOpen = $state(false);

  // 3D loading + modal scaffolding (unchanged surface to BaseScene).
  let isLoading = $state(true);
  let loadingProgress = $state(0);
  let loadingMessage = $state("Initializing medieval realm...");
  let modalManager = $state<{
    showModal: (link: Link, x: number, y: number) => void;
    hideModal: () => void;
  } | null>(null);

  function handleLoadingStateChange(loading: boolean, progress: number, message: string) {
    isLoading = loading;
    loadingProgress = progress;
    loadingMessage = message;
  }

  function handleDragonClick() {
    // Reserved.
  }

  function handleInteract(category?: string) {
    activeCategory = category;
  }

  function toggleMode() {
    if (!canToggleMode) return;
    mode = mode === "3d" ? "2d" : "3d";
    try {
      localStorage.setItem("zh_mode", mode);
    } catch {
      /* ignore */
    }
  }

  function onNavigate(sectionId: string) {
    if (mode === "2d") {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // 3D mode: route nav items to scene category filters where there's a match.
    const map: Record<string, string | undefined> = {
      work: "professional",
      projects: "projects",
      contact: undefined, // contact is a 2D-only concept; jump to 2D
      all: undefined, // open the drawer to browse everything
    };
    if (sectionId === "contact") {
      toggleMode();
      return;
    }
    if (sectionId === "all") {
      drawerOpen = true;
      return;
    }
    activeCategory = map[sectionId];
  }

  function rowsToLinks(rows: any[]): Link[] {
    return rows.map((doc) => ({
      name: doc.title,
      url: doc.url ?? undefined,
      icon: doc.icon ?? undefined,
      type: doc.type ?? "url",
      category: doc.category ?? undefined,
      active: doc.active,
      order: doc.order,
      featured: doc.featured ?? false,
      stack: doc.stack ?? undefined,
      repoUrl: doc.repoUrl ?? undefined,
      description: doc.description ?? undefined,
    }));
  }

  async function refetchLinks(tablesDB: TablesDB): Promise<void> {
    const res = await tablesDB.listRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: COLL_LINKS,
      queries: [Query.equal("active", true), Query.orderAsc("order"), Query.limit(200)],
    });
    liveLinks = rowsToLinks(res.rows);
  }

  onMount(() => {
    // Restore previously chosen mode (desktop only).
    try {
      const saved = localStorage.getItem("zh_mode") as Mode | null;
      if (saved === "2d" || saved === "3d") mode = saved;
    } catch {
      /* ignore */
    }

    const onKeydown = (e: KeyboardEvent) => {
      // Tab opens drawer; let the drawer's own focus-trap handle subsequent Tab.
      if (e.key === "Tab" && !drawerOpen) {
        e.preventDefault();
        drawerOpen = true;
        return;
      }
      // 'm' toggles mode (ignore when typing in inputs).
      if (e.key === "m" || e.key === "M") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        toggleMode();
      }
    };
    window.addEventListener("keydown", onKeydown);

    // Realtime: links table is read(any), public client works.
    const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
    const tablesDB = new TablesDB(client);
    const channel = `databases.${APPWRITE_DATABASE_ID}.tables.${COLL_LINKS}.rows`;
    const unsubscribe = client.subscribe(channel, () => {
      refetchLinks(tablesDB).catch(() => {
        /* network blip; next event retries */
      });
    });

    return () => {
      window.removeEventListener("keydown", onKeydown);
      unsubscribe();
    };
  });

  // Force 2D on mobile.
  $effect(() => {
    if (isMobile && mode === "3d") mode = "2d";
  });

  // Effective rendered mode (mobile is always 2D, never 3D).
  const effectiveMode = $derived<Mode>(isMobile ? "2d" : mode);
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="relative h-screen w-screen overflow-hidden bg-bg text-fg">
  <TopBar
    {links}
    mode={effectiveMode}
    {canToggleMode}
    {isAdmin}
    onToggleMode={toggleMode}
    onOpenDrawer={() => (drawerOpen = true)}
    {onNavigate}
  />

  <!-- 3D mode (rendered behind 2D so the curtain wipe layers correctly) -->
  <div
    class="absolute inset-0 pt-14"
    aria-hidden={effectiveMode !== "3d"}
    style="opacity: {effectiveMode === '3d' ? 1 : 0}; pointer-events: {effectiveMode === '3d'
      ? 'auto'
      : 'none'}; transition: opacity var(--dur-mid) var(--ease-in-out);"
  >
    {#if !isMobile}
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
    {/if}
  </div>

  <!-- 2D mode -->
  <div
    class="absolute inset-0"
    aria-hidden={effectiveMode !== "2d"}
    style="opacity: {effectiveMode === '2d' ? 1 : 0}; pointer-events: {effectiveMode === '2d'
      ? 'auto'
      : 'none'}; transition: opacity var(--dur-mid) var(--ease-in-out);"
  >
    {#if effectiveMode === "2d"}
      <PortfolioView {links} />
    {/if}
  </div>

  <!-- Mobile bottom social bar (always visible on mobile) -->
  {#if isMobile}
    <nav
      aria-label="Quick socials"
      class="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-bg-elev/95 backdrop-blur px-4 py-2"
    >
      <SocialRail {links} size={22} />
    </nav>
  {/if}

  <!-- Drawer (replaces the old full-screen keyboard modal) -->
  <SideDrawer open={drawerOpen} {links} onClose={() => (drawerOpen = false)} />

  <!-- First-visit onboarding (3D mode only — explains the medieval scene) -->
  {#if effectiveMode === "3d"}
    <OnboardingHint />
  {/if}

  <!-- 3D-only chrome: loading + modal -->
  {#if effectiveMode === "3d"}
    <LoadingScreen visible={isLoading} progress={loadingProgress} message={loadingMessage} />
    <ModalManager bind:this={modalManager} />
  {/if}

  <!-- Screen-reader-only nav so non-3D AT users can reach every link. -->
  <nav aria-label="All links (accessibility)" class="sr-only">
    <a href="#main-content">Skip to main content</a>
    {#each links as link (link.name)}
      <a
        href={link.url ?? "#"}
        target={link.type === "url" ? "_blank" : undefined}
        rel={link.type === "url" ? "noopener noreferrer" : undefined}
        download={link.type === "download" || link.type === "contact" ? "" : undefined}
      >
        {link.name} ({link.category ?? "uncategorized"})
      </a>
    {/each}
  </nav>
</div>
