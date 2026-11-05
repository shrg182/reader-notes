import {validateBook,validateBackup,makeBackup,mergeRemote,sameEdition} from './core.js';
import * as db from './storage.js';
import {Cloud} from './cloud.js';
import {ReaderTools} from './toolbar.js';
import {validateStudy} from './toolbar-model.js';
import {StudioMigration} from './migration-ui.js';

const $=id=>document.getElementById(id);
const cloud=new Cloud(window.READER_CONFIG);
let scope='local', books=[], active=null, unsaved=false, busy=false, timer, pdfUrl, editGeneration=0;
let accountLock=null, ready=false;
const notify=(message,error=false)=>{ $('notice').textContent=message;$('notice').classList.toggle('error',error); };
const status=message=>{$('save-status').textContent=message;};
const tools=new ReaderTools({context:()=>({scope,book:current(),books,hasPdf:Boolean(pdfUrl)}),run,notify,openSource:openBook});
new StudioMigration({run,notify,context:()=>({scope,books,label:cloud.session?`private library (${cloud.session.user.email})`:'local library on this browser'}),onImported:async()=>{books=await db.listBooks(scope);render();}});
function node(tag,text,className){const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;return n;}
function button(text,fn){const b=node('button',text);b.onclick=()=>run(fn);return b;}
function download(name,data,type='application/json'){
  const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function run(fn,allowTyping=false){
  if(busy)return;
  busy=true;
  const controls=[...document.querySelectorAll('button,input,textarea,select')].filter(el=>!el.disabled&&(!allowTyping||el.matches('button,select,input[type=checkbox],input[type=radio]')));
  controls.forEach(el=>el.disabled=true);
  try{await fn();}catch(e){notify(e.message||'The operation failed.',true);if(active)status(unsaved?'Not saved — retry Save & sync':'Device draft retained · sync incomplete');}
  finally{controls.forEach(el=>el.disabled=!ready);if(ready)tools.availability();document.querySelector('main').inert=false;document.querySelector('.topbar').inert=false;busy=false;}
}
async function acquireLock(nextScope){
  if(accountLock){accountLock();accountLock=null;}
  if(!navigator.locks)throw new Error('This browser cannot safely coordinate editing tabs. Use a current browser with Web Locks support.');
  await new Promise((resolve,reject)=>{
    navigator.locks.request(`reader-studio:${nextScope}`,{ifAvailable:true},async lock=>{
      if(!lock){reject(new Error('This library is already open in another tab. Close that tab and reload.'));return;}
      await new Promise(release=>{accountLock=release;resolve();});
    }).catch(reject);
  });
}
async function loadScope(){
  ready=false;
  const next=cloud.session?`account:${cloud.session.user.id}`:'local';
  await acquireLock(next);
  scope=next;books=await db.listBooks(scope);active=null;unsaved=false;closePdf();
  $('workspace-view').hidden=true;$('library-view').hidden=false;
  $('identity').textContent=cloud.session?`Private library · ${cloud.session.user.email}`:'Local library · this browser';
  await tools.activate();render();updateAccount();ready=true;document.querySelector('main').inert=false;document.querySelector('.topbar').inert=false;
}
function render(){
  const query=$('search').value.toLocaleLowerCase(), trash=$('show-trash').checked;
  const visible=books.filter(b=>b.deleted===trash&&`${b.title} ${b.content} ${b.notes}`.toLocaleLowerCase().includes(query));
  $('books').replaceChildren();
  for(const book of visible.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))){
    const card=node('article','','book');
    card.append(node('h2',book.title),node('p',book.language||'Language not specified'),
      node('p',book.conflict?'Conflict needs review':book.dirty?(cloud.session?'Saved on device · waiting to sync':'Saved on this device'):'Synced'));
    const actions=node('div','','actions');
    if(trash)actions.append(button('Restore article',async()=>{await changeBook(book,{deleted:false});await sync();}));
    else actions.append(button('Open article',()=>openBook(book.id)));
    if(book.conflict)actions.append(button('Review conflict',()=>reviewConflict(book.id)));
    card.append(actions);$('books').append(card);
  }
  if(!visible.length)$('books').append(node('div',trash?'Trash is empty.':query?'No matching articles.':'Your reading room starts here. Create an article or import a text file.','empty'));
}
function current(){return books.find(b=>b.id===active);}
function paintEditor(book){
  $('title').value=book.title;$('language').value=book.language;
  $('content').value=book.content;$('notes').value=book.notes;
  unsaved=false;status(book.conflict?'Conflict needs review':book.dirty?(cloud.session?'Saved on this device · waiting to sync':'Saved on this device'):'Synced');
}
async function openBook(id){
  if(!tools.confirmLeave())return;
  await saveDraft();closePdf();active=id;paintEditor(current());
  $('library-view').hidden=true;$('workspace-view').hidden=false;
  const asset=await db.getAsset(scope,id);if(asset)showPdf(asset.file);
  await tools.activate();
  $('title').focus();
}
function historical(book){return {...validateBook(book),savedAt:book.updatedAt||new Date().toISOString()};}
async function changeBook(book,changes){
  const next={...book,...changes,dirty:true,updatedAt:new Date().toISOString(),history:[historical(book),...(book.history||[])].slice(0,30)};
  validateBook(next);await db.putBook(scope,next);books=books.map(b=>b.id===next.id?next:b);render();return next;
}
async function saveDraft(){
  clearTimeout(timer);
  if(!active||!unsaved)return;
  const generation=editGeneration;
  const values={title:$('title').value.trim()||'Untitled article',language:$('language').value,
    content:$('content').value,notes:$('notes').value};
  const book=current();validateBook({...book,...values});
  if(!sameEdition(book,{...book,...values}))await changeBook(book,values);
  unsaved=generation!==editGeneration;
  status(unsaved?'Unsaved changes…':cloud.session?'Saved on this device · waiting to sync':'Saved on this device');
}
async function createBook(title='Untitled article',content=''){
  await saveDraft();
  const book={id:crypto.randomUUID(),title,language:'',content,notes:'',deleted:false,revision:0,dirty:true,history:[],updatedAt:new Date().toISOString()};
  validateBook(book);await db.putBook(scope,book);books.push(book);await openBook(book.id);
}
async function sync(){
  await saveDraft();
  if(!cloud.session){render();return;}
  status('Syncing…');
  // Persist each result before the next request. Interrupted runs retain the rest.
  for(const original of [...books].filter(b=>b.dirty&&!b.conflict)){
    const result=await cloud.save(original);
    if(!result.document)throw new Error('Cloud returned an invalid document response.');
    const next=result.conflict?{...original,conflict:result.document}:
      {...original,...validateBook(result.document),dirty:false,conflict:null,revision:result.document.revision};
    await db.putBook(scope,next);books=books.map(b=>b.id===next.id?next:b);
  }
  const remote=await cloud.list();
  if(!Array.isArray(remote))throw new Error('Cloud returned an invalid library.');
  const merged=new Map(books.map(b=>[b.id,b]));
  for(const record of remote){validateBook(record);merged.set(record.id,mergeRemote(merged.get(record.id),record));}
  const next=[...merged.values()];await db.putBooks(scope,next);books=next;render();
  if(active){const book=current();paintEditor(book);if(book.deleted){active=null;$('workspace-view').hidden=true;$('library-view').hidden=false;closePdf();}}
  const conflicts=books.filter(b=>b.conflict).length;
  notify(conflicts?`${conflicts} article(s) need conflict review. Both versions are retained.`:'Library synchronized.');
}
function review(title){$('review-title').textContent=title;$('review-body').replaceChildren();$('review-actions').replaceChildren();if(!$('review-dialog').open)$('review-dialog').showModal();}
async function reviewConflict(id){
  await saveDraft();const book=books.find(b=>b.id===id),remote=book.conflict;if(!remote)return;
  review('Review conflicting editions');
  for(const [title,value] of [['Device version',book],['Cloud version',remote]]){
    $('review-body').append(node('h3',`${title}${value.deleted?' · in trash':''}`),node('h4',value.title),node('pre',value.content+'\n\nReading notes:\n'+value.notes));
  }
  $('review-body').append(node('p','Both editions are included in recovery history when you choose. You can close this review to decide later.'));
  async function choose(useLocal){
    const next={...book,...validateBook(useLocal?book:remote),revision:remote.revision,dirty:useLocal,conflict:null,
      history:[historical(book),historical(remote),...(book.history||[])].slice(0,30),updatedAt:new Date().toISOString()};
    await db.putBook(scope,next);books=books.map(b=>b.id===id?next:b);$('review-dialog').close();
    if(active===id)paintEditor(next);render();await sync();
  }
  $('review-actions').append(button('Use cloud version',()=>choose(false)),button('Keep device version & sync',()=>choose(true)));
}
async function showHistory(){
  await saveDraft();const book=current();review('Version history');
  $('review-body').append(node('p','Up to 30 previous device editions are kept here. Cloud history is retained separately by the database.'));
  if(!book.history?.length)$('review-body').append(node('p','No previous editions yet.'));
  for(const version of book.history||[]){
    const row=node('div','','history-row');row.append(node('p',new Date(version.savedAt).toLocaleString()),node('h3',version.title),node('pre',version.content+'\n\nReading notes:\n'+version.notes));
    row.append(button('Restore this edition',async()=>{
      const next=await changeBook(current(),{...validateBook(version),id:book.id});paintEditor(next);$('review-dialog').close();await sync();
    }));$('review-body').append(row);
  }
}
function closePdf(){if(pdfUrl)URL.revokeObjectURL(pdfUrl);pdfUrl=null;$('pdf-view').removeAttribute('data');$('reference').hidden=true;$('remove-pdf').hidden=true;tools.target='article';$('tool-target').value='article';$('tool-target').querySelector('[value=pdf]').disabled=true;tools.applyView();}
function showPdf(file){closePdf();pdfUrl=URL.createObjectURL(file);$('pdf-view').data=pdfUrl;$('pdf-download').href=pdfUrl;$('pdf-name').textContent=file.name;$('reference').hidden=false;$('remove-pdf').hidden=false;$('tool-target').querySelector('[value=pdf]').disabled=false;}
function updateAccount(){
  $('email').readOnly=Boolean(cloud.session);
  if(cloud.session)$('email').value=cloud.session.user.email;
  $('credentials').hidden=Boolean(cloud.session);$('signed-in').hidden=!cloud.session;
  $('account-description').textContent=cloud.session?`Signed in as ${cloud.session.user.email}. Your library is private to this account.`:
    cloud.configured?'Sign in to use a private library across devices. Local articles stay separate.':'Cloud accounts are not configured in this preview. You can use the local library and export backups.';
  $('credentials').hidden=Boolean(cloud.session)||!cloud.configured;
  $('account-button').textContent=cloud.session?'My account':'Account';
}
async function authAction(kind){
  if(!tools.confirmLeave())return;
  await saveDraft();const email=$('email').value.trim(),password=$('password').value;
  if(!$('email').reportValidity())return;
  if(kind!=='recover'&&!$('password').reportValidity())return;
  $('account-status').textContent='Connecting…';
  try{
    if(kind==='recover'){await cloud.recover(email);$('account-status').textContent='If this address has an account, a reset link will arrive by email.';return;}
    if(kind==='signup'){
      const result=await cloud.signUp(email,password);
      if(result.access_token)await cloud.remember(result);
      else{$('account-status').textContent='Check your email to confirm your account, then sign in.';return;}
    }else await cloud.signIn(email,password);
    await loadScope();$('account-dialog').close();await sync();
  }catch(e){$('account-status').textContent=e.message;throw e;}
  finally{$('password').value='';}
}

