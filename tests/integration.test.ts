import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import { sampleContent } from '../shared/sample.js';
import type { View } from '../shared/model.js';
import { DiskStore } from '../server/storage.js';

test('live server: simultaneous buzzes, durable ruling, crash/restart, reconnect, and backup import', { timeout: 60000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'jeopardy-live-')); const port = 3300 + Math.floor(Math.random() * 1000); const url = `http://127.0.0.1:${port}`;
  let server: ChildProcess; const sockets: Socket[] = [];
  async function start() { server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts', '--production'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), DATA_DIR: root }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let output = ''; server.stdout!.on('data', d => output += d); server.stderr!.on('data', d => output += d);
    for (let i = 0; i < 100; i++) { if (server.exitCode !== null) throw new Error(output); try { if ((await fetch(`${url}/api/health`)).ok) return; } catch {} await new Promise(r => setTimeout(r, 100)); } throw new Error(`Server did not start: ${output}`);
  }
  async function kill() { if (server?.exitCode === null) { const ended = new Promise<void>(resolve => server.once('exit', () => resolve())); server.kill('SIGKILL'); await ended; } }
  t.after(async () => { sockets.forEach(s => s.disconnect()); await kill(); await fs.rm(root, { recursive: true, force: true }); });
  await start();
  async function api(route: string, body?: unknown, token?: string) { const response = await fetch(`${url}${route}`, { method: body !== undefined ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }
  async function connect(auth: any) { const socket = io(url, { auth, reconnection: false }); sockets.push(socket); const state = await new Promise<View>((resolve, reject) => { socket.once('state', resolve); socket.once('connect_error', reject); }); return { socket, state }; }
  const host = await api('/api/games', { name: 'Integration night' }); const h = await connect(host);
  async function cmd(socket: Socket, type: string, payload = {}, id = randomUUID()) { return socket.timeout(5000).emitWithAck('command', { id, type, payload }); }
  assert.equal((await cmd(h.socket, 'save-content', sampleContent())).ok, true);
  const p1 = await api('/api/join', { code: h.state.code, name: 'Ada', teamId: h.state.teams[0].id, token: 'a'.repeat(64) });
  const p2 = await api('/api/join', { code: h.state.code, name: 'Grace', teamId: h.state.teams[1].id, token: 'b'.repeat(64) });
  const a = await connect(p1), b = await connect(p2); assert.equal(a.state.boards[0][0].clues[0].answer, '');
  await assert.rejects(api(`/api/games/${host.gameId}/sample-content`, undefined, p1.token), /Host access/);
  assert.equal((await api(`/api/games/${host.gameId}/sample-content`, undefined, host.token)).boards.length, 2);
  assert.equal((await cmd(a.socket, 'start')).ok, false);
  await cmd(h.socket, 'start'); await cmd(h.socket, 'open-clue', { category: 0, row: 0 });
  const saved = await new DiskStore(root).load(host.gameId); const attemptId = saved.game.current!.id;
  const results = await Promise.all([cmd(a.socket, 'buzz', { attemptId }), cmd(b.socket, 'buzz', { attemptId })]);
  assert.equal(results.filter(r => r.ok).length, 1);
  let durable = (await new DiskStore(root).load(host.gameId)).game; assert.equal(durable.current!.state, 'answering');
  const winner = durable.current!.winner, ruling = randomUUID(); const rulingPayload = { buzzId: durable.current!.buzzId, correct: true };
  assert.equal((await cmd(h.socket, 'judge', rulingPayload, ruling)).ok, true);
  const before = (await new DiskStore(root).load(host.gameId)).game;
  // Make the save directory unwritable without changing OS permissions or touching unrelated files.
  await fs.rename(path.join(root, 'games'), path.join(root, 'games-held'));
  await fs.writeFile(path.join(root, 'games'), 'simulated unavailable storage');
  const failedRuling = await cmd(h.socket, 'adjust-score', { teamId: before.teams[0].id, amount: 700, reason: 'Must not commit' });
  assert.equal(failedRuling.ok, false); assert.match(failedRuling.error, /Saving to disk failed/);
  const frozen = await connect(host); assert.equal(frozen.state.paused, true); assert.ok(frozen.state.storageError); assert.deepEqual(frozen.state.teams.map(t => t.score), before.teams.filter(t => before.players.some(p => p.teamId === t.id)).map(t => t.score));
  await fs.unlink(path.join(root, 'games')); await fs.rename(path.join(root, 'games-held'), path.join(root, 'games'));
  await api(`/api/games/${host.gameId}/retry-storage`, {}, host.token);
  await kill(); sockets.forEach(s => s.disconnect()); await start();
  const recoveredHost = await connect(host); assert.equal(recoveredHost.state.paused, true); assert.equal(recoveredHost.state.current!.winner, winner); assert.deepEqual(recoveredHost.state.teams.map(t => t.score), before.teams.filter(t => before.players.some(p => p.teamId === t.id)).map(t => t.score));
  await connect(p1); const retry = await cmd(recoveredHost.socket, 'judge', rulingPayload, ruling); assert.equal(retry.ok, true);
  durable = (await new DiskStore(root).load(host.gameId)).game; assert.equal(durable.ledger.length, 1);
  const backup = await api(`/api/games/${host.gameId}/backup`, undefined, host.token); assert.equal(backup.game.hostHash, ''); assert.ok(backup.game.players.every((p: any) => !p.tokenHash));
  const imported = await api('/api/import', backup); assert.notEqual(imported.gameId, host.gameId); const restored = await connect(imported); assert.equal(restored.state.paused, true); assert.equal(restored.state.unclaimed.length, 2);
  const newcomer = await api('/api/join', { code: restored.state.code, name: 'Ada', teamId: restored.state.teams[0].id, token: 'c'.repeat(64) });
  await assert.rejects(api('/api/join', { code: restored.state.code, name: 'New guest', teamId: restored.state.teams[0].id, token: 'new-guest-token-12345678901234567890' }), /already in progress/);
  const claimed = await connect(newcomer); assert.equal(claimed.state.playerId, p1.playerId);
  const badBackup = structuredClone(backup); badBackup.game.teams[0].score += 1; await assert.rejects(api('/api/import', badBackup), /ledger/);

  // Reconnect a team that was entirely offline when the next question opened.
  await cmd(recoveredHost.socket, 'resume'); await cmd(recoveredHost.socket, 'return-board');
  await cmd(recoveredHost.socket, 'open-clue', { category: 0, row: 1 });
  const beforeRejoin = (await new DiskStore(root).load(host.gameId)).game;
  assert.equal(beforeRejoin.current!.representatives[beforeRejoin.players.find(p => p.id === p2.playerId)!.teamId], undefined);
  const returned = await connect(p2);
  const synced = await new Promise<View>(resolve => { returned.socket.once('state', resolve); returned.socket.emit('sync'); });
  assert.equal(synced.playerId, p2.playerId);
  for (let i = 0; i < 50; i++) { if ((await new DiskStore(root).load(host.gameId)).game.current!.representatives[beforeRejoin.teams[1].id]) break; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.equal((await cmd(returned.socket, 'buzz', { attemptId: beforeRejoin.current!.id })).ok, true);

  // Verify the initial 50-player operating target with real connections and durable buzz fan-out.
  const crowdHost = await api('/api/games', { name: '50-player room' }); const crowd = await connect(crowdHost);
  await cmd(crowd.socket, 'save-content', sampleContent());
  const players = [];
  for (let i = 0; i < 50; i++) { const session = await api('/api/join', { code: crowd.state.code, name: `G${i}`, teamId: crowd.state.teams[i % 2].id, token: `${String(i).padStart(2, '0')}${'x'.repeat(62)}` }); const live = await connect(session); players.push({ ...live, session }); }
  await cmd(crowd.socket, 'start'); await cmd(crowd.socket, 'open-clue', { category: 0, row: 0 });
  const crowdGame = (await new DiskStore(root).load(crowdHost.gameId)).game;
  const rep = players.find(p => p.session.playerId === Object.values(crowdGame.current!.representatives)[0])!;
  const delivery = players.map(p => new Promise<void>(resolve => { const handler = (v: View) => { if (v.current?.state === 'answering') { p.socket.off('state', handler); resolve(); } }; p.socket.on('state', handler); }));
  const started = performance.now(); assert.equal((await cmd(rep.socket, 'buzz', { attemptId: crowdGame.current!.id })).ok, true);
  await Promise.race([Promise.all(delivery), new Promise((_, reject) => { const timeout = setTimeout(() => reject(new Error('50-player broadcast timed out')), 5000); timeout.unref(); })]);
  t.diagnostic(`50-player durable buzz acknowledged and delivered in ${Math.round(performance.now() - started)} ms on loopback.`);
  const endpoint = `${url}/api/games/${crowdHost.gameId}`;
  const forbidden = await fetch(endpoint, { method: 'DELETE', headers: { Authorization: `Bearer ${rep.session.token}` } });
  assert.equal(forbidden.status, 400); assert.equal((await new DiskStore(root).load(crowdHost.gameId)).game.id, crowdHost.gameId);
  const removed = new Promise<void>(resolve => rep.socket.once('game-deleted', () => resolve()));
  const deletion = await fetch(endpoint, { method: 'DELETE', headers: { Authorization: `Bearer ${crowdHost.token}` } });
  assert.equal(deletion.status, 200); await removed;
  await assert.rejects(fs.stat(path.join(root, 'games', crowdHost.gameId)), { code: 'ENOENT' });
  assert.equal((await new DiskStore(root).load(host.gameId)).game.id, host.gameId);
  await kill(); sockets.forEach(s => s.disconnect()); await start();
  await assert.rejects(api(`/api/rooms/${crowd.state.code}`), /Room not found/);
  await assert.rejects(fs.stat(path.join(root, 'games', crowdHost.gameId)), { code: 'ENOENT' });
});
