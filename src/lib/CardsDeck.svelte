<script lang="ts">
    import SvgCard, {type SvgCardProps} from "./SvgCard.svelte";

    export interface CardsDeckProps { 
        cards: string[]
        vh?: number 
        percardrotation?: number 
        percardtranslation?: number 
    }

    let { cards = $bindable(), vh = 15, percardrotation = 13, percardtranslation = 1.8} : CardsDeckProps = $props();

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
                // cards = [...cards.slice(0, i), ...cards.slice(i + 1)];
                console.log(`try to play card at index ${i}, remaining cards ${cards}`);
            }
        }));
    });
</script>

<div class="deck"
  style:height = "{vh*1.5}vh"
  style:aspect-ratio = {2}>
    {#each cardsData as cardData, index (cardData.card + '-' + index)}
        <SvgCard {...cardData} />
    {/each}
</div>

<style>
    .deck {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        /* border: 1px solid rgba(255, 255, 255, 0.2); */
    }
</style>
