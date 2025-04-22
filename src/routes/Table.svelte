<!-- Table.svelte -->
<script lang="ts">
  import { getContext, onMount } from "svelte";
  import {
    GameController,
    gameControllerContextKey,
  } from "../lib/GameController.svelte";
  import { ConnectionState } from "../lib/HubConnection.svelte";
  import CardsDeck from "../lib/CardsDeck.svelte";
  import Coolies from "../lib/Coolies.svelte";
  import TeamScores from "../lib/TeamScores.svelte";
  import Chair from "../lib/Chair.svelte";
  import CurrentRoundCards from "../lib/CurrentRoundCards.svelte";

  // Get the hub instance from the context
  const gameController: GameController = getContext(gameControllerContextKey);
  let connectionAttempted = $state(false);
  let initializing = $state(true);

  // Initialize connection when component mounts
  onMount(async () => {
    // Get current URL params right away
    const url = new URL(window.location.href);
    const rawParams = new URLSearchParams(url.search);
    const params = Object.fromEntries(
      Array.from(rawParams.entries()).map(([key, value]) => [
        key.toLowerCase(),
        value,
      ]),
    );

    try {
      // First update login params
      await handleParamsUpdate(params);

      // Then ensure we're connected
      if (
        gameController.connectionState !== ConnectionState.CONNECTED &&
        gameController.connectionState !== ConnectionState.CONNECTING
      ) {
        await gameController.connect();
      }
    } catch (err) {
      console.error("Error during initialization:", err);
    } finally {
      initializing = false;
    }
  });

  // Create an effect that watches URL changes
  $effect(() => {
    // Don't handle URL changes during initialization
    if (initializing) return;

    // Get current URL params
    const url = new URL(window.location.href);
    const rawParams = new URLSearchParams(url.search);
    const params = Object.fromEntries(
      Array.from(rawParams.entries()).map(([key, value]) => [
        key.toLowerCase(),
        value,
      ]),
    );

    handleParamsUpdate(params);
  });

  async function handleParamsUpdate(params: Record<string, string>) {
    try {
      // Update login params and check if anything changed
      const [, paramsChanged] = await gameController.updateLoginParams({
        userName: params.username ?? gameController.loginParams.userName,
        tableType: params.tabletype ?? gameController.loginParams.tableType,
        tableName: params.tablename ?? gameController.loginParams.tableName,
        language: params.language ?? gameController.loginParams.language,
        watch: params.watch === "1",
      });

      // Mark connection as attempted
      connectionAttempted = true;

      // Force reconnection if any parameter changed
      if (paramsChanged) {
        // Disconnect if already connected
        if (gameController.connectionState === ConnectionState.CONNECTED) {
          await gameController.disconnect();
          // Add a small delay to ensure disconnect completes
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Only attempt to connect if needed
        if (
          gameController.connectionState !== ConnectionState.CONNECTED &&
          gameController.connectionState !== ConnectionState.CONNECTING
        ) {
          await gameController.connect();
        }
      }
    } catch (err) {
      console.error("Error handling parameter update:", err);
    }
  }

  // Use $effect to register player when connection state changes to CONNECTED
  $effect(() => {
    const connectionState = gameController.connectionState;

    if (connectionState === ConnectionState.CONNECTED && connectionAttempted) {
      gameController.registerPlayer().catch((err) => {
        console.error("Registration failed:", err);
      });
    }
  });
</script>

<div class="table-container">
  <div class="table">
    {#if gameController.currentPlayer.homeTeam >= 0}
      {#each gameController.gameInfo.teams as { currentScore, scoreNeeded, coolieCount }, index}
        <Coolies
          team={index}
          homeTeam={gameController.currentPlayer.homeTeam}
          {coolieCount}
        />
        {#if gameController.gameInfo.gameStage >= 4 && !gameController.gameInfo.gameCancelled && !gameController.gameInfo.gameForfeited}
          <TeamScores
            team={index}
            homeTeam={gameController.currentPlayer.homeTeam}
            {currentScore}
            winningScore={scoreNeeded}
          />
        {/if}
      {/each}
    {/if}

    <!-- 
    {#each gameController.chairs.getAllChairs() as chair}
      {#if chair.Position !== gameController.currentPlayer.playerPosition}
        <Chair
          {chair}
          currentPlayerPosition={gameController.currentPlayer.playerPosition}
          totalChairs={maxChairs())}
        />
      {/if}
    {/each} 
-->
    <CurrentRoundCards
      currentRound={gameController.roundsInfo.currentRound}
      currentPlayerPosition={gameController.currentPlayer.playerPosition}
      maxPlayers={gameController.tableInfo.maxPlayers}
    />

    <CardsDeck cards={gameController.currentPlayer.playerCards} />
  </div>
</div>

<style>
  .table-container {
    position: absolute;
    container-type: size;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    display: grid;
    place-items: center;
  }

  .table {
    position: absolute;
    container-type: size;
    width: 100cqw;
    height: 100cqh;
    background-image: url("/images/table-background.jpg");
    background-size: cover;
    background-position: center;
    display: grid;
    place-items: center;
  }

  /* larger screens */
  @media (min-width: 1024px) and (min-height: 1024px) {
    .table {
      width: min(100cqh, 100cqw);
      height: min(100cqh, 100cqw);
      aspect-ratio: 1;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }
  }
</style>
