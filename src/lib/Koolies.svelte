<script lang="ts">
    const { team, koolie_count } = $props<{ team: number, koolie_count: number }>();
    const background_image = team==0? 'images/Glass_button_blue.svg': 'images/Glass_button_red.svg';
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
