/**
 * TableInfo class for Svelte component
 * Extracts and maintains specific table information from game state
 * Optimized to minimize reactive updates with improved type safety
 */

// Define proper interfaces for better type safety
export interface TableInfoData {
  Type?: number;
  MaxPlayers?: number;
  TableName?: string;
  TableFull?: boolean;
}

export interface GameState {
  TableInfo?: TableInfoData;
  TableFull?: boolean;
  [key: string]: any;
}

export class TableInfo {
  // Using readonly for immutability
  private readonly _type: number;
  private readonly _maxPlayers: number;
  private readonly _tableName: string;
  private readonly _tableFull: boolean;

  /**
   * Private constructor - use factory methods to create instances
   */
  private constructor(
    type: number = 0,
    maxPlayers: number = 0,
    tableName: string = '',
    tableFull: boolean = false
  ) {
    this._type = type;
    this._maxPlayers = maxPlayers;
    this._tableName = tableName;
    this._tableFull = tableFull;
  }

  // Getters that don't trigger reactive updates on read
  public get type(): number { return this._type; }
  public get maxPlayers(): number { return this._maxPlayers; }
  public get tableName(): string { return this._tableName; }
  public get tableFull(): boolean { return this._tableFull; }
  
  /**
   * Factory method to create a default TableInfo instance
   */
  public static create(): TableInfo {
    return new TableInfo();
  }

  /**
   * Updates the TableInfo with data from a game state JSON
   * @param table The existing TableInfo object or undefined
   * @param gameState The parsed game state JSON object
   * @returns [TableInfo, boolean] pair with new or existing TableInfo and whether it changed
   * @throws Error if gameState is invalid
   */
  public static update(table: TableInfo | undefined, gameState: GameState): [TableInfo, boolean] {
    if (!gameState) {
      throw new Error('Invalid game state provided');
    }

    try {
      // Extract TableInfo data safely handling potential undefined values
      const tableInfo: TableInfoData = gameState.TableInfo || gameState;
      
      // Create a new TableInfo object with extracted values
      const newTable = new TableInfo(
        typeof tableInfo.Type === 'number' ? tableInfo.Type : 0,
        typeof tableInfo.MaxPlayers === 'number' ? tableInfo.MaxPlayers : 0,
        typeof tableInfo.TableName === 'string' ? tableInfo.TableName : '',
        !!gameState.TableFull
      );

      // Compare with existing table if available
      if (table && 
          table._type === newTable._type &&
          table._maxPlayers === newTable._maxPlayers &&
          table._tableName === newTable._tableName &&
          table._tableFull === newTable._tableFull) {
        return [table, false]; // No changes, return existing table
      }
      
      return [newTable, true]; // Changes detected, return new table
    } catch (error) {
      console.error('Error updating TableInfo:', error);
      return [table || new TableInfo(), false]; // Return existing or new table on error
    }
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