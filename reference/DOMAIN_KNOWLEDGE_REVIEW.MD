Here's my review across the four dimensions you asked about:

---

## 1. Claims That Seem Like Assumptions Rather Than Source-Derived

**§1 — "No database; all state is in-memory."** The document presents this as architectural fact, but neither the source code nor the README explicitly states there is *no* database. The claim is inferred from the absence of any DB dependency. This is almost certainly correct, but it's an inference, not a derived claim — worth tagging as such.

**§4.7 — "Coolies reset regardless. Implementation achieves this via very large win/lose points (`BaseCoolieCount × 2`), guaranteeing coolie exhaustion and Kodi installation."** This is stated as intentional design, but it reads like reverse-engineering of a side effect. The code sets the win/lose points to `BaseCoolieCount × 2`, and the *effect* is coolie exhaustion, but whether this is the *intended mechanism* vs. a coincidence of the formula is an assumption. The domain expert quote says coolies "will reset," but doesn't confirm this specific implementation path was the deliberate way to achieve it.

**§4.3 — "30 times on a fresh deck, 6 times on re-shuffles."** The document says `ShuffleCount = 6` and `ShuffleCount *= 5` for a fresh deck. That's `6 × 5 = 30`, but the "fresh deck" vs. "re-shuffle" framing is an assumption. The code multiplies by 5 when the deck is null or the wrong size — that could mean first-ever shuffle, or it could mean the deck got corrupted. The doc silently equates "null/wrong-size deck" with "fresh deck" without acknowledging the corruption scenario.

**§3.3 — "`GameStage` is sent as a top-level field (not from GameTable — `Stage` has no `[JsonProperty]` there)."** This is correct about serialization, but the parenthetical claim implies this is a deliberate information-hiding choice. It could equally be an oversight — `Stage` is sent as a top-level field in `GetJsonState` anyway, so omitting `[JsonProperty]` on `GameTable.Stage` might just be avoiding duplication rather than hiding it.

**§5.6 — "The delegate invocation is fire-and-forget (`Task` returned but not awaited)."** Looking at the code, `OnStateUpdated` in the hub calls `Clients.Client(connID)?.OnStateUpdated(json)` — this returns a `Task` but the hub method signature is `void`, so the Task is indeed not awaited. However, calling it "fire-and-forget" is an architectural characterization. It might just be a bug or an accepted trade-off. The document presents it as a known design decision without evidence.

**§6.2 — "Silently swallowed exceptions" described as intentional.** The domain expert confirms cancellations are "normal," but the document extends this to say the silent swallowing pattern in `GameController` is *intentional* design. The `catch` blocks in `PassBid()` and `SelectTrump()` are empty catches on specific exceptions — this could equally be laziness rather than conscious design. The expert confirmed the *behavior* is correct but didn't specifically endorse the empty-catch pattern.

---

## 2. Concepts Referenced But Not Defined

**"Clockwise" / "anti-clockwise"** — The document uses both terms (§4.4 says "bidding goes anti-clockwise," §4.13 says "next seat clockwise") without defining what clockwise means in the context of the position numbering. Does position 0→1→2→3 go clockwise or anti-clockwise? The code uses `PlayerAt(position+1)` which increments, but the doc doesn't establish whether incrementing positions maps to clockwise or anti-clockwise at the visual table. This is actually contradictory — if dealer rotation is "clockwise" via `+1`, and bidding alternation also uses `+1`, they can't be in opposite directions.

**"Bid Stage" / "Bid Level"** — Listed in the glossary but the glossary definition says "a bracket within the bid range that determines scoring multipliers" and then lists names (Base, Honors, 48-Level, Full, Thani). The `StageForBid()` method returns numeric stages 1–5 but the document never explicitly maps the named stages to these numeric values. A reader could guess, but shouldn't have to.

**"Double deck"** — §4.1 says "each card appears twice" and gives the formula `4 × rank_count × 2`, but the document never explains *why* a double deck is used or what happens when two identical cards are in play. Can both copies of the same card appear in the same trick? The code treats them as distinct strings but they're identical — how does the card library handle this?

**"PINOCHLE"** — The glossary says "Card type configuration used by cards.js" whose "double-deck composition matches 56's requirements." But *what is Pinochle*? A new developer won't know it's a card game that also uses a 48-card double deck. More importantly, the doc doesn't explain *which* Pinochle configuration is used (Pinochle decks don't have 7s and 8s normally) or what modifications were made to `cards.js` to support all three table types.

**"BaseCoolieCount"** — Used throughout (especially in Thani scoring) but the document never explains *why* the base counts are 6, 6, 7 for the three table types. Is 7 for 8-player a design decision or derived from something?

**`cards.js` rendering model** — The document references `cards.Hand`, `cards.Deck`, `cards.all`, `card.container`, `card.shortName`, `deck.render({immediate: true})` without explaining the rendering model. How does the card library work? What's the difference between a Hand and a Deck in `cards.js`? What does `container = null` mean?

**"Position offsetting"** — §3.4 mentions `(serverPos - myPos + maxPlayers) % maxPlayers` as the client's local perspective transform. This is important for understanding the client but the document never explains *why* this is needed (each player sees themselves at position 0 in the UI, so server positions must be rotated).

---

## 3. Processes That Are Incomplete or Missing Steps

**Reconnection flow (§5.5)** — The diagram shows disconnection → reconnection → RegisterPlayer → JoinTable. But it's missing the step where the client actually *stores* and *sends* the playerID. Looking at `game.js`, the client stores `this.playerID` in memory and sends it on re-register. The diagram's "savedPlayerID" implies localStorage, which doesn't exist. The process should clarify: the playerID survives reconnection *only if* the page doesn't reload, because it's held in the `Game` instance's JS variable.

