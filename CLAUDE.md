# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web frontend for **56 Cards** (Ambathiyaru) — a real-time multiplayer trick-taking card game from Kerala/Tamil Nadu. This client connects to a backend API (`play.56cards.com/Cards56Hub`) via SignalR WebSockets. The architecture is **fully server-authoritative**: the client only renders state pushed by `OnStateUpdated` events and submits actions to the server — no local game logic or validation.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173
npm run build      # Production build to dist/
npm run build:gh   # Build for GitHub Pages deployment
npm run preview    # Preview production build locally
npm run check      # Type-check with svelte-check + tsc
```

No test suite is configured.

### Docker

```bash
# Build and push (from Dockerfile comments)
docker build -t bheemboy/web_56cards:latest .
docker push --all-tags bheemboy/web_56cards
docker compose up   # Runs on port 80
```

## Architecture

### Tech Stack
- **Svelte 5** with TypeScript, **Vite** bundler
- **@microsoft/signalr** for WebSocket communication with the game server
- No SvelteKit router — uses simple manual client-side routing in `App.svelte` (`/` → `Home`, `/table` → `Table`)

### State Management Pattern
All game state flows through a singleton `GameController` (provided via Svelte context from `App.svelte`). The controller owns a `HubConnector` (SignalR wrapper) and a set of immutable state slice classes:

```
GameController (singleton)
├── HubConnector          — SignalR connection lifecycle + reconnect policy
├── LoginParams           — username, tabletype, tablename, language, watch
├── TableInfo             — table name, type, player list
├── CurrentPlayer         — local player's cards and chair position
├── GameInfo              — game stage, trump, scores, coolies
├── Chairs                — all chair occupants, kodi markers, watchers
├── BidInfo               — current bids
└── RoundsInfo            — trick history
```

State slices in `src/lib/states/` follow an **immutable update pattern**: each class uses a `static update(existing, gameState)` factory that returns `[newInstance, changed]` — components only re-render when the slice actually changed.

### Key Files
- `src/lib/GameController.svelte.ts` — hub methods enum, `GameController` singleton, SignalR event handlers (`OnError`, `OnStateUpdated`, `OnRegisterPlayerCompleted`)
- `src/lib/HubConnection.svelte.ts` — `HubConnector` class wrapping SignalR, connection state machine
- `src/lib/RetryPolicy.ts` — custom reconnect retry policy
- `src/lib/AlertStore.svelte.ts` — singleton alert/notification store
- `src/GameStateExample.json` — example server state payload (useful for understanding the JSON shape)

### Routes
- `src/routes/Home.svelte` — login form (player name, table size/name, language, watch mode)
- `src/routes/Table.svelte` — game table view; reads URL params to init `LoginParams`, connects to SignalR on mount

### Hub Methods (server-side actions)
`RegisterPlayer`, `JoinTable`, `PlaceBid`, `PassBid`, `SelectTrump`, `PlayCard`, `ShowTrump`, `StartNextGame`, `RefreshState`, `ForfeitGame`, `UnregisterPlayer`

### Deployment
- **GitHub Pages**: CI builds with `npm run build:gh` on push to `main`
- **Docker/nginx**: Multi-stage build → nginx serving `dist/`. Custom nginx config in `nginx/`
- **Backend URL**: Hardcoded to `https://play.56cards.com/Cards56Hub` in `GameController.svelte.ts`

## Domain Concepts

The game state JSON uses these key fields: `GameStage` (0=Unknown, 1=WaitingForPlayers, 2=Bidding, 3=SelectingTrump, 4=PlayingCards, 5=GameOver), `TableInfo` (scores, coolies, bid info), `TrumpCard`, `TrumpExposed`, and per-player data in `Chairs`.

**Coolie/Kodi**: Team-level scoring reserves (Coolies) and individual penalty markers (Kodi) are the meta-scoring layer — when a team's coolies hit zero, Kodi markers are placed. See `reference/DOMAIN_KNOWLEDGE.md` for full game rules.

**Thani**: Special maximum bid (stored as 57 internally) where the bidder plays alone against all opponents without a trump suit.
