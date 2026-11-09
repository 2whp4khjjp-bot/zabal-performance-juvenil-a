import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MatchRecord, Player } from '../types';
import { collectDiscipline, createDisciplinaryDocument } from './disciplinaryReport';
const player = { id:'p',name:'Jugador de prueba',number:2 } as Player;
const match = (index:number, yellowCards=1, redCards=0, expulsionYellowCards=0, suspensionServed=false) => ({id:String(index),date:`2026-10-${String(index).padStart(2,'0')}`,opponent:`J${index} - Rival`,minutes:[{playerId:'p',yellowCards,redCards,expulsionYellowCards,suspensionServed}]} as MatchRecord);
describe('Informe disciplinario móvil',()=>{
 it('excluye ciclos cerrados y las dos amarillas de una expulsión',()=>{
   const [row]=collectDiscipline([player],[match(1),match(2),match(3),match(4),match(5),match(6,0,0,0,true),match(7,2,1,2),match(8,0,0,0,true),match(9)]);
   expect(row.balance).toBe(1);expect(row.pending).toBe(0);expect(row.cycleEvents.map(e=>e.round)).toEqual(['9']);
 });
 it('mantiene una sanción pendiente al completar cinco',()=>{
   expect(collectDiscipline([player],Array.from({length:5},(_,i)=>match(i+1)))[0]).toMatchObject({balance:0,pending:1});
 });
 it('bloquea anotaciones legadas ambiguas',()=>expect(()=>collectDiscipline([player],[match(1,2,1,1)])).toThrow('Revisa'));
 it('solo incluye jugadores con amonestación',()=>expect(collectDiscipline([player],[match(1,0)])).toEqual([]));
 it('crea portada y cuatro jugadores por hoja',async()=>{
   const players=Array.from({length:5},(_,i)=>({...player,id:'p'+i,name:'Jugador '+i}));
   const game={...match(1),minutes:players.map(p=>({playerId:p.id,yellowCards:1}))} as MatchRecord;
   const doc=await createDisciplinaryDocument(players,[game]);
   expect(doc.getNumberOfPages()).toBe(3);
   if(process.env.PDF_QA) writeFileSync('/private/tmp/zabal-discipline-qa.pdf',Buffer.from(doc.output('arraybuffer')));
   expect(doc.output()).toContain('Raul Cote');
 });
});
