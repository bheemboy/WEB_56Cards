<script lang="ts">
    import { onMount } from 'svelte';
    const CARDHEIGHT = 190;
    const CARDWIDTH = 140;
    const ASPECTRATIO = CARDWIDTH / CARDHEIGHT; 
    
    export interface SvgCardProps {
        card: string
        vh: number
        rotation: number
        translation: number
        oncardplayed: () => void
    }

    const {card, vh, rotation, translation, oncardplayed}: SvgCardProps = $props();

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

    // Check image on mount
    onMount(async () => {
        if (!(await checkImageExists(card))) {
            handleImageError();
        }
    });
</script>

{#if imageError}
  <div class="error">Invalid card: {card}</div>
{:else}
  <div 
      class="card {imageError ? 'invalid-card' : ''}"
      role="button"
      tabindex="0"
      onclick={oncardplayed}
      onkeydown={() => {}}
      aria-label={`${card} playing card`}
      style:height = "{vh}vh"
      style:aspect-ratio = {ASPECTRATIO}
      style:background-image = 'url("/images/svgcards/{card}.svg")'
      style:transform-origin = "30% 100%"
      style:transform = "rotate({rotation}deg)"
      style:translate = "{translation}vh 0"
      style:transition = "top 0.1s ease-out"
      onerror={handleImageError}>
  </div>
{/if}

<style>
    .card {
      position: absolute;
      border: none;
      outline: none;
      padding: 0;
      top: 9%;
    }
    .card:hover {
        top: 6%;
    }

    .error {
        color: red;
        font-weight: bold;
        font-size: 12px;
    }

    .invalid-card {
        background-color: #ffeeee;
        border: 1px solid red;
    }
</style>
