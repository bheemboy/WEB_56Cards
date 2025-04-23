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

{#each game.chairs.getAllChairs() as chair}
  <div class={`playername ${getPositionClass(chair)} ${getTeamClass(chair)} T${game.tableInfo.maxPlayers}`}>
    {chair.Occupant?.Name ?? ""}
  </div>
{/each}

<style>
  .playername {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: larger;
    background-color: rgba(0, 0, 255, 0.3);
    border: 3px solid rgba(0, 0, 255, 0.5);
    width: 2rem;
    height: max(100px, 12cqh);
    border-radius: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .team-red {
    background-color: rgba(255, 0, 0, 0.4);
    border: 3px solid rgba(255, 0, 0, 0.5);
  }

  .B {
    visibility: hidden;
  }

  .R_B {
    right: 0cqw;
    top: 57cqh;
  }

  .R {
    right: 0cqw;
    top: 37cqh;
  }

  .R_T {
    right: 0cqw;
    top: 17cqh;
  }

  .T {
    grid-area: T;
    writing-mode: horizontal-tb;
    width: 8rem;
    height: 2rem;
    z-index: 1;
    top: min(50px, min(13cqw, 13cqh));
  }

  .L_T {
    left: 0cqw;
    top: 17cqh;
  }

  .L {
    left: 0cqw;
    top: 37cqh;
  }

  .L_B {
    left: 0cqw;
    top: 57cqh;
  }

  @container cards-table (orientation: landscape) and (height < 450px) {
    .T {
      top: 0cqh;
    }

    .R_B.T8 {
      right: 6cqw;
    }

    .R_T.T8 {
      right: 6cqw;
    }

    .L_T.T8 {
      left: 6cqw;
    }

    .L_B.T8 {
      left: 6cqw;
    }
  }

  @container cards-table (height > 450px) {
    .B {
      visibility: visible;
      writing-mode: horizontal-tb;
      width: 8rem;
      height: 2rem;
      z-index: 1;
      bottom: 0cqh;
    }
  }
</style>