**What happens between trump selection and first card play** — §5.4 shows trump selection then jumps to "Each Round." But there's a gap: after `SelectTrump` succeeds, `Game.Rounds.Add(new RoundInfo(Game.DealerPos))` creates the first round with the *dealer* as first player. The document mentions this in §4.5 ("first round starts with the dealer") but the process diagram doesn't show this initialization step.

**The complete pass-bid flow for the high bidder's team** — §5.3 shows a nice 4-player example, but it doesn't cover the case where the high bidder's *teammate* passes. The bidding alternation description in §4.4 says "when a team member passes, the chance remains with his team, moving to the next teammate to the right," but the code's behavior when `SameTeam(player, HighBidder)` is true during a pass has a different path that isn't fully walked through.

**Table removal** — §5.5 mentions "If table empty: remove from registry" but the condition for "empty" is never spelled out in a process context. Looking at the code, `TableEmpty` means all chairs have null occupants AND all chairs have zero watchers. The document defines this in §3.1 (the `TableController` class) but doesn't include it in the disconnection process.

**Kodi installation cascading** — §4.10 says when coolies hit ≤ 0, Kodi is installed and coolies reset. But what if *both* teams hit ≤ 0 in the same game? The `ProcessGame` loop checks teams sequentially (`for i in 0..1`). The document doesn't address whether this can happen or what the outcome would be. (It can't happen in practice because coolie transfer is zero-sum, but that invariant isn't stated.)

**Auto-play → game-over → state broadcast ordering** — §5.7 describes three auto-play mechanisms but doesn't explain the full chain when `AutoPlayWhenPossible` fires. The server plays all remaining rounds in a tight loop, but does it send intermediate state updates? Looking at the code, `AutoPlayWhenPossible` calls `AutoPlayNextRound` → `ProcessRound(0)` → `ProcessGame()` in a loop *without* calling `SendStateUpdatedEvents()`. The broadcast happens once, after the loop, in `PlayCard`. This means the client sees all remaining rounds resolve at once. This is a significant behavioral detail missing from the process description.

**Game start when table fills** — §5.2 shows that if the table fills and stage is `WaitingForPlayers`, `StartNextGame` is called automatically. But what if the last player to join is a *watcher*? Watchers don't fill seats, so `TableFull` wouldn't become true from a watcher joining. The document doesn't clarify this path.

---

## 4. Questions a New Developer Would Still Have

1. **How do I run this locally and test it?** The README says `dotnet run` on port 8080, but the project has two projects (`Cards56Lib` and `Cards56Web`). Which one do I `dotnet run`? Where is `Program.cs`? The domain doc doesn't cover the startup configuration at all.

2. **What does the JSON state payload actually look like?** The document describes what fields are included/excluded, but never shows a sample JSON payload. A developer implementing a new client or debugging state issues would really want to see one.

3. **How are cards encoded as strings?** The document says `c1` = Ace of Clubs, but never systematically explains the encoding: first character is suit (`h`, `s`, `d`, `c`), remaining characters are rank (`1`, `7`, `8`, `9`, `10`, `11`, `12`, `13`). This is scattered across §6.3 and §4.2 but never presented as a single clear spec.

4. **What's the complete card ranking order?** §4.1 lists ranks "low → high" per table type, but §4.2 shows point values, and the relationship between rank order and point value isn't obvious (9 is worth 2 points but ranks above 10 which is worth 1). A combined table showing rank order + point value + whether the card exists per table type would be much clearer.

5. **When exactly does `SendStateUpdatedEvents()` fire — inside or outside the lock?** The document says "after every mutation" but the code shows it's called *inside* `lock(Game)` in most methods. This means the SignalR broadcast happens while holding the lock. This has performance implications that a new developer should understand.

6. **How does the `cards.js` double-deck work with card identity?** If there are two `h11` cards in the deck, and both get dealt to different players, how does `_get_card_obj` distinguish them? The code filters `cards.all` for matching `shortName` where `container == null` — but what if both copies are uncontained? It takes the first one. Is this deterministic?

7. **What's the player experience when a game is cancelled?** The document describes cancellation conditions and that `GameCancelled = true` is set, but doesn't explain: do players see their cards? Are they shown why the game was cancelled? Does a new game start automatically or does someone press "New Game"?

8. **How does the 6-player and 8-player bidding actually work?** All bidding examples use 4 players. With 6 players (3 per team), the bidding alternation gets much more complex. How does `NextBidderFromTeam` cycle through 3 teammates? The "next teammate to the right" is `PlayerAt(position+2)` which skips one seat, but with 3 teammates at positions 0, 2, 4, the progression would be 0→2→4→0. Is that right?

9. **What prevents a player from sending a fake `playerID` to hijack someone's session?** The document notes "no authentication" and "any client can impersonate any player ID" in §6.6, but doesn't describe the actual attack surface. Could a malicious client join a game, observe the state, then disconnect and reconnect with a different player's ID?

10. **Where are the image assets?** The CSS references `img/person-blue.png`, `img/kunuk.gif`, `img/dealer.png`, etc. These aren't in the project files provided. Where do they live? Are they in `wwwroot`?

11. **What happens to watchers when the occupant of their chair disconnects?** Do they stay attached to the empty chair? Can they see the cards left behind? If a new player sits down, do the watchers automatically start seeing the new player's perspective?

12. **How does the `BidPanel` Pass button interact with `AllowBidPass`?** The Pass button is always rendered in the bid panel markup. Is it disabled when passing isn't allowed, or is it always enabled and the server rejects invalid passes? Looking at `bid_panel.js`, the `show(minBid)` method only disables numbered bid buttons below `minBid` — the Pass button (`btn0`) is never disabled client-side.
