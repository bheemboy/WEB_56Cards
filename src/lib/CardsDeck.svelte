<script lang="ts">
    import Card from "./Card.svelte";
    export let cards:string[] = [];
    
    const scale=17; //percentage
    const percardrotation = 13; //degrees
    const percardtranslation = 14; //pixels

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
