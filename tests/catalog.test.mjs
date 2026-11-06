import test from 'node:test';
import assert from 'node:assert/strict';
import {articleRows,catalogTitle} from '../library-groups.js';
test('catalog groups source and saved editions by identity without dropping editions or merging matching titles',()=>{
 const books=[{id:'source',title:'Original'},{id:'saved',title:'Original · saved edition'},{id:'other',title:'Original'}];
 const meta=[{bookId:'source',sourceKey:'same',sourcePath:'rongzhai_suibi/volume_01/001/editor.html',edition:'Source edition'},{bookId:'saved',sourceKey:'same',sourcePath:'rongzhai_suibi/volume_01/001/editor.html',edition:'Saved edition'}];
 const rows=articleRows(books,meta);assert.equal(rows.length,2);const row=rows.find(r=>r.editions.length===2);assert.equal(row.book.id,'saved');assert.equal(row.title,'Original');assert.equal(rows.flatMap(r=>r.editions).length,3);
});
test('historical chapter versions group together, numeric chapter ordering and personal entry identities stay intact',()=>{
 const keys=['jianshang:chapter_02:editor:v1','jianshang:chapter_02:editor:v3:hash','jianshang:chapter_10:editor:v2','library:entry:one','library:entry:two'];
 const books=keys.map((id)=>({id,title:'Same title'}));const rows=articleRows(books,keys.map(key=>({bookId:key,sourceKey:key})));
 assert.equal(rows.length,4);assert.equal(rows.find(r=>r.path.includes('chapter_02')).editions.length,2);assert.ok(rows.findIndex(r=>r.path.includes('chapter_02'))<rows.findIndex(r=>r.path.includes('chapter_10')));
});

test('catalog shortens repeated book prefixes without changing chapter numbers or unrelated titles',()=>{
 assert.equal(catalogTitle('《孙子兵法·始计篇第一》','《孙子兵法》'),'始计篇第一');
 assert.equal(catalogTitle('《容斋随笔·唐《平蛮碑》》','《容斋随笔》'),'唐《平蛮碑》');
 assert.equal(catalogTitle('Book: Chapter 01','Book'),'Chapter 01');
 assert.equal(catalogTitle('Bookkeeping','Book'),'Bookkeeping');
 assert.equal(catalogTitle('Book','Book'),'Book');
 assert.equal(catalogTitle('Other title','Book'),'Other title');
});
