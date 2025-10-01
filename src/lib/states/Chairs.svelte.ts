/**
 * Chairs class for Svelte component
 * Extracts and maintains chair information from game state
 * Optimized to minimize reactive updates with improved type safety
 */

// Define proper interfaces for better type safety
export interface Player {
  PlayerID: string;
  Name?: string;
  Lang?: string;
  WatchOnly?: boolean;
}

export interface Chair {
  Position: number;
  Occupant?: Player;
  Watchers?: Player[];
  KodiCount?: number;
  KodiJustInstalled?: boolean;
}

export interface TableInfoData {
  Chairs?: Chair[];
  [key: string]: any;
}

export interface GameState {
  TableInfo?: TableInfoData;
  [key: string]: any;
}

export class Chairs {
  // Using readonly for immutability
  private readonly _chairs: ReadonlyArray<Chair>;

  /**
   * Private constructor - use factory methods to create instances
   */
  private constructor(chairs: Chair[] = []) {
    // Create defensive copy with standardized properties
    this._chairs = Object.freeze(chairs.map(chair => ({
      Position: chair.Position,
      Occupant: chair.Occupant ? {
        PlayerID: chair.Occupant.PlayerID,
        Name: chair.Occupant.Name || '',
        Lang: chair.Occupant.Lang || '',
        WatchOnly: !!chair.Occupant.WatchOnly
      } : undefined,
      Watchers: Array.isArray(chair.Watchers) ? chair.Watchers.map(watcher => ({
        PlayerID: watcher.PlayerID,
        Name: watcher.Name || '',
        Lang: watcher.Lang || '',
        WatchOnly: !!watcher.WatchOnly
      })) : [],
      KodiCount: typeof chair.KodiCount === 'number' ? chair.KodiCount : 0,
      KodiJustInstalled: !!chair.KodiJustInstalled
    })));
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
  public getAllChairs(): ReadonlyArray<Chair> {
    return this._chairs;
  }

  /**
   * Factory method to create a default Chairs instance
   */
  public static create(): Chairs {
    return new Chairs();
  }

  /**
   * Updates the Chairs with data from a game state JSON
   * @param chairs The existing Chairs object or undefined
   * @param gameState The parsed game state JSON object
   * @returns [Chairs, boolean] pair with new or existing Chairs and whether it changed
   */
  public static update(chairs: Chairs | undefined, gameState: GameState): [Chairs, boolean] {
    if (!gameState) {
      console.warn('Invalid game state provided');
      return [chairs || new Chairs(), false];
    }

    try {
      // Extract TableInfo data from the root or from TableInfo property
      const tableInfo: TableInfoData = gameState.TableInfo || gameState;
      const newChairs = new Chairs(Array.isArray(tableInfo.Chairs) ? tableInfo.Chairs : []);
      
      // Compare with existing chairs if available
      if (chairs && areChairsEqual(chairs._chairs, newChairs._chairs)) {
        return [chairs, false];
      }
      
      return [newChairs, true];
    } catch (error) {
      console.error('Error updating Chairs:', error);
      return [chairs || new Chairs(), false];
    }
  }

  /**
   * Creates a plain object representation of the Chairs
   */
  public toJSON(): { chairs: Chair[] } {
    return {
      chairs: this._chairs.map(chair => ({
        Position: chair.Position,
        Occupant: chair.Occupant ? { ...chair.Occupant } : undefined,
        Watchers: Array.isArray(chair.Watchers) ? chair.Watchers.map(watcher => ({ ...watcher })) : [],
        KodiCount: chair.KodiCount,
        KodiJustInstalled: chair.KodiJustInstalled
      }))
    };
  }
}

/**
 * Deep equality check for Chairs arrays
 */
function areChairsEqual(a: ReadonlyArray<Chair>, b: ReadonlyArray<Chair>): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  return a.every((chairA, index) => {
    const chairB = b[index];
    
    // Compare basic properties
    if (chairA.Position !== chairB.Position ||
        chairA.KodiCount !== chairB.KodiCount ||
        chairA.KodiJustInstalled !== chairB.KodiJustInstalled) {
      return false;
    }
    
    // Compare Occupant
    if (chairA.Occupant && chairB.Occupant) {
      if (chairA.Occupant.PlayerID !== chairB.Occupant.PlayerID ||
          chairA.Occupant.Name !== chairB.Occupant.Name ||
          chairA.Occupant.Lang !== chairB.Occupant.Lang ||
          chairA.Occupant.WatchOnly !== chairB.Occupant.WatchOnly) {
        return false;
      }
    } else if (chairA.Occupant !== chairB.Occupant) {
      return false;
    }
    
    // Compare Watchers
    const watchersA = chairA.Watchers || [];
    const watchersB = chairB.Watchers || [];
    
    if (watchersA.length !== watchersB.length) {
      return false;
    }
    
    return watchersA.every((watcherA, watcherIndex) => {
      const watcherB = watchersB[watcherIndex];
      return watcherA.PlayerID === watcherB.PlayerID &&
             watcherA.Name === watcherB.Name &&
             watcherA.Lang === watcherB.Lang &&
             watcherA.WatchOnly === watcherB.WatchOnly;
    });
  });
}