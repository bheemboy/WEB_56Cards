/**
 * BidHistory entry interface to represent a single bid
 */
export interface BidHistoryEntry {
  Position: number;
  Bid: number;
}

/**
 * BidInfo class for Svelte component
 * Extracts and maintains bidding information from game state
 * Optimized to minimize reactive updates
 */
export class BidInfo {
  private _highBid: number = 0;
  private _highBidder: number = -1;
  private _nextBidder: number = -1;
  private _nextMinBid: number = 0;
  private _bidHistory: BidHistoryEntry[] = [];

  // Getters that don't trigger reactive updates on read
  public get highBid(): number { return this._highBid; }
  public get highBidder(): number { return this._highBidder; }
  public get nextBidder(): number { return this._nextBidder; }
  public get nextMinBid(): number { return this._nextMinBid; }
  public get bidHistory(): BidHistoryEntry[] { return [...this._bidHistory]; }
  
  /**
   * Updates the BidInfo with data from a game state JSON
   * @param bid The existing BidInfo object
   * @param gameState The parsed game state JSON object
   * @returns [BidInfo, boolean] pair with new or existing BidInfo and whether it changed
   */
  public static update(bid: BidInfo, gameState: any): [BidInfo, boolean] {
    let newBid = new BidInfo();

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || gameState;
    
    if (!tableInfo.Bid) {
      // If there's no bid information, return the existing object unchanged
      if (bid) {
        return [bid, false];
      } else {
        // If there's no existing object either, return the new empty one
        return [newBid, true];
      }
    }

    const bidInfo = tableInfo.Bid;

    // Set all properties on the new object
    newBid._highBid = bidInfo.HighBid !== undefined ? bidInfo.HighBid : 0;
    newBid._highBidder = bidInfo.HighBidder !== undefined ? bidInfo.HighBidder : -1;
    newBid._nextBidder = bidInfo.NextBidder !== undefined ? bidInfo.NextBidder : -1;
    newBid._nextMinBid = bidInfo.NextMinBid !== undefined ? bidInfo.NextMinBid : 0;
    
    // Set bidHistory, ensuring we create a new array
    newBid._bidHistory = bidInfo.BidHistory && Array.isArray(bidInfo.BidHistory) ? 
        [...bidInfo.BidHistory] : [];

    // Compare the new object with the existing one
    if (bid && 
        bid._highBid === newBid._highBid &&
        bid._highBidder === newBid._highBidder &&
        bid._nextBidder === newBid._nextBidder &&
        bid._nextMinBid === newBid._nextMinBid &&
        JSON.stringify(bid._bidHistory) === JSON.stringify(newBid._bidHistory)) {
      return [bid, false];
    }
    
    return [newBid, true];
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