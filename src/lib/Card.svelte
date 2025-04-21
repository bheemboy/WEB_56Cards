<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    const ASPECTRATIO = 140 / 190; // width/height ratio for cards
    
    export interface SvgCardProps {
        card: string
        height: number
        rotation: number
        translation: number
        oncardplayed: () => void
        index: number
    }

    const {card, height, rotation, translation, oncardplayed, index = 0}: SvgCardProps = $props();

    let imageError = $state(false);
    async function checkImageExists(card: string): Promise<boolean> {
        try {
            const response = await fetch(`/images/svgcards/${card}.svg`, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }

    function handleImageError() {
        imageError = true;
        console.error(`Failed to load card image: ${card}`);
    }

    onMount(async () => {
        // Check image
        if (!(await checkImageExists(card))) {
            handleImageError();
        }
    });
</script>

{#if imageError}
  <div class="error">Invalid card: {card}</div>
{:else}
  <div 
      class="card"
      role="button"
      tabindex="0"
      onclick={oncardplayed}
      onkeydown={() => {}}
      aria-label={`${card} playing card`}
      style:--rotation = "{rotation}deg"
      style:--translation = "{translation}%"
      style:--card-aspect-ratio = "{ASPECTRATIO}"
      style:height = "{height}px"
      style:background-image = 'url("/images/svgcards/{card}.svg")'
      onerror={handleImageError}>
  </div>
{/if}

<style>
    .card {
      position: absolute;
      width: auto;
      top: 0%;
      box-shadow: -5px 0 5px -5px rgba(0, 0, 0, 0.5);
      border-radius: 2cqw;
      aspect-ratio: var(--card-aspect-ratio);
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      transform-origin: center bottom;
      transform: rotate(var(--rotation)) translateX(var(--translation));
      transition: transform 0.2s ease-out, height 0.2s ease-out;
      cursor: pointer;
    }

    .card:hover {
        transform: rotate(var(--rotation)) translateX(var(--translation)) translateY(-1em);
    }

    .error {
        color: red;
        font-weight: bold;
        font-size: 12px;
    }
</style>
