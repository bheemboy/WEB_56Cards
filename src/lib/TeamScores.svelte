<script lang="ts">
  import { getContext } from "svelte";
  import {
    GameController,
    gameControllerContextKey,
  } from "../lib/GameController.svelte";

  // Get the hub instance from the context
  const game: GameController = getContext(gameControllerContextKey);
  const TOTALPOINTS = 56;
  
  // Calculate percentages for the widths (memoized with $derived)
  let homeWidth = $derived((100.0 * game.roundsInfo.teamScore[game.currentPlayer.homeTeam]) / TOTALPOINTS);
  let otherWidth = $derived((100.0 * game.roundsInfo.teamScore[game.currentPlayer.opposingTeam]) / TOTALPOINTS);
  let targetPos = $derived((100.0 * game.bidInfo.highBid) / TOTALPOINTS);
  let homeTeamScore: string = $derived(game.roundsInfo.teamScore[game.currentPlayer.homeTeam] > 0 ? game.roundsInfo.teamScore[game.currentPlayer.homeTeam].toString() : "");
  let otherTeamScore: string = $derived(game.roundsInfo.teamScore[game.currentPlayer.opposingTeam] > 0 ? game.roundsInfo.teamScore[game.currentPlayer.opposingTeam].toString() : "");

  // Determine diamond color based on game state
  const targetMarkerColor : string = $derived.by(() => {
    if (game.roundsInfo.teamScore[game.currentPlayer.homeTeam] >= game.bidInfo.getPointsNeeded(game.currentPlayer.homeTeam)) {
      return game.currentPlayer.homeTeam % 2 === 0 ? "blue": "red"
    } else if (game.roundsInfo.teamScore[game.currentPlayer.opposingTeam] >= game.bidInfo.getPointsNeeded(game.currentPlayer.opposingTeam)) {
      return game.currentPlayer.opposingTeam % 2 === 0 ? "blue": "red"
    } else {
      return "white";
    }
  });

</script>

<div class="score-container">
  <!-- Home Team Score (Blue) - starts from left -->
  <div class="home-team-score" style:width="{homeWidth}%">
    <span class="score-text">{homeTeamScore}</span>
  </div>
 
  <!-- Other Team Score (Red) - starts from right -->
  <div class="other-team-score" style:width="{otherWidth}%">
    <span class="score-text">{otherTeamScore}</span>
  </div>
 
  <!-- Target marker (diamond) -->
  <div class="target" style:left="{targetPos}%">
    <span style:color="{targetMarkerColor}">◆</span>
  </div>
</div>

<style>
  .score-container {
    position: absolute;
    top: calc(min(1cqw, 10px) + clamp(15px, min(2.5cqw, 2.5cqh), 25px) + 2px);
    left: min(1cqw, 10px);
    width: clamp(180px, min(30cqw, 30cqh), 300px);
    height: 12px;
    border: 1px solid #333;
    overflow: hidden;
  }
 
  .home-team-score {
    position: absolute;
    top: 0cqh;
    left: 0cqw;
    height: 100%;
    background-color: rgba(0, 0, 255, 0.3);
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
 
  .other-team-score {
    position: absolute;
    top: 0cqh;
    right: 0;
    height: 100%;
    background-color: rgba(255, 0, 0, 0.4);
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
 
  .score-text {
    font-size: 10px;
    color: white;
    text-shadow: 0px 0px 2px #000;
    padding-inline: 2px;
  }
 
  .target {
    position: absolute;
    top: 0;
    height: 90%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    pointer-events: none;
    width: 2px;
  }
 
  .target span {
    font-size: 14px;
    text-shadow: 0px 0px 2px #000;
  }
</style>
