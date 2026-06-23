<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "@iconify/svelte";

  type Mode = {
    id: string;
    href: string;
    label: string;
    icon: string;
    shortcut?: string;
  };

  const MODES: Mode[] = [
    { id: "home", href: "/", label: "home", icon: "lucide:home", shortcut: "g h" },
    { id: "work", href: "/work", label: "work", icon: "lucide:folder-git", shortcut: "g w" },
    { id: "code", href: "/code", label: "code", icon: "lucide:braces", shortcut: "g c" },
    { id: "links", href: "/links", label: "links", icon: "lucide:link", shortcut: "g l" },
    {
      id: "contact",
      href: "/contact",
      label: "contact",
      icon: "lucide:mail",
      shortcut: "g m",
    },
    {
      id: "interactive",
      href: "/interactive",
      label: "interactive",
      icon: "lucide:gamepad-2",
      shortcut: "g i",
    },
  ];

  let path = $state("/");

  const activeId = $derived.by(() => {
    if (path === "/") return "home";
    const match = MODES.slice(1).find((m) => path === m.href || path.startsWith(`${m.href}/`));
    return match?.id ?? "home";
  });

  onMount(() => {
    path = window.location.pathname;
    const onLoad = () => {
      path = window.location.pathname;
    };
    document.addEventListener("astro:page-load", onLoad);
    return () => document.removeEventListener("astro:page-load", onLoad);
  });
</script>

<!-- Desktop: left rail -->
<nav
  aria-label="Primary"
  class="fixed left-0 top-0 z-30 hidden h-[calc(100dvh-2.25rem)] w-12 flex-col items-center gap-1 border-r border-border bg-bg/80 py-3 backdrop-blur-md md:flex"
>
  <a
    href="/"
    aria-label="zachhandley — home"
    class="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md font-mono text-sm font-medium text-fg hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
  >
    zh
  </a>
  {#each MODES.slice(1) as m (m.id)}
    {@const isActive = activeId === m.id}
    <a
      href={m.href}
      aria-label={m.label}
      aria-current={isActive ? "page" : undefined}
      title={m.shortcut ? `${m.label}  (${m.shortcut})` : m.label}
      class="group relative inline-flex h-11 w-11 items-center justify-center rounded-md text-fg-muted hover:bg-bg-elev hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      class:active={isActive}
      style="transition: color var(--dur-fast), background-color var(--dur-fast);"
    >
      {#if isActive}
        <span class="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent" aria-hidden="true"></span>
      {/if}
      <Icon icon={m.icon} width={20} height={20} />
    </a>
  {/each}
</nav>

<!-- Mobile: bottom tab bar (sits above StatusBar). 5 items fit; "interactive" overflows into command palette. -->
<nav
  aria-label="Primary mobile"
  class="fixed bottom-9 left-0 right-0 z-30 flex h-12 items-stretch justify-around border-t border-border bg-bg/85 backdrop-blur-md md:hidden"
>
  {#each MODES.slice(1, 6) as m (m.id)}
    {@const isActive = activeId === m.id}
    <a
      href={m.href}
      aria-label={m.label}
      aria-current={isActive ? "page" : undefined}
      class="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      class:active={isActive}
      style="transition: color var(--dur-fast);"
    >
      <Icon icon={m.icon} width={18} height={18} />
      <span>{m.label}</span>
    </a>
  {/each}
</nav>

<style>
  a.active {
    color: var(--color-accent);
  }
</style>
