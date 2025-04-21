<script lang="ts">
  import Card, { type SvgCardProps } from "./Card.svelte";
  import { ASPECT_RATIO, getCardHeight_Fractional } from "./CardHeight";

  export interface CardsDeckProps {
    cards: readonly string[];
    showfullcard?: boolean;
    maxcards?: number;
  }

  let {
    cards,
    showfullcard = false,
    maxcards = 8,
  }: CardsDeckProps = $props();

  const ROTATION = 10;
  const TRANSLATION = 20;
  let height = 0;
  let deckHeight = $state(0);
  let deckWidth = $state(0);
  let cardsData: SvgCardProps[] = $state([]);

  $effect(() => {
    let percardrotation = ROTATION;
    let percardtranslation = TRANSLATION;

    let calcshowfullcard = (deckHeight <= 100 || deckWidth <= 450) || showfullcard;

    if (calcshowfullcard) {
      percardrotation = 0;
      percardtranslation = 100;
      height = deckHeight;
      if (maxcards * height > deckWidth) {
        let width = deckWidth / maxcards;
        height = width / ASPECT_RATIO;
      }
    } else {
      height = getCardHeight_Fractional(
        percardrotation * 4,
        (percardtranslation * 4) / 100,
        deckWidth / 2,
        -1 * deckHeight,
      );
    }
    // console.log("height =", height, "deckHeight =", deckHeight, "deckWidth/2 =", deckWidth/2);

    // Recalc each card's properties based on its array index.
    cardsData = cards.map(
      (card: string, index: number): SvgCardProps => ({
        card,
        index,
        height,
        showfullcard: calcshowfullcard,
        rotation: cards.length == 1 ? 0
            : percardrotation * (index - (cards.length - 1.5) / 2),
        translation: percardtranslation * (index - (cards.length - 1) / 2),
        oncardplayed
      }),
    );
  });

  function oncardplayed(index: number) {
    console.log(`Card ${cards[index]} at index ${index} played`);
  }

</script>

<div class="deck-container">
  <div class="deck" bind:clientHeight={deckHeight} bind:clientWidth={deckWidth}>
    {#each cardsData as cardData, index (cardData.card + "-" + index)}
      <Card {...cardData} />
    {/each}
  </div>
</div>

<style>
  .deck-container {
    container-type: size;
    width: 100cqw;
    height: 25cqh;
    /* height: min(100px, 17cqh); */
    /* border: 2px solid yellow; */
  }

  /* landscape on small screens */
  @media (orientation: landscape) and (height <= 768px) { 
    .deck-container {
      height: min(100px, 17cqh);
    }
  }

  .deck {
    position: relative;
    width: 100cqw;
    height: 100cqh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
