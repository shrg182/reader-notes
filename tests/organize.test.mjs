import test from 'node:test';import assert from 'node:assert/strict';
import {arrangeRows,collectionChoices,suggestedCollection} from '../organize-model.js';
import {groupedBooks,articleRows} from '../library-groups.js';
import {safeSourceUrl} from '../rich-model.js';
const row=(id,p)=>({id,book:{id,placement:p},editions:[{id}]});
test('relative placement preserves natural chapters, linked order and missing references without dropping rows',()=>{
 const p=(side,anchor,time)=>({side,anchor_id:anchor,updated_at:time});const rows=[row('a'),row('b'),row('c',p('before','b','1')),row('d',p('after','c','2')),row('e',p('end',null,'3'))];assert.deepEqual(arrangeRows(rows).map(r=>r.id),['a','c','d','b','e']);
 assert.deepEqual(arrangeRows([row('a'),row('b',p('before','missing','1'))]).map(r=>r.id),['a','b']);assert.equal(arrangeRows([row('a',p('before','b','1')),row('b',p('before','a','2'))]).length,2);
 const aliased=row('chapter');aliased.editions.push({id:'saved'});assert.deepEqual(arrangeRows([aliased,row('new',p('before','saved','1'))]).map(r=>r.id),['new','chapter']);
});
test('collection placement groups imported articles with real collections and preserves source/saved identity',()=>{
 const books=[{id:'new',title:'New',categoryId:'chinese_classics',categoryTitle:'Classics',collectionId:'guwen_guanzhi',collectionTitle:'《古文观止》',placement:{side:'before',anchor_id:'old',updated_at:'1'}},{id:'old',title:'Old'},{id:'saved',title:'Old · saved edition'}];const meta=[{bookId:'old',sourcePath:'guwen_guanzhi/01/editor.html',edition:'Source edition'},{bookId:'saved',sourcePath:'guwen_guanzhi/01/editor.html'}];const groups=groupedBooks(books,meta);assert.equal(groups.length,1);assert.equal(groups[0].collection,'guwen_guanzhi');const rows=articleRows(groups[0].books,meta);assert.equal(rows.length,2);assert.equal(rows[0].book.id,'new');assert.equal(rows[1].editions.length,2);
 assert.ok(collectionChoices('chinese_classics').some(c=>c.id==='guwen_guanzhi'));assert.equal(suggestedCollection('驹支不屈于晋 - 《古文观止》','https://gwgz.5000yan.com/11814.html').id,'guwen_guanzhi');
});
test('source panel accepts public web URLs and rejects executable or credential-bearing links',()=>{
 assert.equal(safeSourceUrl('https://gwgz.5000yan.com/11814.html'),'https://gwgz.5000yan.com/11814.html');for(const url of ['javascript:alert(1)','data:text/html,hi','file:///etc/passwd','https://user:pass@example.com'])assert.equal(safeSourceUrl(url),'');
});
