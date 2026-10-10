import test from 'node:test';
import assert from 'node:assert/strict';
import { joinPlayer } from '../server/join.js';
import { newGame, authenticate } from '../server/game.js';

test('same username on a new device restores the original player, team, and turn history', () => {
  const g = newGame('host'), originalToken = 'original-player-token';
  const id = joinPlayer(g, { name: 'Ada', teamId: g.teams[0].id, token: originalToken }, new Set());
  const originalTeam = g.teams.find(t => t.id === g.players[0].teamId)!;
  g.phase = 'board'; g.players[0].selections = 4; originalTeam.queue = [id];
  const before = structuredClone(g.players[0]);
  const restored = joinPlayer(g, { name: '  ADA ', teamId: g.teams[1].id, token: 'new-device-token' }, new Set());
  assert.equal(restored, id); assert.equal(g.players.length, 1);
  assert.deepEqual({ ...g.players[0], tokenHash: before.tokenHash }, before);
  assert.equal(originalTeam.captain, id); assert.deepEqual(originalTeam.queue, [id]);
  assert.equal(authenticate(g, 'new-device-token').playerId, id);
  assert.throws(() => authenticate(g, originalToken), /no longer valid/);
});
test('a connected username cannot be claimed by another browser', () => {
  const g = newGame('host');
  const id = joinPlayer(g, { name: 'Ada', teamId: g.teams[0].id, token: 'first' }, new Set());
  assert.throws(() => joinPlayer(g, { name: 'ada', teamId: g.teams[1].id, token: 'second' }, new Set([id])), /already connected/);
  assert.equal(g.players.length, 1); assert.equal(authenticate(g, 'first').playerId, id);
});
test('credential retry is idempotent and new players cannot join during play', () => {
  const g = newGame('host'), input = { name: 'Ada', teamId: g.teams[0].id, token: 'first' };
  const id = joinPlayer(g, input, new Set()); const version = g.version;
  assert.equal(joinPlayer(g, input, new Set([id])), id); assert.equal(g.version, version);
  assert.throws(() => joinPlayer(g, { ...input, name: 'Grace' }, new Set()), /different username/);
  g.phase = 'board';
  assert.throws(() => joinPlayer(g, { ...input, name: 'Grace', token: 'second' }, new Set()), /already in progress/);
  assert.equal(g.players.length, 1);
});
test('rejoining does not reactivate a player the host sat out', () => {
  const g = newGame('host'); joinPlayer(g, { name: 'Ada', teamId: g.teams[0].id, token: 'first' }, new Set());
  g.players[0].active = false;
  joinPlayer(g, { name: 'Ada', teamId: g.teams[1].id, token: 'second' }, new Set());
  assert.equal(g.players[0].active, false);
});

test('new player names are limited to six characters', () => {
  const g = newGame('host');
  assert.throws(() => joinPlayer(g, { name: 'Seven77', teamId: g.teams[0].id, token: 'new' }, new Set()), /6 characters/);
  joinPlayer(g, { name: 'Six666', teamId: g.teams[0].id, token: 'new' }, new Set());
  assert.equal(g.players[0].name, 'Six666');
});

test('new players are assigned among the smallest teams and retries preserve assignment',()=>{
 const g=newGame('host');g.teams.push({...g.teams[0],id:'third',name:'Third',captain:null,queue:[]});
 for(let i=0;i<30;i++) {
  const before=g.teams.map(t=>g.players.filter(p=>p.teamId===t.id).length), input={name:'P'+i,token:'token-'+i,teamId:'ignored-client-choice'};
  const id=joinPlayer(g,input,new Set()),player=g.players.find(p=>p.id===id)!;
  assert.equal(before[g.teams.findIndex(t=>t.id===player.teamId)],Math.min(...before));
  assert.equal(joinPlayer(g,input,new Set([id])),id);
  const counts=g.teams.map(t=>g.players.filter(p=>p.teamId===t.id).length);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
 }
});
