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
  await restorePage.goto(origin);
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
