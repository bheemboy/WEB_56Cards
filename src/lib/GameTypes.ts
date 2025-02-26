// types/gameTypes.ts
export interface GameState {
    playerPosition: number;
    playerCards: string[];
    gameStage: number;
    tableInfo: {
      teamScore: number[];
      coolieCount: number[];
      chairs: Chair[];
      bid: {
        highBid: number;
        nextBidder: number;
        highBidder: number;
      };
      rounds: Round[];
    };
    trumpCard?: string;
    trumpExposed: boolean;
  }
  
  export interface Chair {
    occupant: Player | null;
    cards: string[];
    kodiCount: number;
  }
  
  export interface Player {
    name: string;
    position: number;
  }
  
  export interface Round {
    nextPlayer: number;
    playedCards: string[];
  }
  