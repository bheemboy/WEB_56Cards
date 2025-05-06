<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
  import { GameStage } from "./states/GameInfo.svelte";

  const game: GameController = getContext(gameControllerContextKey);

  function handleNewGame() {
    game.startNextGame();
  }

  function handleForfeitGame() {
    if (confirm('Forfeit this game?')) {
      game.forfeitGame();
    }
  }

  function handleLogout() {
    game.unregiterPlayer();
    window.location.href = '/';
  }

  function handleViewLastRound() {
    // TODO
  }
</script>

<div class="button-bar">
  {#if game.gameInfo.gameStage === GameStage.GameOver}
    <div class="button-container">
      <button class="game-button newgame" onclick={handleNewGame}>
        <!-- New Game SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="none" d="M15 14.5H8M11.5 11v7M18.5 21.5h-14v-19h9l5 5v14z" />
          <path fill="none" d="M18.5 7.5h-5v-5" />
        </svg>
      </button>
    </div>
  {/if}

  {#if game.roundsInfo.rounds.length > 1 && game.gameInfo.gameStage === GameStage.PlayingCards}
    <div class="button-container">
      <button class="game-button viewlastround" onclick={handleViewLastRound}>
        <!-- View Last Round SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="none" d="M11.54 6.54v4h4" />
          <path fill="none" d="M15.54 12.87v-3l-3.5-3.33h-7.5v15h3.5" />
          <path fill="none" d="M17.54 13.87v-6l-3.5-3.33h-8" />
          <path fill="none" d="M19.54 14.87v-9l-3.5-3.33h-8" />
          <circle cx="14.04" cy="17.97" r="1.9" fill="none" />
          <path fill="none" d="M21.2 17.97s-3.09 3.5-7.16 3.5-7.15-3.5-7.15-3.5 3.31-3.5 7.15-3.5 7.16 3.5 7.16 3.5z" />
        </svg>
      </button>
    </div>
  {/if}

  {#if game.gameInfo.gameStage === GameStage.PlayingCards}
    <div class="button-container">
      <button class="game-button forfeitgame" onclick={handleForfeitGame}>
        <!-- Forfeit Game SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path fill="none" d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
          <circle cx="12" cy="12" r="9.5" fill="none" />
        </svg>
      </button>
    </div>
  {/if}

  <div class="button-container">
    <button class="game-button logout" onclick={handleLogout}>
      <!-- Logout SVG -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="none" d="M10.5 11V2.5h10v19h-10V14M3.5 12.5H16M7 9l-3.5 3.5L7 16" />
      </svg>
    </button>
  </div>
</div>

<style>
  .button-bar {
    position: absolute;
    top: 5px;
    right: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: max(1cqh, 1cqw);
    font-family: sans-serif;
  }

  .button-container {
    position: relative;
  }

  .game-button {
    width: max(4cqh, 4cqw);
    aspect-ratio: 1;
    border-radius: 50%;
    background: rgba(30, 30, 30, 0.3);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;
    box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.05);
  }

  .game-button:hover {
    transform: translateY(-2px);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.3),
      0 0 10px rgba(255, 255, 255, 0.1),
      inset 0 0 12px rgba(255, 255, 255, 0.1);
  }

  .game-button svg {
    width: 80%;
    height: 80%;
  }

  /* Custom strokes */
  .newgame svg path {
    stroke: rgb(161, 255, 247);
    stroke-width: 1.5; 
  }

  .viewlastround svg path,
  .viewlastround svg circle {
    stroke: rgb(255, 237, 133);
    stroke-width: 1.5; 
  }

  .forfeitgame svg path,
  .forfeitgame svg circle {
    stroke: rgb(253, 130, 146);
    stroke-width: 2; 
  }

  .logout svg path {
    stroke: white;
    stroke-width: 1.5; 
  }
</style>
