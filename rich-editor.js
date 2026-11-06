import {encodeRichState,validateRichState,jsonConstant,mergeDictionaryOverrides} from './rich-model.js';
import {plainText as legacyPlainText} from './migration-model.js';
const $=id=>document.getElementById(id);
const escapeText=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function inertDocument(html){return new DOMParser().parseFromString(String(html||'').replace(/<(?:img|iframe|object|embed|link|source|track|video|audio)\b[^>]*>/gi,''),'text/html');}
export function cleanRichHtml(html){
 const doc=inertDocument(html);
 doc.querySelectorAll('script,style,iframe,object,embed,svg,math,form,input,textarea,select,button,link,meta,base').forEach(x=>x.remove());
 for(const e of doc.querySelectorAll('*'))for(const a of [...e.attributes]){
   if(a.name.startsWith('on')||['srcdoc','src','poster','action','formaction','nonce','id'].includes(a.name))e.removeAttribute(a.name);
   else if(a.name==='href'&&!/^(https?:|#)/.test(a.value))e.removeAttribute(a.name);
   else if(a.name==='style'&&/url\s*\(|expression|@import|behavior|position\s*:\s*fixed/i.test(a.value))e.removeAttribute('style');
 }
 return doc.body.innerHTML;
}
export class RichEditor{
 constructor({context,onDirty,onState,onAction,notify}){
  Object.assign(this,{context,onDirty,onState,onAction,notify});this.pending=new Map();this.generation=0;this.value=null;this.loaded=false;
  const frame=document.createElement('iframe');frame.id='studio-editor';frame.title='Study Studio rich editor';frame.setAttribute('sandbox','allow-scripts allow-modals allow-downloads');frame.hidden=true;$('workspace-view').append(frame);this.frame=frame;
  const extra=document.createElement('button');extra.id='studio-extras';extra.textContent='Sharing & additional tools';extra.onclick=()=>document.body.classList.toggle('studio-extras-open');$('save').before(extra);
  addEventListener('message',e=>this.receive(e));
 }
 async open(book,payload){
  this.close();const generation=++this.generation;const seed=this.seed(book,payload);this.value=book.richState||null;this.seedValue=seed;this.bookId=book.id;this.scope=this.context().scope;this.nonce=crypto.randomUUID();
  this.frame.hidden=false;document.body.classList.add('studio-open');await this.prepareFrame();
  await new Promise((resolve,reject)=>{this.resolveLoaded=resolve;this.rejectLoaded=reject;this.loadTimer=setTimeout(()=>{if(generation===this.generation)reject(Error('Rich editor could not load. Your saved editions remain intact.'));},20000);});
 }
 async prepareFrame(){
  const names=['editor.html','theme.css','editor.css','host.css','bridge.js','editor.js','workspace.js','history.js'];
  if(!this.assets)this.assets=Object.fromEntries(await Promise.all(names.map(async name=>[name,await fetch('studio/'+name).then(r=>{if(!r.ok)throw Error('Editor asset unavailable: '+name);return r.text();})])));
  const scriptNonce=crypto.randomUUID();let html=this.assets['editor.html'].replace("script-src 'self'",`script-src 'nonce-${scriptNonce}'`);
  for(const name of ['theme.css','editor.css','host.css'])html=html.replace(`<link rel="stylesheet" href="${name}">`,`<style>${this.assets[name]}</style>`);
  html=html.replace('<script src="bridge.js"></script>',`<script nonce="${scriptNonce}">${this.assets['bridge.js'].replace(/<\/script/gi,'<\\/script')}</script>`);
  this.frame.srcdoc=html;
 }
 seed(book,payload){
  let state=book.richState?validateRichState(book.richState).state:null;
  if(!state){
    let defaults={};if(payload?.original){const doc=inertDocument(payload.original);try{const map=JSON.parse(doc.querySelector('#importedBackupDefaults')?.textContent||'{}');defaults=Object.values(map).find(x=>x&&typeof x.bodyHTML==='string')||{};}catch{}}
    const raw=payload?.raw||{},html=payload?.html||raw.bodyHTML||defaults.bodyHTML;
    state={version:4,bodyHTML:typeof html==='string'?html:book.content.split('\n').map(x=>`<p>${escapeText(x)||'<br>'}</p>`).join(''),terms:raw.terms||payload?.terms||defaults.terms||[],footnotes:raw.footnotes||payload?.footnotes||defaults.footnotes||jsonConstant(payload?.original,'INITIAL_FOOTNOTES')||[],notes:payload?.notes||raw.notes||defaults.notes||[],log:raw.log||payload?.history||defaults.log||[],media:raw.media||[],preferences:raw.preferences||{}};
    // Source packages predating the complete adapter kept initial footnotes only
    // in their original HTML. Empty placeholder arrays must not hide them.
    if(!state.footnotes.length)state.footnotes=defaults.footnotes||jsonConstant(payload?.original,'INITIAL_FOOTNOTES')||[];
    if(typeof html==='string'&&legacyPlainText(html)!==book.content.trim()){
      state.bodyHTML=book.content.split('\n').map(x=>`<p>${escapeText(x)||'<br>'}</p>`).join('');state.footnotes=[];
      this.notify('Your newer working-text edits were retained. The original annotated edition remains available under Original edition & study data.');
    }
    if(raw.texts&&!html)state.bodyHTML=Object.entries(raw.texts).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([page,text])=>`<section data-page="${escapeText(page)}"><h2>Page ${escapeText(page)}</h2><p>${escapeText(text).replaceAll('\n','<br>')}</p></section>`).join('');
  }
  let previous={};try{previous=JSON.parse(state.preferences?.['reading-lexicon-entry-overrides-v1']||'{}');}catch{}
  state.preferences={...state.preferences,'reading-lexicon-entry-overrides-v1':JSON.stringify(mergeDictionaryOverrides(this.context?.().books||[],payload?.dictionaryOverrides||previous))};
  const sourceLanguage=payload?.original?inertDocument(payload.original).documentElement.lang:'';
  const sanitized={...state,bodyHTML:cleanRichHtml(state.bodyHTML),title:book.title,language:book.language||state.language||sourceLanguage||'zh-CN',globalTerms:state.globalTerms||jsonConstant(payload?.original,'GLOBAL_TERMS')||state.terms||[],sourceUrl:state.sourceUrl||(payload?.original?.match(/\bSOURCE_URL\s*=\s*['"](https?:\/\/[^'"]+)['"]/)||[])[1]||''};
  // Never interpret archived scripts, storage settings or remote URLs as code.
  encodeRichState(sanitized);return sanitized;
 }
 async receive(event){
  if(event.source!==this.frame.contentWindow||!event.data?.readerStudio)return;const m=event.data;
  if(m.type==='ready'&&this.bookId){this.frame.contentWindow.postMessage({readerStudio:true,type:'init',nonce:this.nonce,seed:this.seedValue,trustedAssets:{'editor.js':this.assets['editor.js'],'workspace.js':this.assets['workspace.js'],'history.js':this.assets['history.js']},assetsBase:new URL('studio/',location.href).href},'*');return;}
  if(m.nonce!==this.nonce||!this.bookId||this.context().scope!==this.scope||this.context().book?.id!==this.bookId)return;
  if(m.type==='loaded'){clearTimeout(this.loadTimer);this.loaded=true;this.resolveLoaded?.();}
  if(m.type==='dirty')this.onDirty();
  if(m.type==='error'){const error=Error(m.message||'Rich editor failed.');if(!this.loaded){clearTimeout(this.loadTimer);this.rejectLoaded?.(error);}for(const pending of this.pending.values())pending.reject(error);this.pending.clear();this.notify(error.message,true);}
  if(m.type==='state'){
    try{const state={...m.state,bodyHTML:cleanRichHtml(m.state?.bodyHTML)},value=encodeRichState(state);this.value=value;this.onState({richState:value,content:String(m.text||'')});if(m.requestId){this.pending.get(m.requestId)?.resolve();this.pending.delete(m.requestId);}}
    catch(error){this.pending.get(m.requestId)?.reject(error);this.pending.delete(m.requestId);this.notify(error.message,true);}
  }
  if(m.type==='action'){try{await this.onAction(m);}catch(error){this.notify(error.message,true);}}
 }
 async flush(){if(!this.loaded)return;const requestId=crypto.randomUUID();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(Error('Editor save did not finish. Keep this tab open and retry.'));},15000);this.pending.set(requestId,{resolve:()=>{clearTimeout(timer);resolve();},reject:e=>{clearTimeout(timer);reject(e);}});this.frame.contentWindow.postMessage({readerStudio:true,type:'flush',nonce:this.nonce,requestId},'*');});}
 saved(message){if(this.loaded)this.frame.contentWindow.postMessage({readerStudio:true,type:'saved',nonce:this.nonce,message},'*');}
 close(){clearTimeout(this.loadTimer);this.loaded=false;this.bookId=null;this.value=null;this.generation++;this.frame.hidden=true;this.frame.removeAttribute('src');this.frame.removeAttribute('srcdoc');document.body.classList.remove('studio-open','studio-extras-open');for(const p of this.pending.values())p.reject(Error('Editor closed.'));this.pending.clear();}
}
