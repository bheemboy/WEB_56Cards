<!-- CurrentRoundCards.svelte -->
<script lang="ts">
  import { type Round } from "./states/Rounds.svelte";
  import Card from "./Card.svelte";
  import { type CardProps } from "./Card.svelte";
  import { cardHeightContextKey, type CardHeightContext } from "./CardHeight.svelte";
  import { getContext } from "svelte";

  export interface CurrentRoundCardsProps {
    currentRound: Round;
    currentPlayerPosition: number;
    maxPlayers: number;
  }
  let { currentRound, currentPlayerPosition, maxPlayers }: CurrentRoundCardsProps = $props();

  let deckCardHeightContext: CardHeightContext = $state(getContext(cardHeightContextKey))

  const positionClasses = {
    4: {
      // 4-player game positions
      0: "self-bottom",
      1: "p4-opponent-right",
      2: "p4-opponent-top",
      3: "p4-opponent-left",
    },
    6: {
      // 6-player game positions
      0: "self-bottom",
      1: "p6-opponent-bottom-right",
      2: "p6-opponent-right",
      3: "p6-opponent-top",
      4: "p6-opponent-left",
      5: "p6-opponent-bottom-left",
    },
    8: {
      // 8-player game positions
      0: "self-bottom",
      1: "p8-opponent-bottom-right",
      2: "p8-opponent-right",
      3: "p8-opponent-top-right",
      4: "p8-opponent-top",
      5: "p8-opponent-top-left",
      6: "p8-opponent-left",
      7: "p8-opponent-bottom-left",
    },
  };

  // Function to determine chair position class
  function getPositionClass(index: number): string {
    const mapping = positionClasses[maxPlayers as 4 | 6 | 8];
    const relativePosn =
      (currentRound.FirstPlayer + index - currentPlayerPosition + maxPlayers) %
      maxPlayers;
    return mapping[relativePosn as keyof typeof mapping];
  }
</script>

<div class="rounds-container">
  {#each currentRound.PlayedCards as card, index}
    <div class={`card-container ${getPositionClass(index)}`}>
      <Card
        card={card}
        height={deckCardHeightContext.h + "px"}
        showfullcard={true}
        rotation={0}
        translation={0}
      />
    </div>
  {/each}
</div>

<style>
  .rounds-container {
    container-type: size;
    position: absolute;
    width: 50cqw;
    height: 50cqh;
    background-color: rgba(22, 22, 22, 0.5);
  }

  .card-container {
    position: absolute;
    justify-content: center;
    align-items: center;
  }

  /* Position classes for 4, 6, and 8 player games */
  /* 4-player positions */
  .p4-opponent-right {
    right: 5%;
    top: 45%;
    transform: translateY(-50%);
  }
  .p4-opponent-top {
    top: 5%;
    left: 50%;
    transform: translateX(-50%);
  }
  .p4-opponent-left {
    left: 5%;
    top: 45%;
    transform: translateY(-50%);
  }

  /* Additional positions for 6-player game */
  .p6-opponent-right {
    right: 8%;
    top: 20%;
    transform: translateY(-50%);
  }
  .p6-opponent-top {
    top: 2%;
    left: 50%;
    transform: translateX(-50%);
  }
  .p6-opponent-left {
    left: 8%;
    top: 20%;
    transform: translateY(-50%);
  }
  .p6-opponent-bottom-right {
    right: 2%;
    bottom: 40%;
  }
  .p6-opponent-bottom-left {
    left: 2%;
    bottom: 40%;
  }

  /* Additional positions for 8-player game */
  .p8-opponent-right {
    right: 2%;
    top: 35%;
    transform: translateY(-50%);
  }
  .p8-opponent-top {
    top: 2%;
    left: 50%;
    transform: translateX(-50%);
  }
  .p8-opponent-left {
    left: 2%;
    top: 35%;
    transform: translateY(-50%);
  }
  .p8-opponent-bottom-right {
    right: 3%;
    bottom: 35%;
  }
  .p8-opponent-bottom-left {
    left: 3%;
    bottom: 35%;
  }
  .p8-opponent-top-right {
    right: 18%;
    top: 8%;
  }
  .p8-opponent-top-left {
    left: 18%;
    top: 8%;
  }
</style>
