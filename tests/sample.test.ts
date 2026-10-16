import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { allModesSampleContent } from '../shared/sample';
import { contentSchema, isClueReady } from '../shared/model';
test('in-app samples include every game mode and a complete playable collection', () => {
 const content=contentSchema.parse(allModesSampleContent()), clues=content.boards.flatMap(b=>b.flatMap(c=>c.clues));
 assert.ok(content.boards.every(b=>b.length===6 && b[4].openToAll && b[5].title==='Team Challenges' && b[5].teamBased));
 assert.ok(clues.some(q=>q.image && q.imageAlt));
 assert.ok(content.boards.flat().some(c=>c.teamBased));
 assert.ok(content.boards.flat().every(c=>c.description));
 assert.ok(clues.some(q=>q.scoreOrder==='lower'));
 assert.ok(content.boards.every(b=>b.some(c=>c.clues.some(q=>q.boost))));
 assert.equal(clues.length,60);assert.ok(clues.every(isClueReady));assert.ok(clues.some(q=>q.boost));assert.ok(clues.some(q=>!q.kind));
 for(const mode of ['time','score'])assert.ok(clues.some(q=>q.kind==='group'&&!q.puzzle&&q.groupMode===mode));
 for(const type of ['bomb','code','timeline'])assert.ok(clues.some(q=>q.puzzle?.type===type));
 const pixelCategories = content.boards.flat().filter(c => c.pixelPerfect);
 assert.equal(pixelCategories.length, 2);
 assert.ok(pixelCategories.some(c => c.openToAll)); assert.ok(pixelCategories.some(c => !c.openToAll));
 for (const cat of pixelCategories) { assert.equal(cat.clues.length, 5); assert.equal(new Set(cat.clues.map(q => q.image)).size, 5); assert.ok(cat.clues.every(q => q.image && q.kind !== 'group' && !q.boost && isClueReady(q))); }
 const shipped = contentSchema.parse(JSON.parse(readFileSync(new URL('../public/all-features-sample.json', import.meta.url), 'utf8')));
 assert.deepEqual(shipped, content);
 assert.ok(Object.values(content.final).every(Boolean));
 const second=allModesSampleContent();content.boards[0][5].clues[2].puzzle!.hints[0]='changed';assert.notEqual(second.boards[0][5].clues[2].puzzle!.hints[0],'changed');
});
