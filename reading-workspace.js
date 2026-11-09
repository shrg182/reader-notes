import * as db from './storage.js';
const $=id=>document.getElementById(id);
// Each anchor owns an arrangement. Runtime pane ids are mapped to stable slots.
export class ReadingWorkspace{
 constructor(host){this.host=host;this.sessions={};const edit=document.createElement('button');edit.id='workspace-edit-article';edit.textContent='Edit article';edit.hidden=true;edit.onclick=()=>host.run(async()=>{const id=this.key?.startsWith('article:')?this.key.slice(8):null;if(!id)return;await host.flush();host.close();await host.editArticle(id);});$('pdf-reading-mode').before(edit);const reset=document.createElement('button');reset.id='reset-reading-workspace';reset.textContent='Reset workspace';reset.onclick=()=>host.run(()=>this.resetCurrent());$('mixed-add-pane').after(reset);const resume=document.createElement('button');resume.id='resume-reading-workspace';resume.textContent='Resume workspace';resume.hidden=true;resume.onclick=()=>host.run(()=>this.resume());$('open-mixed-workspace').after(resume);}
 async activate(owner){this.restoreVersion=(this.restoreVersion||0)+1;this.restoring=false;this.key=null;clearTimeout(this.timer);this.owner=owner;const stored=await db.getSetting('reading-workspaces:'+owner)||{};this.sessions=stored.sessions||{};this.last=stored.last;this.updateResume();}
 persist(){this.write=db.setSetting('reading-workspaces:'+this.owner,{sessions:this.sessions,last:this.last});void this.write.catch(error=>this.host.notify('Reading workspace could not be saved: '+error.message,true));return this.write;}
 updateResume(){$('workspace-edit-article').hidden=!this.key?.startsWith('article:');$('resume-reading-workspace').hidden=!this.last||!this.sessions[this.last];}
 has(key){return Boolean(this.sessions[key]);}
 touch(){if(!this.key||this.restoring)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.save(),180);}
 snapshot(){const h=this.host,panes=[];if(h.comparison)panes.push({role:'comparison',slot:'secondary',source:'pdf:'+h.comparison.id,title:h.comparison.title,view:h.secondaryViewer.getState(),duplicate:h.comparison.id===h.active?.id});for(const p of h.mixed.panes.values())panes.push({role:'mixed',slot:p.slot,source:p.source.id,title:p.source.title,kind:p.source.kind,view:p.viewer?.getState?.()||p.view||p.source.view||{}});const focused=h.mixed.panes.get(h.focusedPane)?.slot||h.focusedPane,maximized=h.mixed.panes.get(h.maximized)?.slot||h.maximized;return {pdf:Boolean(h.active),primary:h.active?h.viewer.getState():null,panes,focused,maximized,notes:h.preferences.notes,split:h.preferences.split,readingMode:Boolean(h.readingMode)};}
 save(){clearTimeout(this.timer);if(!this.key||this.restoring)return this.write;this.sessions[this.key]=this.snapshot();this.last=this.key;this.updateResume();return this.persist();}
 suspend(){this.save();this.key=null;this.updateResume();clearTimeout(this.timer);}
 async begin(key){this.key=key;const saved=this.sessions[key];if(!saved){this.save();return;}await this.restore(saved);}
 async resolve(id){const h=this.host,m=h.mixed,owner=h.owner,generation=h.generation;let source=m.sources.find(s=>s.id===id),blob,text;
  if(id.startsWith('article:')){const article=h.getArticles().find(a=>a.id===id.slice(8));if(!article)throw Error('This article is unavailable or has been removed.');source??={id,title:article.title,kind:'text',notes:'',view:{}};text=article.content;source.title=article.title;}
  else if(id.startsWith('pdf:')){const record=h.findRecord(id.slice(4));if(!record||record.deleted||record.status!=='ready')throw Error('This PDF is unavailable or has been removed.');source??={id,title:record.title,kind:'pdf',notes:'',view:{page:record.last_page}};source.title=record.title;blob=record.storage==='device'?await h.device.file(record):(await db.getAsset(h.owner,'cloud-pdf:'+record.id))?.file;if(!blob&&record.storage==='device')throw Error('Select the original PDF to restore this pane.');if(!blob){h.requireCloud();blob=await h.api.file(record);}}
  else{if(!source)throw Error('This saved device source is no longer available.');blob=m.files.get(id)||await m.readCopy(h.owner,id);if(!blob)throw Error('Select the original file to restore this pane.');}
  if(h.owner!==owner||h.generation!==generation)throw Error('Account changed while restoring the workspace.');
  if(!m.sources.some(s=>s.id===id)){m.sources.push(source);await m.persist();}return {source,blob,text};
 }
 async restore(saved){const h=this.host,version=h.generation,key=this.key,token=this.restoreVersion=(this.restoreVersion||0)+1;this.restoring=true;const slots=new Map([['primary','primary']]);
  try{h.preferences.notes=saved.notes??true;h.preferences.split=saved.split||'beside';h.applyWorkspace();
   for(const entry of saved.panes.slice(0,h.active?3:4)){if(version!==h.generation||key!==this.key)return;if(h.mixed.panes.size&&[...h.mixed.panes.values()].some(p=>p.slot===entry.slot)){slots.set(entry.slot,[...h.mixed.panes.values()].find(p=>p.slot===entry.slot).id);continue;}
    if(entry.role==='comparison'&&h.active){try{await h.openComparison(entry.source.slice(4),entry.duplicate,entry.view);slots.set(entry.slot,'secondary');continue;}catch(error){if(version!==h.generation||key!==this.key)return;}}
    let result,error;try{result=await this.resolve(entry.source);}catch(e){error=e;}if(version!==h.generation||key!==this.key)return;
    const source=result?.source||h.mixed.sources.find(s=>s.id===entry.source)||{id:entry.source,title:entry.title,kind:entry.kind||'pdf',notes:'',view:entry.view};
    if(!h.mixed.sources.some(s=>s.id===source.id)){h.mixed.sources.push(source);await h.mixed.persist();if(version!==h.generation||key!==this.key)return;}
    const id=await h.mixed.add(source,result?.blob,result?.text,{slot:entry.slot,view:entry.view,missing:error?.message});slots.set(entry.slot,id);
   }
   if(version!==h.generation||key!==this.key)return;h.maximized=slots.get(saved.maximized)||null;h.readingMode=Boolean(saved.readingMode);$('pdf-tools').hidden=h.readingMode;$('pdf-reading-mode').textContent=h.readingMode?'Show tools':'Reading mode';$('pdf-reading-mode').setAttribute('aria-pressed',String(h.readingMode));h.focusPane(slots.get(saved.focused)||slots.values().next().value||'primary');h.applyWorkspace();
  }finally{if(token===this.restoreVersion){this.restoring=false;if(this.key===key&&version===h.generation)this.save();}}
 }
 async openSource(id){const h=this.host,version=h.generation;await h.flush();let result,error;try{result=await this.resolve(id);}catch(e){error=e;}if(version!==h.generation)return;const saved=this.sessions[id];if(!result&&!saved)throw error;
  await h.onOpen();if(version!==h.generation)return;h.close();$('pdf-workspace').hidden=false;document.body.classList.add('pdf-open');h.onSource?.(id.startsWith('article:')?id.slice(8):id.startsWith('pdf:')?id.slice(4):null);$('pdf-library-title').textContent=result?.source.title||saved.panes[0]?.title||'Reading workspace';$('pdf-library-status').textContent='Saved reading workspace · companion files and notes stay on this browser';this.key=id;
  if(saved)await this.restore(saved);else{await h.mixed.add(result.source,result.blob,result.text);this.save();}
 }
 async resume(){if(!this.last)return;return this.last.startsWith('pdf:')?this.host.open(this.last.slice(4)):this.openSource(this.last);}
 async retry(id){const h=this.host,p=h.mixed.panes.get(id);if(!p)return;const version=h.generation,result=await this.resolve(p.source.id);if(version!==h.generation||!h.mixed.panes.has(id))return;const {slot,view}=p,index=[...h.mixed.panes.keys()].indexOf(id);this.restoring=true;try{h.mixed.closePane(id,true);await h.mixed.add(result.source,result.blob,result.text,{slot,view,index});}finally{this.restoring=false;this.save();}}
 async resetCurrent(){const h=this.host;if(!this.key)return;this.restoring=true;try{h.closeComparison();const anchor=[...h.mixed.panes.values()].find(p=>p.source.id===this.key);for(const [id,p]of h.mixed.panes)if(p!==anchor)h.mixed.closePane(id,true);h.maximized=null;h.preferences.split='beside';h.preferences.notes=true;h.focusPane(h.active?'primary':anchor?.id||'primary');h.applyWorkspace();}finally{this.restoring=false;this.save();}}
 forgetSource(id){for(const [key,saved]of Object.entries(this.sessions)){if(key===id)delete this.sessions[key];else saved.panes=saved.panes.filter(p=>p.source!==id);}this.updateResume();return this.persist();}
}
