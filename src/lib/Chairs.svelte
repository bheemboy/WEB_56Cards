<!-- Chair.svelte -->
<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
  import type { Chair } from "./states/Chairs.svelte";
  import LastBid from "./LastBid.svelte";

  // Get the hub instance from the context
  const game: GameController = getContext(gameControllerContextKey);

  const positionClassMap = new Map([
    ["4-0", "bottom"],
    ["4-1", "right vertical"],
    ["4-2", "top"],
    ["4-3", "left vertical"],
    ["6-0", "bottom"],
    ["6-1", "right bottom vertical"],
    ["6-2", "right top vertical"],
    ["6-3", "top"],
    ["6-4", "left top vertical"],
    ["6-5", "left bottom vertical"],
    ["8-0", "bottom"],
    ["8-1", "right bottom vertical"],
    ["8-2", "right vertical"],
    ["8-3", "right top vertical"],
    ["8-4", "top"],
    ["8-5", "left top vertical"],
    ["8-6", "left vertical"],
    ["8-7", "left bottom vertical"],
  ]);

  const chairs = $derived(game.chairs.getAllChairs());
  
  // Determine relative position
  function getRelativePosition(chairPosition: number): number {
    const { maxPlayers } = game.tableInfo;
    return (chairPosition - game.currentPlayer.playerPosition + maxPlayers) % maxPlayers;
  }

  // Determine chair position class
  function getPositionClasses(chair: Chair): string {
    const { maxPlayers } = game.tableInfo;
    const relativePos = getRelativePosition(chair.Position);
    return positionClassMap.get(`${maxPlayers}-${relativePos}`) || "";
  }

  // Determine team color based on position
  function getTeamClass(chair: Chair): string {
    return chair.Position % 2 === 0 ? "team-blue" : "team-red";
  }

  function getChairClasses(chair: Chair): string {
    return `T${game.tableInfo.maxPlayers} ${getPositionClasses(chair)} ${getTeamClass(chair)}`;
  }
</script>

{#each chairs as chair (chair.Position)}
  <div class={`chair-box ${getChairClasses(chair)}`}>
    {#if chair.Position === game.gameInfo.dealerPos}
      <div class="dealer"></div>
    {/if}
    <div class="last-bid"><LastBid {chair}/></div>
    <div class={`player-name-box ${getChairClasses(chair)}`}>
      <span class="player-name">{chair.Occupant?.Name || ""}</span>
    </div>
  </div>
{/each}

<style>
  .chair-box {
    position: absolute;
    display: grid;
    place-items: center;
    z-index: 1;
  }

  .chair-box.top {
    top: 0cqh;
    grid-template-areas:
      "N N"
      "D B";
  }

  .chair-box.bottom {
    bottom: 0cqh;
    grid-template-areas:
      "D N B";
  }

  .chair-box.right {
    right: 0cqw;
    grid-template-areas:
      "D N"
      "B N";
  }

  .chair-box.left {
    left: 0cqw;
    grid-template-areas:
      "N D"
      "N B";
  }

  /* Position adjustments */
  .chair-box.right, .chair-box.left {
    top: 42cqh;
  }

  .chair-box.right.bottom, .chair-box.left.bottom {
    top: 62cqh;
    bottom: auto; /* override value set in .chair-box.bottom */
  }

  .chair-box.right.top, .chair-box.left.top {
    top: 22cqh;
  }


  @container cards-table (width < 450px) {
    .chair-box.vertical.left {
      transform-origin: left bottom ;
      transform: translateY(-5cqh) rotate(90deg);
      grid-template-areas:
        "D N B";
    }

    .chair-box.vertical.right {
      transform-origin: right bottom ;
      transform: translateY(-5cqh) rotate(-90deg);
      grid-template-areas:
        "B N D";
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
    width: clamp(80px, 10cqw, 150px);
    height: 25px;
    border-radius: 10px;
    overflow: hidden;
    box-sizing: border-box;
    background-color: rgba(0, 0, 255, 0.3);
    border: 1px solid rgba(0, 0, 255, 0.5);
  }

  .player-name-box.team-red {
    background-color: rgba(255, 0, 0, 0.3);
    border: 1px solid rgba(255, 0, 0, 0.5);
  }

  .player-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 8px;
    width: 100%;
    text-align: center;
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

  .last-bid {
    grid-area: B;
  }
</style>
