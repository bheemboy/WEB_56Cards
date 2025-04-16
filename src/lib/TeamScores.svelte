<script lang="ts">
  const { team, myteam } = $props<{ team: number; myteam: boolean }>();
</script>

<div class:hide-on-phone={!myteam}>
  <div class="team-score" class:my-team={myteam}>23/54</div>
</div>

<style>
  .team-score {
    position: absolute;
    top: min(6vw, 42px);
    right: min(2vw, 15px);
    font-size: larger;
  }

  .team-score.my-team {
    right: auto;
    left: min(2vw, 15px);
  }
</style>
