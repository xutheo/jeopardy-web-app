import test from 'node:test';
import assert from 'node:assert/strict';
import { activityLeaders, scoreValue } from '../shared/leaderboard';
import type { Current, View } from '../shared/model';
const players: View['players'] = Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: 'Player ' + i, teamId: 'team', active: true, selections: 0 }));
function group(mode: 'time' | 'score', values: (number | string)[]): NonNullable<Current['group']> {
  return { mode, status: 'review', elapsedMs: 0, runningSince: null, awards: {}, submissions: Object.fromEntries(values.map((value, i) => [String(i), { seconds: typeof value === 'number' ? value : null, score: typeof value === 'string' ? value : null, submittedAt: '', revision: 1 }])) };
}
test('time leaderboard keeps the five fastest results and uses shared ranks for ties', () => {
  const result = activityLeaders(group('time', [10, 4, 8, 4, 50, 1, 20, 30]), { prompt: '', answer: '', used: false }, players);
  assert.deepEqual(result.rows.map(r => r.value), [1, 4, 4, 8, 10]);
  assert.deepEqual(result.rows.map(r => r.rank), [1, 2, 2, 4, 5]);
});
test('score leaderboard supports either direction and flags unrankable results', () => {
  const scores = group('score', ['4/6', '2/6', 'X/6', '6/6', '3/6', '1/6', '5/6']);
  const clue = { prompt: '', answer: '', used: false };
  assert.deepEqual(activityLeaders(scores, clue, players).rows.map(r => r.result.score), ['6/6', '5/6', '4/6', '3/6', '2/6']);
  const low = activityLeaders(scores, { ...clue, scoreOrder: 'lower' }, players);
  assert.deepEqual(low.rows.map(r => r.result.score), ['1/6', '2/6', '3/6', '4/6', '5/6']); assert.equal(low.unranked, 1);
  assert.equal(scoreValue('0'), 0); assert.equal(scoreValue('1/0'), null); assert.equal(scoreValue('12 points'), null);
});
