/**
 * Player class to represent player information
 */
export interface Player {
  PlayerID: string;
  Name: string;
  Lang: string;
  WatchOnly: boolean;
}

/**
 * Chair class to represent seating at the table
 */
export interface Chair {
  Position: number;
  Occupant: Player;
  Watchers: Player[];
  KodiCount: number;
  KodiJustInstalled: boolean;
}

/**
 * Chairs class for Svelte component
 * Extracts and maintains chair information from game state
 * Optimized to minimize reactive updates
 */
export class Chairs {
  private _chairs: Chair[] = [];
  private _changeCount: number = $state(0);

  // Getter that returns the current snapshot as frozen object
  // which will not trigger reactivity on property access
  public get snapshot(): Readonly<{
    chairs: Chair[];
    changeCount: number;
  }> {
    return Object.freeze({
      chairs: [...this._chairs],
      changeCount: this._changeCount
    });
  }

  /**
   * Get chair information at a specific position
   * @param position The chair position to retrieve
   * @returns The chair at the specified position or undefined if not found
   */
  public getChair(position: number): Chair | undefined {
    return this._chairs.find(chair => chair.Position === position);
  }

  /**
   * Get all chair information
   * @returns Array of all chairs
   */
  public getAllChairs(): Chair[] {
    return [...this._chairs];
  }

  /**
   * Updates the Chairs with data from a game state JSON
   * Only triggers a single reactive update if any property changed
   * @param gameState The parsed game state JSON object
   * @returns boolean indicating if any property was updated
   */
  public update(gameState: any): boolean {
    let hasChanged = false;

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || gameState;
    
    if (tableInfo.Chairs && Array.isArray(tableInfo.Chairs)) {
      // Deep comparison of chairs array to detect changes
      const newChairs = tableInfo.Chairs;
      
      // Check if length changed
      if (this._chairs.length !== newChairs.length) {
        hasChanged = true;
      } else {
        // Check each chair for changes
        for (let i = 0; i < newChairs.length; i++) {
          if (!this._chairs[i] || 
              JSON.stringify(this._chairs[i]) !== JSON.stringify(newChairs[i])) {
            hasChanged = true;
            break;
          }
        }
      }

      // If changes detected, update the internal state
      if (hasChanged) {
        this._chairs = [...newChairs];
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
   * Creates a plain object representation of the Chairs
   */
  public toJSON(): {
    chairs: Chair[];
  } {
    return {
      chairs: [...this._chairs]
    };
  }
}