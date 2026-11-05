import {inspectFiles,migrationReport,digest,LIMITS} from './migration-model.js';
import {listMigrationBatches,getMigrationFile,commitMigration} from './storage.js';
const $=id=>document.getElementById(id);
const el=(tag,value,className)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;if(className)node.className=className;return node;};
function download(name,value,type='application/json'){
  const blob=value instanceof Blob?value:new Blob([JSON.stringify(value,null,2)],{type});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
export class StudioMigration {
  constructor({run,context,onImported,notify}){
    this.run=run;this.context=context;this.onImported=onImported;this.notify=notify;this.plan=null;this.selected=new Set();this.offset=0;
    const dialog=document.createElement('dialog');dialog.id='migration-dialog';dialog.innerHTML=`
      <div class="dialog-heading"><div><h2>Import from Reader Studio</h2><p class="muted">Inventory → preview → small trial. Originals stay separate from reading copies.</p></div><button id="close-migration" aria-label="Close migration">×</button></div>
      <p id="migration-destination"></p>
      <label>Choose exported archives and source files<input id="migration-files" type="file" multiple accept=".json,.csv,.js,.txt,.md,.html,.htm,.pdf,.epub,.png,.jpg,.jpeg,.webp,.mp3,.mp4"></label>
      <p class="muted">Up to 60 files, 50 MB each, 100 MB per batch. Optional reading-review-catalog.js supplies article titles and source paths. Preview does not change your library or contact Reader Studio.</p>
      <p id="migration-status" role="status" aria-live="polite"></p>
      <section id="migration-preview" hidden><h3>Inventory</h3><div id="migration-summary" class="migration-summary"></div><div id="migration-sources"></div>
      <p class="migration-warning">Rich editions, annotation anchors, histories and global dictionaries need further adapters. A trial creates plain-text reading copies only. Keep the original exports and source files outside this browser. Device archives are cleared on account sign-out.</p>
      <details><summary>Inspect records and select trial copies</summary><label>Filter records<input id="migration-filter" type="search" placeholder="Title, source key, record type"></label><div id="migration-records"></div><div class="actions"><button id="migration-earlier">Previous records</button><span id="migration-page"></span><button id="migration-later">Next records</button></div></details>
      <p id="migration-selection" class="muted"></p><label class="migration-check"><input id="migration-acknowledge" type="checkbox"> I understand these are plain-text trial copies; original formatting and structured study data stay in the source archives.</label>
      <div class="actions"><button id="migration-report">Download inventory report</button><button id="migration-stage">Retain originals on this device</button><button id="migration-import" class="primary">Import selected text copies</button></div></section>
      <section><h3>Device archives</h3><p class="muted">Original files and reports retained for this library. These are not included in the ordinary Reader Notes JSON backup or uploaded to the cloud.</p><div id="migration-saved"></div></section>`;
    document.body.append(dialog);
    $('studio-migration').onclick=()=>this.run(()=>this.open());
    $('close-migration').onclick=()=>dialog.close();
    $('migration-files').onchange=()=>this.run(()=>this.inspect());
    $('migration-filter').oninput=()=>{this.offset=0;this.renderRecords();};
    $('migration-earlier').onclick=()=>{this.offset=Math.max(0,this.offset-50);this.renderRecords();};
    $('migration-later').onclick=()=>{this.offset+=50;this.renderRecords();};
    $('migration-report').onclick=()=>{if(this.plan)download('reader-studio-migration-report.json',migrationReport(this.plan));};
    $('migration-stage').onclick=()=>this.run(()=>this.commit(false));
    $('migration-import').onclick=()=>this.run(()=>this.commit(true));
  }
  reset(){
    $('migration-dialog').close();this.plan=null;this.selected.clear();this.scope=undefined;this.offset=0;
    $('migration-files').value='';$('migration-preview').hidden=true;$('migration-status').textContent='';
    for(const id of ['migration-sources','migration-records','migration-summary','migration-saved'])$(id).replaceChildren();
  }
  async open(){
    const scope=this.context().scope;
    if(this.scope!==scope){this.plan=null;this.selected.clear();$('migration-preview').hidden=true;$('migration-files').value='';$('migration-status').textContent='';}
    this.scope=scope;$('migration-destination').textContent=`Destination: ${this.context().label}. Preview and retained originals stay on this device. Selected reading copies enter the library’s normal sync queue.`;
    await this.saved();$('migration-dialog').showModal();
  }
  async inspect(){
    this.plan=null;this.selected.clear();this.offset=0;$('migration-preview').hidden=true;$('migration-acknowledge').checked=false;$('migration-filter').value='';
    const files=[...$('migration-files').files];if(!files.length)return;
    $('migration-status').textContent='Inspecting source formats and calculating file fingerprints…';
    try{this.plan=await inspectFiles(files,this.context().books);this.scope=this.context().scope;this.render();$('migration-status').textContent='Preview ready. No articles have been imported. No source files have been changed.';}
    catch(error){$('migration-status').textContent=error.message;throw error;}
  }
  render(){
    $('migration-preview').hidden=false;const summary=this.plan.summary;$('migration-summary').replaceChildren();
    for(const [label,value] of [['Files',summary.files],['Article versions',summary.articleVersions],['Distinct articles',summary.distinctArticles],['Ready for trial',summary.ready],['Detected note records',summary.notes],['History records',summary.history],['Dictionary entries',summary.dictionaryEntries],['Dictionary corrections',summary.dictionaryCorrections],['Dictionary occurrences',summary.dictionaryOccurrences],['Asset paths without files',summary.unmatchedAssets],['Files needing attention',summary.errors]]){
      const card=el('div');card.append(el('strong',String(value)),el('span',label));$('migration-summary').append(card);
    }
    $('migration-sources').replaceChildren();
    for(const source of this.plan.sources){const details=el('details'),summary=el('summary',`${source.name} · ${source.type} · ${source.recordCount} records`);details.append(summary,el('p',`SHA-256: ${source.hash}`,'file-fingerprint'));if(source.error)details.append(el('p',source.error,'error'));for(const warning of source.warnings)details.append(el('p',warning,'muted'));$('migration-sources').append(details);}
    this.renderRecords();this.selectionLabel();
  }
  selectionLabel(){$('migration-selection').textContent=`${this.selected.size} reading copies selected. Trial limit: ${LIMITS.trial}. Existing Reader Notes articles are never replaced. Conflicting source versions require choosing one.`;}
  renderRecords(){
    if(!this.plan)return;
    const query=$('migration-filter').value.toLocaleLowerCase();
    const records=this.plan.items.filter(item=>`${item.title} ${item.key} ${item.kind} ${item.sourceFile}`.toLocaleLowerCase().includes(query));
    this.offset=Math.min(this.offset,Math.max(0,Math.floor((records.length-1)/50)*50));$('migration-records').replaceChildren();
    for(const item of records.slice(this.offset,this.offset+50)){
      const row=el('article',undefined,'migration-record'),heading=el('div',undefined,'migration-record-heading');
      if(item.book){
        const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label',`Select ${item.title}`);check.checked=this.selected.has(item);
        check.disabled=!['ready','source conflict'].includes(item.status);
        check.onchange=()=>{if(check.checked){for(const chosen of this.selected)if(chosen.book.id===item.book.id)this.selected.delete(chosen);this.selected.add(item);}else this.selected.delete(item);this.selectionLabel();this.renderRecords();};heading.append(check);
      }
      heading.append(el('strong',item.title));row.append(heading,el('p',`${item.kind} · ${item.status||'archive only'} · ${item.sourceFile}`,'muted'),el('p',item.key,'migration-key'));
      if(item.blocked)row.append(el('p',item.blocked,'muted'));
      for(const warning of item.warnings)row.append(el('p',warning,'muted'));
      for(const match of item.assetMatches||[])row.append(el('p',`${match.reference} · ${match.candidateFiles.length?'Possible file: '+match.candidateFiles.join(', '):'Not included in this batch'}`,'migration-key'));
      if(item.book){const details=el('details');details.append(el('summary','Preview reading copy'),el('pre',item.book.content.slice(0,10000)),el('pre',item.book.notes.slice(0,5000)));if(item.book.content.length>10000)details.append(el('p','Preview excerpt only; the full text is used for the trial copy.','muted'));row.append(details);}
      $('migration-records').append(row);
    }
    if(!records.length)$('migration-records').append(el('p','No records match. Catalogs and source files may contain no convertible article records.'));
    $('migration-page').textContent=records.length?`${this.offset+1}–${Math.min(records.length,this.offset+50)} of ${records.length}`:'0 records';
    $('migration-earlier').disabled=this.offset===0;$('migration-later').disabled=this.offset+50>=records.length;
  }
  async commit(trial){
    try{
      if(!this.plan||this.scope!==this.context().scope)throw new Error('Destination changed. Inspect the files again in the intended library.');
      const selected=trial?[...this.selected]:[];
      if(trial&&(!selected.length||selected.length>LIMITS.trial))throw new Error('Select between 1 and 10 article versions for a trial.');
      if(trial&&!$('migration-acknowledge').checked)throw new Error('Acknowledge the plain-text trial limitations before importing.');
      if(selected.some(item=>!['ready','source conflict'].includes(item.status)||this.context().books.some(book=>book.id===item.book.id)))throw new Error('An article already exists or the preview is stale. Inspect the files again; existing articles will be preserved.');
      if(new Set(selected.map(item=>item.book.id)).size!==selected.length)throw new Error('Choose only one version of each source article.');
      const books=selected.map(item=>({...item.book,dirty:true,revision:0,history:[],updatedAt:new Date().toISOString()}));
      const report={...migrationReport(this.plan),operation:trial?'plain-text trial':'retain originals',imported:books.map(book=>({id:book.id,title:book.title}))};
      const batch={id:crypto.randomUUID(),createdAt:new Date().toISOString(),report};
      await commitMigration(this.scope,batch,this.plan.sources,books);
      if(books.length)await this.onImported();
      this.selected.clear();$('migration-acknowledge').checked=false;
      // Recheck destination state so reopening the same preview cannot duplicate a trial.
      this.plan=await inspectFiles(this.plan.sources.map(source=>source.file),this.context().books);this.render();await this.saved();
      $('migration-status').textContent=trial?`Imported ${books.length} plain-text reading copies. Original files and a report were retained on this device. Structured study conversion remains pending.`:'Original files and the inventory report were retained on this device. The reading library is unchanged.';
      this.notify($('migration-status').textContent);
    }catch(error){$('migration-status').textContent=error.message;throw error;}
  }
  async saved(){
    $('migration-saved').replaceChildren();const batches=await listMigrationBatches(this.context().scope);
    for(const batch of batches.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))){
      const details=el('details');details.append(el('summary',`${new Date(batch.createdAt).toLocaleString()} · ${batch.report.operation} · ${batch.report.sources.length} files`));
      const report=el('button','Download saved report');report.onclick=()=>download('reader-studio-migration-report.json',batch.report);details.append(report);
      for(const source of batch.report.sources){const row=el('div',undefined,'migration-source-download'),button=el('button',`Download original: ${source.name}`);button.onclick=()=>this.run(async()=>{
        const stored=await getMigrationFile(this.context().scope,source.sha256);if(!stored||await digest(await stored.file.arrayBuffer())!==source.sha256)throw new Error('The staged source is missing or failed its integrity check. Use your original export.');download(source.name,stored.file);
      });row.append(button);details.append(row);}
      $('migration-saved').append(details);
    }
    if(!batches.length)$('migration-saved').append(el('p','No migration files retained in this library yet.','muted'));
  }
}
