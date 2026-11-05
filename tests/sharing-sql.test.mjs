import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('sharing policies isolate drafts, enforce source audiences, and preserve the original edition',async()=>{
  const db=new PGlite();
  const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const doc='11111111-1111-4111-8111-111111111111',note='22222222-2222-4222-8222-222222222222',privateNote='33333333-3333-4333-8333-333333333333';
  async function asUser(id,operation,role='authenticated'){
    await db.exec(`set role ${role}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
    try{return await operation();}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");}
  }
  const scalar=async(sql,args=[])=> (await db.query(sql,args)).rows[0].result;
  const saveDoc=async(text='A🙂字 B',deleted=false,revision=0)=>scalar('select public.save_reader_document($1,\'Public source\',\'en\',$2,\'DO NOT PUBLISH PERSONAL NOTES\',$3,$4) as result',[doc,text,deleted,revision]);
  const publish=async(visibility='public',groups='{}',revision=0,sourceRevision=1)=>scalar('select public.reader_publish_book($1,$2,$3,$4::uuid[],$5) as result',[doc,sourceRevision,visibility,groups,revision]);
  const saveNote=async(id,source,body,visibility='private',groups='{}',revision=0,sourceRevision=1,start=1,end=3)=>scalar("select public.reader_save_contribution($1,$2,'annotation',$3,'🙂字',$4,$5,$6,$7,$8::uuid[],$9) as result",[id,source,body,start,end,sourceRevision,visibility,groups,revision]);
  const shareNote=async(id,draftRevision=1,revision=0)=>scalar('select public.reader_publish_contribution($1,$2,$3) as result',[id,draftRevision,revision]);
  try{
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;`);
    await db.query('insert into auth.users(id) values($1),($2),($3)',[A,B,C]);
    await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/sharing.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/sharing-verify.sql',import.meta.url),'utf8'));
    const publication=await asUser(A,async()=>{await saveDoc();return (await publish()).publication;});
    assert.equal(publication.content,'A🙂字 B');assert.equal('notes' in publication,false);
    await asUser(null,async()=>{
      assert.equal((await db.query('select * from public.reader_publications')).rows.length,1);
      assert.equal(JSON.stringify((await db.query('select * from public.reader_publications')).rows).includes('DO NOT PUBLISH'),false);
      await assert.rejects(()=>db.query('select * from public.reader_documents'),/permission denied/);
      await assert.rejects(()=>db.query('select * from public.reader_contribution_drafts'),/permission denied/);
      await assert.rejects(()=>db.query("update public.reader_publications set content='attack'"),/permission denied/);
    },'anon');
    await asUser(B,async()=>{
      assert.equal((await db.query('select * from public.reader_documents')).rows.length,0);
      await saveNote(privateNote,publication.id,'My private pinyin');
      await saveNote(note,publication.id,'Public explanation','public');
      await shareNote(note);
      // Changing a draft is never a public publication operation.
      await saveNote(note,publication.id,'New private working edit','private','{}',1);
      assert.equal((await db.query('select body from public.reader_contribution_drafts where id=$1',[note])).rows[0].body,'New private working edit');
      await assert.rejects(()=>shareNote(note,1,1),/Draft changed/);
      await assert.rejects(()=>publish(),/Source document unavailable/);
    });
    await asUser(null,async()=>{
      const visible=(await db.query('select body from public.reader_shared_contributions')).rows;
      assert.deepEqual(visible,[{body:'Public explanation'}]);
      await assert.rejects(()=>db.query('select * from public.reader_contribution_versions'),/permission denied/);
      await assert.rejects(()=>db.query("select public.reader_create_group('x','y')"),/permission denied/);
    },'anon');
    await asUser(C,async()=>{
      await assert.rejects(()=>saveNote(note,publication.id,'overwrite someone else'),/another reader/);
    });
    const group=await asUser(A,()=>scalar("select public.reader_create_group('Reading friends','Organizer') as result"));
    const invite=await asUser(A,()=>scalar('select public.reader_invite_group($1) as result',[group.id]));
    await asUser(B,()=>scalar("select public.reader_join_group($1,'Friend B') as result",[invite.code]));
    const ownGroup=await asUser(B,()=>scalar("select public.reader_create_group('Other group','B') as result"));
    const groupSource=await asUser(A,()=>publish('group',`{${group.id}}`,1));
    assert.equal(groupSource.publication.visibility,'group');
    await asUser(null,async()=>assert.equal((await db.query('select * from public.reader_publications')).rows.length,0),'anon');
    await asUser(C,async()=>{
      assert.equal((await db.query('select * from public.reader_publications')).rows.length,0);
      assert.equal((await db.query('select * from public.reader_groups')).rows.length,0);
    });
    await asUser(B,async()=>{
      await saveNote(note,publication.id,'Too broad','public','{}',2,2);
      await assert.rejects(()=>shareNote(note,3,1),/exceeds source audience/);
      await saveNote(note,publication.id,'Wrong group','group',`{${ownGroup.id}}`,3,2);
      await assert.rejects(()=>shareNote(note,4,1),/exceeds source audience/);
      await saveNote(note,publication.id,'Friends explanation','group',`{${group.id}}`,4,2);
      await shareNote(note,5,1);
    });
    await asUser(A,async()=>{
      const visible=(await db.query('select body from public.reader_shared_contributions')).rows;
      assert.deepEqual(visible,[{body:'Friends explanation'}]);
      assert.equal((await db.query('select * from public.reader_contribution_drafts')).rows.length,0,'Source owner does not own readers’ private notes');
      await db.query('select public.reader_revoke_invites($1)',[group.id]);
      await db.query('select public.reader_remove_member($1,$2)',[group.id,B]);
    });
    await asUser(C,async()=>await assert.rejects(()=>scalar("select public.reader_join_group($1,'C') as result",[invite.code]),/invalid or expired/));
    await asUser(B,async()=>{
      assert.equal((await db.query('select * from public.reader_publications')).rows.length,0,'Removed members lose source access');
      assert.equal((await db.query('select * from public.reader_contribution_drafts')).rows.length,2,'Their own private notes remain theirs');
      await assert.rejects(()=>saveNote(note,publication.id,'Try sharing after removal','public','{}',5,2),/Source unavailable/);
      await saveNote(note,publication.id,'Private after removal','private','{}',5,2);
      await shareNote(note,6,2);
    });
    // Public source restored deliberately; old note anchors must not silently rebase.
    await asUser(A,()=>publish('public','{}',2));
    await asUser(B,async()=>{
      await saveNote(note,publication.id,'Bad anchor','public','{}',6,3,0,2);
      await assert.rejects(()=>shareNote(note,7,3),/anchor no longer matches/);
      await saveNote(note,publication.id,'Correct Unicode anchor','public','{}',7,3);
      await shareNote(note,8,3);
    });
    await asUser(A,async()=>{
      await saveDoc('Updated source',false,1);await publish('public','{}',3,2);
    });
    await asUser(B,()=>assert.rejects(()=>shareNote(note,8,4),/Source edition changed/));
    await asUser(A,async()=>{
      assert.equal((await db.query('select content from public.reader_documents')).rows[0].content,'Updated source','Contributions never replace the source');
      assert.equal((await db.query('select notes from public.reader_documents')).rows[0].notes,'DO NOT PUBLISH PERSONAL NOTES');
      await saveDoc('Updated source',true,2);
    });
    await asUser(null,async()=>{
      assert.equal((await db.query('select * from public.reader_publications')).rows.length,0);
      assert.equal((await db.query('select * from public.reader_shared_contributions')).rows.length,0);
    },'anon');
    await asUser(A,async()=>{await saveDoc('Updated source',false,3);assert.equal((await db.query('select visibility from public.reader_publications')).rows[0].visibility,'private','Restoring trash must not republish');});
    await db.query('delete from auth.users where id=$1',[A]);
    await asUser(B,async()=>{
      assert.equal((await db.query('select * from public.reader_contribution_drafts')).rows.length,2,'Source-owner deletion must not delete another reader’s notes');
      await saveNote(note,publication.id,'My preserved private note','private','{}',8,3);
      assert.equal((await shareNote(note,9,0)).publication,null,'Withdrawing an orphan note never creates a public orphan');
    });
    const crlfSource=await asUser(C,async()=>{await saveDoc('A\r\n🙂字\r\nB');return (await publish()).publication;});
    await asUser(B,async()=>{
      const id='44444444-4444-4444-8444-444444444444';
      await scalar("select public.reader_save_contribution($1,$2,'pinyin','Unicode note',$3,3,8,1,'public','{}',0) as result",[id,crlfSource.id,'🙂字\r\nB']);
      assert.equal((await shareNote(id)).publication.quote,'🙂字\r\nB','Stored source line endings match PostgreSQL anchors');
    });
  }finally{await db.close();}
});
