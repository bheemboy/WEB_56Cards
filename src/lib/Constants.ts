export const SUITS = Object.freeze(new Map([['C', 0], ['D', 1], ['H', 2], ['S', 3]]));
export const RANKS = Object.freeze(new Map([
  ['0', 0], ['A', 1], ['2', 2], ['3', 3], ['4', 4],
  ['5', 5], ['6', 6], ['7', 7], ['8', 8], ['9', 9],
  ['10', 10], ['J', 11], ['Q', 12], ['K', 13]
]));
export const CARDHEIGHT = 94;
export const CARDWIDTH = 69;
export const ASPECTRATIO = CARDWIDTH / CARDHEIGHT; 
export const BACKGROUNDHEIGHT = 966;
export const BACKGROUNDWIDTH = 376;
export const ConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting", 
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed"
};
