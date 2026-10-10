# Team Jeopardy Web App — Design Document

Status: Implemented local version. See README.md for setup, recovery instructions, and operating limits. Proposed gameplay defaults below are used by the implementation.

## 1. Purpose

A live, host-led Jeopardy game played by teams. Each player joins from their own device. The host prepares two question boards and a Final Jeopardy question, runs the game, and judges answers. The server manages fair player selection, buzzer eligibility, timers, and team scores.

Players answer regular clues aloud; the app handles buzzing and scoring. Final Jeopardy answers are submitted privately through the app.

## 2. Requirements

### Players

- Join a game and a team from a phone or computer.
- For each selected question, randomly select one representative from every team.
- Rotate representatives fairly: every eligible teammate gets a turn before anyone repeats.
- Initially, only selected representatives can buzz.
- After 10 seconds of active thinking time, open buzzing to every eligible player.
- The first valid buzz wins the right to answer.
- Pause the 10-second timer while an answer is being judged.

### Host

- Create and edit both boards and Final Jeopardy before starting.
- See the selected representatives for the current question.
- See the winning buzzer's player name and team.
- Mark an answer correct or incorrect, adding or subtracting that clue's point value from the team's score.
- Control question selection, transitions between boards, and Final Jeopardy.

### Game format

Each board has exactly five categories with five clues each: 25 clues per board and 50 regular clues total, followed by Final Jeopardy.

| Stage | Point values per category |
| --- | --- |
| Board 1 | 100, 200, 300, 400, 500 |
| Board 2 | 200, 400, 600, 800, 1,000 |
| Final Jeopardy | Team wagers |

## 3. Proposed Rules and Assumptions

These decisions fill gaps in the requirements and can be changed before implementation.

| Topic | Proposed default |
| --- | --- |
| Fairness scope | Per team, because every question selects one person from each team |
| Incorrect answer | Deduct points, lock that team out for the rest of the clue, and resume the remaining timer |
| Timer after an earlier buzz | Still open to all eligible players once 20 total seconds of thinking time elapse; judging time does not count |
| Answer duration | Host-controlled; no automatic answer deadline in the initial version |
| Open buzzing duration | Remains open until a correct answer or the host closes the clue |
| No answer | Host can reveal the answer and close the clue without changing scores |
| Negative scores | Allowed |
| Board control | Host clicks clues; the team with the last correct answer chooses verbally; host chooses the first clue |
| Team changes | Allowed in the lobby; locked after play begins |
| Late arrivals | New players cannot join after gameplay starts; existing players can reconnect |
| Qoobee Boost | Host-marked clue; team agrees wager, host locks it before reveal, existing representative answers alone. Either ruling ends the clue. |
| Ties | Shared placement, including a shared win |

**Fairness limitation:** With unequal team sizes, a smaller team necessarily repeats players before every member of a larger team has played. The guarantee is therefore per team. A game-wide no-repeat guarantee would require equal team sizes or changing the one-representative-per-team rule.

## 4. User Experience

### Host setup

1. Create a game and name it.
2. Add teams and name the five categories on each board.
3. Enter category titles, clue text, and accepted answers for both boards. Point values are assigned automatically by board and row.
4. Enter the Final Jeopardy category, clue, and accepted answer.
5. Preview the boards and resolve missing content.
6. Open the lobby and share a join link, room code, or QR code.
7. Review the roster, move players between teams if needed, and start Board 1.

The editor autosaves drafts. Starting requires complete boards, Final Jeopardy content, and at least two teams with a connected player each. Published game content is locked during play; editing a draft must not change an active game.

### Player lobby

Players enter the room code, choose a display name, and select a team. They see their team's roster and the game's waiting status. The host can rename or remove players and rebalance teams before starting.

Each device receives a resumable player session. A refresh or reconnect restores the same identity rather than creating another player.

### Regular question

1. Host selects an unused clue from the current board.
2. Server chooses one representative per team and shows the clue, value, and selected players. Buzzing is initially disabled so the host can read it aloud.
3. Selecting a normal clue immediately starts the 10-second timer. Selected representatives receive an enabled **Buzz** button; other players have a disabled buzzer. Players watch the host stream for the board, question and countdown.
4. The first valid buzz pauses the timer and disables all buzzer buttons. Every screen shows who buzzed; the host sees **Correct** and **Incorrect** controls.
5. A correct ruling adds points and resolves the clue. An incorrect ruling subtracts points, locks out that team, and resumes buzzing for the remaining eligible players.
6. When the restricted timer reaches zero, all players on teams that have not been locked out can buzz. The UI announces **Open to everyone**.
7. Correct rulings automatically reveal the accepted answer. The host dismisses the clue to return to the board; dismissing the final clue automatically advances the game. Incorrect/closed clues can still be revealed manually.

