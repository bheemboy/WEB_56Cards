<!-- Table.svelte -->
<script lang="ts">
  import { onMount, getContext } from "svelte";
  import { loginParams } from "../lib/LoginParams.svelte";
  import {
    type Cards56Hub,
    ConnectionState,
    cards56HubContextKey,
  } from "../lib/Cards56Hub.svelte";
  import Avatar from "../lib/Avatar.svelte";
  import CardsDeck from "../lib/CardsDeck.svelte";

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
  });
</script>

<div class="table-container">
  <CardsDeck bind:cards={hub.currentPlayer.playerCards} />
</div>

<style>
  .table-container {
    width: 100%;
    height: 100vh;
    /* border: 1px solid rgba(255, 255, 255, 0.2); */
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    /* padding-bottom: 8vh; */
    overflow: hidden;
  }
</style>
