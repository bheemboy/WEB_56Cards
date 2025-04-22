<script lang="ts">
  let { team, homeTeam, coolieCount } = $props<{
    team: number;
    homeTeam: number;
    coolieCount: number;
  }>();

  let background_image = $derived(
    `images/Glass_button_${team === 0 ? "blue" : "red"}.svg`,
  );
</script>

<div class="cooliebar" class:other-team={homeTeam !== team}>
  {#each Array(coolieCount) as _, index (index)}
    <div
      class="coolie"
      style:background-image="url({background_image})"
    ></div>
  {/each}
</div>

<style>
  .cooliebar {
    position: absolute;
    top: min(1cqw, 10px);
    left: min(1cqw, 10px);
    display: flex;
     flex-direction: row;
    gap: 2px;
    /* border: 1px solid white; */
  }

  .cooliebar.other-team {
    left: auto;
    right: min(1cqw, 10px);
  }

  @container cards-table (width <= 450px) {
    .cooliebar.other-team {
      display: none;
    }
  }

  .coolie {
    width: min(25px, min(5cqw, 5cqh));
    aspect-ratio: 1;
    background-size: contain;
    /* border: 1px solid white; */
  }

</style>
