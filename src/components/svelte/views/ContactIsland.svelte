<script lang="ts">
  import Icon from "@iconify/svelte";
  import AppShell from "~/components/svelte/shell/AppShell.svelte";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = { links: Link[] };
  const { links }: Props = $props();

  const EMAIL = "zachhandley@gmail.com";

  const socials = $derived(
    publicLinksStore.links.filter(
      (l: Link) =>
        l.category === "personal" && l.type === "url" && typeof l.icon === "string" && !!l.url,
    ),
  );
  const downloads = $derived(
    publicLinksStore.links.filter((l: Link) => l.category === "downloads" && !!l.url),
  );

  let copied = $state(false);

  function copyEmail() {
    navigator.clipboard?.writeText(EMAIL).then(
      () => {
        copied = true;
        window.setTimeout(() => (copied = false), 1500);
      },
      () => {
        /* ignore */
      },
    );
  }
</script>

<AppShell {links}>
  <div class="mx-auto max-w-3xl px-6 pt-12 pb-24 md:pt-20">
    <header class="mb-10">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        ~/zachhandley/contact
      </p>
      <h1 class="mt-2 font-mono text-4xl font-medium leading-tight text-fg md:text-5xl">
        let's build something
      </h1>
      <p class="mt-3 max-w-2xl font-sans text-base leading-relaxed text-fg-muted">
        Best reached by email. Agency work via Black Leaf Digital; product work
        via Socialaize or Blazen. I read everything; I reply to most things.
      </p>
    </header>

    <section
      class="mb-10 rounded-lg border border-border bg-bg-elev p-5"
      aria-label="Primary contact"
    >
      <p class="mb-2 font-mono text-xs uppercase tracking-wider text-fg-subtle">email</p>
      <div class="flex flex-wrap items-center gap-3">
        <a
          href={`mailto:${EMAIL}`}
          class="font-mono text-lg text-fg hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {EMAIL}
        </a>
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-fg-muted hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style="transition: color var(--dur-fast), border-color var(--dur-fast);"
          aria-label="Copy email to clipboard"
          onclick={copyEmail}
        >
          <Icon
            icon={copied ? "lucide:check" : "lucide:clipboard-copy"}
            width={14}
            height={14}
          />
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </section>

    {#if socials.length > 0}
      <section class="mb-10" aria-label="Social profiles">
        <h2 class="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-fg-subtle">
          elsewhere
        </h2>
        <ul class="grid gap-3 sm:grid-cols-2">
          {#each socials as s (s.name)}
            <li>
              <a
                href={s.url}
                target="_blank"
                rel="me noopener noreferrer"
                class="group flex min-h-11 items-center gap-3 rounded-md border border-border bg-bg-elev px-4 py-3 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style="transition: border-color var(--dur-fast) var(--ease-out);"
              >
                <Icon
                  icon={s.icon as string}
                  width={20}
                  height={20}
                  class="text-fg-muted group-hover:text-accent"
                />
                <span class="font-mono text-sm text-fg">{s.name}</span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if downloads.length > 0}
      <section aria-label="Downloads">
        <h2 class="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-fg-subtle">
          downloads
        </h2>
        <ul class="space-y-2">
          {#each downloads as d (d.name)}
            <li>
              <a
                href={d.url}
                class="group flex min-h-11 items-center gap-3 rounded-md border border-border bg-bg-elev px-4 py-3 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Icon
                  icon={typeof d.icon === "string" ? d.icon : "lucide:download"}
                  width={18}
                  height={18}
                  class="text-fg-muted group-hover:text-accent"
                />
                <span class="font-mono text-sm text-fg">{d.name}</span>
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</AppShell>
