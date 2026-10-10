import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DiskStore, validateGame } from '../server/storage.js';
import { newGame, hash } from '../server/game.js';

async function temp(t: any) { const root = await fs.mkdtemp(path.join(os.tmpdir(), 'jeopardy-storage-')); t.after(() => fs.rm(root, { recursive: true, force: true })); return { root, store: new DiskStore(root) }; }
test('snapshot round-trip restores a complete game and ignores interrupted temporary writes', async t => {
  const { root, store } = await temp(t), g = newGame('host'); await store.save(g);
  await fs.writeFile(path.join(root, 'games', g.id, 'snapshot-999999999999.json.tmp'), '{partial');
  assert.deepEqual((await store.load(g.id)).game, g);
});
test('a damaged latest snapshot falls back visibly to the previous valid generation', async t => {
  const { root, store } = await temp(t), g = newGame('host'); await store.save(g); const original = structuredClone(g); g.name = 'Second generation'; await store.save(g);
  const dir = path.join(root, 'games', g.id), latest = (await fs.readdir(dir)).sort().at(-1)!; await fs.writeFile(path.join(dir, latest), '{broken');
  const loaded = await store.load(g.id); assert.deepEqual(loaded.game, original); assert.match(loaded.warning!, /older snapshot/);
});
test('checksum mismatch is rejected even for syntactically valid JSON', async t => {
  const { root, store } = await temp(t), g = newGame('host'); await store.save(g);
  const dir = path.join(root, 'games', g.id), file = path.join(dir, (await fs.readdir(dir))[0]); const envelope = JSON.parse(await fs.readFile(file, 'utf8'));
  envelope.payload = envelope.payload.replace(g.name, 'Tampered name'); await fs.writeFile(file, JSON.stringify(envelope));
  await assert.rejects(store.load(g.id), /No valid/);
});
test('unsupported newer schema blocks recovery instead of hiding it with an older snapshot', async t => {
  const { root, store } = await temp(t), g = newGame('host'); await store.save(g); await store.save(g);
  const dir = path.join(root, 'games', g.id), file = path.join(dir, (await fs.readdir(dir)).sort().at(-1)!);
  const payload = JSON.stringify({ ...g, schemaVersion: 2 }); await fs.writeFile(file, JSON.stringify({ format: 1, payload, checksum: hash(payload) }));
  await assert.rejects(store.load(g.id), /different application version/);
});
test('snapshot retention keeps 20 recent generations', async t => {
  const { root, store } = await temp(t), g = newGame('host');
  for (let i = 0; i < 24; i++) { g.version++; await store.save(g); }
  assert.equal((await fs.readdir(path.join(root, 'games', g.id))).length, 20); assert.equal((await store.load(g.id)).game.version, 24);
});
test('a failed write leaves existing saved data intact', async t => {
  const { root, store } = await temp(t), g = newGame('host'); await store.save(g);
  const other = path.join(root, 'not-a-directory'); await fs.writeFile(other, 'occupied');
  const broken = new DiskStore(other); await assert.rejects(broken.save(g)); assert.equal((await store.load(g.id)).game.id, g.id);
});
test('invalid score ledger and path traversal are rejected', async t => {
  const { store } = await temp(t), g = newGame('host'); g.teams[0].score = 100;
  assert.throws(() => validateGame(g), /ledger/); await assert.rejects(store.load('../elsewhere'), /Invalid game ID/);
});
test('delete removes every game file and leaves other games untouched', async t => {
  const { root, store } = await temp(t), first = newGame('first'), second = newGame('second');
  await store.save(first); await store.save(first); await store.save(second);
  await fs.writeFile(path.join(root, 'games', first.id, 'interrupted.tmp'), 'partial write');
  await store.delete(first.id);
  await assert.rejects(fs.stat(path.join(root, 'games', first.id)), { code: 'ENOENT' });
  assert.equal((await store.load(second.id)).game.id, second.id);
  await assert.rejects(store.delete('../elsewhere'), /Invalid game ID/);
  await store.delete(first.id); // Retry after a successful removal is harmless.
});

test('images and group progress survive disk recovery without counting downtime', async t => {
  const { store } = await temp(t), g = newGame('host');
  const { applyCommand, pause } = await import('../server/game.js');
  const { sampleContent } = await import('../shared/sample.js');
  const { gameLinkSchema, imageSchema } = await import('../shared/model.js');
  Object.assign(g, sampleContent());
  g.players = g.teams.map((team, i) => ({ id: `p${i}`, name: `Player ${i}`, teamId: team.id, tokenHash: hash(`player${i}`), active: true, selections: 0 }));
  Object.assign(g.boards[0][0].clues[0], { kind: 'group', groupMode: 'time', link: 'https://example.com/puzzle', image: 'data:image/png;base64,aGVsbG8=' });
  const online = new Set(g.players.map(p => p.id)); let sequence = 0;
  const command = (game: typeof g, type: string, payload: object, now: number, playerId?: string) => applyCommand(game, playerId ? { role: 'player', playerId } : { role: 'host' }, { id: `cmd-${sequence++}`, type, payload }, now, online);
  command(g, 'start', {}, 0); command(g, 'open-clue', { category: 0, row: 0 }, 0);
  command(g, 'start-group', { attemptId: g.current!.id }, 1000); pause(g, 4000);
  await store.save(g); const restored = (await store.load(g.id)).game;
  assert.equal(restored.boards[0][0].clues[0].image, g.boards[0][0].clues[0].image);
  assert.equal(restored.current!.group!.elapsedMs, 3000); assert.equal(restored.current!.group!.runningSince, null);
  command(restored, 'resume', {}, 100000);
  command(restored, 'group-done', { attemptId: restored.current!.id }, 102000, 'p0');
  assert.equal(restored.current!.group!.submissions.p0.seconds, 5);
  await store.save(restored); assert.deepEqual((await store.load(g.id)).game.current!.group, restored.current!.group);
  assert.equal(gameLinkSchema.safeParse('javascript:alert(1)').success, false);
  assert.equal(imageSchema.safeParse('data:image/svg+xml;base64,aGVsbG8=').success, false);
});

test('puzzle assignments and partial cuts survive a disk round trip', async t => {
 const { store }=await temp(t), g=newGame('host'); const { sampleContent }=await import('../shared/sample');const { samplePuzzle }=await import('../shared/puzzles');const { applyCommand,pause }=await import('../server/game');Object.assign(g,sampleContent());
 g.players=g.teams.map((team,i)=>({id:'p'+i,name:'P'+i,teamId:team.id,tokenHash:hash('p'+i),active:true,selections:0}));
 Object.assign(g.boards[0][0].clues[0],{kind:'group',puzzle:samplePuzzle('bomb')});const online=new Set(g.players.map(p=>p.id));let id=0;
 const cmd=(type:string,payload:object,now:number,playerId?:string)=>applyCommand(g,playerId?{role:'player',playerId}:{role:'host'},{id:String(id++),type,payload},now,online);
 cmd('start',{},0);cmd('open-clue',{category:0,row:0},0);const payload={attemptId:g.current!.id};cmd('start-group',payload,1000);cmd('submit-puzzle',{...payload,item:'Blue ●'},2000,'p0');pause(g,2500);
 await store.save(g);const restored=(await store.load(g.id)).game;assert.deepEqual(restored.current!.group!.puzzle,g.current!.group!.puzzle);assert.equal(restored.current!.group!.elapsedMs,1500);
});
