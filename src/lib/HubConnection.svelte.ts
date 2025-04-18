import * as signalR from "@microsoft/signalr";
import { CustomRetryPolicy } from "./RetryPolicy";
import { alertStoreInstance } from "./AlertStore.svelte";

// Define connection states
export const ConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting", 
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed"
};

// Type for optional connection configuration
export interface HubConnectionOptions {
  logLevel?: signalR.LogLevel;
  maxReconnectAttempts?: number;
}

export class HubConnector {
  private _hubConnection: signalR.HubConnection;
  private _connectionState = $state(ConnectionState.DISCONNECTED);
  private _alertStore = alertStoreInstance;
  private _connectPromise: Promise<void> | null = null;
  private _reconnecting = $state(false);
  private _connectAttempts = $state(0);
  
  // Default options
  private _options: HubConnectionOptions = {
    logLevel: signalR.LogLevel.Information,
    maxReconnectAttempts: 30
  };
  
  constructor(hubUrl: string, options?: Partial<HubConnectionOptions>) {
    // Apply custom options if provided
    if (options) {
      this._options = { ...this._options, ...options };
    }
    
    this._hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect(new CustomRetryPolicy())
      .configureLogging(this._options.logLevel || signalR.LogLevel.Information)
      .build();
      
    this.registerConnectionHandlers();
  }
  
  public get connectionState() {
    return this._connectionState;
  }
  
  public get reconnecting() {
    return this._reconnecting;
  }
  
  public get connectAttempts() {
    return this._connectAttempts;
  }
  
  public get hubConnection() {
    return this._hubConnection;
  }
  
  private registerConnectionHandlers(): void {    
    this._hubConnection.onreconnecting((error?: Error) => {
      this._connectionState = ConnectionState.RECONNECTING;
      this._reconnecting = true;
      this._alertStore.showError("Connection to game server lost. Reconnecting...", "", 0);
      
      if (error) {
        console.error("Connection lost. Attempting to reconnect...", error);
      }
    });

    this._hubConnection.onreconnected((connectionId) => {
      this._connectionState = ConnectionState.CONNECTED;
      this._reconnecting = false;
      this._connectAttempts = 0;
      this._alertStore.hideAlert();
      
      console.info("Connection reestablished. ConnectionId:", connectionId);
    });

    this._hubConnection.onclose((error) => {
      this._connectionState = ConnectionState.DISCONNECTED;
      this._reconnecting = false;
      
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
    // If there's already a connection attempt in progress, return that promise
    if (this._connectPromise && 
        (this._connectionState === ConnectionState.CONNECTING || 
         this._connectionState === ConnectionState.CONNECTED)) {
      return this._connectPromise;
    }
    
    // Check current state managed by $state
    if (this._hubConnection.state === signalR.HubConnectionState.Disconnected) {
      try {
        this._connectionState = ConnectionState.CONNECTING;
        this._connectAttempts++;
        
        console.info(`Attempting to connect to SignalR hub (attempt ${this._connectAttempts})...`);
        
        // Create a new connection promise
        this._connectPromise = this._hubConnection.start();
        
        // Wait for the connection to complete
        await this._connectPromise;
        
        this._connectionState = ConnectionState.CONNECTED;
        this._connectAttempts = 0;
        console.info("Connected to 56cards websocket!");
        
        return this._connectPromise;
      } catch (err) {
        this._connectionState = ConnectionState.FAILED;
        console.error("Error starting connection:", err);
        
        // Clear the promise since it has completed (with an error)
        this._connectPromise = null;
        
        throw err; // Re-throw error after setting state
      }
    } else {
      console.info("Connection attempt skipped, already connected or connecting. State:", this._hubConnection.state);
      return Promise.resolve();
    }
  }

  public async disconnect(): Promise<void> {
    // Check current state managed by $state
    if (this._hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      try {
        await this._hubConnection.stop();
        this._connectionState = ConnectionState.DISCONNECTED;
        this._connectPromise = null;
        this._reconnecting = false;
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
  
  // Method to unregister event handlers
  public unregisterEventHandler(eventName: string, callback: (...args: any[]) => void): void {
    this._hubConnection.off(eventName, callback);
  }
  
  // Method to invoke hub methods with timeout support
  public async invokeMethod(methodName: string, ...args: any[]): Promise<any> {
    // Ensure we're connected before invoking methods
    if (this._hubConnection.state !== signalR.HubConnectionState.Connected) {
      try {
        await this.connect();
      } catch (error) {
        console.error(`Cannot invoke ${methodName} - failed to establish connection:`, error);
        throw new Error(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    try {
      return await this._hubConnection.invoke(methodName, ...args);
    } catch (error) {
      console.error(`Error invoking ${methodName}:`, error);
      throw error;
    }
  }
}