If all teams have answered incorrectly, the clue resolves automatically. If nobody answers, the host can close it manually. A representative's turn counts when the question is revealed, even if they never buzz.

### Host and display screens

- **Host console:** board controls, private accepted answer, active representatives, winning buzzer, timer, team scores, and judging controls.
- **Player screen:** clue, own team score, selection status, eligibility explanation, countdown, and large buzzer button.
- **Shared display:** board or current clue, active representatives, winning buzzer, and scoreboard. Accepted answers appear only after reveal.

Player and display views must never receive unrevealed answers or private Final Jeopardy submissions.

### Board progression

After the last clue on Board 1 is resolved and dismissed, the server advances to Board 2. The same transition starts Final Jeopardy after Board 2. There is no next-board button. Representative rotation carries across boards rather than resetting.

## 5. Fair Representative Selection

Maintain a shuffled rotation for each team. When a rotation begins, randomly shuffle the eligible roster. Each new clue takes the next available player. A player cannot be selected again until every eligible player in that rotation has been selected or explicitly marked unavailable.

For a stable, connected roster, this guarantees one selection per player per cycle. Selection counts within a team differ by at most one. At a cycle boundary, avoid selecting the previous representative immediately again when another teammate is available.

Persist rotation order and cursor on the server. Refreshes, server restarts, and retries of the same clue-opening command must not cause a redraw.

### Roster and disconnect handling

- Eligibility is based on the roster and connectivity when the host opens the clue.
- Temporarily disconnected players are skipped but retain an owed turn ahead of already-served players when they return. They do not block connected teammates from continuing indefinitely.
- If a selected player disconnects after selection, preserve their selection for that clue and allow reconnect. No replacement is drawn mid-clue; the host can pause, and open buzzing still becomes available normally.
- An empty or fully disconnected team has no representative for that clue; show this explicitly to the host.
- A new player admitted between clues enters the current rotation's unserved group at a random position. Rejoining with the same identity preserves selection history.
- The host can mark a departed player inactive between clues. Preserve their history for reactivation.

The fairness guarantee applies to available participants; absence must not freeze a team's rotation. Store selections and availability changes so the host can inspect participation counts.

## 6. Question State and Timer

| State | Meaning | Next transitions |
| --- | --- | --- |
| `BOARD` | Host selects an unused normal clue; timer starts immediately | `RESTRICTED` |
| `REVEALED` | Clue and representatives visible; buzzing disabled | `RESTRICTED`, `RESOLVED` |
| `RESTRICTED` | Selected representatives can buzz; timer runs | `ANSWERING`, `OPEN`, `RESOLVED` |
| `OPEN` | All players on unlocked teams can buzz | `ANSWERING`, `RESOLVED` |
| `ANSWERING` | One player owns the answer opportunity; timer paused | `RESOLVED`, prior buzzing state |
| `RESOLVED` | Clue closed; no more buzzes or scoring attempts | `BOARD` |

Host pause is an overlay that freezes time and rejects new buzzes without losing the underlying state. Only the host can resume. Losing the host connection automatically pauses the game until that host reconnects or explicitly transfers control.

The server stores remaining restricted time and an authoritative deadline while the timer runs. On an accepted buzz, it computes and saves the remaining time. On an incorrect ruling, it creates a new deadline from that saved duration. A buzz in `OPEN` returns to `OPEN` after an incorrect ruling.

Example: A representative buzzes with 13 seconds remaining. The host spends 8 seconds judging an incorrect answer. The restricted period resumes with 13 seconds remaining.

Before evaluating every buzz, the server advances any expired timer state. A buzz received at or after the restricted deadline is evaluated under open eligibility, even if the scheduled timer event has not fired yet. Use server time for decisions and client countdowns only for display.

## 7. Buzzer Arbitration and Scoring

The server is authoritative. Every buzz includes the game, clue-attempt ID, player session, and a unique command ID. The server validates the current state, player identity, team eligibility, and whether a winner already exists.

Process room commands through one ordered queue, and atomically claim the answer opportunity. The first valid command received by that room's authority wins. Client timestamps are not trusted. Near-simultaneous buzzes are resolved by server processing order; network latency can affect the result.

