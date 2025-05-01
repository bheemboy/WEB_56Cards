/**
 * TableInfo class for Svelte component
 * Extracts and maintains specific table information from game state
 * Optimized to minimize reactive updates with improved type safety
 */

// Define proper interfaces for better type safety
export interface TableInfoData {
  Type?: number;
  TableName?: string;
  TableFull?: boolean;
}

export interface GameState {
  TableInfo?: TableInfoData;
  TableFull?: boolean;
  [key: string]: any;
}

// Define valid table types and their corresponding player counts
export type TableType = 0 | 1 | 2;
export type PlayerCount = 4 | 6 | 8;

export class TableInfo {
  // Using readonly for immutability
  private readonly _type: TableType;
  private readonly _tableName: string;
  private readonly _tableFull: boolean;

  /**
   * Private constructor - use factory methods to create instances
   */
  private constructor(type: TableType = 0, tableName: string = "", tableFull: boolean = false) {
    this._type = type;
    this._tableName = tableName;
    this._tableFull = tableFull;
  }

  // Getters that don't trigger reactive updates on read
  public get type(): TableType {
    return this._type;
  }

  /**
   * Derives maxPlayers from type:
   * - type 0 → 4 players
   * - type 1 → 6 players
   * - type 2 → 8 players
   */
  public get maxPlayers(): PlayerCount {
    switch (this._type) {
      case 0:
        return 4;
      case 1:
        return 6;
      case 2:
        return 8;
      default:
        // This shouldn't happen with proper TypeScript, but for safety:
        console.warn(`Invalid table type: ${this._type}, defaulting to 4 players`);
        return 4;
    }
  }

  public get tableName(): string {
    return this._tableName;
  }

  public get tableFull(): boolean {
    return this._tableFull;
  }

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
      throw new Error("Invalid game state provided");
    }

    try {
      // Extract TableInfo data safely handling potential undefined values
      const tableInfo: TableInfoData = gameState.TableInfo || gameState;

      // Ensure type is valid (0, 1, or 2)
      const rawType = typeof tableInfo.Type === "number" ? tableInfo.Type : 0;
      const safeType = rawType >= 0 && rawType <= 2 ? (rawType as TableType) : 0;

      // Create a new TableInfo object with extracted values
      const newTable = new TableInfo(safeType, typeof tableInfo.TableName === "string" ? tableInfo.TableName : "", !!gameState.TableFull);

      // Compare with existing table if available
      if (table && table._type === newTable._type && table._tableName === newTable._tableName && table._tableFull === newTable._tableFull) {
        return [table, false]; // No changes, return existing table
      }

      return [newTable, true]; // Changes detected, return new table
    } catch (error) {
      console.error("Error updating TableInfo:", error);
      return [table || new TableInfo(), false]; // Return existing or new table on error
    }
  }

  /**
   * Creates a plain object representation of the TableInfo
   */
  public toJSON(): {
    type: TableType;
    tableName: string;
    tableFull: boolean;
  } {
    return {
      type: this._type,
      tableName: this._tableName,
      tableFull: this._tableFull,
    };
  }
}
