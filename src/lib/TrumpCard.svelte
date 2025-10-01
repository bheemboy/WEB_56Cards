<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
  import { GameStage } from "./states/GameInfo.svelte";
  import { cardHeightContextKey, type CardHeightContext } from "./CardHeight.svelte";
  import Card from "./Card.svelte";
  import { ASPECT_RATIO } from "./CardHeight.svelte";

  const game: GameController = getContext(gameControllerContextKey);
  const card = $derived(game.gameInfo.trumpExposed ? game.gameInfo.trumpCard : "closed");

  const deckCardHeightContext: CardHeightContext = $state(getContext(cardHeightContextKey));

  let windowHeight = $state(0);
  let windowWidth = $state(0);
  const height: string = $derived(`${Math.min(deckCardHeightContext.h, Math.max(0.12 * windowHeight, 0.12 * windowWidth))}px`);

  function oncardclicked(index: number) {
    game.showTrump(2000);
  }
</script>

<svelte:window bind:innerHeight={windowHeight} bind:innerWidth={windowWidth} />

{#if game.gameInfo.gameStage === GameStage.PlayingCards && !game.bidInfo.isThani}
  <div class="trumpcard-container" style:height style:aspect-ratio={ASPECT_RATIO}>
    <Card {card} {height} {oncardclicked} showfullcard={true} rotation={0} translation={0} />
  </div>
{/if}

<style>
  .trumpcard-container {
    position: absolute;
    top: calc(max(4cqh, 4cqw) + 8px);
    right: 4px;
    /* background-color: rgba(22, 256, 22, 0.5); */
  }
  @container cards-table (height < 550px) {
    .trumpcard-container {
      top: 5px;
      left: 75cqw;
    }
  }
</style>
