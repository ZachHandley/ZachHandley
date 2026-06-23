<script lang="ts">
  import Icon from "@iconify/svelte";
  import AppShell from "~/components/svelte/shell/AppShell.svelte";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = { links: Link[] };
  const { links }: Props = $props();

  const projects = $derived(
    publicLinksStore.links
      .filter((l: Link) => l.category === "projects" && !!l.url)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );

  const languages = $derived.by(() => {
    const set = new Set<string>();
    for (const p of projects) {
      const first = p.stack?.[0];
      if (first) set.add(first);
    }
    return ["all", ...Array.from(set).sort()];
  });

  let active = $state("all");
  const filtered = $derived(
    active === "all"
      ? projects
      : projects.filter((p: Link) => p.stack?.[0] === active),
  );
</script>

<AppShell {links} contextTitle="languages" contextEyebrow="filter">
  {#snippet contextPanel()}
    <ul class="space-y-0.5">
      {#each languages as lang (lang)}
        <li>
          <button
            type="button"
            class="flex w-full min-h-9 items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs text-fg-muted hover:bg-bg-elev hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            class:selected={active === lang}
            onclick={() => (active = lang)}
          >
            <span class="truncate">{lang}</span>
            <span class="font-mono text-[10px] text-fg-subtle">
              {lang === "all"
                ? projects.length
                : projects.filter((p: Link) => p.stack?.[0] === lang).length}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/snippet}

  <div class="mx-auto max-w-5xl px-6 pt-12 pb-24 md:pt-20">
    <header class="mb-10">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        ~/zachhandley/code $ git log --all
      </p>
      <h1 class="mt-2 font-mono text-4xl font-medium leading-tight text-fg md:text-5xl">
        every public project
      </h1>
      <p class="mt-3 max-w-2xl font-sans text-base leading-relaxed text-fg-muted">
        Anything I've pushed publicly and consider current. Filter by primary
        language; click through to source.
      </p>
    </header>

    {#if filtered.length === 0}
      <div class="rounded-lg border border-border bg-bg-elev p-6">
        <h2 class="font-mono text-lg text-fg">nothing matches "{active}"</h2>
        <p class="mt-2 font-sans text-sm leading-relaxed text-fg-muted">
          Try a different language, or clear the filter to see everything.
        </p>
        <button
          type="button"
          class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-fg-muted hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onclick={() => (active = "all")}>clear filter</button
        >
      </div>
    {:else}
      <ul class="divide-y divide-border rounded-lg border border-border bg-bg-elev">
        {#each filtered as p (p.name)}
          <li>
            <a
              href={p.repoUrl ?? p.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              class="group flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-bg-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon
                icon={typeof p.icon === "string" ? p.icon : "lucide:folder-git"}
                width={18}
                height={18}
                class="shrink-0 text-fg-muted group-hover:text-accent"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline gap-2">
                  <span class="truncate font-mono text-base text-fg">{p.name}</span>
                  {#if p.stack?.[0]}
                    <span class="font-mono text-[10px] text-fg-subtle">{p.stack[0]}</span>
                  {/if}
                </div>
                {#if p.description}
                  <p class="truncate font-sans text-sm text-fg-muted">{p.description}</p>
                {/if}
              </div>
              <Icon
                icon="lucide:arrow-up-right"
                width={14}
                height={14}
                class="shrink-0 text-fg-subtle group-hover:text-accent"
              />
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</AppShell>

<style>
  button.selected {
    background-color: var(--color-bg-elev);
    color: var(--color-fg);
  }
</style>
