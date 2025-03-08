// services/gameService.ts
import * as signalR from "@microsoft/signalr";
import { writable } from "svelte/store";
import type { GameState } from "./GameTypes";

export class GameService {
  private hubConnection: signalR.HubConnection;
  public gameState = writable<GameState | null>(null);
  public error = writable<string>("");

  constructor() {
    let cards56Hub = '/Cards56Hub';

    if (window.location.pathname.startsWith('file:///') || 
        window.location.pathname.startsWith('http://localhost') || 
        window.location.pathname.startsWith('https://localhost')) {
      cards56Hub = 'http://localhost:8080/Cards56Hub';
    }
  
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(cards56Hub)
      .build();

    this.setupHubEvents();
  }

  private setupHubEvents() {
    this.hubConnection.on("OnStateUpdated", (jsonState: string) => {
      const state = JSON.parse(jsonState);
      this.gameState.set(state);
    });

    this.hubConnection.on("OnError", (errorCode: number, hubMethod: number, message: string) => {
      this.error.set(`Error [${errorCode}] in ${hubMethod}: ${message}`);
    });
  }

  async connect() {
    try {
      await this.hubConnection.start();
    } catch (err) {
      console.error("Error starting connection:", err);
    }
  }

  async registerPlayer(name: string, lang: string, watchOnly: boolean = false) {
    await this.hubConnection.invoke("RegisterPlayer", name, lang, watchOnly);
  }

  async joinTable(tableType: number, privateTableId: string = "") {
    await this.hubConnection.invoke("JoinTable", tableType, privateTableId);
  }

  async placeBid(bid: number) {
    await this.hubConnection.invoke("PlaceBid", bid);
  }

  async passBid() {
    await this.hubConnection.invoke("PassBid");
  }

  async selectTrump(card: string) {
    await this.hubConnection.invoke("SelectTrump", card);
  }

  async playCard(card: string, roundOverDelay: number) {
    await this.hubConnection.invoke("PlayCard", card, roundOverDelay);
  }

  async showTrump(roundOverDelay: number) {
    await this.hubConnection.invoke("ShowTrump", roundOverDelay);
  }

  async startNextGame() {
    await this.hubConnection.invoke("StartNextGame");
  }

  async refreshState() {
    await this.hubConnection.invoke("RefreshState");
  }

  async forfeitGame() {
    await this.hubConnection.invoke("ForfeitGame");
  }
}
