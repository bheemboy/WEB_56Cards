import * as signalR from "@microsoft/signalr";
import { loginParams } from "./LoginParams.svelte";

class ForeverRetryPolicy implements signalR.IRetryPolicy {
  nextRetryDelayInMilliseconds(_retryContext: signalR.RetryContext): number | null {
    return 5000; // Always retry every 5 seconds
  }
}

export const ConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting", 
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed"
};

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

export interface Player {
  playerID: string;
  name: string;
  lang: string;
  tableName: string;
  watchOnly: boolean;
}

export interface ErrorInfo {
  errorCode: number;
  hubMethodID: Cards56HubMethod;
  errorMessage: string;
  errorData: any;
}

// Define a unique key for the context
export const cards56HubContextKey = Symbol("cards56HubContext");

export class Cards56Hub {
  private _hubConnection: signalR.HubConnection;
  private _connectionState = $state(ConnectionState.DISCONNECTED);
  private _playerId: string | null = null;
  private _gameState = $state<any>(null);
  private _error = $state<ErrorInfo>();

  public get connectionState() {
    return this._connectionState;
  }

  public get gameState() {
    return this._gameState;
  }

  public get error() {
    return this._error;
  }

  // Static instance holder - create instance immediately
  private static _instance = new Cards56Hub();

  // Public static method to get the single instance
  public static getInstance(): Cards56Hub {
    return Cards56Hub._instance;
  }

  private constructor() {
    let cards56Hub = 'https://play.56cards.com/Cards56Hub';
    // let cards56Hub = '/Cards56Hub';
  
    // if (window.location.hostname.toLowerCase() === 'localhost') {
    //   cards56Hub = 'http://localhost:8080/Cards56Hub';
    // }

    this._hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(cards56Hub)
      .withAutomaticReconnect(new ForeverRetryPolicy())
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerConnectionHandlers();
    this.registerEventHandlers();

    // Connect automatically
    this.connect().catch(err => {
      console.error("Initial connection failed:", err);
      this._connectionState = ConnectionState.FAILED;
    });
  }

  private registerConnectionHandlers(): void {    
    this._hubConnection.onreconnecting((error) => {
      this._connectionState = ConnectionState.RECONNECTING;
      console.log("Connection lost. Attempting to reconnect...", error);
    });

    this._hubConnection.onreconnected((connectionId) => {
      this._connectionState = ConnectionState.CONNECTED;
      console.log("Connection reestablished. ConnectionId:", connectionId);
    });

    this._hubConnection.onclose((error) => {
      this._connectionState = ConnectionState.DISCONNECTED;
      if (error) {
        console.error('Connection closed with error:', error);
      } else {
        console.log('Connection closed.');
      }
    });
  }

  private registerEventHandlers(): void {
    // Private handling of OnError events
    this._hubConnection.on("OnError", (errorCode: number, hubMethodID: Cards56HubMethod, errorMessage: string, errorData: any) => {
      console.error(`Hub Error (${Cards56HubMethod[hubMethodID]}): ${errorCode} - ${errorMessage}`, errorData);
      
      // Update error with new error
      this._error = {errorCode, hubMethodID, errorMessage, errorData};
    });

    // Private handling of OnStateUpdated events
    this._hubConnection.on("OnStateUpdated", (jsonState: string) => {
      try {
        // Parse JSON state and update _gameState
        this._gameState = JSON.parse(jsonState);
        // console.log("Game state updated:", $state.snapshot(this._gameState));
      } catch (error) {
        console.error("Error parsing game state JSON:", error);
      }
    });

    // Private handler for OnRegisterPlayerCompleted
    this._hubConnection.on("OnRegisterPlayerCompleted", (player: Player) => {
      // Store player ID in memory for this session only
      this._playerId = player.playerID;
      console.log("Player registered with ID:", player.playerID);
      
      // Automatically join table after registration completes
      if (!player.tableName) {
        this.joinTable()
          .then(() => console.log("Automatically joined table after registration"))
          .catch(error => console.error("Error auto-joining table:", error));
      }
      else {
        console.log("Skipping jointable. Player already on table: ", player.tableName);
      }
    });
  }

