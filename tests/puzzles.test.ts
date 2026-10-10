import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { newGame, hash, applyCommand, publicView, pause } from '../server/game';
import { sampleContent } from '../shared/sample';
import { samplePuzzle, puzzleReady, type Puzzle } from '../shared/puzzles';
import { validateGame } from '../server/storage';
import type { Actor } from '../shared/model';
function setup(type: Puzzle['type']) {
 const g=newGame('secret'); Object.assign(g,sampleContent()); const config=samplePuzzle(type);
 Object.assign(g.boards[0][0].clues[0],{kind:'group',groupMode:'time',puzzle:config});
 g.teams.forEach((t,ti)=>{for(let i=0;i<3;i++)g.players.push({id:`p${ti}${i}`,name:`p${ti}${i}`,teamId:t.id,tokenHash:hash(`p${ti}${i}`),active:true,selections:0});});
 const online=new Set(g.players.map(p=>p.id));
 const cmd=(type:string,payload:any={},at=0,actor:Actor={role:'host'})=>applyCommand(g,actor,{id:randomUUID(),type,payload},at,online);
 cmd('start');cmd('open-clue',{category:0,row:0}); const payload={attemptId:g.current!.id};cmd('start-group',payload,1000);
 const team=g.current!.group!.puzzle!.teams[g.teams[0].id]; const actor:Actor={role:'player',playerId:team.operator};
 return {g,config,team,actor,cmd,payload,online};
}
test('puzzle samples validate; missing or duplicate order is rejected',()=>{for(const type of ['bomb','code','timeline'] as const)assert.ok(puzzleReady(samplePuzzle(type)));const p=samplePuzzle('bomb');p.solution[1]=p.solution[0];assert.equal(puzzleReady(p),false);});
test('bomb defusal checks wire order, operator access and persisted progress',()=>{
 const f=setup('bomb'), {g,team,cmd,payload,actor,config}=f;
 const other=g.players.find(p=>p.teamId===g.teams[0].id&&p.id!==team.operator)!;
 assert.throws(()=>cmd('submit-puzzle',{...payload,item:config.solution[0]},1500,{role:'player',playerId:other.id}),/operator/);
 cmd('submit-puzzle',{...payload,item:config.solution[1]},2000,actor);assert.equal(team.mistakes,1);assert.equal(team.progress.length,0);
 config.solution.forEach((item,i)=>cmd('submit-puzzle',{...payload,item},3000+i*1000,actor));
 assert.equal(team.finishedMs,5000);assert.equal(validateGame(g).current!.group!.puzzle!.teams[g.teams[0].id].finishedMs,5000);
 assert.throws(()=>cmd('group-done',payload,7000,actor),/not accepting/);
 assert.throws(()=>cmd('unfinish-group',payload,7000,actor),/not accepting/);
 assert.throws(()=>cmd('submit-puzzle',{...payload,item:config.solution[0]},7000,actor),/already finished/);
});
test('private puzzle hints and solutions never leak to other players or display',()=>{
 const {g,online,actor,team}=setup('code');
 for(const role of [actor,{role:'display'} as Actor]) {
  const v=publicView(g,role,online,2000,null),p=v.boards[0][0].clues[0].puzzle!;
  assert.deepEqual(p.answers,[]);assert.deepEqual(p.hints,[]);assert.deepEqual(p.solution,[]);
  for(const state of Object.values(v.current!.group!.puzzle!.teams)) assert.ok(Object.keys(state.assignments).every(id=>id===role.playerId));
 }
 const own=publicView(g,actor,online,2000,null);assert.deepEqual(own.current!.group!.puzzle!.teams[g.teams[0].id].assignments[actor.playerId!],team.assignments[actor.playerId!]);
 assert.equal(publicView(g,{role:'host'},online,2000,null).boards[0][0].clues[0].puzzle!.answers[0],'ROSE');
});
test('Codebreakers counts wrong guesses and accepts normalized exact answers',()=>{
 const {cmd,team,payload,actor}=setup('code');cmd('submit-puzzle',{...payload,answer:'wrong'},2000,actor);assert.equal(team.mistakes,1);
 cmd('submit-puzzle',{...payload,answer:' rose '},3000,actor);assert.equal(team.finishedMs,2000);
});
test('Timelines locks out wrong orders for ten active seconds and preserves pause time',()=>{
 const {g,cmd,team,payload,actor,config}=setup('timeline');cmd('submit-puzzle',{...payload,order:[...config.solution].reverse()},2000,actor);
 assert.equal(team.mistakes,1);assert.throws(()=>cmd('submit-puzzle',{...payload,order:config.solution},11999,actor),/locked out/);
 pause(g,11999);cmd('resume',{},50000);
 cmd('submit-puzzle',{...payload,order:config.solution},50001,actor);assert.equal(team.finishedMs,11000);
});
test('host may transfer operator; ended activities reject further submissions',()=>{
 const {g,cmd,team,payload,actor}=setup('code');const target=g.players.find(p=>p.teamId===g.teams[0].id&&p.id!==actor.playerId)!;
 cmd('puzzle-operator',{...payload,teamId:target.teamId,playerId:target.id});assert.equal(team.operator,target.id);
 assert.throws(()=>cmd('submit-puzzle',{...payload,answer:'ROSE'},2000,actor),/operator/);
 cmd('lock-group',payload,3000);assert.throws(()=>cmd('submit-puzzle',{...payload,answer:'ROSE'},4000,{role:'player',playerId:target.id}),/not accepting/);
});

