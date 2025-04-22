<!-- Chair.svelte -->
<script lang="ts">
  import { getContext } from "svelte";
  import {
    GameController,
    gameControllerContextKey,
  } from "../lib/GameController.svelte";
  import type { Chair } from "./states/Chairs.svelte";

  // Get the hub instance from the context
  const game: GameController = getContext(gameControllerContextKey);

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
  function getPositionClass(chair: Chair): string {
    const mapping = positionClasses[game.tableInfo.maxPlayers as 4 | 6 | 8];
    const relativePosn =
      (chair.Position -
        game.currentPlayer.playerPosition +
        game.tableInfo.maxPlayers) %
      game.tableInfo.maxPlayers;
    return mapping[relativePosn as keyof typeof mapping];
  }

  // Function to determine team color based on position
  function getTeamClass(chair: Chair): string {
    return chair.Position % 2 === 0 ? "team-blue" : "team-red";
  }

</script>

<div class={`chair-container  p${game.tableInfo.maxPlayers} `}>
  {#each game.chairs.getAllChairs() as chair}
    <!-- {#if chair.Position !== game.currentPlayer.playerPosition} -->
      <div class={`chair ${getPositionClass(chair)} ${getTeamClass(chair)}`}>
        {chair.Occupant?.Name ?? ""}
      </div>
    <!-- {/if} -->
  {/each}
</div>

<style>
  .chair-container {
    position: absolute;
    display: grid;
    width: 100cqw;
    height: 95cqh;
    top: 5cqh;
    left: 0cqw;
    /* background-color: rgb(22, 256, 22, 0.5); */
  }

  .chair-container.p4 {
    grid-template-areas:
      ". T ."
      "L . R"
      ". B .";
  }

  .chair-container.p6 {
    grid-template-columns: 1fr 3fr 4fr 3fr 1fr;
    grid-template-rows: 1fr 2fr 4fr 2fr 4fr 2fr 1fr;
    grid-template-areas:
      " .   .   T   .   ."
      " .   .   .   .   ."
      "L_T  .   .   .  R_T"
      " .   .   .   .   ."
      "L_B  .   .   .  R_B"
      " .   .   .   .   ."
      " .   .   B   .   .";
  }

  .chair-container.p8 {
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

  @media (width > 450px) {
    .chair-container {
      /* width: 50cqw; */
      gap: min(1cqw, 1cqh);
    }
  }

  @media (width > 780px) {
    .chair-container {
      /* width: 40cqw; */
      gap: min(2cqw, 2cqh);
    }
  }

  .chair {
    position: relative;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 1.5rem;
    background-color: rgba(0, 0, 255, 0.4);
    border: 1px solid rgba(0, 0, 255, 0.5);
    width: 2rem;
    height: 8rem;
    border-radius: 2cqw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.2rem;
  }

  .team-red {
    background-color: rgba(255, 0, 0, 0.4);
    border: 1px solid rgba(255, 0, 0, 0.5);
  }

  .B {
    grid-area: B;
    writing-mode: horizontal-tb;
    height: 2rem;
    width: auto;
    z-index: 1;
    /* bottom: 0px; */
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
    writing-mode: horizontal-tb;
    height: 2rem;
    width: auto;
    z-index: 1;
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
