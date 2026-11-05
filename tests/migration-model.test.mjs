import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectData,inspectFiles,parseCsv,digest,canonical,legacyId,migrationReport,plainText} from '../migration-model.js';
const key='sunzi-6-editor-v1';
const state={bodyHTML:'<h1>原文</h1><p>Русский &amp; English</p><script>bad()</script>',savedAt:'2026-11-01',footnotes:[{id:'f1',text:'Footnote'}]};
const archive=(value=state)=>({archiveType:'study-studio-all-editing-records',archiveVersion:1,records:[{key,format:'json',value},{key:key+'-notes-v1',format:'json',value:[{id:'n1',text:'Current note'}]}],preferences:[]});
const file=(data,name='archive.json')=>new File([JSON.stringify(data)],name,{type:'application/json'});
test('inventory preserves notes/provenance and keeps HTML inert',async()=>{
  const result=await inspectData(archive());
  const item=result.items.find(item=>item.book);
  assert.match(item.book.content,/原文\nРусский & English/);
  assert.doesNotMatch(item.book.content,/bad\(\)|<script>/);
  assert.match(item.book.notes,/Current note/);assert.match(item.book.notes,/Footnote/);
  assert.equal(item.book.id,await legacyId(key));
});
test('independent deletion records prevent removed notes from reappearing',async()=>{
  const input=archive();input.records.push({key:key+'-notes-v1-suppressed-v1',format:'json',value:['n1']});
  const result=await inspectData(input);assert.doesNotMatch(result.items[0].book.notes,/Current note/);
});
test('portable fingerprints are checked before generating trial copies',async()=>{
  const normalized={[key]:{...state}};delete normalized[key].savedAt;
  const pack={schema:'study-studio-portable-v1',records:{[key]:{revision:'r1',ancestors:[],role:'primary',author:'fixture',updatedAt:'2026-11-01T00:00:00Z',hash:await digest(canonical(normalized)),value:{[key]:JSON.stringify(state)}}}};
  assert.equal((await inspectData(pack)).items[0].kind,'article');
  pack.records[key].value[key]=JSON.stringify({...state,bodyHTML:'Changed'});
  await assert.rejects(()=>inspectData(pack),/fingerprint/);
});
test('source variants conflict and imports keep existing destination edits',async()=>{
  const files=[file(archive(),'a.json'),file(archive({...state,bodyHTML:'Different'}),'b.json')];
  const plan=await inspectFiles(files);assert.deepEqual(plan.candidates.map(item=>item.status),['source conflict','source conflict']);
  const existing={...plan.candidates[0].book,content:'My newer edit'};
  const repeated=await inspectFiles([files[0]],[existing]);assert.equal(repeated.candidates[0].status,'destination conflict');
  const exact=await inspectFiles([files[0]],[plan.candidates[0].book]);assert.equal(exact.candidates[0].status,'already imported');
});
test('save timestamps alone do not manufacture source conflicts',async()=>{
  const plan=await inspectFiles([file(archive(),'a.json'),file(archive({...state,savedAt:'2026-11-05'}),'b.json')]);
  assert.deepEqual(plan.candidates.map(item=>item.status),['ready','duplicate']);
});
test('older paginated chapter revisions share an identity and require a version choice',async()=>{
  const input={archiveType:'study-studio-all-editing-records',archiveVersion:1,preferences:[],records:[
    {key:'jianshang:chapter_03:editor:v2',format:'json',value:{texts:{'1':'Old chapter'}}},
    {key:'jianshang:chapter_03:editor:v4',format:'json',value:{texts:{'1':'New chapter'}}}
  ]};
  const plan=await inspectFiles([file(input)]);
  assert.equal(plan.summary.distinctArticles,1);
  assert.equal(plan.candidates[0].book.id,plan.candidates[1].book.id);
  assert.deepEqual(plan.candidates.map(item=>item.status),['source conflict','source conflict']);
});
test('dictionary CSV retains quoted multiline records and distinct occurrences',async()=>{
  const csv='term,language,definition\r\n"词,语",zh,"First\nsecond"\r\nслово,ru,"word"\r\n';
  assert.equal(parseCsv(csv)[0].definition,'First\nsecond');
  const plan=await inspectFiles([new File([csv],'dictionary.csv')]);assert.equal(plan.summary.dictionaryEntries,2);assert.equal(plan.candidates.length,0);
  assert.throws(()=>parseCsv('term,term\na,b'),/distinct/);
});
test('unknown schemas are reported and originals stay available without copying raw secrets to the report',async()=>{
  const input=archive();input.records.push({key:'sb-project-auth-token',format:'json',value:{access_token:'do-not-export-in-report'}});
  const plan=await inspectFiles([file(input),file({schema:'future-version'},'future.json')]);
  assert.equal(plan.sources[1].error.includes('Unrecognized'),true);
  assert.equal(plan.items.at(-1).kind,'excluded settings');
  assert.equal(JSON.stringify(migrationReport(plan)).includes('do-not-export-in-report'),false);
  assert.equal(plan.sources[0].file.size,file(input).size);
});
test('JavaScript exports are parsed as data and never executed',async()=>{
  const script='window.ReadingReviewCatalog=[{"key":"sunzi-6-editor-v1","title":"Trial title","path":"sunzi/editor.html"}];';
  const plan=await inspectFiles([new File([script],'reading-review-catalog.js'),file(archive())]);
  assert.equal(plan.candidates[0].title,'Trial title');
  const bad=await inspectFiles([new File(['window.DICTIONARY_ENTRIES=[]; globalThis.compromised=true;'],'dictionary.js')]);
  assert.ok(bad.sources[0].error);assert.equal(globalThis.compromised,undefined);
  assert.equal(plainText('<img src="https://invalid.example/">Safe'),'Safe');
});
test('asset paths identify missing files without fetching or exposing signed query strings',async()=>{
  const source=archive({...state,bodyHTML:'<p>Article</p><img src="media/image.png?token=do-not-copy"><img src="media/missing.jpg">'});
  const plan=await inspectFiles([file(source),new File(['image bytes'],'image.png')]);
  assert.equal(plan.summary.unmatchedAssets,1);
  assert.deepEqual(plan.candidates[0].assetMatches[0].candidateFiles,['image.png']);
  assert.equal(JSON.stringify(migrationReport(plan)).includes('do-not-copy'),false);
});
