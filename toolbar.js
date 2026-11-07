import {BLOCKS,ADAPTERS,PROVIDERS,preset,effectivePreferences,validateStudy} from './toolbar-model.js';
import {getSetting,setSetting} from './storage.js';
const $=id=>document.getElementById(id);
const text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};

export class ReaderTools {
  constructor({context,run,notify,openSource}) {
    this.context=context;this.run=run;this.notify=notify;this.openSource=openSource;this.profile={};this.preferences=preset();
    this.target='article';this.mode=false;this.words=[];this.selected='';this.providers=['wiktionary','cambridge'];
    this.media=matchMedia('(max-width:760px)');
    this.device=this.media.matches?'phone':'desktop';
    this.media.addEventListener('change',()=>this.run(()=>this.activate(false)));
    $('reader-tools').innerHTML=`
      <div class="tools-control"><label>Tools for <select id="tool-target"><option value="article">Editable article</option><option value="pdf">Original PDF</option></select></label>
      <span id="tool-scope-label" class="muted"></span><button id="reading-mode" aria-pressed="false">Reading mode</button><button id="customize-tools">Customize tools</button></div>
      <div id="tool-blocks" class="tool-blocks"></div>`;
    for(const block of BLOCKS){
      const section=document.createElement('section');section.className='tool-block';section.dataset.block=block.id;
      section.innerHTML=`<div class="block-heading"><button class="block-toggle" aria-controls="block-${block.id}" aria-expanded="false">${block.label}</button><button class="block-pin" aria-label="Pin ${block.label}" aria-pressed="false">Pin</button></div><div class="block-body" id="block-${block.id}" hidden></div>`;
      section.querySelector('.block-toggle').onclick=()=>this.run(()=>this.changeBlock(block.id,'expanded'));
      section.querySelector('.block-pin').onclick=()=>this.run(()=>this.changeBlock(block.id,'pinned'));
      $('tool-blocks').append(section);
    }
    $('block-navigate').innerHTML=`<label>Find in article<input id="find-query" type="search" maxlength="200"></label><button id="find-next">Find next</button><button id="article-top">Article start</button><p id="navigation-hint" class="tool-hint"></p>`;
    $('block-view').innerHTML=`<label>Text size<select id="text-size"><option value="16">16 px</option><option value="18" selected>18 px</option><option value="20">20 px</option><option value="24">24 px</option><option value="28">28 px</option></select></label><label>Line spacing<select id="line-spacing"><option value="1.5">Compact</option><option value="1.85" selected>Comfortable</option><option value="2.2">Wide</option></select></label><p id="view-hint" class="tool-hint"></p>`;
    $('block-layout').innerHTML=`<label>Layout<select id="pane-layout"><option value="side">Side by side</option><option value="stack">Stacked</option><option value="focus">Active pane only</option></select></label><p class="tool-hint">Phones stack panes automatically. Focus keeps the selected pane visible.</p>`;
    $('block-dictionary').innerHTML=`<div class="dictionary-entry"><label>Word or phrase<input id="dictionary-word" maxlength="200" placeholder="Select text or enter a word"></label><button id="use-selection">Use selection</button><label>Language<select id="word-language"><option value="en">English</option><option value="zh-CN">Chinese</option><option value="ru">Russian</option><option value="fr">French</option><option value="ja">Japanese</option><option value="de">German</option><option value="es">Spanish</option></select></label><button id="pronounce">Pronounce</button></div>
      <div class="dictionary-links" id="dictionary-links"></div><p class="tool-hint">Online links send the entered word to the named provider only when opened. No automatic online lookup. Pronunciation uses your browser’s speech service.</p>
      <details><summary>Choose dictionaries & order</summary><div id="dictionary-providers"></div></details>
      <details id="word-editor"><summary>Save to personal vocabulary</summary><label>Definition<textarea id="word-definition" maxlength="5000"></textarea></label><label>Source context<textarea id="word-context" maxlength="5000"></textarea></label><label>Personal note<textarea id="word-note" maxlength="5000"></textarea></label><button id="save-word">Save word</button><button id="cancel-word-edit" hidden>Cancel editing</button></details>
      <details id="vocabulary-review"><summary>Vocabulary review</summary><label>Review scope<select id="vocabulary-scope"><option value="book">This article</option><option value="all">All articles</option></select></label><label>Search vocabulary<input id="vocabulary-search" type="search"></label><div id="vocabulary-list"></div></details><p id="vocabulary-status" class="tool-hint" role="status">Vocabulary saves on this device and is included in backups.</p>`;
    $('block-speech').innerHTML=`<button id="read-selection">Read selected text</button><button id="stop-reading">Stop</button><p id="speech-hint" class="tool-hint">Uses your browser’s speech service and the dictionary language setting. Select up to 5,000 characters.</p>`;
    $('block-contributions').innerHTML=`<button id="item-sharing">Sharing & contributions</button><p class="tool-hint">Private drafts, selected groups, or public snapshots. The source and each contribution keep separate audiences.</p>`;
    for(const id of ['attach-pdf','pdf-file','remove-pdf','history','export-text','delete-book'])$('block-files').append($(id));
    const fileHint=text('p','File and history actions apply to the editable article; Open reference PDF attaches its original source.');fileHint.className='tool-hint';$('block-files').append(fileHint);
    document.querySelector('.workspace-tools').remove();
    $('block-view').prepend(document.querySelector('.tools-control label'));
    document.querySelector('.workspace-heading').append($('reading-mode'));
    const settings=document.createElement('details');settings.className='header-tool-settings';
    const summary=text('summary','⚙');summary.setAttribute('aria-label','Tool settings');settings.append(summary,$('tool-scope-label'),$('customize-tools'));
    document.querySelector('.workspace-heading').append(settings);
    document.querySelector('.tools-control').remove();
    this.makeSettings();this.bind();
  }
  bind(){
    $('tool-target').onchange=()=>this.run(async()=>{this.stop();this.target=$('tool-target').value;await this.activate(false);this.preferences.view.visible=true;this.preferences.view.expanded=true;this.paint();});
    $('reading-mode').onclick=()=>{this.mode=!this.mode;this.paint();};
    $('customize-tools').onclick=()=>this.openSettings();
    $('find-next').onclick=()=>this.find();$('find-query').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();this.find();}};
    $('article-top').onclick=()=>{if(this.rich?.loaded){this.rich.tool('top');return;}$('content').focus();$('content').setSelectionRange(0,0);$('content').scrollTop=0;};
    for(const id of ['text-size','line-spacing','pane-layout'])$(id).onchange=()=>this.run(()=>this.saveView());
    for(const event of ['select','keyup','pointerup'])$('content').addEventListener(event,()=>this.capture());
    $('selection-lookup').onclick=()=>this.run(async()=>{await this.revealDictionary();this.useSelection();});
    $('use-selection').onclick=()=>this.useSelection();
    $('dictionary-word').oninput=()=>{if($('word-editor').open)this.wordDirty=true;this.links();};
    for(const id of ['word-definition','word-context','word-note','word-language'])$(id).addEventListener('input',()=>{this.wordDirty=true;});
    $('pronounce').onclick=()=>this.speak($('dictionary-word').value);
    $('read-selection').onclick=()=>this.speak(this.selected);
    $('stop-reading').onclick=()=>this.stop();
    $('save-word').onclick=()=>this.run(()=>this.saveWord());
    $('cancel-word-edit').onclick=()=>this.resetWord();
    $('vocabulary-search').oninput=()=>this.reviewWords();$('vocabulary-scope').onchange=()=>this.reviewWords();
    this.links();this.providerControls();
  }
  get key(){return `tools:${this.context().scope}:${this.device}`;}
  async activate(newBook=true){
    this.device=this.media.matches?'phone':'desktop';
    this.stop();this.profile=await getSetting(this.key)||{};
    this.providers=Array.isArray(this.profile.providers)?this.profile.providers.filter(id=>PROVIDERS[id]):['wiktionary','cambridge'];
    this.words=await getSetting(`vocabulary:${this.context().scope}`)||[];
    if(!this.context().hasPdf)this.target='article';
    $('tool-target').value=this.target;$('tool-target').querySelector('[value=pdf]').disabled=!this.context().hasPdf;
    this.preferences=effectivePreferences(this.profile,this.target,this.context().book?.id);
    const key=this.context().book?`${this.context().scope}:${this.context().book.id}`:null;
    if(this.lastScope!==this.context().scope)this.lastBook=null;
    if(key&&this.lastBook&&this.lastBook!==key)for(const state of Object.values(this.preferences))if(!state.pinned)state.expanded=false;
    if(key)this.lastBook=key;
    this.lastScope=this.context().scope;
    const view=this.profile.views?.[`${this.context().book?.id}:${this.target}`]||{};
    $('text-size').value=['16','18','20','24','28'].includes(view.size)?view.size:'18';
    $('line-spacing').value=['1.5','1.85','2.2'].includes(view.spacing)?view.spacing:'1.85';
    $('pane-layout').value=['side','stack','focus'].includes(view.layout)?view.layout:'side';
    if(newBook){this.selected='';this.mode=false;this.resetWord();$('selection-lookup').hidden=true;}
    this.paint();this.links();this.providerControls();this.reviewWords();this.applyView();
  }
  source(){const id=this.context().book?.id;return this.profile.books?.[`${id}:${this.target}`]?'This article':this.profile.formats?.[this.target]?'This format':this.profile.defaults?'My defaults':'Built-in defaults';}
  paint(){
    $('tool-blocks').hidden=this.mode;$('reading-mode').textContent=this.mode?'Show tools':'Reading mode';$('reading-mode').setAttribute('aria-pressed',String(this.mode));
    $('tool-scope-label').textContent=`${this.source()} · ${this.device==='phone'?'Phone':'Desktop'} layout`;
    for(const {id} of BLOCKS){
      const state=this.preferences[id],section=document.querySelector(`[data-block="${id}"]`);
      section.hidden=!state.visible;section.querySelector('.block-body').hidden=!state.expanded;
      section.querySelector('.block-toggle').setAttribute('aria-expanded',String(state.expanded));
      const pin=section.querySelector('.block-pin');pin.textContent=state.pinned?'Unpin':'Pin';pin.setAttribute('aria-pressed',String(state.pinned));
    }
    this.syncRichPanels();this.availability();
  }
  syncRichPanels(){
    this.rich?.tool('panels',{blocks:Object.fromEntries(BLOCKS.map(({id})=>[id,!this.mode&&this.preferences[id].visible&&this.preferences[id].expanded]))});
  }
  availability(){
    const adapter=ADAPTERS[this.target];
    for(const id of ['find-query','find-next','article-top','text-size','line-spacing'])$(id).disabled=!adapter.textView;
    $('read-selection').disabled=!adapter.speech||!('speechSynthesis' in window);
    $('pronounce').disabled=!('speechSynthesis' in window);
    $('use-selection').disabled=!adapter.textSelection;
    $('navigation-hint').textContent=adapter.textView?'Searches the editable article.':'Use the PDF viewer’s page and search controls.';
    $('view-hint').textContent=adapter.textView?'Text appearance affects this device only.':'Use the PDF viewer’s own zoom and rotation controls.';
    if(!('speechSynthesis' in window))$('speech-hint').textContent='Speech is not available in this browser.';
  }
  async changeBlock(id,key){
    this.preferences[id][key]=!this.preferences[id][key];
    const bookId=this.context().book?.id;
    this.profile.books??={};this.profile.books[`${bookId}:${this.target}`]=structuredClone(this.preferences);
    await setSetting(this.key,this.profile);this.paint();
  }
  makeSettings(){
    const dialog=document.createElement('dialog');dialog.id='tools-dialog';
    dialog.innerHTML=`<div class="dialog-heading"><h2>Customize tools</h2><button id="close-tools" aria-label="Close tool settings">×</button></div><p>Choose visible blocks. Expand or pin them from their headers.</p><label>Save changes for<select id="preference-scope"><option value="book">This article</option><option value="format">This file format</option><option value="defaults">My defaults</option></select></label><label>Starting preset<select id="tool-preset"><option value="reading">Reading</option><option value="study">Study</option><option value="editing">Editing</option></select></label><button id="apply-preset">Use preset</button><div id="block-options"></div><p class="tool-hint">This article → This format → My defaults → Built-in defaults. Phone and desktop layouts are stored separately on this device.</p><div class="actions"><button id="save-tool-settings" class="primary">Save tools</button><button id="inherit-tools">Reset / inherit defaults</button></div>`;
    document.body.append(dialog);
    $('close-tools').onclick=()=>dialog.close();
    const draftForScope=()=>{
      const scope=$('preference-scope').value,id=this.context().book?.id;
      const source=scope==='defaults'?this.profile.defaults:scope==='format'?this.profile.formats?.[this.target]:this.profile.books?.[`${id}:${this.target}`];
      this.settingsDraft=structuredClone(source||effectivePreferences(scope==='format'?{defaults:this.profile.defaults}:scope==='defaults'?{}:this.profile,this.target,id));
      this.settingsOptions();
    };
    $('preference-scope').onchange=draftForScope;
    $('apply-preset').onclick=()=>{this.settingsDraft=preset($('tool-preset').value);this.settingsOptions();};
    $('save-tool-settings').onclick=()=>this.run(()=>this.saveSettings(false));
    $('inherit-tools').onclick=()=>this.run(()=>this.saveSettings(true));
  }
  openSettings(scope='book'){this.settingsDraft=structuredClone(scope==='defaults'?effectivePreferences({defaults:this.profile.defaults}):this.preferences);$('preference-scope').querySelector('[value=book]').disabled=!this.context().book;$('preference-scope').value=scope;this.settingsOptions();$('tools-dialog').showModal();}
  settingsOptions(){
    $('block-options').replaceChildren();
    for(const block of BLOCKS){this.settingsDraft[block.id]??=structuredClone(preset()[block.id]);const label=text('label',block.label),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=this.settingsDraft[block.id].visible;checkbox.onchange=()=>{this.settingsDraft[block.id].visible=checkbox.checked;};label.prepend(checkbox);$('block-options').append(label);}
  }
  async saveSettings(reset){
    const scope=$('preference-scope').value,id=this.context().book?.id;
    if(scope==='defaults'){if(reset)delete this.profile.defaults;else this.profile.defaults=structuredClone(this.settingsDraft);}
    else {const key=scope==='book'?`${id}:${this.target}`:this.target,bucket=scope==='book'?'books':'formats';this.profile[bucket]??={};if(reset)delete this.profile[bucket][key];else this.profile[bucket][key]=structuredClone(this.settingsDraft);}
    await setSetting(this.key,this.profile);this.preferences=effectivePreferences(this.profile,this.target,id);this.paint();$('tools-dialog').close();
    this.notify('Tool preferences saved on this device. More specific article or format settings take priority.');
  }
  navigateAway(){this.stop();for(const state of Object.values(this.preferences))if(!state.pinned)state.expanded=false;this.paint();}
  confirmLeave(){
    if(this.wordDirty&&!window.confirm('Discard unsaved vocabulary changes? Save the word first to keep them.'))return false;
    this.wordDirty=false;return true;
  }
  applyView(){
    $('workspace-view').dataset.layout=$('pane-layout').value;
    $('workspace-view').dataset.target=this.target;
    for(const id of ['content','notes']){$(id).style.fontSize=$('text-size').value+'px';$(id).style.lineHeight=$('line-spacing').value;}
  }
  async saveView(){
    this.profile.views??={};this.profile.views[`${this.context().book?.id}:${this.target}`]={size:$('text-size').value,spacing:$('line-spacing').value,layout:$('pane-layout').value};
    await setSetting(this.key,this.profile);this.applyView();if(this.rich?.loaded)this.rich.tool('view',{size:$('text-size').value,spacing:$('line-spacing').value,layout:$('pane-layout').value});
  }
  capture(){
    const area=$('content');this.selected=area.value.slice(area.selectionStart,area.selectionEnd).trim();
    $('selection-lookup').hidden=!this.selected||this.target!=='article';
  }
  async revealDictionary(){
    this.mode=false;this.preferences.dictionary.visible=true;this.preferences.dictionary.expanded=true;this.paint();
  }
  useSelection(){
    if(!this.selected){this.notify('Select text in the editable article first, or enter a word manually.');return;}
    if(this.selected.length>200){this.notify('Select a word or phrase of up to 200 characters for lookup.');return;}
    if(!this.confirmLeave())return;
    this.resetWord();$('dictionary-word').value=this.selected;
    const area=$('content'),start=area.selectionStart,end=area.selectionEnd;
    $('word-context').value=area.value.slice(Math.max(0,start-160),Math.min(area.value.length,end+160));
    this.links();$('dictionary-word').focus();
  }
  links(){
    $('dictionary-links').replaceChildren();const word=$('dictionary-word').value.trim();
    for(const id of this.providers){const a=text('a',`${PROVIDERS[id].label} ↗`);a.className='external-tool';if(word){a.href=PROVIDERS[id].url(word);a.target='_blank';a.rel='noopener noreferrer';}else{a.setAttribute('aria-disabled','true');} $('dictionary-links').append(a);}
    const translate=text('a','Google Translate ↗');translate.className='external-tool';
    if(word){translate.href=`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(word)}&op=translate`;translate.target='_blank';translate.rel='noopener noreferrer';}else translate.setAttribute('aria-disabled','true');
    $('dictionary-links').append(translate);
  }
  providerControls(){
    $('dictionary-providers').replaceChildren();
    for(const id of [...this.providers,...Object.keys(PROVIDERS).filter(id=>!this.providers.includes(id))]){
      const row=document.createElement('div');row.className='provider-row';
      const label=text('label',PROVIDERS[id].label),check=document.createElement('input');check.type='checkbox';check.checked=this.providers.includes(id);label.prepend(check);
      check.onchange=()=>this.run(async()=>{const next=check.checked?[...this.providers,id]:this.providers.filter(value=>value!==id);await this.saveProviders(next);});
      row.append(label);const up=text('button','Move up');up.disabled=!this.providers.includes(id)||this.providers.indexOf(id)===0;up.onclick=()=>this.run(async()=>{const next=[...this.providers],index=next.indexOf(id);[next[index-1],next[index]]=[next[index],next[index-1]];await this.saveProviders(next);});row.append(up);$('dictionary-providers').append(row);
    }
  }
  async saveProviders(next){this.profile.providers=next;await setSetting(this.key,this.profile);this.providers=next;this.links();this.providerControls();}
  resetWord(){
    this.wordDirty=false;this.editingWord=null;for(const id of ['dictionary-word','word-definition','word-context','word-note'])$(id).value='';
    $('save-word').textContent='Save word';$('cancel-word-edit').hidden=true;this.links();
  }
  async saveWord(){
    const book=this.context().book;if(!book)return;
    const word={id:this.editingWord||crypto.randomUUID(),bookId:book.id,word:$('dictionary-word').value.trim(),language:$('word-language').value,definition:$('word-definition').value,context:$('word-context').value,note:$('word-note').value};
    validateStudy({version:1,vocabulary:[word]},[book.id]);
    const next=[...this.words.filter(entry=>entry.id!==word.id),word];
    await setSetting(`vocabulary:${this.context().scope}`,next);this.words=next;this.resetWord();this.reviewWords();
    $('vocabulary-status').textContent='Word saved on this device · included in backups. Vocabulary cloud sync is not enabled.';
  }
  reviewWords(){
    $('vocabulary-list').replaceChildren();const query=$('vocabulary-search').value.toLocaleLowerCase(),book=this.context().book;
    const visible=this.words.filter(entry=>($('vocabulary-scope').value==='all'||entry.bookId===book?.id)&&`${entry.word} ${entry.definition} ${entry.context} ${entry.note}`.toLocaleLowerCase().includes(query));
    for(const entry of visible){
      const row=document.createElement('article');row.className='vocabulary-row';row.append(text('strong',entry.word),text('p',entry.definition||'No definition yet'),text('p',entry.context));
      const source=this.context().books?.find(b=>b.id===entry.bookId);row.append(text('small',`Source: ${source?.title||'Article unavailable'}${source?.deleted?' · in trash':''}`));
      if(source&&!source.deleted&&entry.bookId!==book?.id){const open=text('button','Open source article');open.onclick=()=>this.run(async()=>{await this.openSource(entry.bookId);await this.revealDictionary();$('vocabulary-review').open=true;});row.append(open);}
      if(entry.bookId===book?.id){
        const edit=text('button','Edit word');edit.onclick=()=>{this.editingWord=entry.id;$('dictionary-word').value=entry.word;$('word-definition').value=entry.definition;$('word-context').value=entry.context;$('word-note').value=entry.note;$('word-language').value=entry.language;$('word-editor').open=true;$('save-word').textContent='Update word';$('cancel-word-edit').hidden=false;this.links();};row.append(edit);
        const remove=text('button','Remove word');remove.onclick=()=>this.run(async()=>{const next=this.words.filter(word=>word.id!==entry.id);await setSetting(`vocabulary:${this.context().scope}`,next);this.words=next;if(this.editingWord===entry.id)this.resetWord();this.reviewWords();});row.append(remove);
      }
      $('vocabulary-list').append(row);
    }
    if(!visible.length)$('vocabulary-list').append(text('p','No saved words match.'));
  }
  find(){
    if(this.rich?.loaded){this.rich.tool('find',{query:$('find-query').value});return;}
    const area=$('content'),query=$('find-query').value;if(!query)return;
    const haystack=area.value.toLocaleLowerCase(),needle=query.toLocaleLowerCase();
    let index=haystack.indexOf(needle,area.selectionEnd);if(index<0)index=haystack.indexOf(needle);
    if(index<0){$('navigation-hint').textContent='No matches in this article.';return;}
    area.focus();area.setSelectionRange(index,index+query.length);
    const lines=area.value.slice(0,index).split('\n').length-1;area.scrollTop=lines*parseFloat(getComputedStyle(area).lineHeight);this.capture();$('navigation-hint').textContent='Match selected in the article.';
  }
  speak(value){
    const phrase=value.trim();if(!phrase){this.notify('Select text or enter a word first.');return;}
    if(phrase.length>5000){this.notify('Select up to 5,000 characters to read aloud.');return;}
    if(!('speechSynthesis' in window)){this.notify('Speech is unavailable in this browser.');return;}
    this.stop();const utterance=new SpeechSynthesisUtterance(phrase);utterance.lang=$('word-language').value;
    utterance.onerror=event=>{if(!['canceled','interrupted'].includes(event.error))this.notify('Speech could not play. Check available voices and browser audio settings.');};window.speechSynthesis.speak(utterance);
  }
  stop(){window.speechSynthesis?.cancel();}
  async exportStudy(bookIds){const vocabulary=await getSetting(`vocabulary:${this.context().scope}`)||[];return {version:1,vocabulary:vocabulary.filter(word=>bookIds.includes(word.bookId))};}
}
