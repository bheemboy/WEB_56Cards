// Define connection states
export const ConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting", 
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed"
};

// Define hub methods
export enum Cards56HubMethod {
  RegisterPlayer = 1,
  JoinTable = 2,
  PlaceBid = 3,
  PassBid = 4,
  SelectTrump = 5,
  PlayCard = 6,
  ShowTrump = 7,
  StartNextGame = 8,
  RefreshState = 9,
  ForfeitGame = 10,
}

// Player interface
export interface Player {
  playerID: string;
  name: string;
  lang: string;
  tableName: string;
  watchOnly: boolean;
}

// Error information interface
export interface ErrorInfo {
  errorCode: number;
  hubMethodID: Cards56HubMethod;
  errorMessage: string;
  errorData: any;
}

// Define a unique key for the context
export const cards56HubContextKey = Symbol("cards56HubContext");