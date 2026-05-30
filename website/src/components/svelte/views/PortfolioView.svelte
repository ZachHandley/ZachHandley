<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { Link } from "~/types/baseSchemas";
  import SocialRail from "./SocialRail.svelte";

  type Props = { links: Link[] };
  const { links }: Props = $props();

  const featured = $derived(
    links
      .filter((l) => l.featured)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );

  const groupOrder = ["projects", "professional", "personal", "downloads"];
  const groupLabel: Record<string, string> = {
    projects: "Projects",
    professional: "Work",
    personal: "Personal",
    downloads: "Downloads",
  };

  const groups = $derived(
    groupOrder
      .map((cat) => ({
        cat,
        label: groupLabel[cat] ?? cat,
        items: links
          .filter((l) => (l.category ?? "") === cat)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      }))
      .filter((g) => g.items.length > 0),
  );

  function iconFor(link: Link): string | undefined {
    if (typeof link.icon === "string") return link.icon;
    if (link.icon && typeof link.icon === "object") return `${link.icon.prefix}:${link.icon.name}`;
    return undefined;
  }
</script>

<div class="h-full w-full overflow-y-auto bg-bg pt-14 text-fg">
  <div class="mx-auto max-w-3xl px-5 py-10 md:py-16">
    <!-- Hero -->
    <section id="hero" class="mb-14 md:mb-20">
      <p class="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">
        zachhandley · los angeles
      </p>
      <h1 class="font-mono text-4xl font-medium leading-tight text-fg md:text-5xl">
        software engineer.<br />
        <span class="text-fg-muted">rust, typescript, ai infra.</span>
      </h1>
      <p class="mt-5 max-w-xl text-base text-fg-muted md:text-lg">
        Founder/CTO @ Socialaize · Founder @ Black Leaf Digital. I build fast, ship often,
        and reach for Rust when the JVM-tax shows up.
      </p>
      <div class="mt-7 flex flex-wrap items-center gap-3">
        <a
          href="#work"
          class="inline-flex items-center gap-1 rounded-md bg-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent-fg hover:bg-accent-strong"
          style="transition: background-color var(--dur-fast) var(--ease-out);"
        >
          see the work <Icon icon="ph:arrow-down-bold" width="12" height="12" />
        </a>
        <a
          href="mailto:zach@blackleafdigital.com"
          class="inline-flex items-center gap-1 rounded-md border border-border px-4 py-2 font-mono text-xs uppercase tracking-wider text-fg hover:border-accent hover:text-accent"
          style="transition: color var(--dur-fast), border-color var(--dur-fast);"
        >
          contact <Icon icon="ph:envelope-simple-bold" width="12" height="12" />
        </a>
      </div>
    </section>

    <!-- Featured work -->
    <section id="work" class="mb-14 md:mb-20">
      <h2 class="mb-1 font-mono text-xs uppercase tracking-wider text-fg-subtle">
        featured / open source
      </h2>
      <p class="mb-6 text-sm text-fg-muted">Currently shipping these.</p>
      {#if featured.length === 0}
        <p class="text-sm text-fg-muted">
          No featured projects yet. Add some via <a href="/admin" class="text-accent underline">/admin</a>.
        </p>
      {:else}
        <ul class="grid grid-cols-1 gap-4 md:grid-cols-2">
          {#each featured as link (link.name)}
            {@const ic = iconFor(link)}
            <li>
              <article
                class="group h-full rounded-lg border border-border bg-bg-elev p-5 hover:border-accent"
                style="transition: border-color var(--dur-fast) var(--ease-out);"
              >
                <div class="mb-2 flex items-center gap-2">
                  {#if ic}
                    <Icon icon={ic} width="20" height="20" />
                  {/if}
                  <h3 class="font-mono text-base text-fg">{link.name}</h3>
                </div>
                {#if link.description}
                  <p class="mb-3 text-sm text-fg-muted">{link.description}</p>
                {/if}
                {#if link.stack && link.stack.length > 0}
                  <div class="mb-3 flex flex-wrap gap-1.5">
                    {#each link.stack as chip}
                      <span class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
                        {chip}
                      </span>
                    {/each}
                  </div>
                {/if}
                <div class="flex items-center gap-3 font-mono text-xs">
                  {#if link.url}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-accent hover:text-fg"
                    >
                      → {link.url.includes("github.com") ? "repo" : "live"}
                    </a>
                  {/if}
                  {#if link.repoUrl && link.repoUrl !== link.url}
                    <a
                      href={link.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-fg-muted hover:text-accent"
                    >
                      → repo
                    </a>
                  {/if}
                </div>
              </article>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <!-- All categorized links -->
    <section id="all" class="mb-14 md:mb-20">
      <h2 class="mb-1 font-mono text-xs uppercase tracking-wider text-fg-subtle">
        everything else
      </h2>
      <p class="mb-6 text-sm text-fg-muted">All links by category.</p>
      <div class="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2">
        {#each groups as group (group.cat)}
          <section id={group.cat}>
            <h3 class="mb-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">
              {group.label}
            </h3>
            <ul class="space-y-1">
              {#each group.items as link (link.name)}
                {@const ic = iconFor(link)}
                <li>
                  <a
                    href={link.url ?? "#"}
                    target={link.type === "url" ? "_blank" : undefined}
                    rel={link.type === "url" ? "noopener noreferrer" : undefined}
                    download={link.type === "download" || link.type === "contact" ? "" : undefined}
                    class="group flex items-center gap-3 rounded-md border border-transparent px-2 py-1.5 text-sm text-fg-muted hover:border-border hover:bg-bg-elev hover:text-fg"
                  >
                    {#if ic}
                      <Icon icon={ic} width="16" height="16" />
                    {:else}
                      <span class="inline-block w-4"></span>
                    {/if}
                    <span class="flex-1 truncate">{link.name}</span>
                    {#if link.type !== "url"}
                      <span class="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                        {link.type}
                      </span>
                    {/if}
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    </section>

    <!-- Contact -->
    <section id="contact" class="mb-12">
      <h2 class="mb-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">contact</h2>
      <p class="text-sm text-fg-muted">
        <a class="text-accent hover:text-fg" href="mailto:zach@blackleafdigital.com"
          >zach@blackleafdigital.com</a
        >
      </p>
      <div class="mt-4">
        <SocialRail {links} size={20} />
      </div>
    </section>

    <!-- Footer -->
    <footer class="mt-16 border-t border-border pt-6 font-mono text-xs text-fg-subtle">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} zachhandley</span>
        <a
          class="hover:text-accent"
          href="https://github.com/zachhandley/zachhandley"
          target="_blank"
          rel="noopener noreferrer">source ↗</a
        >
      </div>
    </footer>
  </div>
</div>
