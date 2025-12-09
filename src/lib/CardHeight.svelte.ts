import { setContext } from "svelte";

export const ASPECT_RATIO: number = 140 / 190;

export const cardHeightContextKey = Symbol("cardHeightContext");

export interface CardHeightContext {
  h: number;
}

const deckCardHeightContext: CardHeightContext = $state({ h: 0 });

export function setDeckCardHeight(h: number) {
  deckCardHeightContext.h = h;
  setContext(cardHeightContextKey, deckCardHeightContext);
}
