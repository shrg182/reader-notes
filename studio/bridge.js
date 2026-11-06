(() => {
  let nonce=null,initializing=true,timer,sending=false,pending=false;
  const memory=new Map(),session=new Map();let dictionaryMutations={};
  const storage=map=>({getItem:k=>map.has(String(k))?map.get(String(k)):null,setItem(k,v){if(!initializing&&String(k)==='reading-lexicon-entry-overrides-v1'){try{const previous=JSON.parse(map.get(String(k))||'{}'),next=JSON.parse(String(v));for(const key of new Set([...Object.keys(previous),...Object.keys(next)]))if(JSON.stringify(previous[key])!==JSON.stringify(next[key]))dictionaryMutations[key]={time:new Date().toISOString(),deleted:!(key in next),...(key in next?{value:next[key]}:{})};}catch{}}map.set(String(k),String(v));if(!initializing)markDirty();},removeItem(k){map.delete(String(k));if(!initializing)markDirty();},clear(){map.clear();if(!initializing)markDirty();},key:i=>[...map.keys()][i]||null,get length(){return map.size;}});
  Object.defineProperty(window,'localStorage',{value:storage(memory)});Object.defineProperty(window,'sessionStorage',{value:storage(session)});
  function post(type,extra={}){parent.postMessage({readerStudio:true,nonce,type,...extra},'*');}
  function markDirty(){if(initializing)return;post('dirty');clearTimeout(timer);timer=setTimeout(()=>flush(),500);}
  async function flush(requestId){
    clearTimeout(timer);if(initializing)return;
    if(sending){pending=true;setTimeout(()=>flush(requestId),50);return;}
    sending=true;
    try{const data=state();data.dictionaryMutations=dictionaryMutations;data.sessionPreferences=Object.fromEntries(session);data.globalTerms=GLOBAL_TERMS;data.sourceUrl=window.ReaderSeed.sourceUrl||'';data.media=await exportMedia();data.preferences=Object.fromEntries([...memory].filter(([key])=>!['reader-rich-document','reader-rich-document-log-v1','reader-rich-document-notes-v1'].includes(key)));const clone=editor.cloneNode(true);clone.querySelectorAll('rt,rp,.inline-gloss,.comment-block,.footnote-ref,.inline-media,.annotation-register').forEach(x=>x.remove());post('state',{requestId,state:data,text:clone.innerText??clone.textContent});}
    catch(error){post('error',{requestId,message:error.message});}finally{sending=false;if(pending){pending=false;flush();}}
  }
  window.ReaderBridge={markDirty,flush};
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.nonce=document.querySelector('script[nonce]')?.nonce||'';if(window.ReaderAssets?.[src]){s.textContent=window.ReaderAssets[src];document.body.append(s);resolve();}else{s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Editor component failed: '+src));document.body.append(s);}});
  addEventListener('message',async e=>{
    if(e.source!==parent||!e.data?.readerStudio)return;const m=e.data;
    if(m.type==='init'&&nonce===null){
      nonce=m.nonce;dictionaryMutations=structuredClone(m.seed.dictionaryMutations||{});window.ReaderSeed=m.seed;window.ReaderAssets=m.trustedAssets;window.ReaderAssetsBase=m.assetsBase;document.documentElement.lang=m.seed.language||'zh-CN';document.title=m.seed.title+' · Reader Notes';
      for(const [key,value] of Object.entries(m.seed.preferences||{}))memory.set(key,String(value));
      memory.set('reader-rich-document',JSON.stringify(m.seed));memory.set('reader-rich-document-notes-v1',JSON.stringify(m.seed.notes||[]));memory.set('reader-rich-document-log-v1',JSON.stringify(m.seed.log||[]));
      for(const [key,value] of Object.entries(m.seed.sessionPreferences||{}))session.set(key,String(value));
      if(!session.has('shiji-editor-view'))session.set('shiji-editor-view','annotated');
      if(!session.has('shiji-toolbar-collapsed')&&matchMedia('(max-width:780px)').matches)session.set('shiji-toolbar-collapsed','yes');
      try{
        await load('editor.js');await importMedia(m.seed.media||[]);await loadMediaRecords();await load('workspace.js');loadState(m.seed);await load('history.js');
        if(document.querySelector('[data-cloud-sync]'))document.querySelector('[data-cloud-sync]').onclick=()=>post('action',{action:'backup'});
        if(window.ReadingWorkspace)window.ReadingWorkspace.openSync=()=>post('action',{action:'backup'});
        document.getElementById('saveBtn').onclick=()=>{flush();post('action',{action:'sync'});};
        document.querySelector('.brand').textContent=m.seed.title;
        for(const a of document.querySelectorAll('a[href]'))a.addEventListener('click',event=>{event.preventDefault();const href=a.getAttribute('href');post('action',{action:href==='#dictionary'?'dictionary':href==='#library'?'library':'source',url:href});});
        // Keep the familiar bottom navigation within this account-backed editor.
        const dock=document.createElement('nav');dock.className='reader-studio-dock';dock.setAttribute('aria-label','阅读导航');
        for(const [label,action] of [['目录','library'],['书目','collection'],['窗格','panes'],['沉浸','immersive'],['设置','settings'],['札记','notes'],['同步','sync'],['编辑','edit'],['离线','offline'],['安装','install']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(action==='panes')document.querySelector('.sidebar').classList.toggle('reader-hidden');else if(action==='immersive')document.body.classList.toggle('reader-immersive');else if(action==='edit')editor.focus();else if(action==='notes')document.getElementById('userNoteInput').scrollIntoView({block:'center'});else if(action==='settings')document.querySelector('.reading-environment-trigger')?.click();else {if(action==='sync')flush();post('action',{action});}};dock.append(b);}document.body.append(dock);
        document.querySelectorAll('a[href="#dictionary"]').forEach(a=>a.textContent='全书词典');
        matchMedia('(max-width:780px)').addEventListener('change',e=>setToolbarCollapsed(e.matches));
        initializing=false;post('loaded');
      }catch(error){post('error',{message:error.message});}
    }else if(m.nonce===nonce&&m.type==='flush')flush(m.requestId);
    else if(m.nonce===nonce&&m.type==='saved')document.getElementById('saveStatus').textContent=m.message;
  });
  post('ready');
})();
