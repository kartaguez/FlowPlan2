import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
test('G13-01/02/12 synchronous execute uses the real certification factory before publication; no async pipeline',async()=>{
 const code=await readFile(new URL('../../src-v2/application/portfolio/transitions/session.ts',import.meta.url),'utf8'), ast=ts.createSourceFile('session.ts',code,ts.ScriptTarget.Latest,true);
 let execute;
 function find(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='execute')execute=n;ts.forEachChild(n,find);}find(ast);assert.ok(execute);
 let awaits=0,certifies=0,publishes=0;
 function check(n){if(ts.isAwaitExpression(n))awaits++;if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='certifyPortfolioGraph')certifies++;if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='publish')publishes++;ts.forEachChild(n,check);}check(execute);
 assert.equal(awaits,0);assert.equal(certifies,1);assert.equal(publishes,1);
 assert.ok(code.indexOf("stage = 'certification'")<code.indexOf('store.publish(view)'));assert.ok(code.indexOf("stage = 'stale'")<code.indexOf("stage = 'answers'"));
 assert.ok(!/as\s+(?:unknown\s+as\s+)?ValidatedPortfolioGraph/.test(code));
});
