const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=http.createServer(async(req,res)=>{
  try{
    const filename=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
    if(!filename.startsWith(root+path.sep))throw Error('bad path');
    res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');
    if(filename===path.join(root,'config.js')){res.end('window.READER_CONFIG={richEditorEnabled:false};');return;}
    res.end(await fs.readFile(filename));
  }catch{res.writeHead(404);res.end('Not found');}
});
const errors=[];
function referencePdf(){
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Contents 4 0 R >>','<< /Length 0 >>\nstream\n\nendstream'];
  let text='%PDF-1.4\n';const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(text));text+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=Buffer.byteLength(text);text+='xref\n0 5\n0000000000 65535 f \n';
  for(const offset of offsets.slice(1))text+=String(offset).padStart(10,'0')+' 00000 n \n';
  return Buffer.from(text+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
}
let browser;
(async()=>{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:'chrome',headless:true});
  const local=await browser.newContext();const page=await local.newPage();
  local.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.locator('#new-book').waitFor();
  await page.locator('#new-book').click();
  await page.locator('#title').fill('中文 · Русский');
  await page.locator('#content').fill('Original text\n原文\nРусский');
  await page.locator('#notes').fill('First observation');
  await page.waitForTimeout(900);
  assert.equal(await page.locator('#notes').evaluate(el=>document.activeElement===el),true,'Autosave must preserve typing focus');
  await page.locator('#save').click();
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved on this device');
  await page.locator('[data-block=contributions] .block-toggle').click();
  await page.locator('#item-sharing').click();
  await page.waitForFunction(()=>document.querySelector('#sharing-dialog').open&&!document.querySelector('#save-contribution').disabled);
  await page.locator('#contribution-kind').selectOption('pinyin');
  await page.locator('#shared-source-text').evaluate(area=>{const start=area.value.indexOf('原文');area.setSelectionRange(start,start+2);});
  await page.locator('#capture-passage').click();await page.locator('#contribution-body').fill('yuán wén');
  await page.locator('#contribution-audience').selectOption('public');
  await page.locator('#save-contribution').click();
  await page.waitForFunction(()=>document.querySelector('#sharing-status').textContent.includes('Private working draft saved on this device'));
  assert.match(await page.locator('#contribution-list').textContent(),/Private working draft — not published/);
  await page.locator('#review-contribution').click();
  await page.locator('#publish-dialog').waitFor({state:'visible'});
  assert.equal(await page.getByRole('button',{name:'Publish this contribution',exact:true}).isDisabled(),true,'Unconfigured sharing never claims live publication');
  await page.locator('#publish-dialog .dialog-heading button').click();await page.locator('#close-sharing').click();
  assert.equal(await page.locator('#notes').inputValue(),'First observation','Contribution visibility never changes legacy private notes');
  // Selection lookup opens the dictionary independently of toolbar collapse.
  await page.locator('#content').evaluate(el=>{el.setSelectionRange(0,8);el.dispatchEvent(new Event('select'));});
  await page.locator('#selection-lookup').click();
  assert.equal(await page.locator('#dictionary-word').inputValue(),'Original');
  assert.match(await page.locator('#dictionary-links a').first().getAttribute('href'),/wiktionary.org\/wiki\/Original$/);
  await page.locator('#word-editor summary').click();
  await page.locator('#word-definition').fill('The first form of something');
  await page.locator('#save-word').click();
  await page.waitForFunction(()=>document.querySelector('#vocabulary-status').textContent.includes('Word saved'));
  await page.locator('#vocabulary-review summary').click();
  assert.match(await page.locator('#vocabulary-list').textContent(),/Original/);
  await page.locator('[data-block=dictionary] .block-pin').click();
  await page.locator('#reading-mode').click();assert.equal(await page.locator('#tool-blocks').isVisible(),false);
  await page.locator('#reading-mode').click();assert.equal(await page.locator('#block-dictionary').isVisible(),true);
  await page.locator('.header-tool-settings summary').click();await page.locator('#customize-tools').click();
  await page.locator('#block-options').getByLabel('Read aloud',{exact:true}).uncheck();
  await page.locator('#save-tool-settings').click();
  await page.waitForFunction(()=>!document.querySelector('#tools-dialog').open);
  assert.equal(await page.locator('[data-block=speech]').isVisible(),false);
  await page.locator('#pdf-file').setInputFiles({name:'reference.pdf',mimeType:'application/pdf',buffer:referencePdf()});
  await page.waitForFunction(()=>!document.querySelector('#reference').hidden);
  await page.reload();await page.locator('.article-title').click();
  await page.waitForFunction(()=>!document.querySelector('#reference').hidden);
  assert.equal(await page.locator('#pdf-name').textContent(),'reference.pdf');
  assert.equal(await page.locator('[data-block=dictionary] .block-pin').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-block=speech]').isVisible(),false);
  if(await page.locator('[data-block=view] .block-toggle').getAttribute('aria-expanded')==='false')await page.locator('[data-block=view] .block-toggle').click();
  await page.locator('#tool-target').selectOption('pdf');
  await page.waitForFunction(()=>document.querySelector('#find-query').disabled);
  assert.match(await page.locator('#navigation-hint').textContent(),/PDF viewer/);
  await page.locator('#tool-target').selectOption('article');
  await page.waitForFunction(()=>!document.querySelector('#find-query').disabled);
  await page.locator('[data-block=dictionary] .block-toggle').click();
  assert.equal(await page.locator('#notes').inputValue(),'First observation');
  await page.locator('#content').fill('Edited text');await page.locator('#save').click();
  await page.locator('#history').click();
  assert.match(await page.locator('#review-body').textContent(),/Original text/);
  await page.getByRole('button',{name:'Restore this edition'}).first().click();
  await page.waitForFunction(()=>document.querySelector('#content').value.includes('Original text'));
  assert.match(await page.locator('#content').inputValue(),/Original text/);
  await page.locator('#back').click();
  const downloaded=page.waitForEvent('download');await page.locator('#account-button').click();await page.locator('#backup').click();
  const backupPath=await (await downloaded).path();const backup=JSON.parse(await fs.readFile(backupPath,'utf8'));
  await page.locator('[data-close=account-dialog]').click();assert.equal(backup.books.length,1);assert.equal(backup.recovery.length,1);assert.equal(backup.study.vocabulary[0].word,'Original');assert.equal(backup.sharing.contributions[0].kind,'pinyin');
  await page.locator('.article-title').click();
  await page.locator('#delete-book').click();
  await page.locator('#library-filters').evaluate(d=>d.open=true);await page.locator('#show-trash').check();
  await page.getByRole('button',{name:'Restore article',exact:true}).click();
  await page.locator('#show-trash').uncheck();await page.locator('#library-filters').evaluate(d=>d.open=false);
  assert.equal(await page.locator('.article-title').count(),1);
  const restoreContext=await browser.newContext();const restorePage=await restoreContext.newPage();
  restoreContext.setDefaultTimeout(15000);
  await restorePage.goto(origin);
  await restorePage.waitForFunction(()=>!document.querySelector('main').inert);
  await restorePage.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await restorePage.getByRole('button',{name:'Import missing articles'}).click();
  await restorePage.locator('.article-title').click();
  assert.match(await restorePage.locator('#content').inputValue(),/Original text/);
  assert.equal(await restorePage.locator('#reference').isVisible(),false,'PDF source is excluded from JSON backup');
  await restorePage.locator('[data-block=dictionary] .block-toggle').click();
  await restorePage.locator('#vocabulary-review summary').click();
  assert.match(await restorePage.locator('#vocabulary-list').textContent(),/Original/);
  await restorePage.setViewportSize({width:390,height:844});
  await restorePage.waitForFunction(()=>document.querySelector('#tool-scope-label').textContent.includes('Phone layout'));
  assert.equal(await restorePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await fs.mkdir(path.join(root,'test-results'),{recursive:true});
  await restorePage.screenshot({path:path.join(root,'test-results/mobile.png'),fullPage:true});
  await restorePage.locator('[data-block=contributions] .block-toggle').click();await restorePage.locator('#item-sharing').click();
  await restorePage.waitForFunction(()=>document.querySelector('#sharing-dialog').open);
  assert.match(await restorePage.locator('#contribution-list').textContent(),/Audience on next publication: private/,'Backup restoration never restores a public audience automatically');
  await restorePage.screenshot({path:path.join(root,'test-results/contributions-mobile.png'),fullPage:true});
  await restorePage.locator('#close-sharing').click();
  await restoreContext.close();
  // A second tab must not edit an already-open library in this browser profile.
  const other=await local.newPage();await other.goto(origin);
  await other.waitForFunction(()=>document.querySelector('#notice').textContent.includes('another tab'));
  assert.equal(await other.locator('#new-book').isDisabled(),true);
  await local.close();
  console.log('PASS local edits, history, vocabulary backup/restore, tool visibility/pinning, PDF adaptation, mobile and tab lock');

  const migrationContext=await browser.newContext();migrationContext.setDefaultTimeout(15000);
  const mp=await migrationContext.newPage();mp.on('pageerror',e=>errors.push(e.message));
  // An actual version-1 database must upgrade without losing an existing library.
  await mp.goto(origin+'/migration-seed.html');
  await mp.evaluate(async()=>{
    await new Promise((resolve,reject)=>{
      const request=indexedDB.open('reader-studio-v1',1);
      request.onupgradeneeded=()=>{request.result.createObjectStore('books',{keyPath:'key'});request.result.createObjectStore('assets',{keyPath:'key'});request.result.createObjectStore('settings');};
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,tx=db.transaction('books','readwrite');
        const id='11111111-1111-4111-8111-111111111111';
        tx.objectStore('books').put({key:'local:'+id,scope:'local',id,title:'Existing article',language:'en',content:'Keep this edition',notes:'',deleted:false,revision:0,dirty:true,history:[]});
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
      };
    });
  });
  await mp.goto(origin);await mp.waitForFunction(()=>!document.querySelector('main').inert);
  assert.equal(await mp.locator('.article-title').count(),1);
  const migrationKey='fixture-editor-v1';
  const legacy={archiveType:'study-studio-all-editing-records',archiveVersion:1,records:[
    {key:migrationKey,format:'json',value:{bodyHTML:'<h1>迁移 · Русский</h1><p>Original source</p><img src="https://migration-invalid.example/pixel"><script>window.migrationExecuted=true</script>',footnotes:[{id:'f1',text:'Source footnote'}]}},
    {key:migrationKey+'-notes-v1',format:'json',value:[{id:'n1',text:'A reading note'}]},
    {key:'sb-project-auth-token',format:'json',value:{access_token:'fixture-secret-value'}}
  ],preferences:[]};
  const archiveBytes=Buffer.from(JSON.stringify(legacy)+'\n');
  const migrationPayload=[{name:'studio-fixture.json',mimeType:'application/json',buffer:archiveBytes},
    {name:'reading-review-catalog.js',mimeType:'text/javascript',buffer:Buffer.from('window.ReadingReviewCatalog='+JSON.stringify([{key:migrationKey,title:'Migrated trial',path:'trial/editor.html'}])+';')},
    {name:'dictionary.csv',mimeType:'text/csv',buffer:Buffer.from('term,language,definition\n词,zh,word\nслово,ru,word\n')}];
  let migrationRequests=0;
  await migrationContext.route('https://migration-invalid.example/**',route=>{migrationRequests++;return route.abort();});
  await mp.locator('.library-tools-menu').evaluate(d=>d.open=true);await mp.locator('#studio-migration').click();
  await mp.waitForFunction(()=>document.querySelector('#migration-dialog').open&&!document.querySelector('#migration-files').disabled);
  await mp.locator('#migration-files').setInputFiles(migrationPayload);
  await mp.waitForFunction(()=>document.querySelector('#migration-status').textContent.startsWith('Preview ready'));
  assert.equal(await mp.locator('.article-title').count(),1,'Preview must not mutate the library');
  assert.equal(await mp.evaluate(()=>window.migrationExecuted),undefined);assert.equal(migrationRequests,0);
  await mp.getByText('Inspect records and select trial copies',{exact:true}).click();
  assert.match(await mp.locator('#migration-records').textContent(),/dictionary entries/);
  await mp.locator('#migration-stage').click();
  await mp.waitForFunction(()=>document.querySelector('#migration-status').textContent.startsWith('Original files and the inventory report'));
  assert.equal(await mp.locator('.article-title').count(),1,'Staging must not create reading copies');
  await mp.locator('#migration-saved > details > summary').first().click();
  const originalDownload=mp.waitForEvent('download');
  await mp.getByRole('button',{name:'Download original: studio-fixture.json',exact:true}).click();
  assert.deepEqual(await fs.readFile(await (await originalDownload).path()),archiveBytes);
  const inventoryDownload=mp.waitForEvent('download');await mp.locator('#migration-report').click();
  const report=JSON.parse(await fs.readFile(await (await inventoryDownload).path(),'utf8'));
  assert.equal(report.summary.dictionaryEntries,2);assert.equal(JSON.stringify(report).includes('fixture-secret-value'),false);
  await mp.getByRole('checkbox',{name:'Select Migrated trial',exact:true}).check();
  await mp.locator('#migration-import').click();
  await mp.waitForFunction(()=>document.querySelector('#migration-status').textContent.includes('Acknowledge'));
  await mp.locator('#migration-acknowledge').check();await mp.locator('#migration-import').click();
  await mp.waitForFunction(()=>document.querySelector('#migration-status').textContent.startsWith('Imported 1 plain-text'));
  assert.equal(await mp.locator('.article-title').count(),2);
  assert.equal(await mp.getByRole('checkbox',{name:'Select Migrated trial',exact:true}).isDisabled(),true,'Repeat import is blocked');
  await mp.locator('#close-migration').click();
  await mp.locator('.book').filter({hasText:'Migrated trial'}).locator('.article-title').click();
  assert.equal(await mp.locator('#content').inputValue(),'迁移 · Русский\nOriginal source');
  assert.match(await mp.locator('#notes').inputValue(),/A reading note/);assert.match(await mp.locator('#notes').inputValue(),/Source footnote/);
  await mp.locator('#content').fill('My migrated edition');await mp.locator('#save').click();await mp.locator('#back').click();
  await mp.locator('.library-tools-menu').evaluate(d=>d.open=true);await mp.locator('#studio-migration').click();
  await mp.waitForFunction(()=>document.querySelector('#migration-dialog').open&&!document.querySelector('#migration-files').disabled);
  await mp.locator('#migration-files').setInputFiles(migrationPayload);
  await mp.waitForFunction(()=>document.querySelector('#migration-status').textContent.startsWith('Preview ready'));
  assert.match(await mp.locator('#migration-records').textContent(),/destination conflict/);
  assert.equal(await mp.getByRole('checkbox',{name:'Select Migrated trial',exact:true}).isDisabled(),true);
  // A stale-preview collision aborts the entire transaction, including earlier inserts.
  const atomic=await mp.evaluate(async()=>{
    const store=await import('/storage.js'),before=await store.listBooks('local'),batches=await store.listMigrationBatches('local');
    const fresh={...before[0],id:crypto.randomUUID(),title:'Must roll back'};
    let rejected=false;try{await store.commitMigration('local',{id:crypto.randomUUID(),createdAt:new Date().toISOString(),report:{}},[],[fresh,before[0]]);}catch{rejected=true;}
    return {rejected,before:before.length,after:(await store.listBooks('local')).length,batchesBefore:batches.length,batchesAfter:(await store.listMigrationBatches('local')).length};
  });
  assert.equal(atomic.rejected,true);assert.equal(atomic.before,atomic.after);assert.equal(atomic.batchesBefore,atomic.batchesAfter);
  await mp.setViewportSize({width:390,height:844});
  assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await mp.screenshot({path:path.join(root,'test-results/migration-mobile.png'),fullPage:true});
  await migrationContext.close();
  console.log('PASS migration preview, inert legacy HTML, version-1 storage upgrade, byte-exact staging, trial import, duplicate/conflict protection and transaction rollback');

  const documents=new Map(),publications=new Map(),contributionDrafts=new Map(),contributionSnapshots=new Map(),groups=[],members=[];
  let offline=false,signupRedirect,recoveryRedirect;
  const accountA='a1000000-0000-4000-8000-000000000001',accountB='b1000000-0000-4000-8000-000000000002';
  const cloudContext=await browser.newContext();
  cloudContext.setDefaultTimeout(15000);
  const mockConfig=route=>route.fulfill({contentType:'text/javascript',body:'window.READER_CONFIG={supabaseUrl:"https://reader.test",supabaseKey:"test-public",sharingEnabled:true}'});
  await cloudContext.route('**/config.js',mockConfig);
  const mockCloud=async route=>{
    if(offline){await route.abort('internetdisconnected');return;}
    const req=route.request(),url=new URL(req.url());let body={};
    try{body=req.postDataJSON()||{};}catch{}
    const respond=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname==='/auth/v1/token'){
      const id=body.email?.startsWith('b@')?accountB:accountA;
      return respond({access_token:id,refresh_token:id,expires_in:3600,user:{id,email:body.email||'a@example.com'}});
    }
    if(url.pathname==='/auth/v1/logout')return respond({});
    if(url.pathname==='/auth/v1/signup'){signupRedirect=url.searchParams.get('redirect_to');return respond({user:{email:body.email}});}
    if(url.pathname==='/auth/v1/recover'){recoveryRedirect=url.searchParams.get('redirect_to');return respond({});}
    const owner=req.headers().authorization?.replace('Bearer ','');
    if(url.pathname==='/auth/v1/user')return respond({id:owner,email:'a@example.com'});
    if(url.pathname==='/rest/v1/reader_documents')return respond([...documents.values()].filter(d=>d.user_id===owner));
    if(url.pathname==='/rest/v1/rpc/save_reader_document'){
      const key=owner+':'+body.p_id,old=documents.get(key);
      if((old?.revision||0)!==body.p_revision)return respond({conflict:true,document:old});
      const record={id:body.p_id,user_id:owner,title:body.p_title,language:body.p_language,content:body.p_content,notes:body.p_notes,deleted:body.p_deleted,revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};
      documents.set(key,record);return respond({conflict:false,document:record});
    }
    if(url.pathname==='/rest/v1/reader_groups')return respond(groups.filter(group=>members.some(member=>member.group_id===group.id&&member.user_id===owner)));
    if(url.pathname==='/rest/v1/reader_group_members')return respond(members.filter(member=>members.some(m=>m.group_id===member.group_id&&m.user_id===owner)));
    if(url.pathname==='/rest/v1/rpc/reader_create_group'){
      const group={id:'d1000000-0000-4000-8000-000000000004',owner_id:owner,name:body.p_name,created_at:new Date().toISOString()};groups.push(group);members.push({group_id:group.id,user_id:owner,display_name:body.p_display_name,role:'organizer'});return respond(group);
    }
    if(url.pathname==='/rest/v1/rpc/reader_invite_group')return respond({code:'fixture-invitation-code',expires_at:'2026-11-12T12:00:00Z'});
    if(url.pathname==='/rest/v1/rpc/reader_revoke_invites')return respond(null);
    const allowed=row=>row.owner_id===owner||row.visibility==='public'||row.visibility==='group'&&members.some(member=>member.user_id===owner&&row.group_ids.includes(member.group_id));
    if(url.pathname==='/rest/v1/reader_publications')return respond([...publications.values()].filter(row=>allowed(row)&&(!url.searchParams.has('id')||'eq.'+row.id===url.searchParams.get('id'))&&(!url.searchParams.has('document_id')||'eq.'+row.document_id===url.searchParams.get('document_id'))&&(!url.searchParams.has('owner_id')||'eq.'+row.owner_id===url.searchParams.get('owner_id'))&&(!url.searchParams.has('visibility')||row.visibility!=='private')));
    if(url.pathname==='/rest/v1/reader_contribution_drafts')return respond([...contributionDrafts.values()].filter(row=>row.owner_id===owner));
    if(url.pathname==='/rest/v1/reader_shared_contributions')return respond([...contributionSnapshots.values()].filter(row=>allowed(row)&&(!url.searchParams.has('source_id')||'eq.'+row.source_id===url.searchParams.get('source_id'))&&(!url.searchParams.has('owner_id')||'eq.'+row.owner_id===url.searchParams.get('owner_id'))&&(!url.searchParams.has('visibility')||row.visibility!=='private')));
    if(url.pathname==='/rest/v1/rpc/reader_publish_book'){
      const source=documents.get(owner+':'+body.p_document),old=[...publications.values()].find(row=>row.document_id===body.p_document&&row.owner_id===owner);
      if((old?.revision||0)!==body.p_revision)return respond({conflict:true,publication:old});
      const record={id:old?.id||'e1000000-0000-4000-8000-000000000005',owner_id:owner,document_id:source.id,title:source.title,language:source.language,content:source.content,visibility:body.p_visibility,group_ids:body.p_groups,source_revision:source.revision,revision:(old?.revision||0)+1,updated_at:new Date().toISOString()};
      publications.set(record.id,record);return respond({conflict:false,publication:record});
    }
    if(url.pathname==='/rest/v1/rpc/reader_save_contribution'){
      const old=contributionDrafts.get(body.p_id);if((old?.revision||0)!==body.p_revision)return respond({conflict:true,draft:old});
      const record={id:body.p_id,owner_id:owner,source_id:body.p_source,kind:body.p_kind,body:body.p_body,quote:body.p_quote,anchor_start:body.p_start,anchor_end:body.p_end,source_revision:body.p_source_revision,requested_visibility:body.p_visibility,group_ids:body.p_groups,revision:(old?.revision||0)+1};contributionDrafts.set(record.id,record);return respond({conflict:false,draft:record});
    }
    if(url.pathname==='/rest/v1/rpc/reader_publish_contribution'){
      const draft=contributionDrafts.get(body.p_id),old=contributionSnapshots.get(body.p_id);if((old?.revision||0)!==body.p_revision)return respond({conflict:true,publication:old});
      assert.equal(draft.revision,body.p_draft_revision);const record={...draft,visibility:draft.requested_visibility,revision:(old?.revision||0)+1};delete record.requested_visibility;contributionSnapshots.set(record.id,record);return respond({conflict:false,publication:record});
    }
    return route.fulfill({status:404,body:'{}'});
  };
  await cloudContext.route('https://reader.test/**',mockCloud);
  const cp=await cloudContext.newPage();cp.on('pageerror',e=>errors.push(e.message));await cp.goto(origin);
  await cp.locator('#account-button').click();await cp.locator('#email').fill('a@example.com');await cp.locator('#password').fill('password123');
  await cp.locator('#sign-up').click();
  await cp.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('confirm your account'));
  assert.equal(signupRedirect,origin+'/');
  await cp.locator('#forgot').click();
  await cp.waitForFunction(()=>document.querySelector('#account-status').textContent.includes('reset link'));
  assert.equal(recoveryRedirect,origin+'/');
  await cp.getByRole('button',{name:'Close account',exact:true}).click();
  async function signin(email){
    await cp.locator('#account-button').click();await cp.locator('#email').fill(email);await cp.locator('#password').fill('password123');
    await cp.locator('#sign-in').click();await cp.waitForFunction(()=>document.querySelector('#identity').textContent.includes('Private library'));
    await cp.waitForFunction(()=>!document.querySelector('#new-book').disabled);
  }
  await signin('a@example.com');
  await cp.locator('#new-book').click();await cp.locator('#title').fill('Private A');await cp.locator('#content').fill('A text');await cp.locator('#save').click();
  await cp.waitForFunction(()=>document.querySelector('#save-status').textContent==='Synced');
  assert.equal(documents.size,1);
  // A cloud revision changes while this device has an older base.
  const [key,record]=[...documents.entries()][0];documents.set(key,{...record,content:'Other device edition',revision:2});
  await cp.locator('#content').fill('My conflicting edition');await cp.locator('#save').click();
  await cp.waitForFunction(()=>document.querySelector('#save-status').textContent==='Conflict needs review');
  assert.equal(documents.get(key).content,'Other device edition');
  await cp.locator('#back').click();await cp.getByRole('button',{name:'Review conflict',exact:true}).click();
  assert.match(await cp.locator('#review-body').textContent(),/My conflicting edition/);
  await cp.getByRole('button',{name:'Keep device version & sync'}).click();
  await cp.waitForFunction(()=>document.querySelector('#notice').textContent==='Library synchronized.');
  assert.equal(documents.get(key).content,'My conflicting edition');
  await cp.locator('.article-title').click();
  offline=true;
  await cp.locator('#notes').fill('Offline draft survives');await cp.locator('#save').click();
  await cp.waitForFunction(()=>document.querySelector('#notice').textContent.includes('fetch'));
  await cp.reload();await cp.waitForFunction(()=>!document.querySelector('#new-book').disabled);
  await cp.locator('.article-title').click();
  assert.equal(await cp.locator('#notes').inputValue(),'Offline draft survives');
  offline=false;await cp.locator('#save').click();
  await cp.waitForFunction(()=>document.querySelector('#save-status').textContent==='Synced');
  assert.equal(documents.get(key).notes,'Offline draft survives');
  await cp.locator('#account-button').click();await cp.locator('#sign-out').click();
  await cp.waitForFunction(()=>document.querySelector('#identity').textContent==='Local library · this browser');
  assert.equal(await cp.locator('#notes').inputValue(),'','Signing out clears the previous reader’s editor fields');
  assert.equal(await cp.locator('.article-title').count(),0);
  await signin('b@example.com');
  assert.equal(await cp.locator('.article-title').count(),0);
  await cp.locator('#account-button').click();await cp.locator('#sign-out').click();
  await signin('a@example.com');await cp.locator('.article-title').click();
  assert.equal(await cp.locator('#notes').inputValue(),'Offline draft survives');
  await cp.setViewportSize({width:1440,height:1000});await cp.screenshot({path:path.join(root,'test-results/desktop.png'),fullPage:true});
  await cp.locator('#account-button').click();await cp.locator('#sign-out').click();
  await cp.waitForFunction(()=>document.querySelector('#identity').textContent==='Local library · this browser');
  await cp.goto(origin+'/?callback=expired#error=access_denied&error_description=This+link+expired');
  await cp.waitForFunction(()=>document.querySelector('#notice').textContent==='This link expired');
  assert.equal(await cp.locator('#new-book').isEnabled(),true,'Invalid auth links must not disable local reading');
  assert.equal(new URL(cp.url()).hash,'');
  await cp.goto(origin+`/?callback=confirmation#access_token=${accountA}&refresh_token=test&expires_in=3600&type=signup`);
  await cp.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Email confirmed'));
  assert.equal(new URL(cp.url()).hash,'');
  await cp.goto(origin+`/?callback=recovery#access_token=${accountA}&refresh_token=test&expires_in=3600&type=recovery`);
  await cp.locator('#recovery-dialog').waitFor({state:'visible'});
  await cp.locator('#new-password').fill('new-password123');
  await cp.getByRole('button',{name:'Update password',exact:true}).click();
  await cp.waitForFunction(()=>document.querySelector('#notice').textContent==='Password updated.');
  assert.equal(new URL(cp.url()).hash,'');
  console.log('PASS mocked account isolation, revision conflicts, offline reload/retry and remembered sessions');
  console.log('PASS signup/reset redirects, confirmation callbacks, password recovery and expired-link handling');
  await cp.locator('#account-button').click();await cp.locator('#reading-groups').click();await cp.locator('#group-name').fill('Reading friends');await cp.locator('#group-alias').fill('Reader A');
  await cp.locator('#create-reading-group button').click();await cp.waitForFunction(()=>document.querySelector('#groups-status').textContent.includes('Group created'));
  await cp.getByRole('button',{name:'Create invitation code',exact:true}).click();await cp.getByRole('textbox',{name:'Group invitation code',exact:true}).waitFor();
  assert.equal(await cp.getByRole('textbox',{name:'Group invitation code',exact:true}).inputValue(),'fixture-invitation-code');
  await cp.getByRole('button',{name:'Revoke invitation codes',exact:true}).click();await cp.waitForFunction(()=>document.querySelector('#groups-status').textContent.includes('were revoked'));
  await cp.locator('#groups-dialog .dialog-heading button').click();await cp.locator('[data-close=account-dialog]').click();
  await cp.locator('.article-title').click();
  await cp.locator('[data-block=contributions] .block-toggle').click();await cp.locator('#item-sharing').click();
  await cp.waitForFunction(()=>document.querySelector('#sharing-dialog').open&&!document.querySelector('#book-audience').disabled);
  await cp.locator('#book-audience').selectOption('public');await cp.locator('#review-book-publication').click();
  assert.equal((await cp.locator('#publish-dialog').textContent()).includes('Offline draft survives'),false,'Personal reading notes are excluded from publication preview');
  await cp.getByRole('button',{name:'Publish reviewed edition',exact:true}).click();await cp.waitForFunction(()=>document.querySelector('#sharing-status').textContent.includes('reviewed edition was published'));
  await cp.locator('#close-sharing').click();await cp.locator('#account-button').click();await cp.locator('#account-publications').click();await cp.locator('#review-dialog').waitFor({state:'visible'});assert.match(await cp.locator('#review-body').textContent(),/Public edition/);assert.equal(await cp.locator('#review-body').getByRole('button',{name:'Manage sharing',exact:true}).count(),1);await cp.locator('[data-close=review-dialog]').click();await cp.locator('[data-close=account-dialog]').click();await cp.locator('#item-sharing').click();assert.equal(publications.size,1);assert.equal(JSON.stringify([...publications.values()]).includes('Offline draft survives'),false);
  await cp.locator('#contribution-kind').selectOption('pinyin');await cp.locator('#contribution-body').fill('PRIVATE PINYIN — wǒ de');await cp.locator('#save-contribution').click();
  await cp.waitForFunction(()=>document.querySelector('#sharing-status').textContent.includes('saved to your account'));
  assert.equal(contributionDrafts.size,1);assert.equal(contributionSnapshots.size,0,'Saving private drafts cannot publish');
  await cp.locator('#new-contribution').click();await cp.locator('#contribution-kind').selectOption('footnote');await cp.locator('#contribution-body').fill('Public explanation');await cp.locator('#contribution-audience').selectOption('public');await cp.locator('#review-contribution').click();
  await cp.getByRole('button',{name:'Publish this contribution',exact:true}).click();await cp.waitForFunction(()=>document.querySelector('#sharing-status').textContent.includes('Only this reviewed contribution was published'));
  const footnote=[...contributionSnapshots.values()][0];
  await cp.locator('#new-contribution').click();await cp.locator('#contribution-kind').selectOption('revision');await cp.locator('#revision-from-source').click();await cp.locator('#contribution-body').fill('My alternative published edition');await cp.locator('#contribution-audience').selectOption('public');await cp.locator('#review-contribution').click();await cp.getByRole('button',{name:'Publish this contribution',exact:true}).click();
  await cp.waitForFunction(()=>!document.querySelector('#publish-dialog').open);
  const snapshot=[...publications.values()][0];assert.equal(snapshot.content,'My conflicting edition');
  const anonymous=await browser.newContext();anonymous.setDefaultTimeout(15000);await anonymous.route('**/config.js',mockConfig);await anonymous.route('https://reader.test/**',mockCloud);
  const ap=await anonymous.newPage();ap.on('pageerror',e=>errors.push(e.message));await ap.goto(origin+'/#read='+snapshot.id);await ap.locator('#sharing-dialog').waitFor({state:'visible'});
  assert.equal(await ap.locator('#shared-source-text').inputValue(),'My conflicting edition');
  assert.match(await ap.locator('#contribution-list').textContent(),/Public explanation/);assert.equal((await ap.locator('#contribution-list').textContent()).includes('PRIVATE PINYIN'),false);
  await ap.getByRole('button',{name:'View alternative edition',exact:true}).click();assert.equal(await ap.locator('#shared-source-text').inputValue(),'My alternative published edition');
  await ap.locator('#restore-source').click();assert.equal(await ap.locator('#shared-source-text').inputValue(),'My conflicting edition');
  const footnoteCard=cp.locator('#contribution-list .contribution-card').filter({hasText:'Audience on next publication: public'}).filter({hasText:'Public explanation'});
  await footnoteCard.getByRole('button',{name:'Edit private draft',exact:true}).click();await cp.locator('#contribution-body').fill('PRIVATE NEW FOOTNOTE DRAFT');await cp.locator('#contribution-audience').selectOption('private');await cp.locator('#save-contribution').click();
  await cp.waitForFunction(()=>document.querySelector('#sharing-status').textContent.includes('saved to your account'));
  await ap.reload();await ap.locator('#sharing-dialog').waitFor({state:'visible'});
  assert.match(await ap.locator('#contribution-list').textContent(),/Public explanation/);assert.equal((await ap.locator('#contribution-list').textContent()).includes('PRIVATE NEW FOOTNOTE'),false,'A newer private draft never replaces its public snapshot');
  await cp.locator('#review-contribution').click();await cp.getByRole('button',{name:'Keep private / withdraw shared copy',exact:true}).click();await cp.waitForFunction(()=>!document.querySelector('#publish-dialog').open);
  assert.equal(contributionSnapshots.get(footnote.id).visibility,'private');
  await ap.reload();await ap.locator('#sharing-dialog').waitFor({state:'visible'});assert.equal((await ap.locator('#contribution-list').textContent()).includes('Public explanation'),false);
  assert.equal((await ap.locator('#contribution-list').textContent()).includes('My alternative published edition'),true,'Withdrawing one contribution does not withdraw another');
  await ap.screenshot({path:path.join(root,'test-results/shared-edition.png'),fullPage:true});await anonymous.close();
  await cp.locator('#close-sharing').click();await cp.locator('#account-button').click();await cp.locator('#sign-out').click();
  await cp.waitForFunction(()=>document.querySelector('#review-dialog').open);
  const studyDownload=cp.waitForEvent('download');await cp.getByRole('button',{name:'Export backup & sign out',exact:true}).click();
  const studyBackup=JSON.parse(await fs.readFile(await (await studyDownload).path(),'utf8'));
  assert.equal(studyBackup.sharing.contributions.length,3);assert.equal(studyBackup.sharing.contributions.some(draft=>'publication' in draft),false);
  await cp.waitForFunction(()=>document.querySelector('#identity').textContent==='Local library · this browser');
  assert.equal((await cp.locator('#sharing-dialog').textContent()).includes('PRIVATE PINYIN'),false,'Account switching clears private contribution DOM');
  assert.equal(await cp.locator('#contribution-body').inputValue(),'');assert.equal(await cp.locator('#notes').inputValue(),'');
  console.log('PASS group organizer controls, reviewed source publication, independent private/public contributions, alternative editions and withdrawal');
  assert.deepEqual(errors,[]);
})().then(async()=>{await browser?.close();server.close();}).catch(async e=>{
  console.error(e);
  if(errors.length)console.error('Page errors:',errors);
  for(const context of browser?.contexts()||[])for(const page of context.pages()){
    console.error(await page.evaluate(()=>({notice:document.querySelector('#notice')?.textContent,identity:document.querySelector('#identity')?.textContent,review:document.querySelector('#review-dialog[open]')?.textContent})).catch(()=>({})));
  }
  await browser?.close();server.close();process.exitCode=1;
});
