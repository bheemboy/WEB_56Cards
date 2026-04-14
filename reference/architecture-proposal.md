# 56 Cards — Architecture Proposal

> **Version:** 0.3  
> **Date:** April 2026  
> **Stack:** Go · Gorilla WebSockets · PostgreSQL · Redis · SvelteKit (static adapter)  
> **Pattern:** Clean Architecture, Authoritative Server  
> **Companion:** `DOMAIN_KNOWLEDGE.md` (game rules, state machine, business logic)

---

## 1. Guiding Principles

1. **Server-authoritative.** Every game rule, state transition, and validation lives on the server. The Svelte client is a thin rendering and input layer — it never decides whether a bid is legal or a card can be played.

2. **Clean Architecture.** Dependencies point inward. The domain layer knows nothing about WebSockets, PostgreSQL, or Redis. Infrastructure adapts to domain interfaces, not the reverse.

3. **Domain knowledge as source of truth.** Every struct, rule, and state transition must trace back to `DOMAIN_KNOWLEDGE.md`. Where the document is ambiguous, we flag it rather than guess.

4. **Persistence by default.** The original system was entirely in-memory — server restart erased everything. We add PostgreSQL for durable state (accounts, history, rankings) and Redis for ephemeral high-frequency state (sessions, lobby presence, pub/sub).

5. **Designed for real-time.** The game's core loop is sub-second state broadcasting to 2–10 participants per table. WebSocket connections are first-class, not an afterthought.

