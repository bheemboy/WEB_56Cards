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
  const homeWidth = $derived((100.0 * game.roundsInfo.teamScore[game.currentPlayer.homeTeam]) / TOTALPOINTS);
  const otherWidth = $derived((100.0 * game.roundsInfo.teamScore[game.currentPlayer.otherTeam]) / TOTALPOINTS);
  const homeTeamScore: string = $derived(game.roundsInfo.teamScore[game.currentPlayer.homeTeam] > 0 ? game.roundsInfo.teamScore[game.currentPlayer.homeTeam].toString() : "");
  const otherTeamScore: string = $derived(game.roundsInfo.teamScore[game.currentPlayer.otherTeam] > 0 ? game.roundsInfo.teamScore[game.currentPlayer.otherTeam].toString() : "");

  const targetPos = $derived((game.currentPlayer.homeTeam === game.bidInfo.biddingTeam ? game.bidInfo.highBid : (TOTALPOINTS-game.bidInfo.highBid+1)) * 100.0 / TOTALPOINTS);

  // Determine diamond color based on game state
  const targetMarkerColor : string = $derived.by(() => {
    if (game.roundsInfo.teamScore[game.currentPlayer.homeTeam] >= game.bidInfo.getPointsNeeded(game.currentPlayer.homeTeam)) {
      return game.currentPlayer.homeTeam === 0 ? "blue": "red"
    } else if (game.roundsInfo.teamScore[game.currentPlayer.otherTeam] >= game.bidInfo.getPointsNeeded(game.currentPlayer.otherTeam)) {
      return game.currentPlayer.otherTeam === 0 ? "blue": "red"
    } else {
      return "white";
    }
  });

</script>

<div class="score-container">
  <div class={`team-score left team${game.currentPlayer.homeTeam}`} style:width="{homeWidth}%">
    <span class="score-text">{homeTeamScore}</span>
  </div>
 
  <div class={`team-score right team${game.currentPlayer.otherTeam}`} style:width="{otherWidth}%">
    <span class="score-text">{otherTeamScore}</span>
  </div>
 
  <!-- Target marker (diamond) -->
  <div class="target" style:left="{targetPos}%">
    <span style:color="{targetMarkerColor}">◆</span>
  </div>
</div>

<style>
  .score-container {
    position: relative;
    top: 3px;
    height: 12px;
    border: 1px solid #333;
    overflow: hidden;
  }
  
  .team-score {
    position: absolute;
    top: 0cqh;
    height: 100%;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .team-score.left {
    left: 0cqw;
  }

  .team-score.right {
    right: 0;
  }

  .team-score.team0 {
    background-color: rgba(0, 0, 255, 0.3);
  }
 
  .team-score.team1 {
    background-color: rgba(255, 0, 0, 0.4);
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
