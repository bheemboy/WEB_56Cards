<script lang="ts">
    import type { CardProps, CardsDeckProps } from './Types';
    import Card from "./Card.svelte";

    let { cards, scale = 17, percardrotation = 13, percardtranslation = 14} : CardsDeckProps = $props();

    // The array of card data to use in the markup
    let cardsData: CardProps[] = $state([]);

    // Recalc each card's properties based on its array index.
    $effect(() => {
        cardsData = cards.map((c: string, i: number): CardProps => ({
            card: c,
            scale: scale,
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
        <Card {...cardData} />
    {/each}
</div>

<style>
    .deck {
        position: relative;
        height: 22vh;
        aspect-ratio: 2;
    }
</style>
