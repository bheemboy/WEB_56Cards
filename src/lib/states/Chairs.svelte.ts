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
   * @param chairs The existing Chairs object
   * @param gameState The parsed game state JSON object
   * @returns [Chairs, boolean] pair with new or existing Chairs and whether it changed
   */
  public static update(chairs: Chairs, gameState: any): [Chairs, boolean] {
    let newChairs = new Chairs();

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || gameState;
    
    if (tableInfo.Chairs && Array.isArray(tableInfo.Chairs)) {
      // Create a deep copy of the chairs array
      newChairs._chairs = JSON.parse(JSON.stringify(tableInfo.Chairs));
    }

    // Compare the new object with the existing one
    if (chairs && JSON.stringify(chairs._chairs) === JSON.stringify(newChairs._chairs)) {
      return [chairs, false];
    }
    
    return [newChairs, true];
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