import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyseTransition,resolveObligations} from './transition.js';
import {fixture,ok,id,identity} from './r13.fixture.js';
import {certifyPortfolioGraph} from '../validatedPortfolioGraph.js';
test('G13-01 Domain rules pure: context unchanged, unknown/accessor inputs rejected without invoking getters',()=>{
 const f=fixture(), graph=ok(certifyPortfolioGraph({source:'current',manifest:f.manifest,versions:f.versions}));
 const p=ok(analyseTransition(graph,graph.versions,{type:'DeleteLifecycle',target:identity('TeamSettings','ts-t1')})); assert.equal(p.obligations.length,1); assert.equal(p.changes.length,3); assert.equal(p.obligations[0]?.kind,'ConfirmRemoval'); assert.equal(p.desired.filter(v=>v.ref.kind==='TeamActual').length,4); assert.equal(graph.versions.filter(v=>v.ref.kind==='TeamActual').length,8);
 const c={type:'RenameProject',projectId:id('ProjectId','p')}; Object.defineProperty(c,'name',{enumerable:true,get(){throw new Error('getter executed');}}); assert.equal(analyseTransition(graph,graph.versions,c).ok,false); assert.equal(resolveObligations(p,[]).ok,false);
 assert.equal(analyseTransition(graph,graph.versions,{type:'arbitrary-patch',manifest:{}}).ok,false);
});
