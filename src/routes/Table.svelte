<!-- Table.svelte -->
<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
  import { ConnectionState } from "../lib/HubConnection.svelte";
  import CurrentPlayerCards from "../lib/CurrentPlayerCards.svelte";
  import Coolies from "../lib/Coolies.svelte";
  import Chairs from "../lib/Chairs.svelte";
  import CurrentRoundCards from "../lib/CurrentRoundCards.svelte";
  import ActionButtons from "../lib/ActionButtons.svelte";
  import TrumpCard from "../lib/TrumpCard.svelte";
  import BidPanel from "../lib/BidPanel.svelte";

  // Get the hub instance from the context
  const gameController: GameController = getContext(gameControllerContextKey);

  onMount(() => {
    // Process URL params when the component mounts
    const url = new URL(window.location.href);
    const rawParams = new URLSearchParams(url.search);
    const params = Object.fromEntries(
      Array.from(rawParams.entries()).map(([key, value]) => {
        const lowerKey = key.toLowerCase();
        // Special handling for 'watch' parameter
        if (lowerKey === 'watch') {
          if (value === '1' || value.toLowerCase() === 'true') return [lowerKey, true];
          if (value === '0' || value.toLowerCase() === 'false') return [lowerKey, false];
        }
        return [lowerKey, value];
      })
    );
    gameController.updateLoginParams(params);
  });

  // Create an effect that watches URL changes
  $effect(() => {
    try {
      const connectionState = gameController.connectionState;
      // Then ensure we're connected
      if (connectionState !== ConnectionState.CONNECTED && connectionState !== ConnectionState.CONNECTING) {
        gameController.connect();
      } else if (connectionState === ConnectionState.CONNECTED) {
        gameController.registerPlayer().catch((err) => {
          console.error("Registration failed:", err);
        });
      }
    } catch (err) {
      console.error("Error during initialization:", err);
    }
  });

</script>

<div class="table-container">
  <div class="table">
    <Coolies />

    <ActionButtons />

    <Chairs />

    <CurrentRoundCards />

    <CurrentPlayerCards />

    <TrumpCard />

    <BidPanel/>
    
  </div>
</div>

<style>
  .table-container {
    position: absolute;
    container-type: size;
    container-name: cards-table-container;
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
    container-name: cards-table;
    width: 100cqw;
    height: 100cqh;
    background-image: url("/images/table-background.jpg");
    background-size: cover;
    background-position: center;
    display: grid;
    place-items: center;
  }

  /* larger screens */
  @container cards-table-container (width > 800px) and (height > 800px) {
    .table {
      width: min(100cqh, 100cqw);
      height: min(100cqh, 100cqw);
      aspect-ratio: 1;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }
  }
</style>
