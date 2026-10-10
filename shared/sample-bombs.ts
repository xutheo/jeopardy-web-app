import type { Puzzle } from './puzzles';

export function sampleBombLevels(): Puzzle[] {
  const make = (level: string, items: string[], solution: string[], hints: string[]): Puzzle => ({ type: 'bomb', message: `${level}: cut all ${items.length} wires in the correct order.`, items, solution, hints, answers: [] });
  return [
    make('Beginner', ['Red ★', 'Blue ●', 'Yellow ▲'], ['Blue ●', 'Red ★', 'Yellow ▲'], ['Cut the circle first.', 'Cut the star second.', 'Cut the triangle last.']),
    make('Easy', ['Red ★', 'Blue ●', 'Yellow ▲', 'Green ■'], ['Green ■', 'Yellow ▲', 'Blue ●', 'Red ★'], ['The square is first.', 'The triangle comes immediately after the square.', 'The circle comes immediately before the star.', 'The star is last.']),
    make('Intermediate', ['Red ★', 'Blue ●', 'Yellow ▲', 'Green ■', 'Purple ◆'], ['Yellow ▲', 'Purple ◆', 'Red ★', 'Green ■', 'Blue ●'], ['The triangle is first and the circle is last.', 'The diamond comes before the star.', 'The star comes before the square.', 'The square comes before the circle.']),
    make('Hard', ['Red ★', 'Blue ●', 'Yellow ▲', 'Green ■', 'Purple ◆', 'Orange ☀'], ['Purple ◆', 'Blue ●', 'Orange ☀', 'Yellow ▲', 'Red ★', 'Green ■'], ['The diamond is first. The square is last.', 'The circle is immediately before the sun.', 'Exactly one wire is cut between the sun and the star.', 'The triangle is immediately before the star.']),
    make('Expert', ['Red ★', 'Blue ●', 'Yellow ▲', 'Green ■', 'Purple ◆', 'Orange ☀', 'White ✚'], ['Orange ☀', 'Green ■', 'Purple ◆', 'White ✚', 'Blue ●', 'Red ★', 'Yellow ▲'], ['The cross is fourth. The triangle is last.', 'The sun is before the square, and both are before the diamond.', 'The diamond is before the cross. The circle is after the cross.', 'The star is immediately after the circle.'])
  ];
}
