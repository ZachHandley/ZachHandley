<script lang="ts">
  import Icon from "@iconify/svelte";
  import AppShell from "~/components/svelte/shell/AppShell.svelte";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = { links: Link[] };
  const { links }: Props = $props();

  const ORDER = ["projects", "professional", "personal", "downloads"] as const;
  const LABEL: Record<string, string> = {
    projects: "projects",
    professional: "work",
    personal: "personal",
    downloads: "downloads",
  };

  const grouped = $derived.by(() => {
    const out: Array<{ key: string; label: string; items: Link[] }> = [];
    for (const key of ORDER) {
      const items = publicLinksStore.links
        .filter((l: Link) => (l.category ?? "") === key)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (items.length > 0) out.push({ key, label: LABEL[key] ?? key, items });
    }
    return out;
  });
</script>

<AppShell {links} contextTitle="categories" contextEyebrow="explorer">
  {#snippet contextPanel()}
    <ul class="space-y-0.5">
      {#each grouped as g (g.key)}
        <li>
          <a
            href={`#cat-${g.key}`}
            class="flex min-h-9 items-center justify-between gap-2 rounded px-2 py-1 text-xs text-fg-muted hover:bg-bg-elev hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span class="truncate">{g.label}</span>
            <span class="font-mono text-[10px] text-fg-subtle">{g.items.length}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/snippet}

  <div class="mx-auto max-w-4xl px-6 pt-12 pb-24 md:pt-20">
    <header class="mb-10">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        ~/zachhandley/links
      </p>
      <h1 class="mt-2 font-mono text-4xl font-medium leading-tight text-fg md:text-5xl">
        everything in one place
      </h1>
      <p class="mt-3 max-w-2xl font-sans text-base leading-relaxed text-fg-muted">
        Projects, work, socials, downloads. Curated in Appwrite, live-updated.
      </p>
    </header>

    {#if grouped.length === 0}
      <p class="font-mono text-sm text-fg-muted">no links yet.</p>
    {:else}
      <div class="space-y-12">
        {#each grouped as g (g.key)}
          <section id={`cat-${g.key}`}>
            <h2 class="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-fg-subtle">
              {g.label}
            </h2>
            <ul class="divide-y divide-border rounded-lg border border-border bg-bg-elev">
              {#each g.items as l (l.name)}
                <li>
                  <a
                    href={l.url ?? "#"}
                    target={l.url?.startsWith("http") ? "_blank" : undefined}
                    rel={l.url?.startsWith("http") ? "noopener noreferrer" : undefined}
                    class="group flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-bg-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Icon
                      icon={typeof l.icon === "string" ? l.icon : "lucide:link"}
                      width={18}
                      height={18}
                      class="shrink-0 text-fg-muted group-hover:text-accent"
                    />
                    <div class="min-w-0 flex-1">
                      <span class="block truncate font-mono text-sm text-fg">{l.name}</span>
                      {#if l.description}
                        <span class="block truncate font-sans text-xs text-fg-muted"
                          >{l.description}</span
                        >
                      {/if}
                    </div>
                    <Icon
                      icon={l.type === "download"
                        ? "lucide:download"
                        : "lucide:arrow-up-right"}
                      width={14}
                      height={14}
                      class="shrink-0 text-fg-subtle group-hover:text-accent"
                    />
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    {/if}
  </div>
</AppShell>
