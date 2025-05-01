<!-- CurrentRoundCards.svelte -->
<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
  import { cardHeightContextKey, type CardHeightContext } from "./CardHeight.svelte";
  import Card from "./Card.svelte";

  // Get the hub instance from the context
  const game: GameController = getContext(gameControllerContextKey);
  const firstPlayer = $derived(game.roundsInfo.currentRound.FirstPlayer);
  const currentPlayerPosition = $derived(game.currentPlayer.playerPosition);
  const maxPlayers = $derived(game.tableInfo.maxPlayers);
  const playedCards = $derived(game.roundsInfo.currentRound.PlayedCards);

  let deckCardHeightContext: CardHeightContext = $state(getContext(cardHeightContextKey));
  let gridCellHeight: number = $state(0);

  const positionClasses = {
    4: {
      // 4-player game positions
      0: "B",
      1: "R",
      2: "T",
      3: "L",
    },
    6: {
      // 6-player game positions
      0: "B",
      1: "R_B",
      2: "R_T",
      3: "T",
      4: "L_T",
      5: "L_B",
    },
    8: {
      // 8-player game positions
      0: "B",
      1: "R_B",
      2: "R",
      3: "R_T",
      4: "T",
      5: "L_T",
      6: "L",
      7: "L_B",
    },
  };

  // Function to determine chair position class
  function getPositionClass(index: number): string {
    const mapping = positionClasses[maxPlayers as 4 | 6 | 8];
    const relativePosn = (firstPlayer + index - currentPlayerPosition + maxPlayers) % maxPlayers;
    return mapping[relativePosn as keyof typeof mapping];
  }
</script>

<div class={`card-container p${maxPlayers}`}>
  {#each playedCards as card, index}
    <div class={`card ${getPositionClass(index)}`} bind:clientHeight={gridCellHeight}>
      <Card {card} height={Math.min(gridCellHeight, deckCardHeightContext.h) + "px"} showfullcard={true} rotation={0} translation={0} />
    </div>
  {/each}
</div>

<style>
  .card-container {
    position: absolute;
    display: grid;
    gap: min(1cqw, 1cqh);
    width: 60cqw;
    height: 50cqh;
    top: 20cqh;
    /* background-color: rgb(22, 256, 22, 0.5); */
  }

  .card-container.p4 {
    grid-template-areas:
      ". T ."
      "L . R"
      ". B .";
  }

  .card-container.p6 {
    grid-template-areas:
      " .   .   T   .   ."
      "L_T  .   T   .  R_T"
      "L_T  .   .   .  R_T"
      "L_B  .   .   .  R_B"
      "L_B  .   B   .  R_B"
      " .   .   B   .   .";
  }

  .card-container.p8 {
    grid-template-areas:
      ".   .   .   T   .   .   ."
      ".  L_T  .   T   .  R_T  ."
      ".  L_T  .   .   .  R_T  ."
      "L   .   .   .   .   .   R"
      "L   .   .   .   .   .   R"
      ".  L_B  .   .   .  R_B  ."
      ".  L_B  .   B   .  R_B  ."
      ".   .   .   B   .   .   .";
  }

  @container cards-table (orientation: landscape) and (height < 450px) {
    .card-container {
      height: 55cqh;
      top: 15cqh;
    }
  }

  @container cards-table (width > 450px) {
    .card-container {
      width: 50cqw;
    }
  }

  @container cards-table (width > 780px) {
    .card-container {
      width: 40cqw;
    }
  }

  .card {
    position: relative;
  }

  /* Position classes */
  .B {
    grid-area: B;
  }

  .R_B {
    grid-area: R_B;
  }

  .R {
    grid-area: R;
  }

  .R_T {
    grid-area: R_T;
  }

  .T {
    grid-area: T;
  }

  .L_T {
    grid-area: L_T;
  }

  .L {
    grid-area: L;
  }

  .L_B {
    grid-area: L_B;
  }
</style>