6. **Thin static client.** The client is built with SvelteKit using `adapter-static`, producing plain HTML/JS/CSS with zero runtime server. The output is served as static files by whatever backend is running (C# during Stage 0, Go from Stage 1 onward). No Node.js process in production.

7. **Staged delivery.** The system is built in incremental stages, each producing a working, testable milestone. No big-bang rewrite. Stage 0 replaces the client while keeping the existing server. Subsequent stages replace and extend the server.

8. **Preserve proven game logic.** The shuffle algorithm, bidding alternation, card play rules, and scoring mechanics are ported faithfully from the existing C# implementation. Where the original works correctly, we replicate it — not reinvent it.

---

## 2. Clean Architecture Layers

The layer diagram below shows the **target state** (Go server, Stage 1+). During Stage 0, the Svelte client connects to the existing C# / SignalR server instead.

```
┌─────────────────────────────────────────────────────────────────┐
│                   Client (SvelteKit — static output)             │
│   Built with adapter-static → plain HTML/JS/CSS                 │
│   Served as static files by Go server (or C# during Stage 0)   │
│                                                                  │
│   /              /login        /lobby        /game/:id          │
│   /profile       /rankings     /history                         │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket (JSON) + REST (fetch)
                             │ (SignalR during Stage 0)
┌────────────────────────────┴────────────────────────────────────┐
│  INTERFACE / TRANSPORT LAYER                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  WS Handler  │  │  REST/HTTP   │  │  Middleware (auth,     │  │
│  │  (Gorilla)   │  │  (auth, OTP, │  │   rate-limit, session  │  │
│  │              │  │   profile,   │  │   cookie validation)   │  │
│  │              │  │   lobby,     │  │                        │  │
│  │              │  │   rankings)  │  │                        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────────┘  │
│         │                 │                                       │
│  DTO serialization, protocol framing, connection lifecycle        │
└─────────┼─────────────────┼─────────────────────────────────────┘
          │                 │
┌─────────┴─────────────────┴─────────────────────────────────────┐
│  APPLICATION LAYER (Use Cases / Services)                        │
│  ┌───────────────┐ ┌───────────────┐ ┌────────────────────────┐  │
│  │ AuthService    │ │ LobbyService  │ │ GameService            │  │
│  │ (OTP send,     │ │ (list tables, │ │ (join, bid, trump,     │  │
│  │  OTP verify,   │ │  create,      │ │  play, forfeit,        │  │
│  │  session mgmt, │ │  join/watch,  │ │  reconnect, state      │  │
│  │  guest login,  │ │  matchmake,   │ │  broadcast)            │  │
│  │  profile)      │ │  presence)    │ │                        │  │
│  └───────────────┘ └───────────────┘ └────────────────────────┘  │
│  ┌───────────────┐ ┌───────────────┐                             │
│  │ RankingService │ │ HistoryService│                             │
│  │ (rating calc,  │ │ (game log,   │                             │
│  │  leaderboard)  │ │  match data) │                             │
│  └───────────────┘ └───────────────┘                             │
│                                                                   │
│  Orchestrates domain objects. No business rules here —            │
│  delegates to domain layer. Manages transactions and events.      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│  DOMAIN LAYER (Entities + Business Rules)                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Core Entities                                               │ │
│  │  GameTable, Chair, Player, Deck, Card                        │ │
│  │  BidState, RoundState, TeamScore                             │ │
│  │  CoolieTracker, KodiTracker                                  │ │
│  │  TableConfig (variants: 4/6/8 players)                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Domain Services (stateless rule engines)                    │ │
│  │  BiddingRules, CardPlayRules, TrumpRules                     │ │
│  │  ScoringEngine, CoolieKodiEngine                             │ │
│  │  DealerRotation, DeckShuffler                                │ │
│  │  GameLifecycle (state machine transitions)                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Repository Interfaces (ports)                               │ │
│  │  PlayerRepository, GameHistoryRepository,                    │ │
│  │  RankingRepository, SessionRepository                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Domain Events                                               │ │
│  │  GameStarted, BidPlaced, TrumpSelected, CardPlayed,          │ │
│  │  RoundCompleted, GameCompleted, KodiInstalled, ...           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Pure Go. No imports from infrastructure. Fully testable.         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│  INFRASTRUCTURE LAYER (Adapters)                                 │
│  ┌───────────────┐ ┌───────────────┐ ┌────────────────────────┐  │
│  │  PostgreSQL    │ │  Redis        │ │  WebSocket Broadcaster │  │
│  │  (accounts,    │ │  (sessions,   │ │  (per-table fan-out,   │  │
│  │   history,     │ │   OTP codes,  │ │   personalized state   │  │
│  │   rankings)    │ │   lobby       │ │   serialization)       │  │
│  │               │ │   presence,   │ │                        │  │
│  │               │ │   pub/sub)    │ │                        │  │
│  └───────────────┘ └───────────────┘ └────────────────────────┘  │
│  ┌───────────────┐ ┌───────────────┐                             │
│  │  Email (OTP)   │ │  Static File  │                             │
│  │  Resend / SES  │ │  Server       │                             │
│  └───────────────┘ └───────────────┘                             │
│                                                                   │
│  Implements domain interfaces. Depends on domain, never reverse.  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Entity Mapping

This section maps domain concepts from `DOMAIN_KNOWLEDGE.md` to Go structures and persistence targets.

### 3.1 Core Game Entities (Domain Layer — in-memory during play)

| Domain Concept | Go Type | Key Fields | Source Reference |
|---|---|---|---|
| **GameTable** | `type GameTable struct` | ID, Config, Stage, Chairs[], BidState, Rounds[], Deck, TrumpCard, TrumpExposed, TeamScores[2], CoolieCount[2], KodiIrakkamRound[2], DealerPos, WinningTeam | §3.1 GameTable entity |
| **Chair** | `type Chair struct` | Position, Occupant *Player, Watchers []*Player, Cards []Card, KodiCount, KodiJustInstalled | §3.1 Chair entity |
| **TableConfig** | `type TableConfig struct` | Variant(4/6/8), MaxPlayers, PlayersPerTeam, DeckSize, Ranks[], Suits[], BaseCoolieCount | §4.1 Table Variants |
| **Card** | `type Card struct` | Suit, Rank | §4.2 Card Point Values |
| **Deck** | `type Deck struct` | Cards []Card | §4.3 Deck and Dealing |
| **BidState** | `type BidState struct` | HighBid, HighBidder, NextBidder, NextMinBid, OutBidChance[], BidHistory[] | §3.1 BidInfo |
| **BidEntry** | `type BidEntry struct` | Position, Bid (0=pass) | §3.1 BidPass |
| **RoundState** | `type RoundState struct` | FirstPlayer, NextPlayer, PlayedCards[], TrumpExposedDuringPlay[], Winner, Score | §3.1 RoundInfo |
| **GameStage** | `type GameStage int` | WaitingForPlayers, Bidding, SelectingTrump, PlayingCards, GameOver | §5.1 State Machine |

### 3.2 Player and Account (persisted in PostgreSQL)

| Domain Concept | Go Type | DB Table | Notes |
|---|---|---|---|
| **Player** (account) | `type Player struct` | `players` | ID (UUID), email, display_name, avatar_url, is_guest, language, created_at. Replaces the original anonymous GUID. |
| **ConnectedPlayer** (in-game) | `type ConnectedPlayer struct` | — (in-memory) | PlayerID, ConnectionID, Name, Language, Position, IsWatcher. Ephemeral; tied to a WebSocket session. Links back to Player for persistence. |
| **GameRecord** (NEW) | `type GameRecord struct` | `matches` | ID, table_config_variant, started_at, ended_at, was_cancelled, was_forfeited, winning_team, bid_value, bid_stage, trump_suit. |
| **GameParticipant** (NEW) | `type GameParticipant struct` | `match_players` | MatchID, PlayerID, position, team, was_bidder, rating_before, rating_after, rating_delta. |
| **PlayerRating** (NEW) | `type PlayerRating struct` | `player_ratings` | PlayerID, rating, games_played, games_won, games_as_bidder, bids_won, bids_lost, etc. Derived from match history. |

### 3.3 Lobby Entities (Redis + in-memory)

| Domain Concept | Go Type | Storage | Notes |
|---|---|---|---|
| **TableListing** | `type TableListing struct` | Redis hash | TableID, Name, Variant, PlayerCount, MaxPlayers, WatcherCount, IsPrivate, Stage. Published to lobby clients. |
| **LobbyPresence** | — | Redis sorted set | PlayerID → last-seen timestamp. Powers "N players online" and lobby population. |

### 3.4 Team and Position Logic (pure functions, no struct needed)

Per §3.2: `TeamOf(position) = position % 2`. Even chairs → Team 0, odd → Team 1. This is a stateless function in the domain layer, not a persisted entity. Same for `NextDealer`, `PlayersPerTeam`, etc.

---

## 4. Major Processes → System Components

### 4.1 Authentication: Email OTP (NEW)

**Not in original system.** Replaces the anonymous GUID identity model.

**No passwords.** Users authenticate by entering their email address and receiving a one-time code. This eliminates password hashing, strength validation, reset flows, and credential storage liability.

| Step | Component | Detail |
|---|---|---|
| Request OTP | `AuthService` → Redis (code storage) → Email provider | User submits email. Server generates 6-digit code, stores hash in Redis with 10-min TTL, sends email. Always returns 200 (prevents email enumeration). |
| Verify OTP | `AuthService` → Redis (code lookup) → PostgreSQL (player upsert) | User submits email + code. Server validates hash + TTL. If valid: find-or-create Player record, create session. Max 5 attempts per code. |
| Session creation | `AuthService` → Redis (session storage) | Generate 256-bit random token. Store SHA-256 hash in Redis with 30-day TTL (sliding). Set `session_id` cookie: HttpOnly, Secure, SameSite=Lax. |
| Session validation | Auth middleware → Redis | Every REST request and WebSocket upgrade: read cookie, hash token, lookup in Redis. If valid: attach PlayerID to request context. Refresh TTL on activity. |
| Guest play | `AuthService` → PostgreSQL + Redis | Create Player with `is_guest = true`, auto-generated name ("Guest_XXXX"). Session cookie with 24-hour TTL. Guest can later claim the account by verifying an email — same PlayerID is preserved. |
| Logout | `AuthService` → Redis | Delete session from Redis. Clear cookie. |
| Profile update | `AuthService` → PostgreSQL | Update display_name, avatar_url. |

**Session in Redis (not PostgreSQL):** Sessions are high-frequency reads (every request) with short lifetimes. Redis is the natural fit. PostgreSQL stores durable player data only.

**WebSocket auth:** On WS connect, the browser sends the cookie automatically (same origin). Server validates session via Redis before upgrading to WS. The resolved PlayerID is attached to the connection for its lifetime.

**Multiple devices:** Each device gets its own session token. All valid simultaneously.

**Note:** Auth does not exist during Stage 0 (existing C# server) or Stage 1 (Go game engine only). It is introduced in Stage 2. See §8.

### 4.2 Lobby (NEW)

**Partially existed (matchmaking) but no lobby UI.** The new system has an explicit lobby where players can see available tables before joining.

| Process | Component | Mechanism |
|---|---|---|
| List tables | `LobbyService` → Redis | Reads all active `TableListing` entries. Pushes updates via a dedicated lobby WebSocket channel. |
| Create table | `LobbyService` → `GameService` | Creates `GameTable` in memory + publishes listing to Redis. Private tables get a shareable code/link. |
| Join table (play) | `LobbyService` → `GameService` | Validates seat availability, assigns chair, broadcasts updated state. |
| Join table (watch) | `LobbyService` → `GameService` | Round-robin watcher assignment (§4.11). |
| Matchmaking (public) | `LobbyService` | Finds a public table with a free seat for the requested variant. Creates one if none exist. Same logic as original `GetFreeTable`. |
| Lobby presence | Redis sorted set + pub/sub | Player count, table count, real-time lobby updates. |

**Decision:** The lobby is a separate WebSocket "room" from game tables. When a player joins a table, they leave the lobby channel and join the table channel. This cleanly separates lobby broadcasting (many recipients, low frequency) from game broadcasting (few recipients, high frequency).

**Note:** The lobby is introduced in Stage 3. During Stage 0 and Stage 1, table joining uses the same mechanism as the current system (URL parameters / simple join page).

### 4.3 Game Lifecycle (core loop, mapped from §5.1)

```
LobbyService.JoinTable()
  → GameService.AddPlayer(table, player, chair)
    → if table full: GameService.StartGame()
      → Deck.Shuffle() + Deck.Validate() + Deck.Deal()
      → GameTable.Stage = Bidding
      → Broadcast state

GameService.PlaceBid(player, bidValue)
  → BiddingRules.ValidateBid(table.BidState, player, bidValue)
  → BidState.Apply(bid)
  → BiddingRules.DetermineNextBidder(table)
  → if bidding complete: transition to SelectingTrump or PlayingCards(Thani)
  → Broadcast state

GameService.SelectTrump(player, card)
  → TrumpRules.ValidateSelection(table, player, card)
  → table.TrumpCard = card, remove from hand
  → TrumpRules.ValidateOpposingTeamHasTrumpSuit(table)
    → if not: cancel game
  → table.Stage = PlayingCards, first player = dealer
  → Broadcast state

GameService.PlayCard(player, card)
  → CardPlayRules.ValidatePlay(table, round, player, card)
  → round.PlayedCards.Append(card, player)
  → if round complete:
    → ScoringEngine.ScoreRound(round, trumpSuit, trumpExposed)
    → if game-over condition met:
      → ScoringEngine.ScoreGame(table)
      → CoolieKodiEngine.ApplyGameResult(table, winningTeam, bidStage)
      → HistoryService.RecordGame(table)
      → RankingService.UpdateRatings(participants)
      → table.Stage = GameOver
    → else: start next round
  → Broadcast state

GameService.ShowTrump(player)
  → TrumpRules.ValidateExposure(table, round, player)
  → table.TrumpExposed = true
  → return trump card to bidder's hand
  → enforce MustPlayTheTrumpCard for bidder
  → enforce MustPlayTrumpSuit for exposer
  → Broadcast state
```

Each of these steps executes **under a per-table mutex** (the Go equivalent of the original `lock(Game)`). More on this in §5.

### 4.4 State Broadcasting

The original system's `StateUpdatedDelegate` pattern maps to:

```
GameService (after any mutation)
  → StateBroadcaster.BroadcastTableState(table)
    → for each chair:
      → if occupant: serialize personalized state → send to occupant's WS conn
      → for each watcher: serialize same personalized state → send to watcher's WS conn
```

**Personalization rules (from §3.3):**
- Each player sees only their own cards (from their chair).
- Trump card visible only to high bidder OR when exposed.
- Watchers see exactly what their chair's occupant sees.
- Deck contents, OutBidChance, KodiIrakkamRound are never sent.

**Decision:** State serialization is a domain concern (it encodes visibility rules). The `PersonalizedStateView` struct lives in the domain layer. The infrastructure layer simply serializes it to JSON and pushes it over WebSocket.

### 4.5 Disconnection and Reconnection (from §5.5)

| Event | Action |
|---|---|
| WebSocket drops | Remove player from active connections map. Chair retains cards and position. Game pauses (cannot proceed with empty chair). |
| Player reconnects (same PlayerID via session) | Look up their table in Redis session map. Re-associate new WS connection to existing Chair. Push full state. |
| Timeout (e.g., 5 minutes) | Remove player from chair. If mid-game, game remains paused waiting for replacement. |

**Improvement over original:** The original lost player identity on page refresh (no localStorage, GUID-based). With email OTP + session cookies, reconnection is reliable. Redis stores `PlayerID → {TableID, Position}` for fast lookup on reconnect.

**Stage 0 note:** During Stage 0 (Svelte client on C# server), reconnection behavior remains unchanged from the original — identity is still GUID-based. Reliable reconnection arrives with Stage 2 (auth + sessions).

### 4.6 Auto-Play (from §5.7)

Three mechanisms preserved from the original, plus one new addition. All server-side:

1. **Forced-move hint:** If a player has exactly one legal card, server sets `AutoPlayHint` in their state. Client shows a countdown; if player doesn't act within N seconds, server auto-plays it. (Original used client-side 5s timer — we move the timer server-side for authority.)

2. **Auto-complete:** When trump is exposed and remaining cards have deterministic outcomes (all highest-rank), server plays remaining rounds instantly. Disabled for Thani per §5.7.

3. **AFK timeout (NEW):** If it's a player's turn and they don't act within a configurable timeout (e.g., 30s), server auto-plays the forced card if one exists, or auto-passes in bidding. This prevents griefing. Not in original — flagging as a new addition.

---

## 5. Key Architectural Decisions

### 5.1 Per-Table Mutex Instead of Global Lock

**Source:** §6.5 — original used `lock(Game)` on shared GameTable reference.

**Decision:** Each `GameTable` has its own `sync.Mutex`. All mutations on a table acquire this mutex. Different tables are fully concurrent. This directly mirrors the original's behavior (same-object monitor) but is explicit rather than implicit.

```go
type GameTable struct {
    mu sync.Mutex  // guards all state below
    // ... game state fields
}
```

Why not channels? A mutex is simpler for request-response patterns where a WebSocket handler needs to validate, mutate, and respond synchronously. Channels would add complexity without benefit here.

### 5.2 Data Storage Responsibilities

| Data | Storage | Reasoning |
|---|---|---|
| Active game table state | In-memory (Go structs) | Game state mutates many times per second during play. In-memory is necessary for performance. Lost on server restart — acceptable per requirements. |
| Sessions | Redis (hash, TTL-managed) | High-frequency reads on every request. Ephemeral by nature. TTL handles expiry automatically. |
| OTP codes | Redis (hash, TTL-managed) | Short-lived (10 min), high-frequency during login. TTL handles expiry. |
| Lobby listings | Redis hashes + pub/sub | Many lobby clients need to see table updates. Redis pub/sub is a natural fit. |
| Player presence | Redis sorted set | PlayerID → last-active timestamp. Powers "N players online" and lobby population. |
| Reconnection mapping | Redis hash | PlayerID → {TableID, Position}. Fast lookup on WebSocket reconnect. |
| Player accounts | PostgreSQL | Durable, relational. Standard CRUD. |
| Match history | PostgreSQL | Append-only log of completed games. Written once at game end. |
| Rankings / ratings | PostgreSQL | Derived from match history. Updated at game end. Leaderboard queries benefit from SQL. |

### 5.3 WebSocket Protocol Design

**Two protocols exist across the project's life:**

**Stage 0 — SignalR (existing C# server):** The Svelte client speaks the existing SignalR protocol. The `@microsoft/signalr` npm package is used in the client to connect to `/Cards56Hub`. All 11 hub methods and 3 events are called as-is, including the `roundOverDelay` parameter, the ace encoding mismatch (Svelte handles the 1↔14 translation), and the `UnregiterPlayer` typo. The goal is behavioral parity with the jQuery client, not protocol improvement.

**Stage 1+ — Custom JSON-over-WebSocket (Go server):** SignalR is replaced with a simple typed JSON protocol over Gorilla WebSockets. The Svelte client's transport layer is swapped (see §5.10 for how this is structured).

**Message envelope (Stage 1+, both directions):**

```json
{
  "type": "message_type",
  "payload": { ... },
  "seq": 42
}
```

- `type`: String identifying the action or event.
- `payload`: Type-specific data.
- `seq`: Monotonically increasing sequence number (client→server). Server echoes it back in error responses for correlation. Server-initiated events use `seq: 0`.

**Client → Server messages (Stage 1+):**

| Original Method | New Message Type | Notes |
|---|---|---|
| RegisterPlayer | Handled by HTTP OTP flow | Not a game message anymore |
| JoinTable | `join_table` | `{ table_type, private_id?, watch_only }` |
| PlaceBid | `place_bid` | `{ bid }` — range 28–57 |
| PassBid | `pass_bid` | `{}` |
| SelectTrump | `select_trump` | `{ card }` — e.g. `"h11"` |
| PlayCard | `play_card` | `{ card }` — roundOverDelay eliminated |
| ShowTrump | `show_trump` | `{}` — roundOverDelay eliminated |
| StartNextGame | `start_next_game` | `{}` |
| RefreshState | `refresh_state` | `{}` |
| ForfeitGame | `forfeit` | `{}` |
| UnregisterPlayer | `leave_table` / WS close | Clean exit via message or disconnect |
| *(new)* | `ping` | `{}` — keepalive |

**Server → Client messages (Stage 1+):**

| Original Event | New Message Type | Notes |
|---|---|---|
| OnStateUpdated | `state` | Personalized game state JSON |
| OnError | `error` | `{ code, message, ref_seq }` |
| OnRegisterPlayerCompleted | *(removed)* | Handled by HTTP auth response |
| *(new)* | `joined` | `{ table_id, position, watch_only }` |
| *(new)* | `player_joined` | `{ position, name, avatar }` |
| *(new)* | `player_left` | `{ position }` |
| *(new)* | `lobby_update` | Table list changes (on lobby WS) |
| *(new)* | `pong` | Keepalive response |

### 5.4 Removing `Thread.Sleep` / `roundOverDelay`

**Source:** §4.8, §7.3 #1 — original used `Thread.Sleep(clientParam)` under lock, flagged as dangerous.

**Decision:** From Stage 1 onward, the server never sleeps. Round-over delay is purely a client-side animation concern. Server processes the round instantly and sends the result. The state update includes a `round_completed_at` timestamp; the client decides how long to animate before accepting input for the next round.

**Stage 0 note:** During Stage 0, the Svelte client sends `2000` as the `roundOverDelay` parameter to match the existing jQuery client behavior. This parameter is removed when the client migrates to the new protocol in Stage 1.

### 5.5 Shuffle Algorithm — Preserved from Original

**Source:** §4.3 — custom cut-and-move algorithm.

**Decision:** The shuffle algorithm is ported exactly as-is from the C# implementation. The cut-and-move approach (top-to-bottom, middle-to-bottom) repeated 30 times on a fresh deck, 6 times on re-shuffles, is replicated in Go with identical behavior. Per the domain expert: *"This method produced sufficient shuffle quality — many other attempts failed or were not as good."*

The shuffle validation rule is also preserved exactly: no player's hand may be all one suit. If detected, re-shuffle. The `while(true)` loop from the original is kept but with a safety cap (100 retries) and error logging to address the infinite loop risk flagged in §7.2 #5.

```go
// DeckShuffler lives in the domain layer.
// This is a direct port of the C# shuffle logic — not Fisher-Yates.
type DeckShuffler struct{}

func (s *DeckShuffler) Shuffle(deck []Card, freshDeck bool) []Card {
    iterations := 30
    if !freshDeck {
        iterations = 6
    }
    for i := 0; i < iterations; i++ {
        deck = cutAndMove(deck) // top-to-bottom, middle-to-bottom
    }
    return deck
}

func (s *DeckShuffler) ShuffleAndValidate(deck []Card, freshDeck bool, config TableConfig) ([]Card, [][]Card, error) {
    const maxRetries = 100
    for attempt := 0; attempt < maxRetries; attempt++ {
        shuffled := s.Shuffle(deck, freshDeck)
        hands := deal(shuffled, config.MaxPlayers)
        if !anyHandAllOneSuit(hands) {
            return shuffled, hands, nil
        }
    }
    return nil, nil, fmt.Errorf("shuffle validation failed after %d attempts", maxRetries)
}
```

The `new Random()` per shuffle call behavior from the original is preserved — each shuffle uses a fresh random seed. `math/rand` seeded from `crypto/rand` for non-reproducible shuffles.

### 5.6 Card Encoding

**Source:** §6.3 — original had server encoding Ace as rank 1, client library as rank 14, requiring translation.

**Two phases:**

**Stage 0 (C# server):** The Svelte client must handle the existing mismatch. Ace arrives from the server as rank `1`. The Svelte client translates to `14` for rendering and back to `1` when sending play actions. This translation lives in a single adapter module (`lib/adapters/signalr.ts`) — not spread across components.

**Stage 1+ (Go server):** Single encoding throughout. Ace is rank `14` everywhere — server, client, wire format. The translation adapter is removed. Wire format: string `"{suit_char}{rank}"` — e.g. `"h11"` = Jack of Hearts, `"s14"` = Ace of Spades.

```go
type Suit int
const (
    Hearts Suit = iota
    Spades
    Diamonds
    Clubs
)

type Rank int
const (
    Seven Rank = 7
    Eight Rank = 8
    Nine  Rank = 9
    Ten   Rank = 10
    Jack  Rank = 11
    Queen Rank = 12
    King  Rank = 13
    Ace   Rank = 14
)
```

### 5.7 Internationalization

**Source:** §6.4 — original used NGettext .po/.mo files with locale path inconsistencies.

**Decision:** Server sends locale-neutral structured data (error codes, suit enums, stage enums). Client handles all translation using JSON locale files loaded at startup. This eliminates the NGettext dependency and locale path issues.

Server-sent error messages include both a code and a default English message. The client can override with its locale bundle.

**Stage 0 note:** The existing C# server sends localized error messages. The Svelte client can use these directly or ignore them in favor of client-side locale lookup by error code.

### 5.8 No Silent Exception Swallowing

**Source:** §6.2 — `FirstBidderHasNoPointsException` and `OppositeTeamHasNoTrumpCardsException` were silently caught.

**Decision:** From Stage 1 onward, these are legitimate game events (cancellations), not errors. Model them as explicit state transitions: `GameStage → GameOver` with `CancellationReason` field (enum: `NoBidderPoints`, `NoTrumpSuitCards`). Broadcast to all clients as a normal state update with the reason. No exception swallowing needed — the domain layer returns a result type, not an exception.

**Stage 0 note:** The C# server continues to swallow these. The Svelte client detects cancellation from the state update (same as the jQuery client does).

### 5.9 SvelteKit Client Architecture

**Decision:** The client is built with SvelteKit using `adapter-static`. At build time, SvelteKit pre-renders all routes into static HTML files with accompanying JS bundles. The output is a directory of plain files with no runtime server dependency.

**Why SvelteKit + adapter-static (not a full SPA or raw Svelte):**
- SvelteKit provides file-based routing, layout components, and structured data loading — useful for the multi-page structure (login, lobby, game, profile, rankings).
- `adapter-static` produces HTML/JS/CSS that any HTTP server can host. During Stage 0 the C# server serves them from `wwwroot/`. During Stage 1+ the Go server serves them.
- Svelte's reactivity model (runes in Svelte 5) is ideal for the game state pattern: a single `$state` object updated by WebSocket messages, with the entire UI reacting declaratively.
- No Node.js process in production. The SvelteKit build runs only at development/CI time.

**Project structure:**

```
client/
├── svelte.config.js            # adapter-static config
├── vite.config.ts
├── package.json
├── static/                     # Static assets (copied as-is to output)
│   ├── img/
│   │   ├── avatars/            # Preset avatar images
│   │   └── icons/              # Kodi markers, suit icons, etc.
│   └── locale/
│       ├── en.json             # English strings
│       └── ml.json             # Malayalam strings
├── src/
│   ├── app.html                # HTML shell
│   ├── app.css                 # Global styles
│   ├── routes/
│   │   ├── +layout.svelte      # Shared layout (nav, auth state)
│   │   ├── +page.svelte        # Landing / home
│   │   ├── login/
│   │   │   └── +page.svelte    # Email + OTP flow
│   │   ├── lobby/
│   │   │   └── +page.svelte    # Table listings, create/join
│   │   ├── game/
│   │   │   └── [id]/
│   │   │       └── +page.svelte # Game UI (WebSocket-driven)
│   │   ├── profile/
│   │   │   └── +page.svelte    # Display name, avatar
│   │   ├── rankings/
│   │   │   └── +page.svelte    # Leaderboard
│   │   └── history/
│   │       └── +page.svelte    # Match history
│   └── lib/
│       ├── stores/
│       │   ├── auth.ts          # Session state (logged in, player info)
│       │   ├── game.svelte.ts   # Game state ($state rune, updated by WS)
│       │   └── lobby.svelte.ts  # Lobby state (table list, presence)
│       ├── transport/
│       │   ├── types.ts         # Message type definitions
│       │   ├── signalr.ts       # SignalR adapter (Stage 0 only)
│       │   ├── ws.ts            # Custom WS adapter (Stage 1+)
│       │   └── connection.ts    # Transport interface + factory
│       ├── adapters/
│       │   └── card-encoding.ts # Ace 1↔14 translation (Stage 0 only)
│       ├── components/
│       │   ├── Card.svelte      # SVG card component
│       │   ├── Hand.svelte      # Fan of cards in hand
│       │   ├── PlayArea.svelte  # Table surface + played cards
│       │   ├── Chair.svelte     # Player seat (name, bid, kodi)
│       │   ├── BidPanel.svelte  # Bid selection popup
│       │   ├── Scoreboard.svelte # Coolies, scores, targets
│       │   ├── TrumpDisplay.svelte # Trump card (hidden/shown)
│       │   ├── KodiMarkers.svelte  # Kodi display + animation
│       │   └── Avatar.svelte    # Player avatar
│       └── utils/
│           ├── i18n.ts          # Locale loading and string lookup
│           └── cards.ts         # Card utilities (sort, points, suit names)
```

### 5.10 Transport Abstraction (SignalR → Custom WS)

The Svelte client uses a **transport interface** that abstracts the underlying WebSocket protocol. This is the mechanism that allows the same UI components to work against both the C# SignalR server (Stage 0) and the Go WebSocket server (Stage 1+).

```typescript
// lib/transport/connection.ts

export interface GameTransport {
    connect(url: string, options?: TransportOptions): Promise<void>;
    disconnect(): void;
    onStateUpdate(callback: (state: GameState) => void): void;
    onError(callback: (error: GameError) => void): void;
    onConnectionChange(callback: (connected: boolean) => void): void;

    // Game actions — same set regardless of underlying protocol
    joinTable(tableType: number, privateId?: string, watchOnly?: boolean): void;
    placeBid(bid: number): void;
    passBid(): void;
    selectTrump(card: string): void;
    playCard(card: string): void;
    showTrump(): void;
    startNextGame(): void;
    forfeit(): void;
    leaveTable(): void;
    refreshState(): void;
}
```

**Two implementations:**

```typescript
// lib/transport/signalr.ts — Stage 0
// Uses @microsoft/signalr npm package.
// Connects to /Cards56Hub.
// Calls hub methods by name: connection.invoke("PlaceBid", bid)
// Handles ace encoding translation (1↔14).
// Sends roundOverDelay parameter on PlayCard/ShowTrump.
// Calls RegisterPlayer before JoinTable.
// Handles the "UnregiterPlayer" typo.

// lib/transport/ws.ts — Stage 1+
// Uses native WebSocket (or a thin reconnecting wrapper).
// Connects to /ws.
// Sends typed JSON messages: { type: "place_bid", payload: { bid }, seq }
// No ace translation. No roundOverDelay. No RegisterPlayer.
// Session auth via cookie (automatic).
```

**Switching transports:** A factory function reads a config flag (environment variable at build time, or a simple constant) and returns the appropriate implementation:

```typescript
// lib/transport/connection.ts
import { SignalRTransport } from './signalr';
import { WebSocketTransport } from './ws';

export function createTransport(): GameTransport {
    if (import.meta.env.VITE_TRANSPORT === 'signalr') {
        return new SignalRTransport();
    }
    return new WebSocketTransport();
}
```

All Svelte components interact only with the `GameTransport` interface. They never import SignalR or WebSocket directly. The transport switch from Stage 0 to Stage 1 is a one-line config change.

---

## 6. Redis Usage

| Key Pattern | Type | Purpose | TTL |
|---|---|---|---|
| `session:{token_hash}` | Hash | `{player_id, created_at, last_active}` | 30 days (sliding, refreshed on activity) |
| `otp:{email}` | Hash | `{code_hash, attempts, created_at}` | 10 minutes |
| `otp:rate:{email}` | String (counter) | Rate limit: max 5 OTP requests per hour per email | 1 hour |
| `player:table:{player_id}` | Hash | `{table_id, position, is_watcher}` — for reconnection lookup | None (deleted on leave/disconnect timeout) |
| `table:{table_id}` | Hash | Active table listing for lobby (variant, name, player count, stage) | None (deleted on table removal) |
| `lobby:tables` | Pub/Sub channel | Lobby update events (table created/removed/player count changed) | — |
| `presence:online` | Sorted Set | PlayerID → last-active timestamp. Powers "N players online" | Members expire via periodic cleanup goroutine |

---

## 7. PostgreSQL Usage

PostgreSQL stores only durable data that must survive server restarts: player accounts, match history, and ratings.

**Schema is not defined in this document.** Per the staged delivery approach (§8), the database schema will be designed when the relevant stage is reached. The architecture defines *what* goes in PostgreSQL (accounts, matches, ratings) and the repository interfaces that access it — not the table definitions. Schema design happens at implementation time for each stage.

**Repository interfaces (domain layer ports):**

```go
// PlayerRepository — implemented by infrastructure/postgres
type PlayerRepository interface {
    FindByID(ctx context.Context, id string) (*Player, error)
    FindByEmail(ctx context.Context, email string) (*Player, error)
    Create(ctx context.Context, player *Player) error
    Update(ctx context.Context, player *Player) error
}

// MatchRepository — implemented by infrastructure/postgres
type MatchRepository interface {
    RecordMatch(ctx context.Context, match *GameRecord, participants []GameParticipant) error
    FindByPlayerID(ctx context.Context, playerID string, limit, offset int) ([]GameRecord, error)
    FindByID(ctx context.Context, matchID string) (*GameRecord, []GameParticipant, error)
}

// RatingRepository — implemented by infrastructure/postgres
type RatingRepository interface {
    GetRating(ctx context.Context, playerID string) (*PlayerRating, error)
    UpdateRating(ctx context.Context, rating *PlayerRating) error
    GetLeaderboard(ctx context.Context, limit, offset int) ([]PlayerRating, error)
    GetRank(ctx context.Context, playerID string) (int, error)
}
```

These interfaces live in the domain layer. The PostgreSQL implementations live in the infrastructure layer. The schema behind them is an implementation detail that evolves with each stage.

---

## 8. Staged Development Plan

The system is built in stages. Each stage produces a working, deployable milestone. Stages are ordered by dependency — later stages build on earlier ones, but each stage is independently useful and testable.

### Stage 0: Svelte Client on Existing C# Server

**Goal:** Replace the jQuery/cards.js client with a modern Svelte client, running against the existing C# SignalR server. Functionally identical to the current system from the user's perspective, but with a modern, responsive, maintainable client.

**What's built:**
- SvelteKit project with `adapter-static`
- Transport layer: `SignalRTransport` implementation using `@microsoft/signalr`
- Card encoding adapter (ace 1↔14 translation)
- SVG card components (all ranks/suits + card back) replacing cards.js PINOCHLE
- Game page: table layout, hand display, played cards, bid panel, scoreboard
- Kodi display + animation
- Trump display (hidden/revealed)
- Join page: table type selection, private table name, player name, play/watch toggle, language
- Responsive CSS: mobile portrait + desktop layouts
- Bilingual UI (Malayalam + English) via client-side JSON locale files

**What's NOT built:** Go server, auth, lobby, profiles, history, rankings, Redis, PostgreSQL.

**Deployment:** The SvelteKit build output (`build/` directory) is copied into the C# project's `wwwroot/` as a new path (e.g., `/v2/`). The existing jQuery client remains at `/` for rollback. Both clients connect to the same SignalR hub. Players can be directed to `/v2/` to try the new client.

**Done when:** A full game (all variants: 4/6/8 players) can be played through the Svelte client with the C# server, including: bidding (all stages + Thani), trump selection + exposure, card play with all validation, auto-play, forfeit, watchers, coolie/kodi, reconnection (within SignalR limits), and language switching. Mobile layout works on phone-sized screens.

**What this validates:**
- All Svelte components render correctly against real game state.
- The transport abstraction works — SignalR flows through the same interface that custom WS will use later.
- SVG card rendering is a viable replacement for cards.js.
- The responsive layout works on actual devices.

### Stage 1: Go Game Engine + Protocol Migration

**Goal:** Replace the C# server with Go. Port the full game engine. Migrate the Svelte client from SignalR to the new JSON-over-WebSocket protocol.

**What's built:**
- Go project structure (clean architecture layers, package layout)
- Domain layer: all game entities, all rule engines (bidding, card play, trump, scoring, coolie/kodi, Thani, auto-play, shuffle — ported from C#)
- In-memory game registry (map of tables, per-table mutex)
- WebSocket hub (Gorilla): connection lifecycle, message routing, state broadcast
- Transport layer: `WebSocketTransport` implementation in Svelte client
- Static file serving from Go (serves SvelteKit build output)
- Basic table join (same mechanism as current — URL parameters / simple join page)
- Docker container: Go server only (no Postgres, no Redis yet)

**What changes from Stage 0:**
- `VITE_TRANSPORT` config switches from `signalr` to `ws`.
- `SignalRTransport` code remains but is no longer used. Can be removed or kept for reference.
- Card encoding adapter removed — Go server uses unified encoding (ace=14).
- `roundOverDelay` parameter removed — server controls timing.
- The C# server is retired.

**What's NOT built:** Auth, lobby, profiles, history, rankings, Redis, PostgreSQL.

**How players connect:** Same as current — enter name, pick table type, optionally enter private table name. Identity is the WebSocket connection. No persistence. This is the "verify the Go engine is correct" stage.

**Done when:** All game scenarios that passed in Stage 0 also pass against the Go server with the new protocol. The game is functionally identical.

**Tests:** Exhaustive unit tests for every domain service. Integration tests that simulate multi-player game sequences via WebSocket. These tests are the permanent regression suite for all future stages.

### Stage 2: Auth + Sessions + Redis

**Goal:** Players can log in via email OTP, maintain sessions across page refreshes, and reconnect to games reliably.

**What's built:**
- Redis integration (Docker Compose adds Redis)
- AuthService: OTP send/verify, session management, guest play
- Session middleware: cookie validation on REST and WebSocket
- Login page in SvelteKit (`/login` route)
- Profile page in SvelteKit (`/profile` route) — display name, avatar selection/upload
- PostgreSQL integration (Docker Compose adds Postgres)
- `players` table (accounts only — minimal schema)
- Reconnection: Redis-backed player→table mapping, 5-minute window

**What changes from Stage 1:** Game page now requires a session cookie. Players are identified by PlayerID (from DB) instead of ephemeral connection. Page refresh reconnects to the same seat. Guest play available for quick access.

### Stage 3: Lobby

**Goal:** Players can browse available tables, see who's playing, create private tables, and join via the lobby.

**What's built:**
- LobbyService: table listing, creation, matchmaking, presence
- Redis lobby keys: table listings, pub/sub for updates, presence sorted set
- Lobby WebSocket channel (separate from game WS)
- Lobby page in SvelteKit (`/lobby` route): real-time table list, player counts, create/join buttons
- Private table sharing (link/code)
- Landing page updated with navigation to lobby/login

**What changes:** Table creation moves from URL parameters to the lobby. Public matchmaking works. Players see a live view of available games.

### Stage 4: Match History + Rankings

**Goal:** Completed games are recorded. Players accumulate ratings and appear on a leaderboard.

**What's built:**
- HistoryService: record match at game end (async, fire-and-forget)
- `matches` + `match_players` tables in PostgreSQL
- RankingService: rating calculation (modified Elo with bidder multipliers)
- `player_ratings` table in PostgreSQL
- Rankings page in SvelteKit (`/rankings` route)
- History page in SvelteKit (`/history` route)
- Profile page updated with stats (win rate, bid success rate, rating)

**Rating system details:**
- Base rating: 1200
- K-factor: 32 (higher for players with < 30 games for faster calibration)
- Bidder multiplier: 1.3× (win or loss)
- Bid stage bonuses: +0/+2/+4/+6/+10 for stages 1–5
- Thani bidder multiplier: 1.5×
- Cancelled games: no rating change
- Guests: no rating stored; treated as 1200 for opponents' calculations

### Stage 5: Polish + Mobile + Production Hardening

**Goal:** Production readiness, responsive polish, and operational baseline.

**What's built:**
- Touch interaction refinement for card play on mobile
- Card animation polish (deal, play, trick collection) via Svelte transitions
- TLS via Caddy (reverse proxy, auto-HTTPS)
- Rate limiting middleware
- Health checks and basic monitoring
- Error handling audit, edge case testing
- Localization review (Malayalam + English)
- Kodi installation animation, round-over animation

### Stage 6+ (Future, Not Planned in Detail)

| Feature | Trigger to Start |
|---|---|
| Native mobile apps | User demand or mobile browser limitations |
| Multi-server scaling | >500 concurrent tables |
| Push notifications ("your turn") | Mobile app development |
| Social features (friends, invites) | After ranking system is validated |
| Replay / spectate past games | After match recording is stable |
| Forfeit team-consent vote | Community feedback |

---

## 9. Go Package Structure

```
cards56/
├── cmd/
│   └── server/
│       └── main.go                  # Entry point, wire up DI, start HTTP+WS
│
├── internal/
│   ├── domain/                      # DOMAIN LAYER — zero external deps
│   │   ├── entity/
│   │   │   ├── card.go              # Card, Suit, Rank, points, comparison
│   │   │   ├── deck.go              # Deck, shuffle (preserved from C#), validate, deal
│   │   │   ├── table.go             # GameTable, Chair, GameStage
│   │   │   ├── bid.go               # BidState, BidEntry, bid stages
│   │   │   ├── round.go             # RoundState, played cards
│   │   │   ├── player.go            # Player (account), ConnectedPlayer (in-game)
│   │   │   ├── coolie.go            # CoolieTracker
│   │   │   ├── kodi.go              # KodiTracker
│   │   │   └── config.go            # TableConfig (4/6/8 variants)
│   │   ├── rule/
│   │   │   ├── bidding.go           # BiddingRules: validate, next bidder, alternation
│   │   │   ├── cardplay.go          # CardPlayRules: follow suit, trump restrictions
│   │   │   ├── trump.go             # TrumpRules: selection, exposure, must-play
│   │   │   ├── scoring.go           # ScoringEngine: round scoring, game-over
│   │   │   ├── coolie_kodi.go       # CoolieKodiEngine: transfer, install, remove
│   │   │   ├── thani.go             # ThaniRules: special mode overrides
│   │   │   ├── autoplay.go          # Auto-play detection
│   │   │   └── lifecycle.go         # State machine transitions
│   │   ├── event/
│   │   │   └── events.go            # Domain events (GameStarted, BidPlaced, etc.)
│   │   └── port/
│   │       ├── repository.go        # PlayerRepo, MatchRepo, RatingRepo interfaces
│   │       ├── session.go           # SessionStore interface
│   │       └── broadcaster.go       # StateBroadcaster interface
│   │
│   ├── application/                 # APPLICATION LAYER — use cases
│   │   ├── auth_service.go          # OTP send/verify, session mgmt, guest, profile
│   │   ├── lobby_service.go         # List/create/join tables, matchmaking, presence
│   │   ├── game_service.go          # All game actions (bid, play, trump, etc.)
│   │   ├── history_service.go       # Record completed games
│   │   ├── ranking_service.go       # Update ratings, leaderboard
│   │   └── state_view.go           # PersonalizedStateView builder
│   │
│   ├── infrastructure/              # INFRASTRUCTURE LAYER — adapters
│   │   ├── postgres/
│   │   │   ├── player_repo.go
│   │   │   ├── match_repo.go
│   │   │   ├── rating_repo.go
│   │   │   └── migrations/          # SQL migration files (added per stage)
│   │   ├── redis/
│   │   │   ├── session_store.go     # Session CRUD with TTL
│   │   │   ├── otp_store.go         # OTP code storage with TTL
│   │   │   ├── lobby_store.go       # Table listings, pub/sub
│   │   │   ├── presence.go          # Online player tracking
│   │   │   └── reconnect_store.go   # PlayerID → table mapping
│   │   ├── email/
│   │   │   └── otp_sender.go        # Resend/SES adapter for sending OTP emails
│   │   └── websocket/
│   │       ├── hub.go               # Connection registry, per-table rooms
│   │       ├── client.go            # Single WS connection handler
│   │       ├── broadcaster.go       # Implements domain StateBroadcaster
│   │       └── protocol.go          # Message types, JSON (de)serialization
│   │
│   └── transport/                   # INTERFACE/TRANSPORT LAYER
│       ├── http/
│       │   ├── router.go            # REST routes (auth, profile, leaderboard)
│       │   ├── auth_handler.go      # OTP request, verify, logout
│       │   ├── profile_handler.go   # Profile CRUD, avatar upload
│       │   ├── lobby_handler.go     # REST endpoints for lobby (if any)
│       │   ├── ranking_handler.go   # Leaderboard, player rank
│       │   ├── history_handler.go   # Match history
│       │   ├── static.go            # Static file server (serves SvelteKit build output)
│       │   └── middleware.go        # Session validation, rate limiting
│       └── ws/
│           ├── game_handler.go      # WS upgrade, game message dispatch
│           └── lobby_handler.go     # WS upgrade, lobby message dispatch
│
├── client/                          # SvelteKit project (see §5.9 for structure)
│   ├── svelte.config.js
│   ├── package.json
│   ├── src/
│   └── build/                       # Output: static HTML/JS/CSS (gitignored)
│
└── go.mod
```

**Build and deploy flow:**

```
1. cd client/ && npm run build     → produces client/build/
2. cp -r client/build/ static/     → Go server serves from static/
3. go build -o cards56 ./cmd/server
4. Docker: multi-stage build does both steps
```

---

## 10. Architectural Risks and Complexity

### 10.1 Bidding Alternation Logic

**Source:** §4.4, §5.3 — the most complex rule in the domain.

The bidding alternation (anti-clockwise, team-based passing, stage-jump minimums, OutBidChance tracking) is the single most intricate piece of business logic. In the original it's a dense function with multiple branches.

**Risk:** Incorrect implementation leads to stuck games (no valid next bidder) or rule violations.

**Mitigation:** This gets exhaustive unit tests. Model the bidding state machine explicitly with a `DetermineNextBidder(BidState, TableConfig) → (nextPosition, nextMinBid, biddingComplete)` function. Test against the full example from §5.3 plus edge cases (all players pass immediately, Thani bid, stage jumps).

### 10.2 Trump Exposure Cascade

**Source:** §4.6 — trump exposure triggers multiple simultaneous constraints.

When trump is exposed: (a) trump card returns to bidder's hand, (b) exposer must play trump suit, (c) bidder must play the trump card itself in the current round, (d) trump leading restriction is lifted. These interact in the same round and must be tracked per-play.

**Mitigation:** `TrumpExposedDuringPlay` flag on each play within a round (same as original `RoundInfo.TrumpExposed` per-play list). Test all combinations.

### 10.3 Thani Mode Divergences

**Source:** §4.7 — Thani overrides many normal rules.

Thani changes: no trump, bidder plays alone (teammates skipped), 1 point per round instead of card points, must win all 8, winner mapping formula is fragile. Coolies reset regardless.

**Mitigation:** Isolate Thani rules in `thani.go`. Use a strategy/policy pattern: `GameTable` delegates to either `NormalRules` or `ThaniRules` based on bid value. This prevents Thani special-cases from polluting normal game logic.

### 10.4 Reconnection Consistency

If a player disconnects mid-game and another player joins the empty chair (§4.12), the new player inherits the old player's cards. But with auth, the original player could also try to reconnect.

**Decision:** If the original player's session is still valid and within the reconnection timeout (5 minutes), they reclaim the seat and the replacement is bumped to watcher. After timeout, the seat is permanently reassigned. The reconnection mapping in Redis (`player:table:{player_id}`) is the source of truth.

### 10.5 Shuffle Algorithm Port Fidelity

**Risk:** The cut-and-move shuffle is custom and not described in mathematical terms. Porting from C# to Go requires exact behavioral equivalence, not just "similar shuffling."

**Mitigation:** Write the C# shuffle as pseudocode in `DOMAIN_KNOWLEDGE.md` (Phase 1 action item). Port to Go from the pseudocode. Create a test that runs both implementations on an identical seed and verifies identical output sequences. If the C# implementation uses `System.Random` with a specific seed, the Go port must produce the same sequence given the same seed — or if exact seed reproduction isn't possible (different RNG algorithms), verify statistical equivalence plus the validation rule (no all-one-suit hands).

### 10.6 SignalR Compatibility (Stage 0)

**Risk:** The Svelte client must speak the exact SignalR protocol the C# server expects. SignalR's wire format includes negotiation, handshake messages, and specific framing that the `@microsoft/signalr` client library handles — but subtle mismatches (version, transport negotiation) could cause silent failures.

**Mitigation:** Use the official `@microsoft/signalr` npm package (same version the current client loads from CDN). Test against the actual C# server, not a mock. The transport abstraction (§5.10) ensures that any SignalR quirks are isolated in `signalr.ts` and don't leak into components.

### 10.7 Rating System Design

The rating system is new — no prior art in this domain. Key decisions already made (see §8, Stage 4):
- Modified Elo with bidder multipliers and bid stage bonuses.
- Cancelled games: no rating change.
- Guests: no rating; treated as 1200 for opponents.
- Thani: higher multiplier (1.5× vs 1.3×).

**Risk:** The multipliers and bonuses may need tuning after observing real play patterns. The initial values are starting points.

**Mitigation:** Make the rating constants configurable (not hardcoded). Monitor rating distribution after launch and adjust.

---

## 11. Flagged Ambiguities from Domain Knowledge

These need clarification before implementation of the relevant stage:

| # | Ambiguity | Section | Affects Stage | Why It Matters |
|---|---|---|---|---|
| 1 | **Replacement player timing** (§7.2 #4) | When a new player joins a mid-game empty chair, do they immediately become the active player if it was that chair's turn? | Stage 0, 1 | Affects game flow and UX. |
| 2 | **Maximum Kodi count** (§7.2 #3) | UI renders up to 14. Is there a logical cap? | Stage 0 | Client rendering and domain validation. |
| 3 | **Can Thani games be cancelled?** (§7.2 #2) | Appears impossible via current rules. Should we enforce this as invariant? | Stage 1 | Simplifies Thani logic if confirmed. |
| 4 | **Forfeit team consent** (§7.3 #22) | Any one player can forfeit for the whole team. Is this intentional for the new system? | Stage 1 | Could add a vote mechanism in a later stage. |
| 5 | **Reconnection priority** (new) | Original player vs replacement player — who gets the seat? | Stage 2 | Decision made in §10.4 — original player wins within timeout. |
| 6 | **Guest account claiming** | When a guest verifies email, do we merge match history played as guest into their permanent record? | Stage 2 + 4 | Affects whether guest games count toward rankings. |

---

## 12. Summary of What's New vs. Original

| Aspect | Original | New System |
|---|---|---|
| Auth | None (anonymous GUID) | Email OTP + session cookies |
| Persistence | None (in-memory only) | PostgreSQL (accounts, history, ratings) + Redis (sessions, lobby, presence) |
| Lobby | Implicit matchmaking | Explicit lobby with table list, presence, pub/sub |
| Rankings | None | Modified Elo with bidder/stage bonuses |
| Game history | None | Full match records in PostgreSQL |
| Client framework | jQuery 1.7 + opaque cards.js | SvelteKit (adapter-static) + SVG cards |
| Client delivery | Served by app server | Pre-built static files, served by any HTTP server |
| Layout | Fixed 1000×700px | Responsive (mobile + desktop) |
| Thread.Sleep | Under lock, client-controlled delay | Eliminated — client-side animation only |
| Shuffle | Custom cut-and-move (C#) | Same algorithm, ported to Go (preserved) |
| Card encoding | Server=1, Client=14 for Ace | Unified: Ace=14 everywhere |
| i18n | Server-side NGettext | Client-side JSON locale files |
| Reconnection | Lost on page refresh | Reliable via session cookie + Redis mapping |
| Transport | SignalR | Gorilla WebSockets with typed JSON |
| Error handling | Exception swallowing | Explicit result types + state transitions |
| Testing | Manual multi-tab | Automated unit + integration tests |
| Guest play | N/A | Supported, claimable via email verification |
| Round-over delay | `Thread.Sleep(clientParam)` | Server sends timestamp, client animates |
| Migration path | Big-bang | Staged: Svelte on C# → Go engine → auth → lobby → rankings |

---

## 13. Reference: Domain Knowledge Dependencies

This document does not redefine game rules. The following sections of `DOMAIN_KNOWLEDGE.md` are authoritative and should be referenced directly during implementation:

| Implementation Task | Domain Knowledge Section |
|--------------------|------------------------|
| Game state machine | §5.1 Game Lifecycle State Machine |
| Bidding alternation + OutBidChance | §4.4 Bidding Rules |
| Card play validation (follow suit, trump) | §4.6 Card Play Rules |
| Trump exposure mechanics | §4.6 (exposure subsection) |
| Thani mode | §4.7 Thani |
| Round processing + winner determination | §4.8 Round Processing |
| Coolie transfer + Kodi installation/removal | §4.10 Coolie and Kodi Mechanics |
| Deck shuffle + validation | §4.3 Deck and Dealing |
| Auto-play mechanisms | §5.7 Auto-Play Mechanisms |
| Game-over conditions | §4.9 Game-Over Conditions |
| Personalized state serialization | §3.3 Personalized State Serialization |
| Error codes (adapt for new protocol) | §6.8 Error Code Reference |
| Card point values | §4.2 Card Point Values |
| Table variants (4/6/8 config) | §4.1 Table Variants |
| Seating, watchers, player lifecycle | §4.11 Seating, Watchers, and Player Lifecycle |
| Mid-game departure and rejoining | §4.12 Mid-Game Departure and Rejoining |
| Dealer rotation | §4.13 Dealer Rotation |
| SignalR hub contract (Stage 0) | §6.2 Communication Protocol |
| Card encoding mismatch (Stage 0) | §6.3 Card Encoding |

---

*Architecture proposal for the 56 Cards rewrite. Companion to DOMAIN_KNOWLEDGE.md. Version 0.3 — April 2026.*
