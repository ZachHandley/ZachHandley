<script lang="ts">
  import Icon from "@iconify/svelte";
  import AppShell from "~/components/svelte/shell/AppShell.svelte";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = { links: Link[] };
  const { links }: Props = $props();

  const projects = $derived(
    publicLinksStore.links
      .filter((l: Link) => l.featured && l.category === "projects" && !!l.url)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );

  let selectedName = $state<string | null>(null);
  const selected = $derived(projects.find((p: Link) => p.name === selectedName) ?? projects[0] ?? null);
</script>

<AppShell {links} contextTitle="featured.list" contextEyebrow="explorer">
  {#snippet contextPanel()}
    <ul class="space-y-0.5">
      {#each projects as p (p.name)}
        <li>
          <button
            type="button"
            class="flex w-full min-h-9 items-center gap-2 rounded px-2 py-1 text-left text-xs text-fg-muted hover:bg-bg-elev hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            class:selected={selected?.name === p.name}
            onclick={() => (selectedName = p.name)}
          >
            <Icon
              icon={typeof p.icon === "string" ? p.icon : "lucide:folder-git"}
              width={14}
              height={14}
            />
            <span class="truncate">{p.name}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/snippet}

  <div class="mx-auto max-w-5xl px-6 pt-12 pb-24 md:pt-20">
    <header class="mb-10">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        ~/zachhandley/work $ ls --featured
      </p>
      <h1 class="mt-2 font-mono text-4xl font-medium leading-tight text-fg md:text-5xl">
        featured projects
      </h1>
      <p class="mt-3 max-w-2xl font-sans text-base leading-relaxed text-fg-muted">
        Open source I maintain. Curated in Appwrite, descriptions and stacks
        refreshed from GitHub every six hours.
      </p>
    </header>

    {#if projects.length === 0}
      <div class="rounded-lg border border-border bg-bg-elev p-6">
        <h2 class="font-mono text-lg text-fg">nothing featured yet</h2>
        <p class="mt-2 font-sans text-sm leading-relaxed text-fg-muted">
          Between launches. Browse every public project on the code page.
        </p>
        <a
          href="/code"
          class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-fg-muted hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          open code →
        </a>
      </div>
    {:else}
      <ul class="grid gap-4 md:grid-cols-2">
        {#each projects as p (p.name)}
          <li>
            <article
              class="group flex h-full flex-col rounded-lg border border-border bg-bg-elev p-5 hover:border-accent"
              style="transition: border-color var(--dur-fast) var(--ease-out);"
            >
              <header class="mb-3 flex items-start gap-3">
                <Icon
                  icon={typeof p.icon === "string" ? p.icon : "lucide:folder-git"}
                  width={20}
                  height={20}
                  class="mt-1 text-fg-muted group-hover:text-accent"
                />
                <div class="min-w-0 flex-1">
                  <h2 class="font-mono text-2xl text-fg">{p.name}</h2>
                  {#if p.description}
                    <p class="mt-1.5 font-sans text-sm leading-relaxed text-fg-muted">
                      {p.description}
                    </p>
                  {/if}
                </div>
              </header>

              {#if p.stack && p.stack.length > 0}
                <div class="mb-4 flex flex-wrap gap-1.5">
                  {#each p.stack as tag (tag)}
                    <span
                      class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle"
                    >
                      {tag}
                    </span>
                  {/each}
                </div>
              {/if}

              <footer class="mt-auto flex flex-wrap gap-2">
                {#if p.repoUrl}
                  <a
                    href={p.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-fg-muted hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style="transition: color var(--dur-fast), border-color var(--dur-fast);"
                  >
                    <Icon icon="lucide:github" width={14} height={14} />
                    view repo
                  </a>
                {/if}
                {#if p.url && p.url !== p.repoUrl}
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 font-mono text-xs text-accent-fg hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style="transition: background-color var(--dur-fast) var(--ease-out);"
                  >
                    open live site
                    <Icon icon="lucide:external-link" width={14} height={14} />
                  </a>
                {/if}
              </footer>
            </article>
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
