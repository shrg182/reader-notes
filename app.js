import {PdfLibrary} from './pdf-library.js';
import {LinkImporter} from './link-import.js';
import {DemoLibrary} from './demo-library.js';
import {StudyEdition} from './study-edition.js';
import {studyEdition,studyProtected} from './study-model.js';
import {LibraryOrganizer} from './library-organizer.js';
import {TAXONOMY} from './library-taxonomy.js';
import {RichEditor} from './rich-editor.js';
import {catalogTitle,articleRows,classifyImport,groupedBooks} from './library-groups.js';
import {CompleteMigration} from './migration-complete-ui.js';
import {validateBook,validateBackup,makeBackup,mergeRemote,sameEdition} from './core.js';
import * as db from './storage.js';
import {Cloud} from './cloud.js';
import {ReaderTools} from './toolbar.js';
import {validateStudy} from './toolbar-model.js';
import {StudioMigration} from './migration-ui.js';
import {ReaderSharing} from './sharing-ui.js';
import {validateSharingBackup,uuid} from './sharing-model.js';

const $=id=>document.getElementById(id);
const cloud=new Cloud(window.READER_CONFIG);
let scope='local', books=[], active=null, unsaved=false, busy=false, timer, pdfUrl, editGeneration=0;
let accountLock=null, ready=false,installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
const libraryExpansion=new Map();
let readingActivity={},originalActivity={},activityToken=0,pdfBooks=new Set();
async function loadActivity(){
 const token=++activityToken,owner=scope;const visits=await db.getSetting(`reading:${owner}`)||{};if(token!==activityToken)return;readingActivity=visits;originalActivity={};
 const signature=complete.meta.filter(m=>m.kind==='study').map(m=>m.id+':'+(m.fingerprint||'')).sort().join('|');
 const cached=await db.getSetting(`catalog-activity:${owner}`);if(token!==activityToken)return;
 if(cached?.signature===signature){originalActivity=cached.data;render();return;}
 const result={};try{for(const meta of complete.meta.filter(m=>m.kind==='study')){const key=`import-record:${owner}:${meta.id}`;let record=await db.getSetting(key);if(token!==activityToken||owner!==scope)return;if(!record){record=await cloud.importPayload(meta.id);if(token!==activityToken||owner!==scope)return;if(!record)throw Error('History unavailable');await db.setSetting(key,record);}if(token!==activityToken||owner!==scope)return;for(const r of record.payload.records||[])if(['reading-workspace-history-v1','reading-workspace-editing-history-v1'].includes(r.key))result[r.key]=r.value;}
 if(token!==activityToken)return;originalActivity=result;if(Object.keys(result).length)await db.setSetting(`catalog-activity:${owner}`,{signature,data:result});render();}catch{if(token===activityToken)notify('Reading history could not be loaded. Original records remain preserved.',true);}
}
function activityText(row){const past=originalActivity['reading-workspace-history-v1']?.[row.path],local=readingActivity[row.id];const count=(Number(past?.count)||0)+(Number(local?.count)||0);const last=[past?.lastRead,local?.lastRead].filter(Boolean).sort().at(-1);return count?`Read ${count} ${count===1?'time':'times'}${last?' · '+new Date(last).toLocaleDateString():''}`:'Not recorded';}
const notify=(message,error=false)=>{ $('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').classList.toggle('quiet-sync',!error&&message==='Library synchronized.');if(error)$('sync-indicator').textContent='Attention'; };
let lastSync=null;
const status=message=>{$('save-status').textContent=message;};
const tools=new ReaderTools({context:()=>({scope,book:current(),books,hasPdf:Boolean(pdfUrl)}),run,notify,openSource:openBook});
const migration=new StudioMigration({run,notify,context:()=>({scope,books,label:cloud.session?`private library (${cloud.session.user.email})`:'local library on this browser'}),onImported:async()=>{books=await db.listBooks(scope);render();}});
const sharing=new ReaderSharing({cloud,context:()=>({scope,book:current(),books}),run,notify,saveBook:saveDraft,syncBook:sync});
const complete=new CompleteMigration({cloud,context:()=>({scope,books,book:current()}),run,notify,onOpenEdition:openBook,onImported:async()=>{await sync();await complete.activate();}});
const rich=new RichEditor({context:()=>({scope,books,book:current()}),notify,
  onDirty:()=>{unsaved=true;editGeneration++;status('Unsaved rich edits…');},
  onState:values=>{if(!current())return;if(rich.value!==current().richState||values.content!==$('content').value){$('content').value=values.content;unsaved=true;editGeneration++;clearTimeout(timer);timer=setTimeout(()=>run(saveDraft,true),800);}},
  onAction:async m=>{if(m.action==='sync')return run(sync);if(m.action==='library'||m.action==='collection')return run(async()=>{const group=classifyImport(complete.meta.find(x=>x.bookId===active));if(!await returnToLibrary())return;if(m.action==='collection'){$('library-category').value=group.category;render();$('library-collection').value=group.collection;render();}});if(m.action==='offline'){review('Offline reading');$('review-body').append(node('p','Previously opened working editions and their saved media remain on this device. Connect once to prepare an imported original. Offline edits stay queued for account synchronization; export backups before clearing browser data.'));return;}if(m.action==='install'){if(installPrompt){await installPrompt.prompt();installPrompt=null;}else{review('Install Reader Notes');$('review-body').append(node('p','Use your browser’s Install app command, or Add to Home Screen on your phone. The app must first be opened online to prepare offline reading.'));}return;}if(m.action==='account')$('account-button').click();if(m.action==='sharing')return run(async()=>{await saveDraft();await sharing.openOwn();});if(m.action==='backup')return run(exportBackup);if(m.action==='source'&&/^https?:\/\//.test(m.url||'')){review('Original source');const a=node('a','Open original source');a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';$('review-body').append(a);return;}if(m.action==='dictionary'||m.action==='settings'){document.body.classList.add('studio-extras-open');if(m.action==='dictionary'){await tools.revealDictionary();$('import-dictionary-query').focus();}}}
});
tools.rich=rich;rich.onLoaded=()=>tools.syncRichPanels();
rich.onSelection=value=>{tools.selected=value;};
const pdfLibrary=new PdfLibrary({editArticle:id=>openBook(id),getArticles:()=>books.filter(b=>!b.deleted).map(b=>({id:b.id,title:b.title,content:b.content})),cloud,context:()=>({scope,busy}),notify,run,onChanged:()=>{render();updateAccount();},
 onOpen:async()=>{linkImports.showSource(null);if(!tools.confirmLeave())throw Error('Save your vocabulary changes first.');await saveDraft();rich.close();closePdf();active=null;$('library-view').hidden=true;$('workspace-view').hidden=true;},
 onClose:()=>{$('library-view').hidden=false;render();}
});
const linkImports=new LinkImporter({cloud,pdfs:pdfLibrary,context:()=>({scope}),notify,run,openText:id=>openBook(id),onChanged:refreshLinkResults});
async function refreshLinkResults(results=[]){const owner=scope;for(const result of results.filter(r=>r.kind==='text')){const data=await cloud.request('/rest/v1/reader_documents?select=*&id=eq.'+encodeURIComponent(result.id),{token:await cloud.token()});if(owner!==scope)return;const record=Array.isArray(data)?data.find(r=>r.id===result.id):null;if(!record)throw Error('The imported article is unavailable. Refresh the Library.');validateBook(record);const next=mergeRemote(books.find(b=>b.id===record.id),record);await db.putBook(owner,next);if(owner!==scope)return;books=books.filter(b=>b.id!==next.id);books.push(next);}if(owner!==scope)return;await pdfLibrary.refresh();if(owner===scope){render();updateAccount();}}
const organizer=new LibraryOrganizer({cloud,pdfs:pdfLibrary,context:()=>({scope,busy}),rename:renameLibraryArticle,getBooks:()=>libraryBooks(),metadata:()=>complete.meta,onChanged:()=>{render();updateAccount();},run,notify,getSource:id=>linkImports.sources.find(s=>s.id===id)});
const study=new StudyEdition({cloud,context:()=>({scope,book:current()}),source:id=>linkImports.sources.find(s=>s.id===id),saveDraft,apply:applyStudyEdition,run});
const demo=new DemoLibrary({cloud,context:()=>({scope}),run,notify,beforeOpen:returnToLibrary,onClose:()=>{$('library-view').hidden=false;render();}});
linkImports.organizer=organizer;linkImports.installPlacementControls();
function libraryBooks(){const categoryIndex=new Map(pdfLibrary.categoryOptions().map(c=>[c.id,c.title]));return [...books.map(book=>{const category=pdfLibrary.assignments.find(a=>a.document_id===book.id);return category?{...book,categoryId:category.category_id,categoryTitle:categoryIndex.get(category.category_id)||'My reading materials'}:book;}),...pdfLibrary.books].map(book=>organizer.enabled?organizer.decorate(book):book);}
function node(tag,text,className){const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;return n;}
function button(text,fn){const b=node('button',text);b.onclick=()=>run(fn);return b;}
function download(name,data,type='application/json'){
  const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function run(fn,allowTyping=false){
  if(busy)return;
  busy=true;
  const controls=[...document.querySelectorAll('button,input,textarea,select')].filter(el=>!el.closest('#pdf-import-dialog')&&!el.disabled&&(!allowTyping||el.matches('button,select,input[type=checkbox],input[type=radio]')));
  controls.forEach(el=>el.disabled=true);
  try{await fn();}catch(e){notify(e.message||'The operation failed.',true);if(active)status(unsaved?'Not saved — retry Save & sync':'Device draft retained · sync incomplete');}
  finally{controls.forEach(el=>el.disabled=!ready);if(ready){tools.availability();sharing.availability();$('sync-library').disabled=!cloud.session;$('account-publications').disabled=!cloud.session||!cloud.sharingReady;}document.querySelector('main').inert=false;document.querySelector('.topbar').inert=false;busy=false;pdfLibrary.mixed.focusChanged(pdfLibrary.focusedPane);}
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
  ready=false;rich.close();demo.reset();study.reset();organizer.reset();pdfLibrary.reset();
  const next=cloud.session?`account:${cloud.session.user.id}`:'local';
  await acquireLock(next);
  activityToken++;readingActivity={};originalActivity={};libraryExpansion.clear();scope=next;lastSync=await db.getSetting(`last-sync:${scope}`)||null;pdfBooks=new Set((await db.listAssets(scope)).filter(a=>!['cloud-pdf:','device-pdf:','mixed-file:'].some(prefix=>a.key.slice(scope.length+1).startsWith(prefix))).map(a=>a.key.slice(scope.length+1)));books=await db.listBooks(scope);active=null;unsaved=false;closePdf();
  sharing.reset();migration.reset();
  for(const id of ['title','language','content','notes'])$(id).value='';
  $('review-dialog').close();$('review-body').replaceChildren();$('review-actions').replaceChildren();
  $('workspace-view').hidden=true;$('library-view').hidden=false;
  $('identity').textContent=cloud.session?'Private library':'Local library · this browser';
  await tools.activate();await complete.activate();await pdfLibrary.activate();await linkImports.activate();await organizer.activate();await demo.activate().catch(error=>notify(error.message,true));render();void loadActivity();updateAccount();ready=true;document.querySelector('main').inert=false;document.querySelector('.topbar').inert=false;if(demo.rows.length&&!books.some(b=>!b.deleted)&&!pdfLibrary.books.length)await demo.open();
}
function render(){
  const query=$('search').value.toLocaleLowerCase(),trash=$('show-trash').checked;
  const candidates=libraryBooks().filter(b=>b.deleted===trash);
  const visible=articleRows(candidates,complete.meta).filter(row=>row.editions.some(b=>`${b.title} ${b.content} ${b.notes} ${b.collectionTitle||classifyImport(complete.meta.find(m=>m.bookId===b.id)).collectionTitle}`.toLocaleLowerCase().includes(query))).flatMap(row=>row.editions);
  const allGroups=groupedBooks(candidates,complete.meta),selectedCategory=$('library-category').value,selectedCollection=$('library-collection').value;
  function options(select,items,all){const previous=select.value;select.replaceChildren(new Option(all,''));for(const [id,title,count] of items)select.add(new Option(`${title} (${count})`,id));select.value=items.some(x=>x[0]===previous)?previous:'';}
  const categoryMap=new Map();for(const g of allGroups){const old=categoryMap.get(g.category);categoryMap.set(g.category,[g.category,g.categoryTitle,(old?.[2]||0)+articleRows(g.books,complete.meta).length]);}
  options($('library-category'),[...categoryMap.values()],'All categories');
  options($('library-collection'),allGroups.filter(g=>g.collection&&(!$('library-category').value||g.category===$('library-category').value)).map(g=>[g.collection,g.collectionTitle,articleRows(g.books,complete.meta).length]),'All collections');
  const groups=groupedBooks(visible,complete.meta).filter(g=>(!$('library-category').value||g.category===$('library-category').value)&&(!$('library-collection').value||g.collection===$('library-collection').value));
  $('books').replaceChildren();const categoryNodes=new Map();let shown=0;
  for(const group of groups){
    let category=categoryNodes.get(group.category);
    if(!category){category=node('details','','library-category-group');category.open=libraryExpansion.get('category:'+group.category)??true;category.ontoggle=()=>libraryExpansion.set('category:'+group.category,category.open);const total=groups.filter(g=>g.category===group.category).reduce((n,g)=>n+articleRows(g.books,complete.meta).length,0);const heading=node('summary');heading.append(node('strong',group.categoryTitle),node('small',TAXONOMY.CATEGORIES[group.category]?.[1]||''),node('span',`${total} articles`,'category-count'));category.append(heading);if(organizer.enabled&&!trash)organizer.bindGroupDrop(heading,{category:group.category,categoryTitle:group.categoryTitle,collection:'',collectionTitle:''});categoryNodes.set(group.category,category);$('books').append(category);}
    let collection=category;
    if(group.collection){collection=node('details','','library-collection-group');collection.open=Boolean(query||$('library-collection').value||(libraryExpansion.get('collection:'+group.collection)??groups.length===1));collection.ontoggle=()=>libraryExpansion.set('collection:'+group.collection,collection.open);const summary=node('summary',group.collectionTitle);collection.append(summary);if(organizer.enabled&&!trash)organizer.bindGroupDrop(summary,group);category.append(collection);}
    const ordered=articleRows(group.books,complete.meta);
    for(const row of ordered){
      const book=row.book;shown++;const card=node('article','','book');
      const title=node('h2');if(trash)title.textContent=catalogTitle(row.title,group.collectionTitle);else{const link=button(catalogTitle(row.title,group.collectionTitle),()=>book.kind==='pdf'?pdfLibrary.open(book.id):pdfLibrary.workspace.has('article:'+book.id)?pdfLibrary.workspace.openSource('article:'+book.id):openBook(book.id));link.className='article-title';link.title=row.title;title.append(link);}
      const reading=node('p',book.kind==='pdf'?(book.completed?'Read · PDF':book.status==='uploading'?'PDF · Upload incomplete':'PDF · Page '+(pdfLibrary.findRecord(book.id)?.last_page||1)):activityText(row));reading.title='Original imported history plus visits on this browser. New visit counts remain on this device.';
      const editing=originalActivity['reading-workspace-editing-history-v1']?.[row.path];
      const lastEdit=book.history?.length?book.updatedAt:editing?.lastEdited;
      const save=node('p',book.kind==='pdf'?(book.deviceOnly?'On this device only':book.status==='uploading'?'Upload paused or incomplete':book.status==='deleting'?'Deletion incomplete · retry in Trash':'Private cloud PDF'):(lastEdit?'Edited '+new Date(lastEdit).toLocaleDateString():'Editing history not recorded')+' · '+(book.conflict?'Conflict needs review':book.dirty?(cloud.session?'Waiting to sync':'Saved on device'):'Synced'));
      card.append(title,reading,save);const actions=node('div','','actions');
      if(book.kind==='pdf'){const record=pdfLibrary.findRecord(book.id);if(trash){if(record.status==='ready')actions.append(button('Restore PDF',()=>pdfLibrary.restore(record)));actions.append(button(record.status==='deleting'?'Retry permanent deletion':'Delete permanently',()=>pdfLibrary.confirmDelete(record)));}else{if(record.status==='uploading')actions.append(button('Resume upload',()=>pdfLibrary.openImport(record)));else actions.append(button('Details & category',()=>pdfLibrary.edit(record)));if(organizer.enabled)actions.append(button('Move / Organize',()=>organizer.show(book.id)));actions.append(button('Move to trash',()=>pdfLibrary.trash(record)));}}
      else if(trash)actions.append(button('Restore article',async()=>{await changeBook(book,{deleted:false});await sync();}));
      else actions.append(button('Sharing',async()=>{await openBook(book.id);await sharing.openOwn();}));

      if(book.kind!=='pdf'&&!trash&&pdfLibrary.available)actions.append(organizer.enabled?button('Move / Organize',()=>organizer.show(book.id)):button('Category',async()=>{await sync();await pdfLibrary.edit(books.find(b=>b.id===book.id),{article:true});}));
      const pdfEdition=row.editions.find(b=>pdfBooks.has(b.id));if(pdfEdition&&!trash)actions.append(button('PDF',()=>openBook(pdfEdition.id)));
      if(book.conflict)actions.append(button('Review conflict',()=>reviewConflict(book.id)));
      card.append(actions);if(organizer.enabled&&!trash)organizer.bindDrag(card,row,group);collection.append(card);
    }
  }
  $('filter-label').textContent='Filters'+(($('library-category').value?1:0)+($('library-collection').value?1:0)+(trash?1:0)?' · '+(($('library-category').value?1:0)+($('library-collection').value?1:0)+(trash?1:0)):'');
  $('library-count').textContent=`${shown} ${shown===1?'article':'articles'}`;
  if(!shown)$('books').append(node('div',trash?'Trash is empty.':query||selectedCategory||selectedCollection?'No matching articles.':'Your reading room starts here. Create an article or import a text file.','empty'));
}

function current(){return books.find(b=>b.id===active);}
function paintEditor(book){
  study.paint(book);$('title').value=book.title;$('language').value=book.language;
  $('content').value=book.content;$('notes').value=book.notes;
  unsaved=false;status(book.conflict?'Conflict needs review':book.dirty?(cloud.session?'Saved on this device · waiting to sync':'Saved on this device'):'Synced');
}
async function hydrateRich(book){const meta=complete.meta.find(x=>x.bookId===book.id);const record=meta&&!book.richState?await complete.record(meta):null;const sourceUrl=linkImports.sources.find(s=>s.id===book.id)?.original_url;const correctionMeta=complete.meta.find(x=>x.kind==='corrections');let dictionaryOverrides;try{dictionaryOverrides=correctionMeta?(await complete.record(correctionMeta)).payload.overrides:undefined;}catch{}await rich.open(book,{...record?.payload,sourceUrl,...(dictionaryOverrides?{dictionaryOverrides}:{})});const view=tools.profile.views?.[`${book.id}:${tools.target}`];if(view)rich.tool('view',view);}
async function openBook(id){
  if(!tools.confirmLeave())return;
  await pdfLibrary.flush();pdfLibrary.close();
  await saveDraft();rich.close();closePdf();active=id;paintEditor(current());linkImports.showSource(id);
  $('library-view').hidden=true;$('workspace-view').hidden=false;
  const asset=await db.getAsset(scope,id);if(asset)showPdf(asset.file);
  await tools.activate();await complete.activate();
  if(window.READER_CONFIG.richEditorEnabled)await hydrateRich(current());
  else $('title').focus();
  const meta=complete.meta.find(m=>m.bookId===id),key=articleRows([current()],meta?[meta]:[])[0].id;
  readingActivity[key]={count:(readingActivity[key]?.count||0)+1,lastRead:new Date().toISOString()};await db.setSetting(`reading:${scope}`,readingActivity);
}
async function applyStudyEdition(preview,result,mode){
 await saveDraft();const book=current();if(!book||book.id!==preview.id||book.content!==preview.content||book.richState!==preview.richState)throw Error('Article changed since preview. Close and prepare again.');if(book.conflict)throw Error('Resolve the article conflict first.');if(mode!=='copy'&&studyProtected(book,result.text))throw Error('Existing edits are protected. Create an annotated copy instead.');
 const prepared=studyEdition(book,result);rich.close();let target;
 if(mode==='copy'){target={id:crypto.randomUUID(),title:book.title.slice(0,190)+' · 校读稿',language:book.language,notes:book.notes,deleted:false,revision:0,dirty:true,history:[],updatedAt:new Date().toISOString(),...prepared};validateBook(target);await db.putBook(scope,target);books.push(target);}else target=await changeBook(book,prepared);
 paintEditor(book);unsaved=false;
 try{if(cloud.session){const response=await cloud.save(target);if(!response.document)throw Error('Saved on this device. Retry Save & sync.');const next=response.conflict?{...target,conflict:response.document}:{...target,...validateBook(response.document),revision:response.document.revision,dirty:false,conflict:null};await db.putBook(scope,next);books=books.map(b=>b.id===next.id?next:b);if(response.conflict){await openBook(target.id);throw Error('Cloud revision changed. Both versions retained; review the conflict.');}}
 if(mode==='copy'&&organizer.enabled){const original=libraryBooks().find(b=>b.id===book.id),group=groupedBooks([original],complete.meta)[0];await organizer.move(target,[target.id],{category:group.category,categoryTitle:group.categoryTitle,collection:group.collection==='personal'?'':group.collection,collectionTitle:group.collection==='personal'?'':group.collectionTitle,side:'end',anchor:null});}
 await openBook(target.id);render();notify('校读稿已保存。来源注释与译文已分层；无 AI 费用。');}catch(error){await openBook(target.id);throw error;}
}
async function renameLibraryArticle(book,ids,title){
 if(!title||title.length>200)throw Error('Enter a title of up to 200 characters.');
 if(book.kind==='pdf'){await pdfLibrary.flush();const record=pdfLibrary.findRecord(book.id);await pdfLibrary.change(record,'update',{title});if(pdfLibrary.active?.id===book.id)pdfLibrary.paint(pdfLibrary.active);render();return;}
 await saveDraft();if(ids.some(id=>books.find(b=>b.id===id)?.conflict))throw Error('Resolve the article conflict before renaming it.');
 for(const id of ids){let currentBook=books.find(b=>b.id===id);if(!currentBook||currentBook.deleted)throw Error('Article unavailable.');if(currentBook.title!==title)currentBook=await changeBook(currentBook,{title});
  if(cloud.session&&currentBook.dirty){const result=await cloud.save(currentBook);if(!result.document)throw Error('Title saved on this device; cloud save must be retried.');const next=result.conflict?{...currentBook,conflict:result.document}:{...currentBook,...validateBook(result.document),revision:result.document.revision,dirty:false,conflict:null};await db.putBook(scope,next);books=books.map(b=>b.id===id?next:b);if(result.conflict)throw Error('Title changed on another device. Review the conflict; both versions are retained.');}
 }
 if(ids.includes(active)){paintEditor(current());if(rich.loaded)await hydrateRich(current());}render();updateAccount();
}
function historical(book){return {...validateBook(book),savedAt:book.updatedAt||new Date().toISOString()};}
async function changeBook(book,changes){
  const next={...book,...changes,dirty:true,updatedAt:new Date().toISOString(),history:[historical(book),...(book.history||[])].slice(0,30)};
  validateBook(next);await db.putBook(scope,next);books=books.map(b=>b.id===next.id?next:b);render();return next;
}
async function saveDraft(){
  await pdfLibrary.draftWrite;clearTimeout(timer);
  if(active&&rich.loaded)await rich.flush();
  if(!active||!unsaved)return;
  const generation=editGeneration;
  const values={title:$('title').value.trim()||'Untitled article',language:$('language').value,
    content:$('content').value,notes:$('notes').value,...(rich.loaded&&rich.value?{richState:rich.value}:{})};
  const book=current();validateBook({...book,...values});
  if(!sameEdition(book,{...book,...values}))await changeBook(book,values);
  unsaved=generation!==editGeneration;rich.saved(cloud.session?'已保存到设备 · 云端同步由账户管理':'已保存到本机');
  status(unsaved?'Unsaved changes…':cloud.session?'Saved on this device · waiting to sync':'Saved on this device');updateAccount();
}
async function createBook(title='Untitled article',content=''){
  await pdfLibrary.flush();pdfLibrary.close();await saveDraft();
  const book={id:crypto.randomUUID(),title,language:'',content,notes:'',deleted:false,revision:0,dirty:true,history:[],updatedAt:new Date().toISOString()};
  validateBook(book);await db.putBook(scope,book);books.push(book);await openBook(book.id);
}
async function sync(){
  await saveDraft();const syncGeneration=editGeneration;
  if(!cloud.session){render();return;}
  status('Syncing…');$('sync-indicator').textContent='Syncing…';
  // Persist each result before the next request. Interrupted runs retain the rest.
  for(const original of [...books].filter(b=>b.dirty&&!b.conflict)){
    const result=await cloud.save(original);
    if(!result.document)throw new Error('Cloud returned an invalid document response.');
    const next=result.conflict?{...original,conflict:result.document}:
      {...original,...validateBook(result.document),dirty:false,conflict:null,revision:result.document.revision};
    await db.putBook(scope,next);books=books.map(b=>b.id===next.id?next:b);
  }
  if(pdfLibrary.available){await pdfLibrary.refresh();await pdfLibrary.flush();await organizer.refresh();}
  const remote=await cloud.list();
  if(!Array.isArray(remote))throw new Error('Cloud returned an invalid library.');
  const merged=new Map(books.map(b=>[b.id,b]));
  for(const record of remote){validateBook(record);merged.set(record.id,mergeRemote(merged.get(record.id),record));}
  const next=[...merged.values()];await db.putBooks(scope,next);books=next;render();
  if(active){const book=current();if(!rich.loaded||editGeneration===syncGeneration){paintEditor(book);if(rich.loaded&&(book.richState??null)!==rich.value)await hydrateRich(book);}if(book.deleted){active=null;rich.close();$('workspace-view').hidden=true;$('library-view').hidden=false;closePdf();}}
  const conflicts=books.filter(b=>b.conflict).length;
  if(cloud.config.migrationEnabled){await complete.refresh();render();void loadActivity();}
  lastSync=new Date().toISOString();await db.setSetting(`last-sync:${scope}`,lastSync);updateAccount();
  rich.saved(conflicts?'同步冲突：两个版本均已保留':'已保存并同步');
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
    if(active===id){paintEditor(next);if(window.READER_CONFIG.richEditorEnabled)await hydrateRich(next);}render();await sync();
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
      const next=await changeBook(current(),{...validateBook(version),id:book.id,richState:version.richState??null});paintEditor(next);if(window.READER_CONFIG.richEditorEnabled)await hydrateRich(next);$('review-dialog').close();await sync();
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
  $('account-button').textContent='My Account';
  const pending=books.filter(b=>b.dirty||b.conflict).length+Object.keys(pdfLibrary.drafts).length+(pdfLibrary.uploading?1:0);
  $('sync-indicator').textContent=!navigator.onLine?'Offline':cloud.session?(pending?'Pending':lastSync?'✓ Synced':'Not synced'):'Local';
  $('account-sync-status').textContent=cloud.session?`${lastSync?'Last successful library sync: '+new Date(lastSync).toLocaleString():'No successful library sync recorded on this device.'}${pending?' '+pending+' editions have pending changes or conflicts.':''} Synchronization runs when signing in, saving, or reconnecting.`:'Local library stays on this browser. Sign in to synchronize a separate private account library.';
  $('account-library-count').textContent=`${articleRows(books.filter(b=>!b.deleted),complete.meta).length} articles · ${books.filter(b=>!b.deleted).length} working editions in ${groupedBooks(books.filter(b=>!b.deleted),complete.meta).length} collections · ${books.filter(b=>b.deleted).length} in trash · ${pdfBooks.size} device-only PDF attachments · ${pdfLibrary.records.filter(r=>r.status==='ready'&&!r.deleted).length} cloud PDFs · ${pdfLibrary.device.records.filter(r=>!r.deleted).length} device-only PDFs`;
  $('account-publications').disabled=!cloud.session||!cloud.sharingReady;
  $('sync-library').disabled=!cloud.session;
}
async function showMyPublications(){
 if(!cloud.session||!cloud.sharingReady)throw Error('Sign in to review your publications.');
 const owner=cloud.session.user.id;
 async function all(table,fields){const rows=[];for(let offset=0;;offset+=1000){const page=await cloud.sharingRead(`${table}?select=${fields}&owner_id=eq.${encodeURIComponent(owner)}&visibility=neq.private&order=updated_at.desc&limit=1000&offset=${offset}`);rows.push(...page);if(page.length<1000)return rows;}}
 const sources=await all('reader_publications','id,document_id,title,visibility,updated_at');
 const contributions=await all('reader_shared_contributions','id,source_id,kind,visibility,updated_at');
 review('My publications');const body=$('review-body');body.append(node('p','These are your currently public or group snapshots. Private working drafts remain separate.'));
 if(!sources.length&&!contributions.length)body.append(node('p','You have no published editions or contributions. Use an article’s Sharing controls to review and publish.'));
 for(const source of sources){const row=node('article','','contribution-card');row.append(node('h3',source.title),node('p',source.visibility==='public'?'Public edition':'Group edition'));row.append(button('Manage sharing',async()=>{const book=books.find(b=>b.id===source.document_id);$('review-dialog').close();$('account-dialog').close();if(book){await openBook(book.id);await sharing.openOwn();}else await sharing.openSource(source.id);}));body.append(row);}
 for(const contribution of contributions){const row=node('article','','contribution-card');row.append(node('h3',contribution.kind),node('p',contribution.visibility==='public'?'Public contribution':'Group contribution'),button('Open source & contributions',async()=>{$('review-dialog').close();$('account-dialog').close();await sharing.openSource(contribution.source_id);}));body.append(row);}
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
$('library-category').onchange=()=>{$('library-collection').value='';render();};
$('library-collection').onchange=render;
$('search').oninput=render;$('show-trash').onchange=render;
for(const id of ['title','language','content','notes'])$(id).oninput=()=>{
  editGeneration++;unsaved=true;status('Unsaved changes…');clearTimeout(timer);timer=setTimeout(()=>run(saveDraft,true),650);
};
$('save').onclick=()=>run(sync);
$('sync-library').onclick=()=>run(async()=>{if(!cloud.session){notify('Sign in to synchronize. Local articles remain on this device.');return;}await sync();});
async function returnToLibrary(){if(!tools.confirmLeave())return false;await pdfLibrary.flush();await saveDraft();pdfLibrary.close();demo.close();rich.close();tools.navigateAway();active=null;closePdf();$('workspace-view').hidden=true;$('library-view').hidden=false;render();return true;}
$('back').onclick=()=>run(returnToLibrary);
// Only lightweight menus dismiss on outside click; editing dialogs keep their input.
const popupSelector='#library-filters,.library-tools-menu,.header-tool-settings,.edition-menu';
function closePopups(inside=null){for(const popup of document.querySelectorAll(popupSelector))if(popup.open&&(!inside||!popup.contains(inside)))popup.open=false;}
document.addEventListener('click',event=>closePopups(event.target));
document.addEventListener('toggle',event=>{if(event.target.matches?.(popupSelector)&&event.target.open)closePopups(event.target);},true);
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const open=[...document.querySelectorAll(popupSelector)].filter(p=>p.open);if(!open.length)return;const focused=open.find(p=>p.contains(document.activeElement));closePopups();focused?.querySelector('summary')?.focus();event.preventDefault();event.stopPropagation();});
document.querySelector('.brand').onclick=event=>{
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();run(async()=>{if(!await returnToLibrary())return;$('search').value='';$('library-category').value='';$('library-collection').value='';$('show-trash').checked=false;libraryExpansion.clear();closePopups();organizer.undoNode.hidden=true;linkImports.showSource(null);render();if(location.hash!=='#library')location.hash='library';window.scrollTo({top:0,behavior:'instant'});});
};

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
  try{if(file.size>128_000_000)throw new Error('Choose a PDF smaller than 25 MB.');
    if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw new Error('This file does not have a PDF header.');
    await db.putAsset(scope,active,file);pdfBooks.add(active);showPdf(file);notify('Reference PDF saved on this device. It is not uploaded or included in JSON backups.');
  }finally{$('pdf-file').value='';}
});
$('remove-pdf').onclick=()=>run(async()=>{await db.deleteAsset(scope,active);pdfBooks.delete(active);closePdf();});
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
  payload.sharing=await sharing.exportData();
  download(`reader-notes-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2));
  notify('Backup exported. Includes article text, notes, contributions, trash and recovery editions; excludes reference PDFs and migration archives.');
}
$('backup').onclick=()=>run(exportBackup);
$('restore').onclick=()=>$('backup-file').click();
$('backup-file').onchange=()=>run(async()=>{
  const file=$('backup-file').files[0];if(!file)return;
  try{
    await saveDraft();if(file.size>128_000_000)throw new Error('Backup exceeds the 128 MB import limit.');
    const data=JSON.parse(await file.text()),incoming=validateBackup(data);
    const incomingWords=validateStudy(data.study,incoming.map(book=>book.id));
    const incomingContributions=validateSharingBackup(data.sharing,[...new Set([...incoming,...books].map(book=>book.id))]);
    const recovery=new Map();
    if(data.recovery!==undefined){
      if(!Array.isArray(data.recovery)||data.recovery.length>5000)throw new Error('Invalid recovery records.');
      for(const entry of data.recovery){
        if(!incoming.some(b=>b.id===entry.id)||!Array.isArray(entry.history)||entry.history.length>30||recovery.has(entry.id))throw new Error('Invalid recovery history.');
        recovery.set(entry.id,[...(entry.conflict?[validateBook(entry.conflict)]:[]),...entry.history.map(validateBook)].slice(0,30).map(b=>({...b,savedAt:new Date().toISOString()})));
      }
    }
    const duplicates=incoming.filter(b=>books.some(old=>old.id===b.id)).length;
    review('Import backup');$('review-body').append(node('p',`${incoming.length} articles, ${incomingWords.length} vocabulary entries and ${incomingContributions.length} contributions, including ${incoming.filter(b=>b.deleted).length} articles in trash. ${duplicates} existing article IDs will be skipped. Destination: ${cloud.session?cloud.session.user.email:'local library'}.`),node('p','Only missing articles and their vocabulary will be added. Contributions restore as private drafts; no public/group publication is restored automatically. Existing editions remain intact. Reference PDFs must be reattached.'));
    $('review-actions').append(button('Import missing articles',async()=>{
      const additions=incoming.filter(b=>!books.some(old=>old.id===b.id)).map(b=>({...b,revision:0,dirty:true,history:recovery.get(b.id)||[],updatedAt:new Date().toISOString()}));
      const existingWords=await db.getSetting(`vocabulary:${scope}`)||[],ids=new Set(existingWords.map(word=>word.id));
      const vocabulary=[...existingWords,...incomingWords.filter(word=>additions.some(book=>book.id===word.bookId)&&!ids.has(word.id))];
      const existingContributions=await db.getSetting(`contributions:${scope}`)||[],noteIds=new Set(existingContributions.flatMap(draft=>[draft.id,draft.originId].filter(Boolean)));
      const newContributions=incomingContributions.filter(draft=>!noteIds.has(draft.originId||draft.id)).map(draft=>({...draft,id:crypto.randomUUID(),originId:draft.originId||draft.id,visibility:'private',groupIds:[],dirty:true,cloudRevision:0}));
      await db.putBooks(scope,additions,vocabulary,[...existingContributions,...newContributions]);books.push(...additions);await tools.activate();render();$('review-dialog').close();notify(`Imported ${additions.length} articles and ${newContributions.length} private contribution drafts on this device. No publication was performed.`);
    }));
  }finally{$('backup-file').value='';}
});
$('sync-indicator').onclick=()=>$('account-button').click();
$('account-preferences').onclick=()=>tools.openSettings('defaults');
$('account-password').onclick=()=>run(async()=>{await cloud.recover(cloud.session.user.email);$('account-status').textContent='A password reset link has been requested for your account email.';});
$('account-publications').onclick=()=>run(showMyPublications);
$('account-button').onclick=()=>{updateAccount();$('account-status').textContent='';$('account-dialog').showModal();};
$('account-form').onsubmit=e=>{e.preventDefault();run(()=>authAction('signin'));};
$('sign-up').onclick=()=>run(()=>authAction('signup'));
$('forgot').onclick=()=>run(()=>authAction('recover'));
$('reauthenticate').onclick=()=>{$('credentials').hidden=false;$('password').focus();};
$('sign-out').onclick=()=>run(async()=>{
  if(!tools.confirmLeave())return;
  await saveDraft();
  if(books.some(b=>b.dirty||b.conflict)||pdfLibrary.hasPending||linkImports.running){
    review('Save your pending work');$('review-body').append(node('p','This account has device drafts or conflicts. Sync or export a backup before signing out. Signing out clears this account’s device cache.'));
    $('review-actions').append(button('Keep account open',()=>{$('review-dialog').close();$('account-dialog').close();}));return;
  }
  async function finish(){const oldScope=scope;await pdfLibrary.flush();pdfLibrary.close();await pdfLibrary.mixed.write;await pdfLibrary.viewWrite;await pdfLibrary.workspace.write;tools.stop();await cloud.signOut();await db.clearAccount(oldScope);await loadScope();$('account-dialog').close();notify('Signed out on this device.');}
  const study=await tools.exportStudy(books.map(book=>book.id));
  if(study.vocabulary.length||await sharing.countDrafts()){
    review('Back up personal study data');$('review-body').append(node('p','Vocabulary and contribution drafts may have device-only changes. Export a backup before signing out clears this account’s device cache. Migration source files must be retained separately.'));
    if(pdfLibrary.device.records.length||pdfLibrary.mixed.sources.some(s=>s.local||s.notes))$('review-body').append(node('p','Device-only file entries, browser copies and workspace notes will also be cleared. PDF notes are not in the article backup; copy any notes you want to retain first. Original files in your folders or drives are unchanged.'));
    $('review-actions').append(button('Export backup & sign out',async()=>{await exportBackup();await finish();$('review-dialog').close();}));return;
  }
  if(pdfLibrary.device.records.length||pdfLibrary.mixed.sources.some(s=>s.local||s.notes)){
    review('Device-only files');$('review-body').append(node('p','Signing out clears this account’s device-only file entries, browser copies and workspace notes. Original files in your folders, iCloud Drive or OneDrive are unchanged. Copy any reading notes you want to keep before signing out.'));
    $('review-actions').append(button('Keep account open',()=>{$('review-dialog').close();$('account-dialog').close();}),button('Sign out & clear device copies',async()=>{await finish();$('review-dialog').close();}));return;
  }
  await finish();
});
$('recovery-form').onsubmit=e=>{e.preventDefault();run(async()=>{
  $('recovery-status').textContent='Updating password…';
  try{await cloud.updatePassword($('new-password').value);$('new-password').value='';$('recovery-dialog').close();notify('Password updated.');}
  catch(error){$('recovery-status').textContent=error.message;throw error;}
});};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
window.addEventListener('beforeunload',e=>{if(unsaved||busy||tools.wordDirty||pdfLibrary.uploading||linkImports.running){e.preventDefault();e.returnValue='';}});
window.addEventListener('offline',updateAccount);
window.addEventListener('online',()=>run(sync));
setInterval(()=>{if(!busy&&!unsaved&&cloud.session&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName))run(sync);},60_000);
await run(async()=>{
  await db.openStore();await cloud.restore();
  let authReturn=false,linkError;
  if(cloud.configured&&/(access_token|error)=/.test(location.hash)){
    const hash=location.hash;history.replaceState(null,'',location.pathname+location.search);
    try{authReturn=await cloud.acceptAuthReturn(hash);}catch(error){linkError=error;}
  }
  await loadScope();if(['recovery','invite'].includes(authReturn))$('recovery-dialog').showModal();
  if(cloud.session&&navigator.onLine)await sync();
  if(linkError)notify(linkError.message,true);
  else if(authReturn==='signup')notify('Email confirmed. You are signed in to your private library.');
  const sharedId=new URLSearchParams(location.hash.replace(/^#/,'' )).get('read');
  if(sharedId&&uuid(sharedId)){
    if(cloud.sharingReady)await sharing.openSource(sharedId);
    else notify('This reading link needs the sharing service to be configured. Your local library is available.');
  }
});

if(window.READER_CONFIG.offlineEnabled!==false&&'serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
