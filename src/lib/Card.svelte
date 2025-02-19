<script lang="ts">
    export let card: string;
    export let rotation: number = 0;
    export let translation: number = 0;
    export let scale: number = 15;

    const suits = new Map<string, number>([['C', 0],['D', 1],['H', 2],['S', 3]]);
    const ranks = new Map<string, number>([['0', 0],['A', 1],['2', 2],['3', 3],['4', 4],['5', 5],['6', 6],['7', 7],['8', 8],['9', 9],['10', 10],['J', 11],['Q', 12],['K', 13]]);

    // get the card code from the cards array
    const suit = suits.get(card[0]);
    const rank = ranks.get(card.slice(1));
    const isValidCard = suit !== undefined && rank !== undefined
    if (!isValidCard) {
        console.error(`Invalid card ${card}`);
    }

    // calculate card height and width based on the window height
    const pngCardHeight = 94;
    const pngCardWidth = 69;
    const aspectRatio = pngCardWidth / pngCardHeight;

    let windowHeight:number; // window height will initially be undefined, but will be updated by the time the window is displayed

    let card_height = pngCardHeight;
    $: if (windowHeight) {
        let calculatedHeight = (windowHeight * scale) / 100;
        if (calculatedHeight >= pngCardHeight) {
            card_height = calculatedHeight;
        }
    }
    $: card_width = card_height * aspectRatio;
    
    // calculate the size and position for the background image based on the card height and width
    $: background_scale_ratio = card_height / (1.0 * pngCardHeight);
    $: background_size = (966 * background_scale_ratio).toString() + "px " + (376 * background_scale_ratio).toString() + "px";
    $: bgPositionY = isValidCard ? -1 * suit * pngCardHeight * background_scale_ratio  : 0;
    $: bgPositionX = isValidCard ? -1 * rank * pngCardWidth * background_scale_ratio : 0;
    $: background_position = bgPositionX.toString() + "px " + bgPositionY.toString() + "px";

</script>

<svelte:window bind:innerHeight={windowHeight} />

{#if isValidCard}
    <button class="card"
        on:click={() => alert(card)}
        aria-label="Card"
        style=
            "--card-height: {card_height}px;  --card-width: {card_width}px;
            --background-size: {background_size};  --background-position: {background_position}; 
            --rotation: rotate({rotation}deg); --translation: {translation}px;" >
    </button>
{:else}
    <div class="error">Invalid card {card}</div>
{/if}


<style>
    .card {
        position: absolute;
        border: none;
        outline: none;
        border-radius: 12px;
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
