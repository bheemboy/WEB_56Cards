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

  // Getters that don't trigger reactive updates on read
  public get type(): number { return this._type; }
  public get maxPlayers(): number { return this._maxPlayers; }
  public get tableName(): string { return this._tableName; }
  public get tableFull(): boolean { return this._tableFull; }
  
  /**
   * Updates the TableInfo with data from a game state JSON
   * @param table The existing TableInfo object
   * @param gameState The parsed game state JSON object
   * @returns [TableInfo, boolean] pair with new or existing TableInfo and whether it changed
   */
  public static update(table: TableInfo, gameState: any): [TableInfo, boolean] {
    let newTable = new TableInfo();

    // Extract TableInfo data from the root or from TableInfo property
    const tableInfo = gameState.TableInfo || gameState;

    // Set all properties on the new object
    newTable._type = tableInfo.Type !== undefined ? tableInfo.Type : 0;
    newTable._maxPlayers = tableInfo.MaxPlayers !== undefined ? tableInfo.MaxPlayers : 0;
    newTable._tableName = tableInfo.TableName !== undefined ? tableInfo.TableName : '';
    
    // TableFull might be at root level in some game states
    newTable._tableFull = gameState.TableFull !== undefined ? gameState.TableFull : 
                         (tableInfo.TableFull !== undefined ? tableInfo.TableFull : false);

    // Compare the new object with the existing one
    if (table && 
        table._type === newTable._type &&
        table._maxPlayers === newTable._maxPlayers &&
        table._tableName === newTable._tableName &&
        table._tableFull === newTable._tableFull) {
      return [table, false];
    }
    
    return [newTable, true];
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