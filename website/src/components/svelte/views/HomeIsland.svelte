<script lang="ts">
  import Icon from "@iconify/svelte";
  import AppShell from "~/components/svelte/shell/AppShell.svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = { links: Link[] };
  const { links }: Props = $props();

  const featured = $derived(
    links
      .filter((l) => l.featured && l.category === "projects" && !!l.url)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .slice(0, 3),
  );
</script>

<AppShell {links}>
  <section class="mx-auto max-w-3xl px-6 pt-20 pb-24 md:pt-32">
    <p class="font-mono text-xs uppercase tracking-[0.2em] text-accent">
      ~/zachhandley $ whoami
    </p>
    <h1 class="mt-3 font-mono text-4xl font-medium leading-tight text-fg md:text-6xl">
      I build software that ships.
    </h1>
    <p class="mt-4 max-w-xl font-sans text-base leading-relaxed text-fg-muted md:text-lg">
      Rust on the backend, TypeScript on the edge, Astro and Svelte on the front. I run
      <a class="text-accent hover:text-accent-strong" href="https://blackleafdigital.com"
        >Black Leaf Digital</a
      > and ship products at
      <a class="text-accent hover:text-accent-strong" href="https://socialaize.com"
        >Socialaize</a
      > and
      <a class="text-accent hover:text-accent-strong" href="https://blazen.dev"
        >Blazen</a
      >.
    </p>

    <div class="mt-8 flex flex-wrap gap-3">
      <a
        href="/work"
        class="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 py-2 font-mono text-sm text-accent-fg hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style="transition: background-color var(--dur-fast) var(--ease-out);"
      >
        see what I'm shipping
        <Icon icon="lucide:arrow-right" width={16} height={16} />
      </a>
      <a
        href="/interactive"
        class="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 py-2 font-mono text-sm text-fg hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        style="transition: color var(--dur-fast), border-color var(--dur-fast);"
      >
        <Icon icon="lucide:gamepad-2" width={16} height={16} />
        play the 3d scene
      </a>
    </div>
  </section>

  <section class="mx-auto max-w-5xl px-6 pb-24">
    <header class="mb-5 flex items-baseline justify-between">
      <h2 class="font-mono text-xs uppercase tracking-[0.2em] text-fg-subtle">
        featured / open source
      </h2>
      <a
        href="/work"
        class="font-mono text-xs text-fg-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        see all work →
      </a>
    </header>
    {#if featured.length === 0}
      <div class="rounded-lg border border-border bg-bg-elev p-6">
        <h3 class="font-mono text-lg text-fg">nothing featured yet</h3>
        <p class="mt-2 font-sans text-sm leading-relaxed text-fg-muted">
          Between launches. Every public project I maintain lives on the code page.
        </p>
        <a
          href="/code"
          class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-fg-muted hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          open code →
        </a>
      </div>
    {:else}
      <ul class="grid gap-4 md:grid-cols-3">
        {#each featured as p (p.name)}
          <li>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              class="group block h-full rounded-lg border border-border bg-bg-elev p-5 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style="transition: border-color var(--dur-fast) var(--ease-out);"
            >
              <div class="mb-2 flex items-center gap-2">
                {#if typeof p.icon === "string"}
                  <Icon icon={p.icon} width={18} height={18} class="text-fg-muted group-hover:text-accent" />
                {/if}
                <span class="font-mono text-xl text-fg">{p.name}</span>
              </div>
              {#if p.description}
                <p class="mb-3 font-sans text-sm leading-relaxed text-fg-muted">
                  {p.description}
                </p>
              {/if}
              {#if p.stack && p.stack.length > 0}
                <div class="flex flex-wrap gap-1.5">
                  {#each p.stack.slice(0, 3) as tag (tag)}
                    <span
                      class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle"
                    >
                      {tag}
                    </span>
                  {/each}
                </div>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</AppShell>
