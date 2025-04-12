import * as signalR from "@microsoft/signalr";
import { loginParams } from "./LoginParams.svelte";
import { alertStoreInstance } from "./AlertStore.svelte";

class CustomRetryPolicy implements signalR.IRetryPolicy {
  nextRetryDelayInMilliseconds(retryContext: signalR.RetryContext): number | null {
    let retryDelay = null;
    if (retryContext.previousRetryCount === 0) {
      retryDelay = 0;
    } else if (retryContext.previousRetryCount <= 10) {
      retryDelay = 1000;
    } else if (retryContext.previousRetryCount <= 20) {
      retryDelay = 2000;
    } else if (retryContext.previousRetryCount <= 29) {
      retryDelay = 5000;
    }

    if (retryDelay) {
      alertStoreInstance.showError(`Reconnection attempt #${retryContext.previousRetryCount} failed. Retrying in ${retryDelay/1000} seconds...`, "Connection lost: ", 0);
    } else {
      alertStoreInstance.showError(`Could not reconnect to server after ${retryContext.previousRetryCount} attempts.`, "Fatal error: ", 0);
    }
    return retryDelay;
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
  
  // Get access to alert store for error handling
  private _alertStore = alertStoreInstance;

  public get connectionState() {
    return this._connectionState;
  }

  public get gameState() {
    return this._gameState;
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
      .withAutomaticReconnect(new CustomRetryPolicy())
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerConnectionHandlers();
    this.registerEventHandlers();

    // Connect automatically
    this.connect().catch((err: unknown) => {
      this._connectionState = ConnectionState.FAILED;
      this._alertStore.showError("Could not connect to Cards56Hub on server.", "Fatal error: ", 0);
      console.error("Failed to connect to SignalR hub:", err);
    });
  }

  private registerConnectionHandlers(): void {    
    this._hubConnection.onreconnecting((error?: Error) => {
      this._connectionState = ConnectionState.RECONNECTING;      
      if (error) {
        console.error("Connection lost. Attempting to reconnect...", error);
      }
    });

    this._hubConnection.onreconnected((connectionId) => {
      this._connectionState = ConnectionState.CONNECTED;
      this._alertStore.hideAlert();
      console.info("Connection reestablished. ConnectionId:", connectionId);
    });

    this._hubConnection.onclose((error) => {
      this._connectionState = ConnectionState.DISCONNECTED;
      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this._alertStore.showError(`Connection closed with error: ${errorMessage}`, "Disconnected", 0);
        console.error('Connection closed with error:', error);
      } else {
        console.info('Connection closed.');
      }
    });
  }

