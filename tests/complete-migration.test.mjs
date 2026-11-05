import test from 'node:test';import assert from 'node:assert/strict';import {planBundle} from '../migration-library.js';import {digest} from '../migration-model.js';
import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';
test('complete migration preserves rich source, saved editions, library entries, suppressions, history and dictionary corrections',async()=>{
 const original='<section id="editor"><p>原文 <ruby>字<rt>zì</rt></ruby></p></section>';
 const data={archiveType:'study-studio-all-editing-records',archiveVersion:1,preferences:[],records:[
 {key:'a',value:{bodyHTML:'<p>Saved</p>',footnotes:[{text:'footnote'}]}},{key:'a-notes-v1',value:[{id:'keep',text:'visible'},{id:'gone',text:'deleted'}]},
 {key:'a-notes-v1-suppressed-v1',value:['gone']},{key:'a-log-v1',value:[{text:'older version'}]},
 {key:'reader-library',value:{entries:[{id:'nested',title:'Personal',bodyHTML:'<p>Personal text</p>'}]}},
 {key:'reading-lexicon-entry-overrides-v1',value:{'en\0word':{definition:'My correction'}}}]};
 const text=JSON.stringify(data);const b={format:'reader-notes-studio-bundle',version:1,catalog:[{key:'a',title:'A',path:'book/chapter/editor.html'}],sources:[{key:'a',title:'A',path:'book/chapter/editor.html',original,html:'<p>原文 <ruby>字<rt>zì</rt></ruby></p>',terms:[{term:'字'}],sha256:await digest(original)}],archives:[{name:'archive.json',text,sha256:await digest(text)}],dictionaries:[{name:'dictionary.csv',text:'term,language,definition\nword,en,base\n'},{name:'sources.csv',text:'term,source_target\nword,book/chapter/editor.html\n'}]};
 const p=await planBundle(b);assert.equal(p.summary.articles,3);assert.equal(p.summary.corrections,1);assert.equal(p.records.find(x=>x.kind==='archive').payload.text,text);
 const saved=p.records.find(x=>x.payload.sourceKey==='a'&&x.payload.edition==='Saved edition');assert.match(saved.book.notes,/visible/);assert.doesNotMatch(saved.book.notes,/deleted/);assert.equal(saved.payload.history.length,1);assert.equal(saved.payload.html,'<p>Saved</p>');
 assert.equal(p.records.find(x=>x.payload.edition==='Source edition').payload.terms[0].term,'字');assert.deepEqual((await planBundle(b)).records.map(x=>x.id),p.records.map(x=>x.id));
 b.sources[0].original+='tamper';await assert.rejects(()=>planBundle(b),/fingerprint mismatch/);
});
test('private durable imports are atomic, resumable, owner-bound and cannot overwrite working articles',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');`);
 for(const f of ['schema.sql','migration.sql','migration-categories.sql'])await db.exec(await readFile(new URL('../supabase/'+f,import.meta.url),'utf8'));
 const r={id:'11111111-1111-4111-8111-111111111111',kind:'edition',title:'Source',bookId:'11111111-1111-4111-8111-111111111111',fingerprint:'a'.repeat(64),payload:{encoding:'json-text-v1',data:JSON.stringify({html:'<ruby>字<rt>zì</rt></ruby>',overrides:{['en\0word']:{definition:'private'}},readingNoteSuppressed:['date\0paragraph'],path:'sunzi/chapter/editor.html',sourceKey:'sunzi-editor-v1'})},book:{id:'11111111-1111-4111-8111-111111111111',title:'Source',language:'zh',content:'字zì',notes:'private',deleted:false}};
 const send=()=>db.query('select public.reader_import_record($1::jsonb) as result',[JSON.stringify(r)]);
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',false)");
 assert.equal((await send()).rows[0].result.alreadyImported,false);assert.equal((await db.query('select source_path from reader_import_index')).rows[0].source_path,'sunzi/chapter/editor.html');assert.equal(JSON.parse((await db.query('select payload from reader_import_records')).rows[0].payload.data).overrides['en\0word'].definition,'private');assert.equal((await send()).rows[0].result.alreadyImported,true);
 await db.query("select public.save_reader_document($1,'Edited','zh','new text','private',false,1)",[r.bookId]);await send();assert.equal((await db.query('select content from reader_documents')).rows[0].content,'new text');
 r.fingerprint='b'.repeat(64);await assert.rejects(send,/source changed/);await assert.rejects(()=>db.exec("update reader_import_records set title='attack'"),/permission denied/);
 await db.query("select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',false)");assert.equal((await db.query('select * from reader_import_records')).rows.length,0);assert.equal((await db.query('select * from reader_import_index')).rows.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select * from reader_import_records'),/permission denied/);await assert.rejects(()=>db.query('select * from reader_import_index'),/permission denied/);await assert.rejects(send,/permission denied/);
 }finally{await db.close();}
});

import {classifyImport,groupedBooks} from '../library-groups.js';
test('Studio hierarchy groups source and saved editions by the original category and collection',()=>{
 const books=[{id:'a',title:'Source'},{id:'b',title:'Saved'},{id:'c',title:'Chapter'},{id:'d',title:'My own article'}];
 const groups=groupedBooks(books,[{bookId:'a',sourcePath:'sunzi/01/editor.html'},{bookId:'b',sourcePath:'sunzi/01/editor.html'},{bookId:'c',sourceKey:'jianshang:chapter_01:editor:v3'}]);
 assert.equal(groups[0].category,'chinese_classics');assert.equal(groups[0].collection,'sunzi');assert.equal(groups[0].books.length,2);assert.equal(groups[1].collection,'jianshang');assert.equal(groups[2].category,'personal');assert.equal(classifyImport({sourceKey:'reader-articles-studio-v1:entry:abc'}).category,'writing');
});
