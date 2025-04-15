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
  private _changeCount: number = $state(0);

  // Getters that don't trigger reactive updates on read
  public get playerID(): string { return this._playerID; }
  public get name(): string { return this._name; }
  public get lang(): string { return this._lang; }
  public get watchOnly(): boolean { return this._watchOnly; }
  public get playerPosition(): number { return this._playerPosition; }
  public get playerCards(): string[] { return [...this._playerCards]; }
  
  // Getter that returns the current snapshot as frozen object
  // which will not trigger reactivity on property access
  public get snapshot(): Readonly<{
    playerID: string;
    name: string;
    lang: string;
    watchOnly: boolean;
    playerPosition: number;
    playerCards: readonly string[];
    changeCount: number;
  }> {
    return Object.freeze({
      playerID: this._playerID,
      name: this._name,
      lang: this._lang,
      watchOnly: this._watchOnly,
      playerPosition: this._playerPosition,
      playerCards: Object.freeze([...this._playerCards]),
      changeCount: this._changeCount
    });
  }

  /**
   * Updates the CurrentPlayer with data from a game state JSON
   * Only triggers a single reactive update if any property changed
   * @param gameState The parsed game state JSON object
   * @returns boolean indicating if any property was updated
   */
  public update(gameState: any): boolean {
    let hasChanged = false;

    // Update PlayerID if it exists and has changed
    if (gameState.PlayerID !== undefined && this._playerID !== gameState.PlayerID) {
      this._playerID = gameState.PlayerID;
      hasChanged = true;
    }

    // Update PlayerPosition if it exists and has changed
    if (gameState.PlayerPosition !== undefined && this._playerPosition !== gameState.PlayerPosition) {
      this._playerPosition = gameState.PlayerPosition;
      hasChanged = true;
    }

    // Update PlayerCards if it exists and has changed
    // We need to do a deep comparison for arrays
    if (gameState.PlayerCards !== undefined) {
      const cardsChanged = this._playerCards.length !== gameState.PlayerCards.length ||
        gameState.PlayerCards.some((card: string, index: number) => this._playerCards[index] !== card);
      
      if (cardsChanged) {
        this._playerCards = [...gameState.PlayerCards];
        hasChanged = true;
      }
    }

    // Update WatchOnly if it exists and has changed
    if (gameState.WatchOnly !== undefined && this._watchOnly !== gameState.WatchOnly) {
      this._watchOnly = gameState.WatchOnly;
      hasChanged = true;
    }

    // Find player info in TableInfo.Chairs based on PlayerPosition
    if (gameState.TableInfo?.Chairs && this._playerPosition !== -1) {
      const chair = gameState.TableInfo.Chairs.find(
        (chair: any) => chair.Position === this._playerPosition
      );

      if (chair) {
        // Could be either the occupant or one of the watchers
        const player = this._watchOnly ? 
          chair.Watchers.find((watcher: any) => watcher.PlayerID === this._playerID) :
          chair.Occupant;

        if (player) {
          // Update Name if it exists and has changed
          if (player.Name !== undefined && this._name !== player.Name) {
            this._name = player.Name;
            hasChanged = true;
          }

          // Update Lang if it exists and has changed
          if (player.Lang !== undefined && this._lang !== player.Lang) {
            this._lang = player.Lang;
            hasChanged = true;
          }
        }
      }
    }

    // Only increment the change counter if something actually changed
    // This is the only reactive property that will trigger updates
    if (hasChanged) {
      this._changeCount++;
    }

    return hasChanged;
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