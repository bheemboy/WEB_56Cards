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
  private _changeCount: number = $state(0);

  // Getters that don't trigger reactive updates on read
  public get rounds(): Round[] { return [...this._rounds]; }
  public get teamScore(): number[] { return [...this._teamScore]; }
  
  // Getter that returns the current snapshot as frozen object
  // which will not trigger reactivity on property access
  public get snapshot(): Readonly<{
    rounds: Round[];
    teamScore: number[];
    changeCount: number;
  }> {
    return Object.freeze({
      rounds: [...this._rounds],
      teamScore: [...this._teamScore],
      changeCount: this._changeCount
    });
  }

  /**
   * Get the current round information
   * @returns The current round or undefined if no rounds exist
   */
  public getCurrentRound(): Round | undefined {
    if (this._rounds.length === 0) {
      return undefined;
    }
    
    // Find the first round where NextPlayer is not -1
    for (const round of this._rounds) {
      if (round.NextPlayer !== -1 && round.PlayedCards.length < 4) {
        return round;
      }
    }
    
    // If all rounds are complete, return the last round
    return this._rounds[this._rounds.length - 1];
  }

  /**
   * Updates the RoundsInfo with data from a game state JSON
   * Only triggers a single reactive update if any property changed
   * @param gameState The parsed game state JSON object
   * @returns boolean indicating if any property was updated
   */
  public update(gameState: any): boolean {
    let hasChanged = false;

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || gameState;
    
    // Update rounds if available
    if (tableInfo.Rounds && Array.isArray(tableInfo.Rounds)) {
      // Deep comparison of rounds array
      const newRounds = tableInfo.Rounds;
      
      // Create simplified rounds with only the fields we need
      const simplifiedRounds = newRounds.map((round: any) => ({
        FirstPlayer: round.FirstPlayer,
        NextPlayer: round.NextPlayer,
        PlayedCards: round.PlayedCards
      }));
      
      // Check if length changed
      if (this._rounds.length !== simplifiedRounds.length) {
        hasChanged = true;
      } else {
        // Check each round for changes
        const currentJson = JSON.stringify(this._rounds);
        const newJson = JSON.stringify(simplifiedRounds);
        
        if (currentJson !== newJson) {
          hasChanged = true;
        }
      }

      // If changes detected, update the internal state
      if (hasChanged) {
        this._rounds = JSON.parse(JSON.stringify(simplifiedRounds));
      }
    }

    // Update teamScore if changed
    if (tableInfo.TeamScore && Array.isArray(tableInfo.TeamScore)) {
      const newTeamScore = [...tableInfo.TeamScore];
      
      // Compare arrays
      if (this._teamScore.length !== newTeamScore.length || 
          JSON.stringify(this._teamScore) !== JSON.stringify(newTeamScore)) {
        this._teamScore = newTeamScore;
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