  // Connection methods
  async connect(): Promise<void> {
    // Check current state managed by $state
    if (this._hubConnection.state === signalR.HubConnectionState.Disconnected) {
      try {
        this._connectionState = ConnectionState.CONNECTING;
        console.log("Attempting to connect to SignalR hub...");
        await this._hubConnection.start();
        this._connectionState = ConnectionState.CONNECTED;
        console.log("SignalR Connected");
      } catch (err) {
        this._connectionState = ConnectionState.FAILED;
        console.error("Error starting connection:", err);
        throw err; // Re-throw error after setting state
      }
    } else {
      console.log("Connection attempt skipped, already connected or connecting. State:", this._hubConnection.state);
    }
  }

  async disconnect(): Promise<void> {
    // Check current state managed by $state
    if (this._hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      try {
        await this._hubConnection.stop();
        this._connectionState = ConnectionState.DISCONNECTED;
        console.log("SignalR Disconnected");
      } catch (err) {
        console.error("Error stopping connection:", err);
        this._connectionState = ConnectionState.FAILED;
        throw err; // Re-throw error
      }
    }
  }

  // Public Methods
  async registerPlayer(): Promise<void> {
    try {
      // Check connection state first
      if (this._hubConnection.state !== signalR.HubConnectionState.Connected) {
        console.log("Cannot register player. Hub connection state:", this._hubConnection.state);
        return; // Exit without trying to register
      }
      
      // Use parameters from loginParams to register player
      await this._hubConnection.invoke(
        "RegisterPlayer",
        this._playerId || "",
        loginParams.userName,
        loginParams.language,
        loginParams.watch
      );
      // Note: No need to handle registration completion here, it's handled by the event handler
    } catch (error) {
      console.error("Error invoking RegisterPlayer:", error);
      throw error;
    }
  }

  // Private - Now only called internally after registration completes
  private async joinTable(): Promise<void> {
    try {
      await this._hubConnection.invoke("JoinTable", parseInt(loginParams.tableType), loginParams.tableName);
    } catch (error) {
      console.error("Error invoking JoinTable:", error);
      throw error;
    }
  }

  async placeBid(bid: number): Promise<void> {
    try {
      await this._hubConnection.invoke("PlaceBid", bid);
    } catch (error) {
      console.error("Error invoking PlaceBid:", error);
      throw error;
    }
  }

  async passBid(): Promise<void> {
    try {
      await this._hubConnection.invoke("PassBid");
    } catch (error) {
      console.error("Error invoking PassBid:", error);
      throw error;
    }
  }

  async selectTrump(card: string): Promise<void> {
    try {
      await this._hubConnection.invoke("SelectTrump", card);
    } catch (error) {
      console.error("Error invoking SelectTrump:", error);
      throw error;
    }
  }

  async playCard(card: string, roundOverDelay: number): Promise<void> {
    try {
      await this._hubConnection.invoke("PlayCard", card, roundOverDelay);
    } catch (error) {
      console.error("Error invoking PlayCard:", error);
      throw error;
    }
  }

  async showTrump(roundOverDelay: number = 0): Promise<void> {
    try {
      await this._hubConnection.invoke("ShowTrump", roundOverDelay);
    } catch (error) {
      console.error("Error invoking ShowTrump:", error);
      throw error;
    }
  }

  async startNextGame(): Promise<void> {
    try {
      await this._hubConnection.invoke("StartNextGame");
    } catch (error) {
      console.error("Error invoking StartNextGame:", error);
      throw error;
    }
  }

  async refreshState(): Promise<void> {
    try {
      await this._hubConnection.invoke("RefreshState");
    } catch (error) {
      console.error("Error invoking RefreshState:", error);
      throw error;
    }
  }

  async forfeitGame(): Promise<void> {
    try {
      await this._hubConnection.invoke("ForfeitGame");
    } catch (error) {
      console.error("Error invoking ForfeitGame:", error);
      throw error;
    }
  }
}

// Create and export the singleton instance
export const cards56HubInstance: Cards56Hub = Cards56Hub.getInstance();