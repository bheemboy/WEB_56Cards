<!-- Table.svelte -->
<script lang="ts">
  import { onMount, getContext } from "svelte";
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

  onMount(async () => {
    // Parse URL parameters
    const rawParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(
      Array.from(rawParams.entries()).map(([key, value]) => [
        key.toLowerCase(),
        // Convert lang and watch parameter values to lowercase
        key.toLowerCase() === "lang" || key.toLowerCase() === "watch"
          ? value.toLowerCase()
          : value,
      ]),
    );

    // Update loginParams
    // This will disconnect if parameters have changed
    await gameController.updateLoginParams({
      userName: params.username ?? gameController.loginParams.userName,
      tableType: params.tabletype ?? gameController.loginParams.tableType,
      tableName: params.tablename ?? gameController.loginParams.tableName,
      language: params.lang ?? gameController.loginParams.language,
      watch: params.watch === "true" ? true : gameController.loginParams.watch,
    });

    // Mark connection as attempted even if we don't actually connect here
    connectionAttempted = true;

    // Only attempt to connect if needed
    if (
      gameController.connectionState !== ConnectionState.CONNECTED &&
      gameController.connectionState !== ConnectionState.CONNECTING
    ) {
      try {
        await gameController.connect();
      } catch (err) {
        console.error("Error connecting:", err);
      }
    }
  });

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

  // Calculate total number of chairs using $derived
  const totalChairs = $derived(
    gameController.chairs?.getAllChairs().length ?? 8,
  );
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
        {totalChairs}
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
