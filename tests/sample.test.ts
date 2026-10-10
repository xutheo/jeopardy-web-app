import test from 'node:test';
import assert from 'node:assert/strict';
import { allModesSampleContent } from '../shared/sample';
import { contentSchema, isClueReady } from '../shared/model';
test('in-app samples include every game mode and a complete playable collection', () => {
 const content=contentSchema.parse(allModesSampleContent()), clues=content.boards.flatMap(b=>b.flatMap(c=>c.clues));
 assert.ok(clues.some(q=>q.image && q.imageAlt));
 assert.ok(content.boards.flat().some(c=>c.teamBased));
 assert.ok(content.boards.flat().every(c=>c.description));
 assert.ok(clues.some(q=>q.scoreOrder==='lower'));
 assert.ok(content.boards.every(b=>b.some(c=>c.clues.some(q=>q.boost))));
 assert.equal(clues.length,50);assert.ok(clues.every(isClueReady));assert.ok(clues.some(q=>q.boost));assert.ok(clues.some(q=>!q.kind));
 for(const mode of ['time','score'])assert.ok(clues.some(q=>q.kind==='group'&&!q.puzzle&&q.groupMode===mode));
 for(const type of ['bomb','code','timeline'])assert.ok(clues.some(q=>q.puzzle?.type===type));
 assert.ok(Object.values(content.final).every(Boolean));
 const second=allModesSampleContent();content.boards[0][4].clues[2].puzzle!.hints[0]='changed';assert.notEqual(second.boards[0][4].clues[2].puzzle!.hints[0],'changed');
});
