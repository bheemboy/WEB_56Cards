/**
 * CurrentPlayer class for Svelte component
 * Extracts and maintains current player information from game state
 * Optimized to minimize reactive updates
 */
export class CurrentPlayer {
  private _playerID: string = '';
  private _name: string = '';
  private _lang: string = '';
  private _watchOnly: boolean = false;
  private _playerPosition: number = -1;
  private _playerCards: string[] = [];

  // Getters that don't trigger reactive updates on read
  public get playerID(): string { return this._playerID; }
  public get name(): string { return this._name; }
  public get lang(): string { return this._lang; }
  public get watchOnly(): boolean { return this._watchOnly; }
  public get playerPosition(): number { return this._playerPosition; }
  public get playerCards(): string[] { return [...this._playerCards]; }
  public get team(): number { return this._playerPosition % 2; }
  
  /**
   * Updates a player with data from a game state JSON
   * @param player The parsed game state JSON object
   * @param gameState The parsed game state JSON object
   * @returns boolean indicating if any property was updated
   */
  public static update(player: CurrentPlayer, gameState: any): [CurrentPlayer, boolean] {
    let newPlayer = new CurrentPlayer();
    newPlayer._playerID = gameState.PlayerID !== undefined ? gameState.PlayerID : '';
    newPlayer._playerPosition = gameState.PlayerPosition !== undefined ? gameState.PlayerPosition : -1;
    newPlayer._playerCards = gameState.PlayerCards ? [...gameState.PlayerCards] : [];
    newPlayer._watchOnly = gameState.WatchOnly !== undefined ? gameState.WatchOnly : false;

    if (gameState.TableInfo?.Chairs && newPlayer._playerPosition !== -1) {
      const chair = gameState.TableInfo.Chairs.find(
      (chair: any) => chair.Position === newPlayer._playerPosition
      );
      if (chair) {
      const player = newPlayer._watchOnly ? 
        chair.Watchers.find((watcher: any) => watcher.PlayerID === newPlayer._playerID) :
        chair.Occupant;
      if (player) {
        newPlayer._name = player.Name || '';
        newPlayer._lang = player.Lang || '';
      }
      }
    }

    if (player && 
      player._playerID === newPlayer._playerID &&
      player._name === newPlayer._name &&
      player._lang === newPlayer._lang &&
      player._watchOnly === newPlayer._watchOnly &&
      player._playerPosition === newPlayer._playerPosition &&
      JSON.stringify(player._playerCards) === JSON.stringify(newPlayer._playerCards)) {
      return [player, false];
    }
    return [newPlayer, true];
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
  } {
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
