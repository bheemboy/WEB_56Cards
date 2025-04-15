<script lang="ts">
    import SvgCard, {type SvgCardProps} from "./SvgCard.svelte";

    export interface CardsDeckProps { 
        cards: string[]
        vh?: number 
        percardrotation?: number 
        percardtranslation?: number 
    }

    let { cards, vh = 20, percardrotation = 13, percardtranslation = 14} : CardsDeckProps = $props();

    // The array of card data to use in the markup
    let cardsData: SvgCardProps[] = $state([]);

    // Recalc each card's properties based on its array index.
    $effect(() => {
        cardsData = cards.map((c: string, i: number): SvgCardProps => ({
            card: c,
            vh: vh,
            rotation: percardrotation * (i - (cards.length - 1) / 2),
            translation: percardtranslation * (i - (cards.length - 1) / 2),
            oncardplayed: () => {
                // Remove the card from the deck
                cards = [...cards.slice(0, i), ...cards.slice(i + 1)];
                // console.log(`removed card at index ${index}, remaining cards ${cards}`);
            }
        }));
    });
</script>

<div class="deck">
    {#each cardsData as cardData, index (cardData.card + '-' + index)}
        <SvgCard {...cardData} />
    {/each}
</div>

<style>
    .deck {
        position: relative;
        height: 22vh;
        aspect-ratio: 2;
    }
</style>
