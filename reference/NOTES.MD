# Domain Analysis: Cards56Lib + Cards56Web

## 1. Key Domain Entities

### Server-Side Entities

| Entity | Definition |
|--------|-----------|
| **GameTable** | Central game session. Holds deck, chairs, bid state, rounds, scores, and game stage. |
| **GameTables** | Static registry of all active `GameTable` instances. Keyed by table name in a `ConcurrentDictionary`. Handles creation, removal, and matchmaking for public tables. |
| **Chair** | A seat at the table (0 to MaxPlayers-1). Has one occupant (player) and up to 2 watchers. Holds dealt cards and "Kodi" state. |
| **Player** | A participant identified by PlayerID, with a connection ID, name, language, and position. Can be a watcher (non-playing observer). |
| **Players** | Static registry of all known `Player` instances. Keyed by composite `(PlayerID, ConnectionID)` in a `ConcurrentDictionary`. Supports lookup by either key component. |
| **TableType** | Game configuration object. Defines rules for 3 variants (Type 0/1/2) controlling player count, deck size, ranks, coolies, and scoring. |
| **BidInfo** | Tracks the bidding phase: current high bid, high bidder, next bidder, minimum next bid, per-team next bidder, and full bid history. |
| **BidPass** | A single bid action record: who bid and what amount. A bid of `0` means "pass." |
| **RoundInfo** | One trick/round: first player, next player, played cards, trump exposure flags, winner, and score. |
| **GameController** | Public API facade. One instance per connection (bound to `ConnID` + `Lang`). Delegates all game actions to `TableController`. Sets thread culture for i18n. |
| **TableController** | Core game-logic orchestrator. Wraps a `GameTable` and `DeckController`. All public methods acquire `lock(Game)` for thread safety. Manages joining, leaving, bidding, trump selection, card play, round/game processing, kodi, forfeiture, and state broadcasting. |
| **DeckController** | Internal deck manager. Handles shuffling (with validation), dealing cards to players, and returning cards back to the deck. All operations are `lock`-protected. |
| **Card56Exception** | Base exception class for all domain errors. Carries a `Card56ErrorData` payload with error code, localized message (via NGettext), and contextual fields (min/max bid, player name, suit, trump card). |
| **Card56ErrorData** | Structured error payload attached to exceptions. Contains error code, name, and contextual fields depending on error type. |
| **Cards56Error** | Static class holding 34 integer error codes (0–33) and their corresponding message templates. |
| **StateUpdatedDelegate** | Delegate signature `(string PlayerID, string jsonState)` used to push game state to clients after every mutation. |
| **Cards56Hub** | ASP.NET Core SignalR hub. The real-time transport layer between clients and server. Extends `Hub<ICards56HubEvents>` and implements `ICards56Hub`. Creates a transient `GameController` per method call via a property getter. Stores player language in `Context.Items`. All hub methods follow a try/catch pattern that routes domain exceptions to the caller via `OnError`. |
| **ICards56Hub** | Interface defining the 11 client-to-server hub methods. |
| **ICards56HubEvents** | Interface defining the 3 server-to-client events: `OnError`, `OnStateUpdated`, `OnRegisterPlayerCompleted`. |
| **Cards56HubMethod** | Enum (1–11) identifying which hub method triggered an error. |
| **SignalRHealthCheck** | ASP.NET Core health check that validates SignalR connectivity by broadcasting a `"HealthCheck"` message to all connected clients. |

### Client-Side Entities

| Entity | Definition |
|--------|-----------|
| **Game** (`game.js`) | Central client-side orchestrator. Manages SignalR connection lifecycle (connect, reconnect, close), player registration, and all hub method invocations. Receives `OnStateUpdated` events and coordinates all UI rendering. Holds the deserialized `gameState` and derives the local player's perspective (team, offset positions). |
| **Table** (`table.js`) | UI manager for the game table surface. Wraps the `cards.js` card-rendering library. Manages player hand, round card decks (one per player position), trump card deck, last-round display, coolies (per-team visual counters), scores, center messages, alert toasts, and table buttons (Logout, Forfeit, New Game). Uses the PINOCHLE card type from the `cards.js` library. |
| **Player** (`player.js`) | UI component for a single player seat. Renders player icon (team-colored), name, dealer badge, bid display (high/current/previous), focus animation (blinking border), kodi markers (up to 14), kodi-just-installed animation, and watcher names (up to 2). Position-aware CSS classes adapt layout for 4/6/8-player configurations. |
| **BidPanel** (`bid_panel.js`) | Popup UI for placing bids. Renders buttons for bids 28–56 (in 3 rows: 28–39, 40–47, 48–56), a Thani (57) button, and a Pass (0) button. Shows/hides based on bidding state; disables buttons below the current minimum bid. |

---

## 2. Business Rules & Constraints

### Table Variants (TableType)
- **Type 0:** 4 players, 32-card deck, ranks {10,1,9,11}, base coolie count 6
- **Type 1:** 6 players, 48-card deck, ranks {12,13,10,1,9,11}, base coolie count 6
- **Type 2:** 8 players, 64-card deck, ranks {7,8,12,13,10,1,9,11}, base coolie count 7
- 4 suits always: h, s, d, c
- DeckSize = MaxPlayers × 8

### Teams
- **Team assignment is positional:** `TeamOf(position) = position % 2` (alternating seats)
- 2 teams always; players per team = MaxPlayers / 2

### Deck & Dealing (DeckController)
- **Double deck:** Each card appears twice — deck is built as `suits × ranks × 2`, yielding `4 × ranks × 2 = DeckSize` cards.
- **Shuffle algorithm:** Cut-and-move shuffle (top-to-bottom, middle-to-bottom) repeated `ShuffleCount` times. First shuffle of a new deck uses `ShuffleCount × 5` (30 iterations); subsequent re-shuffles use 6 iterations.
- **Shuffle validation (`IsValidShuffle`):** No player's hand may be all one suit. If validation fails, the deck is re-shuffled in a `while(true)` loop until valid.
- **Deal:** Each player gets `DeckSize / MaxPlayers` cards (always 8). Cards are sorted by `CompareCards` before delivery.
- **Card lifecycle:** Played cards and the trump card are returned to the deck immediately after play (via `ReturnCard`/`ReturnCards`), so the deck is reconstituted for the next game without rebuilding.

### Bidding Rules
- Minimum opening bid: **28**
- Maximum bid: **57** (called "THANI")
- Bid stages determine scoring: `bid < 40` → stage 1, `40–47` → stage 2, `48–55` → stage 3, `56` → stage 4, `57` → stage 5
- `NextMinBidAfterBid`: jumps from <28→28, 28–39→40, 40+→48 (non-linear bid ladder)
- Each team tracks its next bidder independently (`NextBidderFromTeam[2]`)
- **OutBidChance semantics (clarified):** Records the bid value at which each player last participated (bid or was required to pass). Used to calculate each player's `NextMinBid` — a player's next minimum is `max(HighBid+1, NextMinBidAfterBid(OutBidChance[player]))`. This prevents players from bidding below their previous stage.
- **Pass is recorded as `BidPass(position, 0)`** — bid value of 0 indicates a pass.
- **Pass is only allowed after at least one bid has been placed** (`AllowBidPass => HighBid >= 28`).
- **Bidding ends when:** (a) The high bidder bids over themselves (no one else bid higher → `SelectingTrump`), or (b) The high bidder passes (→ `SelectingTrump`), or (c) Someone bids 57/THANI (→ `PlayingCards` directly, skipping trump selection).
- **Bid alternation:** After a bid, turn goes to the other team's next bidder. After a pass, logic checks whether the passer's teammate still deserves a chance to outbid before passing to the other team.
- **First bidder zero-points exception:** If the first bidder cannot pass (no prior bid) and holds zero card points, the game is **cancelled** (`FirstBidderHasNoPointsException`). Dealer position is preserved for the re-deal.

### Trump Selection Rules
- Only the **high bidder** can select trump.
- Trump card must be **from the high bidder's hand** and is removed from their hand upon selection.
- **Opposing team must hold at least one card of the trump suit.** If not, the game is **cancelled** (`OppositeTeamHasNoTrumpCardsException`).
- **THANI games skip trump selection entirely** — play begins immediately with the high bidder leading.
- After trump selection, the first round's `FirstPlayer` is the **dealer** (not the bidder).

### Card Play Rules
- **Follow suit:** Non-leading players must play the round's suit if they hold a card of that suit. Violation throws `CardNotOfRoundSuitException`.
- **Trump suit restrictions (before trump is exposed):** The high bidder cannot lead with a trump-suit card unless it's their only suit remaining (`CannotPlayTrumpSuitException`).
- **Trump exposure trigger:** A non-leading player who has no cards of the round suit may request to show trump (`ShowTrump`). The first player in a round **cannot** show trump unless they are the high bidder and have only 1 card left (which would be the trump card).
- **Must have no round-suit cards to show trump:** If the requesting player still holds the round's suit, `RoundSuitCardExistsException` is thrown.
- **After trump is exposed:** The trump card is returned to the high bidder's hand (re-sorted). Then: (a) The **high bidder must immediately play the trump card itself** (`MustPlayTheTrumpCardException`), and (b) The **exposing player must play a trump-suit card** if they have one (`MustPlayTrumpSuitException`). These constraints only apply in the round where trump was just exposed (`CurrentRound.TrumpExposed` tracks per-play).
- **THANI play:** In THANI, teammate(s) of the bidder are **skipped** during play. Cards per round = `PlayersPerTeam + 1` (bidder + all opponents). Scoring is 1 point per round won (not card points).
- **Next player advancement:** `NextPlayer = PlayerAt(CurrentPlayer + 1)`, with THANI skipping same-team players.

