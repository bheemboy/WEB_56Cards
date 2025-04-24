<script lang="ts">
  import Card from "./Card.svelte";
  import { type CardProps } from "./Card.svelte";
  import {
    ASPECT_RATIO,
    setDeckCardHeight,
    getCardHeight_Fractional,
  } from "./CardHeight.svelte";

  export interface CardsDeckProps {
    cards: readonly string[];
    showfullcard?: boolean;
    maxcards?: number;
  }

  let { cards, showfullcard = false, maxcards = 8 }: CardsDeckProps = $props();

  const ROTATION = 10;
  const TRANSLATION = 20;

  let deckCardHeight = 0;
  let deckHeight = $state(0);
  let deckWidth = $state(0);
  let cardsData: CardProps[] = $state([]);

  $effect(() => {
    let percardrotation = ROTATION;
    let percardtranslation = TRANSLATION;

    let calcshowfullcard = deckHeight <= 100 || showfullcard;

    if (calcshowfullcard) {
      percardrotation = 0;
      percardtranslation = 100;
      deckCardHeight = deckHeight;
      if (maxcards * deckCardHeight > deckWidth) {
        let width = deckWidth / maxcards;
        deckCardHeight = width / ASPECT_RATIO;
      }
    } else {
      deckCardHeight = getCardHeight_Fractional(
        percardrotation * 3.5,
        (percardtranslation * 3.5) / 100,
        deckWidth / 2,
        -1 * deckHeight,
      );
    }

    // console.log("height =", deckCardHeight, "deckHeight =", deckHeight, "deckWidth/2 =", deckWidth/2);
    setDeckCardHeight(deckCardHeight);

    // Recalc each card's properties based on its array index.
    cardsData = cards.map(
      (card: string, index: number): CardProps => ({
        card,
        index,
        height: deckCardHeight + "px",
        showfullcard: calcshowfullcard,
        rotation:
          cards.length == 1
            ? 0
            : percardrotation * (index - (cards.length - 1) / 2),
        translation: percardtranslation * (index - (cards.length - 1) / 2),
        oncardplayed,
      }),
    );
  });

  function oncardplayed(index: number) {
    console.log(`Card ${cards[index]} at index ${index} played`);
  }
</script>

<div class="deck-container" bind:clientHeight={deckHeight} bind:clientWidth={deckWidth}>
  {#each cardsData as cardData, index (cardData.card + "-" + index)}
    <Card {...cardData} />
  {/each}
</div>

<style>
  .deck-container {
    position: absolute;
    bottom: 26px;
    display: grid;
    place-items: center;
    width: 100cqw;
    height: 20cqh;
    /* background-color: rgba(22, 256, 22, 0.5); */
  }
  @container cards-table (orientation: landscape) and (height < 450px) {
    .deck-container {
      height: 13cqh;
    }
  }
</style>
