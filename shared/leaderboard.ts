import type { ClueData, Current, View } from './model';
export function scoreValue(value: string): number | null {
  const text = value.trim();
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) { const n = Number(text); return Number.isFinite(n) ? n : null; }
  const fraction = text.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fraction && Number(fraction[2]) > 0) { const n = Number(fraction[1]) / Number(fraction[2]); return Number.isFinite(n) ? n : null; }
  return null;
}
export function activityLeaders(group: NonNullable<Current['group']>, clue: ClueData, players: View['players']) {
  const results = Object.entries(group.submissions).flatMap(([id, result]) => {
    const player = players.find(p => p.id === id), value = group.mode === 'time' ? result.seconds : scoreValue(result.score || '');
    return player && value !== null ? [{ player, result, value, rank: 0 }] : [];
  });
  const direction = group.mode === 'time' || clue.scoreOrder === 'lower' ? 1 : -1;
  results.sort((a, b) => direction * (a.value - b.value) || a.player.id.localeCompare(b.player.id));
  results.forEach((row, i) => { row.rank = i && row.value === results[i - 1].value ? results[i - 1].rank : i + 1; });
  return { rows: results.slice(0, 5), unranked: Object.keys(group.submissions).length - results.length };
}
