import * as signalR from "@microsoft/signalr";
import { ConnectionState } from "./GameControllerTypes";
import { CustomRetryPolicy } from "./RetryPolicy";
import { alertStoreInstance } from "./AlertStore.svelte";

export class HubConnector {
  private _hubConnection: signalR.HubConnection;
  private _connectionState = $state(ConnectionState.DISCONNECTED);
  private _alertStore = alertStoreInstance;
  
  constructor(hubUrl: string) {
    this._hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect(new CustomRetryPolicy())
      .configureLogging(signalR.LogLevel.Information)
      .build();
      
    this.registerConnectionHandlers();
  }
  
  public get connectionState() {
    return this._connectionState;
  }
  
  public get hubConnection() {
    return this._hubConnection;
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
  
  // Connection methods
  public async connect(): Promise<void> {
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

  public async disconnect(): Promise<void> {
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
  
  // Add method to register event handlers
  public registerEventHandler(eventName: string, callback: (...args: any[]) => void): void {
    this._hubConnection.on(eventName, callback);
  }
  
  // Method to invoke hub methods
  public async invokeMethod(methodName: string, ...args: any[]): Promise<any> {
    try {
      return await this._hubConnection.invoke(methodName, ...args);
    } catch (error) {
      console.error(`Error invoking ${methodName}:`, error);
      throw error;
    }
  }
}