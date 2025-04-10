import * as signalR from "@microsoft/signalr";
import { ConnectionState } from "./Constants";

// Define a unique key for the context
export const cards56HubContextKey = Symbol("cards56HubContext");

export class Cards56Hub {
  private _hubConnection: signalR.HubConnection;
  private _connectionState = $state(ConnectionState.DISCONNECTED);

  public get connectionState() {
    return this._connectionState;
  }

  private constructor() {

    let cards56Hub = '/Cards56Hub';

    if (window.location.hostname.toLowerCase() === 'localhost') {
      cards56Hub = 'http://localhost:8080/Cards56Hub';
    }

    this._hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(cards56Hub)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerConnectionHandlers();

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
      console.log("Connection closed.", error);
    });
  }

  // Static instance holder - create instance immediately
  private static _instance = new Cards56Hub();

  // Public static method to get the single instance
  public static getInstance(): Cards56Hub {
      return Cards56Hub._instance;
  }

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
            // Potentially set a FAILED state or just log
            console.error("Error stopping connection:", err);
             // Decide if state should change on disconnect error
            this._connectionState = ConnectionState.FAILED; // Or keep DISCONNECTED?
            throw err; // Re-throw error
        }
    }
  }
}

// Create and export the singleton instance
export const cards56HubInstance : Cards56Hub = Cards56Hub.getInstance();
