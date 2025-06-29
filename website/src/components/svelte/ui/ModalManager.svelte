<script lang="ts">
  import { onMount } from "svelte";
  import LinkModal from "./LinkModal.svelte";
  import type { Link } from "~/types/baseSchemas";

  let {
    isVisible = $bindable(),
    currentLink = $bindable(),
    clickPosition = $bindable(),
  }: {
    isVisible: boolean;
    currentLink: Link | null;
    clickPosition: { x: number; y: number } | null;
  } = $props();

  // Function to show modal with link and click position
  export function showModal(link: Link, screenX: number, screenY: number) {
    console.log(`🎭 ModalManager.showModal() called:`, {
      link: link?.name,
      linkType: link?.type,
      linkUrl: link?.url,
      screenX,
      screenY,
      currentVisible: isVisible
    });
    
    currentLink = link;
    clickPosition = { x: screenX, y: screenY };
    isVisible = true;
    
    console.log(`🎭 Modal state updated:`, {
      isVisible,
      hasCurrentLink: !!currentLink,
      hasClickPosition: !!clickPosition
    });
  }

  // Function to hide modal
  export function hideModal() {
    isVisible = false;
    // Keep link and position for exit animation
    setTimeout(() => {
      currentLink = null;
      clickPosition = null;
    }, 300);
  }

  // Handle navigation - this performs the actual user-initiated navigation
  function handleNavigation(url: string, type: Link["type"]) {
    console.log(`🌟 Modal navigation - User clicking to navigate to: ${url} (${type})`);
    
    try {
      if (type === "url") {
        // Open URL in new tab - this is user-initiated so won't be blocked
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          console.warn(`⚠️ Modal navigation blocked for URL: ${url}. Fallback will handle this.`);
        } else {
          console.log(`✅ Modal navigation successful for URL: ${url}`);
        }
      } else if (type === "download") {
        // Download file - create and click anchor element
        const a = document.createElement('a');
        a.href = url;
        a.download = url.split('/').pop() || 'download';
        a.target = '_self';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        console.log(`✅ Modal download triggered for: ${url}`);
      } else if (type === "contact") {
        // Download vCard contact
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contact.vcf';
        a.target = '_self';
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

<LinkModal 
  bind:isVisible={isVisible}
  link={currentLink}
  {clickPosition}
  onNavigate={handleNavigation}
  onClose={hideModal}
/>