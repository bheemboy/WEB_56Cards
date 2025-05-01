<script lang="ts">
  import { getContext } from "svelte";
  import { GameController, gameControllerContextKey } from "../lib/GameController.svelte";
  import type { Chair } from "./states/Chairs.svelte";
  import { GameStage } from "./states/GameInfo.svelte";

  let { chair } = $props<{ chair: Chair }>();
  const game: GameController = getContext(gameControllerContextKey);

  const lastBid: string = $derived.by(() => {
    let bid: number = 0;
    if (game.bidInfo.highBidder === chair.Position) {
      bid = game.bidInfo.highBid;
    } else if (game.gameInfo.gameStage === GameStage.Bidding) {
      bid = game.bidInfo.bidHistory.findLast((bid) => bid.Position === chair.Position)?.Bid ?? 0;
    }
    return bid > 0 ? bid.toString() : "";
	});
</script>

<div class="last-bid-box" class:high-bidder={chair.Position === game.bidInfo.highBidder}>
  <span class="last-bid">{lastBid}</span>
</div>

<style>
  .last-bid-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 23px;
    border-radius: 5px;
    overflow: hidden;
    box-sizing: border-box;
    color: rgba(250, 250, 210, 0.7);
  }

  .last-bid-box.high-bidder {
    background-color: rgba(255, 255, 255, 0.3);
    /* border: 1px solid rgba(255, 255, 0, 0.7); */
    color: rgba(250, 250, 210, 1);
  }

  .last-bid {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 3px;
    width: 100%;
    text-align: center;
  }



</style>
