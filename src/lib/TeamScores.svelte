<script lang="ts">
  const { team, homeTeam, currentScore, winningScore } = $props<{
    team: number;
    homeTeam: number;
    currentScore: number;
    winningScore: number;
  }>();
</script>

<div class="team-score" class:other-team={homeTeam !== team}>
  {currentScore}/{winningScore}
</div>

<style>
  .team-score {
    position: absolute;
    top: min(37px, min(7cqw, 7cqh));
    left: min(15px, min(3cqw, 3cqh));
    font-size: larger;
  }

  .team-score.other-team {
    left: auto;
    right: min(15px, min(3cqw, 3cqh));
  }

  @container cards-table (width <= 450px) {
    .team-score.other-team {
      display: none;
    }
  }
</style>
