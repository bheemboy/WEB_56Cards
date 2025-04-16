<!-- Table.svelte -->
<script lang="ts">
  import { onMount, getContext } from "svelte";
  import { loginParams } from "../lib/LoginParams.svelte";
  import { type Cards56Hub, ConnectionState, cards56HubContextKey } from "../lib/Cards56Hub.svelte";
  import CardsDeck from "../lib/CardsDeck.svelte";
  import Coolies from "../lib/Coolies.svelte";

  // Get the hub instance from the context
  const hub: Cards56Hub = getContext(cards56HubContextKey);

  onMount(() => {
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
    loginParams.userName = params.username ?? loginParams.userName;
    loginParams.tableType = params.tabletype ?? loginParams.tableType;
    loginParams.tableName = params.tablename ?? loginParams.tableName;
    loginParams.language = params.lang ?? loginParams.language;
    loginParams.watch = params.watch === "true" ? true : loginParams.watch;
  });

  // Use effect to handle player registration when connection state changes
  // the $effect() block runs once initially after the component is set up
  // And then everytime the hub.connectionState changes
  $effect(() => {
    if (hub.connectionState === ConnectionState.CONNECTED) {
      hub.registerPlayer().catch(() => {
        // Errors are now handled by the hub itself with alerts
      });
    }

    $inspect("hub.currentPlayer.team", hub.currentPlayer.team);
    $inspect("hub.gameInfo.coolieCount", hub.gameInfo.coolieCount);
  });


  </script>

<div class="table-container">
  {#if hub.currentPlayer.team >= 0}
  <Coolies team={hub.currentPlayer.team} coolie_count={hub.gameInfo.coolieCount[hub.currentPlayer.team]} myteam={true} />
  <Coolies team={1 - hub.currentPlayer.team} coolie_count={hub.gameInfo.coolieCount[1- hub.currentPlayer.team]} myteam={false} />
  {/if}

  <CardsDeck bind:cards={hub.currentPlayer.playerCards} />
</div>

<style>
  .table-container {
    width: 99vh;
    height: 99vh;
    max-width: 99vw;
    aspect-ratio: 1;
    background-image: url('/images/table-background.jpg');
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
