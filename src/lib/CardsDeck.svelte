<script lang="ts">
    import Card from "./Card.svelte";

    let { cards, scale = 17, percardrotation = 13, percardtranslation = 14} = 
        $props<{ cards: string[], scale?: number, percardrotation?: number, percardtranslation?: number }>();

    // The array of card data to use in the markup
    let cardsData: { card: string; scale: number; rotation: number; translation: number; oncardplayed: () => void }[] = $state([]);

    // Instead of using indexOf which fails with duplicates,
    // we recalc each card's properties based on its array index.
    $effect(() => {
        cardsData = cards.map((card: string, index: number) => ({
            card,
            scale,
            rotation: percardrotation * (index - (cards.length - 1) / 2),
            translation: percardtranslation * (index - (cards.length - 1) / 2),
            oncardplayed: () => {
                // Remove the card from the deck
                cards = [...cards.slice(0, index), ...cards.slice(index + 1)];
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
