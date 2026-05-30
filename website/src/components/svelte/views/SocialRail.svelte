<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { Link } from "~/types/baseSchemas";

  type Props = {
    links: Link[];
    size?: number;
    class?: string;
  };

  const { links, size = 20, class: extraClass = "" }: Props = $props();

  // Socials = category "personal" + an iconify icon + URL link.
  // Identity is in the icon, not the label.
  const socials = $derived(
    links.filter(
      (l) => l.category === "personal" && l.type === "url" && typeof l.icon === "string" && l.url,
    ),
  );
</script>

<nav aria-label="Social links" class="flex items-center gap-1 {extraClass}">
  {#each socials as link (link.name)}
    <a
      href={link.url}
      target="_blank"
      rel="me noopener noreferrer"
      aria-label={link.name}
      title={link.name}
      class="inline-flex items-center justify-center rounded-md p-1.5 text-fg-muted hover:text-accent hover:bg-bg-elev focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
      style="transition-duration: var(--dur-fast);"
    >
      <Icon icon={link.icon as string} width={size} height={size} />
    </a>
  {/each}
</nav>
