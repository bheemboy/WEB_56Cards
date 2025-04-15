import * as signalR from "@microsoft/signalr";
import { loginParams } from "./LoginParams.svelte";
import { alertStoreInstance } from "./AlertStore.svelte";
import { TableInfo } from "./states/TableInfo.svelte"
import { CurrentPlayer } from "./states/CurrentPlayer.svelte";
import { GameInfo } from "./states/GameInfo.svelte";
import { Chairs } from "./states/Chairs.svelte";
import { BidInfo } from "./states/BidInfo.svelte";
import { RoundsInfo } from "./states/Rounds.svelte";

class CustomRetryPolicy implements signalR.IRetryPolicy {
  nextRetryDelayInMilliseconds(retryContext: signalR.RetryContext): number | null {
    let retryDelay = null;
    if (retryContext.previousRetryCount === 0) {
      retryDelay = 0;
    } else if (retryContext.previousRetryCount < 10) {
      retryDelay = 1000;
    } else if (retryContext.previousRetryCount < 20) {
      retryDelay = 2000;
    } else if (retryContext.previousRetryCount < 30) {
      retryDelay = 5000;
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

enum Cards56HubMethod {
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

interface Player {
  playerID: string;
  name: string;
  lang: string;
  tableName: string;
  watchOnly: boolean;
}

interface ErrorInfo {
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
  private _tableInfo: TableInfo = $state<TableInfo>(new TableInfo());
  private _currentPlayer: CurrentPlayer = $state<CurrentPlayer>(new CurrentPlayer());
  private _gameInfo: GameInfo = $state<GameInfo>(new GameInfo());
  private _chairs: Chairs = $state<Chairs>(new Chairs());
  private _bidInfo: BidInfo = $state<BidInfo>(new BidInfo());
  private _roundsInfo: RoundsInfo = $state<RoundsInfo>(new RoundsInfo());

  // Get access to alert store for error handling
  private _alertStore = alertStoreInstance;

  public get connectionState() {
    return this._connectionState;
  }

  public get tableInfo() {
    return this._tableInfo;
  }

  public get currentPlayer() {
    return this._currentPlayer;
  }

  public get gameInfo() {
    return this._gameInfo;
  }  

  public get chairs() {
    return this._chairs;
  }
  
  public get bidInfo() {
    return this._bidInfo;
  }

  public get roundsInfo() {
    return this._roundsInfo;
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
      this._alertStore.showError("Connection to game server lost. Reconnecting...", "", 0);
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
      this._alertStore.showError(`Connection to game server closed`, "Fatal error: ", 0);
      if (error) {
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
        // Parse JSON state only once
        var state = JSON.parse(jsonState);
        // console.log("Game state received:", state);
        
        // Batch all updates together
        const tableInfoChanged = this._tableInfo.update(state);
        const currentPlayerChanged = this._currentPlayer.update(state);
        const gameInfoChanged = this._gameInfo.update(state);
        const chairsChanged = this._chairs.update(state);
        const bidInfoChanged = this._bidInfo.update(state);
        const roundsInfoChanged = this._roundsInfo.update(state);

        // Only log if something actually changed
        if (tableInfoChanged || currentPlayerChanged || gameInfoChanged ||
          chairsChanged || bidInfoChanged || roundsInfoChanged) {
          console.debug("Game state updated - changes detected");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error parsing game state: ${errorMessage}`, jsonState);
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
          .catch(error => {
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
        this._alertStore.showInfo("Connecting to game server...");
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
      console.error("Error invoking RegisterPlayer:", error);
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