test('before start, puzzle views show instructions but no puzzle material or assignments',()=>{
 const {g,online}=setup('code');g.current!.group!.status='ready';delete g.current!.group!.puzzle;
 const q=g.boards[0][0].clues[0];q.prompt='Secret prompt';q.puzzle!.instructions='Discuss clues and submit as a team.';
 for(const actor of [{role:'display'} as Actor,{role:'player',playerId:g.players[0].id} as Actor]) {
  const view=publicView(g,actor,online,0,null),clue=view.boards[0][0].clues[0];
  assert.equal(clue.puzzle!.instructions,'Discuss clues and submit as a team.');assert.equal(clue.prompt,'');assert.equal(clue.puzzle!.message,'');assert.deepEqual(clue.puzzle!.items,[]);assert.deepEqual(clue.puzzle!.hints,[]);assert.deepEqual(clue.puzzle!.answers,[]);assert.equal(view.current!.group!.puzzle,undefined);
 }
});

test('undo end reopens activity without counting review time or losing puzzle progress',()=>{
 const {g,cmd,team,payload,actor}=setup('bomb');
 cmd('submit-puzzle',{...payload,item:'Blue ●'},2000,actor);cmd('lock-group',payload,3000);
 assert.throws(()=>cmd('undo-end-group',payload,4000,actor),/Only the host/);
 cmd('undo-end-group',payload,20000);
 assert.equal(g.current!.group!.status,'playing');assert.deepEqual(team.progress,['Blue ●']);assert.equal(g.current!.group!.elapsedMs,2000);
 cmd('submit-puzzle',{...payload,item:'Green ■'},21000,actor);assert.equal(g.current!.group!.elapsedMs,3000);
 assert.throws(()=>cmd('undo-end-group',payload,22000),/No ended/);
});

test('wrong bomb cuts enforce a one-second server lockout',()=>{
 const {cmd,team,payload,actor}=setup('bomb');cmd('submit-puzzle',{...payload,item:'Red ★'},2000,actor);
 assert.equal(team.lockedUntil,2000);assert.throws(()=>cmd('submit-puzzle',{...payload,item:'Blue ●'},2999,actor),/one second/);assert.equal(team.mistakes,1);
 cmd('submit-puzzle',{...payload,item:'Blue ●'},3000,actor);assert.deepEqual(team.progress,['Blue ●']);
});
test('positive activity awards transfer category selection to the awarded team',()=>{
 const {g,cmd,payload}=setup('code');cmd('lock-group',payload,2000);
 const team=g.teams.find(t=>t.id!==g.selectorTeamId)!;cmd('award-group',{...payload,teamId:team.id,points:100,reason:'Winner'},3000);assert.equal(g.selectorTeamId,team.id);
});
