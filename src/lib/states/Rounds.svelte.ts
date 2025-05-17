/**
 * RoundsInfo class for Svelte component
 * Extracts and maintains rounds information from game state
 * Optimized to minimize reactive updates with improved type safety
 */

// Define proper interfaces for better type safety
export interface Round {
  FirstPlayer: number;
  NextPlayer: number;
  PlayedCards: string[];
  TrumpExposed?: boolean[];
  Winner?: number;
  Score?: number;
  AutoPlayNextCard?: string;
}

export interface TableInfoData {
  Rounds?: Round[];
  TeamScore?: number[];
  [key: string]: any;
}

export interface GameState {
  TableInfo?: TableInfoData;
  [key: string]: any;
}

export class RoundsInfo {
  // Default round definition for when no rounds exist
  private static readonly defaultNewRound: Round = Object.freeze({
    FirstPlayer: -1,
    NextPlayer: -1,
    PlayedCards: [],
    TrumpExposed: [],
    Winner: -1,
    Score: -1,
    AutoPlayNextCard: ""
  });

  // Using readonly for immutability
  private readonly _rounds: ReadonlyArray<Round>;
  private readonly _teamScore: ReadonlyArray<number>;

  /**
   * Private constructor - use factory methods to create instances
   */
  private constructor(
    rounds: Round[] = [],
    teamScore: number[] = [0, 0]
  ) {
    // Create defensive copies with proper validation
    this._rounds = Object.freeze(rounds.map(round => ({
      FirstPlayer: typeof round.FirstPlayer === 'number' ? round.FirstPlayer : 0,
      NextPlayer: typeof round.NextPlayer === 'number' ? round.NextPlayer : 0,
      PlayedCards: Array.isArray(round.PlayedCards) ? [...round.PlayedCards] : [],
      TrumpExposed: Array.isArray(round.TrumpExposed) ? [...round.TrumpExposed] : undefined,
      Winner: typeof round.Winner === 'number' ? round.Winner : undefined,
      Score: typeof round.Score === 'number' ? round.Score : undefined,
      AutoPlayNextCard: typeof round.AutoPlayNextCard === 'string' ? round.AutoPlayNextCard : undefined
    })));
    
    // Validate teamScore array
    this._teamScore = Object.freeze(
      teamScore.length >= 2 ? 
      [
        typeof teamScore[0] === 'number' ? teamScore[0] : 0,
        typeof teamScore[1] === 'number' ? teamScore[1] : 0
      ] : 
      [0, 0]
    );
  }

  // Getters that don't trigger reactive updates on read
  public get rounds(): ReadonlyArray<Round> { return this._rounds; }
  public get teamScore(): ReadonlyArray<number> { return this._teamScore; }
  
  /**
   * Get the current round or a default new round if no rounds exist
   */
  public get currentRound(): Round {
    return this._rounds.length > 0 ? this._rounds[this._rounds.length - 1] : RoundsInfo.defaultNewRound;
  }

  /**
   * Get the penultimate (second to last) round or null if fewer than 2 rounds exist
   */
  public get penultimateRound(): Round | null {
    return this._rounds.length > 1 ? this._rounds[this._rounds.length - 2] : null;
  }

  /**
   * Factory method to create a default RoundsInfo instance
   */
  public static create(): RoundsInfo {
    return new RoundsInfo();
  }

