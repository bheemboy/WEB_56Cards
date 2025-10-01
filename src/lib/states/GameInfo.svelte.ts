/**
 * GameInfo class for Svelte component
 * Extracts and maintains specific game information from game state
 * Optimized to minimize reactive updates with improved type safety and error handling
 */

// Define proper type interfaces
export enum GameStage {
  Unknown = 0,
  WaitingForPlayers = 1,
  Bidding = 2,
  SelectingTrump = 3,
  PlayingCards = 4,
  GameOver = 5
}

export interface TeamInfo {
  readonly currentScore: number;
  readonly scoreNeeded: number;
  readonly coolieCount: number;
}

export interface BidInfo {
  readonly HighBid?: number;
  readonly HighBidder?: number;
}

export interface TableInfoData {
  readonly GameCancelled?: boolean;
  readonly GameForfeited?: boolean;
  readonly DealerPos?: number;
  readonly CoolieCount?: number[];
  readonly TeamScore?: number[];
  readonly Bid?: BidInfo;
  readonly TrumpExposed?: boolean;
  readonly TrumpCard?: string;
}

export interface GameState {
  readonly GameStage?: number;
  readonly TableInfo?: TableInfoData;
  readonly TrumpExposed?: boolean;
  readonly TrumpCard?: string;
}

export class GameInfo {
  // Private properties with explicit types
  private readonly _gameStage: GameStage;
  private readonly _gameCancelled: boolean;
  private readonly _gameForfeited: boolean;
  private readonly _dealerPos: number;
  private readonly _coolieCount: ReadonlyArray<number>;
  private readonly _teams: ReadonlyArray<TeamInfo>;
  private readonly _trumpExposed: boolean;
  private readonly _trumpCard: string;

  /**
   * Private constructor - use factory methods to create instances
   */
  private constructor(
    gameStage: GameStage = GameStage.Unknown,
    gameCancelled: boolean = false,
    gameForfeited: boolean = false,
    dealerPos: number = 0,
    coolieCount: number[] = [0, 0],
    teams: TeamInfo[] = [
      { currentScore: 0, scoreNeeded: 0, coolieCount: 0 },
      { currentScore: 0, scoreNeeded: 0, coolieCount: 0 }
    ],
    trumpExposed: boolean = false,
    trumpCard: string = ''
  ) {
    this._gameStage = gameStage;
    this._gameCancelled = gameCancelled;
    this._gameForfeited = gameForfeited;
    this._dealerPos = dealerPos;
    this._coolieCount = Object.freeze([...coolieCount]);
    this._teams = Object.freeze(
      teams.map(team => Object.freeze({ ...team }))
    );
    this._trumpExposed = trumpExposed;
    this._trumpCard = trumpCard;
  }

  // Getters with proper return types
  public get gameStage(): GameStage {
    return this._gameStage;
  }

  public get gameCancelled(): boolean {
    return this._gameCancelled;
  }

  public get gameForfeited(): boolean {
    return this._gameForfeited;
  }

  public get dealerPos(): number {
    return this._dealerPos;
  }

  public get coolieCount(): ReadonlyArray<number> {
    return this._coolieCount;
  }

  public get teams(): ReadonlyArray<TeamInfo> {
    return this._teams;
  }

  public get trumpExposed(): boolean {
    return this._trumpExposed;
  }

  public get trumpCard(): string {
    return this._trumpCard;
  }

  /**
   * Factory method to create a new GameInfo instance
   */
  public static create(): GameInfo {
    return new GameInfo();
  }

  /**
   * Calculate the score needed for each team based on bid information
   * @param bidInfo The bid information from the game state
   * @returns An array of score needed for each team
   */
  private static calculateScoreNeeded(bidInfo?: BidInfo): [number, number] {
    if (!bidInfo || typeof bidInfo.HighBid !== 'number' || typeof bidInfo.HighBidder !== 'number') {
      return [0, 0];
    }

    const biddingTeam = bidInfo.HighBidder % 2;
    const isThani = bidInfo.HighBid === 57;
    
    if (isThani) {
      return biddingTeam === 0 ? [8, 1] : [1, 8];
    } else {
      const highBid = Math.max(0, Math.min(57, bidInfo.HighBid)); // Clamp bid value
      return biddingTeam === 0 
        ? [highBid, 57 - highBid] 
        : [57 - highBid, highBid];
    }
  }

