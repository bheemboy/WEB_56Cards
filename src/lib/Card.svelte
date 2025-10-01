<script lang="ts">
  import { onMount } from "svelte";
  import { ASPECT_RATIO } from "./CardHeight.svelte";
  
  export interface CardProps {
    card: string;
    height: string;
    oncardclicked?: (index: number) => void;
    showfullcard?: boolean;
    rotation?: number;
    translation?: number;
    index?: number;
  }

  const {
    card,
    height,
    oncardclicked = (index: number) => {},
    showfullcard = true,
    rotation = 0,
    translation = 0,
    index = 0,
  }: CardProps = $props();

  let imageError = $state(false);
  async function checkImageExists(card: string): Promise<boolean> {
    try {
      const response = await fetch(`/images/svgcards/${card}.svg`, {
        method: "HEAD",
      });
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
    class:showfullcard
    role="button"
    tabindex="0"
    onclick={() => oncardclicked(index)}
    onkeydown={() => {}}
    aria-label={`${card} playing card`}
    style:--rotation="{rotation}deg"
    style:--translation="{translation}%"
    style:--card-aspect-ratio={ASPECT_RATIO}
    style:height={height}
    style:background-image="url('/images/svgcards/{card}.svg')"
    onerror={handleImageError}
  ></div>
{/if}

<style>
  .card {
    position: absolute;
    width: auto;
    top: 1px;
    left: 50%;
    transform-origin: center bottom;
    transform: translateX(-50%) rotate(var(--rotation)) translateX(var(--translation));
    box-shadow: -5px 0 5px -5px rgba(0, 0, 0, 0.5);
    border-radius: 10%;
    aspect-ratio: var(--card-aspect-ratio);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transition:
      transform 0.2s ease-out,
      height 0.2s ease-out;
    cursor: pointer;
  }

  .card.showfullcard {
    top: auto;
    bottom: 0%;
    box-shadow: none;
    border-radius: unset;
  }

  .card:hover:not(.showfullcard) {
    transform: translateX(-50%) rotate(var(--rotation)) translateX(var(--translation))
      translateY(-1em);
  }

  .error {
    color: red;
    font-weight: bold;
    font-size: 12px;
  }
</style>
