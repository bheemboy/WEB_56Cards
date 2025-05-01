<!-- Chair.svelte -->
<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
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
    const relativePosn = (chair.Position - game.currentPlayer.playerPosition + game.tableInfo.maxPlayers) % game.tableInfo.maxPlayers;
    return mapping[relativePosn as keyof typeof mapping];
  }

  // Function to determine team color based on position
  function getTeamClass(chair: Chair): string {
    return chair.Position % 2 === 0 ? "team-blue" : "team-red";
  }

  function getChairClasses(chair: Chair): string {
    return `T${game.tableInfo.maxPlayers} ${getPositionClasses(chair)} ${getTeamClass(chair)}`;
  }
</script>

{#each game.chairs.getAllChairs() as chair}
  <div class={`chair-box ${getChairClasses(chair)}`}>
    <div class="dealer"></div>
    <div class={`player-name-box ${getChairClasses(chair)}`}>
      <span class={`player-name ${getChairClasses(chair)}`}>{chair.Occupant?.Name ?? ""}</span>
    </div>
  </div>
{/each}

<style>
  .chair-box {
    position: absolute;
    display: grid;
    gap: min(1cqw, 1cqh);
    place-items: center;
    z-index: 1;
  }

  .chair-box.top {
    top: 0cqh;
    grid-template-areas:
      "N"
      "D";
  }

  .chair-box.right {
    top: 42cqh;
    right: 0cqw;
    grid-template-areas:
      "D N";
  }

  .chair-box.right.bottom {
    top: 62cqh;
  }

  .chair-box.right.top {
    top: 22cqh;
  }

  .chair-box.left {
    top: 42cqh;
    left: 0cqw;
    grid-template-areas:
      "N D";
  }

  .chair-box.left.bottom {
    top: 62cqh;
  }

  .chair-box.left.top {
    top: 22cqh;
  }

  .chair-box.bottom:not(.left):not(.right) {
    bottom: 0cqh;
    grid-template-areas:
      "D"
      "N";
  }

  @container cards-table (width < 450px) {
    .chair-box.vertical.left {
      transform-origin: left bottom ;
      transform: translateY(-5cqh) rotate(90deg);
      grid-template-areas:
        "D N";
    }

    .chair-box.vertical.right {
      transform-origin: right bottom ;
      transform: translateY(-5cqh) rotate(-90deg);
      grid-template-areas:
        "N D";
    }

    .chair-box.top {
      top: min(50px, min(13cqw, 13cqh));
    }
  }

  .player-name-box {
    position: relative;
    grid-area: N;
    display: flex;
    align-items: center;
    justify-content: center;
    width: max(80px, 10cqw);
    height: 25px;
    border-radius: 10px;
    overflow: hidden;
    box-sizing: border-box;
    background-color: rgba(0, 0, 255, 0.3);
    border: 1px solid rgba(0, 0, 255, 0.5);
  }

  .player-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 8px;
  }

  .dealer {
    position: relative;
    grid-area: D;
    width: 1rem;
    aspect-ratio: 1;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    background-image: url("/images/star.svg");
  }
</style>
