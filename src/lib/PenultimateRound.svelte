<!-- CurrentRoundCards.svelte -->
<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "./GameController.svelte";
  import { cardHeightContextKey, type CardHeightContext } from "./CardHeight.svelte";
  import Card from "./Card.svelte";

  // Get the hub instance from the context
  const game: GameController = getContext(gameControllerContextKey);
  const maxPlayers = $derived(game.tableInfo.maxPlayers);
  const penultimateRoundCards = $derived(game.roundsInfo.penultimateRound?.PlayedCards ?? []);

  let deckCardHeightContext: CardHeightContext = $state(getContext(cardHeightContextKey));

</script>

<div class={`card-container p${maxPlayers}`}>
  {#each penultimateRoundCards as card, index}
    <Card {card} height={deckCardHeightContext.h + "px"} showfullcard={false} rotation={0} translation={33*index} />
  {/each}
</div>

<style>
  .card-container {
    position: absolute;
    top: 20px;
    right: 50px;
    height: 100px;
    width: 100px;
    background-color: rgba(22, 256, 22, 0.5);
    z-index: 100;
  }

</style>
