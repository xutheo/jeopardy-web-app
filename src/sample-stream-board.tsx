import React from 'react';
import { money } from '../shared/model';

// Sample of the streamed board, using the same board and team-score styles.
export function SampleStreamBoard() {
  return <figure className="home-stream-preview" aria-label="Sample fullscreen game board with six categories and team scores"><div className="sample-stream-screen"><div className="stream-board">{['Around the World', 'Science Lab', 'At the Movies', 'History Class', 'Team Questions', 'Team Challenges'].map(title => <section className="stream-column" key={title}><h2>{title}</h2>{[100, 200, 300, 400, 500].map(value => <div className="stream-tile" key={value}>{value}</div>)}</section>)}</div><div className="sample-stream-scores">{[{ name: 'Qoobsters', score: 1200, players: 'Ada · Sam · Alex' }, { name: 'Qooblings', score: 900, players: 'Jo · Max · Riley' }, { name: 'Qooblets', score: 700, players: 'Kai · Mia · Lee' }].map((team, i) => <div key={team.name} className={i === 0 ? 'selecting-team' : ''}><div><span>{team.name}</span><strong>{money(team.score)}</strong></div><small>{team.players}</small>{i === 0 && <b>SELECTS NEXT</b>}</div>)}</div></div></figure>;
}
