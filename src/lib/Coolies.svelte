<script lang="ts">
  import { getContext } from "svelte";
  import {
    GameController,
    gameControllerContextKey,
  } from "../lib/GameController.svelte";
  import TeamScores from "../lib/TeamScores.svelte";

  // Get the hub instance from the context
  const game: GameController = getContext(gameControllerContextKey);

  $inspect(game.currentPlayer.homeTeam, game.currentPlayer.otherTeam);

</script>


<div class="coolie-score-container">
  <div class="cooliebar">
    {#each Array(game.gameInfo.coolieCount[game.currentPlayer.homeTeam]) as _, index (index)}
      <div class="coolie"
        style:background-image="url({`images/Glass_button_${game.currentPlayer.homeTeam === 0 ? "blue" : "red"}.svg`})">
      </div>
    {/each}
    {#each Array(game.gameInfo.coolieCount[game.currentPlayer.otherTeam]) as _, index (index)}
      <div class="coolie" 
        style:background-image="url({`images/Glass_button_${game.currentPlayer.otherTeam === 0 ? "blue" : "red"}.svg`})">
      </div>
    {/each}
  </div>

  <TeamScores />
</div>

<style>
  .coolie-score-container {
    position: absolute;
    top: min(1cqw, 10px);
    left: min(1cqw, 10px);
  }

  .cooliebar {
    position: relative;
    display: flex;
    flex-direction: row;
    gap: 1px;
    /* border: 1px solid white; */
  }

  .coolie {
    width: clamp(15px, min(2.5cqw, 2.5cqh), 25px);
    aspect-ratio: 1;
    background-size: contain;
    /* border: 1px solid white; */
  }
</style>
