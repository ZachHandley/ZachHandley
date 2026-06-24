<script lang="ts">
  import { onMount, tick } from "svelte";
  import Icon from "@iconify/svelte";
  import type { Link } from "~/types/baseSchemas";
  import { publicLinksStore } from "~/stores/publicLinksStore.svelte";

  type CommandKind = "route" | "link" | "action";

  type Command = {
    id: string;
    kind: CommandKind;
    label: string;
    detail?: string;
    icon?: string;
    shortcut?: string;
    perform: () => void;
  };

  let dialog = $state<HTMLDialogElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);
  let query = $state("");
  let cursor = $state(0);

  const routes: Command[] = [
    {
      id: "go:home",
      kind: "route",
      label: "open home",
      detail: "/",
      icon: "lucide:home",
      shortcut: "g h",
      perform: () => navigate("/"),
    },
    {
      id: "go:work",
      kind: "route",
      label: "open work",
      detail: "/work",
      icon: "lucide:folder-git",
      shortcut: "g w",
      perform: () => navigate("/work"),
    },
    {
      id: "go:code",
      kind: "route",
      label: "open code",
      detail: "/code",
      icon: "lucide:braces",
      shortcut: "g c",
      perform: () => navigate("/code"),
    },
    {
      id: "go:links",
      kind: "route",
      label: "open links",
      detail: "/links",
      icon: "lucide:link",
      shortcut: "g l",
      perform: () => navigate("/links"),
    },
    {
      id: "go:contact",
      kind: "route",
      label: "open contact",
      detail: "/contact",
      icon: "lucide:mail",
      shortcut: "g m",
      perform: () => navigate("/contact"),
    },
    {
      id: "go:interactive",
      kind: "route",
      label: "open interactive",
      detail: "/interactive",
      icon: "lucide:gamepad-2",
      shortcut: "g i",
      perform: () => navigate("/interactive"),
    },
  ];

  const actions: Command[] = [
    {
      id: "theme:toggle",
      kind: "action",
      label: "toggle theme",
      detail: "dark / light",
      icon: "lucide:sun-moon",
      perform: () => {
        const root = document.documentElement;
        const next = root.dataset.theme === "light" ? "dark" : "light";
        root.dataset.theme = next === "dark" ? "" : next;
        try {
          localStorage.setItem("zh_theme", next);
        } catch {
          /* ignore */
        }
      },
    },
    {
      id: "copy:email",
      kind: "action",
      label: "copy email",
      detail: "zachhandley@gmail.com",
      icon: "lucide:clipboard-copy",
      perform: () => {
        navigator.clipboard?.writeText("zachhandley@gmail.com").catch(() => {
          /* ignore */
        });
      },
    },
    {
      id: "open:resume",
      kind: "action",
      label: "download resume",
      detail: "files/resume.pdf",
      icon: "lucide:file-text",
      perform: () => navigate("/files/resume.pdf"),
    },
  ];

  const linkCommands = $derived<Command[]>(
    publicLinksStore.links
      .filter((l: Link) => !!l.name && (!!l.url || l.type === "category"))
      .map((l) => ({
        id: `link:${l.name}`,
        kind: "link" as const,
        label: l.name.toLowerCase(),
        detail: l.description ?? l.category ?? l.url ?? "",
        icon: typeof l.icon === "string" ? l.icon : "lucide:link",
        perform: () => {
          if (l.url) {
            const isExternal = /^https?:/i.test(l.url);
            if (isExternal) window.open(l.url, "_blank", "noopener,noreferrer");
            else navigate(l.url);
          }
        },
      })),
  );

  const all = $derived<Command[]>([...routes, ...actions, ...linkCommands]);

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all
      .map((c) => ({ c, score: score(c, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.c);
  });

  function score(cmd: Command, q: string): number {
    const haystack = `${cmd.label} ${cmd.detail ?? ""}`.toLowerCase();
    if (!haystack.includes(q)) {
      let qi = 0;
      for (const ch of haystack) {
        if (ch === q[qi]) qi += 1;
        if (qi === q.length) break;
      }
      return qi === q.length ? 1 : 0;
    }
    const labelHit = cmd.label.toLowerCase().indexOf(q);
    if (labelHit === 0) return 100;
    if (labelHit > 0) return 50;
    return 10;
  }

  function navigate(href: string) {
    close();
    window.location.assign(href);
  }

  async function open() {
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    query = "";
    cursor = 0;
    await tick();
    input?.focus();
  }

  function close() {
    if (dialog?.open) dialog.close();
  }

  function runCursor() {
    const cmd = filtered[cursor];
    if (cmd) cmd.perform();
  }

  function onKeydown(e: KeyboardEvent) {
    const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
    if (isModK) {
      e.preventDefault();
      if (dialog?.open) close();
      else open();
      return;
    }
    if (!dialog?.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      cursor = Math.min(filtered.length - 1, cursor + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      cursor = Math.max(0, cursor - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runCursor();
    }
  }

  $effect(() => {
    if (cursor > filtered.length - 1) cursor = 0;
  });

  onMount(() => {
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  });
</script>

<button
  type="button"
  class="fixed bottom-12 right-3 z-30 inline-flex h-11 items-center gap-2 rounded-md border border-border bg-bg-elev px-3 font-mono text-xs text-fg-muted shadow-lg hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:bottom-10"
  style="transition: color var(--dur-fast), border-color var(--dur-fast);"
  aria-label="Open command palette"
  onclick={open}
>
  <Icon icon="lucide:command" width={14} height={14} />
  <span>⌘ K</span>
</button>

<dialog
  bind:this={dialog}
  aria-label="Command palette"
  class="w-[min(560px,92vw)] rounded-xl border border-border bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
>
  <div class="flex items-center gap-2 border-b border-border px-3 py-2">
    <Icon icon="lucide:search" width={16} height={16} class="text-fg-subtle" />
    <input
      bind:this={input}
      bind:value={query}
      type="text"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      aria-controls="cmd-listbox"
      aria-expanded="true"
      aria-autocomplete="list"
      aria-activedescendant={filtered[cursor] ? `cmd-${filtered[cursor].id}` : undefined}
      placeholder="type a command..."
      class="flex-1 bg-transparent font-mono text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:outline-none"
      aria-label="Command search"
    />
    <kbd
      class="hidden rounded border border-border bg-bg-elev px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle sm:inline-block"
      >esc</kbd
    >
  </div>

  <ul
    id="cmd-listbox"
    role="listbox"
    aria-label="Commands"
    class="max-h-[60vh] overflow-y-auto py-1 font-mono text-sm"
  >
    {#if filtered.length === 0}
      <li class="flex flex-col items-center gap-2 px-3 py-6 text-center text-fg-subtle">
        <span>no commands match.</span>
        {#if query}
          <button
            type="button"
            class="rounded border border-border px-2 py-1 text-[10px] text-fg-muted hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onclick={() => (query = "")}>clear search</button
          >
        {/if}
      </li>
    {:else}
      {#each filtered.slice(0, 80) as cmd, i (cmd.id)}
        <li
          id={`cmd-${cmd.id}`}
          role="option"
          aria-selected={cursor === i}
          class:selected={cursor === i}
        >
          <button
            type="button"
            tabindex="-1"
            class="flex w-full items-center gap-3 px-3 py-2 text-left text-fg-muted hover:bg-bg-elev hover:text-fg focus:outline-none"
            onmouseenter={() => (cursor = i)}
            onclick={() => cmd.perform()}
          >
            <Icon icon={cmd.icon ?? "lucide:terminal"} width={16} height={16} />
            <span class="flex-1 truncate">{cmd.label}</span>
            {#if cmd.detail}
              <span class="hidden truncate text-fg-subtle md:inline">{cmd.detail}</span>
            {/if}
            {#if cmd.shortcut}
              <kbd
                class="rounded border border-border bg-bg-elev px-1.5 py-0.5 text-[10px] text-fg-subtle"
                >{cmd.shortcut}</kbd
              >
            {/if}
          </button>
        </li>
      {/each}
    {/if}
  </ul>
</dialog>

<style>
  li.selected > button {
    background-color: var(--color-bg-elev);
    color: var(--color-fg);
  }
  dialog {
    position: fixed;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
  }
</style>
