import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { gameSchema, type Game } from '../shared/model.js';
import { hash } from './game.js';

export function validateGame(value: unknown): Game {
  const g = gameSchema.parse(value);
  const teamIds = new Set(g.teams.map(t => t.id)), playerIds = new Set(g.players.map(p => p.id));
  if (teamIds.size !== g.teams.length || playerIds.size !== g.players.length || g.players.some(p => !teamIds.has(p.teamId))) throw new Error('Invalid roster in save.');
  for (const t of g.teams) {
    if (t.captain && !g.players.some(p => p.id === t.captain && p.teamId === t.id)) throw new Error('Invalid captain in save.');
    if (new Set(t.queue).size !== t.queue.length || t.queue.some(id => !g.players.some(p => p.id === id && p.teamId === t.id))) throw new Error('Invalid rotation in save.');
    if (g.ledger.filter(e => e.teamId === t.id).reduce((sum, e) => sum + e.amount, 0) !== t.score) throw new Error('Score ledger does not match totals.');
  }
  if (g.ledger.some(e => !teamIds.has(e.teamId))) throw new Error('Invalid scoring team.');
  if (g.current && Object.entries(g.current.representatives).some(([team, player]) => !g.players.some(p => p.id === player && p.teamId === team))) throw new Error('Invalid representative in save.');
  if (g.current?.winner && !playerIds.has(g.current.winner)) throw new Error('Invalid winning player.');
  if (g.current?.state === 'answering' && (!g.current.winner || !g.current.buzzId)) throw new Error('Missing accepted buzz.');
  if (g.phase.startsWith('final') || g.phase === 'finished') {
    if (Object.keys(g.finalEntries).length !== g.teams.length || g.teams.some(t => !Object.hasOwn(g.finalEntries, t.id))) throw new Error('Incomplete Final Jeopardy save.');
    for (const e of Object.values(g.finalEntries)) if (e.wager !== null && e.wager > Math.max(2000, e.score)) throw new Error('Invalid saved wager.');
  }
  return g;
}

export class DiskStore {
  constructor(public root: string) {}
  private directory(id: string) { if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid game ID.'); return path.join(this.root, 'games', id); }
  async delete(id: string) {
    const directory = path.resolve(this.directory(id));
    const root = await fs.realpath(this.root);
    let actual: string;
    try {
      if ((await fs.lstat(directory)).isSymbolicLink()) throw new Error('Refusing to delete a linked game directory.');
      actual = await fs.realpath(directory);
    } catch (error: any) { if (error.code === 'ENOENT') return; throw error; }
    // Check the resolved target before recursively removing any files.
    if (path.dirname(actual) !== path.join(root, 'games') || path.basename(actual) !== id) throw new Error('Game directory is outside the save directory.');
    await fs.rm(actual, { recursive: true, force: true });
  }
  async save(game: Game) {
    validateGame(game);
    const dir = this.directory(game.id); await fs.mkdir(dir, { recursive: true });
    const existing = (await fs.readdir(dir)).filter(n => /^snapshot-\d+\.json$/.test(n)).sort();
    const last = existing.at(-1); const generation = last ? Number(last.match(/\d+/)![0]) + 1 : 1;
    game.savedAt = new Date().toISOString();
    const payload = JSON.stringify(game);
    const file = path.join(dir, `snapshot-${String(generation).padStart(12, '0')}.json`);
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      const handle = await fs.open(temporary, 'wx');
      try { await handle.writeFile(JSON.stringify({ format: 1, checksum: hash(payload), payload })); await handle.sync(); }
      finally { await handle.close(); }
      await fs.rename(temporary, file);
      // Windows does not expose directory fsync; use it on filesystems that support it.
      if (process.platform !== 'win32') { const folder = await fs.open(dir, 'r'); try { await folder.sync(); } finally { await folder.close(); } }
    } catch (error) { await fs.unlink(temporary).catch(() => {}); throw error; }
    for (const old of existing.slice(0, Math.max(0, existing.length - 19))) await fs.unlink(path.join(dir, old)).catch(() => {});
  }
  async load(id: string): Promise<{ game: Game; warning: string | null }> {
    const dir = this.directory(id);
    const names = (await fs.readdir(dir)).filter(n => /^snapshot-\d+\.json$/.test(n)).sort().reverse();
    for (let index = 0; index < names.length; index++) {
      try {
        const envelope = JSON.parse(await fs.readFile(path.join(dir, names[index]), 'utf8'));
        if (envelope.format !== 1) throw new Error('Unsupported snapshot format');
        if (typeof envelope.payload !== 'string' || hash(envelope.payload) !== envelope.checksum) throw new Error('Snapshot checksum mismatch');
        const parsed = JSON.parse(envelope.payload);
        if (parsed.schemaVersion !== 1) throw new UnsupportedSave('This save requires a different application version.');
        const game = validateGame(parsed); if (game.id !== id) throw new Error('Game ID mismatch');
        return { game, warning: index > 0 ? `Latest save was damaged. Recovered an older snapshot from ${game.savedAt}; recent progress may be missing.` : null };
      } catch (error) { if (error instanceof UnsupportedSave) throw error; }
    }
    throw new Error('No valid game snapshot could be recovered. Original files have been preserved.');
  }
  async listIds() { await fs.mkdir(path.join(this.root, 'games'), { recursive: true }); return (await fs.readdir(path.join(this.root, 'games'), { withFileTypes: true })).filter(e => e.isDirectory() && /^[a-f0-9-]{36}$/.test(e.name)).map(e => e.name); }
}
class UnsupportedSave extends Error {}

export async function lockDirectory(root: string) {
  await fs.mkdir(root, { recursive: true }); const file = path.join(root, 'server.lock');
  try { const handle = await fs.open(file, 'wx'); await handle.writeFile(String(process.pid)); await handle.close(); }
  catch (error: any) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(await fs.readFile(file, 'utf8')); let alive = true;
    try { process.kill(pid, 0); } catch (e: any) { if (e.code === 'ESRCH') alive = false; }
    if (alive) throw new Error('Another backend owns this save directory. Stop it before starting another server.');
    await fs.unlink(file); return lockDirectory(root);
  }
  return async () => { await fs.unlink(file).catch(() => {}); };
}
