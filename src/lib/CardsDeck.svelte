<script lang="ts">
    import Card from "./Card.svelte";
    let { cards, scale = 17, percardrotation = 13, percardtranslation = 14 } = $props<{ cards: string[], scale?: number, percardrotation?: number, percardtranslation?: number }>();

    function playCard(card: string) {
        const i = cards.indexOf(card) ;
        if (i !== -1) {
            cards = cards.filter((c: string) => c !== card);
            console.log(`removed card ${card}, remaining cards ${cards}`);
        }
    }
</script>

<div class="deck">
    {#each cards as card (card)}
        <Card {card} oncardplayed={() => { playCard(card);}} {scale} 
            rotation={percardrotation * (cards.indexOf(card) - (cards.length - 1) / 2)} 
            translation={percardtranslation * (cards.indexOf(card) - (cards.length - 1) / 2)} />
    {/each}
</div>

<style>
    .deck {
        position: relative;
        height: 22vh;
        aspect-ratio: 2;
        /* background-color: DodgerBlue;
        border: 1px solid white; */
    }
</style>
