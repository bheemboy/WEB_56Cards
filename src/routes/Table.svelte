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

  // Get the hub instance from the context
  const gameController: GameController = getContext(gameControllerContextKey);
  let connectionAttempted = $state(false);
  let initializing = $state(true);

  // Add debug logging
  $effect(() => {
    console.log('Debug state:', {
      homeTeam: gameController.currentPlayer.homeTeam,
      playerPosition: gameController.currentPlayer.playerPosition,
      connectionState: gameController.connectionState,
      chairs: gameController.chairs.getAllChairs(),
      cards: gameController.currentPlayer.playerCards,
      loginParams: gameController.loginParams,
      initializing
    });
  });

  // Initialize connection when component mounts
  onMount(async () => {
    // Get current URL params right away
    const url = new URL(window.location.href);
    const rawParams = new URLSearchParams(url.search);
    const params = Object.fromEntries(
      Array.from(rawParams.entries()).map(([key, value]) => [
        key.toLowerCase(),
        value
      ]),
    );

    console.log('Initial URL Parameters:', params);
    
    try {
      // First update login params
      await handleParamsUpdate(params);
      
      // Then ensure we're connected
      if (gameController.connectionState !== ConnectionState.CONNECTED &&
          gameController.connectionState !== ConnectionState.CONNECTING) {
        console.log('Establishing initial connection...');
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
        value
      ]),
    );

    console.log('URL Parameters changed:', params);
    handleParamsUpdate(params);
  });

  async function handleParamsUpdate(params: Record<string, string>) {
    try {
      console.log('Updating params:', params); // Add logging to debug
      
      // Update login params and check if anything changed
      const [, paramsChanged] = await gameController.updateLoginParams({
        userName: params.username ?? gameController.loginParams.userName,
        tableType: params.tabletype ?? gameController.loginParams.tableType,
        tableName: params.tablename ?? gameController.loginParams.tableName,
        language: params.language ?? gameController.loginParams.language,
        // Parse watch as number and convert to boolean
        watch: params.watch === "1"
      });

      // Mark connection as attempted
      connectionAttempted = true;

      // Force reconnection if any parameter changed
      if (paramsChanged) {
        console.log('Parameters changed, forcing reconnection'); // Add logging

        // Disconnect if already connected
        if (gameController.connectionState === ConnectionState.CONNECTED) {
          await gameController.disconnect();
          // Add a small delay to ensure disconnect completes
          await new Promise(resolve => setTimeout(resolve, 100));
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
      console.log("Connection established, now registering player...");
      gameController.registerPlayer().catch((err) => {
        console.error("Registration failed:", err);
      });
    } else if (connectionState === ConnectionState.DISCONNECTING) {
      console.log("Connection is closing, will register when reconnected...");
    } else if (connectionState === ConnectionState.CONNECTING) {
      console.log("Connection is being established...");
    }
  });

  // Calculate total number of chairs based on tableType
  const chairCount = $derived(() => {
    const tableTypeMap = { "0": 4, "1": 6, "2": 8 };
    return tableTypeMap[gameController.loginParams.tableType as keyof typeof tableTypeMap] || 4;
  });
</script>

<div class="table-container">
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

  {#each gameController.chairs.getAllChairs() as chair}
    {#if chair.Position !== gameController.currentPlayer.playerPosition}
      <Chair
        {chair}
        currentPlayerPosition={gameController.currentPlayer.playerPosition}
        totalChairs={chairCount()}
      />
    {/if}
  {/each}

  <CardsDeck cards={gameController.currentPlayer.playerCards} />
</div>

<style>
  .table-container {
    width: 99vh;
    height: 99vh;
    max-width: 99vw;
    aspect-ratio: 1;
    background-image: url("/images/table-background.jpg");
    background-size: cover;
    background-position: center;
    border: solid 2px brown;
    border-radius: 8px;
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
    margin: 0 auto;
  }
</style>
