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
        style="--background_image: url({background_image})"
      ></div>
    {/each}
  </div>
</div>

<style>
  .cooliebar {
    display: flex;
    flex-direction: row;
    gap: 2px;
    position: absolute;
    top: min(1cqw, 10px);
    right: min(1cqw, 10px);
  }

  .cooliebar.home-team {
    right: auto;
    left: min(1cqw, 10px);
  }

  .coolie {
    width: min(25px, min(5cqw, 5cqh));
    aspect-ratio: 1;
    background-image: var(--background_image);
    background-size: contain;
    display: block;
    /* border: 1px solid white; */
  }
  @media (max-width: 450px) {
    .hide-on-phone {
      display: none;
    }
  }
</style>