  /**
   * Updates the RoundsInfo with data from a game state JSON
   * @param rounds The existing RoundsInfo object or undefined
   * @param gameState The parsed game state JSON object
   * @returns [RoundsInfo, boolean] pair with new or existing RoundsInfo and whether it changed
   */
  public static update(rounds: RoundsInfo | undefined, gameState: GameState): [RoundsInfo, boolean] {
    if (!gameState) {
      console.warn('Invalid game state provided');
      return [rounds || new RoundsInfo(), false];
    }

    try {
      // Extract TableInfo data from the root or from TableInfo property
      const tableInfo: TableInfoData = gameState.TableInfo || gameState;
      
      // Create a new instance with extracted data
      const newRounds = new RoundsInfo(
        Array.isArray(tableInfo.Rounds) ? tableInfo.Rounds : [],
        Array.isArray(tableInfo.TeamScore) ? tableInfo.TeamScore : [0, 0]
      );
      
      // Compare with existing RoundsInfo if available
      if (rounds && areRoundsEqual(rounds, newRounds)) {
        return [rounds, false];
      }
      
      return [newRounds, true];
    } catch (error) {
      console.error('Error updating RoundsInfo:', error);
      return [rounds || new RoundsInfo(), false];
    }
  }

  /**
   * Creates a plain object representation of the RoundsInfo
   */
  public toJSON(): {
    rounds: Round[];
    teamScore: number[];
    currentRound?: Round;
  } {
    return {
      rounds: this._rounds.map(round => ({
        FirstPlayer: round.FirstPlayer,
        NextPlayer: round.NextPlayer,
        PlayedCards: [...round.PlayedCards],
        TrumpExposed: round.TrumpExposed ? [...round.TrumpExposed] : undefined,
        Winner: round.Winner,
        Score: round.Score,
        AutoPlayNextCard: round.AutoPlayNextCard
      })),
      teamScore: [...this._teamScore],
      currentRound: this.currentRound ? {
        FirstPlayer: this.currentRound.FirstPlayer,
        NextPlayer: this.currentRound.NextPlayer,
        PlayedCards: [...this.currentRound.PlayedCards],
        TrumpExposed: this.currentRound.TrumpExposed ? [...this.currentRound.TrumpExposed] : undefined,
        Winner: this.currentRound.Winner,
        Score: this.currentRound.Score,
        AutoPlayNextCard: this.currentRound.AutoPlayNextCard
      } : undefined
    };
  }
}

/**
 * Helper function to check if two RoundsInfo objects are equal
 */
function areRoundsEqual(a: RoundsInfo, b: RoundsInfo): boolean {
  // Compare team scores
  if (a.teamScore.length !== b.teamScore.length) {
    return false;
  }
  
  for (let i = 0; i < a.teamScore.length; i++) {
    if (a.teamScore[i] !== b.teamScore[i]) {
      return false;
    }
  }

  // Compare rounds
  if (a.rounds.length !== b.rounds.length) {
    return false;
  }

  for (let i = 0; i < a.rounds.length; i++) {
    const roundA = a.rounds[i];
    const roundB = b.rounds[i];
    
    // Compare basic properties
    if (roundA.FirstPlayer !== roundB.FirstPlayer ||
        roundA.NextPlayer !== roundB.NextPlayer ||
        roundA.Winner !== roundB.Winner ||
        roundA.Score !== roundB.Score ||
        roundA.AutoPlayNextCard !== roundB.AutoPlayNextCard) {
      return false;
    }
    
    // Compare PlayedCards arrays
    if (roundA.PlayedCards.length !== roundB.PlayedCards.length) {
      return false;
    }
    
    for (let j = 0; j < roundA.PlayedCards.length; j++) {
      if (roundA.PlayedCards[j] !== roundB.PlayedCards[j]) {
        return false;
      }
    }
    
    // Compare TrumpExposed arrays if they exist
    if (Array.isArray(roundA.TrumpExposed) && Array.isArray(roundB.TrumpExposed)) {
      if (roundA.TrumpExposed.length !== roundB.TrumpExposed.length) {
        return false;
      }
      
      for (let j = 0; j < roundA.TrumpExposed.length; j++) {
        if (roundA.TrumpExposed[j] !== roundB.TrumpExposed[j]) {
          return false;
        }
      }
    } else if (roundA.TrumpExposed !== roundB.TrumpExposed) {
      // One is array, one is undefined
      return false;
    }
  }
  
  return true;
}