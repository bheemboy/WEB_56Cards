<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
  import type { Chair } from "./states/Chairs.svelte";
  import { GameStage } from "./states/GameInfo.svelte";

  const game: GameController = getContext(gameControllerContextKey);

  // State management
  const isVisible = $derived(
    game.gameInfo.gameStage === GameStage.Bidding && 
    !game.currentPlayer.watchOnly &&
    game.currentPlayer.playerPosition === game.bidInfo.nextBidder 
  );
  const minimumBid = $derived(game.bidInfo.nextMinBid);
  let selectedValue = $derived(game.bidInfo.nextMinBid.toString());

  let wheelSelectorElement = $state<HTMLElement | null>(null);
  
  let scrollTimeout = $state<ReturnType<typeof setTimeout> | undefined>(undefined);
  const SCROLL_DEBOUNCE_MS = 150; 

  // Generate options dynamically based on minimum bid
function generateOptions(min: number) {
  const length = 57 - min; // Calculate how many numbers from min to 56 (inclusive)
  
  return [
    ...Array.from({ length }, (_, i) => {
      const value = (min + i).toString();
      return { value, label: value };
    }),
    { value: '57', label: 'Thani' }
  ];
}

  // Use $derived for reactive values that depend on state
  const allOptions = $derived(generateOptions(minimumBid));

  // Initialize component on mount
  $effect.pre(() => {
    if (isVisible) {
      selectedValue = minimumBid.toString();
    }
  });

  function handleBid() {
    if (!selectedValue) {
      alert('Please select an amount to bid.');
      return;
    }
    const bid = parseInt(selectedValue, 10); // Always specify the radix (10 for decimal)
    if (isNaN(bid)) {
      console.error(`Could not parse ${selectedValue} to a numeric bid.`);
      return;
    }
    game.placeBid(bid);
  }

  function handlePass() {
    game.passBid();
  }

  function selectOption(value: string) {
    if (selectedValue !== value) {
      selectedValue = value;
    }
  }

  // Find index of currently selected option
  function getSelectedIndex(): number {
    return allOptions.findIndex(opt => opt.value === selectedValue);
  }

  function moveSelection(step: number) {
    const currentIndex = getSelectedIndex();
    if (currentIndex === -1) return;
    
    const newIndex = Math.max(0, Math.min(allOptions.length - 1, currentIndex + step));
    if (newIndex !== currentIndex) {
      selectedValue = allOptions[newIndex].value;
      scrollToSelected(true);
    }
  }

  // Handle keyboard navigation
  function handleKeyDown(e: KeyboardEvent) {
    if (!isVisible) return;
    
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      moveSelection(-1); // Move up one option
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveSelection(1); // Move down one option
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectedValue = allOptions[0].value;
    } else if (e.key === 'End') {
      e.preventDefault();
      selectedValue = allOptions[allOptions.length - 1].value;
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      moveSelection(-5); // Move up 5 options
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      moveSelection(5); // Move down 5 options
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleBid(); // Bid when Enter is pressed
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handlePass(); // Pass when Escape is pressed
    }
  }

  // Handle mouse wheel events
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const direction = Math.sign(e.deltaY);
    moveSelection(direction);
  }

  // Auto-focus and initialize when modal becomes visible
  $effect(() => {
    if (!isVisible) return;
    
    // Make sure we have a valid selected value
    if (!selectedValue && allOptions.length > 0) {
      selectedValue = allOptions[0].value;
    }
    
    // Focus and scroll with a delay to ensure DOM is ready
    setTimeout(() => {
      if (wheelSelectorElement) {
        wheelSelectorElement.focus();
        
        // Then scroll to the selected option
        if (selectedValue) {
          scrollToSelected(false);
        }
        
        // This makes sure the keyboard events work immediately
        document.addEventListener('keydown', handleGlobalKeyDown);
      }
    }, 100);
    
    // Cleanup when modal is hidden
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });
  
  // Global keyboard handler to ensure arrows work immediately
  function handleGlobalKeyDown(e: KeyboardEvent) {
    if (!isVisible) return;
    handleKeyDown(e);
  }

  function scrollToSelected(smooth = true) {
    if (!wheelSelectorElement || !selectedValue) return;
    
    const selectedOptionElement = wheelSelectorElement.querySelector(`[data-value="${selectedValue}"]`) as HTMLElement;
    if (!selectedOptionElement) return;
    
    const containerRect = wheelSelectorElement.getBoundingClientRect();
    const elementRect = selectedOptionElement.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    const elementCenter = elementRect.top + elementRect.height / 2;
    
    // Only scroll if the element is not already centered
    if (Math.abs(containerCenter - elementCenter) > 3) {
      setTimeout(() => {
        selectedOptionElement.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'center'
        });
      }, 50);
    }
  }

  function handleWheelScroll() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout(() => {
      if (!wheelSelectorElement) return;

      const container = wheelSelectorElement;
      const viewportCenterY = container.scrollTop + container.clientHeight / 2;
      
      // Find the closest option to the center
      let closestOption: HTMLElement | null = null;
      let minDistance = Infinity;

      // Type-safe way to handle NodeList
      const optionElements = container.querySelectorAll('.wheel-option');
      for (let i = 0; i < optionElements.length; i++) {
        const optionEl = optionElements[i] as HTMLElement;
        const optionCenterY = optionEl.offsetTop + optionEl.offsetHeight / 2;
        const distance = Math.abs(optionCenterY - viewportCenterY);

        if (distance < minDistance) {
          minDistance = distance;
          closestOption = optionEl;
        }
      }

      // Update selection if needed
      if (closestOption && closestOption.dataset.value !== selectedValue) {
        selectedValue = closestOption.dataset.value || '';
      }
    }, SCROLL_DEBOUNCE_MS);
  }
