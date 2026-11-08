import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {validatePdf,pdfFingerprint,pdfBook,safeUploadUrl,PDF_MAX_BYTES,PDF_DEVICE_MAX_BYTES,pdfDeviceIdentity} from '../pdf-library-model.js';
import {groupedBooks} from '../library-groups.js';
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',ID='11111111-1111-4111-8111-111111111111';
test('PDF validation, resume identity and category grouping preserve the selected file and library identity',async()=>{
 const file=new File(['%PDF-1.7\nexample'],'example.pdf',{type:'application/pdf'});assert.equal(await validatePdf(file),file);assert.match(await pdfFingerprint(file),/^[a-f0-9]{64}$/);assert.match(await pdfDeviceIdentity(file),/^[a-f0-9]{64}$/);
 const large={size:125*1024*1024,slice:(begin,end)=>new Blob(['%PDF-1.7']).slice(begin,end)};assert.equal(await validatePdf(large,{device:true}),large);await assert.rejects(()=>validatePdf(large),/50 MB/);await assert.rejects(()=>validatePdf({size:PDF_DEVICE_MAX_BYTES+1},{device:true}),/150 MB/);
 await assert.rejects(()=>validatePdf(new File(['fake'],'fake.pdf')),/not a PDF/);await assert.rejects(()=>validatePdf({size:PDF_MAX_BYTES+1}),/50 MB/);
 assert.equal(safeUploadUrl('/storage/v1/upload/resumable/test','https://project.supabase.co'),'https://project.supabase.co/storage/v1/upload/resumable/test');assert.throws(()=>safeUploadUrl('https://evil.invalid/upload','https://project.supabase.co'),/Invalid upload/);
 const book=pdfBook({id:ID,title:'PDF',category_id:'custom',status:'ready',deleted:false},[{id:'custom',title:'My category'}]);const groups=groupedBooks([book],[]);assert.equal(groups[0].categoryTitle,'My category');assert.equal(groups[0].books[0].id,ID);
});
test('PDF database binds files/categories to owners, validates completion, handles trash and cannot resurrect purged records',async()=>{
 const db=new PGlite();const sql=async(query,args=[])=>{const result=await db.query(query,args);return result.rows[0]?.result;};
 const as=async uid=>{await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);};
 const change=(revision,action,patch={})=>sql('select reader_change_pdf($1,$2,$3,$4) result',[ID,revision,action,JSON.stringify(patch)]);
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
  create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text,metadata jsonb,primary key(bucket_id,name));alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete,update on storage.objects to authenticated;`);
  await db.query('insert into auth.users values($1),($2)',[A,B]);await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/pdf-library.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/pdf-free-plan.sql',import.meta.url),'utf8'));
  await as(A);await sql("select reader_save_category('personal','My reading materials') result");
  await db.exec('reset role');assert.equal((await db.query("select file_size_limit from storage.buckets where id='reader-pdfs'")).rows[0].file_size_limit,52428800);await as(A);
  await sql("select reader_reserve_pdf('22222222-2222-4222-8222-222222222222','Boundary','personal','boundary.pdf',52428800,$1) result",['b'.repeat(64)]);
  await assert.rejects(()=>sql("select reader_reserve_pdf('33333333-3333-4333-8333-333333333333','Too large','personal','large.pdf',52428801,$1) result",['c'.repeat(64)]),/check constraint/);
  await sql("select save_reader_document($1,'Text article','','body','',false,0) result",[ID]);await sql("select reader_set_document_category($1,'personal') result",[ID]);assert.equal((await db.query('select category_id from reader_document_categories')).rows[0].category_id,'personal');
  const record=await sql('select reader_reserve_pdf($1,\'Book\',\'personal\',\'book.pdf\',12,$2) result',[ID,'a'.repeat(64)]);assert.equal(record.object_path,A+'/'+ID+'.pdf');
  await assert.rejects(()=>change(1,'finish_upload'),/incomplete/);await assert.rejects(()=>change(1,'update',{notes:'not ready'}),/Restore/);
  await db.query('insert into storage.objects values(\'reader-pdfs\',$1,$2)',[record.object_path,JSON.stringify({size:12})]);assert.equal((await change(1,'finish_upload')).status,'ready');
  assert.equal((await sql("select reader_change_pdf($1,2,'update','{\"notes\":\"private\",\"last_page\":5,\"completed\":true}') result",[ID])).notes,'private');
  await assert.rejects(()=>change(2,'trash'),/another device/);await assert.rejects(()=>change(3,'begin_delete'),/trash first/);
  // A ready file cannot be overwritten or deleted even by its owner.
  assert.equal((await db.query('delete from storage.objects returning *')).rows.length,0);assert.equal((await db.query("update storage.objects set metadata='{}' returning *")).rows.length,0);
  await as(B);assert.equal((await db.query('select * from reader_pdfs')).rows.length,0);assert.equal((await db.query('select * from reader_categories')).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
  await assert.rejects(()=>change(3,'trash'),/unavailable/);await assert.rejects(()=>sql("select reader_set_document_category($1,'personal') result",[ID]),/Sync this article/);await assert.rejects(()=>sql("select reader_reserve_pdf($1,'Stolen','personal','x.pdf',12,$2) result",[ID,'a'.repeat(64)]),/foreign key/);
  await assert.rejects(()=>db.query('insert into storage.objects values(\'reader-pdfs\',$1,\'{}\')',[A+'/different.pdf']),/row-level security/);
  await as(A);assert.equal((await change(3,'trash')).deleted,true);assert.equal((await change(4,'restore')).deleted,false);assert.equal((await change(5,'trash')).deleted,true);
  assert.equal((await change(6,'begin_delete')).status,'deleting');await assert.rejects(()=>change(7,'restore'),/completed uploads/);await assert.rejects(()=>change(7,'finish_delete'),/Remove the stored file/);
  assert.equal((await db.query('delete from storage.objects returning *')).rows.length,1);const purged=await change(7,'finish_delete');assert.equal(purged.status,'purged');assert.equal(purged.notes,'');assert.equal(purged.filename,'');assert.equal(purged.title,'Deleted PDF');await assert.rejects(()=>change(8,'restore'),/permanently deleted/);
  await assert.rejects(()=>sql("select reader_reserve_pdf($1,'Resurrect','personal','x.pdf',12,$2) result",[ID,'a'.repeat(64)]),/unavailable/);
  await assert.rejects(()=>db.query("update reader_pdfs set status='ready'"),/permission denied/);
  await db.exec('reset role;set role anon');await assert.rejects(()=>change(8,'restore'),/permission denied/);await assert.rejects(()=>db.query('select * from reader_pdfs'),/permission denied/);
 }finally{await db.close();}
});
