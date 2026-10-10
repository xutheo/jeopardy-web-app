# Quick feature test

Import `qoobee-feature-test.json` in **Host a game → Create game → Edit game boards → Import boards**, then select **Save & close**. This is a board file, not a saved-session backup.

Join from two other browsers/devices (or separate private browser sessions), with at least one player on each of two teams. Select **Let’s play**. More teammates let you test fair representative rotation.

The first category on each board is a feature tour:

| First board | Second board | Feature |
| --- | --- | --- |
| 100 | 200 | Image question: identify Qoobee |
| 200 | 400 | Timed activity: players open the link, return, and press **Finished** |
| 300 | 600 | Score activity: players enter sample scores such as `4/6` |
| 400 | 800 | Qoobee Boost: team agrees wager; selected player answers **2 + 2** |
| 500 | 1,000 | Normal buzzer question: blue + yellow paint = green |

Activity links intentionally use `https://example.com/` for a quick demonstration without completing a puzzle. Replace them with your preferred Wordle or other game URLs in the editor to test real games. Times begin when the host broadcasts the link. Select **End activity** before manually awarding team points, then finish the activity and return to the board.

Use **Fullscreen** to test the interactive fullscreen view. Boards advance automatically after their last clue is finished and dismissed; the sample final answer is **3**.

The other four categories on each board contain regular sample questions, so all 50 clues are ready. Both question images are embedded in the JSON, requiring no separate image files.

