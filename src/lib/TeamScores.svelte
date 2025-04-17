<script lang="ts">
  const { team, myteam, currentScore, winningScore} = $props<{ team: number; myteam: boolean; currentScore:number; winningScore:number}>();
</script>

<div class:hide-on-phone={!myteam}>
  <div class="team-score" class:my-team={myteam}>{currentScore}/{winningScore}</div>
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
