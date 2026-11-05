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
  await page.locator('#customize-tools').click();
  await page.locator('#block-options').getByLabel('Read aloud',{exact:true}).uncheck();
  await page.locator('#save-tool-settings').click();
  await page.waitForFunction(()=>!document.querySelector('#tools-dialog').open);
  assert.equal(await page.locator('[data-block=speech]').isVisible(),false);
  await page.locator('#pdf-file').setInputFiles({name:'reference.pdf',mimeType:'application/pdf',buffer:referencePdf()});
  await page.waitForFunction(()=>!document.querySelector('#reference').hidden);
  await page.reload();await page.getByRole('button',{name:'Open article',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#reference').hidden);
  assert.equal(await page.locator('#pdf-name').textContent(),'reference.pdf');
  assert.equal(await page.locator('[data-block=dictionary] .block-pin').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-block=speech]').isVisible(),false);
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
  const downloaded=page.waitForEvent('download');await page.locator('#backup').click();
  const backupPath=await (await downloaded).path();const backup=JSON.parse(await fs.readFile(backupPath,'utf8'));
  assert.equal(backup.books.length,1);assert.equal(backup.recovery.length,1);assert.equal(backup.study.vocabulary[0].word,'Original');
  await page.getByRole('button',{name:'Open article',exact:true}).click();
  await page.locator('#delete-book').click();
  await page.locator('#show-trash').check();
  await page.getByRole('button',{name:'Restore article',exact:true}).click();
  await page.locator('#show-trash').uncheck();
  assert.equal(await page.getByRole('button',{name:'Open article',exact:true}).count(),1);
  const restoreContext=await browser.newContext();const restorePage=await restoreContext.newPage();
  restoreContext.setDefaultTimeout(15000);
  await restorePage.goto(origin);
  await restorePage.waitForFunction(()=>!document.querySelector('main').inert);
  await restorePage.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
  await restorePage.getByRole('button',{name:'Import missing articles'}).click();
  await restorePage.getByRole('button',{name:'Open article',exact:true}).click();
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
  assert.equal(await mp.getByRole('button',{name:'Open article',exact:true}).count(),1);
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
  await mp.locator('#studio-migration').click();
  await mp.waitForFunction(()=>document.querySelector('#migration-dialog').open&&!document.querySelector('#migration-files').disabled);
  await mp.locator('#migration-files').setInputFiles(migrationPayload);
  await mp.waitForFunction(()=>document.querySelector('#migration-status').textContent.startsWith('Preview ready'));
  assert.equal(await mp.getByRole('button',{name:'Open article',exact:true}).count(),1,'Preview must not mutate the library');
  assert.equal(await mp.evaluate(()=>window.migrationExecuted),undefined);assert.equal(migrationRequests,0);
  await mp.getByText('Inspect records and select trial copies',{exact:true}).click();
  assert.match(await mp.locator('#migration-records').textContent(),/dictionary entries/);
  await mp.locator('#migration-stage').click();
  await mp.waitForFunction(()=>document.querySelector('#migration-status').textContent.startsWith('Original files and the inventory report'));
  assert.equal(await mp.getByRole('button',{name:'Open article',exact:true}).count(),1,'Staging must not create reading copies');
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
  assert.equal(await mp.getByRole('button',{name:'Open article',exact:true}).count(),2);
  assert.equal(await mp.getByRole('checkbox',{name:'Select Migrated trial',exact:true}).isDisabled(),true,'Repeat import is blocked');
  await mp.locator('#close-migration').click();
  await mp.locator('.book').filter({hasText:'Migrated trial'}).getByRole('button',{name:'Open article',exact:true}).click();
  assert.equal(await mp.locator('#content').inputValue(),'迁移 · Русский\nOriginal source');
  assert.match(await mp.locator('#notes').inputValue(),/A reading note/);assert.match(await mp.locator('#notes').inputValue(),/Source footnote/);
  await mp.locator('#content').fill('My migrated edition');await mp.locator('#save').click();await mp.locator('#back').click();
  await mp.locator('#studio-migration').click();
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

  const documents=new Map();let offline=false,signupRedirect,recoveryRedirect;
  const accountA='a1000000-0000-4000-8000-000000000001',accountB='b1000000-0000-4000-8000-000000000002';
  const cloudContext=await browser.newContext();
  cloudContext.setDefaultTimeout(15000);
  await cloudContext.route('**/config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.READER_CONFIG={supabaseUrl:"https://reader.test",supabaseKey:"test-public"}'}));
  await cloudContext.route('https://reader.test/**',async route=>{
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
    return route.fulfill({status:404,body:'{}'});
  });
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
  await cp.getByRole('button',{name:'Open article',exact:true}).click();
  offline=true;
  await cp.locator('#notes').fill('Offline draft survives');await cp.locator('#save').click();
  await cp.waitForFunction(()=>document.querySelector('#notice').textContent.includes('fetch'));
  await cp.reload();await cp.waitForFunction(()=>!document.querySelector('#new-book').disabled);
  await cp.getByRole('button',{name:'Open article',exact:true}).click();
  assert.equal(await cp.locator('#notes').inputValue(),'Offline draft survives');
  offline=false;await cp.locator('#save').click();
  await cp.waitForFunction(()=>document.querySelector('#save-status').textContent==='Synced');
  assert.equal(documents.get(key).notes,'Offline draft survives');
  await cp.locator('#account-button').click();await cp.locator('#sign-out').click();
  await cp.waitForFunction(()=>document.querySelector('#identity').textContent==='Local library · this browser');
  assert.equal(await cp.getByRole('button',{name:'Open article',exact:true}).count(),0);
  await signin('b@example.com');
  assert.equal(await cp.getByRole('button',{name:'Open article',exact:true}).count(),0);
  await cp.locator('#account-button').click();await cp.locator('#sign-out').click();
  await signin('a@example.com');await cp.getByRole('button',{name:'Open article',exact:true}).click();
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
  assert.deepEqual(errors,[]);
})().then(async()=>{await browser?.close();server.close();}).catch(async e=>{
  console.error(e);
  if(errors.length)console.error('Page errors:',errors);
  for(const context of browser?.contexts()||[])for(const page of context.pages()){
    console.error(await page.evaluate(()=>({notice:document.querySelector('#notice')?.textContent,identity:document.querySelector('#identity')?.textContent,review:document.querySelector('#review-dialog[open]')?.textContent})).catch(()=>({})));
  }
  await browser?.close();server.close();process.exitCode=1;
});
