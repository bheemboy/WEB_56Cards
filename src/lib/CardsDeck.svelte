<script lang="ts">
  import Card, { type SvgCardProps } from "./Card.svelte";
  import { getCardHeight_Fractional } from './CardHeight';
  
  export interface CardsDeckProps {
    cards: readonly string[];
    percardrotation?: number;
    percardtranslation?: number;
  }

  let {
    cards,
    percardrotation = 10,
    percardtranslation = 15,
  }: CardsDeckProps = $props();

  let deckHeight = $state(0);
  let deckWidth = $state(0);

  let height = $derived(getCardHeight_Fractional(
    percardrotation * 4,
    percardtranslation * 4 / 100,
    deckWidth / 2,
    -1 * deckHeight));

  // The array of card data to use in the markup
  let cardsData: SvgCardProps[] = $state([]);

  // Recalc each card's properties based on its array index.
  $effect(() => {
    // console.log("height", height, "deckHeight", deckHeight, "deckWidth/2", deckWidth/2);
    cardsData = cards.map(
      (card: string, index: number): SvgCardProps => ({
        card,
        index,
        height,
        rotation: percardrotation * (index - (cards.length - 1) / 2),
        translation: percardtranslation * (index - (cards.length - 1) / 2),
        oncardplayed: () => {
          console.log(
            `try to play card at index ${index}, remaining cards ${cards}`,
          );
        },
      }),
    );
  });


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
    width: 100cqh;
    height: 25cqh;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    /* border: 2px solid yellow; */
  }

  .deck {
    position: relative;
    width: 100cqw;
    height: 100cqh;
    display: flex;
    justify-content: center;
    align-items: center;
    /* border: 2px solid black; */
  }
</style>
