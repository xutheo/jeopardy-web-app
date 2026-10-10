import { test, expect, type Page } from '@playwright/test';
import { promises as fs } from 'node:fs';

test('host editor, mobile teams, buzzer judging, board transition, and Final Jeopardy', async ({ page: host, browser }) => {
  const errors: string[] = []; host.on('pageerror', e => errors.push(e.message));
  await fs.mkdir('artifacts', { recursive: true });
  await host.goto('/');
  await expect(host.getByRole('heading', { name: /A little knowledge/ })).toBeVisible();
  await host.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });
  await host.getByRole('button', { name: 'Host a game' }).click();
  await host.getByLabel('Game name', { exact: true }).fill('The Friday Night Club');
  await host.getByRole('button', { name: 'Create game' }).click();
  await expect(host.getByRole('heading', { name: 'The Friday Night Club' })).toBeVisible();
  const code = (await host.locator('.room-badge strong').textContent())!;
  await host.getByRole('button', { name: 'Edit game boards' }).click();
  await host.getByRole('button', { name: 'Use sample questions' }).click();
  await host.getByRole('button', { name: 'Use sample collection' }).click();
  await expect(host.getByText('50/50 clues ready', { exact: false })).toBeVisible();
  await expect(host.getByText('All changes saved', { exact: true })).toBeVisible();
  await host.screenshot({ path: 'artifacts/board-editor.png', fullPage: true });
  await host.getByRole('button', { name: 'Save & close' }).click();
  let aContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const bContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let ada = await aContext.newPage(); const grace = await bContext.newPage();
  async function join(page: Page, name: string, teamIndex: number) {
    await page.goto(`/?join=${code}`); await page.getByRole('button', { name: 'Find game' }).click();
    await page.getByLabel('Your name').fill(name); await expect(page.getByLabel('Your team',{exact:true})).toHaveCount(0);
    await page.getByRole('button', { name: 'Join game' }).click(); await expect(page.getByRole('button', { name: /WAITING FOR HOST/ })).toBeVisible(); await page.getByLabel('Switch team').selectOption({index:teamIndex});
  }
  await join(ada, 'Ada', 0); await join(grace, 'Grace', 1);
  await expect(host.getByText('2 players connected')).toBeVisible();
  await host.getByRole('button', { name: 'Let’s play' }).click(); await introduceBoard(host);
  await expect(host.locator('.clue-tile')).toHaveCount(25);
  await host.screenshot({ path: 'artifacts/game-board.png', fullPage: true });
  await host.getByRole('button', { name: 'Around the World, 100 points', exact: true }).click();
  await expect(ada.getByRole('button', { name: /BUZZ IN/ })).toBeEnabled();
  await expect(ada.locator('.question-card, .jeopardy-board, .save-footer')).toHaveCount(0);
  await expect(ada.getByText('Paris', { exact: true })).toHaveCount(0);
  // An entirely fresh browser rejoins the active clue by username without loading saved game state.
  await aContext.close(); await expect(host.getByText('1 players connected', { exact: false })).toBeVisible();
  aContext = await browser.newContext({ viewport: { width: 390, height: 844 } }); ada = await aContext.newPage();
  await ada.goto(`/?join=${code}`); await ada.getByRole('button', { name: 'Find game' }).click();
  await ada.getByLabel('Your name').fill('ada');
  await ada.getByRole('button', { name: 'Join game' }).click();
  await expect(ada.getByRole('button', { name: /BUZZ IN/ })).toBeEnabled();
  await expect(ada.locator('.question-card, .jeopardy-board, .save-footer')).toHaveCount(0);
  await expect(host.locator('.active-player').first()).toContainText('Ada');
  await expect(host.getByRole('button', { name: 'Start 20-second timer' })).toHaveCount(0);
  await expect(ada.getByRole('button', { name: /BUZZ IN/ })).toBeEnabled();
  await ada.screenshot({ path: 'artifacts/player-mobile.png', fullPage: true });
  await ada.getByRole('button', { name: /BUZZ IN/ }).click();
  await expect(host.locator('.buzz-winner h3')).toHaveText('Ada');
  await host.screenshot({ path: 'artifacts/host-buzzer.png', fullPage: true });
  await host.getByRole('button', { name: '× Incorrect', exact: true }).click();
  await expect(host.locator('.score-card').first().locator('strong')).toHaveText('-100');
  await expect(ada.getByRole('button', { name: /STAND BY/ })).toBeDisabled();
  await grace.getByRole('button', { name: /BUZZ IN/ }).click();
  await host.getByRole('button', { name: '✓ Correct', exact: true }).click();
  await expect(host.locator('.score-card').nth(1).locator('strong')).toHaveText('100');
  await expect(host.getByText('Paris', { exact: true })).toBeVisible();
  await expect(host.getByRole('button', { name: 'Reveal answer', exact: true })).toHaveCount(0);
  await host.getByRole('button', { name: 'Back to the board' }).click();
  await expect(host.getByRole('button', { name: 'Next board' })).toHaveCount(0);
  async function finishClues(count: number) { for (let i=0; i<count; i++) { /* Pace 50-clue traversal below the production command rate limit. */ await new Promise(resolve => setTimeout(resolve, 300)); await host.locator('.clue-tile:not([disabled])').first().click(); await host.getByRole('button', { name: /^(Close clue and reveal answer|Cancel activity)$/ }).click(); await host.getByRole('button', { name: 'Back to the board' }).click(); } }
  await finishClues(24); await introduceBoard(host);
  await expect(host.getByRole('button', { name: 'History Class, 200 points', exact: true })).toBeVisible();
  await finishClues(25);
  await expect(ada.getByRole('button', { name: 'Save wager' })).toBeVisible();
  await ada.getByRole('button', { name: 'Save wager' }).click();
  await grace.getByLabel(/Your team’s wager/).fill('100'); await grace.getByRole('button', { name: 'Save wager' }).click();
  await expect(host.getByText('✓ Wager submitted')).toHaveCount(2);
  await host.getByRole('button', { name: 'Lock wagers & reveal clue' }).click(); await host.getByRole('button', { name: 'Lock wagers and start' }).click();
  await grace.getByLabel('Your team’s answer').fill('Africa'); await grace.getByRole('button', { name: 'Submit answer' }).click();
  await host.getByRole('button', { name: 'Lock answers early' }).click();
  await host.locator('.final-team').first().getByRole('button', { name: '× Incorrect' }).click();
  await host.locator('.final-team').nth(1).getByRole('button', { name: '✓ Correct' }).click();
  await expect(host.getByRole('heading', { name: /The Wildcards.*take the crown/ })).toBeVisible();
  await expect(host.locator('.rankings b').first()).toHaveText('200');
  await host.screenshot({ path: 'artifacts/final-scores.png', fullPage: true });
  await ada.getByRole('button', { name: 'Return home' }).click();
  await expect(ada.getByRole('heading', { name: 'Your saved games' })).toHaveCount(0);
  await expect(ada.getByRole('button', { name: /Restore a game backup/ })).toHaveCount(0);
  await host.getByRole('button', { name: 'Return home' }).click();
  await host.getByRole('button', { name: 'Delete The Friday Night Club', exact: true }).click();
  await host.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(host.getByRole('heading', { name: 'The Friday Night Club' })).toBeVisible();
  await host.getByRole('button', { name: 'Delete The Friday Night Club', exact: true }).click();
  await host.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(host.getByRole('heading', { name: 'Your saved games' })).toHaveCount(0);
  await expect(grace.getByRole('heading', { name: /A little knowledge/ })).toBeVisible();
  expect((await host.request.get(`/api/rooms/${code}`)).status()).toBe(404);
  assertNoErrors(); await aContext.close(); await bContext.close();
  function assertNoErrors() { expect(errors).toEqual([]); }
});

