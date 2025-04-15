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
  private _changeCount: number = $state(0);

  // Getters that don't trigger reactive updates on read
  public get highBid(): number { return this._highBid; }
  public get highBidder(): number { return this._highBidder; }
  public get nextBidder(): number { return this._nextBidder; }
  public get nextMinBid(): number { return this._nextMinBid; }
  public get bidHistory(): BidHistoryEntry[] { return [...this._bidHistory]; }
  
  // Getter that returns the current snapshot as frozen object
  // which will not trigger reactivity on property access
  public get snapshot(): Readonly<{
    highBid: number;
    highBidder: number;
    nextBidder: number;
    nextMinBid: number;
    bidHistory: BidHistoryEntry[];
    changeCount: number;
  }> {
    return Object.freeze({
      highBid: this._highBid,
      highBidder: this._highBidder,
      nextBidder: this._nextBidder,
      nextMinBid: this._nextMinBid,
      bidHistory: [...this._bidHistory],
      changeCount: this._changeCount
    });
  }

  /**
   * Check if a player has passed on bidding
   * @param position The player position to check
   * @returns boolean indicating if player has passed (bid 0)
   */
  public hasPlayerPassed(position: number): boolean {
    return this._bidHistory.some(entry => 
      entry.Position === position && entry.Bid === 0
    );
  }

  /**
   * Get the highest bid placed by a specific player
   * @param position The player position to check
   * @returns The highest bid value or 0 if no bids
   */
  public getPlayerHighestBid(position: number): number {
    const playerBids = this._bidHistory
      .filter(entry => entry.Position === position && entry.Bid > 0)
      .map(entry => entry.Bid);
    
    return playerBids.length > 0 ? Math.max(...playerBids) : 0;
  }

  /**
   * Updates the BidInfo with data from a game state JSON
   * Only triggers a single reactive update if any property changed
   * @param gameState The parsed game state JSON object
   * @returns boolean indicating if any property was updated
   */
  public update(gameState: any): boolean {
    let hasChanged = false;

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || gameState;
    
    if (!tableInfo.Bid) {
      return false;
    }

    const bidInfo = tableInfo.Bid;

    // Update highBid if changed
    if (bidInfo.HighBid !== undefined && this._highBid !== bidInfo.HighBid) {
      this._highBid = bidInfo.HighBid;
      hasChanged = true;
    }

    // Update highBidder if changed
    if (bidInfo.HighBidder !== undefined && this._highBidder !== bidInfo.HighBidder) {
      this._highBidder = bidInfo.HighBidder;
      hasChanged = true;
    }

    // Update nextBidder if changed
    if (bidInfo.NextBidder !== undefined && this._nextBidder !== bidInfo.NextBidder) {
      this._nextBidder = bidInfo.NextBidder;
      hasChanged = true;
    }

    // Update nextMinBid if changed
    if (bidInfo.NextMinBid !== undefined && this._nextMinBid !== bidInfo.NextMinBid) {
      this._nextMinBid = bidInfo.NextMinBid;
      hasChanged = true;
    }

    // Update bidHistory if changed
    if (bidInfo.BidHistory && Array.isArray(bidInfo.BidHistory)) {
      // Check if the bid history has changed
      const newBidHistory = bidInfo.BidHistory;
      
      // Compare length first for quick check
      if (this._bidHistory.length !== newBidHistory.length) {
        this._bidHistory = [...newBidHistory];
        hasChanged = true;
      } else {
        // Deep comparison of arrays
        const currentJson = JSON.stringify(this._bidHistory);
        const newJson = JSON.stringify(newBidHistory);
        
        if (currentJson !== newJson) {
          this._bidHistory = [...newBidHistory];
          hasChanged = true;
        }
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
