<!-- Table.svelte -->
<script lang="ts">
  import { getContext } from "svelte";
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

  // Create an effect that watches URL changes
  $effect(() => {
    // Get current URL params
    const url = new URL(window.location.href);
    const rawParams = new URLSearchParams(url.search);
    const params = Object.fromEntries(
      Array.from(rawParams.entries()).map(([key, value]) => [
        key.toLowerCase(),
        value
      ]),
    );

    // Update loginParams and handle connection
    handleParamsUpdate(params);
  });

  async function handleParamsUpdate(params: Record<string, string>) {
    try {
      // Update loginParams with type conversion for tableType
      await gameController.updateLoginParams({
        userName: params.username ?? gameController.loginParams.userName,
        tableType: params.tabletype ?? gameController.loginParams.tableType,
        tableName: params.tablename ?? gameController.loginParams.tableName,
        language: params.lang ?? gameController.loginParams.language,
        watch: params.watch === "true",
      });

      // Mark connection as attempted
      connectionAttempted = true;

      // Disconnect if already connected to force a new connection with new parameters
      if (gameController.connectionState === ConnectionState.CONNECTED) {
        await gameController.disconnect();
      }

      // Only attempt to connect if needed
      if (
        gameController.connectionState !== ConnectionState.CONNECTED &&
        gameController.connectionState !== ConnectionState.CONNECTING
      ) {
        await gameController.connect();
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