Each team gets at most one scored attempt per clue under the proposed rules. The host's ruling references the accepted buzz ID and applies exactly once:

- Correct: `team score += clue value`.
- Incorrect: `team score -= clue value`.

Record score changes in a logically append-only ledger with the clue, player, team, ruling, host, and timestamp. Save that ledger inside each complete game snapshot, along with the derived team totals. A ruling and its score change commit together in one snapshot. Repeated clicks and retried requests cannot apply points twice.

Provide **Undo last ruling** for an immediate host correction, only before any subsequent buzz, clue transition, or Final Jeopardy action. Undo creates a compensating ledger entry and restores the pre-ruling answer opportunity, timer, and lockouts. Older errors can be corrected through an explicit, reasoned score adjustment without reopening gameplay history.

## 8. Final Jeopardy

Final Jeopardy uses one wager and one answer per team, with no representative selection or buzzer.

1. Show the category and current team scores.
2. A designated team captain privately submits a whole-number wager from zero to the team's current score. Teams with zero or negative scores may participate with a zero wager.
3. Captains may edit wagers until the host locks wagering. The host sees readiness, but other teams never see wagers before reveal. Missing wagers require the host to explicitly assign zero before proceeding.
4. Reveal the clue and start a proposed 30-second answer timer. Teams confer and the captain submits or revises the team's private answer until the deadline.
5. Server locks submissions at the deadline. The host reveals and judges each team's answer, adding or subtracting its wager. A missing answer counts as incorrect.
6. Display final scores and winners after all rulings are complete.

The server snapshots scores when wagering opens and validates wagers against that snapshot. Captains are assigned in the lobby and can be reassigned by the host if unavailable. Persist wagers and answers privately, and apply each Final Jeopardy ruling exactly once.

## 9. Technical Design

### Architecture

- Responsive web client with player, host, and shared-display routes.
- Backend API for game setup, joining, session recovery, and saved game data.
- Persistent WebSocket connection for game state, buzzes, host commands, and presence.
- One authoritative command processor per active room.
- In-memory game state for live play, backed by versioned JSON snapshots on a persistent server disk.

A practical initial implementation is React with Vite and TypeScript, a Node.js backend with Socket.IO, and JSON files written through Node's filesystem APIs. No database is required. Run one backend process with exclusive ownership of the save directory. Multiple backend instances writing these files are outside this version's scope.

### Core data

| Entity | Key fields |
| --- | --- |
| Game | ID, room code, host identity, phase, current board, state version |
| Board / Category / Clue | Board number, category order/title, row, value, prompt, private answer, status |
| Team | ID, game ID, name, captain ID, cached score |
| Player | ID, team ID, display name, session identity, presence, active status |
| Team rotation | Team ID, cycle, shuffled order, cursor, owed turns, last selected player |
| Clue attempt | Clue ID, state, representatives, remaining time, deadline, locked teams, accepted buzz |
| Buzz / Ruling | Attempt ID, player ID, receipt sequence, decision, command ID |
| Score entry | Team ID, amount, reason, ruling ID, optional reversed-entry ID |
| Final entry | Team ID, score snapshot, wager, answer, locked status, ruling |

Store the clue attempt and rotation updates together when revealing a clue. Store a ruling, score change, and resulting state together when judging an answer.

### Commands and events

Client commands include `join_game`, `choose_team`, `open_clue`, `start_timer`, `buzz`, `judge_answer`, `pause_game`, `resume_game`, `close_clue`, `advance_board`, `submit_wager`, and `submit_final_answer`.

Server events include `roster_updated`, `clue_revealed`, `timer_started`, `buzz_accepted`, `answer_judged`, `buzzing_opened`, `scores_updated`, `clue_resolved`, and `phase_changed`.

Each command carries a unique ID. Host state-changing commands also carry an expected state version. Each event carries an increasing room sequence and state version. Reconnecting clients receive a role-filtered snapshot; clients detecting an event gap request another snapshot. Server errors explain why a buzz or action was rejected.

### Persistence and recovery

The server runs games in memory and automatically writes complete snapshots to disk. The host should be able to restart the server, open **Saved games**, select a game, and resume without manually editing files.

#### File layout and contents

```text
data/
  games/
    <game-id>/
      snapshot-000001.json
      snapshot-000002.json
      snapshot-000003.json
  drafts/
    <draft-id>/
      snapshot-000001.json
```

