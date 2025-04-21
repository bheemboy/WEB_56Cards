<script lang="ts">
  const { team, homeTeam, currentScore, winningScore } = $props<{
    team: number;
    homeTeam: number;
    currentScore: number;
    winningScore: number;
  }>();
</script>

<div class:hide-on-phone={!(homeTeam === team)}>
  <div class="team-score" class:home-team={homeTeam === team}>
    {currentScore}/{winningScore}
  </div>
</div>

<style>
  .team-score {
    position: absolute;
    top: min(37px, min(7cqw, 7cqh));
    right: min(15px, min(3cqw, 3cqh));
    font-size: larger;
  }

  .team-score.home-team {
    right: auto;
    left: min(15px, min(3cqw, 3cqh));
  }
  @media (max-width: 450px) {
    .hide-on-phone {
      display: none;
    }
  }
</style>
