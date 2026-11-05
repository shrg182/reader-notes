import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,effectivePreferences,validateStudy,PROVIDERS} from '../toolbar-model.js';
const id='11111111-1111-4111-8111-111111111111';
const entry={id,bookId:id,word:'слово',language:'ru',definition:'word',context:'A source passage',note:''};
test('book preferences override format and defaults without changing other formats',()=>{
  const defaults=preset('reading'),article=preset('study'),book=preset('editing');
  book.speech.visible=false;
  const profile={defaults,formats:{article},books:{[`${id}:article`]:book}};
  assert.equal(effectivePreferences(profile,'article',id).speech.visible,false);
  assert.equal(effectivePreferences(profile,'article','another').dictionary.expanded,true);
  assert.equal(effectivePreferences(profile,'pdf',id).navigate.expanded,true);
  delete profile.books[`${id}:article`];
  assert.equal(effectivePreferences(profile,'article',id).dictionary.expanded,true);
});
test('vocabulary import rejects orphaned sources, duplicate IDs and oversized fields',()=>{
  assert.deepEqual(validateStudy({version:1,vocabulary:[entry]},[id]),[entry]);
  assert.throws(()=>validateStudy({version:1,vocabulary:[entry]},[]));
  assert.throws(()=>validateStudy({version:1,vocabulary:[entry,entry]},[id]));
  assert.throws(()=>validateStudy({version:1,vocabulary:[{...entry,word:'x'.repeat(201)}]},[id]));
  assert.deepEqual(validateStudy(undefined,[id]),[]);
});
test('dictionary URLs encode selected words as data',()=>{
  const url=PROVIDERS.wiktionary.url('a/b?x=<script>');
  assert.equal(url,'https://en.wiktionary.org/wiki/a%2Fb%3Fx%3D%3Cscript%3E');
});