Use server-generated IDs for directories and monotonically increasing snapshot numbers. Resolve all paths beneath the configured data directory; never use player names or supplied file paths as filenames. Find the latest valid generation by scanning the directory rather than relying on a separate index file.

Each snapshot contains:

- Schema version, game ID, snapshot number, state version, event sequence, save time, and a checksum of the serialized state payload.
- Both five-category boards, private answers, used clues, and Final Jeopardy content.
- Teams, players, captain assignments, host ownership, and hashed session credentials needed for reconnects. Raw session tokens remain with the clients.
- Representative rotations, selection history, current representatives, team lockouts, and accepted buzz.
- Scores, the complete scoring ledger, and any information required to undo the latest ruling.
- Game phase, question state, pause state, and remaining durations for regular and Final Jeopardy timers.
- Final Jeopardy score snapshots, wagers, answers, and judging status.
- Processed command IDs and results for the game, so retried commands remain idempotent after a restart.

Do not serialize sockets, timeout handles, or live connections. All players initially appear disconnected after recovery until their sessions reconnect. Any authentication signing secrets must also survive deployment restarts through stable server configuration.

#### When to save

Save every accepted gameplay mutation: joins and team changes, representative selection, timer start/pause/resume, winning buzz, ruling, score adjustment, clue closure, board transition, wager, and Final Jeopardy answer. A client receives a success acknowledgment only after the save commits.

While a countdown runs, checkpoint its remaining duration once per second. Save the exact remaining duration when a buzz or pause interrupts it. Timer ticks on player screens do not require separate server events or writes. Draft editing uses a short debounce and displays **Saving**, **Saved**, or **Save failed**; starting the game waits for all pending draft changes to save.

#### Safe writes and command ordering

1. Process each game's commands and timer events through a single queue. Stamp incoming buzzes with server receipt time and sequence before awaiting disk operations.
2. Build a proposed next state without publishing it. Include every related update in the same snapshot, such as the winning buzz and paused timer, or a ruling and score change.
3. Serialize and validate the snapshot, compute its checksum, and write it to a uniquely named temporary file in the same directory as the final file.
4. Flush the file to disk, close it, and atomically rename it to a new snapshot generation. Synchronize directory metadata where supported by the deployment filesystem. Only finalized generations are loadable.
5. Install the committed state in memory, acknowledge the command, and broadcast the role-filtered update. A crash after the file commit but before acknowledgment is handled by restoring that snapshot and recognizing the retried command ID.

Use a local filesystem whose rename and durability behavior has been verified for the deployment. Keep the latest 20 valid generations; prune older generations only after a newer one has committed successfully. A partial temporary file never replaces a valid save. A checksum detects accidental damage, not malicious modification.

Timer eligibility uses server receipt timestamps in queue order, so disk latency does not turn a pre-deadline buzz into a post-deadline buzz. Before handling a later timestamp, advance any timer expiry that precedes it. Measure buzz latency with durable writes enabled.

If a save fails, do not acknowledge or broadcast the proposed change. Freeze the room, disable further gameplay, and show the host a storage error. Keep the last committed snapshot intact. After storage recovers, reconcile the newest valid snapshot and persist a paused recovery state before allowing the host to resume. Never silently continue a game that is no longer being saved.

#### Restart and host recovery

1. On startup, scan finalized snapshots, validate schema, checksum, and game invariants, and select the highest valid generation for each game.
2. Ignore incomplete temporary files. If the latest finalized generation is corrupt, load the previous valid generation and prominently report the fallback and its timestamp; do not silently hide possible lost progress. Unsupported newer schemas require a compatible app version instead of silently rolling back.
3. Restore unfinished games with a recovery pause overlay. Preserve the underlying state, including an already accepted buzz awaiting judgment. Do not redraw representatives or automatically replay score changes.
4. The authenticated host opens **Saved games**, sees the game name, save time, board, scores, and recovery status, and selects **Load game**.
5. Players reconnect through the existing room link and session identities. The host reviews the roster and presses **Resume**. Persist that transition before enabling controls.

Use a monotonic clock while running. Persist remaining durations rather than reusing old monotonic deadlines after a restart. Downtime does not consume thinking time. Restore a running timer at its last saved remaining duration; normally this may give back up to roughly one second, plus save/scheduling delay. Display the checkpoint age if it is unusually stale. The same behavior applies to the Final Jeopardy answer timer.