### Auto-Play Rules
- **Server-side `AutoPlayNextCard`:** Set when the next player has only one legal card to play — either (a) they have exactly 1 card left total, or (b) they have exactly 1 card matching the round suit. This is a hint for the client; server still validates the play.
- **Client-side auto-play:** When `AutoPlayNextCard` is set in the game state and the current player is the local player, the client sets a `setTimeout` of **5 seconds** then auto-invokes `PlayCard` with the suggested card and a 2-second round-over delay. The timer is cancelled if the player clicks a card manually before it fires.
- **Server-side `AutoPlayWhenPossible`:** At the start of a new round, if trump is exposed (or THANI) and the next player holds all the highest-rank cards across all suits (no opponent has trump or higher cards), the remaining rounds are auto-played to completion. Disabled for THANI ("more fun to play it out").

### Round Processing
- **Round winner:** Determined by highest rank of the round suit, unless a trump-suit card was played (and trump was exposed at the time of play), in which case the trump card wins.
- **THANI winner mapping:** Play order indices are mapped back to actual positions via `winner = winner*2 - 1` for non-first-player winners.
- **Round score:** Sum of card point values for all played cards (normal game), or flat 1 point per round (THANI).
- **Maximum 8 rounds per game** (hardcoded `Game.Rounds.Count() < 8`).
- **Round-over delay:** Client sends `2000` ms (hardcoded in `game.js`) as the `roundOverDelay` for both `PlayCard` and `ShowTrump`. Server-side `ProcessRound` calls `Thread.Sleep` with this value before processing the next round.

### Game-Over Conditions
- **Normal game:** Bidder's team reaches `HighBid` points, OR opposing team exceeds `56 - HighBid` points.
- **THANI game:** Bidder's team reaches 8 points, OR opposing team scores at least 1 point.
- **Forfeit:** Any seated (non-watcher) player can forfeit. Their team gets 0 points; opposing team gets 56 (or 8 for THANI). Then `ProcessGame` runs normally.

### Scoring
- **Card point values:** Jack(11)=3, Nine(9)=2, Ace(1)=1, Ten(10)=1, all others=0
- **Total card points in deck:** 56 (hence the game name "56")
- **Win points** by bid stage: stage 1→1, 2→2, 3→3, 4→4, THANI→BaseCoolieCount×2
- **Lose points** by bid stage: stage 1→2, 2→3, 3→4, 4→5, THANI→BaseCoolieCount×2
- Lose penalty is always 1 more than win reward (except THANI where they're equal)
- `CoolieCount` initialized to `[BaseCoolieCount, BaseCoolieCount]` per team
- `TeamScore` initialized to `[0, 0]`
- **Client score display:** Shows `current/target` format (e.g. `"12/28"`). Bidder's team target = bid value; opposing team target = `56 - bid + 1`. For THANI: bidder's target = 8, opposing = 1.

### Coolie & Kodi Mechanics
- **Coolies** are per-team point reserves. Start at `BaseCoolieCount` per team.
- **After a game:** The winning team gains points; the losing team loses the same amount. If the bidder won, win-points are used; if the bidder lost, lose-points are used. Coolies transfer between teams symmetrically.
- **Kodi installation trigger:** When a team's `CoolieCount` drops to ≤ 0, **Kodi is installed** on every player of that team (each chair's `KodiCount++`, `KodiJustInstalled = true`). Both teams' coolies are then **reset to BaseCoolieCount**.
- **KodiIrakkamRound:** Set to `true` for the team that just had Kodi installed; set to `false` for the other team. This flag marks that the next win by the Kodi team should clear Kodi for the entire team (not just the bidder).
- **Kodi removal on win:** If the bidder's team wins: (a) If `KodiIrakkamRound` is true for their team → remove one Kodi from **every player** on the team. (b) Otherwise → remove one Kodi from the **bidder's chair only**.
- **KodiIrakkamRound resets** to `[false, false]` after every game-over.
- `KodiJustInstalled` is reset to `false` for all chairs at the start of each new deal.
- **Client Kodi display:** Up to **14** kodi markers per player (small icons). When `KodiJustInstalled` is true, an animated GIF (`kodiinstalled.gif`) is shown and the "New Game" button is **delayed 3 seconds** before appearing, giving players time to see the animation.
- **Client terminology:** Kodi markers are called "kunuk" in CSS/JS class names (likely a transliteration of the Tamil/Malayalam term).

### Chair / Seating
- Table is full when all chairs have an occupant.
- Each chair supports up to **2 watchers** (enforced: `> 2` throws `TooManyWatchersOnChairException`; note: the check uses `> 2` not `>= 2`, so technically 3 watchers could be allowed — see ambiguities).
- **Watcher allocation:** Round-robin — watchers are assigned to the chair with the fewest existing watchers (`Min(c.Watchers.Count)`).
- **Player already on table:** If `player.TableName` is already set, `JoinTable` silently returns the existing position (no error, no re-seat).

### Card Encoding
- **Server format:** `<suit_char><rank_number>` e.g. `"h11"` = Jack of Hearts, `"c1"` = Ace of Clubs
- **Client card library mapping:** Ace is encoded as rank `14` in the `cards.js` PINOCHLE library, but rank `1` on the server. The client translates: `"x1"` ↔ `"x14"` on click and display. This mapping is applied in `_get_card_obj` (display) and `onPlayerCardClicked` (input).
- Suit comparison order: h < s < d < c (index-based ascending)
- Rank comparison order: per-type rank list (lowest index = lowest rank)

### Trump
- `TrumpCard`: a specific card string; `TrumpExposed`: global bool on GameTable
- Per-round `TrumpExposed` list on RoundInfo (tracks exposure state at each play within a round)
- Trump card is physically removed from the bidder's hand on selection and returned when exposed
- **Client trump display:** Shown face-down when not exposed (using a dummy `"c1"` card added face-down). Shown face-up when exposed. Hidden entirely during THANI games. Clicking the trump card deck invokes `ShowTrump` on the server.

### Game Lifecycle (GameStage enum)
- `WaitingForPlayers(1)` → `Bidding(2)` → `SelectingTrump(3)` → `PlayingCards(4)` → `GameOver(5)`
- Also: `Unknown(0)`, `GameCancelled`, `GameForfeited` flags
- **THANI shortcut:** `Bidding(2)` → `PlayingCards(4)` (skips `SelectingTrump`)
- **Cancellation shortcuts:** `Bidding(2)` → `GameOver(5)` (first bidder no points) or `SelectingTrump(3)` → `GameOver(5)` (opposing team has no trump suit cards)

