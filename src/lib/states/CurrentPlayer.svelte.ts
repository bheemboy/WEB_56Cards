/**
 * Represents player information within a card game
 * Optimized for use in Svelte components with minimal reactive updates
 */

// Define interfaces for better type safety
export interface PlayerInfo {
  PlayerID: string;
  Name?: string;
  Lang?: string;
  WatchOnly?: boolean;
}

export interface Chair {
  Position: number;
  Occupant?: PlayerInfo;
  Watchers?: PlayerInfo[];
}

export interface TableInfo {
  Chairs?: Chair[];
}

export interface GameState {
  PlayerID?: string;
  PlayerPosition?: number;
  PlayerCards?: string[];
  WatchOnly?: boolean;
  TableInfo?: TableInfo;
}

export interface CurrentPlayerProps {
  playerID: string;
  name: string;
  lang: string;
  watchOnly: boolean;
  playerPosition: number;
  playerCards: string[];
}

export class CurrentPlayer {
  // Private readonly fields
  private readonly _playerID: string;
  private readonly _name: string;
  private readonly _lang: string;
  private readonly _watchOnly: boolean;
  private readonly _playerPosition: number;
  private readonly _playerCards: ReadonlyArray<string>;

  /**
   * Private constructor - use factory methods to create instances
   */
  private constructor({
    playerID = '',
    name = '',
    lang = '',
    watchOnly = false,
    playerPosition = -1,
    playerCards = [],
  }: Partial<CurrentPlayerProps> = {}) {
    this._playerID = playerID;
    this._name = name;
    this._lang = lang;
    this._watchOnly = watchOnly;
    this._playerPosition = playerPosition;
    // Create a frozen copy of the array
    this._playerCards = Object.freeze([...playerCards]);
  }

  // Read-only getters
  public get playerID(): string { return this._playerID; }
  public get name(): string { return this._name; }
  public get lang(): string { return this._lang; }
  public get watchOnly(): boolean { return this._watchOnly; }
  public get playerPosition(): number { return this._playerPosition; }
  public get playerCards(): ReadonlyArray<string> { return this._playerCards; }
  
  // Derived properties
  public get homeTeam(): number { 
    return this._playerPosition >= 0 ? this._playerPosition % 2 : -1; 
  }
  
  public get otherTeam(): number { 
    return this._playerPosition >= 0 ? 1 - this._playerPosition % 2 : -1; 
  }
  
  /**
   * Factory method to create a default CurrentPlayer instance
   */
  public static create(): CurrentPlayer {
    return new CurrentPlayer();
  }

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

    try {
      // Extract base player data with type safety
      const playerID = typeof gameState.PlayerID === 'string' ? gameState.PlayerID : '';
      const playerPosition = typeof gameState.PlayerPosition === 'number' ? gameState.PlayerPosition : -1;
      const watchOnly = !!gameState.WatchOnly;
      
      // Safely handle player cards
      const playerCards = Array.isArray(gameState.PlayerCards) 
        ? gameState.PlayerCards.filter(card => typeof card === 'string')
        : [];

      // Find player info in table data
      let name = '';
      let lang = '';

      if (gameState.TableInfo?.Chairs && playerPosition !== -1) {
        const chairs = gameState.TableInfo.Chairs;
        if (Array.isArray(chairs)) {
          const chair = chairs.find(chair => chair.Position === playerPosition);
          
          if (chair) {
            if (watchOnly && Array.isArray(chair.Watchers)) {
              const playerInfo = chair.Watchers.find(watcher => watcher.PlayerID === playerID);
              if (playerInfo) {
                name = typeof playerInfo.Name === 'string' ? playerInfo.Name : '';
                lang = typeof playerInfo.Lang === 'string' ? playerInfo.Lang : '';
              }
            } else if (!watchOnly && chair.Occupant) {
              name = typeof chair.Occupant.Name === 'string' ? chair.Occupant.Name : '';
              lang = typeof chair.Occupant.Lang === 'string' ? chair.Occupant.Lang : '';
            }
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
    } catch (error) {
      console.error('Error updating CurrentPlayer:', error);
      return [player ?? new CurrentPlayer(), false];
    }
  }

  /**
   * Creates a plain object representation of the CurrentPlayer
   */
  public toJSON(): {
    playerID: string;
    name: string;
    lang: string;
    watchOnly: boolean;
    playerPosition: number;
    playerCards: string[];
    homeTeam: number;
    otherTeam: number;
  } {
    return {
      playerID: this._playerID,
      name: this._name,
      lang: this._lang,
      watchOnly: this._watchOnly,
      playerPosition: this._playerPosition,
      playerCards: [...this._playerCards],
      homeTeam: this.homeTeam,
      otherTeam: this.otherTeam
    };
  }
}

/**
 * Helper function to compare arrays without serializing
 */
function areArraysEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}