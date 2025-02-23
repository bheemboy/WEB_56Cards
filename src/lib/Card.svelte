<script lang="ts">
    const { card, rotation = 0, translation = 0, scale = 15 } = $props();

    const suits = new Map<string, number>([['C', 0],['D', 1],['H', 2],['S', 3]]);
    const ranks = new Map<string, number>([['0', 0],['A', 1],['2', 2],['3', 3],['4', 4],['5', 5],['6', 6],['7', 7],['8', 8],['9', 9],['10', 10],['J', 11],['Q', 12],['K', 13]]);
    const suit = suits.get(card[0]);
    const rank = ranks.get(card.slice(1));
    const isValidCard = suit !== undefined && rank !== undefined;
    if (!isValidCard) {
        console.error(`Invalid card ${card}`);
    }

    let windowHeight = $state<number>();
    const pngCardHeight = 94;
    const pngCardWidth = 69;
    const aspectRatio = pngCardWidth / pngCardHeight;
    const card_height = $derived(Math.max(pngCardHeight, ((windowHeight ?? 0) * scale / 100)));
    const card_width = $derived(card_height * aspectRatio);

    const background_scale_ratio = $derived(card_height / pngCardHeight);
    const background_size = $derived(`${966 * background_scale_ratio}px ${376 * background_scale_ratio}px`);
    const bgPositionY = $derived(isValidCard ? -1 * suit * pngCardHeight * background_scale_ratio : 0);
    const bgPositionX = $derived(isValidCard ? -1 * rank * pngCardWidth * background_scale_ratio : 0);
    const background_position = $derived(`${bgPositionX}px ${bgPositionY}px`);
</script>

<svelte:window bind:innerHeight={windowHeight} />

{#if isValidCard}
    <div 
        class="card"
        role="button"
        tabindex="0"
        onclick={() => alert(card)}
        onkeydown={() => {}}
        aria-label={`${card} playing card`}
        style="--card-height: {card_height}px;
               --card-width: {card_width}px;
               --background-size: {background_size};
               --background-position: {background_position};
               --rotation: rotate({rotation}deg);
               --translation: {translation}px;">
    </div>
{:else}
    <div class="error" role="alert">Invalid card {card}</div>
{/if}

<style>
    .card {
        position: absolute;
        border: none;
        outline: none;
        padding: 0;
        top: 9%;
        --element-width: 0px;
        left: calc(55% - (var(--card-width))/2);
        height: var(--card-height);
        aspect-ratio: 69 / 94;
        background-image: url("/images/cards.png");
        background-size: var(--background-size);
        background-position: var(--background-position);
        transform-origin: 30% 100%;
        transform: var(--rotation);
        translate: var(--translation);
        transition: top 0.1s ease-out;
    }
    .card:hover {
        top: 7%;
    }

    .error {
        color: red;
        font-weight: bold;
        font-size: 12px;
    }
</style>
