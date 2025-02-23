<script lang="ts">
    import Card from "./Card.svelte";
    const { cards, scale = 17, percardrotation = 13, percardtranslation = 14 } = $props<{ cards: string[], scale?: number, percardrotation?: number, percardtranslation?: number }>();
</script>

<div class="deck">
    {#each cards as card, index (index)}
        <Card {card} {scale} 
            rotation={percardrotation * (index - (cards.length - 1) / 2)} 
            translation={percardtranslation * (index - (cards.length - 1) / 2)} />
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
