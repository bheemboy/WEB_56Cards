<script lang="ts">
    export let team:number;
    export let koolie_count:number;

    $: background_image = team==0? 'images/Glass_button_blue.svg': 'images/Glass_button_red.svg';
</script>

<div class="kooliebar">
	{#each Array(koolie_count) as _, index (index)}
		<div class="koolie" style="--background_image: url({background_image})"></div>
	{/each}
</div>


<style>
    .koolie {
        height: 3vh;
        aspect-ratio: 1;
        background-image: var(--background_image);
        background-size: contain;
        display: block;
        /* border: 1px solid white; */
    }

</style>