  private registerEventHandlers(): void {
    // Private handling of OnError events
    this._hubConnection.on("OnError", (errorCode: number, hubMethodID: Cards56HubMethod, errorMessage: string, errorData: any) => {
      // Log details to console for developers
      console.error(`${Cards56HubMethod[hubMethodID] || "Unknown"} Error [${errorCode}]: ${errorMessage}`, errorData);
      
      // Show the error using AlertStore for users
      this._alertStore.showError(errorMessage);
    });

    // Private handling of OnStateUpdated events
    this._hubConnection.on("OnStateUpdated", (jsonState: string) => {
      try {
        // Parse JSON state and update _gameState
        this._gameState = JSON.parse(jsonState);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error parsing game state: ${errorMessage}`, jsonState);
        // Not showing alerts for parsing errors as they're technical issues
      }
    });

    // Private handler for OnRegisterPlayerCompleted
    this._hubConnection.on("OnRegisterPlayerCompleted", (player: Player) => {
      // Store player ID in memory for this session only
      this._playerId = player.playerID;
      console.info("Player registered with ID:", player.playerID);
      
      // Automatically join table after registration completes
      if (!player.tableName) {
        // Inlined joinTable logic (previously a private method)
        this._hubConnection.invoke("JoinTable", parseInt(loginParams.tableType), loginParams.tableName)
          .then(() => console.info("Automatically joined table after registration"))
          .catch(error => {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            this._alertStore.showError(`Error joining table: ${errorMessage}`, "Join Table Failed");
            console.error("Error invoking JoinTable:", error);
          });
      }
      else {
        console.info("Skipping jointable. Player already on table:", player.tableName);
      }
    });
  }

  // Connection methods
  async connect(): Promise<void> {
    // Check current state managed by $state
    if (this._hubConnection.state === signalR.HubConnectionState.Disconnected) {
      try {
        this._connectionState = ConnectionState.CONNECTING;
        console.info("Attempting to connect to SignalR hub...");
        await this._hubConnection.start();
        this._connectionState = ConnectionState.CONNECTED;
        console.info("Connected to 56cards websocket!");
      } catch (err) {
        this._connectionState = ConnectionState.FAILED;
        console.error("Error starting connection:", err);
        throw err; // Re-throw error after setting state
      }
    } else {
      console.info("Connection attempt skipped, already connected or connecting. State:", this._hubConnection.state);
    }
  }

  async disconnect(): Promise<void> {
    // Check current state managed by $state
    if (this._hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      try {
        await this._hubConnection.stop();
        this._connectionState = ConnectionState.DISCONNECTED;
        console.info("SignalR Disconnected");
      } catch (err: unknown) {
        this._connectionState = ConnectionState.FAILED;
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        this._alertStore.showError(`Error disconnecting: ${errorMessage}`, "Disconnect Failed", 0);
        console.error("Error stopping connection:", err);
        throw err; // Re-throw error
      }
    }
  }

  // Public Methods
  async registerPlayer(): Promise<void> {
    try {
      // Check connection state first
      if (this._hubConnection.state !== signalR.HubConnectionState.Connected) {
        this._alertStore.showWarning(`Cannot register player: Not connected`, "Registration Failed");
        console.info("Cannot register player. Hub connection state:", this._hubConnection.state);
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Registration error: ${errorMessage}`, "Registration Failed");
      console.error("Error invoking RegisterPlayer:", error);
      throw error;
    }
  }

  async placeBid(bid: number): Promise<void> {
    try {
      await this._hubConnection.invoke("PlaceBid", bid);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Error placing bid: ${errorMessage}`, "Bid Failed");
      console.error("Error invoking PlaceBid:", error);
      throw error;
    }
  }

  async passBid(): Promise<void> {
    try {
      await this._hubConnection.invoke("PassBid");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Error passing bid: ${errorMessage}`, "Pass Failed");
      console.error("Error invoking PassBid:", error);
      throw error;
    }
  }

  async selectTrump(card: string): Promise<void> {
    try {
      await this._hubConnection.invoke("SelectTrump", card);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Error selecting trump: ${errorMessage}`, "Trump Selection Failed");
      console.error("Error invoking SelectTrump:", error);
      throw error;
    }
  }

  async playCard(card: string, roundOverDelay: number): Promise<void> {
    try {
      await this._hubConnection.invoke("PlayCard", card, roundOverDelay);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Error playing card: ${errorMessage}`, "Play Card Failed");
      console.error("Error invoking PlayCard:", error);
      throw error;
    }
  }

  async showTrump(roundOverDelay: number = 0): Promise<void> {
    try {
      await this._hubConnection.invoke("ShowTrump", roundOverDelay);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Error showing trump: ${errorMessage}`, "Show Trump Failed");
      console.error("Error invoking ShowTrump:", error);
      throw error;
    }
  }

  async startNextGame(): Promise<void> {
    try {
      await this._hubConnection.invoke("StartNextGame");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Error starting next game: ${errorMessage}`, "Start Game Failed");
      console.error("Error invoking StartNextGame:", error);
      throw error;
    }
  }

  async refreshState(): Promise<void> {
    try {
      await this._hubConnection.invoke("RefreshState");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Error refreshing state: ${errorMessage}`, "Refresh Failed");
      console.error("Error invoking RefreshState:", error);
      throw error;
    }
  }

  async forfeitGame(): Promise<void> {
    try {
      await this._hubConnection.invoke("ForfeitGame");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this._alertStore.showError(`Error forfeiting game: ${errorMessage}`, "Forfeit Failed");
      console.error("Error invoking ForfeitGame:", error);
      throw error;
    }
  }
}

// Create and export the singleton instance
export const cards56HubInstance: Cards56Hub = Cards56Hub.getInstance();