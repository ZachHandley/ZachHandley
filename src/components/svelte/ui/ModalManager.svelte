<script lang="ts">
  import LinkModal from "./LinkModal.svelte";
  import type { Link } from "~/types/baseSchemas";

  let {
    isVisible = $bindable(false),
    currentLink = $bindable(null),
  }: {
    isVisible?: boolean;
    currentLink?: Link | null;
  } = $props();

  // Function to show the modal for a link. The modal is viewport-centred, so no
  // click coordinates are needed.
  export function showModal(link: Link) {
    console.log(`🎭 ModalManager.showModal() called:`, {
      link: link?.name,
      linkType: link?.type,
      linkUrl: link?.url,
      currentVisible: isVisible,
    });

    currentLink = link;
    isVisible = true;
  }

  // Function to hide modal
  export function hideModal() {
    isVisible = false;
    // Keep the link around for the exit animation
    setTimeout(() => {
      currentLink = null;
    }, 300);
  }

  // Handle navigation - this performs the actual user-initiated navigation
  function handleNavigation(url: string, type: Link["type"]) {
    console.log(`🌟 Modal navigation - User clicking to navigate to: ${url} (${type})`);

    try {
      if (type === "url") {
        // Open URL in new tab - this is user-initiated so won't be blocked
        const newWindow = window.open(url, "_blank", "noopener,noreferrer");
        if (!newWindow) {
          console.warn(`⚠️ Modal navigation blocked for URL: ${url}. Fallback will handle this.`);
        } else {
          console.log(`✅ Modal navigation successful for URL: ${url}`);
        }
      } else if (type === "download") {
        // Download file - create and click anchor element
        const a = document.createElement("a");
        a.href = url;
        a.download = url.split("/").pop() || "download";
        a.target = "_self";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log(`✅ Modal download triggered for: ${url}`);
      } else if (type === "contact") {
        // Download vCard contact
        const a = document.createElement("a");
        a.href = url;
        a.download = "contact.vcf";
        a.target = "_self";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log(`✅ Modal contact download triggered`);
      }
    } catch (error) {
      console.error(`❌ Modal navigation failed for ${url} (${type}):`, error);
      console.log(`🔄 Fallback navigation will handle this automatically`);
    }

    hideModal();
  }
</script>

<LinkModal bind:isVisible link={currentLink} onNavigate={handleNavigation} onClose={hideModal} />