$('new-book').onclick=()=>run(()=>createBook());
$('search').oninput=render;$('show-trash').onchange=render;
for(const id of ['title','language','content','notes'])$(id).oninput=()=>{
  editGeneration++;unsaved=true;status('Unsaved changes…');clearTimeout(timer);timer=setTimeout(()=>run(saveDraft,true),650);
};
$('save').onclick=()=>run(sync);
$('sync-library').onclick=()=>run(async()=>{if(!cloud.session){notify('Sign in to synchronize. Local articles remain on this device.');return;}await sync();});
$('back').onclick=()=>run(async()=>{if(!tools.confirmLeave())return;await saveDraft();tools.navigateAway();active=null;closePdf();$('workspace-view').hidden=true;$('library-view').hidden=false;render();});
$('import-text').onclick=()=>$('text-file').click();
$('text-file').onchange=()=>run(async()=>{
  const file=$('text-file').files[0];if(!file)return;
  try{if(file.size>2_000_000)throw new Error('Choose a text file smaller than 2 MB.');if(!/\.(txt|md)$/i.test(file.name))throw new Error('Choose a TXT or Markdown file.');
    const content=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
    await createBook(file.name.replace(/\.(txt|md)$/i,'').slice(0,200)||'Imported article',content);
  }finally{$('text-file').value='';}
});
$('attach-pdf').onclick=()=>$('pdf-file').click();
$('pdf-file').onchange=()=>run(async()=>{
  const file=$('pdf-file').files[0];if(!file)return;
  try{if(file.size>25_000_000)throw new Error('Choose a PDF smaller than 25 MB.');
    if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw new Error('This file does not have a PDF header.');
    await db.putAsset(scope,active,file);showPdf(file);notify('Reference PDF saved on this device. It is not uploaded or included in JSON backups.');
  }finally{$('pdf-file').value='';}
});
$('remove-pdf').onclick=()=>run(async()=>{await db.deleteAsset(scope,active);closePdf();});
$('history').onclick=()=>run(showHistory);
$('delete-book').onclick=()=>run(async()=>{
  if(!tools.confirmLeave())return;
  await saveDraft();await changeBook(current(),{deleted:true});active=null;closePdf();$('workspace-view').hidden=true;$('library-view').hidden=false;render();await sync();
});
$('export-text').onclick=()=>run(async()=>{await saveDraft();const b=current();download('reader-article.txt',`${b.title}\n\n${b.content}\n\nReading notes\n${b.notes}`,'text/plain;charset=utf-8');});
async function exportBackup(){
  await saveDraft();const payload=makeBackup(books);
  // Carry recovery editions as separate backup records without exposing tokens.
  payload.recovery=books.map(b=>({id:b.id,history:b.history||[],conflict:b.conflict?validateBook(b.conflict):null}));
  payload.study=await tools.exportStudy(books.map(book=>book.id));
  download(`reader-notes-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2));
  notify('Backup exported. Includes article text, notes, trash and recovery editions; excludes reference PDFs.');
}
$('backup').onclick=()=>run(exportBackup);
$('restore').onclick=()=>$('backup-file').click();
$('backup-file').onchange=()=>run(async()=>{
  const file=$('backup-file').files[0];if(!file)return;
  try{
    await saveDraft();if(file.size>25_000_000)throw new Error('Backup exceeds the 25 MB import limit.');
    const data=JSON.parse(await file.text()),incoming=validateBackup(data);
    const incomingWords=validateStudy(data.study,incoming.map(book=>book.id));
    const recovery=new Map();
    if(data.recovery!==undefined){
      if(!Array.isArray(data.recovery)||data.recovery.length>5000)throw new Error('Invalid recovery records.');
      for(const entry of data.recovery){
        if(!incoming.some(b=>b.id===entry.id)||!Array.isArray(entry.history)||entry.history.length>30||recovery.has(entry.id))throw new Error('Invalid recovery history.');
        recovery.set(entry.id,[...(entry.conflict?[validateBook(entry.conflict)]:[]),...entry.history.map(validateBook)].slice(0,30).map(b=>({...b,savedAt:new Date().toISOString()})));
      }
    }
    const duplicates=incoming.filter(b=>books.some(old=>old.id===b.id)).length;
    review('Import backup');$('review-body').append(node('p',`${incoming.length} articles, ${incomingWords.length} vocabulary entries, including ${incoming.filter(b=>b.deleted).length} articles in trash. ${duplicates} existing article IDs will be skipped. Destination: ${cloud.session?cloud.session.user.email:'local library'}.`),node('p','Only missing articles and their vocabulary will be added. Existing editions remain intact. Reference PDFs must be reattached.'));
    $('review-actions').append(button('Import missing articles',async()=>{
      const additions=incoming.filter(b=>!books.some(old=>old.id===b.id)).map(b=>({...b,revision:0,dirty:true,history:recovery.get(b.id)||[],updatedAt:new Date().toISOString()}));
      const existingWords=await db.getSetting(`vocabulary:${scope}`)||[],ids=new Set(existingWords.map(word=>word.id));
      const vocabulary=[...existingWords,...incomingWords.filter(word=>additions.some(book=>book.id===word.bookId)&&!ids.has(word.id))];
      await db.putBooks(scope,additions,vocabulary);books.push(...additions);await tools.activate();render();$('review-dialog').close();notify(`Imported ${additions.length} articles on this device. Use Sync now to upload account articles. Vocabulary remains on this device and in backups.`);
    }));
  }finally{$('backup-file').value='';}
});
$('account-button').onclick=()=>{updateAccount();$('account-status').textContent='';$('account-dialog').showModal();};
$('account-form').onsubmit=e=>{e.preventDefault();run(()=>authAction('signin'));};
$('sign-up').onclick=()=>run(()=>authAction('signup'));
$('forgot').onclick=()=>run(()=>authAction('recover'));
$('reauthenticate').onclick=()=>{$('credentials').hidden=false;$('password').focus();};
$('sign-out').onclick=()=>run(async()=>{
  if(!tools.confirmLeave())return;
  await saveDraft();
  if(books.some(b=>b.dirty||b.conflict)){
    review('Save your pending work');$('review-body').append(node('p','This account has device drafts or conflicts. Sync or export a backup before signing out. Signing out clears this account’s device cache.'));
    $('review-actions').append(button('Keep account open',()=>{$('review-dialog').close();$('account-dialog').close();}));return;
  }
  async function finish(){const oldScope=scope;tools.stop();await cloud.signOut();await db.clearAccount(oldScope);await loadScope();$('account-dialog').close();notify('Signed out on this device.');}
  const study=await tools.exportStudy(books.map(book=>book.id));
  if(study.vocabulary.length){
    review('Back up personal vocabulary');$('review-body').append(node('p','Vocabulary is saved on this device and has no cloud copy yet. Export a backup before signing out clears this account’s device cache.'));
    $('review-actions').append(button('Export backup & sign out',async()=>{await exportBackup();await finish();$('review-dialog').close();}));return;
  }
  await finish();
});
$('recovery-form').onsubmit=e=>{e.preventDefault();run(async()=>{
  $('recovery-status').textContent='Updating password…';
  try{await cloud.updatePassword($('new-password').value);$('new-password').value='';$('recovery-dialog').close();notify('Password updated.');}
  catch(error){$('recovery-status').textContent=error.message;throw error;}
});};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
window.addEventListener('beforeunload',e=>{if(unsaved||busy||tools.wordDirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('online',()=>run(sync));
setInterval(()=>{if(!busy&&!unsaved&&cloud.session&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName))run(sync);},60_000);
await run(async()=>{
  await db.openStore();await cloud.restore();
  let authReturn=false,linkError;
  if(cloud.configured&&/(access_token|error)=/.test(location.hash)){
    const hash=location.hash;history.replaceState(null,'',location.pathname+location.search);
    try{authReturn=await cloud.acceptAuthReturn(hash);}catch(error){linkError=error;}
  }
  await loadScope();if(authReturn==='recovery')$('recovery-dialog').showModal();
  if(cloud.session&&navigator.onLine)await sync();
  if(linkError)notify(linkError.message,true);
  else if(authReturn==='signup')notify('Email confirmed. You are signed in to your private library.');
});
