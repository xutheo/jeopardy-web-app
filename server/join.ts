import { randomUUID, randomInt } from 'node:crypto';
import type { Game } from '../shared/model.js';
import { hash } from './game.js';

export const normalizedName = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

// Called inside the room's serialized command queue; the caller commits before replying.
export function joinPlayer(game: Game, input: { name: string; teamId?: string; token: string }, online: Set<string>) {
  if (game.phase === 'finished') throw new Error('This game has finished.');
  const name = normalizedName(input.name);
  const credential = game.players.find(p => p.tokenHash === hash(input.token));
  if (credential) {
    if (normalizedName(credential.name) !== name) throw new Error('This session belongs to a different username.');
    return credential.id;
  }
  const matches = game.players.filter(p => normalizedName(p.name) === name);
  if (matches.length > 1) throw new Error('This older game has duplicate usernames. Reconnect using your original browser session.');
  if (matches.length === 1) {
    const player = matches[0];
    if (online.has(player.id)) throw new Error('That username is already connected. Use a different username.');
    player.tokenHash = hash(input.token);
    // Preserve the original team, captain assignment, selection history, and current answer opportunity.
    game.version++;
    return player.id;
  }
  if (game.phase !== 'lobby') throw new Error('This game is already in progress. Only existing players can reconnect.');
  if (name.length > 6) throw new Error('Player names must be 6 characters or fewer.');
  if (!game.teams.length || game.players.length >= 100) throw new Error('Cannot join this game.');
  const counts = game.teams.map(t => game.players.filter(p => p.teamId === t.id).length);
  const smallest = Math.min(...counts);
  const candidates = game.teams.filter((_,i) => counts[i] === smallest);
  const team = candidates[randomInt(candidates.length)];
  const id = randomUUID();
  game.players.push({ id, name: input.name.trim().replace(/\s+/g, ' '), teamId: team.id, tokenHash: hash(input.token), active: game.phase === 'lobby', selections: 0 });
  if (!team.captain && game.phase === 'lobby') team.captain = id;
  game.version++;
  return id;
}
