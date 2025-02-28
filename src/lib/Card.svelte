<script lang="ts">
    import { SUITS, RANKS, CARDHEIGHT, CARDWIDTH, ASPECTRATIO, BACKGROUNDHEIGHT, BACKGROUNDWIDTH } from './Constants';
    const { card, scale, rotation, translation, oncardplayed} = $props();

    const suit = SUITS.get(card[0]);
    const rank = RANKS.get(card.slice(1));
    const isValidCard = suit !== undefined && rank !== undefined;
    if (!isValidCard) console.error(`Invalid card ${card}`);

    let windowHeight = $state<number>();
    let card_dim = $state({ height: CARDHEIGHT, width: CARDWIDTH });
    let background_dim = $state({ size: `${BACKGROUNDHEIGHT}px ${BACKGROUNDWIDTH}px`, position: '0px 0px'});

    $effect(() => {
        card_dim.height = Math.max(CARDHEIGHT, ((windowHeight ?? 0) * scale / 100));
        card_dim.width = card_dim.height * ASPECTRATIO;

        const background_scale_ratio = card_dim.height / CARDHEIGHT;
        const bgPositionY = isValidCard ? -1 * suit * CARDHEIGHT * background_scale_ratio : 0;
        const bgPositionX = isValidCard ? -1 * rank * CARDWIDTH * background_scale_ratio : 0;
        background_dim.size = `${BACKGROUNDHEIGHT * background_scale_ratio}px ${BACKGROUNDWIDTH * background_scale_ratio}px`;
        background_dim.position = `${bgPositionX}px ${bgPositionY}px`;
    });

</script>

<svelte:window bind:innerHeight={windowHeight} />

{#if isValidCard}
    <div 
        class="card"
        role="button"
        tabindex="0"
        onclick={oncardplayed}
        onkeydown={() => {}}
        aria-label={`${card} playing card`}
        style="--card-height: {card_dim.height}px;
               --card-width: {card_dim.width}px;
               --background-size: {background_dim.size};
               --background-position: {background_dim.position};
               --rotation: rotate({rotation}deg);
               --translation: {translation}px;
               --aspect_ratio: {ASPECTRATIO};">
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
        aspect-ratio: var(--aspect_ratio);
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
