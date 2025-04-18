/**
 * BidInfo class for Svelte component
 * Extracts and maintains bidding information from game state
 * Optimized to minimize reactive updates with improved type safety
 */

// Define proper interfaces for better type safety
export interface BidHistoryEntry {
  Position: number;
  Bid: number;
}

export interface BidInfoData {
  HighBid?: number;
  HighBidder?: number;
  NextBidder?: number;
  NextMinBid?: number;
  BidHistory?: BidHistoryEntry[];
}

export interface TableInfoData {
  Bid?: BidInfoData;
  [key: string]: any;
}

export interface GameState {
  TableInfo?: TableInfoData;
  [key: string]: any;
}

export class BidInfo {
  // Using readonly for immutability
  private readonly _highBid: number;
  private readonly _highBidder: number;
  private readonly _nextBidder: number;
  private readonly _nextMinBid: number;
  private readonly _bidHistory: ReadonlyArray<BidHistoryEntry>;

  /**
   * Private constructor - use factory methods to create instances
   */
  private constructor(
    highBid: number = 0,
    highBidder: number = -1,
    nextBidder: number = -1,
    nextMinBid: number = 0,
    bidHistory: BidHistoryEntry[] = []
  ) {
    this._highBid = highBid;
    this._highBidder = highBidder;
    this._nextBidder = nextBidder;
    this._nextMinBid = nextMinBid;
    // Create a frozen copy of the array for immutability
    this._bidHistory = Object.freeze([...bidHistory]);
  }

  // Getters that don't trigger reactive updates on read
  public get highBid(): number { return this._highBid; }
  public get highBidder(): number { return this._highBidder; }
  public get nextBidder(): number { return this._nextBidder; }
  public get nextMinBid(): number { return this._nextMinBid; }
  
  // Return a defensive copy of the bidHistory
  public get bidHistory(): ReadonlyArray<BidHistoryEntry> { return this._bidHistory; }
  
  /**
   * Factory method to create a default BidInfo instance
   */
  public static create(): BidInfo {
    return new BidInfo();
  }

  /**
   * Updates the BidInfo with data from a game state JSON
   * @param bid The existing BidInfo object or undefined
   * @param gameState The parsed game state JSON object
   * @returns [BidInfo, boolean] pair with new or existing BidInfo and whether it changed
   */
  public static update(bid: BidInfo | undefined, gameState: GameState): [BidInfo, boolean] {
    if (!gameState) {
      console.warn('Invalid game state provided');
      return [bid || new BidInfo(), false];
    }

    try {
      // Extract TableInfo data from the root or from TableInfo property
      const tableInfo: TableInfoData = gameState.TableInfo || gameState;
      
      // If there's no bid information
      if (!tableInfo.Bid) {
        return [bid || new BidInfo(), !!bid];
      }

      const bidInfo: BidInfoData = tableInfo.Bid;

      // Set all properties on the new object with proper type checking
      const newBid = new BidInfo(
        typeof bidInfo.HighBid === 'number' ? bidInfo.HighBid : 0,
        typeof bidInfo.HighBidder === 'number' ? bidInfo.HighBidder : -1,
        typeof bidInfo.NextBidder === 'number' ? bidInfo.NextBidder : -1,
        typeof bidInfo.NextMinBid === 'number' ? bidInfo.NextMinBid : 0,
        // Handle bidHistory safely
        Array.isArray(bidInfo.BidHistory) 
          ? bidInfo.BidHistory.map(entry => ({
              Position: typeof entry.Position === 'number' ? entry.Position : 0,
              Bid: typeof entry.Bid === 'number' ? entry.Bid : 0
            }))
          : []
      );

      // Compare the new object with the existing one
      if (bid && 
          bid._highBid === newBid._highBid &&
          bid._highBidder === newBid._highBidder &&
          bid._nextBidder === newBid._nextBidder &&
          bid._nextMinBid === newBid._nextMinBid &&
          areArraysEqual(bid._bidHistory, newBid._bidHistory)) {
        return [bid, false];
      }
      
      return [newBid, true];
    } catch (error) {
      console.error('Error updating BidInfo:', error);
      return [bid || new BidInfo(), false];
    }
  }

  /**
   * Creates a plain object representation of the BidInfo
   */
  public toJSON(): {
    highBid: number;
    highBidder: number;
    nextBidder: number;
    nextMinBid: number;
    bidHistory: BidHistoryEntry[];
  } {
    return {
      highBid: this._highBid,
      highBidder: this._highBidder,
      nextBidder: this._nextBidder,
      nextMinBid: this._nextMinBid,
      bidHistory: [...this._bidHistory]
    };
  }
}

/**
 * Helper function to compare arrays for equality
 * @param a First array
 * @param b Second array
 * @returns True if arrays are equal
 */
function areArraysEqual<T extends { [key: string]: any }>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  
  return a.every((item, index) => {
    const itemB = b[index];
    // Compare all properties in the objects
    return Object.keys(item).every(key => item[key] === itemB[key]);
  });
}