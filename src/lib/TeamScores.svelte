<script lang="ts">
  const { team, homeTeam, currentScore, winningScore} = $props<{ team: number; homeTeam: number; currentScore:number; winningScore:number}>();
</script>

<div class:hide-on-phone={!(homeTeam === team)}>
  <div class="team-score" class:home-team={homeTeam === team}>{currentScore}/{winningScore}</div>
</div>

<style>
  .team-score {
    position: absolute;
    top: min(6vw, 42px);
    right: min(2vw, 15px);
    font-size: larger;
  }

  .team-score.home-team {
    right: auto;
    left: min(2vw, 15px);
  }
</style>
