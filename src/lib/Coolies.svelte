<script lang="ts">
    let { team, coolie_count, myteam } = $props<{ team: number, coolie_count: number, myteam: boolean }>();
    let background_image = $derived(`images/Glass_button_${team === 0 ? 'blue' : 'red'}.svg`);
</script>

<div class="cooliebar" class:my-team={myteam}>
    {#each Array(coolie_count) as _, index (index)}
        <div class="coolie" style="--background_image: url({background_image})"></div>
    {/each}
</div>

<style>
    .cooliebar {
        display: flex;
        flex-direction: row;
        gap: 2px;
        position: absolute;
        top: 10px;
        right: 10px;
    }

    .cooliebar.my-team {
        right: auto;
        left: 10px;
    }

    .coolie {
        height: 3vh;
        aspect-ratio: 1;
        background-image: var(--background_image);
        background-size: contain;
        display: block;
        /* border: 1px solid white; */
    }
</style>
