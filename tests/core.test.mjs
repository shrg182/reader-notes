import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBackup,makeBackup,mergeRemote} from '../core.js';
const book={id:'11111111-1111-4111-8111-111111111111',title:'中文 · Русский',language:'Multilingual',content:'原文\nТекст',notes:'Study',deleted:false,revision:3};
test('backup preserves multilingual text but excludes session and sync metadata',()=>{
  const backup=makeBackup([{...book,access_token:'secret',dirty:true,scope:'account:test'}]);
  assert.equal(backup.format,'reader-notes');
  assert.equal(JSON.stringify(backup).includes('secret'),false);
  assert.deepEqual(validateBackup({...backup,format:'reader-studio'}),validateBackup(backup));
  assert.deepEqual(validateBackup(backup),[{id:book.id,title:book.title,language:book.language,content:book.content,notes:book.notes,deleted:false}]);
});
test('rejects duplicates, unsupported formats, and invalid text before import',()=>{
  assert.throws(()=>validateBackup({format:'other',version:1,books:[]}));
  assert.throws(()=>validateBackup({format:'reader-studio',version:1,books:[book,book]}));
  assert.throws(()=>validateBackup({format:'reader-studio',version:1,books:[{...book,content:42}]}));
});
test('remote change preserves offline draft and exposes a conflict',()=>{
  const draft={...book,content:'Offline',dirty:true};
  const result=mergeRemote(draft,{...book,content:'Other device',revision:4});
  assert.equal(result.content,'Offline');assert.equal(result.revision,3);
  assert.equal(result.conflict.content,'Other device');
});
test('unchanged remote base leaves queued local edition intact',()=>{
  const draft={...book,dirty:true};assert.equal(mergeRemote(draft,book),draft);
});
test('cloud tombstone replaces a clean edition; dirty editions conflict',()=>{
  const remote={...book,deleted:true,revision:4};
  assert.equal(mergeRemote({...book,dirty:false},remote).deleted,true);
  assert.equal(mergeRemote({...book,dirty:true},remote).deleted,false);
  assert.equal(mergeRemote(undefined,remote).revision,4);
});
