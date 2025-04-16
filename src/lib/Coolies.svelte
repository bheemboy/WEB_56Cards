<script lang="ts">
    let { team, coolie_count, myteam } = $props<{ team: number, coolie_count: number, myteam: boolean }>();
    let background_image = $derived(`images/Glass_button_${team === 0 ? 'blue' : 'red'}.svg`);
</script>

<div class:hide-on-phone={!myteam}>
  <div class="cooliebar" class:my-team={myteam}>
    {#each Array(coolie_count) as _, index (index)}
        <div class="coolie" style="--background_image: url({background_image})"></div>
    {/each}
</div>
</div>

<style>
    .cooliebar {
        display: flex;
        flex-direction: row;
        gap: 2px;
        position: absolute;
        top: min(1vw, 10px);
        right: min(1vw, 10px);
    }

    .cooliebar.my-team {
        right: auto;
        left: min(1vw, 10px);
    }

    .coolie {
        width: min(5vw, 30px);
        aspect-ratio: 1;
        background-image: var(--background_image);
        background-size: contain;
        display: block;
        /* border: 1px solid white; */
    }
</style>
