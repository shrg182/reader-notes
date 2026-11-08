import {PdfCloud} from './pdf-cloud.js';
import {PdfViewer} from './pdf-viewer.js';
import {pdfBook,validatePdf,pdfFingerprint} from './pdf-library-model.js';
import {TAXONOMY} from './library-taxonomy.js';
import * as db from './storage.js';
const $=id=>document.getElementById(id);
const element=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
export class PdfLibrary{
 constructor({cloud,context,notify,onChanged,onOpen,onClose,run}){
  Object.assign(this,{cloud,context,notify,onChanged,onOpen,onClose,run});this.mutation=0;this.api=new PdfCloud(cloud);this.records=[];this.categories=[];this.assignments=[];this.drafts={};this.generation=0;
  const importDialog=document.createElement('dialog');importDialog.id='pdf-import-dialog';
  importDialog.innerHTML=`<form id="pdf-import-form"><div class="dialog-heading"><h2>Import PDF</h2><button type="button" id="pdf-import-close" aria-label="Close PDF import">×</button></div><p>Choose a PDF from this device, iCloud Drive, OneDrive, or another location available in your file picker. Up to 25 MB.</p><label>PDF file<input id="pdf-import-file" type="file" accept=".pdf,application/pdf" required></label><label>Title<input id="pdf-import-title" maxlength="200" required></label><label>Category<select id="pdf-import-category" required></select></label><label id="pdf-new-category-label" hidden>New category name<input id="pdf-new-category" maxlength="120"></label><progress id="pdf-upload-progress" max="100" value="0" hidden></progress><p id="pdf-upload-status" role="status"></p><div class="actions"><button id="pdf-import-submit" class="primary">Import PDF</button><button id="pdf-upload-cancel" type="button" hidden>Pause upload</button></div></form>`;
  const editDialog=document.createElement('dialog');editDialog.id='pdf-edit-dialog';editDialog.innerHTML=`<form id="pdf-edit-form"><div class="dialog-heading"><h2 id="pdf-edit-heading">PDF details</h2><button id="pdf-edit-close" type="button" aria-label="Close details">×</button></div><label id="pdf-edit-title-label">Title<input id="pdf-edit-title" maxlength="200" required></label><label>Category<select id="pdf-edit-category" required></select></label><label id="pdf-edit-new-label" hidden>New category name<input id="pdf-edit-new" maxlength="120"></label><p id="pdf-edit-status" role="status"></p><button class="primary">Save changes</button></form>`;
  document.body.append(importDialog,editDialog);
  const workspace=document.createElement('section');workspace.id='pdf-workspace';workspace.hidden=true;
  workspace.innerHTML=`<div class="pdf-heading"><button id="pdf-library-back">← Library</button><h1 id="pdf-library-title"></h1><button id="pdf-edit-details">Details & category</button><button id="pdf-completed">Mark as read</button><button id="pdf-trash">Move to trash</button><button id="pdf-download-original">Download PDF</button><button id="pdf-remove-offline">Remove offline copy</button></div><p id="pdf-library-status" role="status"></p><div id="pdf-reader"></div><label class="pdf-notes-label">Private reading notes<textarea id="pdf-reading-notes" maxlength="1000000" placeholder="Notes about this PDF…"></textarea></label><p id="pdf-notes-status" role="status"></p>`;
  document.querySelector('main').append(workspace);
  this.viewer=new PdfViewer($('pdf-reader'),{onPage:page=>this.queuePatch({last_page:page}),onError:error=>this.notify(error.message,true)});
  $('import-pdf').onclick=()=>this.run(()=>this.openImport());
  $('pdf-import-file').onchange=()=>{const file=$('pdf-import-file').files[0];if(file)$('pdf-import-title').value=file.name.replace(/\.pdf$/i,'').slice(0,200);};
  $('pdf-import-category').onchange=()=>this.toggleNew('import');$('pdf-edit-category').onchange=()=>this.toggleNew('edit');
  $('pdf-import-form').onsubmit=e=>{e.preventDefault();void this.importFile().catch(error=>{$('pdf-upload-status').textContent=error.message;this.notify(error.message,true);});};
  $('pdf-import-close').onclick=()=>{if(this.uploading){this.uploadController.abort();return;}$('pdf-import-dialog').close();};
  $('pdf-import-dialog').addEventListener('cancel',e=>{if(this.uploading){e.preventDefault();this.uploadController.abort();}});
  $('pdf-upload-cancel').onclick=()=>this.uploadController?.abort();
  $('pdf-edit-close').onclick=()=>$('pdf-edit-dialog').close();
  $('pdf-edit-form').onsubmit=e=>{e.preventDefault();this.run(()=>this.saveDetails());};
  $('pdf-library-back').onclick=()=>this.run(async()=>{await this.flush();this.close();this.onClose();});
  $('pdf-edit-details').onclick=()=>this.run(()=>this.edit(this.active));
  $('pdf-completed').onclick=()=>this.run(async()=>{await this.flush();const record=await this.change(this.active,'update',{completed:!this.active.completed});this.paint(record);if(record.completed)this.notify('Marked as read. Keep this PDF or move it to trash when you are ready.');});
  $('pdf-trash').onclick=()=>this.run(()=>this.trash(this.active));
  $('pdf-download-original').onclick=()=>this.run(()=>this.download());
  $('pdf-remove-offline').onclick=()=>this.run(async()=>{await db.deleteAsset(this.owner,'cloud-pdf:'+this.active.id);$('pdf-library-status').textContent='Offline copy removed. The cloud PDF is kept; this open page remains available until you leave.';});
  $('pdf-reading-notes').oninput=()=>this.queuePatch({notes:$('pdf-reading-notes').value});
 }
 get enabled(){return this.cloud.config.pdfLibraryEnabled===true;}
 get available(){return this.enabled&&Boolean(this.cloud.session);}
 get key(){return `pdf-library:${this.owner}`;}
 get books(){return this.records.filter(r=>r.status!=='purged').map(r=>pdfBook(r,this.categoryOptions()));}
 categoryOptions(){const built=Object.entries(TAXONOMY.CATEGORIES).map(([id,[title]])=>({id,title}));built.push({id:'personal',title:'My reading materials'},{id:'other',title:'Other reading materials'});const result=new Map(built.map(c=>[c.id,c]));for(const c of this.categories)result.set(c.id,c);return [...result.values()];}
 async activate(){
  this.reset();this.owner=this.context().scope;const cached=await db.getSetting(this.key);
  if(cached){this.records=cached.records||[];this.categories=cached.categories||[];this.assignments=cached.assignments||[];}
  this.drafts=await db.getSetting(`pdf-drafts:${this.owner}`)||{};
 }
 reset(){this.generation++;this.uploadController?.abort();this.downloadController?.abort();this.close();this.records=[];this.categories=[];this.assignments=[];this.drafts={};this.pendingImport=null;for(const id of ['pdf-import-dialog','pdf-edit-dialog'])$(id).close();}
 async persist(){await db.setSetting(this.key,{records:this.records,categories:this.categories,assignments:this.assignments});this.onChanged();}
 async refresh(){
  if(!this.available)return;const generation=this.generation,mutation=this.mutation,snapshot=await this.api.snapshot();if(generation!==this.generation||mutation!==this.mutation)return;
  Object.assign(this,snapshot);
  for(const record of this.records.filter(r=>r.status==='purged'||r.status==='deleting')){
   await db.deleteAsset(this.owner,'cloud-pdf:'+record.id);await db.setSetting(`pdf-upload:${this.owner}:${record.id}`,null);delete this.drafts[record.id];
  }
  await db.setSetting(`pdf-drafts:${this.owner}`,this.drafts);await this.persist();
  if(this.active){const next=this.records.find(r=>r.id===this.active.id);if(!next||next.deleted||next.status!=='ready'){this.close();this.onClose();this.notify('This PDF was removed on another device.');}
   else if(!this.drafts[next.id]){this.active=next;this.paint(next);}}
 }
 async ensureCategory(id,title){
  this.mutation++;const category=await this.api.category(id,title);this.mutation++;this.categories=this.categories.filter(c=>c.id!==category.id);this.categories.push(category);return category;
 }
 categorySelect(select,value='personal'){
  select.replaceChildren();for(const c of this.categoryOptions())select.add(new Option(c.title,c.id));select.add(new Option('+ New category','__new__'));select.value=value;
 }
 toggleNew(mode){const isNew=$(`pdf-${mode}-category`).value==='__new__';const label=mode==='import'?$('pdf-new-category-label'):$('pdf-edit-new-label'),input=mode==='import'?$('pdf-new-category'):$('pdf-edit-new');label.hidden=!isNew;input.required=isNew;}
 async selectedCategory(mode){
  const id=$(`pdf-${mode}-category`).value;
  if(id==='__new__'){
   const title=(mode==='import'?$('pdf-new-category'):$('pdf-edit-new')).value.trim();if(!title)throw Error('Enter a category name.');
   const existing=this.categoryOptions().find(c=>c.title.toLocaleLowerCase()===title.toLocaleLowerCase());return this.ensureCategory(existing?.id||crypto.randomUUID(),existing?.title||title);
  }
  const value=this.categoryOptions().find(c=>c.id===id);if(!value)throw Error('Choose a category.');return this.ensureCategory(value.id,value.title);
 }
 requireCloud(){if(!this.cloud.session)throw Error('Sign in through My Account to import and synchronize PDFs.');if(!this.enabled)throw Error('Cloud PDF storage needs its database setup before it can be used.');}
 async openImport(record=null){
  this.requireCloud();if(this.uploading)throw Error('Finish or pause the current upload first.');
  await this.refresh();if(record){record=this.records.find(r=>r.id===record.id);if(record?.status==='ready'&&!record.deleted)return this.open(record.id);if(!record||record.deleted||record.status!=='uploading')throw Error('This upload is no longer available. Refresh the library.');}this.pendingImport=record;this.resumeFile=null;
  $('pdf-import-form').reset();this.categorySelect($('pdf-import-category'),record?.category_id||$('library-category').value||'personal');this.toggleNew('import');
  $('pdf-upload-progress').hidden=true;$('pdf-upload-status').textContent=record?'Choose the same PDF to resume this upload.':'';
  $('pdf-import-title').value=record?.title||'';$('pdf-import-title').readOnly=Boolean(record);$('pdf-import-category').disabled=Boolean(record);this.setUploading(false);
  $('pdf-import-dialog').showModal();
  if(record){const cached=await db.getAsset(this.owner,'cloud-pdf:'+record.id);if(cached?.file){this.resumeFile=cached.file;$('pdf-import-file').required=false;$('pdf-upload-status').textContent='The PDF is available on this device. Click Import PDF to resume.';}}
 }
 setUploading(value){this.uploading=value;for(const id of ['pdf-import-file','pdf-import-title','pdf-import-category','pdf-new-category','pdf-import-submit'])$(id).disabled=value||(id==='pdf-import-category'&&Boolean(this.pendingImport));$('pdf-upload-cancel').hidden=!value;}
 async importFile(){
  if(this.uploading)return;this.requireCloud();const file=$('pdf-import-file').files[0]||this.resumeFile;await validatePdf(file);
  const generation=this.generation,owner=this.owner;let record=this.pendingImport;
  this.setUploading(true);this.uploadController=new AbortController();$('pdf-upload-progress').hidden=false;$('pdf-upload-progress').value=0;$('pdf-upload-status').textContent='Preparing upload…';
  const check=()=>{if(generation!==this.generation||this.uploadController.signal.aborted)throw new DOMException('Upload paused','AbortError');};
  try{
   const hash=await pdfFingerprint(file);check();
   if(record){if(hash!==record.sha256||file.size!==record.size_bytes)throw Error('Choose the same PDF file to resume.');record=this.records.find(r=>r.id===record.id);if(!record||record.deleted||record.status!=='uploading')throw Error('This upload is no longer available. Refresh the library.');}
   else{const category=await this.selectedCategory('import');check();this.mutation++;record=await this.api.reserve({id:crypto.randomUUID(),title:$('pdf-import-title').value.trim()||file.name.slice(0,200),category_id:category.id,filename:file.name.slice(0,255),size_bytes:file.size,sha256:hash});check();this.mutation++;this.pendingImport=record;this.records=this.records.filter(r=>r.id!==record.id);this.records.push(record);}
   await db.putAsset(owner,'cloud-pdf:'+record.id,file);await this.persist();check();
   // Completion can succeed even if the final response was lost on the previous attempt.
   let alreadyStored=false;try{const stored=await this.api.file(record,{signal:this.uploadController.signal});alreadyStored=stored.size===file.size;}catch(error){if(![400,404].includes(error.status))throw error;}
   if(!alreadyStored){
    const key=`pdf-upload:${owner}:${record.id}`,checkpoint=await db.getSetting(key);
    const transfer=url=>this.api.upload(record,file,{url,signal:this.uploadController.signal,onUrl:async url=>{if(generation===this.generation)await db.setSetting(key,{url});},onProgress:value=>{if(generation===this.generation){$('pdf-upload-progress').value=value;$('pdf-upload-status').textContent=`Uploading ${value}%`;}}});
    try{await transfer(checkpoint?.url);}catch(error){if(checkpoint?.url&&[404,410].includes(error.originalResponse?.getStatus())){await db.setSetting(key,null);await transfer();}else throw error;}
   }
   check();this.mutation++;const ready=await this.api.change(record,'finish_upload');check();this.mutation++;this.records=this.records.map(r=>r.id===ready.id?ready:r);await db.setSetting(`pdf-upload:${owner}:${record.id}`,null);await this.persist();
   $('pdf-upload-status').textContent='PDF imported and synchronized.';$('pdf-import-dialog').close();this.pendingImport=null;this.resumeFile=null;await this.open(ready.id);
  }catch(error){if(generation===this.generation){$('pdf-upload-status').textContent=error.name==='AbortError'?'Upload paused. Use Resume upload in the Library to continue.':'Upload incomplete. Retry here or use Resume upload in the Library. '+error.message;this.onChanged();}if(error.name!=='AbortError')this.notify(error.message,true);}
  finally{if(generation===this.generation)this.setUploading(false);}
 }
 async open(id){
  await this.flush();const record=this.records.find(r=>r.id===id);if(!record||record.deleted)throw Error('PDF unavailable.');if(record.status!=='ready')return this.openImport(record);
  await this.onOpen();this.close();this.active=record;this.paint(record);$('pdf-workspace').hidden=false;document.body.classList.add('pdf-open');
  const generation=this.generation,request=++this.openRequest;this.downloadController=new AbortController();
  $('pdf-library-status').textContent='Loading PDF…';
  try{let blob=(await db.getAsset(this.owner,'cloud-pdf:'+id))?.file;
   if(!blob){this.requireCloud();blob=await this.api.file(record,{signal:this.downloadController.signal});if(request!==this.openRequest||generation!==this.generation)return;await db.putAsset(this.owner,'cloud-pdf:'+id,blob);}
   if(request!==this.openRequest||generation!==this.generation)return;
   this.blob=blob;await this.viewer.open(blob,record.last_page);$('pdf-library-status').textContent=navigator.onLine?'Private cloud PDF · offline copy available on this device':'Offline copy · changes will sync when connected';
  }catch(error){if(request===this.openRequest&&generation===this.generation&&error.name!=='AbortError'){$('pdf-library-status').textContent='Could not open PDF. Return to Library and retry.';throw error;}}
 }
 paint(record){$('pdf-library-title').textContent=record.title;$('pdf-completed').textContent=record.completed?'Mark as unread':'Mark as read';$('pdf-reading-notes').value=this.drafts[record.id]?.patch?.notes??record.notes;}
 close(){clearTimeout(this.noteTimer);this.openRequest=(this.openRequest||0)+1;this.downloadController?.abort();this.viewer.close();this.active=null;this.blob=null;$('pdf-workspace').hidden=true;document.body.classList.remove('pdf-open');$('pdf-reading-notes').value='';}
 queuePatch(patch){
  if(!this.active)return;const old=this.drafts[this.active.id];this.drafts[this.active.id]={revision:old?.revision??this.active.revision,patch:{...old?.patch,...patch}};
  this.draftWrite=db.setSetting(`pdf-drafts:${this.owner}`,this.drafts);$('pdf-notes-status').textContent='Saved on this device · waiting to sync';
  clearTimeout(this.noteTimer);this.noteTimer=setTimeout(()=>this.flush().catch(error=>{$('pdf-notes-status').textContent=error.message;}),900);
 }
 async flush(){
  clearTimeout(this.noteTimer);await this.draftWrite;
  if(this.flushing)return this.flushing;
  this.flushing=this.flushDrafts().finally(()=>{this.flushing=null;});return this.flushing;
 }
 async flushDrafts(){
  if(!this.available||!navigator.onLine)return;
  const generation=this.generation;
  for(const [id,draft] of Object.entries(this.drafts)){
   const record=this.records.find(r=>r.id===id);if(!record||record.status==='purged'||record.status==='deleting'){delete this.drafts[id];continue;}if(record.deleted)continue;
   // Do not overwrite a newer cloud note with a stale offline draft.
   if(record.revision!==draft.revision){this.conflictId=id;this.showDraftConflict(record,draft);throw Error('PDF notes changed on another device. Review the saved device notes.');}
   let next;const sent=structuredClone(draft);try{this.mutation++;next=await this.api.change({...record,revision:draft.revision},'update',sent.patch);this.mutation++;}catch(error){await this.refresh();const latest=this.records.find(r=>r.id===id);if(latest&&latest.revision!==draft.revision)this.showDraftConflict(latest,draft);throw error;}if(generation!==this.generation)return;
   this.records=this.records.map(r=>r.id===id?next:r);if(this.active?.id===id)this.active=next;
   if(JSON.stringify(this.drafts[id])===JSON.stringify(sent))delete this.drafts[id];else this.drafts[id].revision=next.revision;
   await db.setSetting(`pdf-drafts:${this.owner}`,this.drafts);await this.persist();
  }
  $('pdf-notes-status').textContent=Object.keys(this.drafts).length?'Changes waiting to sync':'Reading notes and position synchronized';
 }
 showDraftConflict(record,draft){
  const dialog=$('review-dialog');if(dialog.open)return;
  $('review-title').textContent='Review PDF notes';$('review-body').replaceChildren(element('p','Your device draft was retained. Choose which version to keep.'),element('h3','Device notes'),element('pre',draft.patch.notes??record.notes),element('h3','Cloud notes'),element('pre',record.notes));$('review-actions').replaceChildren();
  for(const [label,keep] of [['Use cloud notes',false],['Keep device notes & sync',true]]){
   const button=element('button',label);button.onclick=()=>this.run(async()=>{if(keep)this.drafts[record.id].revision=record.revision;else delete this.drafts[record.id];await db.setSetting(`pdf-drafts:${this.owner}`,this.drafts);dialog.close();await this.flush();if(this.active)this.paint(this.active);});$('review-actions').append(button);
  }dialog.showModal();
 }
 async change(record,action,patch={}){
  this.requireCloud();const generation=this.generation;
  try{this.mutation++;const next=await this.api.change(record,action,patch);this.mutation++;if(generation!==this.generation)throw Error('Account changed.');this.records=this.records.map(r=>r.id===next.id?next:r);if(this.active?.id===next.id)this.active=next;await this.persist();return next;}
  catch(error){if(generation===this.generation)await this.refresh().catch(()=>{});throw error;}
 }
 async trash(record){await this.flush();record=this.records.find(r=>r.id===record.id);await this.change(record,'trash');if(this.active?.id===record.id){this.close();this.onClose();}this.notify('PDF moved to trash. It still uses cloud storage until permanently deleted.');}
 async restore(record){await this.change(record,'restore');this.notify('PDF restored.');}
 confirmDelete(record){
  $('review-title').textContent='Permanently delete PDF?';$('review-body').replaceChildren(element('p',`Delete “${record.title}”, its original PDF and private reading notes from your account? This cannot be undone. Offline copies on other devices are removed the next time they synchronize.`));$('review-actions').replaceChildren();
  const cancel=element('button','Cancel');cancel.onclick=()=>$('review-dialog').close();const remove=element('button','Delete permanently');remove.className='danger';remove.onclick=()=>this.run(async()=>{await this.purge(record);$('review-dialog').close();});$('review-actions').append(cancel,remove);$('review-dialog').showModal();
 }
 async purge(record){
  if(record.status!=='deleting')record=await this.change(record,'begin_delete');
  await this.api.remove(record);const next=await this.change(record,'finish_delete');
  await db.deleteAsset(this.owner,'cloud-pdf:'+record.id);await db.setSetting(`pdf-upload:${this.owner}:${record.id}`,null);delete this.drafts[record.id];await db.setSetting(`pdf-drafts:${this.owner}`,this.drafts);await this.persist();this.notify('PDF and its reading notes permanently deleted.');return next;
 }
 async edit(record,{article=false}={}){
  this.requireCloud();await this.flush();this.editRecord=record;this.editingArticle=article;
  $('pdf-edit-heading').textContent=article?'Article category':'PDF details';$('pdf-edit-title-label').hidden=article;$('pdf-edit-title').required=!article;$('pdf-edit-title').value=record.title;
  this.categorySelect($('pdf-edit-category'),record.category_id||this.assignments.find(a=>a.document_id===record.id)?.category_id||'personal');this.toggleNew('edit');$('pdf-edit-status').textContent='';$('pdf-edit-dialog').showModal();
 }
 async saveDetails(){
  try{const category=await this.selectedCategory('edit');
   if(this.editingArticle){this.mutation++;await this.api.assign(this.editRecord.id,category.id);this.mutation++;this.assignments=this.assignments.filter(a=>a.document_id!==this.editRecord.id);this.assignments.push({document_id:this.editRecord.id,category_id:category.id});await this.persist();}
   else{const record=this.records.find(r=>r.id===this.editRecord.id);await this.change(record,'update',{title:$('pdf-edit-title').value.trim(),category_id:category.id});if(this.active)this.paint(this.active);}
   $('pdf-edit-dialog').close();
  }catch(error){$('pdf-edit-status').textContent=error.message;throw error;}
 }
 async download(){if(!this.blob)throw Error('Open the PDF before downloading.');const url=URL.createObjectURL(this.blob),link=element('a','Download');link.href=url;link.download=this.active.filename||this.active.title+'.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 get hasPending(){return this.uploading||Object.keys(this.drafts).length>0;}
}
