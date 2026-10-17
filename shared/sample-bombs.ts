import type { Puzzle } from './puzzles';

export function sampleBombLevels(): Puzzle[] {
  const make = (level: string, items: string[], solution: string[], hints: string[]): Puzzle => ({ type: 'bomb', message: `${level}: use your team's clues to determine which wires to cut and in what order. Wires not required by the solution must remain intact.`, items, solution, hints, answers: [] });
  return [
    make('Beginner — Find the order', ['Green ■', 'Red ★', 'Yellow ▲'], ['Red ★', 'Green ■', 'Yellow ▲'], [
      'The green wire is not cut first.',
      'The star wire is cut immediately before the square wire.',
      'The yellow wire is cut last.'
    ]),
    make('Easy — Leave one intact', ['Red ★', 'Blue ●', 'Yellow ▲', 'Green ■'], ['Blue ●', 'Red ★', 'Yellow ▲'], [
      'Any wire not mentioned in other clues should not be cut at all.',
      'The circle is cut immediately before the red wire.',
      'The triangle is the last wire cut.'
    ]),
    make('Intermediate — Build the chain', ['Red ★', 'Blue ◆', 'Yellow ▲', 'Green ■'], ['Green ■', 'Yellow ▲', 'Blue ◆'], [
      'Only the convex polygons will be cut.',
      'The green wire is cut before the diamond wire.',
      'The triangle wire is cut second.'
    ]),
    make('Hard — Choose the safe set', ['Red ★', 'Blue ●', 'Yellow ▲', 'Green ■', 'Purple ◆'], ['Yellow ▲', 'Green ■', 'Blue ●'], [
      'Exactly three wires must be cut.',
      'The star and the purple wire must either both be cut or both remain intact.',
      'The yellow wire is the first wire cut, and the circle is the last wire cut.',
      'The square is cut immediately after the triangle and immediately before the blue wire.'
    ]),
    make('Expert — Shapes and sequence', ['Red ★', 'Blue ●', 'Yellow ▲', 'Green ■', 'Purple ◆'], ['Purple ◆', 'Red ★', 'Green ■', 'Blue ●'], [
      'The red wire must be cut immediately after one four-sided shape and immediately before the other.',
      'Do not cut any polygon with an odd number of sides.',
      'Cut the shape with the most lines of symmetry immediately after the green wire.'
    ])
  ];
}