  /**
   * Deep equality check for GameInfo objects
   */
  private static isEqual(a: GameInfo, b: GameInfo): boolean {
    if (a === b) return true;
    
    return (
      a._gameStage === b._gameStage &&
      a._gameCancelled === b._gameCancelled &&
      a._gameForfeited === b._gameForfeited &&
      a._dealerPos === b._dealerPos &&
      a._trumpExposed === b._trumpExposed &&
      a._trumpCard === b._trumpCard &&
      a._coolieCount.length === b._coolieCount.length &&
      a._coolieCount.every((val, i) => val === b._coolieCount[i]) &&
      a._teams.length === b._teams.length &&
      a._teams.every((team, i) => (
        team.currentScore === b._teams[i].currentScore &&
        team.scoreNeeded === b._teams[i].scoreNeeded &&
        team.coolieCount === b._teams[i].coolieCount
      ))
    );
  }

  /**
   * Updates the GameInfo with data from a game state JSON
   * @param game The existing GameInfo object or undefined
   * @param gameState The parsed game state JSON object
   * @returns [GameInfo, boolean] pair with new GameInfo and whether it changed
   */
  public static update(game: GameInfo | undefined, gameState: GameState): [GameInfo, boolean] {
    if (!gameState) {
      console.warn('Invalid game state provided');
      return [game || new GameInfo(), false];
    }

    try {
      // Safely extract values with defaults to handle malformed data
      const tableInfo = gameState?.TableInfo || {};
      
      // Ensure GameStage is a valid enum value
      const gameStage: GameStage = typeof gameState.GameStage === 'number' && 
                      GameStage[gameState.GameStage as GameStage] !== undefined
                      ? gameState.GameStage as GameStage 
                      : GameStage.Unknown;
      
      const gameCancelled = !!tableInfo.GameCancelled;
      const gameForfeited = !!tableInfo.GameForfeited;
      const dealerPos = typeof tableInfo.DealerPos === 'number' ? tableInfo.DealerPos : 0;
      
      // Safely handle CoolieCount array
      const coolieCount = Array.isArray(tableInfo.CoolieCount) && tableInfo.CoolieCount.length >= 2
        ? [
            typeof tableInfo.CoolieCount[0] === 'number' ? tableInfo.CoolieCount[0] : 0,
            typeof tableInfo.CoolieCount[1] === 'number' ? tableInfo.CoolieCount[1] : 0
          ]
        : [0, 0];

      // Calculate score needed for each team
      const scoreNeeded = GameInfo.calculateScoreNeeded(tableInfo.Bid);
      
      // Safely handle TeamScore array
      const teamScore = Array.isArray(tableInfo.TeamScore) && tableInfo.TeamScore.length >= 2
        ? [
            typeof tableInfo.TeamScore[0] === 'number' ? tableInfo.TeamScore[0] : 0,
            typeof tableInfo.TeamScore[1] === 'number' ? tableInfo.TeamScore[1] : 0
          ]
        : [0, 0];

      // Create team info objects
      const teams: TeamInfo[] = [
        {
          currentScore: teamScore[0],
          scoreNeeded: scoreNeeded[0],
          coolieCount: coolieCount[0]
        },
        {
          currentScore: teamScore[1],
          scoreNeeded: scoreNeeded[1],
          coolieCount: coolieCount[1]
        }
      ];

      // Pull TrumpExposed and TrumpCard from gameState root instead of tableInfo
      const trumpExposed = !!gameState.TrumpExposed;
      const trumpCard = typeof gameState.TrumpCard === 'string' ? gameState.TrumpCard : '';

      // Create new game info object
      const newGame = new GameInfo(
        gameStage,
        gameCancelled,
        gameForfeited,
        dealerPos,
        coolieCount,
        teams,
        trumpExposed,
        trumpCard
      );

      // Check if the game has changed
      if (game && GameInfo.isEqual(game, newGame)) {
        return [game, false];
      }
      
      return [newGame, true];
    } catch (error) {
      console.error('Error updating game info:', error);
      // Return existing or new default game info object in case of error
      return [game || new GameInfo(), false];
    }
  }

  /**
   * Creates an immutable plain object representation of the GameInfo
   */
  public toJSON(): {
    gameStage: GameStage;
    gameCancelled: boolean;
    gameForfeited: boolean;
    dealerPos: number;
    coolieCount: readonly number[];
    teams: readonly TeamInfo[];
    trumpExposed: boolean;
    trumpCard: string;  // Changed from number to string
  } {
    return Object.freeze({
      gameStage: this._gameStage,
      gameCancelled: this._gameCancelled,
      gameForfeited: this._gameForfeited,
      dealerPos: this._dealerPos,
      coolieCount: [...this._coolieCount],
      teams: this._teams.map(team => ({ ...team })),
      trumpExposed: this._trumpExposed,
      trumpCard: this._trumpCard
    });
  }
}