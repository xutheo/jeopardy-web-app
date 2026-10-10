import { z } from 'zod';
export const puzzleSchema = z.object({
  type: z.enum(['bomb', 'code', 'timeline']),
  message: z.string().max(4000), instructions: z.string().max(4000).optional(),
  hints: z.array(z.string().max(2000)).max(30),
  items: z.array(z.string().max(200)).max(20),
  solution: z.array(z.string().max(200)).max(20),
  answers: z.array(z.string().max(500)).max(20)
});
export type Puzzle = z.infer<typeof puzzleSchema>;
export const puzzleStateSchema = z.object({ teams: z.record(z.object({
  operator: z.string(), assignments: z.record(z.array(z.string().max(2400))),
  mistakes: z.number().int().nonnegative(), progress: z.array(z.string()),
  finishedMs: z.number().nonnegative().nullable(), lockedUntil: z.number().nonnegative()
})) });
export function puzzleReady(p: Puzzle) {
  if (!p.message.trim()) return false;
  if (p.type === 'code') return p.answers.some(a => a.trim()) && p.hints.length > 0 && p.hints.every(h => h.trim());
  return p.items.length >= 2 && p.items.every(i => i.trim()) && new Set(p.items).size === p.items.length && p.solution.length === p.items.length && new Set(p.solution).size === p.items.length && p.solution.every(i => p.items.includes(i)) && (p.type === 'timeline' ? p.hints.length === p.items.length && p.hints.every(h => h.trim()) : p.hints.length > 0 && p.hints.every(h => h.trim()));
}
export function samplePuzzle(type: Puzzle['type']): Puzzle {
  if (type === 'code') return { type, message: 'H V R U — What four-letter word is hidden here?', items: [], solution: [], answers: ['ROSE'], hints: ['Each letter was shifted forward by the same amount.', 'The shift is the number of sides on a triangle.', 'Read the encrypted message backward before decoding.', 'The answer grows in a garden.'] };
  if (type === 'timeline') return { type, message: 'Arrange these events from earliest to latest.', items: ['First powered flight', 'Moon landing', 'World Wide Web proposed'], solution: ['First powered flight', 'Moon landing', 'World Wide Web proposed'], answers: [], hints: ['The Wright brothers flew in 1903.', 'Apollo 11 landed in 1969.', 'Tim Berners-Lee proposed the Web in 1989.'] };
  return { type, message: 'Cut all four wires in the correct order.', items: ['Red ★', 'Blue ●', 'Yellow ▲', 'Green ■'], solution: ['Blue ●', 'Green ■', 'Red ★', 'Yellow ▲'], answers: [], hints: ['The circle is cut first.', 'The square follows the circle.', 'The star comes immediately before the triangle.', 'The triangle is last.'] };
}

export function puzzleInstructions(type: Puzzle['type']): string {
  const shared = 'When the host starts, each teammate receives private clues. Discuss your clues with your team. One operator uses the controls to submit your solution.';
  if (type === 'bomb') return 'Cut the bomb wires in the correct order to successfully defuse the bomb. Each player will receive a clue about the wire order, with one player operating the bomb panel. Combine the clues to successfully cut the bomb. Fewest mistakes wins, with completion time breaking ties.';
  if (type === 'code') return shared + '\nCombine your clues to decode the shared message. Your operator submits the answer. Wrong answers count as mistakes. Fewest mistakes wins, with completion time breaking ties.';
  return shared + '\nEach teammate receives event clues. Help your operator arrange all events from earliest to latest. Incorrect orders lock your team out for 10 seconds. Fastest correct completion wins.';
}
