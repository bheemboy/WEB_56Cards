/**
 * TableInfo class for Svelte component
 * Extracts and maintains specific table information from game state
 * Optimized to minimize reactive updates
 */
export class TableInfo {
  private _type: number = 0;
  private _maxPlayers: number = 0;
  private _tableName: string = '';
  private _tableFull: boolean = false;
  private _changeCount: number = $state(0);

  // Getters that don't trigger reactive updates on read
  public get type(): number { return this._type; }
  public get maxPlayers(): number { return this._maxPlayers; }
  public get tableName(): string { return this._tableName; }
  public get tableFull(): boolean { return this._tableFull; }
  
  // Getter that returns the current snapshot as frozen object
  // which will not trigger reactivity on property access
  public get snapshot(): Readonly<{
    type: number;
    maxPlayers: number;
    tableName: string;
    tableFull: boolean;
    changeCount: number;
  }> {
    return Object.freeze({
      type: this._type,
      maxPlayers: this._maxPlayers,
      tableName: this._tableName,
      tableFull: this._tableFull,
      changeCount: this._changeCount
    });
  }

  /**
   * Updates the TableInfo with data from a game state JSON
   * Only triggers a single reactive update if any property changed
   * @param gameState The parsed game state JSON object
   * @returns boolean indicating if any property was updated
   */
  public update(gameState: any): boolean {
    let hasChanged = false;

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || gameState;

    // Only update Type if it exists and has changed
    if (tableInfo.Type !== undefined && this._type !== tableInfo.Type) {
      this._type = tableInfo.Type;
      hasChanged = true;
    }

    // Only update MaxPlayers if it exists and has changed
    if (tableInfo.MaxPlayers !== undefined && this._maxPlayers !== tableInfo.MaxPlayers) {
      this._maxPlayers = tableInfo.MaxPlayers;
      hasChanged = true;
    }

    // Only update TableName if it exists and has changed
    if (tableInfo.TableName !== undefined && this._tableName !== tableInfo.TableName) {
      this._tableName = tableInfo.TableName;
      hasChanged = true;
    }

    // TableFull might be at root level in some game states
    const tableFull = gameState.TableFull !== undefined ? gameState.TableFull : 
                      (tableInfo.TableFull !== undefined ? tableInfo.TableFull : this._tableFull);
    
    if (this._tableFull !== tableFull) {
      this._tableFull = tableFull;
      hasChanged = true;
    }

    // Only increment the change counter if something actually changed
    // This is the only reactive property that will trigger updates
    if (hasChanged) {
      this._changeCount++;
    }

    return hasChanged;
  }

  /**
   * Creates a plain object representation of the TableInfo
   */
  public toJSON(): {
    type: number;
    maxPlayers: number;
    tableName: string;
    tableFull: boolean;
  } {
    return {
      type: this._type,
      maxPlayers: this._maxPlayers,
      tableName: this._tableName,
      tableFull: this._tableFull
    };
  }
}