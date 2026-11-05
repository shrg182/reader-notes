import {CONTRIBUTION_TYPES,audience,audienceWithinSource,validateContribution,codePointSelection,anchorMatches,publicContent,fromCloudDraft} from './sharing-model.js';
import {getSetting,setSetting} from './storage.js';
import {digest} from './migration-model.js';
const $=id=>document.getElementById(id);
const node=(tag,value,className)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(className)n.className=className;return n;};
const download=(name,value)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};

export class ReaderSharing {
  constructor({cloud,context,run,notify,saveBook,syncBook}){
    Object.assign(this,{cloud,context,run,notify,saveBook,syncBook});this.drafts=[];this.groups=[];this.members=[];this.source=null;this.book=null;this.editing=null;this.formDirty=false;this.shared=[];this.offset=0;
    const reader=document.createElement('dialog');reader.id='sharing-dialog';reader.innerHTML=`
      <div class="dialog-heading"><div><h2 id="sharing-title">Sharing & contributions</h2><p id="sharing-access" class="muted"></p></div><button id="close-sharing" aria-label="Close sharing">×</button></div>
      <p id="sharing-status" role="status"></p>
      <section id="book-publication"><h3>Share this reading edition</h3><p class="muted">Only the reviewed title, language and article text can be published. Reading notes, personal vocabulary, PDFs, migration archives and editing history remain private.</p><label>Book audience<select id="book-audience"><option value="private">Private</option><option value="group">Selected groups</option><option value="public">Public</option></select></label><div id="book-groups" class="audience-groups"></div><button id="review-book-publication">Review book publication</button><p id="book-publication-state" class="muted"></p></section>
      <section><h3 id="shared-source-title">Source edition</h3><p id="source-edition-state" class="muted"></p><label id="shared-source-link-label" hidden>Reading link<input id="shared-source-link" readonly></label><label class="sr-only" for="shared-source-text">Source edition text</label><textarea id="shared-source-text" readonly></textarea><button id="restore-source">Show source edition</button></section>
      <section id="my-contribution-editor"><h3>My contribution</h3><p class="muted">Save creates a private working draft. Publishing is a separate action. Contributions never replace the source edition.</p>
      <label>Type<select id="contribution-kind"></select></label><button id="revision-from-source" hidden>Start revised edition from source</button>
      <label>Selected passage<textarea id="contribution-quote" readonly placeholder="Optional: select a passage in the source edition above"></textarea></label><div class="actions"><button id="capture-passage">Use selected passage</button><button id="clear-passage">Book-level note</button><button id="review-current-source">Use current source edition</button></div>
      <label>Contribution<textarea id="contribution-body" maxlength="1000000" placeholder="Pinyin, explanation, correction, footnote, personal note, or revised text"></textarea></label>
      <label>Audience on publish<select id="contribution-audience"><option value="private">Private</option><option value="group">Selected groups</option><option value="public">Public</option></select></label><div id="contribution-groups" class="audience-groups"></div>
      <p id="contribution-anchor-status" class="muted"></p><div class="actions"><button id="save-contribution" class="primary">Save private draft</button><button id="review-contribution">Review visibility / publish</button><button id="new-contribution">New contribution</button></div><p id="contribution-save-status" class="muted" role="status"></p></section>
      <section><div class="layer-heading"><h3>Contribution layers</h3><label>Show<select id="contribution-layer"><option value="all">My drafts + shared contributions</option><option value="none">Source edition only</option><option value="mine">My working drafts</option><option value="public">Public contributions</option><option value="group">Group contributions</option></select></label><button id="sync-contributions">Sync private drafts</button></div><div id="contribution-list"></div></section>`;
    document.body.append(reader);
    for(const [id,title] of [['shared-library-dialog','Shared reading library'],['groups-dialog','Reading groups'],['publish-dialog','Review publication']]){
      const dialog=document.createElement('dialog');dialog.id=id;dialog.innerHTML=`<div class="dialog-heading"><h2>${title}</h2><button aria-label="Close ${title}">×</button></div><div class="dialog-content"></div>`;dialog.querySelector('.dialog-heading button').onclick=()=>dialog.close();document.body.append(dialog);
    }
    $('shared-library-dialog').querySelector('.dialog-content').innerHTML=`<p id="shared-library-status" role="status"></p><label>Search loaded editions<input id="shared-library-query" type="search"></label><button id="refresh-shared-library">Refresh</button><div id="shared-library-list"></div><button id="more-shared-library">Load more</button>`;
    $('groups-dialog').querySelector('.dialog-content').innerHTML=`<p id="groups-status" role="status"></p><p class="muted">Members can read group-shared editions and add their own contributions. An organizer cannot see members’ private notes.</p><form id="create-reading-group"><h3>Create a group</h3><label>Group name<input id="group-name" maxlength="100" required></label><label>Your name in this group<input id="group-alias" maxlength="80" required></label><button class="primary">Create group</button></form><form id="join-reading-group"><h3>Join friends</h3><label>Invitation code<input id="group-code" required autocomplete="off"></label><label>Your name in the group<input id="join-group-alias" maxlength="80" required></label><button>Join group</button></form><div id="group-invitation"></div><div id="reading-group-list"></div>`;
    $('groups-dialog').addEventListener('close',()=>$('group-invitation').replaceChildren());
    for(const [key,label] of Object.entries(CONTRIBUTION_TYPES))$('contribution-kind').append(new Option(label,key));
    this.bind();
  }
  get enabled(){return this.cloud.sharingReady&&Boolean(this.cloud.session);}
  action(operation){return this.run(async()=>{
    $('publish-error')?.remove();
    try{return await operation();}catch(error){
      this.message(error.message);
      if($('groups-dialog').open)$('groups-status').textContent=error.message;
      if($('shared-library-dialog').open)$('shared-library-status').textContent=error.message;
      if($('publish-dialog').open){const alert=node('p',error.message,'error');alert.id='publish-error';alert.setAttribute('role','alert');$('publish-dialog').querySelector('.dialog-content').prepend(alert);$('publish-dialog').scrollTop=0;}
      throw error;
    }
  });}
  get key(){return `contributions:${this.context().scope}`;}
  async loadLocal(){this.drafts=await getSetting(this.key)||[];}
  async persist(next=this.drafts){await setSetting(this.key,next);this.drafts=next;}
  message(value){$('sharing-status').textContent=value;$('contribution-save-status').textContent=value;}
  showAtStart(dialog){const close=dialog.querySelector('.dialog-heading button');close.disabled=false;if(!dialog.open)dialog.showModal();close.focus({preventScroll:true});dialog.scrollTop=0;}
  readyMessage(){return !this.cloud.sharingReady?'Live sharing is not configured. Contribution drafts stay on this device and are included in backups. Signed-out local mode is a shared browser notebook.':!this.cloud.session?'Public reading is available. Local drafts stay in this browser profile. Sign in for private account drafts, publication, and groups.':'Your working drafts remain private until you explicitly publish a reviewed snapshot.';}
  async openOwn(){
    await this.saveBook();await this.loadLocal();this.book=this.context().book;if(!this.book)return;
    this.source=null;this.shared=[];this.groups=[];this.publicationUnknown=true;this.openError='';
    if(this.enabled){try{await this.refreshGroups();this.source=await this.cloud.ownPublication(this.book.id);this.publicationUnknown=false;await this.refreshMine();}catch(error){this.openError=error.message;}}
    const publication=this.source;
    if(!this.source)this.source={id:null,owner_id:this.cloud.session?.user.id||null,visibility:'private',group_ids:[],revision:0,...publicContent(this.book)};
    await this.finishOpen(publication);
  }
  async openSource(id){
    if(!this.confirmLeave())return;
    await this.loadLocal();this.book=null;this.openError='';this.source=await this.cloud.sourceById(id);
    if(!this.source)throw new Error('This source is unavailable or is no longer shared with you.');
    if(this.enabled){await this.refreshGroups();await this.refreshMine();}
    await this.finishOpen(null);
  }
  async finishOpen(publication){
    this.actualPublication=publication;this.sourceHash=await digest(this.source.content);this.alternative=false;this.clearEditor();
    $('sharing-title').textContent=this.book?'Sharing & contributions':this.source.title;
    $('sharing-access').textContent=this.book?'Personal working copy — notes are private':`Shared source · ${this.source.visibility==='group'?'Group':'Public'}`;
    $('book-publication').hidden=!this.book;
    $('book-audience').value=publication?.visibility||'private';
    this.renderGroups('book-groups',publication?.group_ids||[]);
    $('book-publication-state').textContent=publication?`Last confirmed audience: ${publication.visibility}. Further article edits do not update this snapshot automatically.`:this.publicationUnknown?'Private working copy. Live publication status is unavailable.':'Private working copy. No edition has been published.';
    $('shared-source-title').textContent=this.book&&publication?'Published source edition':this.book?'Private source edition':'Source edition';
    $('source-edition-state').textContent=publication?'Contributions below refer to this published snapshot. Your working article may contain newer private edits.':'Select text here to attach a contribution to its passage.';
    $('shared-source-text').value=this.source.content;this.message(this.openError?`${this.openError} Device drafts remain available; publication status may be unavailable.`:this.readyMessage());
    $('shared-source-link-label').hidden=!this.source.id;$('shared-source-link').value=this.source.id?`${this.cloud.appUrl}#read=${this.source.id}`:'';
    if(this.cloud.sharingReady&&this.source.id){try{this.shared=await this.cloud.sharedContributions(this.source.id);}catch(error){this.message(error.message);this.shared=[];}}
    this.renderLayers();this.availability();this.showAtStart($('sharing-dialog'));
  }
  bind(){
    $('item-sharing').onclick=()=>this.action(()=>this.openOwn());
    $('shared-library').onclick=()=>this.action(()=>this.browse(true));$('reading-groups').onclick=()=>this.action(()=>this.openGroups());
    $('close-sharing').onclick=()=>{if(this.confirmLeave()){this.stopSource();$('sharing-dialog').close();}};
    $('sharing-dialog').addEventListener('cancel',event=>{if(!this.confirmLeave())event.preventDefault();});
    $('contribution-body').oninput=()=>{this.formDirty=true;};
    $('contribution-kind').onchange=()=>{this.formDirty=true;$('revision-from-source').hidden=$('contribution-kind').value!=='revision';};
    $('contribution-audience').onchange=()=>{this.formDirty=true;this.renderGroups('contribution-groups',this.editor?.groupIds||[]);};
    $('book-audience').onchange=()=>this.renderGroups('book-groups',this.actualPublication?.group_ids||[]);
    $('capture-passage').onclick=()=>{
      if(this.alternative){this.message('Show the source edition before selecting its passage.');return;}
      const area=$('shared-source-text'),anchor=codePointSelection(this.source.content,area.selectionStart,area.selectionEnd);
      if(!anchor.quote.trim()||anchor.quote.length>5000){this.message('Select a passage of up to 5,000 characters.');return;}
      this.editor={...this.editor,...anchor,sourceRevision:this.source.revision,sourceHash:this.sourceHash};$('contribution-quote').value=anchor.quote;this.formDirty=true;this.anchorStatus();
    };
    $('clear-passage').onclick=()=>{this.editor={...this.editor,quote:'',anchorStart:null,anchorEnd:null,sourceRevision:this.source.revision,sourceHash:this.sourceHash};$('contribution-quote').value='';this.formDirty=true;this.anchorStatus();};
    $('review-current-source').onclick=()=>{if(!this.source||!anchorMatches(this.editor,this.source)){this.message('The passage changed. Select it again, or choose Book-level note.');return;}this.editor.sourceRevision=this.source.revision;this.editor.sourceHash=this.sourceHash;this.formDirty=true;this.anchorStatus();};
    $('revision-from-source').onclick=()=>{if($('contribution-body').value&&!confirm('Replace the contribution text with the source edition?'))return;$('contribution-body').value=this.source.content;this.formDirty=true;};
    $('restore-source').onclick=()=>{if(this.source){$('shared-source-text').value=this.source.content;this.alternative=false;$('shared-source-title').textContent='Source edition';}};
    $('new-contribution').onclick=()=>{if(this.confirmLeave())this.clearEditor();};
    $('save-contribution').onclick=()=>this.action(()=>this.saveEditor());
    $('review-contribution').onclick=()=>this.action(()=>this.reviewContribution());
    $('review-book-publication').onclick=()=>this.action(()=>this.reviewBook());
    $('contribution-layer').onchange=()=>this.renderLayers();
    $('sync-contributions').onclick=()=>this.action(async()=>{for(const draft of [...this.drafts].filter(draft=>draft.dirty&&!draft.conflict&&(draft.sourceId||draft.localBookId===this.book?.id&&this.source?.id)))await this.syncDraft(draft);await this.refreshMine();this.renderLayers();this.message('Attached private contribution drafts synchronized. Unpublished-source drafts remain on this device. No publication was performed.');});
    $('refresh-shared-library').onclick=()=>this.action(()=>this.browse(true));$('more-shared-library').onclick=()=>this.action(()=>this.browse(false));$('shared-library-query').oninput=()=>this.renderBrowse();
    $('create-reading-group').onsubmit=event=>{event.preventDefault();this.action(async()=>{
      await this.cloud.sharingRpc('reader_create_group',{p_name:$('group-name').value,p_display_name:$('group-alias').value});$('group-name').value='';await this.openGroups();$('groups-status').textContent='Group created. Create an invitation code to share with friends.';
    });};
    $('join-reading-group').onsubmit=event=>{event.preventDefault();this.action(async()=>{
      await this.cloud.sharingRpc('reader_join_group',{p_code:$('group-code').value.trim(),p_display_name:$('join-group-alias').value});$('group-code').value='';await this.openGroups();$('groups-status').textContent='You joined the group. Group editions are available in Shared library.';
    });};
    window.addEventListener('beforeunload',event=>{if(this.formDirty){event.preventDefault();event.returnValue='';}});
    window.addEventListener('online',()=>{if($('sharing-dialog').open&&this.source?.id)this.action(()=>this.refreshSourceAccess());});
  }
  availability(){
    $('sync-contributions').disabled=!this.enabled;
    for(const id of ['review-contribution','save-contribution','capture-passage','review-current-source','revision-from-source'])$(id).disabled=!this.source;
    $('contribution-audience').querySelector('[value=group]').disabled=!this.groups.length;
    $('book-audience').querySelector('[value=group]').disabled=!this.groups.length;
    for(const form of ['create-reading-group','join-reading-group'])for(const control of $(form).querySelectorAll('button,input'))control.disabled=!this.enabled;
    $('more-shared-library').disabled=!this.cloud.sharingReady||this.lastPageSize<50;
  }
  renderGroups(container,selected){
    $(container).replaceChildren();
    const visibility=$(container==='book-groups'?'book-audience':'contribution-audience').value;
    $(container).hidden=visibility!=='group';
    for(const group of this.groups){
      const label=node('label',group.name),check=document.createElement('input');check.type='checkbox';check.value=group.id;check.checked=selected.includes(group.id);
      check.onchange=()=>{if(container==='contribution-groups')this.formDirty=true;};label.prepend(check);$(container).append(label);
    }
    if(!this.groups.length)$(container).append(node('p','Join a reading group to select its audience.','muted'));
  }
  selectedGroups(container){return [...$(container).querySelectorAll('input:checked')].map(input=>input.value);}
  clearEditor(){
    this.editing=null;this.editor={quote:'',anchorStart:null,anchorEnd:null,sourceRevision:this.source?.revision||0,sourceHash:this.sourceHash||'',groupIds:[]};this.formDirty=false;
    $('contribution-kind').value='note';$('contribution-body').value='';$('contribution-quote').value='';$('contribution-audience').value='private';$('revision-from-source').hidden=true;
    this.renderGroups('contribution-groups',[]);this.anchorStatus();
  }
  confirmLeave(){if(this.formDirty&&!confirm('Discard unsaved contribution changes? Save a private draft to keep them.'))return false;this.formDirty=false;return true;}
  stopSource(){this.source=null;this.shared=[];this.book=null;this.formDirty=false;$('shared-source-text').value='';}
  anchorStatus(){
    const stale=this.source&&this.editor&&(this.editor.sourceRevision!==this.source.revision||!anchorMatches(this.editor,this.source));
    $('contribution-anchor-status').textContent=stale?'Source edition changed — review or reattach before publishing.':this.editor?.quote?'Passage linked to the displayed source edition.':'Book-level contribution; no passage is selected.';
  }
  readEditor(){
    const previous=this.drafts.find(draft=>draft.id===this.editing);
    const choice=audience($('contribution-audience').value,$('contribution-audience').value==='group'?this.selectedGroups('contribution-groups'):[]);
    return {...previous,...validateContribution({id:previous?.id||crypto.randomUUID(),kind:$('contribution-kind').value,body:$('contribution-body').value,
      sourceId:previous?.sourceId||this.source.id||null,localBookId:previous?.localBookId||this.book?.id||null,
      quote:this.editor.quote,anchorStart:this.editor.anchorStart,anchorEnd:this.editor.anchorEnd,sourceRevision:this.editor.sourceRevision,sourceHash:this.editor.sourceHash,...choice}),dirty:true};
  }
  async saveEditor(){
    const draft=this.readEditor();await this.persist([...this.drafts.filter(item=>item.id!==draft.id),draft]);this.editing=draft.id;this.formDirty=false;
    this.renderLayers();this.message('Private working draft saved on this device. Nothing was published.');
    if(this.enabled){try{await this.syncDraft(draft);this.message('Private working draft saved to your account. Nothing was published.');}catch(error){this.message(`Saved on this device; account sync pending: ${error.message}`);}}
    return this.drafts.find(item=>item.id===draft.id);
  }
  async syncDraft(draft){
    let value={...draft};
    if(!value.sourceId&&this.source?.id&&value.localBookId===this.book?.id&&value.sourceHash===this.sourceHash)value={...value,sourceId:this.source.id,sourceRevision:this.source.revision};
    if(!value.sourceId)throw new Error('Save a private source edition or publish a shared edition before account sync. Your local draft is safe.');
    if(value.conflict)throw new Error('Resolve the private draft conflict before publishing.');
    const result=await this.cloud.saveContribution(value);
    if(result.conflict){await this.persist(this.drafts.map(item=>item.id===value.id?{...value,conflict:result.draft}:item));this.renderLayers();throw new Error('Another device changed this private draft. Both versions are retained.');}
    const next=fromCloudDraft(result.draft,value);await this.persist(this.drafts.map(item=>item.id===next.id?next:item));this.renderLayers();return next;
  }
  async refreshMine(){
    if(!this.enabled)return;
    const results=await Promise.allSettled([this.cloud.myContributions(),this.cloud.sharingRead(`reader_shared_contributions?select=*&owner_id=eq.${this.cloud.session.user.id}`)]);
    for(const result of results)if(result.status==='rejected')throw result.reason;
    const snapshots=new Map(results[1].value.map(row=>[row.id,row])),map=new Map(this.drafts.map(draft=>[draft.id,draft]));
    for(const row of results[0].value){const local=map.get(row.id);map.set(row.id,local?.dirty?{...local,...(row.revision!==(local.cloudRevision||0)?{conflict:row}:{})}:fromCloudDraft(row,local));map.get(row.id).publication=snapshots.get(row.id)||null;}
    await this.persist([...map.values()]);
  }
  editDraft(draft){
    if(!this.confirmLeave())return;
    this.editing=draft.id;this.editor={...draft};$('contribution-kind').value=draft.kind;$('contribution-body').value=draft.body;$('contribution-quote').value=draft.quote;$('contribution-audience').value=draft.visibility;
    $('revision-from-source').hidden=draft.kind!=='revision';this.renderGroups('contribution-groups',draft.groupIds);this.anchorStatus();
  }
  renderLayers(){
    $('contribution-list').replaceChildren();const filter=$('contribution-layer').value;if(filter==='none')return;
    const own=this.drafts.filter(draft=>this.source&&(draft.sourceId===this.source.id&&Boolean(this.source.id)||this.book&&draft.localBookId===this.book.id));
    if(['all','mine'].includes(filter))for(const draft of own){
      const card=node('article',undefined,'contribution-card');card.append(node('strong',CONTRIBUTION_TYPES[draft.kind]),node('p',draft.publication&&draft.publication.visibility!=='private'?`Published snapshot: ${draft.publication.visibility} · working draft remains separate`:'Private working draft — not published','audience-badge'),node('p',`Audience on next publication: ${draft.visibility}`,'muted'));
      if(draft.quote)card.append(node('blockquote',draft.quote));card.append(node('pre',draft.body));
      const edit=node('button','Edit private draft');edit.onclick=()=>this.editDraft(draft);card.append(edit);
      if(draft.kind==='revision'){const preview=node('button','View my revised edition');preview.onclick=()=>{$('shared-source-text').value=draft.body;this.alternative=true;$('shared-source-title').textContent='My revised edition · source remains unchanged';$('shared-source-text').scrollIntoView({block:'center'});};card.append(preview);}
      if(draft.conflict){card.append(node('p','Private draft conflict: both device and account versions are retained.','error'));const recover=node('button','Keep device version as a new private draft');recover.onclick=()=>this.action(async()=>{
        const copy={...validateContribution(draft),id:crypto.randomUUID(),visibility:'private',groupIds:[],dirty:true,cloudRevision:0};const remote=fromCloudDraft(draft.conflict,draft);await this.persist([...this.drafts.filter(item=>item.id!==draft.id),remote,copy]);this.renderLayers();this.message('Both drafts retained. The device version is now a separate private draft.');
      });card.append(recover);}
      $('contribution-list').append(card);
    }
    for(const contribution of this.shared.filter(item=>filter==='all'||filter===item.visibility)){
      const author=contribution.owner_id===this.cloud.session?.user.id?'You':this.members.find(member=>member.user_id===contribution.owner_id)?.display_name||'Another reader';
      const cap=this.source.visibility!=='public'?` · limited by ${this.source.visibility} source`:'';
      const card=node('article',undefined,'contribution-card');card.append(node('strong',CONTRIBUTION_TYPES[contribution.kind]||contribution.kind),node('p',`${contribution.visibility} · ${author}${cap}`,'audience-badge'));
      if(contribution.quote)card.append(node('blockquote',contribution.quote));
      if(contribution.source_revision!==this.source.revision)card.append(node('p','Source edition changed; passage may need reattachment.','muted'));
      card.append(node('pre',contribution.body));
      if(contribution.kind==='revision'){const view=node('button','View alternative edition');view.onclick=()=>{$('shared-source-text').value=contribution.body;this.alternative=true;$('shared-source-title').textContent='Alternative edition · source remains unchanged';$('shared-source-text').scrollIntoView({block:'center'});};card.append(view);}
      else if(contribution.quote){const locate=node('button','Locate source passage');locate.onclick=()=>{
        const draft={quote:contribution.quote,anchorStart:contribution.anchor_start,anchorEnd:contribution.anchor_end};if(contribution.source_revision!==this.source.revision||!anchorMatches(draft,this.source)){this.message('This passage needs reattachment to the current source edition.');return;}
        const points=[...this.source.content],start=points.slice(0,contribution.anchor_start).join('').replace(/\r\n?/g,'\n').length,end=points.slice(0,contribution.anchor_end).join('').replace(/\r\n?/g,'\n').length;$('shared-source-text').value=this.source.content;this.alternative=false;$('shared-source-text').focus();$('shared-source-text').setSelectionRange(start,end);
      };card.append(locate);}
      $('contribution-list').append(card);
    }
    if(!$('contribution-list').childElementCount)$('contribution-list').append(node('p','No contributions in this layer.','muted'));
  }
  reviewDialog(title){const dialog=$('publish-dialog');dialog.querySelector('h2').textContent=title;const body=dialog.querySelector('.dialog-content');body.replaceChildren();this.showAtStart(dialog);return body;}
  async reviewBook(){
    if(!this.book)return;
    await this.saveBook();const book=this.context().book,reviewed=publicContent(book),choice=audience($('book-audience').value,$('book-audience').value==='group'?this.selectedGroups('book-groups'):[]);
    const body=this.reviewDialog(choice.visibility==='private'?'Make the edition private':'Review shared edition');
    body.append(node('p',`Audience: ${choice.visibility}${choice.groupIds.length?' · '+choice.groupIds.length+' selected group(s)':''}`),node('h3',reviewed.title),node('pre',reviewed.content),node('p','Only this title, language and text are shared. The separate Private reading notes field, vocabulary, reference files, histories and migration archives are excluded. Anything already in the article text, including flattened legacy annotations, is included in this preview. Existing contributions keep their own audience; access is also limited by the source.'));
    const publish=node('button',choice.visibility==='private'?(this.actualPublication?'Make private / withdraw':'Save private source edition'):'Publish reviewed edition','primary');publish.disabled=!this.enabled||this.publicationUnknown;
    if(!this.enabled)body.append(node('p',this.readyMessage(),'muted'));
    publish.onclick=()=>this.action(async()=>{
      await this.syncBook();const current=this.context().book;
      if(JSON.stringify(publicContent(current))!==JSON.stringify(reviewed))throw new Error('The article changed. Close this preview and review the latest edition.');
      const result=await this.cloud.sharingRpc('reader_publish_book',{p_document:current.id,p_document_revision:current.revision,p_visibility:choice.visibility,p_groups:choice.groupIds,p_revision:this.actualPublication?.revision||0});
      if(result.conflict)throw new Error('Another device changed the publication. Reopen Sharing & contributions and review it again.');
      $('publish-dialog').close();await this.openOwn();this.message(choice.visibility==='private'?'Private source edition saved. Contributions were not republished or widened.':'The reviewed edition was published. Your personal notes and drafts remain private.');
    });body.append(publish);
  }
  async reviewContribution(){
    const draft=await this.saveEditor(),body=this.reviewDialog('Review contribution visibility');
    body.append(node('p',`Audience: ${draft.visibility}${draft.groupIds.length?' · '+draft.groupIds.length+' selected group(s)':''}`),node('h3',CONTRIBUTION_TYPES[draft.kind]));
    if(draft.quote)body.append(node('blockquote',draft.quote));body.append(node('pre',draft.body),node('p','This action updates only this contribution’s snapshot. The source book and your other contributions keep their own settings.'));
    const permitted=audienceWithinSource(draft,this.source),publish=node('button',draft.visibility==='private'?'Keep private / withdraw shared copy':'Publish this contribution','primary');
    const stale=draft.visibility!=='private'&&(draft.sourceRevision!==this.source.revision||!anchorMatches(draft,this.source));
    publish.disabled=!this.enabled||!draft.sourceId||!permitted||Boolean(draft.conflict)||draft.dirty||!draft.cloudRevision||stale;
    if(!permitted)body.append(node('p','The source audience is narrower. Publish the source appropriately, or choose a permitted contribution audience.','error'));
    if(!this.enabled||!draft.sourceId)body.append(node('p',!draft.sourceId?'Save a private source edition, or publish a shared one, before account synchronization. This contribution remains a private device draft.':this.readyMessage(),'muted'));
    if(stale)body.append(node('p','Review or reattach this contribution to the current source edition before publishing.','error'));
    if(draft.sourceId&&this.enabled&&(draft.dirty||!draft.cloudRevision||draft.conflict))body.append(node('p','The private account draft is not synchronized or has a conflict. Resolve it before publication.','error'));
    publish.onclick=()=>this.action(async()=>{
      const result=await this.cloud.sharingRpc('reader_publish_contribution',{p_id:draft.id,p_draft_revision:draft.cloudRevision,p_revision:draft.publication?.revision||0});
      if(result.conflict)throw new Error('Another device changed the shared contribution. Refresh before publishing.');
      await this.persist(this.drafts.map(item=>item.id===draft.id?{...item,publication:result.publication}:item));$('publish-dialog').close();this.shared=await this.cloud.sharedContributions(this.source.id);this.renderLayers();this.message(draft.visibility==='private'?'The contribution is private. The source edition is unchanged.':'Only this reviewed contribution was published. Other drafts remain private.');
    });body.append(publish);
  }
  async refreshSourceAccess(){
    const source=await this.cloud.sourceById(this.source.id);
    if(!source){this.source=null;this.shared=[];$('shared-source-text').value='';this.renderLayers();this.message('Source access ended. Your own saved private contributions remain available in backups.');this.availability();return;}
    this.source=source;this.sourceHash=await digest(source.content);$('shared-source-text').value=source.content;this.alternative=false;this.shared=await this.cloud.sharedContributions(source.id);this.renderLayers();this.anchorStatus();
  }
  async browse(reset){
    if(reset){this.offset=0;this.browsed=[];}
    if(!$('shared-library-dialog').open)$('shared-library-dialog').showModal();
    if(!this.cloud.sharingReady){$('shared-library-status').textContent=this.readyMessage();this.lastPageSize=0;this.renderBrowse();return;}
    const rows=await this.cloud.sharedSources(this.offset);this.lastPageSize=rows.length;this.offset+=rows.length;this.browsed.push(...rows);$('shared-library-status').textContent='Only editions permitted for the current viewer are returned by the database.';this.renderBrowse();
  }
  renderBrowse(){
    $('shared-library-list').replaceChildren();const query=$('shared-library-query').value.toLocaleLowerCase();
    for(const source of (this.browsed||[]).filter(item=>`${item.title} ${item.language}`.toLocaleLowerCase().includes(query))){const card=node('article',undefined,'contribution-card');card.append(node('h3',source.title),node('p',source.visibility==='group'?'Reading group edition':'Public edition','audience-badge'));const open=node('button','Open shared edition');open.onclick=()=>this.action(()=>this.openSource(source.id));card.append(open);$('shared-library-list').append(card);}
    this.availability();
  }
  async refreshGroups(){
    if(!this.enabled){this.groups=[];this.members=[];return;}
    const results=await Promise.allSettled([this.cloud.groups(),this.cloud.groupMembers()]);for(const result of results)if(result.status==='rejected')throw result.reason;
    this.groups=results[0].value;this.members=results[1].value;
  }
  async openGroups(){
    await this.refreshGroups();$('groups-status').textContent=this.readyMessage();$('reading-group-list').replaceChildren();$('group-invitation').replaceChildren();
    for(const group of this.groups){
      const card=node('article',undefined,'contribution-card');card.append(node('h3',group.name));
      const organizer=group.owner_id===this.cloud.session.user.id;
      for(const member of this.members.filter(member=>member.group_id===group.id)){
        const row=node('p',`${member.display_name} · ${member.role}`);
        if(member.role!=='organizer'&&(organizer||member.user_id===this.cloud.session.user.id)){const remove=node('button',organizer?'Remove member':'Leave group');remove.onclick=()=>this.action(async()=>{if(!confirm(`${organizer?'Remove '+member.display_name:'Leave this group'}? Group reading access will end.`))return;await this.cloud.sharingRpc('reader_remove_member',{p_group:group.id,p_member:member.user_id});await this.openGroups();});row.append(remove);}
        card.append(row);
      }
      if(organizer){
        const invite=node('button','Create invitation code');invite.onclick=()=>this.action(async()=>{const result=await this.cloud.sharingRpc('reader_invite_group',{p_group:group.id});$('group-invitation').replaceChildren(node('p',`Anyone with this code can join ${group.name} until ${new Date(result.expires_at).toLocaleString()}. Share it only with intended friends.`));const code=document.createElement('input');code.readOnly=true;code.value=result.code;code.setAttribute('aria-label','Group invitation code');$('group-invitation').append(code);});card.append(invite);
        const revoke=node('button','Revoke invitation codes');revoke.onclick=()=>this.action(async()=>{await this.cloud.sharingRpc('reader_revoke_invites',{p_group:group.id});$('group-invitation').replaceChildren();$('groups-status').textContent='Existing invitation codes were revoked. Current members are unchanged.';});card.append(revoke);
      }
      $('reading-group-list').append(card);
    }
    this.showAtStart($('groups-dialog'));this.availability();
  }
  async exportData(){const contributions=await getSetting(this.key)||[];return {version:1,contributions:contributions.map(validateContribution)};}
  async countDrafts(){return (await getSetting(this.key)||[]).length;}
  reset(){
    this.stopSource();this.drafts=[];this.groups=[];this.members=[];this.browsed=[];this.actualPublication=null;this.editor=null;this.editing=null;this.sourceHash='';this.offset=0;this.lastPageSize=0;this.publicationUnknown=true;this.openError='';
    for(const id of ['sharing-dialog','shared-library-dialog','groups-dialog','publish-dialog'])$(id).close();
    for(const id of ['contribution-body','contribution-quote','shared-source-link','group-code','group-name','group-alias','join-group-alias'])$(id).value='';
    for(const id of ['contribution-list','group-invitation','reading-group-list','shared-library-list','book-groups','contribution-groups'])$(id).replaceChildren();
    $('sharing-title').textContent='Sharing & contributions';$('sharing-access').textContent='';$('book-publication-state').textContent='';$('source-edition-state').textContent='';
    $('publish-dialog').querySelector('.dialog-content').replaceChildren();this.message('');$('groups-status').textContent='';$('shared-library-status').textContent='';
  }
}
