<script lang="ts">
  import { GameService } from "../lib/gameService";
  import type { GameState } from "../lib/gameTypes";

  let playerName:string="", tableType:number=0, tableName:string="", language:string="ml", watch: boolean=false;

  const gameService = new GameService();
  let gameState = $state<GameState>();
  let error = $state("");
  let currentScore = $state(0); //gameState?.tableInfo.teamScore[gameState.playerPosition % 2] ?? 0);

  
  
  $effect(() => {
    initializeGame();
  });

  async function initializeGame() {
    try {
      await gameService.connect();
      await gameService.registerPlayer(playerName, language ?? "en");
      await gameService.joinTable(tableType);
    } catch (error) {
      error = `Failed to initialize game: ${error}`;
    }
  }

  // Subscribe to gameService updates using $effect
  $effect(() => {
    const unsubscribe = gameService.gameState.subscribe(newState => {
      gameState = newState;
    });

    const unsubscribeError = gameService.error.subscribe(newError => {
      error = newError;
    });

    return () => {
      unsubscribe();
      unsubscribeError();
    };
  });

  function handleBid(bid: number) {
    gameService.placeBid(bid);
  }

  function handlePass() {
    gameService.passBid();
  }

  function handleTrumpSelect(card: string) {
    gameService.selectTrump(card);
  }
</script>

<div class="game-table">
  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if gameState}
    <div class="player-info">
      Player: {playerName} [{gameState.playerPosition}]
      Score: {currentScore}
    </div>

    {#if gameState.gameStage === 2}
      <div class="bidding">
        <button onclick={() => handleBid(gameState!.tableInfo.bid.highBid + 1)}>
          Bid {gameState.tableInfo.bid.highBid + 1}
        </button>
        <button onclick={handlePass}>Pass</button>
      </div>
    {/if}

    <div class="cards">
      {#each gameState.playerCards || [] as card}
        <button 
          class="card"
          onclick={() => handleTrumpSelect(card)}
          disabled={gameState!.gameStage !== 3}
        >
          {card}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .game-table {
    padding: 1rem;
  }
  .error {
    color: red;
    margin-bottom: 1rem;
  }
  .cards {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .card {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>
