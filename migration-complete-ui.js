import {mergeDictionaryOverrides} from './rich-model.js';
import {planBundle,safeRichDocument} from './migration-library.js';
import {getSetting,setSetting} from './storage.js';
import {digest,canonical} from './migration-model.js';
const $=id=>document.getElementById(id);
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
export class CompleteMigration{
  constructor({cloud,context,run,notify,onImported}){
    Object.assign(this,{cloud,context,run,notify,onImported});this.meta=[];this.cache=new Map();
    const open=el('button','Migrated library');open.id='complete-migration';$('studio-migration').after(open);open.onclick=()=>run(()=>this.open());
    const d=el('dialog');d.id='complete-migration-dialog';d.innerHTML=`<div class="dialog-heading"><h2>Reader Studio library</h2><button id="close-complete">×</button></div><p>Original editions, study records and dictionaries stay private to your account. Saved editions remain separate from source editions.</p><label>Import prepared Studio package<input id="complete-file" type="file" accept=".json"></label><p id="complete-status" role="status"></p><div id="complete-preview"></div><button id="complete-import" hidden>Import into my private library</button><h3>Imported records</h3><label>Find originals and study data<input id="complete-search" type="search"></label><select id="complete-kind"><option value="">All records</option><option value="edition">Editions</option><option value="dictionary">Dictionary entries</option><option value="occurrences">Dictionary sources</option><option value="corrections">Dictionary corrections</option><option value="study">Study records</option><option value="archive">Original archives</option></select><div id="complete-records"></div>`;
    document.body.append(d);$('close-complete').onclick=()=>d.close();$('complete-file').onchange=()=>run(()=>this.inspect());$('complete-import').onclick=()=>run(()=>this.import());
    $('complete-search').oninput=()=>this.render();$('complete-kind').onchange=()=>this.render();
    const source=el('button','Original edition & study data');source.id='imported-edition';source.hidden=true;$('history').after(source);source.onclick=()=>run(()=>this.openEdition());
    const detail=el('dialog');detail.id='import-detail';detail.innerHTML=`<div class="dialog-heading"><h2 id="import-detail-title"></h2><button id="close-import-detail">×</button></div><p id="import-detail-info"></p><div id="import-detail-body"></div>`;document.body.append(detail);$('close-import-detail').onclick=()=>detail.close();
    const dictionary=el('details');dictionary.innerHTML='<summary>Imported Studio dictionary</summary><label>Search imported dictionaries<input id="import-dictionary-query" type="search"></label><button id="import-dictionary-find">Search dictionary</button><div id="import-dictionary-results"></div>';$('block-dictionary').append(dictionary);$('import-dictionary-find').onclick=()=>run(()=>this.findDictionary());
  }
  async activate(){
    const {scope}=this.context();if(this.scope!==scope){this.scope=scope;this.cache.clear();this.meta=await getSetting(`imports:${scope}`)||[];this.plan=null;$('complete-file').value='';$('complete-preview').replaceChildren();$('complete-import').hidden=true;$('complete-records').replaceChildren();$('import-detail-body').replaceChildren();$('import-detail').close();$('complete-migration-dialog').close();$('import-dictionary-results').replaceChildren();}
    $('imported-edition').hidden=!this.meta.some(x=>x.bookId===this.context().book?.id);
  }
  async refresh(){
    if(this.cloud.session&&this.cloud.config?.migrationEnabled){this.meta=await this.cloud.importIndex();await setSetting(`imports:${this.scope}`,this.meta);}
    $('imported-edition').hidden=!this.meta.some(x=>x.bookId===this.context().book?.id);
  }
  async open(){await this.activate();await this.refresh();$('complete-status').textContent=`${this.meta.filter(x=>x.kind==='edition').length} imported editions. Sources, saved edits, dictionaries and originals remain independent.`;this.render();$('complete-migration-dialog').showModal();}
  render(){
    const q=$('complete-search').value.toLocaleLowerCase(),kind=$('complete-kind').value;const rows=this.meta.filter(x=>(!kind||kind===x.kind)&&`${x.title} ${x.kind}`.toLocaleLowerCase().includes(q));$('complete-records').replaceChildren();
    for(const r of rows.slice(0,100)){const b=el('button',`${r.title} · ${r.kind}`);b.onclick=()=>this.run(()=>this.show(r));$('complete-records').append(b);}
    $('complete-records').append(el('p',`${rows.length} matching records${rows.length>100?' · refine the search to see more':''}`));
  }
  async inspect(){
    const f=$('complete-file').files[0];if(!f)return;if(f.size>256*1024*1024)throw Error('Package exceeds 256 MB.');$('complete-status').textContent='Verifying sources and preparing private import…';
    this.plan=await planBundle(JSON.parse(await f.text()));$('complete-preview').textContent=JSON.stringify(this.plan.summary,null,2);$('complete-import').hidden=false;$('complete-status').textContent='Verified. Existing records are never replaced. Import can be resumed after interruption.';
  }
  async import(){
    if(!this.cloud.session||!this.cloud.config?.migrationEnabled)throw Error('Sign in and configure private migration storage first.');
    if(!this.plan)throw Error('Choose a package first.');const scope=this.scope,known=new Map((await this.cloud.importIndex()).map(x=>[x.id,x]));let count=0;
    for(const r of this.plan.records){
      if(this.context().scope!==scope)throw Error('Library changed; import stopped.');
      const old=known.get(r.id);if(old&&old.fingerprint!==r.fingerprint)throw Error('A different edition is already imported. Existing records were preserved.');
      if(!old)await this.cloud.importRecord(r);
      $('complete-status').textContent=`Preserved ${++count} of ${this.plan.records.length} records in your private cloud library…`;
    }
    await this.refresh();await this.onImported();this.render();$('complete-status').textContent=`Migration finished: ${this.plan.summary.articles} editions, ${this.plan.summary.dictionaryEntries} dictionary entries, ${this.plan.summary.occurrences} dictionary source occurrences. All imported data is private. Originals and saved editions are retained separately.`;$('complete-import').hidden=true;this.notify($('complete-status').textContent);
  }
  async record(meta){if(this.cache.has(meta.id))return this.cache.get(meta.id);const key=`import-record:${this.scope}:${meta.id}`;let r=await getSetting(key);if(!r){r=await this.cloud.importPayload(meta.id);if(!r)throw Error('Imported record unavailable.');await setSetting(key,r);}this.cache.set(meta.id,r);return r;}
  async openEdition(){const meta=this.meta.find(x=>x.bookId===this.context().book?.id);if(meta)await this.show(meta);}
  async show(meta){
    const {payload}=await this.record(meta);$('import-detail-title').textContent=meta.title;$('import-detail-info').textContent=`Private preserved ${meta.kind}${payload.path?' · '+payload.path:''}`;const body=$('import-detail-body');body.replaceChildren();
    const download=(name,text)=>{const a=el('a','Download '+name);const url=URL.createObjectURL(new Blob([text],{type:'application/octet-stream'}));a.href=url;a.download=name;a.onclick=()=>setTimeout(()=>URL.revokeObjectURL(url),60000);body.append(a);};
    if(meta.kind==='edition'){
      if(payload.html){const frame=el('iframe');frame.title='Preserved rich reading edition';frame.setAttribute('sandbox','');frame.srcdoc=safeRichDocument(payload.html);frame.className='import-rich';body.append(frame);}
      else if(payload.raw?.texts){for(const [page,text] of Object.entries(payload.raw.texts)){const section=el('details'),summary=el('summary','Page '+page);section.append(summary,el('pre',text));body.append(section);}}
      for(const [key,label] of [['notes','Reading notes'],['footnotes','Footnotes'],['terms','Vocabulary & pronunciation'],['history','Imported editing history']])if(payload[key]!==undefined){const details=el('details');details.append(el('summary',label),el('pre',JSON.stringify(payload[key],null,2)));body.append(details);}
      if(payload.original)download('original-source.html',payload.original);
      download('preserved-edition.json',JSON.stringify(payload,null,2));
      body.append(el('p','Rich editions and their study records are preserved snapshots. Edit the working article and private notes in the main workspace; originals stay intact.'));
    }else if(meta.kind==='archive')download(payload.name,payload.text);
    else body.append(el('pre',JSON.stringify(payload,null,2)));
    if(!$('import-detail').open)$('import-detail').showModal();
  }
  async findDictionary(){
    await this.refresh();const q=$('import-dictionary-query').value.trim().toLocaleLowerCase();if(!q)throw Error('Enter a word to search.');const out=$('import-dictionary-results');out.textContent='Searching private imported dictionaries…';const results=[],corrections={};
    for(const meta of this.meta.filter(x=>['dictionary','corrections'].includes(x.kind))){const {payload}=await this.record(meta);if(meta.kind==='corrections')Object.assign(corrections,payload.overrides);else for(const row of payload.rows)if(`${row.term} ${row.definition}`.toLocaleLowerCase().includes(q))results.push(row);}
    const mergedCorrections=mergeDictionaryOverrides(this.context().books,corrections);for(const key of Object.keys(corrections))delete corrections[key];Object.assign(corrections,mergedCorrections);out.replaceChildren();for(const base of results.slice(0,100)){const override=corrections[base.language+'\0'+base.term]||{};const row={...base,...override};const d=el('details');d.append(el('summary',`${row.term} · ${row.language||''} · ${row.pinyin||''}`),el('p',row.definition||row.annotation||''),el('pre',JSON.stringify(row,null,2)));out.append(d);}out.append(el('p',`${results.length} matches${results.length>100?' · first 100 shown':''}. Personal corrections are applied over the original dictionary.`));
  }
}
