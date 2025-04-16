/**
 * Round interface to represent a single round of play
 */
export interface Round {
  FirstPlayer: number;
  NextPlayer: number;
  PlayedCards: string[];
}

/**
 * RoundsInfo class for Svelte component
 * Extracts and maintains rounds information from game state
 * Optimized to minimize reactive updates
 */
export class RoundsInfo {
  private _rounds: Round[] = [];
  private _teamScore: number[] = [];

  // Getters that don't trigger reactive updates on read
  public get rounds(): Round[] { return [...this._rounds]; }
  public get teamScore(): number[] { return [...this._teamScore]; }
  
  /**
   * Updates the RoundsInfo with data from a game state JSON
   * @param rounds The existing RoundsInfo object
   * @param gameState The parsed game state JSON object
   * @returns [RoundsInfo, boolean] pair with new or existing RoundsInfo and whether it changed
   */
  public static update(rounds: RoundsInfo, gameState: any): [RoundsInfo, boolean] {
    let newRounds = new RoundsInfo();

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || gameState;
    
    // Update rounds if available
    if (tableInfo.Rounds && Array.isArray(tableInfo.Rounds)) {
      // Create simplified rounds with only the fields we need
      const simplifiedRounds = tableInfo.Rounds.map((round: any) => ({
        FirstPlayer: round.FirstPlayer,
        NextPlayer: round.NextPlayer,
        PlayedCards: [...round.PlayedCards]
      }));
      
      // Store the rounds in the new object
      newRounds._rounds = JSON.parse(JSON.stringify(simplifiedRounds));
    }

    // Update teamScore if available
    if (tableInfo.TeamScore && Array.isArray(tableInfo.TeamScore)) {
      newRounds._teamScore = [...tableInfo.TeamScore];
    }

    // Compare the new object with the existing one
    if (rounds && 
        JSON.stringify(rounds._rounds) === JSON.stringify(newRounds._rounds) &&
        JSON.stringify(rounds._teamScore) === JSON.stringify(newRounds._teamScore)) {
      return [rounds, false];
    }
    
    return [newRounds, true];
  }

  /**
   * Creates a plain object representation of the RoundsInfo
   */
  public toJSON(): {
    rounds: Round[];
    teamScore: number[];
  } {
    return {
      rounds: JSON.parse(JSON.stringify(this._rounds)),
      teamScore: [...this._teamScore]
    };
  }
}