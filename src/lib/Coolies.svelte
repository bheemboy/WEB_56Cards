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

<div class:hide-on-phone={!(homeTeam === team)}>
  <div class="cooliebar" class:home-team={homeTeam === team}>
    {#each Array(coolieCount) as _, index (index)}
      <div
        class="coolie"
        style:background-image="url({background_image})"
      ></div>
    {/each}
  </div>
</div>

<style>
  .cooliebar {
    position: absolute;
    top: min(1cqw, 10px);
    right: min(1cqw, 10px);
    display: flex;
    flex-direction: row;
    gap: 2px;
    /* border: 1px solid white; */
  }

  .cooliebar.home-team {
    right: auto;
    left: min(1cqw, 10px);
  }

  .coolie {
    width: min(25px, min(5cqw, 5cqh));
    aspect-ratio: 1;
    background-size: contain;
    /* border: 1px solid white; */
  }
  @media (width <= 450px) {
    .hide-on-phone {
      display: none;
    }
  }
</style>
