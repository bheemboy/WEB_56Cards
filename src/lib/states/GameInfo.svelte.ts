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

  // Getters that don't trigger reactive updates on read
  public get gameStage(): number { return this._gameStage; }
  public get gameCancelled(): boolean { return this._gameCancelled; }
  public get gameForfeited(): boolean { return this._gameForfeited; }
  public get dealerPos(): number { return this._dealerPos; }
  public get coolieCount(): number[] { return [...this._coolieCount]; }
  
  /**
   * Updates the GameInfo with data from a game state JSON
   * @param game The existing GameInfo object
   * @param gameState The parsed game state JSON object
   * @returns [GameInfo, boolean] pair with new or existing GameInfo and whether it changed
   */
  public static update(game: GameInfo, gameState: any): [GameInfo, boolean] {
    let newGame = new GameInfo();

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || {};

    // Set all properties on the new object
    newGame._gameStage = gameState.GameStage !== undefined ? gameState.GameStage : 0;
    newGame._gameCancelled = tableInfo.GameCancelled !== undefined ? tableInfo.GameCancelled : false;
    newGame._gameForfeited = tableInfo.GameForfeited !== undefined ? tableInfo.GameForfeited : false;
    newGame._dealerPos = tableInfo.DealerPos !== undefined ? tableInfo.DealerPos : 0;
    
    // Set coolieCount, ensuring we create a new array
    newGame._coolieCount = tableInfo.CoolieCount !== undefined ? [...tableInfo.CoolieCount] : [0, 0];

    // Compare the new object with the existing one
    if (game && 
        game._gameStage === newGame._gameStage &&
        game._gameCancelled === newGame._gameCancelled &&
        game._gameForfeited === newGame._gameForfeited &&
        game._dealerPos === newGame._dealerPos &&
        JSON.stringify(game._coolieCount) === JSON.stringify(newGame._coolieCount)) {
      return [game, false];
    }
    
    return [newGame, true];
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
      gameCancelled: this._gameCancelled,
      gameForfeited: this._gameForfeited,
      dealerPos: this._dealerPos,
      coolieCount: [...this._coolieCount]
    };
  }
}