</script>

{#if isVisible}
  <div class="modal-backdrop" aria-hidden="true">
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <h2 id="modal-title" class="modal-title-accessible">Place your Bid</h2>

      <div class="content-grid">
        <div class="selector-column">
          <div
            class="wheel-selector-container"
            bind:this={wheelSelectorElement}
            tabindex="0"
            role="listbox"
            aria-labelledby="modal-title"
            onscroll={handleWheelScroll}
            onkeydown={handleKeyDown}
            onwheel={handleWheel}
          >
            {#each allOptions as option (option.value)}
              <div
                class="wheel-option"
                class:selected={option.value === selectedValue}
                role="option"
                aria-selected={option.value === selectedValue}
                data-value={option.value}
                onclick={() => selectOption(option.value)}
                onkeypress={(e) => { if (e.key === 'Enter' || e.key === ' ') selectOption(option.value); }}
                tabindex="-1"
              >
                {option.label}
              </div>
            {/each}
          </div>
          <div class="wheel-selector-overlay-top"></div>
          <div class="wheel-selector-overlay-bottom"></div>
          <div class="wheel-selector-center-indicator"></div>
        </div>

        <div class="buttons-column">
          <div class="buttons-wrapper">
            <button type="button" class="bid-button" onclick={handleBid}>Bid</button>
            <button type="button" class="pass-button" onclick={handlePass}>Pass</button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;
  }

  .modal-content {
    background-color: rgba(40, 40, 40, 0.5);
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 270px;
    box-sizing: border-box;
    z-index: 1001;
    position: relative;
    cursor: default;
  }

  .modal-content:focus-visible {
    outline: 2px solid orange;
    outline-offset: 2px;
  }
  
  .modal-content:focus {
    outline: none;
  }

  .modal-title-accessible {
    position: absolute;
    width: 1px; 
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border-width: 0;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: center;
  }

  .selector-column {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    height: 120px;
  }

  .wheel-selector-container {
    width: 100%;
    max-width: 100px;
    height: 100%;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
    border: 1px solid rgba(206, 212, 218, 0.75);
    border-radius: 8px;
    background-color: rgba(255, 255, 255, 0.75);
    position: relative;
    -webkit-overflow-scrolling: touch;
  }

  .wheel-selector-container:focus-visible, 
  .wheel-selector-container:focus {
    border-color: rgba(128, 189, 255, 0.85);
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    outline: none;
  }

  .wheel-selector-container::before,
  .wheel-selector-container::after {
    content: '';
    display: block;
    height: calc(50% - 18px);
    flex-shrink: 0;
  }

  .wheel-option {
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;
    padding: 0 5px;
    font-size: 1rem;
    color: #212529;
    cursor: pointer;
    transition: background-color 0.1s ease-out, color 0.1s ease-out;
    user-select: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wheel-option:hover {
    background-color: rgba(233, 236, 239, 0.85);
  }

  .wheel-option.selected {
    font-weight: bold;
    color: #004085;
  }

  .wheel-selector-center-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    max-width: 100px;
    height: 36px;
    border-top: 1.5px solid rgba(0, 123, 255, 0.85);
    border-bottom: 1.5px solid rgba(0, 123, 255, 0.85);
    pointer-events: none;
    z-index: 1;
    box-sizing: border-box;
  }

  .wheel-selector-overlay-top {
    top: 0;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.98) 10%,
      rgba(255, 255, 255, 0.85) 45%,
      rgba(255, 255, 255, 0.75) 75%
    );
  }

  .wheel-selector-overlay-bottom {
    bottom: 0;
    background: linear-gradient(
      to top,
      rgba(255, 255, 255, 0.98) 10%,
      rgba(255, 255, 255, 0.85) 45%,
      rgba(255, 255, 255, 0.75) 75%
    );
  }
  
  .wheel-selector-overlay-top,
  .wheel-selector-overlay-bottom {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 100px;
    height: calc(50% - 18px);
    pointer-events: none;
    z-index: 2;
    border-radius: 7px;
  }

  .buttons-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .buttons-wrapper {
    display: flex;
    flex-direction: column;
    gap: 15px;
    width: 100%;
  }

  .bid-button,
  .pass-button {
    padding: 14px 0;
    font-size: 0.95rem;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
    white-space: nowrap;
    width: 100%;
    color: white;
  }
  
  .bid-button:focus-visible,
  .pass-button:focus-visible {
    outline: 2px solid dodgerblue;
    outline-offset: 2px;
  }
  
  .bid-button:focus,
  .pass-button:focus {
    outline: none;
  }

  .bid-button { background-color: rgba(40, 167, 69, 0.75); }
  .pass-button { background-color: rgba(220, 53, 69, 0.75); }
  
  .bid-button:hover { background-color: rgba(33, 136, 56, 0.85); }
  .pass-button:hover { background-color: rgba(200, 35, 51, 0.85); }
  
  .bid-button:active, .pass-button:active { transform: translateY(1px); }

  @media (max-width: 320px) {
    .modal-content { max-width: 90%; padding: 15px; }
    .content-grid { grid-template-columns: 1fr; gap: 15px; }
    .selector-column { height: 120px; }
    .wheel-selector-container { max-width: 150px; }
    .wheel-selector-center-indicator,
    .wheel-selector-overlay-top,
    .wheel-selector-overlay-bottom { max-width: 150px; }
    .buttons-column { order: 2; width: 100%; }
    .buttons-wrapper { max-width: 150px; margin: 0 auto; }
  }
</style>
