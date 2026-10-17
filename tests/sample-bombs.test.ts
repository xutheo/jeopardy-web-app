import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleBombLevels } from '../shared/sample-bombs';
import { puzzleReady } from '../shared/puzzles';
function* orders(items: string[]): Generator<string[]> {
  yield [];
  for (let i=0;i<items.length;i++) for(const tail of orders(items.filter((_,j)=>i!==j))) yield [items[i],...tail];
}
test('bomb samples have 3–4 clues, at most five wires, and one valid solution including uncut choices', () => {
  const rules = [
    (p: (s:string)=>number,n:number) => p('Green')>0 && p('Red')>=0 && p('Green')===p('Red')+1 && p('Yellow')===n-1,
    (p: (s:string)=>number,n:number) => n===3 && p('Green')===-1 && p('Blue')>=0 && p('Red')===p('Blue')+1 && p('Yellow')===n-1,
    (p: (s:string)=>number,n:number) => n===3 && p('Red')===-1 && p('Green')>=0 && p('Green')<p('Blue') && p('Yellow')===1,
    (p: (s:string)=>number,n:number) => n===3 && (p('Red')>=0)===(p('Purple')>=0) && p('Yellow')===0 && p('Blue')===n-1 && p('Green')===p('Yellow')+1 && p('Blue')===p('Green')+1,
    (p: (s:string)=>number,n:number) => p('Green')>=0 && p('Purple')>=0 && p('Red')>=0 && ((p('Red')===p('Green')+1 && p('Purple')===p('Red')+1) || (p('Red')===p('Purple')+1 && p('Green')===p('Red')+1)) && p('Yellow')===-1 && p('Blue')===p('Green')+1
  ];
  for(const [i,puzzle] of sampleBombLevels().entries()) {
    assert.ok(puzzle.hints.length>=3 && puzzle.hints.length<=4);
    assert.ok(puzzle.items.length<=5);assert.ok(puzzleReady(puzzle));
    const valid=[...orders(puzzle.items)].filter(order=>rules[i](color=>order.findIndex(item=>item.startsWith(color+' ')),order.length));
    assert.deepEqual(valid,[puzzle.solution],puzzle.message);
  }
});
