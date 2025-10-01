import * as signalR from "@microsoft/signalr";
import { ConnectionState, HubConnector } from "./HubConnection.svelte";
import { type LoginParamsData, LoginParams } from "./LoginParams.svelte";
import { alertStoreInstance } from "./AlertStore.svelte";
import { TableInfo } from "./states/TableInfo.svelte";
import { CurrentPlayer } from "./states/CurrentPlayer.svelte";
import { GameInfo } from "./states/GameInfo.svelte";
import { Chairs } from "./states/Chairs.svelte";
import { BidInfo } from "./states/BidInfo.svelte";
import { RoundsInfo } from "./states/Rounds.svelte";

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

export class GameController {
  private _hubConnector: HubConnector;
  private _loginParams: LoginParams = $state<LoginParams>(LoginParams.create());
  private _playerId: string | null = null;
  private _tableInfo: TableInfo = $state<TableInfo>(TableInfo.create());
  private _currentPlayer: CurrentPlayer = $state<CurrentPlayer>(CurrentPlayer.create());
  private _gameInfo: GameInfo = $state<GameInfo>(GameInfo.create());
  private _chairs: Chairs = $state<Chairs>(Chairs.create());
  private _bidInfo: BidInfo = $state<BidInfo>(BidInfo.create());
  private _roundsInfo: RoundsInfo = $state<RoundsInfo>(RoundsInfo.create());
  // Get access to alert store for error handling
  private _alertStore = alertStoreInstance;

  // Getters
  public get connectionState() {
    return this._hubConnector.connectionState;
  }

