/**
 * GameInfo class for Svelte component
 * Extracts and maintains specific game information from game state
 * Optimized to minimize reactive updates
 */
export class GameInfo {
  // Define enum for GameStage
  public static GameStage = {
    Unknown: 0,
    WaitingForPlayers: 1,
    Bidding: 2,
    SelectingTrump: 3,
    PlayingCards: 4,
    GameOver: 5
  } as const;

  // Private properties
  private _gameStage: number = 0;
  private _gameCancelled: boolean = false;
  private _gameForfeited: boolean = false;
  private _dealerPos: number = 0;
  private _coolieCount: number[] = [0, 0];
  private _changeCount: number = $state(0);

  // Getters that don't trigger reactive updates on read
  public get gameStage(): number { return this._gameStage; }
  public get gameCancelled(): boolean { return this._gameCancelled; }
  public get gameForfeited(): boolean { return this._gameForfeited; }
  public get dealerPos(): number { return this._dealerPos; }
  public get coolieCount(): number[] { return [...this._coolieCount]; }
  
  // Getter that returns the current snapshot as frozen object
  // which will not trigger reactivity on property access
  public get snapshot(): Readonly<{
    gameStage: number;
    gameCancelled: boolean;
    gameForfeited: boolean;
    dealerPos: number;
    coolieCount: readonly number[];
    changeCount: number;
  }> {
    return Object.freeze({
      gameStage: this._gameStage,
      gameCancelled: this._gameCancelled,
      gameForfeited: this._gameForfeited,
      dealerPos: this._dealerPos,
      coolieCount: Object.freeze([...this._coolieCount]),
      changeCount: this._changeCount
    });
  }

  /**
   * Updates the GameInfo with data from a game state JSON
   * Only triggers a single reactive update if any property changed
   * @param gameState The parsed game state JSON object
   * @returns boolean indicating if any property was updated
   */
  public update(gameState: any): boolean {
    let hasChanged = false;

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || {};

    // Only update GameStage if it exists and has changed
    if (gameState.GameStage !== undefined && this._gameStage !== gameState.GameStage) {
      this._gameStage = gameState.GameStage;
      hasChanged = true;
    }

    // Only update GameCancelled if it exists and has changed
    if (tableInfo.GameCancelled !== undefined && this._gameCancelled !== tableInfo.GameCancelled) {
      this._gameCancelled = tableInfo.GameCancelled;
      hasChanged = true;
    }

    // Only update GameForfeited if it exists and has changed
    if (tableInfo.GameForfeited !== undefined && this._gameForfeited !== tableInfo.GameForfeited) {
      this._gameForfeited = tableInfo.GameForfeited;
      hasChanged = true;
    }

    // Only update DealerPos if it exists and has changed
    if (tableInfo.DealerPos !== undefined && this._dealerPos !== tableInfo.DealerPos) {
      this._dealerPos = tableInfo.DealerPos;
      hasChanged = true;
    }

    // Only update CoolieCount if it exists and has changed
    // Check both value and reference to determine if it has changed
    if (tableInfo.CoolieCount !== undefined) {
      const coolieCountChanged = 
        this._coolieCount.length !== tableInfo.CoolieCount.length ||
        this._coolieCount[0] !== tableInfo.CoolieCount[0] ||
        this._coolieCount[1] !== tableInfo.CoolieCount[1];
        
      if (coolieCountChanged) {
        this._coolieCount = [...tableInfo.CoolieCount];
        hasChanged = true;
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
   * Creates a plain object representation of the GameInfo
   */
  public toJSON(): {
    gameStage: number;
    gameCancelled: boolean;
    gameForfeited: boolean;
    dealerPos: number;
    coolieCount: number[];
  } {
    return {
      gameStage: this._gameStage,
      gameCancelled: this._gameForfeited,
      gameForfeited: this._gameForfeited,
      dealerPos: this._dealerPos,
      coolieCount: [...this._coolieCount]
    };
  }
}