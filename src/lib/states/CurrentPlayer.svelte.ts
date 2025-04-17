/**
 * Represents player information within a card game
 * Optimized for use in Svelte components with minimal reactive updates
 */

// Define interfaces for better type safety
interface GameState {
  PlayerID?: string;
  PlayerPosition?: number;
  PlayerCards?: string[];
  WatchOnly?: boolean;
  TableInfo?: TableInfo;
}

interface TableInfo {
  Chairs?: Chair[];
}

interface Chair {
  Position: number;
  Occupant?: PlayerInfo;
  Watchers?: PlayerInfo[];
}

interface PlayerInfo {
  PlayerID: string;
  Name?: string;
  Lang?: string;
}

export class CurrentPlayer {
  // Private fields
  private readonly _playerID: string;
  private readonly _name: string;
  private readonly _lang: string;
  private readonly _watchOnly: boolean;
  private readonly _playerPosition: number;
  private readonly _playerCards: readonly string[];

  /**
   * Create a new CurrentPlayer instance
   * @param playerID - Player's unique identifier
   * @param name - Player's display name
   * @param lang - Player's preferred language
   * @param watchOnly - Whether player is only watching
   * @param playerPosition - Player's position at table
   * @param playerCards - Cards in player's hand
   */
  constructor({
    playerID = '',
    name = '',
    lang = '',
    watchOnly = false,
    playerPosition = -1,
    playerCards = [],
  }: {
    playerID?: string;
    name?: string;
    lang?: string;
    watchOnly?: boolean;
    playerPosition?: number;
    playerCards?: string[];
  } = {}) {
    this._playerID = playerID;
    this._name = name;
    this._lang = lang;
    this._watchOnly = watchOnly;
    this._playerPosition = playerPosition;
    this._playerCards = [...playerCards];
  }

  // Read-only getters
  public get playerID(): string { return this._playerID; }
  public get name(): string { return this._name; }
  public get lang(): string { return this._lang; }
  public get watchOnly(): boolean { return this._watchOnly; }
  public get playerPosition(): number { return this._playerPosition; }
  public get playerCards(): string[] { return [...this._playerCards]; }
  
  // Derived properties
  public get homeTeam(): number { return this._playerPosition >= 0 ? this._playerPosition % 2 : -1; }
  public get opposingTeam(): number { return this._playerPosition >= 0 ? 1 - this._playerPosition % 2 : -1; }
  
  /**
   * Updates player data from a game state
   * Returns a tuple with [updatedPlayer, wasUpdated]
   * 
   * @param player - Current player instance or undefined
   * @param gameState - Current game state data
   */
  public static update(player: CurrentPlayer | undefined, gameState: GameState): [CurrentPlayer, boolean] {
    if (!gameState) {
      return [player ?? new CurrentPlayer(), false];
    }

    // Extract base player data
    const playerID = gameState.PlayerID ?? '';
    const playerPosition = gameState.PlayerPosition ?? -1;
    const playerCards = gameState.PlayerCards ? [...gameState.PlayerCards] : [];
    const watchOnly = gameState.WatchOnly ?? false;

    // Find player info in table data
    let name = '';
    let lang = '';

    if (gameState.TableInfo?.Chairs && playerPosition !== -1) {
      const chair = gameState.TableInfo.Chairs.find(
        chair => chair.Position === playerPosition
      );
      
      if (chair) {
        const playerInfo = watchOnly
          ? chair.Watchers?.find(watcher => watcher.PlayerID === playerID)
          : chair.Occupant;
          
        if (playerInfo) {
          name = playerInfo.Name ?? '';
          lang = playerInfo.Lang ?? '';
        }
      }
    }

    // Create new player instance
    const newPlayer = new CurrentPlayer({
      playerID,
      name,
      lang,
      watchOnly,
      playerPosition,
      playerCards
    });

    // Check if anything changed
    const hasChanged = 
      !player ||
      player.playerID !== newPlayer.playerID ||
      player.name !== newPlayer.name ||
      player.lang !== newPlayer.lang ||
      player.watchOnly !== newPlayer.watchOnly ||
      player.playerPosition !== newPlayer.playerPosition ||
      !areArraysEqual(player.playerCards, newPlayer.playerCards);

    return [hasChanged ? newPlayer : player, hasChanged];
  }

  /**
   * Creates a plain object representation of the CurrentPlayer
   */
  public toJSON() {
    return {
      playerID: this._playerID,
      name: this._name,
      lang: this._lang,
      watchOnly: this._watchOnly,
      playerPosition: this._playerPosition,
      playerCards: [...this._playerCards]
    };
  }
}

/**
 * Helper function to compare arrays without serializing
 */
function areArraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}