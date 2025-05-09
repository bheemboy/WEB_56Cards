<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
  import { GameStage } from "./states/GameInfo.svelte";

  const game: GameController = getContext(gameControllerContextKey);

  let title = $state("");
  let message = $state("");

  $effect(() => {
    if (game.gameInfo.gameStage === GameStage.GameOver) {
      if (game.gameInfo.gameCancelled) {
        title = "Game Cancelled!";
        message = "";
      } else if (game.gameInfo.gameForfeited) {
        title = "Game Forfeited!";
        message = "";
      } else {
        title = "Game Over!";
        message = "";
      }
    } else if (game.gameInfo.gameStage === GameStage.SelectingTrump) {
      if (game.currentPlayer.playerPosition === game.bidInfo.nextBidder) {
        title = "Select Trump Card";
        message = "";
      } else {
        title="";
        message = "Selecting Trump Card...";
      }
    } else {
      title = "";
      message = "";
    }
  });

</script>

{#if title || message}
  <div class="message-dialog" role="alertdialog">
    <div class="message-content">
      {#if title}
        <h2 id="dialog-title">{title}</h2>
      {/if}
      {#if message}
        <p id="dialog-description">{message}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .message-dialog {
    background-color: rgba(161, 161, 161, 0.3);
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    width: clamp(150px, 35cqw, 250px);
    padding: 20px;
  }

  .message-content {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  h2 {
    font-size: 18px;
    margin: 0;
    color: yellow;
  }

  p {
    margin: 0;
    color: yellow;
  }
</style>