  public get loginParams() {
    return this._loginParams;
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

  // Static instance holder
  private static _instance: GameController;

  // Public static method to get the single instance
  public static getInstance(forceNew = false): GameController {
    if (!GameController._instance || forceNew) {
      GameController._instance = new GameController();
    }
    return GameController._instance;
  }

  private constructor() {
    let hubUrl = 'https://play.56cards.com/Cards56Hub';
    // let hubUrl = '/Cards56Hub';

    // if (window.location.hostname.toLowerCase() === 'localhost') {
    //   hubUrl = 'http://localhost:8080/Cards56Hub';
    // }

    this._hubConnector = new HubConnector(hubUrl);
    this.registerEventHandlers();
  }

  // Method to update login params - SIMPLIFIED
  public async updateLoginParams(newData: Partial<LoginParamsData>): Promise<[LoginParams, boolean]> {
    const [updatedParams, changed] = LoginParams.update(this._loginParams, newData);
    if (changed) {
      this._loginParams = updatedParams;
      console.info("LoginParams changed:", this._loginParams);
      try {
        await this.unregiterPlayer();
      } catch (err) {
        console.error("Error during unregisterPlayer:", err);
      }
    }
    return [updatedParams, changed];
  }

  private processState(jsonState: string): void {
    try {
      // Parse JSON state only once
      let changed = false;
      var gameState = JSON.parse(jsonState);

      this._alertStore.hideAlert(); // Hide any existing alerts

      [this._tableInfo, changed] = TableInfo.update(this._tableInfo, gameState);
      if (changed) console.info("TableInfo changed:", this._tableInfo);

      [this._currentPlayer, changed] = CurrentPlayer.update(this._currentPlayer, gameState);
      if (changed) console.info("CurrentPlayer changed:", this._currentPlayer);

      [this._gameInfo, changed] = GameInfo.update(this._gameInfo, gameState);
      if (changed) console.info("GameInfo changed:", this._gameInfo);

      [this._bidInfo, changed] = BidInfo.update(this._bidInfo, gameState);
      if (changed) console.info("BidInfo changed:", this._bidInfo);

      [this._chairs, changed] = Chairs.update(this._chairs, gameState);
      if (changed) console.info("Chairs changed:", this._chairs);

      [this._roundsInfo, changed] = RoundsInfo.update(this._roundsInfo, gameState);
      if (changed) console.info("RoundsInfo changed:", this._roundsInfo);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error parsing game state: ${errorMessage}`, jsonState);
    }
  }

  private registerEventHandlers(): void {
    // Handle OnError events
    this._hubConnector.registerEventHandler("OnError", (errorCode: number, hubMethodID: Cards56HubMethod, errorMessage: string, errorData: any) => {
      // Log details to console for developers
      console.error(`${Cards56HubMethod[hubMethodID] || "Unknown"} Error [${errorCode}]: ${errorMessage}`, errorData);

      // Show the error using AlertStore for users
      this._alertStore.showError(errorMessage);
    });

    // Handle OnStateUpdated events
    this._hubConnector.registerEventHandler("OnStateUpdated", (jsonState: string) => {
      this.processState(jsonState);
    });

    // Handler for OnRegisterPlayerCompleted
    this._hubConnector.registerEventHandler("OnRegisterPlayerCompleted", (player: Player) => {
      // Store player ID in memory for this session only
      this._playerId = player.playerID;
      console.info("Player registered with ID:", player.playerID);

      // Automatically join table after registration completes
      if (!player.tableName) {
        // Join table
        this._hubConnector.invokeMethod("JoinTable", parseInt(this._loginParams.tabletype), this._loginParams.tablename)
          .catch(error => {
            console.error("Error invoking JoinTable:", error);
          });
      }
      else {
        console.info("Skipping jointable. Player already on table:", player.tableName);
      }
    });
  }

  // Public connection and disconnection methods
  public async connect(): Promise<void> {
    return this._hubConnector.connect();
  }

  public async disconnect(): Promise<void> {
    return this._hubConnector.disconnect();
  }

  // Game-related public methods
  public async registerPlayer(): Promise<void> {
    try {
      // Check connection state first
      if (this._hubConnector.connectionState !== ConnectionState.CONNECTED || 
          this._hubConnector.hubConnection.state as string !== signalR.HubConnectionState[signalR.HubConnectionState.Connected]) {
        this._alertStore.showWarning(`Cannot register player: Not connected`, "Registration Failed");
        console.info("Cannot register player. Hub connection states:", 
                   {reactive: this._hubConnector.connectionState, 
                    actual: this._hubConnector.hubConnection.state});
        return; // Exit without trying to register
      }
  
      // Use parameters from loginParams to register player
      await this._hubConnector.invokeMethod(
        "RegisterPlayer",
        this._playerId || "",
        this._loginParams.username,
        this._loginParams.language,
        this._loginParams.watch
      );
      // Note: No need to handle registration completion here, it's handled by the event handler
    } catch (error) {
      console.error("Error invoking RegisterPlayer:", error);
      throw error;
    }
  }
  
  public async unregiterPlayer(): Promise<void> {
    this._playerId = null;
    return this._hubConnector.invokeMethod("UnregiterPlayer");
  }

  public async placeBid(bid: number): Promise<void> {
    return this._hubConnector.invokeMethod("PlaceBid", bid);
  }

  public async passBid(): Promise<void> {
    return this._hubConnector.invokeMethod("PassBid");
  }

  public async selectTrump(card: string): Promise<void> {
    return this._hubConnector.invokeMethod("SelectTrump", card);
  }

  public async playCard(card: string, roundOverDelay: number): Promise<void> {
    return this._hubConnector.invokeMethod("PlayCard", card, roundOverDelay);
  }

  public async showTrump(roundOverDelay: number = 0): Promise<void> {
    return this._hubConnector.invokeMethod("ShowTrump", roundOverDelay);
  }

  public async startNextGame(): Promise<void> {
    return this._hubConnector.invokeMethod("StartNextGame");
  }

  public async refreshState(): Promise<void> {
    return this._hubConnector.invokeMethod("RefreshState");
  }

  public async forfeitGame(): Promise<void> {
    return this._hubConnector.invokeMethod("ForfeitGame");
  }
}

// Define a unique key for the context
export const gameControllerContextKey = Symbol("gameControllerContext");

// Create and export the singleton instance
export const gameControllerInstance: GameController = GameController.getInstance();