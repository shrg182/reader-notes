import test from 'node:test';
import assert from 'node:assert/strict';
import {audience,audienceWithinSource,codePointSelection,anchorMatches,publicContent,validateContribution,validateSharingBackup,fromCloudDraft} from '../sharing-model.js';
const id='11111111-1111-4111-8111-111111111111',group='22222222-2222-4222-8222-222222222222';
const draft={id,kind:'pinyin',body:'zì',quote:'字',sourceId:null,localBookId:id,anchorStart:2,anchorEnd:3,sourceRevision:0,sourceHash:'',visibility:'private',groupIds:[]};
test('source permissions cap contribution audiences without changing private defaults',()=>{
  assert.deepEqual(audience(),{visibility:'private',groupIds:[]});
  assert.equal(audienceWithinSource(audience('public'),{visibility:'group',group_ids:[group]}),false);
  assert.equal(audienceWithinSource(audience('group',[group]),{visibility:'public',group_ids:[]}),true);
  assert.equal(audienceWithinSource(audience('group',[group]),{visibility:'group',group_ids:[id]}),false);
  assert.throws(()=>audience('group',[]));
});
test('Unicode selection uses PostgreSQL character offsets, not UTF-16 positions',()=>{
  const source={content:'A🙂字 B'},selection=codePointSelection(source.content,1,4);
  assert.deepEqual(selection,{quote:'🙂字',anchorStart:1,anchorEnd:3});
  assert.equal(anchorMatches(selection,source),true);assert.equal(anchorMatches(selection,{content:'A changed source'}),false);
});
test('passage anchors preserve original CRLF bytes despite textarea newline normalization',()=>{
  const source={content:'A\r\n🙂字\r\nB'},displayed=source.content.replace(/\r\n/g,'\n');
  const anchor=codePointSelection(source.content,displayed.indexOf('🙂'),displayed.length);
  assert.deepEqual(anchor,{quote:'🙂字\r\nB',anchorStart:3,anchorEnd:8});assert.equal(anchorMatches(anchor,source),true);
});
test('public book projection excludes notes, vocabulary, backups and history',()=>{
  assert.deepEqual(publicContent({title:'Book',language:'zh',content:'Text',notes:'secret',history:[{private:'yes'}],vocabulary:['secret']}),{title:'Book',language:'zh',content:'Text'});
});
test('contribution backup keeps owned drafts but never restores a live publication',()=>{
  const [clean]=validateSharingBackup({version:1,contributions:[{...draft,publication:{body:'Published text'},owner_id:'secret',cloudRevision:5}]},[id]);
  assert.equal('publication' in clean,false);assert.equal('owner_id' in clean,false);assert.equal('cloudRevision' in clean,false);
  assert.throws(()=>validateSharingBackup({version:1,contributions:[draft,draft]},[id]));
  assert.throws(()=>validateSharingBackup({version:1,contributions:[draft]},[]));
  assert.throws(()=>validateContribution({...draft,kind:'constructor'}));
});
test('saving a private draft leaves its published snapshot independent',()=>{
  const publication={body:'Old public explanation',visibility:'public',revision:1};
  const result=fromCloudDraft({id,source_id:group,kind:'annotation',body:'Private new edit',quote:'',anchor_start:null,anchor_end:null,source_revision:1,requested_visibility:'private',group_ids:[],revision:2},{publication});
  assert.equal(result.visibility,'private');assert.equal(result.body,'Private new edit');assert.deepEqual(result.publication,publication);
});
