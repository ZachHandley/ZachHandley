<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "@iconify/svelte";
  import type { Link } from "~/types/baseSchemas";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";

  type Props = { gitRef?: string };
  const { gitRef = "main" }: Props = $props();

  let now = $state(new Date());
  let theme = $state<"dark" | "light">("dark");
  let path = $state("/");

  const socials = $derived(
    publicLinksStore.links.filter(
      (l: Link) =>
        l.category === "personal" && l.type === "url" && typeof l.icon === "string" && !!l.url,
    ),
  );

  const prompt = $derived(`~/zachhandley${path === "/" ? "" : path}`);
  const clock = $derived(
    now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
  );

  onMount(() => {
    try {
      const saved = localStorage.getItem("zh_theme");
      if (saved === "light" || saved === "dark") theme = saved;
    } catch {
      /* ignore */
    }
    applyTheme(theme);

    path = window.location.pathname;
    const onLoad = () => {
      path = window.location.pathname;
    };
    document.addEventListener("astro:page-load", onLoad);

    const tick = window.setInterval(() => {
      now = new Date();
    }, 30_000);

    return () => {
      window.clearInterval(tick);
      document.removeEventListener("astro:page-load", onLoad);
    };
  });

  function applyTheme(next: "dark" | "light") {
    document.documentElement.dataset.theme = next === "dark" ? "" : next;
  }

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    try {
      localStorage.setItem("zh_theme", theme);
    } catch {
      /* ignore */
    }
  }
</script>

<footer
  class="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t border-border px-3 py-1.5 font-mono text-xs text-fg-muted backdrop-blur-md"
  style="background: color-mix(in oklch, var(--color-bg) 78%, transparent);"
>
  <div class="flex min-w-0 items-center gap-2 truncate">
    <span class="text-accent">~/zachhandley</span>
    <span class="text-fg-subtle">·</span>
    <span class="truncate">{prompt}</span>
    <span class="hidden text-fg-subtle sm:inline">·</span>
    <span class="hidden sm:inline">{gitRef}</span>
    <span class="hidden text-fg-subtle md:inline">·</span>
    <span class="hidden md:inline" aria-label="Time">{clock}</span>
  </div>

  <div class="flex items-center gap-1">
    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-bg-elev hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style="transition: color var(--dur-fast), background-color var(--dur-fast);"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title="Toggle theme"
      onclick={toggleTheme}
    >
      <Icon
        icon={theme === "dark" ? "lucide:sun" : "lucide:moon"}
        width={16}
        height={16}
      />
    </button>

    {#if socials.length > 0}
      <span class="mx-1 hidden h-4 w-px bg-border sm:inline-block" aria-hidden="true"></span>
      <nav aria-label="Social links" class="hidden items-center gap-0.5 sm:flex">
        {#each socials as link (link.name)}
          <a
            href={link.url}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={link.name}
            title={link.name}
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-bg-elev hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style="transition: color var(--dur-fast), background-color var(--dur-fast);"
          >
            <Icon icon={link.icon as string} width={16} height={16} />
          </a>
        {/each}
      </nav>
    {/if}
  </div>
</footer>