### State Broadcasting
- `SendStateUpdatedEvents()` is called after **every mutation** (join, leave, bid, pass, trump select, play card, show trump, forfeit, start game).
- When called without a player argument, it broadcasts to **all occupants and all watchers** on every chair.
- Each player receives a personalized JSON state containing: their position, their cards, trump card (only if they're the high bidder or trump is exposed), trump exposure status, current round suit, and the full `GameTable` serialization.
- **Transport mechanism:** The `StateUpdatedDelegate` passed into `GameController`/`TableController` is wired to `Cards56Hub.OnStateUpdated`, which calls `Clients.Client(connID).OnStateUpdated(jsonState)` — delivering state to each client individually via their SignalR connection.

### Player Registry Rules (Players.cs)
- Players are stored in a `ConcurrentDictionary` keyed by composite `(PlayerID, ConnectionID)`.
- **Name is required:** blank/whitespace names throw `ArgumentException`; names are trimmed on entry.
- **Reconnection handling:** If a player with the same `PlayerID` already exists, their `ConnID` is updated and all old entries are removed before re-adding with the new connection ID. The `Player` object (and its identity — Name, Lang, PlayerID) is preserved.
- **New player creation:** If no existing player matches the `PlayerID`, a new `Player` is instantiated (which may generate a new GUID if `playerID` is empty).
- Lookup is supported by **PlayerID** or by **ConnectionID** (linear scans over the dictionary).
- Removal is by `PlayerID` — removes all entries matching that ID (handles potential duplicates).
- All mutations throw `InvalidOperationException` on failure rather than silently failing.

### Table Registry Rules (GameTables.cs)
- Tables are stored in a `ConcurrentDictionary<string, GameTable>` keyed by **table name**.
- All mutating operations (`AddTable`, `RemoveTable`, `GetFreeTable`) are protected by a shared `lock(_lock)` — belt-and-suspenders over the concurrent dictionary for atomicity of compound operations.
- **Public table naming convention:** auto-created tables are prefixed `"PUBLIC_TABLE_"` followed by a GUID (no hyphens, format `"N"`).
- **Matchmaking (`GetFreeTable`):** scans all tables matching the requested `tableType` and `"PUBLIC_TABLE_"` prefix. For watchers, returns first table where `WatchersFull == false`. For players, returns first table where `TableFull == false`. If no match, a **new public table is auto-created**.
- Private/named tables are implied (any table not prefixed `"PUBLIC_TABLE_"` is skipped by matchmaking).

### Private Table Rules (GameController.JoinTable)
- Private table IDs are prefixed with `"{tableType}-"` (e.g., `"0-MyRoom"`).
- If the private table already exists, the player joins it. If not, a new table is created with that ID.
- Players **cannot switch tables** — if already on a table, `PlayerAlreadyOnTableException` is thrown. Must disconnect first.

### Disconnection Rules
- On disconnect: player is removed from their table (`LeaveTable`), and if the table is empty (no occupants AND no watchers), the table is removed from the registry.
- If the connection ID doesn't match any player, it's logged as an "orphan connection" (expected during reconnections).

### Error Handling
- 34 distinct error codes (0–33) with localized message templates.
- All domain exceptions extend `Card56Exception` which carries structured `Card56ErrorData`.
- Some exceptions are **silently swallowed** at the `GameController` level: `FirstBidderHasNoPointsException` (on PassBid) and `OppositeTeamHasNoTrumpCardsException` (on SelectTrump) — state updates are sent but the exception isn't propagated to the hub.
- **Hub-level error routing:** All hub methods wrap calls in try/catch. Exceptions are forwarded to the caller via `OnError(errorCode, hubMethodID, message, errorData)`.
- **Client error handling:** `OnError` calls `LogMessage(message)` which displays the error as a dismissible alert toast with a 5-second auto-dismiss timeout.

### Internationalization
- **Supported languages:** `"ml"` or `"ml-IN"` → normalized to `"ml-IN"` (Malayalam); everything else defaults to `"en-US"`.
- Language is stored in SignalR `Context.Items["Lang"]` and persists across hub method calls for the connection.
- **Client language selection:** Login form offers two radio buttons: മലയാളം (Malayalam, default) and English. The selected `lang` value is passed as a URL parameter to `table.html`.
- Exception messages and suit names are resolved via NGettext `Catalog`.
- Locale files expected at `AppContext.BaseDirectory + "locale"` (exceptions) and `"./locale"` (suit names in TableType — note the inconsistency).

### SignalR Hub Protocol (Cards56Hub)
- **Client → Server methods (ICards56Hub):** `RegisterPlayer(playerID, playerName, lang, watchOnly)`, `JoinTable(tableType, privateTableId)`, `PlaceBid(bid)`, `PassBid()`, `SelectTrump(card)`, `PlayCard(card, roundOverDelay)`, `ShowTrump(roundOverDelay)`, `StartNextGame()`, `RefreshState()`, `ForfeitGame()`, `UnregiterPlayer()`.
- **Server → Client events (ICards56HubEvents):** `OnError(errorCode, hubMethodID, errorMessage, errorData)`, `OnStateUpdated(jsonState)`, `OnRegisterPlayerCompleted(player)`.
- **Connection lifecycle:** `OnConnectedAsync` logs the connection. `OnDisconnectedAsync` triggers `UnregiterPlayer()` to clean up the player and table state.

### Hosting & Infrastructure (Program.cs)
- **Framework:** ASP.NET Core minimal API with SignalR.
- **CORS policy:** Allows **any origin** (`SetIsOriginAllowed(_ => true)`), any header, any method, with credentials.
- **Static file serving:** `app.UseFileServer()` enables serving of static files and default documents (e.g., `index.html`) — the web client is served from `wwwroot`.
- **Health check:** Mapped at `/health`. Uses `SignalRHealthCheck` which validates by broadcasting a `"HealthCheck"` message to all connected clients.
- **Hub endpoint:** Mapped at `/Cards56Hub`.

---

## 3. Processes / Workflows

### Client-Side Flow

1. **Login** → User opens `index.html` → enters name, selects table type (4/6/8 player), optionally enters private table name, selects language (Malayalam default / English), clicks "Play" or "Watch" → form submits to `table.html` with URL query parameters (`username`, `tabletype`, `tablename`, `lang`, `watch`).
2. **Table Initialization** → `table.html` loads → reads URL parameters → creates `Table` (card surface + UI), `BidPanel`, and `Player` instances (one per seat) → creates `Game` which initializes SignalR connection.
3. **SignalR Connection** → `Game` constructor builds `HubConnectionBuilder` with auto-reconnect and Information-level logging → starts connection → on success calls `registerPlayer`.
4. **Reconnection Handling** → `onreconnecting`: shows "Reconnecting..." center message. `onreconnected`: clears message, re-registers player (with preserved `playerID`). `onclose`: shows "Connection lost" alert with no auto-dismiss.
5. **Player Registration** → Client invokes `RegisterPlayer(playerID, name, lang, watchOnly)` → on `OnRegisterPlayerCompleted`: stores assigned `playerID`, then invokes `JoinTable(tableType, privatetablename)` unless player already has a table.
6. **State Update Rendering** → On every `OnStateUpdated(jsonState)`: parse JSON → derive local perspective (team, offset positions) → render in order: clear alerts, set player names/teams/watchers, show dealer, show bids, show trump, show round cards, show player hand, set coolies, show kodies, show scores → conditionally show bid panel (if my turn during bidding) or "Select Trump" prompt (if my turn during trump selection) or game-over UI → enable card click handlers only if it's the local player's turn and they're not a watcher → trigger auto-play if applicable.
7. **Position Offsetting** → All server positions are transformed via `_get_offsetted_player(posn)` = `(posn - myPosition + maxPlayers) % maxPlayers`. This places the local player at index 0 (bottom of screen) and rotates all others relative to them.
8. **Bid Panel Interaction** → Bid panel shown with buttons ≥ `NextMinBid` enabled, others disabled → clicking a bid button invokes `PlaceBid(bid)` or `PassBid()` (for bid=0).
9. **Card Play Interaction** → Clicking a player card: during stage 3 (SelectingTrump) invokes `SelectTrump(card)`, during stage 4 (PlayingCards) invokes `PlayCard(card, 2000)`. Clicking the trump card deck invokes `ShowTrump(2000)`.
10. **Client Auto-Play** → If `AutoPlayNextCard` is set and it's the local player's turn: 5-second timer starts → auto-invokes `PlayCard(autoplaycard, 2000)`. Clicking a card manually cancels the timer.
11. **Game Over Display** → Center message shows "Game Over!!!", "Game Cancelled :(", or "Game Forfeited" depending on flags → "New Game" button appears (delayed 3s if Kodi was just installed) → "Forfeit" button is disabled.
12. **Forfeit Interaction** → Clicking Forfeit shows `confirm()` dialog → on confirmation invokes `ForfeitGame`.
13. **Logout** → Clicking Logout navigates to `"./"` (back to login page), which triggers SignalR `OnDisconnectedAsync` → server cleanup.

### Server-Side Flow

14. **Client Connection** → Client connects to `/Cards56Hub` via SignalR → `OnConnectedAsync` logs the `ConnectionId`.
15. **Player Registration** → Hub normalizes language → `GameController.AddOrUpdatePlayer()` → `Players.AddOrUpdatePlayer()` → fires `OnRegisterPlayerCompleted(player)` back to caller.
16. **Player Reconnection** → Same `RegisterPlayer` flow — old connection entries are purged, player object is preserved with new `ConnID`. Client can call `RefreshState()`.
17. **Player Disconnection** → SignalR fires `OnDisconnectedAsync` → calls `UnregiterPlayer()` → `GameController.DisconnectPlayer()` → `TableController.LeaveTable()` → if table empty, removes from `GameTables` → removes player from `Players` registry.
18. **Matchmaking (Public)** → `GameController.JoinTable(tableType, "")` → retries up to 10 times → `GameTables.GetFreeTable()` scans or creates.
19. **Private Table Join** → Prefixes with `"{type}-"` → looks up or creates table → joins player.
20. **Player Seating** → `TableController.JoinTable(player)` → under `lock(Game)` → broadcasts state.
21. **Game Start** → When table is full and stage is `WaitingForPlayers` → `StartNextGame(randomDealerPos)` → deals cards → stage → `Bidding` → broadcast.
22. **Dealing** → `DeckController.DealCards()` → shuffle → validate → deal 8 cards each, sorted.
23. **Bidding** → `PlaceBid`/`PassBid` → alternates between teams → bidding ends → `SelectingTrump` or `PlayingCards` (THANI).
24. **First Bidder No-Points Cancellation** → Zero card points → game cancelled, re-deal with same dealer.
25. **Trump Selection** → `SelectTrump(card)` → validated → card removed → first round starts with dealer as first player. If opposing team has no suit → game cancelled.
26. **Card Play** → `PlayCard(card, delay)` → validate → add to round → process round → process game → auto-play if possible → broadcast.
27. **Trump Exposure** → `ShowTrump(delay)` → trump card returned to bidder's hand → constraints applied.
28. **Round Processing** → Determine winner → calculate score → team score → next round.
29. **Game-Over Processing** → Win conditions → coolie adjustment → kodi management → return cards to deck.
30. **Forfeit** → Opposing team gets max points → `ProcessGame` → normal game-over.
31. **Next Game** → Dealer rotates to `DealerPos + 1` → re-deal and re-bid.
32. **State Refresh** → Resends personalized JSON state to the requesting player only.
33. **Error Flow** → Hub catches exception → `OnError` → client displays as alert toast.

---

## 4. Ambiguities & Gaps

### Client-Side Issues

| Area | Issue |
|------|-------|
| **jQuery 1.7** | Client uses `jquery-1.7.min.js` (released 2011). This is severely outdated and missing modern security patches, performance improvements, and API features. |
| **cards.js library** | `cards.js` is loaded from `lib/cards.js` with `type: PINOCHLE`. This is a third-party card rendering library. Its source is not provided, so card rendering behavior, supported card types, and interaction APIs are opaque. |
| **Ace encoding mismatch** | Server uses rank `1` for Ace; `cards.js` uses rank `14`. The client translates in `_get_card_obj` and `onPlayerCardClicked`, but the mapping is fragile — any code path that forgets the translation will fail silently (card not found) or show the wrong card. The `alert()` fallback in `_get_card_obj` if a card isn't found is the only safety net. |
| **Hardcoded roundOverDelay = 2000** | Both `PlayCard` and `ShowTrump` pass `2000` ms. This is a client-side constant not configurable. Combined with the server-side `Thread.Sleep`, it locks the game table for 2 seconds per round. |
| **Auto-play timeout = 5000** | The client auto-play timer of 5 seconds is hardcoded. No user preference or server-side configuration. |
| **No input sanitization on login** | Username is taken directly from an HTML input and passed via URL parameters. No length limit, no character filtering, no XSS protection beyond `htmlEscape` in error messages. |
| **URL parameter-based state passing** | Login → table navigation passes all state via URL query params (`username`, `tabletype`, `tablename`, `lang`, `watch`). These are readable and modifiable by the user. |
| **Forfeit has client-side confirm only** | `confirm()` dialog is the only guard against accidental forfeit. No server-side confirmation or team-consent mechanism. |
| **Error display via alert()** | `_get_card_obj` uses `alert()` for card-not-found errors, which blocks the UI thread. Other errors use the toast system. |
| **Fixed 1000×700px layout** | The table is hardcoded to 1000×700px. No responsive design, no mobile layout. Player positions are absolute pixel values in CSS. |
| **No mobile/touch support** | Card interactions rely on click events. No touch-specific handling. No viewport meta for scaling on `table.html` (though `index.html` has one). |
| **table.html missing viewport meta** | `index.html` has `<meta name="viewport" ...>` but `table.html` does not. The game surface will not scale properly on mobile. |
| **Bid panel absolute positioning** | Bid panel is positioned at `left: 224px, top: 225px` — fixed for all table types. May overlap with player positions in 6 or 8-player layouts. |
| **Version string hardcoded** | `_init_version("2025.04.01")` links to a GitHub release tag. Must be manually updated. |
| **No watcher interaction restrictions on client** | Client disables card clicks and bid panel for watchers (`this.watchOnly` check), but the bid panel `show()` method doesn't check watcher status independently — it relies on `currentPlayer == 0` which won't be true for watchers. |
| **SignalR CDN dependency** | `signalr.min.js` is loaded from `cdnjs.cloudflare.com`. If the CDN is unavailable, the game is completely non-functional. No local fallback. |
| **No HTTPS enforcement** | The login form submits via plain GET. No HTTPS redirect. Combined with the open CORS policy, credentials are transmissible in the clear. |
| **Commented-out code** | Login form has commented-out password field and sign-up link. `player.js` has commented-out `setTimeout` for kodi animation dismiss. Suggests incomplete features. |
| **No localStorage/sessionStorage** | Player identity (`playerID`) is stored only in the `Game` object's memory. Refreshing the page loses the player ID. The `registerPlayer` call on reconnect sends an empty `playerID`, causing the server to generate a new one — the player becomes a new identity and cannot rejoin their seat. |
| **Previous round cards** | Client shows the previous round's cards in a separate `last_round` hand area (lower-left). Only the most recent previous round is shown — earlier rounds are not accessible. |
| **Thani round card display logic** | `ShowRoundCards` has special THANI handling: bidder's card goes to index 0, then opponents fill odd indices only. This maps play-order back to seat positions visually. The logic uses `(i + 1) / 2` integer division to compute card position — correct but not obvious. |

### Server-Side Issues (carried forward)

| Area | Issue |
|------|-------|
| **GameController recreated on every call** | `Cards56Hub._GameController` is a property getter that does `new GameController(...)` on every access. Each hub method creates a brand-new `GameController` → `TableController` → `DeckController`. |
| **DeckController lock ineffective** | Each `TableController` instantiation creates a new `DeckController` with a new `_cardsLock`. Cross-call safety relies entirely on `lock(Game)` in `TableController`. |
| **AutoPlayedToCompletion lost** | Transient `TableController` means the flag is set but never observed. |
| **Health check broadcasts to all clients** | `SignalRHealthCheck` sends `"HealthCheck"` to every connected client. Not in `ICards56HubEvents`. |
| **CORS wide open** | `SetIsOriginAllowed(_ => true)` with `AllowCredentials()`. |
| **Typo: "UnregiterPlayer"** | Misspelled in interface, enum, and hub. Baked into the contract. |
| **No authentication/authorization** | Any client can connect and impersonate any player ID. |
| **Dealer selection (initial)** | First game uses `Random().Next(MaxPlayers)`. Subsequent games rotate. Cancelled games preserve dealer. |
| **Kodi endgame** | No visible win condition based on Kodi count. |
| **Watcher count off-by-one** | `> 2` check vs `>= 2` in `WatchersFull`. |
| **Thread.Sleep in ProcessRound** | Blocks server thread under lock. Client controls the delay value (2000 ms hardcoded, but the parameter is unbounded on the server). |
| **Random seed** | `new Random()` inside `ShuffleCards`. |
| **Shuffle infinite loop** | No escape hatch on corrupt deck. |
| **8-round hardcoded** | Should derive from `DeckSize / MaxPlayers`. |
| **THANI winner position mapping** | `winner*2-1` formula is fragile. |
| **Forfeit by either team** | No team-consent mechanism. |
| **Swallowed exceptions** | `FirstBidderHasNoPointsException` and `OppositeTeamHasNoTrumpCardsException` silently caught. |
| **JoinTable retry loop** | Catches all exceptions up to 10 times. |
| **Locale path inconsistency** | `AppContext.BaseDirectory + "locale"` vs `"./locale"`. |
| **Error code 19 unused** | `CannotPlayTheTrumpCardException` never thrown. |
| **Mid-game player departure** | `LeaveTable` doesn't cancel/forfeit the game. Null occupant risk. |
| **No game-level timeout** | Game hangs if a player disconnects without the event firing. |
| **No rate limiting** | Clients can spam hub methods. |
| **No hub-level input validation** | Parameters passed directly to `GameController`. |

---

## 5. Architecture Summary

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                                 │
│                                                                          │
│  index.html ──(form submit)──▶ table.html                               │
│                                   │                                      │
│                    ┌──────────────┼──────────────────┐                   │
│                    ▼              ▼                   ▼                   │
│               Game (game.js)  Table (table.js)  Player[] (player.js)    │
│               │  SignalR conn  │  cards.js lib    │  Per-seat UI         │
│               │  State mgmt   │  Card rendering   │  Name, bid, kodi    │
│               │  Hub invoke   │  Coolies, scores  │  Dealer, team       │
│               │               │  Alerts, buttons  │                      │
│               │               ▼                   │                      │
│               │          BidPanel (bid_panel.js)  │                      │
│               │          Bid buttons 28-57+Pass   │                      │
│               └──────────────┬────────────────────┘                      │
│                              │ SignalR WebSocket                         │
└──────────────────────────────┼───────────────────────────────────────────┘
                               │
                    ICards56Hub │ (client→server)     ICards56HubEvents (server→client)
                               ▼                     ▲
┌──────────────────────────────────────────────────────────────────────────┐
│  Cards56Hub (SignalR Hub)          ASP.NET Core (Program.cs)            │
│  - Transient per method call       - CORS: any origin                   │
│  - try/catch → OnError             - Static files (wwwroot)             │
│  - Lang in Context.Items           - Health check at /health            │
│  - Creates GameController/call     - Hub at /Cards56Hub                 │
└──────────────────────────────┬───────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  GameController (per-call facade)                                        │
│  - Bound to ConnID + Lang          - Sets Thread.CurrentCulture          │
│  - Resolves Player via Players registry                                  │
│  - Resolves GameTable via GameTables registry                            │
│  - Creates TableController per call                                      │
└──────────────────────────────┬───────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  TableController (per-call orchestrator)                                 │
│  - All methods lock(Game)          - Contains all game logic             │
│  - Calls StateUpdatedDelegate → Hub → Clients                           │
│  - Creates DeckController per instantiation                              │
└──────┬───────────────────────────────────────────────────────────────────┘
       ▼                          ▼                    ▼
┌─────────────┐  ┌──────────────────────┐  ┌─────────────────┐
│ DeckCtl     │  │ GameTable (state)     │  │ Players/Tables  │
│ - shuffle   │  │ - Chairs, Bid, Rounds │  │ (static regs)   │
│ - deal      │  │ - Scores, Trump       │  │ - ConcurrentDict│
│ - return    │  │ - Stage               │  │                 │
└─────────────┘  └──────────────────────┘  └─────────────────┘
```

**Key patterns:**
- Everything above `GameTable` is transient/recreated per request. All persistent state lives in `GameTable` and `Player` objects in their static registries.
- Thread safety: `lock(Game)` at the `TableController` level.
- Client is a single-page app after login: `table.html` with inline script bootstrapping, purely event-driven via SignalR.
- State is **fully server-authoritative**: client renders whatever `OnStateUpdated` delivers, validates nothing locally, and submits all actions to the server for validation.

---

## 6. Client File Map

| File | Role | Dependencies |
|------|------|-------------|
| `index.html` | Login page. Form collects name, table type, private table name, language, play/watch mode. | `jquery-1.7.min.js`, `login_util.css`, `login_main.css` |
| `table.html` | Game page. Reads URL params, bootstraps all client objects. | `jquery-1.7.min.js`, `signalr.min.js` (CDN), `cards.js`, `table.css`, `bid_panel.css`, `player.css` |
| `game.js` | `Game` class: SignalR lifecycle, hub method invocations, state rendering orchestration. | SignalR, Table, Player[], BidPanel |
| `table.js` | `Table` class: card rendering (hands, rounds, trump), coolies, scores, messages, buttons. | `cards.js` (PINOCHLE), jQuery |
| `player.js` | `Player` class: per-seat UI (icon, name, dealer, bid, kodi, watchers). | jQuery |
| `bid_panel.js` | `BidPanel` class: bid button popup (28–57, pass). | jQuery |
| `table.css` | Table surface, coolies, scores, center display, alerts, buttons. | Images: `table.jpg`, `240px-Glass_button_blue.svg.png`, `240px-Glass_button_red.svg.png` |
| `player.css` | Player seats, icons, names, dealers, bids, kodi markers. Layouts for 4/6/8 players. | Images: `person-blue.png`, `person-red.png`, `dealer.png`, `kunuk.gif`, `kodiinstalled.gif` |
| `bid_panel.css` | Bid panel popup positioning and button styles. | — |

---

## 7. Complete Error Code Reference

| Code | Exception Class | Message Template |
|------|----------------|-----------------|
| 0 | (base) | Unknown Error. |
| 1 | BiddingNotStartedException | Bidding has not yet started. |
| 2 | BiddingOverException | Bidding is over. |
| 3 | BiddingNotOverException | Bidding is not yet over. |
| 4 | NotPlayersTurnException | Waiting for {0} to play. It is not your turn. |
| 5 | BidOutOfRangeException | Bid must be between {0} and {1}. |
| 6 | PassNotAllowedException | Passing is not allowed. |
| 7 | GameNotStartedException | Game not yet started. |
| 8 | GameIsOverException | Game is over. |
| 9 | ThaniGameException | This is a thani game. |
| 10 | NotHighBidderException | You are not the high bidder. High bidder is {0}. |
| 11 | TrumpAlreadySelectedException | Trump already selected. |
| 12 | TrumpNotYetSelectedException | Trump not yet selected. |
| 13 | AllCardsPlayedForRoundException | All cards for the round are played. |
| 14 | PlayerAlreadyOnTableException | You are already on the table. |
| 15 | TableIsFullException | Table is full. |
| 16 | CardNotFoundException | Card not found. |
| 17 | CardNotOfRoundSuitException | Must play a ({0}). |
| 18 | CannotPlayTrumpSuitException | Cannot play trump suit. |
| 19 | CannotPlayTheTrumpCardException | Cannot play the trump card. |
| 20 | MustPlayTheTrumpCardException | Bidder must play THE trump card '{0}' immediately after exposing it. |
| 21 | MustPlayTrumpSuitException | Must play card from trump suit '{0}'. |
| 22 | FirstPlayerCannotShowTrumpException | First player cannot show trump. |
| 23 | RoundSuitCardExistsException | Must play '{0}' while you have them. |
| 24 | TrumpAlreadyExposedException | Trump card is already exposed. |
| 25 | PlayerNotRegisteredException | Player not registered. |
| 26 | PlayerNotOnAnyTableException | Player is not on any table. |
| 27 | GameNotOverException | Game is not yet over. |
| 28 | NotEnoughPlayersOnTableException | Not enough players on table. |
| 29 | OppositeTeamHasNoTrumpCardsException | Opposite team has no trump cards. Game cancelled. |
| 30 | FirstBidderHasNoPointsException | First bidder has no points. Game cancelled. |
| 31 | CardPlayNotStartedException | Card play has not started. |
| 32 | TooManyWatchersOnChairException | Too many watchers on chair. |
| 33 | WatcherCannotForfeitException | Watcher cannot forfeit. |

---

## 8. Complete Hub Method Reference

| Enum | Method | Parameters | Success Response | Notes |
|------|--------|-----------|-----------------|-------|
| 1 | RegisterPlayer | playerID, playerName, lang, watchOnly | `OnRegisterPlayerCompleted(player)` | Normalizes lang; stores in Context.Items |
| 2 | JoinTable | tableType, privateTableId | `OnStateUpdated` (broadcast) | Auto-starts game if table fills |
| 3 | PlaceBid | bid | `OnStateUpdated` (broadcast) | |
| 4 | PassBid | (none) | `OnStateUpdated` (broadcast) | May silently cancel game |
| 5 | SelectTrump | card | `OnStateUpdated` (broadcast) | May silently cancel game |
| 6 | PlayCard | card, roundOverDelay | `OnStateUpdated` (broadcast) | Client sends 2000ms; server Thread.Sleep |
| 7 | ShowTrump | roundOverDelay | `OnStateUpdated` (broadcast) | Client sends 2000ms |
| 8 | StartNextGame | (none) | `OnStateUpdated` (broadcast) | Rotates dealer |
| 9 | RefreshState | (none) | `OnStateUpdated` (caller only) | |
| 10 | ForfeitGame | (none) | `OnStateUpdated` (broadcast) | Watchers cannot forfeit |
| 11 | UnregiterPlayer | (none) | (none) | Called on disconnect; typo in name |


## 9. Context/Clarifications from Domain Expert

- In the highly competitive and vocal world of Kerala's 56 (Ambathiyaru) card game, the table banter is just as important as your strategy! **56 Cards** is a real-time multiplayer trick-taking card game from South India (Kerala / Tamil Nadu). The name comes from the total point value of all scoring cards in the deck: exactly 56. Two teams compete across a series of games: one team bids a point target it promises to reach, selects a hidden trump suit, then both teams play tricks. A meta-scoring layer of **Coolies** (team point reserves) and **Kodis** (penalty markers on individual players) tracks long-term match standing. Both kunukku and kodi are classic slang terms used to describe massive wins or embarrassing losses. These are metaphorical badges of dishonor. The only way to "take the kunukku off" is to aggressively bid and win enough hands.
- The game implementation employs a cut-and-move algorithm for shuffling the deck. It iterates 30 times initially on a new deck and 6 times on subsequent shuffles. This is not required when playing in the real world. However, this method produced sufficient shuffle quality - while many other attempts failed or were not as good.
- The bidding is done in stages
  - Base level: 28 to 39
  - Honors level: 40 to 47
  - 48 Level: 48 to 55
  - Full: 56
  - Thani: From a bidding perspecive this is the highest bid, but it does not translate to a number. For simplicity in implementing this special mode of game, this bid is tracked as 57. In this mode the bidder has to play alone without his team members, the bidder immediately starts the game, there is no trump card. In order to win, the bidder has to win all rounds (i.e., get 8 points - each round counts as 1 point). At the end of the game, regardless of current tally of koolies, the koolies will reset. If the bidder wins, the opposite team gets a kodi/kunukku and if the bidder looses, then his team gets a kodi/kunukku. In the game implementation, this is achieved by assigning a very large reward and penalty for thani. 
- In the game Suits really don't have an order, however in implmentation suits are sort as: Hearts < Spades < Diamonds < Clubs (by index in the `[h, s, d, c]` list) for simplicity.
- cards.js is a JS library for managing the cards deck as well as for rendering the cards on the screen. It is configured to use the PINOCLE set of cards since that matches the card set required for 56 also. However, cards.js has been modified significantly to meet requirements for 56. There are also differences in how ACE is encoded in the main project (1) vs. how this library encodes it (14). So, some translations need to be done while talking to the library about ACE. 
  - Cards.js works fine for now, but it should be removed and replaced with something simpler at some point.
- BidPass.cs is a simple class that holds information about whether a player placed a bid (if so what was the bid) or whether the player passed when it was his turn to bid. BidHistory tracks the history of all the bidding turns players got and what the did. 
- Bidding alternation logic: 
  - Bidding goes anti clockwise from player to player.
  - The first player (or dealer in the game implementation) represents the first bidder for his team and the player to his right is the first bidder for the opposing team.
  - Bidding chance for a team goes from one player to next teammate to the right.
  - Bidding alternates between the teams.
  - When a team member bids, the bidding chance moves to the opposite team
  - When a team member passes, the bidding chance remains with his team, but moves to the next teammate to the right.
  - When all team members from one team pass the opposite team's bid, the bidding goes back to the bidding team. This time the teammember to the right of the bidder gets a chance to bid. If he decides to pass then the chance goes to the next teammember to the right, and thus eventually the bidding chance returns to the bidder himself.
  - When outbidding one's own teammate or even oneself, then the bid must be in the lext level for that player. The bid level is higher than a) the last level the player bid or passed on, and b) the level current high bid.
  - After the bidding returns to the current high bidder, and he decides to pass on his own bid or raise his bid to a higher level, the bidding rounds end and the game starts.
- Private vs. Public tables: When a player just wants to play and doesn't care with whom he plays, he can join a public table. On the other hand when group of friends want to play with each other, they use a secret table name that they share with each other via some mechanism (like using a whatsapp group chat). For joining a privately named table the table name must be provided.
- If a player gets all cards of the same suit then that shuffle should be considered invalid and a reshuffle should be done.
- The game is also cancelled if the opposing team has no trump cards. This rule does not apply for THANI game.
- During mid-trick if a player does not have a suit being played, and the trump is not exposed, he can choose to "show" the trump. When this happens several things happen.
  - The trump card is visible to all players
  - The trump card returns to the highbidder's cards in hand
  - The player who asked to show the trump, must play a trump card (if he has at least one trump). If he doesn't, then he can play whatever card he wants.
  - The restriction on the highbidder that he cannot start a round with the trump is lifted. Otherwise, the highbidder can start a round with a trump suit only when all cards in his hand are of the trump suit.
- As in real world a player can simply leave the game and leave the table. In this case, the leaving player is removed from the chair, but the game is not forfeited or cancelled. Other players see an empty seat. New players can join the empty seat but will receive the same cards that the previous player left behind.
- When a player joins the game and he asks for a public table of a particular size (4, 6, 8), the "server application" searches through the public tables of that size to see if any of them are waiting for a player to join (i.e., there is a free seat or chair). If such a spot is found then the player is assigned to that chair. If there are no free seats then a new public table is created and the player is seated on a chair on that newly created table.
- When a player joins the game and he asks for a privately named table of a particular size (4, 6, 8), the server application looks a named table of that size. If such a table doesn't exist then it is created and the player is seated on it. If such a table does pre-exist and there is a free spot for the player to join it, then the player is seated to the free spot. If there are no free spots on that table then the player gets an error saying that the table is already full and there is not spot for him on the table he requested.
- When the situation of `FirstBidderHasNoPointsException` or `OppositeTeamHasNoTrumpCardsException` happen, it is not really an "Error" condition. It is a normal thing that can happen during  physical games also. The rule is that the game is cancelled and the game restarts with a new shuffle and the next dealer. However, implementation has an issue where the game restarts with the same dealer instead of the next one. This is a known issue, and since this doesn't happen very often and is of not much consequence, it has been very low priority for a fix.
- When the game is physically played, there are typically people who simply stand behind a player and watch his cards and the play. Watchers in the app are assigned to a char and they can see pretty much what the player sees. In the implementation, the bid panel is not shown to the watcher. But everything else that is visible to a player is visible to a wacther who is watching him. In the game implementation, watchers have a view only role. In the implementation, the effective limit is 2 watchers per chair.
- A player can become a watcher mid-game, by leaving the table and rejoining as a watcher. There is no option for a player to convert himself to a watcher or vise versa.
- When a team gets a Kodi, the immediately following one game is a little special for that team. It is called a KodiIrrakkamRound. The speciality is that, if their team makes the highest bid AND they win, all teammeber can remove one Kodi each. If the game gets cancelled due the situations mentioned earlier, KodiIrrakkamRound is not lost, the following game becomes the KodiIrrakkamRound for that team.
- Otherwise, in general, each player has to remove his kodi one at a time. When the bidding team wins, the highbidder from that team gets remove one of his owm kodis i.e., if he has one or more of them).
- When a player leaves a table and the table has empty seats/chairs the game is in a paaused state. The game cannot move forward till someone sits on that empty chair to resume the game. StartNextGame can also not proceed when table is not full.
- At the server level the state object has the complete information about the game. When the state is broadcast to players, it is personalized so that each person sees only his own cards and what is really needed by players. 
- Currently there is no infrastrucutre to testing. It must be tested manually by launhing multiple tabs and login in. However, we should develop a mechanism to run automated functional tests. Maybe based on a set of full (non-personalized) state jsons.
- Locking is implemented on the serverside, and clients get errors if they try something they are not allowed or not yet allowed.
- The game is played for fun. There is no win condition when the game ends. Games continue indefinitely with Kodi accumulating and being removed. The game ends when the players get tired and go to sleep.
- CannotPlayTheTrumpCardException is not used and should be removed at some point. CannotPlayTrumpSuitException serves the same purpose.
- ProcessRound calls Thread.Sleep(roundOverDelay) while holding lock(Game). The roundOverDelay parameter comes from the client (hardcoded at 2000ms). This is probably a bad implementation Becasue it allows a malicious client send a very large delay. I am also unsure of any performance issues this could cause. This is being done to add a slight delay between round over and clearing of the cards from the table. However, the design should be fixed to add some validation and range check on the parameter at some point.
- AutoPlayedToCompletion is never used. Should be removed at some point.
- 8-round maximum is hardcoded. Is should be derived from DeckSize / MaxPlayers.


---

## 10. StateUpdatedDelegate Event Flow (Deep Trace)

The `StateUpdatedDelegate` is the core server-to-client push mechanism. Here is the complete call chain across all four layers:

### 1. Delegate Declaration (`TableController.cs`)
```
public delegate void StateUpdatedDelegate(string PlayerID, string jsonState);
```
Signature: takes a connection ID string and a JSON state string.

### 2. Wiring Path: Hub → GameController → TableController

**Step A: Hub creates GameController, passing its own method as the delegate**
```
// Cards56Hub.cs — property getter (creates new GameController per call)
private GameController _GameController {
    get {
        string lang = Context.Items.TryGetValue("Lang", out object? value) ? value?.ToString() ?? "en-US" : "en-US";
        return new GameController(Context.ConnectionId, lang, OnStateUpdated);
        //                                                      ^^^^^^^^^^^
        //  This is Cards56Hub.OnStateUpdated (the hub's own method)
    }
}
```

**Step B: Hub's OnStateUpdated method — bridges to SignalR client delivery**
```
// Cards56Hub.cs
public void OnStateUpdated(string connID, string jsonState)
{
    Clients.Client(connID)?.OnStateUpdated(jsonState);
    // Calls the strongly-typed ICards56HubEvents.OnStateUpdated on the target client
}
```

**Step C: GameController stores the delegate and passes it to TableController**
```
// GameController.cs constructor
private readonly StateUpdatedDelegate OnStateUpdated;
public GameController(string connID, string lang, StateUpdatedDelegate onStateUpdated)
{
    OnStateUpdated = onStateUpdated;  // stores the hub's method reference
}

// GameController.GetTableController() — passes delegate through
private TableController GetTableController()
{
    return new TableController(GameTables.All[player.TableName], OnStateUpdated);
    //                                                            ^^^^^^^^^^^
}
```

**Step D: TableController stores and invokes the delegate**
```
// TableController.cs constructor
private StateUpdatedDelegate StateUpdated;
public TableController(GameTable gameTable, StateUpdatedDelegate stateUpdated)
{
    Game = gameTable;
    StateUpdated = stateUpdated;  // stores the same hub method reference
}
```

### 3. Invocation: SendStateUpdatedEvents()

```
// TableController.cs — called after every state mutation
public void SendStateUpdatedEvents(Player? player = null)
{
    if (player != null)
    {
        // Single-player refresh (used by RefreshState)
        StateUpdated(player.ConnID, GetJsonState(player));
    }
    else
    {
        // Full broadcast — iterates ALL chairs
        foreach (Chair c in Game.Chairs)
        {
            if (c.Occupant != null)
                StateUpdated(c.Occupant.ConnID, GetJsonState(c.Occupant));
            foreach (var w in c.Watchers)
                StateUpdated(w.ConnID, GetJsonState(w));
        }
    }
}
```

### 4. Client Receipt (`game.js`)
```
// game.js — registered during connection setup
this.hubConnection.on("OnStateUpdated", this.OnStateUpdated);

// game.js — handler
OnStateUpdated = (jsonState) => {
    this.gameState = JSON.parse(jsonState);
    // ... full UI rendering pipeline
}
```

### Complete call chain summary
```
TableController method (e.g. PlaceBid)
  └→ SendStateUpdatedEvents()                         [TableController.cs]
       └→ for each chair: StateUpdated(connID, json)  [delegate invocation]
            └→ Cards56Hub.OnStateUpdated(connID, json) [Cards56Hub.cs]
                 └→ Clients.Client(connID)?.OnStateUpdated(json)  [SignalR delivery]
                      └→ game.js OnStateUpdated(jsonState)        [client handler]
                           └→ JSON.parse → full UI re-render
```

### Key observations
- The delegate is a **closure over the hub instance** — it captures `Clients` from the SignalR `Hub<T>` base class.
- `GetJsonState(player)` is called **once per recipient** — each player/watcher gets a personalized JSON.
- Watchers on a chair receive the **same personalized state as the occupant** of that chair (same `Cards`, same `TrumpCard` visibility), because `GetJsonState` uses `player.Position` to look up `Game.Chairs[player.Position].Cards`, and watchers inherit the occupant's `Position`.
- **No async/await:** `SendStateUpdatedEvents` is synchronous. The SignalR `OnStateUpdated` call (`Clients.Client(connID)?.OnStateUpdated(jsonState)`) returns a `Task` but it is **fire-and-forget** (not awaited). This is intentional — the server does not wait for client acknowledgment.

---

## 11. Bidding Algorithm Deep Dive (NextBidder, NextMinBid, OutBidChance)

### BidInfo Initialization (`BidInfo.cs` constructor)

```
public BidInfo(TableType T, int firstBidder)
{
    HighBid = -1;                     // No bid yet
    HighBidder = -1;                  // No bidder yet
    NextBidder = firstBidder;         // First bidder = player at DealerPos (set by InitializeNextGame)
    NextMinBid = 28;                  // Always starts at 28
    NextBidderFromTeam = new int[2];  // Per-team rotation tracker
    NextBidderFromTeam[T.TeamOf(firstBidder)] = firstBidder;         // Team A's first bidder
    NextBidderFromTeam[T.TeamOf(firstBidder+1)] = T.PlayerAt(firstBidder+1); // Team B's first bidder
    OutBidChance = Enumerable.Repeat(0, T.MaxPlayers).ToArray();     // All zeros initially
    BidHistory = new List<BidPass>();
}
```

### OutBidChance — What It Tracks and Why

`OutBidChance` is an array of size `MaxPlayers` (one entry per seat). It tracks **the bid level at which each player last participated**. Its purpose is to enforce that when a player re-enters the bidding, they must bid at the next stage above their previous participation, not just `HighBid + 1`.

**Updates on bid:**
```
// PlaceBid: player places a bid
OutBidChance[player.Position] = bid;   // Records the actual bid value
```

**Updates on pass:**
```
// PassBid: player passes
OutBidChance[player.Position] = Game.Bid.NextMinBid;  // Records the min they would have had to bid
```

**Usage — calculating NextMinBid for a player:**
```
// For a player on the NON-bidding team:
NextMinBid = Math.Max(HighBid + 1, T.NextMinBidAfterBid(OutBidChance[NextBidder]));

// For a player on the SAME team as the high bidder:
NextMinBid = Math.Max(HighBid + 1, T.NextMinBidAfterBid(HighBid));
```

**Example (4-player, seats 0-3):**
- Player 0 bids 30 → `OutBidChance[0] = 30`
- Player 1 bids 31 → `OutBidChance[1] = 31`
- Player 2 passes (NextMinBid was 32) → `OutBidChance[2] = 32`
- Player 3 bids 40 → `OutBidChance[3] = 40`
- Player 0 gets turn again: `NextMinBid = max(41, NextMinBidAfterBid(30)) = max(41, 40) = 41`
- Player 2 gets turn again: `NextMinBid = max(41, NextMinBidAfterBid(32)) = max(41, 40) = 41`

### NextBidder Determination

**After a bid (PlaceBid):**
```
1. NextBidderFromTeam[my_team] = PlayerAt(my_position + 2)   // advance my team's pointer
2. NextBidder = NextBidderFromTeam[other_team]                // turn goes to other team
3. NextBidderFromTeam[other_team] = PlayerAt(NextBidder + 2)  // advance their pointer too
```

**After a pass (PassBid) — more complex, 3 cases:**
```
1. NextBidderFromTeam[my_team] = PlayerAt(my_position + 2)    // advance my team's pointer

2a. If passer is on SAME team as high bidder:
    → NextBidder = NextBidderFromTeam[my_team]                 // next teammate gets a chance

2b. If passer is on OPPOSING team, AND my teammate hasn't had a chance yet:
    (OutBidChance[NextBidderFromTeam[my_team]] < HighBid + 1)
    → NextBidder = NextBidderFromTeam[my_team]                 // teammate gets a chance first

2c. If passer is on OPPOSING team, AND teammate already had a chance:
    → NextBidder = NextBidderFromTeam[other_team]              // turn goes to other team

3. NextBidderFromTeam[NextBidder's team] = PlayerAt(NextBidder + 2)  // advance pointer
```

### NextMinBid After Pass — Two Rules

**For the next bidder on the HIGH BIDDER's team:**
```
NextMinBid = max(HighBid + 1, NextMinBidAfterBid(HighBid))
// Teammates must bid above the high bid's stage — they can't just bid HighBid+1
// if that would still be in the same stage
```

**For the next bidder on the NON-bidding team:**
```
NextMinBid = max(HighBid + 1, NextMinBidAfterBid(OutBidChance[NextBidder]))
// They must bid above BOTH the current high bid AND their own previous stage
```

### NextBidderFromTeam — Rotation Mechanism

`NextBidderFromTeam[team]` is an array of 2, indexed by team (0 or 1). It tracks **which player on each team gets the next bidding opportunity**. It advances by 2 positions (i.e., to the next teammate) after each bid or pass.

Since `PlayerAt(pos) = pos % MaxPlayers`, and teammates are 2 seats apart, `PlayerAt(pos + 2)` cycles through teammates: in a 4-player game, `0 → 2 → 0 → ...`; in a 6-player game, `0 → 2 → 4 → 0 → ...`.

### BidInfo JSON Serialization
- `[JsonProperty]` on: `HighBid`, `HighBidder`, `NextBidder`, `NextMinBid`, `BidHistory`
- **NOT serialized** (no `[JsonProperty]`): `NextBidderFromTeam`, `OutBidChance`
- This means clients see the current bid state but cannot inspect the bidding rotation internals.

---

## 12. SignalR Context Object (`Cards56Hub.cs`)

### What `Context` is
`Context` is the `HubCallerContext` property inherited from `Hub<T>`. It is provided by the ASP.NET Core SignalR framework and represents the **current connection** invoking a hub method.

### Key properties used
| Property | Type | Usage in Cards56Hub |
|----------|------|-------------------|
| `Context.ConnectionId` | `string` | Unique per WebSocket connection. Passed to `GameController` constructor on every call. Used to look up the `Player` in the `Players` registry and to deliver `OnStateUpdated` via `Clients.Client(connID)`. |
| `Context.Items` | `IDictionary<object, object?>` | Per-connection key-value bag that **persists across hub method calls** for the lifetime of the connection. Used to store `"Lang"` (language preference). |

### How language is stored in Context.Items
```
// In RegisterPlayer():
if (Context.Items.ContainsKey("Lang"))
    Context.Items["Lang"] = lang;       // Update existing
else
    Context.Items.Add("Lang", lang);    // Add new

// In _GameController property getter (every hub call):
string lang = Context.Items.TryGetValue("Lang", out object? value)
    ? value?.ToString() ?? "en-US"
    : "en-US";
```

### Important: Context.Items vs. Context.ConnectionId lifecycle
- `Context.Items` persists for the **lifetime of the WebSocket connection**. It survives across multiple hub method calls.
- `Context.ConnectionId` changes on **reconnection**. When SignalR auto-reconnects, a new `ConnectionId` is assigned, but the client re-registers with its saved `playerID` so the `Players` registry is updated to the new `ConnID`.
- `Context.Items` is **lost on reconnection** since it's a new connection. However, `RegisterPlayer` is always called on reconnect, which re-sets the language.

---

## 13. ICards56Hub / ICards56HubEvents — Full Contract Details

### ICards56Hub (Client → Server, 11 methods)
This interface defines all methods the client can invoke on the server hub. Each method maps to a `Cards56HubMethod` enum value for error routing.

```csharp
public interface ICards56Hub
{
    Task RegisterPlayer(string playerID, string playerName, string lang, bool watchOnly);
    Task JoinTable(int tableType, string privateTableId);
    Task PlaceBid(int bid);
    Task PassBid();
    Task SelectTrump(string card);
    Task PlayCard(string card, int roundOverDelay);
    Task ShowTrump(int roundOverDelay);
    Task StartNextGame();
    Task RefreshState();
    Task ForfeitGame();
    Task UnregiterPlayer();  // Note: typo is permanent — part of the contract
}
```

### ICards56HubEvents (Server → Client, 3 events)
This interface defines the **strongly-typed** server-to-client contract. Because `Cards56Hub` extends `Hub<ICards56HubEvents>`, the `Clients` proxy is typed to this interface — the server can only send these 3 events.

```csharp
public interface ICards56HubEvents
{
    Task OnError(int errorCode, Cards56HubMethod hubMethodID, string errorMessage, Card56ErrorData errorData);
    Task OnStateUpdated(string jsonState);
    Task OnRegisterPlayerCompleted(Player player);
}
```

### Key implications
- **Type safety:** The server cannot accidentally send arbitrary events. Only `OnError`, `OnStateUpdated`, and `OnRegisterPlayerCompleted` are available.
- **The `HealthCheck` broadcast is NOT in this interface.** `SignalRHealthCheck` uses `IHubContext<Cards56Hub>` (the non-generic hub context), which provides untyped `Clients.All.SendAsync("HealthCheck", ...)`. This bypasses the strongly-typed contract. Clients with strongly-typed listeners ignore it; loosely-typed clients would receive it.
- **`OnError` includes the originating method:** The `Cards56HubMethod` enum lets the client know which action failed (e.g., `PlaceBid=3`, `PlayCard=6`), enabling context-specific error handling (though the current client doesn't use this — it just displays the message).

### Cards56HubMethod Enum (error context)
```csharp
public enum Cards56HubMethod
{
    RegisterPlayer=1, JoinTable=2, PlaceBid=3, PassBid=4,
    SelectTrump=5, PlayCard=6, ShowTrump=7, StartNextGame=8,
    RefreshState=9, ForfeitGame=10, UnregiterPlayer=11,
}
```

---

## 14. Development Setup & Infrastructure

### Project Structure (`Cards56Web.sln`)
```
Cards56Web.sln
├── Cards56Lib/Cards56Lib.csproj    — Class library with all game logic
└── Cards56Web/Cards56Web.csproj    — ASP.NET Core web project (hub, static files)
```

### .NET Version and Dependencies (`Cards56Web.csproj`)
```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="..\Cards56Lib\Cards56Lib.csproj" />
  </ItemGroup>
</Project>
```
- **.NET 8.0** (LTS release)
- **Nullable reference types** enabled
- **Implicit usings** enabled (System, System.Collections.Generic, etc. auto-imported)
- Cards56Lib NuGet dependencies (from domain expert notes): `Newtonsoft.Json`, `NGettext`

### Development Environment
- **Recommended IDE:** VS Code with Dev Containers extension
- **Container:** Dev container auto-sets up .NET 8 LTS, gettext tools (for .po → .mo locale compilation), NuGet restore, Docker access
- **Run command:** `cd Cards56Web && dotnet run`
- **Dev server port:** `http://localhost:8080`

### Production Deployment
- **Docker image:** `bheemboy/cards56web` (published to Docker Hub)
- **Base images:** `mcr.microsoft.com/dotnet/sdk:8.0` (build stage), `mcr.microsoft.com/dotnet/aspnet:8.0` (runtime stage)
- **Production port:** `80` (HTTP only, via `ASPNETCORE_URLS=http://+:80`)
- **Timezone:** `TZ=America/Los_Angeles` (hardcoded in Dockerfile)
- **Health check:** `curl -f http://localhost/ || exit 1` (Docker-level)
- **Build tools installed:** `gettext` (build stage only), `curl` (runtime for health checks)
- **No HTTPS:** No TLS/SSL configured. No nginx reverse proxy (commented out in Dockerfile). No certbot.

### Docker Compose (`docker-compose.yml`)
```yaml
services:
    web:
        image: bheemboy/cards56web
        container_name: cards56web
        restart: unless-stopped
        dns: [1.1.1.1]
        ports: ["80:80"]
```

### Version Scheme
- Tagged as `bheemboy/cards56web:YYYY.MM.DD` plus `:latest`
- Client-side version displayed via `_init_version("2025.04.01")` linking to GitHub releases
- Build automation via GitHub Actions (manually triggered) or local `docker build`

---

## 15. GetJsonState — Personalized State Serialization

### The anonymous object constructed per player
```csharp
var state = new
{
    PlayerPosition = player.Position,                          // int: this player's seat (0-based)
    PlayerID = player.PlayerID,                                // string: GUID
    WatchOnly = player.WatchOnly,                              // bool
    TableFull = TableFull,                                     // bool: all chairs have occupants?
    GameStage = Game.Stage,                                    // int (GameStage enum value 0-5)
    PlayerCards = Game.Chairs[player.Position].Cards,          // List<string>: ONLY this chair's cards
    TrumpExposed = Game.TrumpExposed,                          // bool: global trump exposure status
    CurrentRoundSuit = CurrentRoundSuit,                       // char: first card's suit of current round (' ' if none)
    TrumpCard = ((player.Position==(Game.Bid?.HighBidder ?? -1)) || (Game.TrumpExposed))
                ? Game.TrumpCard : "",                         // string: conditional — only if bidder or exposed
    TableInfo = Game                                           // GameTable object (serialized per [JsonProperty] attrs)
};
```

### What TableInfo serializes (GameTable with [JsonProperty] only)

| Field | Type | Serialized? | Notes |
|-------|------|-------------|-------|
| `Type` | `int` | ✅ | `T.Type` — 0, 1, or 2 |
| `MaxPlayers` | `int` | ✅ | 4, 6, or 8 |
| `TableName` | `string` | ✅ | e.g., `"PUBLIC_TABLE_..."` |
| `GameCancelled` | `bool` | ✅ | |
| `GameForfeited` | `bool` | ✅ | |
| `Chairs` | `List<Chair>` | ✅ | Each Chair serializes: Position, Occupant, Watchers, KodiCount, KodiJustInstalled. **NOT Cards** (no `[JsonProperty]` on `Chair.Cards`). |
| `Bid` | `BidInfo` | ✅ | Serializes: HighBid, HighBidder, NextBidder, NextMinBid, BidHistory. **NOT** NextBidderFromTeam, OutBidChance. |
| `Rounds` | `List<RoundInfo>` | ✅ | Each round: FirstPlayer, NextPlayer, PlayedCards, AutoPlayNextCard, TrumpExposed[], Winner, Score |
| `DealerPos` | `int` | ✅ | |
| `RoundWinner` | `int` | ✅ | |
| `RoundOver` | `bool` | ✅ | |
| `WinningTeam` | `int` | ✅ | -1 if not yet determined |
| `WinningScore` | `int` | ✅ | |
| `TeamScore` | `List<int>` | ✅ | [team0_score, team1_score] |
| `CoolieCount` | `List<int>` | ✅ | [team0_coolies, team1_coolies] |
| `Stage` | `GameStage` | ❌ | **Not serialized** on GameTable — sent at top-level as `GameStage` instead |
| `TrumpCard` | `string` | ❌ | Sent conditionally at top-level |
| `TrumpExposed` | `bool` | ❌ | Sent at top-level |
| `Deck` | `List<string>` | ❌ | **Never sent** to clients |
| `KodiIrakkamRound` | `List<bool>` | ❌ | Internal-only |
| `TableFull` | computed | ❌ | Sent at top-level |
| `WatchersFull` | computed | ❌ | Not sent |

### Debug behavior
In `DEBUG` builds on Windows, the JSON is also written to `%TEMP%\GameState-{position}.json` for each player. This is how the sample `6PlayerGameState.json` was likely captured.

---

## 16. Client-Side State JSON Shape (from `6PlayerGameState.json`)

This is a real captured state from a **6-player game (Type 1)**, viewed by a **watcher** at position 5, during **GameOver (stage 5)**.

### Top-level fields
```json
{
  "PlayerPosition": 5,          // This recipient's chair position
  "PlayerID": "6867D5B1-...",   // This recipient's GUID
  "WatchOnly": true,            // This recipient is a watcher
  "TableFull": true,            // All 6 chairs occupied
  "GameStage": 5,               // GameOver
  "PlayerCards": ["s9", "s10"], // Cards remaining at this chair (2 cards left = 6 rounds played)
  "TrumpExposed": true,         // Trump was exposed during this game
  "CurrentRoundSuit": "d",      // Last round's led suit (Diamonds)
  "TrumpCard": "s1",            // Ace of Spades was trump (visible because exposed)
  "TableInfo": { ... }          // Full GameTable serialization
}
```

### TableInfo.Chairs structure (per chair)
```json
{
  "Position": 0,
  "Occupant": {
    "PlayerID": "BCD5C76A-...",
    "Name": "1",
    "Lang": "ml-IN",
    "WatchOnly": false
  },
  "Watchers": [
    { "PlayerID": "...", "Name": "Sunil", "Lang": "ml-IN", "WatchOnly": true },
    { "PlayerID": "...", "Name": "sdfgsfd", "Lang": "ml-IN", "WatchOnly": true }
  ],
  "KodiCount": 0,
  "KodiJustInstalled": false
}
```
Note: **No `Cards` field** — `Chair.Cards` lacks `[JsonProperty]` and is excluded from JSON. Each player's cards are delivered only via the top-level `PlayerCards`.

### TableInfo.Bid structure
```json
{
  "HighBid": 44,
  "HighBidder": 5,
  "NextBidder": 5,
  "NextMinBid": 48,
  "BidHistory": [
    { "Position": 4, "Bid": 28 },   // First bid by dealer
    { "Position": 5, "Bid": 29 },   // Opposing team
    { "Position": 0, "Bid": 30 },   // ...
    { "Position": 1, "Bid": 31 },
    { "Position": 2, "Bid": 32 },
    { "Position": 3, "Bid": 33 },
    { "Position": 4, "Bid": 0 },    // Pass (bid=0)
    { "Position": 0, "Bid": 43 },   // Jump to stage 2
    { "Position": 5, "Bid": 44 },   // Outbid
    { "Position": 2, "Bid": 0 },    // Passes cascade...
    { "Position": 4, "Bid": 0 },
    { "Position": 0, "Bid": 0 },
    { "Position": 1, "Bid": 0 },
    { "Position": 3, "Bid": 0 },
    { "Position": 5, "Bid": 0 }     // High bidder passes own bid → auction ends
  ]
}
```
Note: `NextBidderFromTeam` and `OutBidChance` arrays are **absent** (not serialized).

### TableInfo.Rounds structure (per round)
```json
{
  "TrumpExposed": [false, true, true, true, true, true],  // Per-play exposure flag
  "FirstPlayer": 4,
  "NextPlayer": -1,           // -1 = round complete
  "PlayedCards": ["h11", "s1", "c12", "h12", "h1", "h10"],  // 6 cards (one per player)
  "Winner": 5,
  "Score": 6
}
```
The `TrumpExposed` array shows that trump was exposed **during the second card play** of the first round (index 0 is `false`, indices 1-5 are `true`).

### Observations from this sample game
- **Bidding pattern:** 6 players, bidding went from 28→33 in 6 sequential single-increment bids. Player 4 then passed, Player 0 jumped to 43 (stage 2), Player 5 bid 44, then everyone passed, and Player 5 passed their own bid to end the auction.
- **Trump:** Ace of Spades (`s1`) selected by Player 5 (position 5). Exposed during round 1 on the second play.
- **Game ended after 6 of 8 rounds** — both teams reached 18 points, but WinningTeam=0 with WinningScore=3. This means Team 0 (the opposing team) won because the bidder (position 5, Team 1) bid 44 but only scored 18 (Team 1 = positions 1,3,5), while Team 0 (positions 0,2,4) scored 18 which exceeds `56 - 44 = 12`. Actually, checking more carefully: the condition is `TeamScoreOf(HighBidder+1) > (56 - HighBid)` = `18 > 12` = true, so the opposing team (Team 0) won.
- **Coolie counts:** `[9, 3]` — Team 0 has 9 coolies, Team 1 has 3. WinningScore=3 (stage 2 lose points), so Team 1 (bidder's team) lost 3 coolies. This shows an asymmetric coolie state from prior games.

---

## 17. table.html URL Parameters

### Parameter extraction (`$(document).ready()` in `table.html`)

```javascript
$(document).ready(function()
{
    username  = getParamValue("username");           // string: player name
    tabletype = parseInt(getParamValue("tabletype")); // int: 0, 1, or 2
    tablename = getParamValue("tablename");          // string: private table name (or null)
    lang      = getParamValue("lang");               // string: "en" or "ml"
    let w     = getParamValue("watch");              // string: "true" or null
    watch     = (w != null && w == 'true') ? true : false;  // bool

    player_count = (tabletype == 0) ? 4 : (tabletype == 1) ? 6 : 8;
    // ... creates Table, BidPanel, Player[] instances, then Game
});
```

### Complete parameter reference

| Parameter | Source (index.html) | Type | Required | Validation | Used by |
|-----------|-------------------|------|----------|-----------|---------|
| `username` | `<input id="username" name="username">` | string | Yes (alert if empty) | Client-side only: `length > 0` | `Game.registerName` → `RegisterPlayer()` |
| `tabletype` | `<select id="tabletype" name="tabletype">` | int | Yes (select default=0) | Options: `0`, `1`, `2` | `Game.tableType`, determines `player_count` (4/6/8), `Table` layout, `Player[]` count |
| `tablename` | `<input id="tablename" name="tablename">` | string | No | None | `Game.privatetablename` → `JoinTable()` as `privateTableId` |
| `lang` | `<input type="radio" name="lang">` | string | Yes (radio default="ml") | Values: `"ml"` or `"en"` | `Game.lang` → `RegisterPlayer()` → server normalizes to `"ml-IN"` or `"en-US"` |
| `watch` | `<input type="hidden" id="watch" name="watch">` | string | Yes (hidden default="false") | Set to `"true"` by Watch button click, `"false"` by Play button click | `Game` constructor → `registerPlayer(watchOnly)` |

### How index.html submits
- The `<form>` has `action="table.html"` — it submits as a standard GET request
- The "Play" button sets `watch=false`, the "Watch" button sets `watch=true` (via hidden field manipulation)
- Both buttons validate that username is non-empty
- `tabletype` and `tablename` can be pre-filled via URL params to index.html itself (used for sharing table links)

---

## 18. lock(Game) Mechanics Deep Dive

### The core question: how does locking work when TableController is transient?

**Answer:** `lock(Game)` locks on the `GameTable` **object reference**, not on the `TableController` instance. Since `GameTable` is a **reference type** (class) stored in the static `GameTables` registry, every transient `TableController` that wraps the same table receives the **same object reference**. Therefore they all lock on the same monitor.

### Step-by-step trace

**1. GameTable lives in a static registry:**
```csharp
// GameTables.cs
private static ConcurrentDictionary<string, GameTable> _tables = new();
```

**2. GameController looks up the GameTable by name:**
```csharp
// GameController.cs
private TableController GetTableController()
{
    Player player = GetCurrentPlayer();
    return new TableController(GameTables.All[player.TableName], OnStateUpdated);
    //                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //  This returns the SAME GameTable object reference every time
}
```

**3. TableController stores the reference:**
```csharp
// TableController.cs
public GameTable Game { get; }
public TableController(GameTable gameTable, StateUpdatedDelegate stateUpdated)
{
    Game = gameTable;  // stores the same object reference from the registry
    // ...
}
```

**4. All public methods lock on that reference:**
```csharp
// TableController.cs — every mutating method:
public void PlaceBid(Player player, int bid)
{
    lock (Game)  // = lock on the GameTable instance from the registry
    {
        // ... all mutations happen here
    }
}
```

### What this means in practice

```
Hub call A (Player 1: PlaceBid) ─→ new GameController ─→ new TableController(same_GameTable_ref)
                                                            └→ lock(Game) ← acquires monitor
Hub call B (Player 2: PlayCard) ─→ new GameController ─→ new TableController(same_GameTable_ref)
                                                            └→ lock(Game) ← BLOCKED until A releases
```

- Even though `GameController` and `TableController` are brand-new objects on every hub call, they all reference the **same `GameTable` instance** from the static registry.
- `lock(Game)` in C# is syntactic sugar for `Monitor.Enter(Game)` / `Monitor.Exit(Game)` on the object reference.
- **Consequence:** Only one hub call per table can execute at a time. Different tables operate concurrently with no contention.

### The DeckController lock is redundant
```csharp
// DeckController.cs
private readonly object _cardsLock = new object();  // NEW object per DeckController instance
```
Since `DeckController` is also transient (new instance per `TableController`), each one gets its own `_cardsLock`. This lock only protects within a single method call — but `lock(Game)` already ensures only one call runs at a time. The `DeckController` lock is **effectively a no-op** for cross-call safety.

### Edge case: GameTables.All[] lookup is not under lock(Game)
```csharp
// GameController.GetTableController():
return new TableController(GameTables.All[player.TableName], OnStateUpdated);
```
The dictionary lookup `GameTables.All[player.TableName]` happens **before** `lock(Game)` is acquired. The `ConcurrentDictionary` protects the lookup itself from corruption, but there is a tiny window where the table could be removed between lookup and lock acquisition. In practice this is unlikely (tables are only removed when completely empty).