test('landing page fits a phone without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.getByRole('heading', { name: /A little knowledge/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });
});

test('image clues, fullscreen, group results, and Qoobee Boost work across host and players', async ({ page: host, browser }) => {
  await host.goto('/'); await host.getByRole('button', { name: 'Host a game', exact: true }).click();
  await host.getByLabel('Game name', { exact: true }).fill('Activity night'); await host.getByRole('button', { name: 'Create game' }).click();
  const code = (await host.locator('.room-badge strong').textContent())!;
  await host.getByRole('button', { name: 'Edit game boards' }).click();
  await host.getByRole('button', { name: 'Use sample questions' }).click(); await host.getByRole('button', { name: 'Use sample collection' }).click();
  const first = host.locator('.edit-clue').nth(0), timed = host.locator('.edit-clue').nth(1), scored = host.locator('.edit-clue').nth(2);
  await first.getByLabel('Qoobee Boost').check();
  await first.getByLabel('Attach question image').setInputFiles('public/qoobee-transparent.png');
  await expect(first.locator('.clue-image')).toBeVisible();
  await first.getByLabel('Image description').fill('Qoobee mascot');
  await timed.getByLabel('Question type').selectOption('group'); await timed.getByLabel('Activity name on board').fill('Timed puzzle'); await timed.getByLabel('Activity link (HTTPS)').fill('https://example.com/time');
  await scored.getByLabel('Question type').selectOption('group'); await scored.getByLabel('Activity name on board').fill('Score puzzle'); await scored.getByLabel('Activity link (HTTPS)').fill('https://example.com/score'); await scored.getByLabel('Result type').selectOption('score');
  await expect(host.getByText('All changes saved', { exact: true })).toBeVisible(); await host.getByRole('button', { name: 'Save & close' }).click();
  await host.getByRole('button', { name: 'Teams & players' }).click();
  await host.getByPlaceholder('Another brilliant bunch').fill('Empty team'); await host.getByRole('button', { name: 'Add team', exact: true }).click();
  await host.getByRole('button', { name: 'Remove Empty team', exact: true }).click();
  await expect(host.getByRole('button', { name: 'Remove Empty team', exact: true })).toHaveCount(0);
  await host.getByPlaceholder('Another brilliant bunch').fill('Empty team'); await host.getByRole('button', { name: 'Add team', exact: true }).click();
  await host.getByRole('button', { name: 'Close dialog' }).click();
  const stream = await browser.newPage(); await stream.goto((await host.getByRole('link', { name: 'Open streamed board' }).getAttribute('href'))!);
  const contexts = await Promise.all([browser.newContext({ viewport: { width: 390, height: 844 } }), browser.newContext()]);
  const players = await Promise.all(contexts.map(c => c.newPage()));
  try {
    for (const [i, page] of players.entries()) { await page.goto(`/?join=${code}`); await page.getByRole('button', { name: 'Find game' }).click(); await page.getByLabel('Your name').fill(`P${i}`);  await page.getByRole('button', { name: 'Join game' }).click(); await expect(page.getByRole('button', { name: /WAITING FOR HOST/ })).toBeVisible(); await page.getByLabel('Switch team').selectOption({index:i}); }
    await expect(players[0].getByRole('heading', { name: 'Your team: The Brainwaves' })).toBeVisible();
    await players[0].getByLabel('Switch team').selectOption({ index: 1 });
    await expect(players[0].locator('.my-team-panel')).toContainText('P1');
    await players[0].getByLabel('Switch team').selectOption({ index: 0 });
    await expect(players[0].getByRole('heading', { name: 'Your team: The Brainwaves' })).toBeVisible();
    await host.getByRole('button', { name: 'Let’s play' }).click(); await introduceBoard(host);
    await expect(players[0].getByLabel('Switch team')).toHaveCount(0);
    await expect(stream.locator('.stream-scores .selecting-team')).toHaveCount(1);
    await expect(host.locator('.score-card')).toHaveCount(2);
    await expect(stream.locator('.stream-tile')).toHaveCount(25); await expect(stream.locator('.stream-scores > div')).toHaveCount(2);
    await stream.getByRole('button', { name: 'Fullscreen', exact: true }).click();
    await expect(stream.locator('.stream-controls')).not.toBeVisible();
    expect(await stream.locator('.stream-content').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await stream.screenshot({ path: 'artifacts/streamed-board.png' });
    await expect(stream.getByRole('button', { name: 'Teams & players' })).toHaveCount(0);
    await host.getByRole('button', { name: 'Fullscreen', exact: true }).click(); await expect(host.locator('body')).toHaveClass(/stage-mode/);
    await expect(host.getByRole('button', { name: 'Pause Ⅱ' })).toBeVisible();
    await host.getByRole('button', { name: 'Around the World, 100 points', exact: true }).click();
    await expect(host.getByRole('heading', { name: 'Qoobee Boost' })).toBeVisible(); await expect(stream.locator('.boost-celebration')).toBeVisible(); await stream.locator('.stream-question').evaluate(async el => {
      for (const animation of el.getAnimations()) { animation.pause(); for (const fraction of [0, .25, .5, .75]) { animation.currentTime = Number(animation.effect!.getTiming().duration) * fraction; const root = document.documentElement; if (root.scrollWidth > root.clientWidth + 1 || root.scrollHeight > root.clientHeight + 1) throw new Error('Animation causes viewport overflow'); } animation.play(); await animation.finished; }
    }); await stream.screenshot({ path: 'artifacts/boost-animation.png' }); await expect(players[0].getByAltText('Qoobee mascot')).toHaveCount(0);
    await host.getByLabel('Agreed team wager', { exact: false }).fill('400'); await host.getByRole('button', { name: 'Lock wager & reveal clue' }).click(); await expect(stream.locator('.stream-wager')).toContainText('400 points');
    await expect(host.getByAltText('Qoobee mascot')).toBeVisible(); await expect(stream.getByAltText('Qoobee mascot')).toBeVisible(); await host.getByRole('button', { name: 'Correct', exact: true }).click();
    await expect(host.locator('.score-card').first()).toContainText('400'); await expect(stream.locator('.stream-answer')).toHaveText('Paris'); await host.screenshot({ path: 'artifacts/qoobee-boost.png' });
    await host.getByRole('button', { name: 'Back to the board', exact: true }).click(); await host.getByRole('button', { name: 'Around the World, 200 points', exact: true }).click();
    await expect(players[0].getByRole('link', { name: 'Open activity' })).toHaveCount(0);
    await host.getByRole('button', { name: 'Broadcast link & start' }).click();
    await expect(players[0].getByRole('link', { name: 'Open activity' })).toHaveAttribute('href', 'https://example.com/time');
    const popupPromise = players[0].waitForEvent('popup');
    await players[0].getByRole('link', { name: 'Open activity' }).click();
    const activityTab = await popupPromise; await activityTab.close(); await players[0].bringToFront();
    await players[0].getByRole('button', { name: "Finished", exact: true }).click(); await expect(players[0].getByText(/Your result:.*seconds/)).toBeVisible(); await players[0].getByRole('button', { name: 'Unfinish', exact: true }).click(); await expect(players[0].getByText(/Your result:/)).toHaveCount(0); await players[0].getByRole('button', { name: 'Finished', exact: true }).click();
    await contexts[0].setOffline(true); await expect(players[0].getByText('Reconnecting…', { exact: true })).toBeVisible();
    await contexts[0].setOffline(false); await players[0].bringToFront();
    await expect(players[0].getByText('Reconnecting…', { exact: true })).not.toBeVisible();
    await expect(players[0].getByText(/Your result:.*seconds/)).toBeVisible();
    await host.getByRole('button', { name: 'End activity' }).click(); await expect(stream.getByRole('heading', { name: 'Top 5 times' })).toBeVisible(); await expect(stream.locator('.stream-leaderboard li')).toContainText('P0'); await stream.screenshot({ path: 'artifacts/timed-leaderboard.png', animations: 'disabled' }); await host.getByRole('button', { name: 'Award points to The Brainwaves' }).click();
    await expect(host.locator('.score-card').first()).toContainText('600');
    await host.screenshot({ path: 'artifacts/group-results.png' }); await host.getByRole('button', { name: 'Finish activity' }).click(); await host.getByRole('button', { name: 'Unfinish activity' }).click(); await expect(host.getByText('200 points awarded', { exact: true })).toBeVisible(); await host.getByRole('button', { name: 'Finish activity' }).click(); await host.getByRole('button', { name: 'Back to the board', exact: true }).click();
    await host.getByRole('button', { name: 'Around the World, 300 points', exact: true }).click(); await host.getByRole('button', { name: 'Broadcast link & start' }).click();
    await players[1].getByLabel('Your score').fill('4/6'); await players[1].getByRole('button', { name: 'Submit score', exact: true }).click();
    await expect(host.locator('.activity-team').filter({ has: host.getByRole('heading', { name: 'The Wildcards', exact: true }) })).toContainText('4/6'); await host.getByRole('button', { name: 'End activity' }).click(); await expect(stream.getByRole('heading', { name: 'Top 5 scores' })).toBeVisible(); await expect(stream.locator('.stream-leaderboard li')).toContainText('4/6'); await host.getByRole('button', { name: 'Award points to The Wildcards' }).click();
    await expect(host.locator('.score-card').nth(1)).toContainText('300');
    await host.getByRole('button', { name: 'Finish activity', exact: true }).click();
    await host.getByRole('button', { name: 'Back to the board', exact: true }).click();
    await host.getByRole('button', { name: 'Around the World, 400 points', exact: true }).click();
    await expect(stream.getByRole('progressbar', { name: 'Question time remaining' })).toBeVisible();
    await stream.locator('.stream-question').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
    await stream.screenshot({ path: 'artifacts/stream-countdown.png' });
    await players[0].getByRole('button', { name: /BUZZ IN/ }).click();
    await expect(stream.locator('.stream-buzz-winner strong')).toHaveText('P0');
    await expect(players[0].locator('.my-team-panel .active-member')).toContainText('P0');
    await expect(stream.locator('.stream-team-members .active-member')).toContainText('P0');
    expect(await stream.locator('.stream-buzz-winner strong').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(32);
    await stream.screenshot({ path: 'artifacts/stream-buzz.png' });
    await host.getByRole('button', { name: 'Close clue and reveal answer', exact: true }).click();
    await expect(stream.locator('.stream-answer')).toHaveText('The Nile');
    await expect(host.locator('.score-card').first()).toContainText('600');
    await expect(host.locator('.score-card').nth(1)).toContainText('300');
 await host.getByRole('button', { name: 'Exit fullscreen', exact: true }).click(); await expect(host.locator('body')).not.toHaveClass(/stage-mode/);
    await host.getByRole('button', { name: 'Game tools', exact: true }).click();
    await host.getByRole('button', { name: 'Reset game', exact: true }).click();
    await host.getByRole('button', { name: 'Reset game and scores', exact: true }).click();
    await expect(host.getByRole('button', { name: 'Let’s play' })).toBeVisible();
    await expect(host.locator('.score-card strong')).toHaveText(['0', '0', '0']);
    await expect(players[0].getByLabel('Switch team')).toBeVisible();
    await expect(stream.getByText('Waiting for players...', { exact: true })).toBeVisible();
  } finally { await stream.close(); await Promise.all(contexts.map(c => c.close())); }
});

test('custom team puzzles distribute private hints, validate answers, and show team results', async ({ page: host, browser }) => {
  await host.goto('/'); await host.getByRole('button', { name: 'Host a game' }).click(); await host.getByLabel('Game name', { exact: true }).fill('Puzzle night'); await host.getByRole('button', { name: 'Create game' }).click();
  const code=(await host.locator('.room-badge strong').textContent())!;
  await host.getByRole('button',{name:'Edit game boards'}).click(); await host.getByRole('button',{name:'Use sample questions'}).click(); await host.getByRole('button',{name:'Use sample collection'}).click();
  for(const [row,type] of ['code','bomb','timeline'].entries()) await host.getByLabel('Question type').nth(row).selectOption(type);
  await expect(host.getByText('All changes saved',{exact:true})).toBeVisible(); await host.getByRole('button',{name:'Save & close'}).click();
  const contexts=[]; const players: Page[]=[];
  for(let i=0;i<4;i++) { const ctx=await browser.newContext({viewport:{width:390,height:844}});contexts.push(ctx); const p=await ctx.newPage();players.push(p);await p.goto('/?join='+code);await p.getByRole('button',{name:'Find game'}).click();await p.getByLabel('Your name').fill('P'+i);await p.getByRole('button',{name:'Join game'}).click();await expect(p.getByRole('button',{name:/WAITING FOR HOST/})).toBeVisible();await p.getByLabel('Switch team').selectOption({index:Math.floor(i/2)}); }
  const popup=host.waitForEvent('popup');await host.getByRole('link',{name:'Open streamed board'}).click();const stream=await popup;
  await expect(stream.locator('.stream-lobby')).toBeVisible(); await stream.screenshot({path:'artifacts/stream-lobby.png'}); await host.getByRole('button',{name:'Let’s play'}).click(); await expect(stream.locator('.stream-category-intro')).toContainText('Test your team’s knowledge of around the world.'); await stream.screenshot({path:'artifacts/category-intro.png'}); await expect(stream.locator('.stream-tile.intro-pending')).toHaveCount(25); await host.getByRole('button',{name:'Next category',exact:true}).click(); await expect(stream.locator('.stream-column').first().locator('.stream-tile').first()).toHaveText('Codebreakers'); await expect(stream.locator('.stream-tile.intro-pending')).toHaveCount(20); await expect(stream.locator('.stream-category-intro h1')).toHaveText('Science Lab'); for(let i=0;i<3;i++) await host.getByRole('button',{name:'Next category',exact:true}).click(); await host.getByRole('button',{name:'Show board',exact:true}).click(); await expect(stream.locator('.stream-category-intro')).toHaveCount(0); await expect(stream.getByText('Test your team’s knowledge of around the world.',{exact:true})).toHaveCount(0);
  async function open(row:number) { await host.getByRole('button',{name:`Around the World, ${(row+1)*100} points`,exact:true}).click();await expect(stream.getByRole('heading',{name:'How to play',exact:true})).toBeVisible(); if(row===1){ await expect(stream.locator('.bomb-demo img')).toBeVisible(); await expect.poll(()=>stream.locator('.bomb-demo img').evaluate((img: HTMLImageElement)=>img.naturalWidth)).toBe(720); await stream.locator('.stream-question').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished))); await stream.screenshot({path:'artifacts/bomb-instructions-demo.png'}); } await expect(stream.getByText('Waiting for the host to start',{exact:true})).toBeVisible(); await expect(players[0].locator('.private-clue')).toHaveCount(0); await expect(players[0].getByRole('heading',{name:'Waiting for the host to start the puzzle'})).toBeVisible(); await host.getByRole('button',{name:'Broadcast clues & start'}).click(); await expect(stream.getByRole('heading',{name:'How to play',exact:true})).toHaveCount(0);await host.locator('.activity-team').first().getByLabel('Team operator').selectOption({label:'P0'});await expect(players[0].getByRole('heading',{name:'You are the operator'})).toBeVisible(); }
  async function finish() {await host.getByRole('button',{name:'End activity',exact:true}).click();await expect(stream.getByRole('heading',{name:'Team results'})).toBeVisible(); await expect(stream.locator('.stream-leaderboard .puzzle-result')).toHaveCount(2); await host.getByRole('button',{name:'Undo end activity',exact:true}).click(); await expect(stream.getByText('Teams are solving the puzzle',{exact:true})).toBeVisible(); await expect(stream.getByRole('heading',{name:'Team results'})).toHaveCount(0); await host.getByRole('button',{name:'End activity',exact:true}).click(); await expect(stream.getByRole('heading',{name:'Team results'})).toBeVisible();await host.getByRole('button',{name:'Finish activity',exact:true}).click();await host.getByRole('button',{name:'Back to the board',exact:true}).click();}
  await open(0);await expect(players[0].locator('.private-clue')).toHaveCount(2);await expect(players[1].getByLabel('Decoded answer')).toHaveCount(0);await expect(stream.getByText('The shift is the number of sides on a triangle.',{exact:true})).toHaveCount(0);
  await players[0].getByLabel('Decoded answer').fill('wrong');await players[0].getByRole('button',{name:'Submit answer',exact:true}).click();await expect(players[0].locator('.puzzle-player').getByRole('status')).toContainText('Mistakes: 1');await players[0].getByLabel('Decoded answer').fill('rose');await players[0].getByRole('button',{name:'Submit answer',exact:true}).click();await expect(players[0].locator('.puzzle-player').getByRole('status')).toContainText('Team finished');await finish();
  await open(1);await expect(players[0].locator('.wire-drawing')).toHaveCount(4); await players[0].locator('.wire-box').screenshot({path:'artifacts/bomb-wires.png'});await players[0].getByRole('button',{name:'Red ★ Cut wire',exact:true}).click();await expect(players[0].locator('.bomb-mistakes')).toHaveText('1 mistake'); await expect(players[0].locator('.wire-box')).toHaveClass(/mistake-flash/); await expect(players[0].getByRole('button',{name:'Blue ● Cut wire',exact:true})).toBeDisabled();
  for(const wire of ['Blue ●','Green ■','Red ★','Yellow ▲']) await players[0].getByRole('button',{name:wire+' Cut wire',exact:true}).click();await expect(players[0].locator('.puzzle-player').getByRole('status')).toContainText('Team finished');await players[0].reload();await expect(players[0].locator('.puzzle-player').getByRole('status')).toContainText('Team finished');await finish();
  await open(2);const desired=['First powered flight','Moon landing','World Wide Web proposed'];
  for(const [target,item] of desired.entries()) {let labels=await players[0].locator('.timeline-order li > span').allTextContents();while(labels.indexOf(item)>target){await players[0].getByRole('button',{name:'Move '+item+' earlier',exact:true}).click();labels=await players[0].locator('.timeline-order li > span').allTextContents();}}
  await players[0].getByRole('button',{name:'Submit order',exact:true}).click();await expect(players[0].locator('.puzzle-player').getByRole('status')).toContainText('Team finished');await host.getByRole('button',{name:'End activity',exact:true}).click();await expect(host.getByRole('button',{name:'Award points to The Brainwaves'})).toBeVisible();await expect(stream.locator('.puzzle-result').first()).toContainText('The Brainwaves');await stream.screenshot({path:'artifacts/puzzle-results.png'});
  for(const ctx of contexts)await ctx.close();
});




async function introduceBoard(host: Page) { for(let i=0;i<4;i++) await host.getByRole('button',{name:'Next category',exact:true}).click(); await host.getByRole('button',{name:'Show board',exact:true}).click(); }


test('host kicks a lobby player and their client returns home',async({page:host,browser})=>{
 await host.goto('/');await host.getByRole('button',{name:'Host a game'}).click();await host.getByRole('button',{name:'Create game'}).click();const code=(await host.locator('.room-badge strong').textContent())!;
 const context=await browser.newContext(),player=await context.newPage();await player.goto('/?join='+code);await player.getByRole('button',{name:'Find game'}).click();await player.getByLabel('Your name').fill('Guest');await player.getByRole('button',{name:'Join game'}).click();await expect(player.getByLabel('Switch team')).toBeVisible();
 await host.getByRole('button',{name:'Teams & players'}).click();await host.getByRole('button',{name:'Kick Guest',exact:true}).click();await expect(host.locator('.managed-player')).toHaveCount(0);await expect(player.getByRole('heading',{name:/A little knowledge/})).toBeVisible();await expect(player.getByRole('alert')).toContainText('The host removed you from the lobby.');await expect(host.getByText('0 players connected',{exact:true})).toBeVisible();await context.close();
});
