import * as signalR from "@microsoft/signalr";
import { writable } from "svelte/store";

// Define connection states as constants for consistency
export const ConnectionState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting", 
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed"
};

class Cards56Hub {
  private hubConnection: signalR.HubConnection;
  private static instance: Cards56Hub | null = null;
  
  // Create a Svelte store for the connection state
  private connectionStateStore = writable<string>(ConnectionState.DISCONNECTED);

  private constructor() {
    let cards56Hub = '/Cards56Hub';

    if (window.location.hostname.toLowerCase() === 'localhost') {
      cards56Hub = 'http://localhost:8080/Cards56Hub';
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(cards56Hub)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerConnectionHandlers();
    
    // Connect automatically
    this.connect().catch(err => {
      console.error("Initial connection failed:", err);
    });
  }

  private registerConnectionHandlers(): void {
    this.hubConnection.onreconnecting((error) => {
      this.connectionStateStore.set(ConnectionState.RECONNECTING);
      console.log("Connection lost. Attempting to reconnect...", error);
    });

    this.hubConnection.onreconnected((connectionId) => {
      this.connectionStateStore.set(ConnectionState.CONNECTED);
      console.log("Connection reestablished. ConnectionId:", connectionId);
    });

    this.hubConnection.onclose((error) => {
      this.connectionStateStore.set(ConnectionState.DISCONNECTED);
      console.log("Connection closed.", error);
    });
  }

  public static getInstance(): Cards56Hub {
    if (!Cards56Hub.instance) {
      Cards56Hub.instance = new Cards56Hub();
    }
    return Cards56Hub.instance;
  }

  async connect(): Promise<void> {
    try {
      if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
        this.connectionStateStore.set(ConnectionState.CONNECTING);
        console.log("Attempting to connect to SignalR hub...");
        await this.hubConnection.start();
        this.connectionStateStore.set(ConnectionState.CONNECTED);
        console.log("SignalR Connected");
      }
    } catch (err) {
      this.connectionStateStore.set(ConnectionState.FAILED);
      console.error("Error starting connection:", err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
        await this.hubConnection.stop();
        this.connectionStateStore.set(ConnectionState.DISCONNECTED);
        console.log("SignalR Disconnected");
      }
    } catch (err) {
      console.error("Error stopping connection:", err);
      throw err;
    }
  }

  // Get the connection state store for components to subscribe to
  get connectionState() {
    return this.connectionStateStore;
  }
}

// Create a singleton instance
const hubInstance = Cards56Hub.getInstance();

// Export the instance methods and properties that components need
export const cards56Hub = {
  // Connection methods
  connect: () => hubInstance.connect(),
  disconnect: () => hubInstance.disconnect(),
  
  // Connection state as a readable store
  connectionState: hubInstance.connectionState
};
