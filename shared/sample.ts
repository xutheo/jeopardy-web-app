import { samplePuzzle } from './puzzles.js';
import type { Content } from './model.js';
const packs: [string, [string, string][]][] = [
  ['Around the World', [['This city is home to the Eiffel Tower.', 'Paris'], ['This is the largest ocean on Earth.', 'Pacific Ocean'], ['The ancient city of Machu Picchu is in this country.', 'Peru'], ['This river flows through Cairo.', 'The Nile'], ['This country has the cities of Wellington and Auckland.', 'New Zealand']]],
  ['Science Lab', [['Plants absorb this gas during photosynthesis.', 'Carbon dioxide'], ['This planet is known as the Red Planet.', 'Mars'], ['This force keeps planets in orbit around the Sun.', 'Gravity'], ['The chemical symbol Au represents this element.', 'Gold'], ['This organelle is often called the powerhouse of the cell.', 'Mitochondrion / mitochondria']]],
  ['Page Turners', [['In a fairy tale, this girl leaves behind a glass slipper.', 'Cinderella'], ['This author wrote the Harry Potter books.', 'J. K. Rowling'], ['This detective lives at 221B Baker Street.', 'Sherlock Holmes'], ['This George Orwell novel features Big Brother.', 'Nineteen Eighty-Four / 1984'], ['This author wrote Pride and Prejudice.', 'Jane Austen']]],
  ['At the Movies', [['This cowboy toy is best friends with Buzz Lightyear.', 'Woody'], ['This 1997 film features Jack and Rose aboard a ship.', 'Titanic'], ['In Star Wars, this small green Jedi trains Luke on Dagobah.', 'Yoda'], ['This fictional African country is the home of Black Panther.', 'Wakanda'], ['This director made Jaws and Jurassic Park.', 'Steven Spielberg']]],
  ['A Little of Everything', [['A standard chessboard has this many squares.', '64'], ['This instrument has 88 keys in its standard modern form.', 'Piano'], ['This sport uses the terms birdie, eagle, and bogey.', 'Golf'], ['This is the main ingredient in traditional hummus.', 'Chickpeas'], ['This Roman numeral represents 1,000.', 'M']]],
  ['History Class', [['This civilization built the pyramids at Giza.', 'Ancient Egyptians'], ['The Berlin Wall fell in this year.', '1989'], ['This queen ruled England during the defeat of the Spanish Armada in 1588.', 'Elizabeth I'], ['This document was sealed by King John in 1215.', 'Magna Carta'], ['This empire was ruled from its capital at Tenochtitlan.', 'The Aztec Empire']]],
  ['Natural Wonders', [['This is the tallest living land animal.', 'Giraffe'], ['This is the largest living species of shark.', 'Whale shark'], ['This process turns a caterpillar into a butterfly.', 'Metamorphosis'], ['This biome is characterized by permafrost.', 'Tundra'], ['This is the deepest known oceanic trench.', 'Mariana Trench']]],
  ['Word Play', [['This punctuation mark ends a direct question.', 'Question mark'], ['This term describes a word that reads the same forward and backward.', 'Palindrome'], ['These words sound alike but have different meanings, such as sea and see.', 'Homophones'], ['This figure of speech uses like or as to compare two things.', 'Simile'], ['This term describes a word formed from initial letters, such as NASA.', 'Acronym']]],
  ['On the Menu', [['This Italian dish typically has a crust, tomato sauce, and cheese.', 'Pizza'], ['This spice gives many curries a yellow color.', 'Turmeric'], ['Traditional Japanese miso paste is made primarily from these beans.', 'Soybeans'], ['This French dessert has a caramelized sugar crust over custard.', 'Crème brûlée'], ['This Spanish rice dish is traditionally associated with Valencia.', 'Paella']]],
  ['Numbers Game', [['This is the only even prime number.', '2'], ['A triangle’s interior angles add up to this many degrees in Euclidean geometry.', '180'], ['This is the square root of 144.', '12'], ['This mathematical constant is the ratio of a circle’s circumference to its diameter.', 'Pi'], ['This is the next number in the sequence 1, 1, 2, 3, 5, 8.', '13']]]
];
export function sampleContent(): Content {
  return { name: 'The Friday Night Collection', boards: [packs.slice(0, 5), packs.slice(5)].map(board => board.map(([title, pairs]) => ({ title, clues: pairs.map(([prompt, answer]) => ({ prompt, answer, used: false })) }))), final: { category: 'World Geography', prompt: 'This is the only continent that lies in all four hemispheres: Northern, Southern, Eastern, and Western.', answer: 'Africa' } };
}

/** Complete demo collection used by the in-app sample loader. */
export function allModesSampleContent(): Content {
  const content = sampleContent();
  content.name = 'Qoobee All Modes Collection';
  for (const board of content.boards) for (const category of board) category.description = 'Test your team’s knowledge of ' + category.title.toLowerCase() + '.';
  content.boards[0][4] = { title: 'Team Challenges', description: 'Race the clock, share private clues, defuse wires, crack codes, and put events in order.', clues: [
    { prompt: 'Open the practice link, return here, and press Finished. This sample demonstrates server-timed completion.', answer: '', used: false, kind: 'group', groupMode: 'time', linkLabel: 'Timed activity', link: 'https://example.com' },
    { prompt: 'Count the letters in QOOBEE QUESTIONS and submit your score. The host awards team points after reviewing results.', answer: '', used: false, kind: 'group', groupMode: 'score', scoreOrder: 'higher', linkLabel: 'Scored activity', link: 'https://example.com' },
    ...(['bomb', 'code', 'timeline'] as const).map(type => ({ prompt: samplePuzzle(type).message, answer: '', used: false, kind: 'group' as const, groupMode: 'time' as const, linkLabel: type === 'bomb' ? 'Bomb defusal' : type === 'code' ? 'Codebreakers' : 'Timelines', puzzle: samplePuzzle(type) }))
  ] };
  content.boards[1][4].clues[4].boost = true;
  return content;
}
