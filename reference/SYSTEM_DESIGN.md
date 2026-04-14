# 56 Cards — System Design Document (Phase 2)

> **Companion to:** `DOMAIN_KNOWLEDGE.md` (game rules, state machine, business logic)  
> **Scope:** Architecture, tech stack, data model, API design, authentication, ranking, and migration plan for the full rewrite.  
> **Status:** Draft — April 2026

---

## 1. Design Principles

1. **Server-authoritative, client-dumb.** Preserve the current model: all game logic runs server-side. Clients render state and submit actions. No client-side validation of game rules.
2. **Game state is ephemeral; player data is persistent.** In-memory game state (tables, chairs, rounds) is acceptable to lose on restart. Player profiles, match history, and rankings survive in the database.
3. **Single server for now, separable later.** No distributed game state. But keep the persistent layer (Postgres) separate from the game process so a future split is possible.
4. **Mobile-first UI, desktop-capable.** The current 1000×700px fixed layout is replaced with a responsive design. The same web client works on phones and desktops. Native mobile apps are a future concern — the WebSocket API should be client-agnostic.
5. **Progressive identity.** Guests can play immediately. Authenticated users get profiles, rankings, and history. A guest session can be "claimed" by authenticating later.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Game server** | **Go 1.22+** | Goroutine-per-connection model maps directly to the current `lock(Game)` pattern. `sync.Mutex` per table replaces `lock(Game)`. Static binary → tiny Docker image. |
| **WebSocket** | **gorilla/websocket** or **nhooyr.io/websocket** | Mature Go WebSocket libraries. Replace SignalR with a thin JSON-over-WebSocket protocol. |
| **REST API** | **net/http** (stdlib) or **chi** router | For non-realtime operations: auth, profiles, match history, rankings. Keep it lightweight. |
| **Database** | **PostgreSQL 16** | Relational model for players, matches, rankings. `jsonb` for flexible match metadata. |
| **Migrations** | **golang-migrate** or **goose** | Version-controlled schema changes. |
| **Frontend** | **SvelteKit 2 (Svelte 5)** | Reactive state model fits the "receive full state, re-render" pattern. SSR for login/profile pages. Small bundle size matters for mobile. |
| **Styling** | **Tailwind CSS 4** | Utility-first, responsive-first. Replaces the current fixed-pixel CSS. |
| **Card rendering** | **SVG-based custom components** | Replace the opaque `cards.js` PINOCHLE library. SVG cards scale to any screen size. Each card is a Svelte component. |
| **Email delivery** | **Resend** or **AWS SES** | For OTP login codes. Minimal volume, low cost. |
| **Containerization** | **Docker** | Single-stage Go build. Multi-service via Docker Compose (Go server + Postgres). |
| **Reverse proxy** | **Caddy** or **nginx** | TLS termination, WebSocket proxying. Caddy auto-provisions Let's Encrypt certs. |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser/Mobile)                       │
│                                                                      │
│  SvelteKit App                                                       │
│  ├── /              Landing + login                                  │
│  ├── /play          Table join / matchmaking                         │
│  ├── /game/:id      Game UI (WebSocket-driven)                       │
│  ├── /profile       Player profile + avatar                          │
│  ├── /rankings      Leaderboard                                      │
│  └── /history       Match history                                    │
│                                                                      │
│  WebSocket ────────────────┐     REST (fetch) ──────────┐            │
└────────────────────────────┼─────────────────────────────┼───────────┘
                             │                             │
                        wss://api.../ws               https://api.../v1
                             │                             │
┌────────────────────────────┼─────────────────────────────┼───────────┐
│                        Go Server                                     │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │  WebSocket Hub   │  │   REST Handlers   │  │   Auth Middleware  │   │
│  │  (game actions)  │  │  (profiles, etc.) │  │  (cookie + token)  │   │
│  └────────┬────────┘  └────────┬─────────┘  └────────────────────┘   │
│           │                    │                                      │
│  ┌────────▼────────────────────▼─────────────────────────────────┐   │
│  │                     Service Layer                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────────────┐  │   │
│  │  │GameEngine│  │PlayerSvc │  │AuthSvc │  │  RankingSvc    │  │   │
│  │  │(in-mem)  │  │(DB)      │  │(DB+OTP)│  │  (DB)          │  │   │
│  │  └──────────┘  └──────────┘  └────────┘  └────────────────┘  │   │
│  └───────────────────────────────┬───────────────────────────────┘   │
│                                  │                                    │
│                          ┌───────▼────────┐                          │
│                          │  PostgreSQL     │                          │
│                          │  (persistent)   │                          │
│                          └────────────────┘                          │
│                                                                      │
│  In-Memory (ephemeral):                                              │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  GameRegistry: map[tableID]*GameTable  (mutex-protected)     │    │
│  │  ConnRegistry: map[connID]*Connection  (maps WS to player)   │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Differences from Current Architecture

