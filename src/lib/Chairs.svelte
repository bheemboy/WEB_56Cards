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
      0: "bottom",
      1: "right vertical",
      2: "top",
      3: "left vertical",
    },
    6: {
      // 6-player game positions
      0: "bottom",
      1: "right bottom vertical",
      2: "right top vertical",
      3: "top",
      4: "left top vertical",
      5: "left bottom vertical",
    },
    8: {
      // 8-player game positions
      0: "bottom",
      1: "right bottom vertical",
      2: "right vertical",
      3: "right top vertical",
      4: "top",
      5: "left top vertical",
      6: "left vertical",
      7: "left bottom vertical",
    },
  };

  // Function to determine chair position class
  function getPositionClasses(chair: Chair): string {
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
  <div
    class={`player-box ${getPositionClasses(chair)} ${getTeamClass(chair)} T${game.tableInfo.maxPlayers}`}
  >
    <span class="player-name">{chair.Occupant?.Name ?? ""}</span>
  </div>
{/each}

<style>
  .player-box {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 255, 0.3);
    border: 1px solid rgba(0, 0, 255, 0.5);
    border-radius: 10px;
    overflow: hidden;
    box-sizing: border-box;
    height: 40px;
    width: max(130px, 12cqw);
    z-index: 1;
  }

  .team-red {
    background-color: rgba(255, 0, 0, 0.4);
    border: 1px solid rgba(255, 0, 0, 0.5);
  }

  .vertical {
    height: max(130px, 12cqw);
    width: 40px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
  }

  .right.bottom {
    top: 60cqh;
  }

  .right {
    right: 0cqw;
    top: 38cqh;
  }

  .right.top {
    top: 16cqh;
  }

  .top {
    top: min(50px, min(13cqw, 13cqh));
  }

  .left.top {
    top: 16cqh;
  }

  .left {
    left: 0cqw;
    top: 38cqh;
  }

  .left.bottom {
    top: 60cqh;
  }

  .player-box.bottom:not(.left):not(.right) {
    bottom: 0cqh;
    height: 25px;
    width: max(130px, 12cqw);
  }

  @container cards-table (orientation: landscape) and (height < 450px) {
    .vertical.T8 {
      height: max(100px, 12cqw);
    }

    .top {
      top: 0cqh;
    }

    .right.bottom.T8 {
      right: 6cqw;
    }

    .right.top.T8 {
      right: 6cqw;
    }

    .left.top.T8 {
      left: 6cqw;
    }

    .left.bottom.T8 {
      left: 6cqw;
    }
  }

  .player-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 8px;
    max-width: 100%;
    max-height: 100%;
  }
</style>
