const zoomOptions='<option value="fit">Fit width</option><option value="page-fit">Fit page</option><option value="1">Actual size · 100%</option><option value="0.75">75%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option>';
export class PdfViewer{
 constructor(root,{onPage=()=>{},onView=()=>{},onError=()=>{},onFocus=()=>{},prefix='pdf',navigateHost,viewHost}={}){
  Object.assign(this,{root,onPage,onView,onError,onFocus,prefix});this.generation=0;this.page=1;this.restoring=false;
  this.navigate=document.createElement('div');this.navigate.className='pdf-navigation pdf-pane-controls';
  this.navigate.innerHTML=`<button id="${prefix}-prev" aria-label="Previous PDF page">←</button><label>Page <input id="${prefix}-page" type="number" min="1" value="1"></label><span id="${prefix}-page-count"></span><button id="${prefix}-next" aria-label="Next PDF page">→</button><label>Find text <input id="${prefix}-search" type="search" maxlength="200"></label><button id="${prefix}-find">Find next</button><button id="${prefix}-find-prev">Find previous</button><span id="${prefix}-find-status" role="status"></span>`;
  this.viewControls=document.createElement('div');this.viewControls.className='pdf-navigation pdf-pane-controls';this.viewControls.innerHTML=`<label>Zoom <select id="${prefix}-zoom">${zoomOptions}</select></label><button id="${prefix}-rotate">Rotate 90°</button>`;
  root.innerHTML=`<p id="${prefix}-view-status" class="pdf-view-status" role="status"></p><div class="pdf-reader-body"><div class="pdf-page-scroll" tabindex="0" aria-label="Continuous PDF pages"><div class="pdfViewer"></div></div></div>`;
  (navigateHost||root).prepend(this.navigate);(viewHost||root).append(this.viewControls);
  this.$=id=>document.getElementById(prefix+'-'+id.replace(/^pdf-/,''));
  this.container=root.querySelector('.pdf-page-scroll');this.surface=root.querySelector('.pdfViewer');
  this.$('prev').onclick=()=>this.go(this.page-1);this.$('next').onclick=()=>this.go(this.page+1);
  this.$('page').onchange=()=>this.go(Number(this.$('page').value));this.$('zoom').onchange=()=>this.setZoom(this.$('zoom').value);
  this.$('rotate').onclick=()=>this.rotate();this.$('find').onclick=()=>this.find();this.$('find-prev').onclick=()=>this.find(true);
  this.$('search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();this.find(e.shiftKey);}};
  root.addEventListener('pointerdown',()=>this.onFocus(this));root.addEventListener('focusin',()=>this.onFocus(this));
  this.container.addEventListener('scroll',()=>this.scheduleState(),{passive:true});
  this.resize=new ResizeObserver(()=>{if(!this.document||!this.component)return;const width=this.container.clientWidth,height=this.container.clientHeight;if(width===this.lastWidth&&height===this.lastHeight)return;this.lastWidth=width;this.lastHeight=height;if(['page-width','page-fit','auto'].includes(this.component.currentScaleValue)){const state=this.getState();this.component.currentScaleValue=this.component.currentScaleValue;this.restoreOffset(state);}});this.resize.observe(this.container);
 }
 async initialize(){
  if(this.component)return;
  this.library=await import('./vendor/pdfjs/pdf.compat.mjs');globalThis.pdfjsLib=this.library;
  this.library.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.compat.mjs',import.meta.url).href;
  const {PDFViewer,EventBus,PDFLinkService,PDFFindController}=await import('./vendor/pdfjs/pdf-viewer.compat.mjs');
  if(this.disposed)return;this.lifetime=new AbortController();this.eventBus=new EventBus();this.linkService=new PDFLinkService({eventBus:this.eventBus,externalLinkTarget:2,externalLinkRel:'noopener noreferrer'});
  this.findController=new PDFFindController({eventBus:this.eventBus,linkService:this.linkService});
  this.component=new PDFViewer({abortSignal:this.lifetime.signal,container:this.container,viewer:this.surface,eventBus:this.eventBus,linkService:this.linkService,findController:this.findController,removePageBorders:true,annotationEditorMode:-1,maxCanvasPixels:8388608,imageResourcesPath:new URL('./vendor/pdfjs/images/',import.meta.url).href});this.linkService.setViewer(this.component);
  this.eventBus.on('pagechanging',()=>{if(!this.document)return;this.paint();this.scheduleState();});
  this.eventBus.on('updateviewarea',()=>this.scheduleState());
  this.eventBus.on('pagerendered',event=>{if(!this.document||event.source.pdfPage?._transport!==this.document._transport)return;this.paint();if(event.error)this.onError(event.error);});
  this.eventBus.on('updatefindcontrolstate',event=>{if(!this.document)return;const selected=this.findController.selected;if(event.state===1)this.$('find-status').textContent='No matching text. Scanned PDFs may need OCR.';else if(event.state===3)this.$('find-status').textContent='Searching…';else if(selected.pageIdx>=0)this.$('find-status').textContent=`Found on page ${selected.pageIdx+1}`;});
 }
 async open(blob,state=1){
  this.close();const generation=this.generation;this.$('view-status').textContent='Loading PDF…';
  try{
   await this.initialize();if(generation!==this.generation)return;
   const initial=new Uint8Array(await blob.slice(0,65536).arrayBuffer());if(generation!==this.generation)return;
   const Transport=this.library.PDFDataRangeTransport,onError=this.onError;let task;
   class BlobTransport extends Transport{
    constructor(){super(blob.size,initial,true);this.aborted=false;}
    requestDataRange(begin,end){void blob.slice(begin,end).arrayBuffer().then(buffer=>{if(!this.aborted)this.onDataRange(begin,new Uint8Array(buffer));}).catch(error=>{if(!this.aborted){onError(error);void task?.destroy();}});}
    abort(){this.aborted=true;}
   }
   task=this.library.getDocument({range:new BlobTransport(),length:blob.size,rangeChunkSize:65536,disableAutoFetch:true,disableStream:true,isEvalSupported:false,enableXfa:false,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href});
   this.loading=task;
   task.onPassword=(update,reason)=>{const password=prompt(reason===2?'Incorrect PDF password. Try again:':'This PDF is password protected. Enter its password:');if(password===null){void task.destroy();this.onError(Error('PDF opening cancelled.'));}else update(password);};
   const document=await task.promise;if(generation!==this.generation){await task.destroy();return;}await this.attach(document,state,generation);
  }catch(error){if(generation===this.generation){this.$('view-status').textContent='This PDF could not be displayed. Reload the app and retry, or use Download PDF to open the original file.';throw error;}}
 }
 async share(document,state){this.close();const generation=this.generation;await this.initialize();if(generation===this.generation)await this.attach(document,state,generation);}
 async attach(document,state,generation=this.generation){
  this.document=document;this.restoring=true;const view=typeof state==='number'?{page:state}:state||{};
  const ready=new Promise(resolve=>{const handler=()=>{this.eventBus.off('pagesinit',handler);resolve();};this.eventBus.on('pagesinit',handler);this.cancelReady=()=>{this.eventBus.off('pagesinit',handler);resolve();};});
  this.linkService.setDocument(document);this.component.setDocument(document);await ready;if(generation!==this.generation)return;
  this.component.pagesRotation=[0,90,180,270].includes(view.rotation)?view.rotation:0;
  const zoom=this.validZoom(view.scale);this.$('zoom').value=zoom;this.component.currentScaleValue=zoom==='fit'?'page-width':zoom;
  const page=Math.max(1,Math.min(document.numPages,Number(view.page)||1));this.component.scrollPageIntoView({pageNumber:page});
  const pageView=this.component.getPageView(page-1);if(!pageView.pdfPage)pageView.setPdfPage(await document.getPage(page));if(generation!==this.generation)return;
  this.restoreOffset({...view,page});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(generation!==this.generation)return;
  this.restoreOffset({...view,page});this.restoring=false;this.page=page;this.lastReportedPage=page;this.paint();this.scheduleState();
 }
 validZoom(value){if(value==='page-width')return 'fit';return ['fit','page-fit','0.75','1','1.25','1.5','2'].includes(String(value))?String(value):'fit';}
 restoreOffset(state){const page=this.component?.getPageView((state.page||1)-1)?.div;if(!page)return;this.container.scrollTop=page.offsetTop+(Number(state.offset)||0)*page.clientHeight;this.container.scrollLeft=(Number(state.left)||0)*page.clientWidth;this.component.update();}
 getState(){if(!this.document||!this.component)return {page:1,scale:'fit',rotation:0,offset:0,left:0};const page=this.component.currentPageNumber,div=this.component.getPageView(page-1)?.div;return {page,scale:this.validZoom(this.component.currentScaleValue),rotation:this.component.pagesRotation,offset:div?(this.container.scrollTop-div.offsetTop)/Math.max(1,div.clientHeight):0,left:div?this.container.scrollLeft/Math.max(1,div.clientWidth):0};}
 scheduleState(){clearTimeout(this.stateTimer);if(this.restoring||!this.document)return;this.stateTimer=setTimeout(()=>this.capture(),160);}
 capture(){if(this.restoring||!this.document)return;const state=this.getState();this.page=state.page;this.paint();if(this.lastReportedPage!==state.page){this.lastReportedPage=state.page;this.onPage(state.page);}this.onView(state);}
 paint(){if(!this.document||!this.component)return;this.page=this.component.currentPageNumber;this.root.dataset.rotation=String(this.component.pagesRotation);this.$('page').value=this.page;this.$('page').max=this.document.numPages;this.$('page-count').textContent='/ '+this.document.numPages;this.$('prev').disabled=this.page<=1;this.$('next').disabled=this.page>=this.document.numPages;this.$('view-status').textContent=`Page ${this.page} of ${this.document.numPages}`;}
 async go(page){if(!this.document)return;this.component.scrollPageIntoView({pageNumber:Math.max(1,Math.min(this.document.numPages,Math.floor(Number(page)||1)))});this.component.update();this.capture();}
 setZoom(value){if(!this.document)return;const state=this.getState();this.component.currentScaleValue=value==='fit'?'page-width':value;this.restoreOffset(state);this.capture();}
 rotate(){if(!this.document)return;const state=this.getState();this.component.pagesRotation=(this.component.pagesRotation+90)%360;this.component.currentScaleValue=this.$('zoom').value==='fit'?'page-width':this.$('zoom').value;this.restoreOffset(state);this.capture();}
 find(previous=false){const query=this.$('search').value.trim();if(!query||!this.document)return;this.$('find-status').textContent='Searching…';this.eventBus.dispatch('find',{source:this,type:query===this.lastQuery?'again':'',query,phraseSearch:true,caseSensitive:false,entireWord:false,highlightAll:true,findPrevious:previous,matchDiacritics:false});this.lastQuery=query;}
 async pageText(){if(!this.document)return '';const selected=getSelection();if(selected?.rangeCount&&this.root.contains(selected.anchorNode)&&this.root.contains(selected.focusNode)&&selected.toString().trim())return selected.toString();const source=await this.document.getPage(this.page);return (await source.getTextContent()).items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('');}
 setActive(active){this.navigate.hidden=!active;this.viewControls.hidden=!active;this.root.closest('.pdf-pane')?.classList.toggle('active',active);}
 dispose(){this.close();this.disposed=true;this.resize.disconnect();this.lifetime?.abort();}
 close(){if(this.document)this.capture();this.generation++;this.cancelReady?.();this.cancelReady=null;clearTimeout(this.stateTimer);this.restoring=false;this.component?.setDocument(null);this.linkService?.setDocument(null);const task=this.loading;this.loading=null;this.document=null;this.lastQuery='';this.page=1;this.$('search').value='';this.$('find-status').textContent='';this.$('view-status').textContent='';if(task)void task.destroy().catch(()=>{});}
}