If there is no valid snapshot, show the game as unrecoverable and preserve its files for inspection. Do not substitute an empty game under the same ID.

#### Host controls and operational limits

- **Saved games:** list and load unfinished games; view completed results.
- **Save checkpoint:** immediately commit the current state and show its saved timestamp.
- **Download backup:** provide a host-only recovery export containing game content and state, excluding session credentials. Warn that it includes private answers and wagers.
- **Restore backup:** validate schema, size, and invariants, then create a paused game with a new ID and room code. The importing host owns the new game; players receive new sessions and the host reassigns them to saved roster identities. Never overwrite an active room through import.

The save directory must live on a persistent disk or mounted volume that survives process restarts and deployments. Container-local or temporary hosting storage is insufficient. Recent generations protect against interrupted writes and some corruption, but not loss of the disk itself; use host downloads or a separate backup location for that case. Save files and exports are private and must not be served as public static assets.

## 10. Access, Usability, and Operating Targets

- Protect host operations with an authenticated host session or private host credential; a room code grants player access only.
- Issue unguessable player sessions and restrict every command to the authenticated role and room.
- Omit unrevealed answers from player payloads, HTML, and downloadable game data.
- Validate content length, escape user-entered text, and rate-limit joins and repeated buzz requests.
- Support touch and keyboard buzzing, large controls, visible focus, and text labels rather than color-only state changes.
- Announce representative selection, buzzing opened, and winning buzzer through accessible status messages. Sound is optional.
- Show connection state and disable controls until a reconnect snapshot confirms eligibility.
- Initial target: 50 connected players per room. Aim for accepted-buzz updates within 250 ms for 95% of events on a healthy network; validate under representative load.

## 11. Acceptance Criteria

1. Players joining on separate devices appear on the correct team in the host roster.
2. With a stable roster, each team member is selected exactly once per cycle before anybody repeats; cycles continue across boards.
3. Only one representative per available team can buzz during the restricted period.
4. Twenty seconds of unpaused thinking time opens buzzing to all players on unlocked teams.
5. An accepted buzz freezes the restricted countdown throughout judging.
6. An incorrect ruling subtracts the clue's value, locks out the team, and resumes the saved timer or open period.
7. Simultaneous buzzes produce exactly one winner; duplicate commands cannot create duplicate rulings or points.
8. Host and player screens show the same winning player, team, and score after synchronization.
9. A reconnect restores the existing identity and current state without changing representative selection.
10. Both boards use the required values, and used clues cannot be reopened through ordinary selection.
11. Final Jeopardy keeps wagers and answers private until reveal and scores each team exactly once.
12. Unauthorized player commands cannot judge answers, read unrevealed answers, or control the board.
13. Restarting the backend restores the latest valid game snapshot paused, preserving scores, rotations, used clues, wagers, and an accepted buzz awaiting judgment.
14. Interrupting a snapshot write leaves a previous valid snapshot loadable; corrupt finalized snapshots trigger a visible fallback warning.
15. A command committed before a crash but retried after reconnect does not apply twice.
16. Disk-full or permission errors freeze gameplay and report save failure without announcing an unsaved ruling or buzz as accepted.
17. Countdown recovery restores the saved remaining duration without deducting downtime, and all restored players must reconnect before appearing online.
18. Backup export and import produce a separate paused game with equivalent gameplay state and fresh access credentials.

Test the selection and timer rules with a controllable clock, exercise concurrent buzzes and duplicate commands at the server boundary, and run a multi-device game through both boards and Final Jeopardy. Include disconnects, deadline-edge buzzes, host recovery, and unequal team sizes. Inject crashes before and after snapshot rename, truncated files, checksum failures, disk write failures, and restarts during answering and Final Jeopardy. Verify that acknowledged scores and buzzes survive ordinary process restarts and that fallback loss is clearly reported.

## 12. Delivery Plan

1. **Setup and lobby:** board editor, file-backed drafts, snapshot storage and recovery, teams, joining, host and player sessions.
2. **Live clues:** persisted selection rotation, synchronized clue state, timer, atomic buzzer, judging, and scores.
3. **Complete game:** board transitions, Final Jeopardy, reveal flow, and final standings.
4. **Reliability and usability:** saved-game controls, backup import/export, storage failure testing, reconnect recovery, ruling corrections, shared display, accessibility, and concurrent-player testing.

The main rules to confirm before implementation are per-team fairness, whole-team lockout after an incorrect answer, and the proposed Final Jeopardy wagering and timing rules.
