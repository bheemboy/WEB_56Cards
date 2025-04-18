import { cards56HubContextKey, ConnectionState } from "./GameControllerTypes";
import { GameController, gameControllerInstance } from "./GameController.svelte";

export { ConnectionState, cards56HubContextKey };

// Re-export the game controller as Cards56Hub for backward compatibility
export type Cards56Hub = GameController;
export const Cards56Hub = GameController;

// Export the singleton instance
export const cards56HubInstance: Cards56Hub = gameControllerInstance;