<script lang="ts">
  import { Box } from "@threlte/flex";

  let { viewMode, handleDragonClick } = $props<{
    viewMode: "intro" | "links";
    handleDragonClick: () => void;
  }>();
</script>

<!-- Accessibility button for keyboard users -->
{#if viewMode === "intro"}
  <button
    type="button"
    tabindex="0"
    aria-label="Activate dragon to view links"
    class="absolute top-4 left-4 z-10 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded opacity-80 transition-all
           sm:top-6 sm:left-6 md:top-8 md:left-8"
    onclick={handleDragonClick}
  >
    View Links
  </button>
{/if}

<!-- Screen reader instructions -->
<div class="sr-only">
  {#if viewMode === "intro"}
    <p>Click the dragon or the "View Links" button to see available links.</p>
  {:else}
    <p>Click on any skeleton to open the corresponding link in a new tab.</p>
  {/if}
</div>

<!-- Floating text labels for accessibility with responsive positioning -->
{#if viewMode === "links"}
  <div
    class="absolute bottom-4 left-4 right-4 z-10 text-white text-center
              sm:bottom-6 sm:left-6 sm:right-6 md:bottom-8 md:left-8 md:right-8"
  >
    <p class="opacity-80 text-sm sm:text-base md:text-lg">
      Click on skeletons to open links
    </p>
  </div>
{/if}