| Aspect | Current (C#/SignalR) | New (Go) |
|--------|---------------------|----------|
| Real-time protocol | SignalR (auto-negotiation, groups) | Raw WebSocket + JSON messages |
| Game state | In-memory (static ConcurrentDictionary) | In-memory (Go maps + sync.RWMutex) |
| Player identity | Anonymous GUID, lost on refresh | DB-backed, cookie session, survives refresh |
| Persistence | None | PostgreSQL for players, matches, rankings |
| Client rendering | jQuery + opaque cards.js | Svelte components + SVG cards |
| Thread safety | `lock(Game)` on shared GameTable reference | `sync.Mutex` per GameTable struct |
| Auth | None | Email OTP + session cookies |
| Card encoding | Server=1/Client=14 ace mismatch | Unified encoding, no translation |

---

## 4. Authentication & Identity

### 4.1 Flow: Email OTP Login

```
User enters email
       │
       ▼
POST /v1/auth/request-code { email }
       │
       ├── Generate 6-digit code, store in DB with 10-min expiry
       ├── Send email via Resend/SES
       └── Return 200 (always, even if email unknown — prevent enumeration)
       
User enters code
       │
       ▼
POST /v1/auth/verify-code { email, code }
       │
       ├── Validate code + expiry
       ├── If valid:
       │     ├── Find or create Player record
       │     ├── Create session (random token → DB sessions table)
       │     ├── Set HttpOnly, Secure, SameSite=Lax cookie
       │     └── Return player profile
       └── If invalid: Return 401
```

### 4.2 Session Management

- **Session token:** 256-bit random, stored as SHA-256 hash in `sessions` table.
- **Cookie:** `session_id`, HttpOnly, Secure, SameSite=Lax, 30-day expiry (sliding).
- **WebSocket auth:** On WS connect, the browser sends the cookie automatically (same origin). Server validates session before upgrading to WS. The resolved `playerID` is attached to the connection.
- **Logout:** DELETE /v1/auth/session → clear cookie + delete session row.
- **Multiple devices:** Each device gets its own session. All valid simultaneously.

### 4.3 Guest Play

- Guest clicks "Play as Guest" → server creates a `Player` record with `is_guest = true` and a transient session cookie (session-scoped, no expiry).
- Guest can play normally. No profile, no ranking accrual.
- **Claiming a guest account:** If a guest later enters their email and verifies, the guest `Player` record is upgraded: `is_guest = false`, email is attached, and all in-progress game state (chair assignment, cards) carries over seamlessly because the `playerID` doesn't change.
- Guest sessions are cleaned up after 24 hours of inactivity.

### 4.4 Profile

- **Display name:** Required for authenticated users, auto-generated for guests ("Guest_XXXX").
- **Avatar:** Choose from a preset gallery (playing card themed) or upload a custom image. Uploaded images resized to 256×256, stored on disk or S3-compatible object store.
- **Profile endpoint:** GET/PUT /v1/players/me

---

## 5. Data Model

### 5.1 Entity-Relationship Overview

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   players     │       │   matches         │       │  match_players   │
│──────────────│       │──────────────────│       │──────────────────│
│ id (PK)      │◄──────│ id (PK)           │◄──────│ match_id (FK)    │
│ email        │       │ table_type        │       │ player_id (FK)   │
│ display_name │       │ started_at        │       │ team             │
│ avatar_url   │       │ ended_at          │       │ position (chair) │
│ is_guest     │       │ winning_team      │       │ was_bidder       │
│ created_at   │       │ bid_value         │       │ bid_amount       │
│ updated_at   │       │ bid_stage         │       │ rating_before    │
│              │       │ was_thani         │       │ rating_after     │
│              │       │ was_cancelled     │       │ rating_delta     │
│              │       │ was_forfeited     │       │ kodi_change      │
│              │       │ final_score_t0    │       └──────────────────┘
│              │       │ final_score_t1    │
│              │       │ metadata (jsonb)  │
└──────┬───────┘       └──────────────────┘
       │
       │       ┌──────────────────┐       ┌──────────────────┐
       │       │   sessions        │       │   otp_codes       │
       │       │──────────────────│       │──────────────────│
       ├──────►│ id (PK)           │       │ id (PK)           │
       │       │ player_id (FK)    │       │ email             │
       │       │ token_hash        │       │ code_hash         │
       │       │ created_at        │       │ expires_at        │
       │       │ last_active_at    │       │ attempts          │
       │       │ expires_at        │       │ used              │
       │       └──────────────────┘       └──────────────────┘
       │
       │       ┌──────────────────┐
       └──────►│   player_ratings  │
               │──────────────────│
               │ player_id (FK,PK)│
               │ rating            │
               │ games_played      │
               │ games_won         │
               │ games_as_bidder   │
               │ bids_won          │
               │ bids_lost         │
               │ thani_won         │
               │ thani_lost        │
               │ highest_bid_won   │
               │ total_points_bid  │
               │ total_points_won  │
               │ updated_at        │
               └──────────────────┘
```

### 5.2 Table Definitions

```sql
CREATE TABLE players (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE,            -- NULL for guests
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    is_guest        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    token_hash      BYTEA NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE otp_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL,
    code_hash       BYTEA NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    attempts        INT NOT NULL DEFAULT 0,
    used            BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_email ON otp_codes(email, created_at DESC);

CREATE TABLE matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_type      SMALLINT NOT NULL,      -- 0, 1, or 2
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at        TIMESTAMPTZ,
    winning_team    SMALLINT,               -- 0 or 1, NULL if cancelled
    bid_value       SMALLINT NOT NULL,
    bid_stage       SMALLINT NOT NULL,      -- 1-5
    was_thani       BOOLEAN NOT NULL DEFAULT false,
    was_cancelled   BOOLEAN NOT NULL DEFAULT false,
    was_forfeited   BOOLEAN NOT NULL DEFAULT false,
    final_score_t0  SMALLINT NOT NULL DEFAULT 0,
    final_score_t1  SMALLINT NOT NULL DEFAULT 0,
    metadata        JSONB                   -- flexible: coolie state, round details, etc.
);
CREATE INDEX idx_matches_ended ON matches(ended_at DESC);

CREATE TABLE match_players (
    match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id       UUID NOT NULL REFERENCES players(id),
    team            SMALLINT NOT NULL,      -- 0 or 1
    position        SMALLINT NOT NULL,      -- chair index
    was_bidder      BOOLEAN NOT NULL DEFAULT false,
    bid_amount      SMALLINT,               -- highest bid this player made, NULL if never bid
    rating_before   INT,                    -- NULL for guests
    rating_after    INT,
    rating_delta    INT,
    kodi_change     SMALLINT NOT NULL DEFAULT 0,  -- +1 gained, -1 removed, 0 no change
    PRIMARY KEY (match_id, player_id)
);
CREATE INDEX idx_mp_player ON match_players(player_id, match_id);

CREATE TABLE player_ratings (
    player_id       UUID PRIMARY KEY REFERENCES players(id),
    rating          INT NOT NULL DEFAULT 1200,
    games_played    INT NOT NULL DEFAULT 0,
    games_won       INT NOT NULL DEFAULT 0,
    games_as_bidder INT NOT NULL DEFAULT 0,
    bids_won        INT NOT NULL DEFAULT 0,
    bids_lost       INT NOT NULL DEFAULT 0,
    thani_won       INT NOT NULL DEFAULT 0,
    thani_lost      INT NOT NULL DEFAULT 0,
    highest_bid_won SMALLINT NOT NULL DEFAULT 0,
    total_points_bid INT NOT NULL DEFAULT 0,
    total_points_won INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 5.3 What Goes in `matches.metadata` (jsonb)

The `metadata` column stores optional rich data that doesn't warrant its own columns:

```json
{
  "coolie_before": [6, 4],
  "coolie_after": [7, 3],
  "kodi_irakkam": false,
  "trump_suit": "h",
  "trump_exposed_round": 3,
  "rounds": [
    { "winner_team": 0, "score": 5, "cards": ["h11","s9","d1","c10"] }
  ],
  "bid_history": [
    { "position": 0, "bid": 28 },
    { "position": 1, "bid": 0 },
    { "position": 2, "bid": 32 }
  ]
}
```

This keeps the schema stable while allowing detailed replay/analysis features later.

---

## 6. WebSocket Protocol

### 6.1 Design: Replace SignalR with Simple JSON Messages

The current SignalR protocol auto-negotiates transport and provides RPC-style method invocation. This is replaced with a simpler, more portable JSON message protocol that any client (browser, mobile app, bot) can implement.

### 6.2 Message Envelope

Every message (both directions) follows this structure:

```json
{
  "type": "message_type",
  "payload": { ... },
  "seq": 42
}
```

- `type`: String identifying the action or event.
- `payload`: Type-specific data.
- `seq`: Monotonically increasing sequence number (client→server). Server echoes it back for correlation. Server-initiated events use `seq: 0`.

### 6.3 Client → Server Messages

| Type | Payload | Notes |
|------|---------|-------|
| `join_table` | `{ table_type, private_id?, watch_only }` | Replaces RegisterPlayer + JoinTable (auth is pre-resolved from cookie) |
| `place_bid` | `{ bid }` | 28–57 |
| `pass_bid` | `{}` | |
| `select_trump` | `{ card }` | Card string e.g. "h11" |
| `play_card` | `{ card }` | |
| `show_trump` | `{}` | Removed roundOverDelay — server controls timing |
| `start_next_game` | `{}` | |
| `forfeit` | `{}` | |
| `leave_table` | `{}` | Clean exit (replaces UnregiterPlayer) |
| `ping` | `{}` | Keepalive |

**Key change:** `roundOverDelay` is eliminated. The server owns the delay (fixed 2 seconds). This closes the security hole where a malicious client could send an arbitrary sleep duration.

### 6.4 Server → Client Messages

| Type | Payload | Notes |
|------|---------|-------|
| `state` | `{ ...full personalized game state }` | Same concept as OnStateUpdated |
| `error` | `{ code, message, ref_seq }` | Error referencing the client message that caused it |
| `joined` | `{ table_id, position, watch_only }` | Confirmation of table join |
| `player_joined` | `{ position, name, avatar }` | Another player joined |
| `player_left` | `{ position }` | A player left |
| `pong` | `{}` | Keepalive response |

### 6.5 Connection Lifecycle

```
1. Client opens WSS connection to /ws
   - Browser sends session cookie automatically
   - Server validates session, resolves playerID
   - If invalid/missing session AND guest play: create guest player
   - If invalid/missing session AND no guest flag: close with 4001

2. Client sends join_table → Server responds with joined + state

3. Game loop: client sends actions, server broadcasts state

4. On disconnect:
   - Server keeps chair + cards for 5 minutes (reconnection window)
   - After timeout: remove from chair, notify others
   - If table empties: clean up

5. On reconnect (same playerID via session):
   - Placed back in same chair if within window
   - Receives full state immediately
```

### 6.6 State Payload Structure

The personalized state JSON follows the current model but with cleaner naming:

```json
{
  "table": {
    "id": "abc-123",
    "type": 0,
    "stage": "playing_cards",
    "dealer": 2,
    "cancelled": false,
    "forfeited": false
  },
  "chairs": [
    {
      "position": 0,
      "player": { "id": "...", "name": "Arun", "avatar": "...", "connected": true },
      "watchers": [{ "name": "Visitor1" }],
      "kodi_count": 1,
      "kodi_just_installed": false
    }
  ],
  "bid": {
    "high_bid": 32,
    "high_bidder": 2,
    "next_bidder": 3,
    "next_min_bid": 33,
    "history": [
      { "position": 0, "bid": 28 },
      { "position": 1, "bid": 0 },
      { "position": 2, "bid": 32 }
    ]
  },
  "rounds": [
    {
      "first_player": 0,
      "next_player": 2,
      "played_cards": ["h11", "s9"],
      "trump_exposed_this_round": false,
      "winner": null,
      "score": null
    }
  ],
  "scores": [12, 8],
  "targets": [32, 25],
  "coolies": [5, 7],
  "trump": {
    "card": "h11",
    "exposed": false,
    "visible": true
  },
  "my": {
    "position": 2,
    "team": 0,
    "cards": ["h7", "s11", "d9", "c1", "c13", "d8", "s7"],
    "is_bidder": true,
    "is_dealer": false,
    "auto_play_card": null
  }
}
```

Note: `trump.visible` is true only for the bidder (before exposure) or everyone (after exposure). `trump.card` is null if not visible to this player.

---

## 7. REST API

All REST endpoints are prefixed with `/v1`. Authentication required unless noted.

### 7.1 Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/auth/request-code` | No | Send OTP to email |
| POST | `/v1/auth/verify-code` | No | Verify OTP, create session |
| DELETE | `/v1/auth/session` | Yes | Logout (invalidate session) |
| POST | `/v1/auth/guest` | No | Create guest session |

### 7.2 Player Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/players/me` | Yes | Get own profile |
| PUT | `/v1/players/me` | Yes | Update display name, avatar |
| POST | `/v1/players/me/avatar` | Yes | Upload avatar image |
| GET | `/v1/players/:id` | Yes | Get another player's public profile |

### 7.3 Match History

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/matches` | Yes | List own recent matches (paginated) |
| GET | `/v1/matches/:id` | Yes | Get match details (scores, players, metadata) |

### 7.4 Rankings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/rankings` | Yes | Leaderboard (top N, paginated) |
| GET | `/v1/rankings/me` | Yes | Own rank + nearby players |

---

## 8. Ranking System

### 8.1 Approach: Modified Glicko-Simplified

Pure Elo is designed for 1v1. Your game is team-based with an asymmetric bidder role. A simplified Glicko-style system works better because it accounts for rating confidence (new players' ratings move faster).

**Base rating:** 1200 (new players).

### 8.2 Rating Calculation per Game

After each completed (non-cancelled) game:

```
For each player on the winning team:
    base_delta = K × (1 - expected_score)

For each player on the losing team:
    base_delta = K × (0 - expected_score)

Where:
    K = 32 (default, higher for players with < 30 games for faster calibration)
    expected_score = 1 / (1 + 10^((opponent_avg_rating - player_rating) / 400))
    opponent_avg_rating = mean rating of opposing team
```

### 8.3 Bidder Modifiers

The bidder carries more responsibility and should be rewarded/penalized accordingly:

```
bidder_multiplier:
    If bidder's team WON:  1.3  (30% bonus for successful bid)
    If bidder's team LOST: 1.3  (30% extra penalty for failed bid)
    All non-bidders:       1.0

bid_stage_bonus (additive, applied to bidder only):
    Stage 1 (28-39):  +0
    Stage 2 (40-47):  +2
    Stage 3 (48-55):  +4
    Stage 4 (56):     +6
    Stage 5 (Thani):  +10

final_delta = (base_delta × bidder_multiplier) + bid_stage_bonus (if bidder)
```

### 8.4 Edge Cases

- **Cancelled games:** No rating change. Not recorded as a match (or recorded with `was_cancelled = true` and no rating delta).
- **Forfeited games:** Normal rating change applies. Forfeit is a loss for the forfeiting team.
- **Guest players:** No rating calculated or stored. Guests are treated as 1200-rated for the purpose of calculating opponents' expected scores.
- **Incomplete teams (player left mid-game):** If a replacement joined, they inherit the rating impact. If the chair stayed empty and the team forfeited, normal forfeit rules apply.
- **Thani:** The bidder_multiplier is 1.5 instead of 1.3 (higher stakes, solo play). The bid_stage_bonus of +10 already accounts for the extreme difficulty.

### 8.5 Leaderboard

- Ranked by `rating` descending.
- Minimum 10 completed games to appear on the leaderboard.
- Profile shows: rating, rank, win rate, bid success rate, games played, highest successful bid, Thani record.

---

## 9. In-Memory Game State (Go)

### 9.1 Core Structures

```go
// GameRegistry is the top-level container (replaces static GameTables)
type GameRegistry struct {
    mu     sync.RWMutex
    tables map[string]*GameTable
}

// GameTable holds all state for one table (replaces GameTable C# class)
type GameTable struct {
    mu          sync.Mutex  // replaces lock(Game)
    ID          string
    Type        TableType
    Stage       GameStage
    Chairs      []*Chair
    Bid         *BidInfo
    Rounds      []*RoundInfo
    Deck        *Deck
    DealerPos   int
    Trump       TrumpState
    Scores      [2]int
    Coolies     [2]int
    KodiIrakkam [2]bool
    Cancelled   bool
    Forfeited   bool
    WinResult   *WinResult
    CreatedAt   time.Time
}

// Chair replaces the C# Chair class
type Chair struct {
    Position  int
    Occupant  *ConnectedPlayer  // nil if empty
    Watchers  []*ConnectedPlayer
    Cards     []Card
    KodiCount int
    KodiNew   bool
}

// ConnectedPlayer links a DB player to a live WebSocket connection
type ConnectedPlayer struct {
    PlayerID  string          // from DB
    Name      string
    AvatarURL string
    Conn      *websocket.Conn // nil if disconnected but within reconnect window
    Lang      string
    IsGuest   bool
    WatchOnly bool
}

// ConnRegistry maps WebSocket connections to players and tables
type ConnRegistry struct {
    mu    sync.RWMutex
    conns map[*websocket.Conn]*ConnectedPlayer
}
```

### 9.2 Concurrency Model

Identical pattern to the current C# system, translated to Go:

```go
func (t *GameTable) PlaceBid(player *ConnectedPlayer, bid int) error {
    t.mu.Lock()
    defer t.mu.Unlock()

    // All validation and state mutation happens here
    // ...

    t.broadcastState()  // sends personalized state to each connection
    return nil
}
```

The `GameRegistry.mu` (RWMutex) protects the table map for adds/removes. Each `GameTable.mu` (Mutex) protects that table's state. Different tables never contend — same as the current system.

### 9.3 Match Recording

When a game ends (not cancelled), the game server writes a match record to Postgres asynchronously:

```go
func (t *GameTable) recordMatch() {
    // Build match + match_players records from current state
    // Fire-and-forget goroutine (or buffered channel to a writer goroutine)
    go func() {
        matchSvc.RecordMatch(ctx, match, players)
        rankingSvc.UpdateRatings(ctx, match, players)
    }()
}
```

This keeps the game loop fast. If the DB write fails, the game continues — the match is simply not recorded. A retry queue could be added later.

---

## 10. Frontend Architecture (SvelteKit)

### 10.1 Page Structure

```
src/
├── routes/
│   ├── +layout.svelte          # Global nav, auth state
│   ├── +page.svelte            # Landing / home
│   ├── login/
│   │   └── +page.svelte        # Email + OTP flow
│   ├── play/
│   │   └── +page.svelte        # Table type selection, join
│   ├── game/
│   │   └── [id]/
│   │       └── +page.svelte    # Game UI (WebSocket)
│   ├── profile/
│   │   └── +page.svelte        # Edit name, avatar
│   ├── rankings/
│   │   └── +page.svelte        # Leaderboard
│   └── history/
│       └── +page.svelte        # Match history list
├── lib/
│   ├── stores/
│   │   ├── auth.ts             # Session state
│   │   ├── game.ts             # Game state (from WebSocket)
│   │   └── connection.ts       # WebSocket lifecycle
│   ├── components/
│   │   ├── Card.svelte         # SVG card component
│   │   ├── Hand.svelte         # Fan of cards in hand
│   │   ├── Table.svelte        # Table surface + played cards
│   │   ├── Chair.svelte        # Player seat (name, bid, kodi)
│   │   ├── BidPanel.svelte     # Bid selection popup
│   │   ├── Scoreboard.svelte   # Coolies, scores, targets
│   │   ├── TrumpDisplay.svelte # Trump card (hidden/shown)
│   │   └── Avatar.svelte       # Player avatar
│   └── ws.ts                   # WebSocket client wrapper
```

### 10.2 Game State Flow

```
WebSocket message received
       │
       ▼
ws.ts: parse JSON → update gameStore (Svelte writable store)
       │
       ▼
game.ts: gameStore triggers reactive updates
       │
       ├── Table.svelte re-renders played cards
       ├── Hand.svelte re-renders player's cards
       ├── Chair.svelte updates names, bids, kodi
       ├── Scoreboard.svelte updates scores
       └── BidPanel.svelte shows/hides based on stage + turn
```

This is the same pattern as the current jQuery `OnStateUpdated` → full re-render, but Svelte's reactivity makes it declarative instead of imperative.

### 10.3 Card Rendering Strategy

Replace `cards.js` (PINOCHLE, opaque, modified) with SVG Svelte components:

- Each card is an `<svg>` element with rank + suit rendered programmatically.
- Card back is a separate SVG pattern.
- Animations (deal, play, trick collection) via CSS transitions or svelte/transition.
- **Unified encoding:** Card strings like `"h11"` (Jack of Hearts) are used everywhere — server, client, database. No ace translation layer.

### 10.4 Responsive Layout

The current fixed 1000×700px layout is replaced with a responsive design:

- **Mobile (portrait):** Player's hand at bottom, played cards center, opponents stacked at top. Bid panel slides up from bottom.
- **Tablet/Desktop:** Traditional table layout with players around the edges, similar to current but fluid-sized.
- Tailwind breakpoints: `sm` (640px), `md` (768px), `lg` (1024px).

---

## 11. Migration & Rollout Plan

### Phase 2a: Foundation (Weeks 1–3)

- [ ] Set up Go project structure, Docker Compose (Go + Postgres)
- [ ] Implement database schema + migrations
- [ ] Build auth system (OTP email, sessions, guest play)
- [ ] Build player profile CRUD (REST API)
- [ ] SvelteKit scaffolding: login flow, profile page

### Phase 2b: Game Engine Port (Weeks 4–7)

- [ ] Port GameTable, Chair, BidInfo, RoundInfo structs to Go
- [ ] Port TableType configuration (4/6/8 player variants)
- [ ] Port DeckController (shuffle, deal, validate, return)
- [ ] Port bidding logic (alternation, OutBidChance, stage jumps, passes)
- [ ] Port trump selection + validation
- [ ] Port card play rules (follow suit, trump restrictions, exposure)
- [ ] Port Thani mode
- [ ] Port round processing + game-over detection
- [ ] Port coolie transfer + kodi mechanics
- [ ] Port auto-play mechanisms (all 3 variants)
- [ ] WebSocket hub: connection lifecycle, message routing, state broadcast

### Phase 2c: Frontend (Weeks 6–9, overlaps with 2b)

- [ ] SVG card components (all ranks/suits + card back)
- [ ] Game page: table layout, hand display, played cards
- [ ] Bid panel component
- [ ] Scoreboard (coolies, scores, targets)
- [ ] Kodi display + animation
- [ ] Trump display (hidden/revealed)
- [ ] Responsive layouts (mobile + desktop)
- [ ] Table join / matchmaking page
- [ ] Reconnection handling

### Phase 2d: Ranking & Polish (Weeks 8–10)

- [ ] Match recording (game engine → Postgres)
- [ ] Rating calculation service
- [ ] Rankings page + leaderboard
- [ ] Match history page
- [ ] Profile page with stats
- [ ] Localization (Malayalam + English)
- [ ] Error handling, edge cases, stress testing

### Phase 2e: Deployment (Week 10–11)

- [ ] Production Docker setup (Go + Postgres + Caddy)
- [ ] TLS via Caddy auto-HTTPS
- [ ] Domain + DNS
- [ ] Health checks + basic monitoring
- [ ] Manual testing with multi-device play
- [ ] Soft launch with existing player community

---

## 12. Decisions Deferred

| Decision | Why Deferred | Trigger to Revisit |
|----------|-------------|-------------------|
| Native mobile apps | Web client covers mobile via responsive design | User demand or WebSocket performance issues on mobile browsers |
| Multi-server / horizontal scaling | Single server handles expected load | >500 concurrent tables or uptime SLA requirement |
| Push notifications ("your turn") | Adds complexity (service workers, FCM/APNs) | Mobile app development begins |
| Social features (friends, invites) | Not core to gameplay | After ranking system is validated |
| Replay/spectate past games | Requires round-level persistence | After match recording is stable |
| Automated testing framework | Manual testing during initial development | Before first major refactor |
| Rate limiting | Low user count initially | Public launch or abuse detection |
| Redis for session store | Postgres sessions fine at this scale | Multi-server deployment |

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
| Card encoding (unify to single scheme) | §6.3 Card Encoding |
| Table variants (4/6/8 config) | §4.1 Table Variants |
| Card point values | §4.2 Card Point Values |

---

*System design document for the 56 Cards rewrite. Companion to DOMAIN_KNOWLEDGE.md.*
