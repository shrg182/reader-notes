export class PdfViewer{
 constructor(root,{onPage,onError}){
  Object.assign(this,{root,onPage,onError});this.generation=0;this.page=1;this.zoom=1;this.queue=Promise.resolve();
  root.innerHTML=`<div class="pdf-navigation"><button id="pdf-prev" aria-label="Previous PDF page">←</button><label>Page <input id="pdf-page" type="number" min="1" value="1"></label><span id="pdf-page-count"></span><button id="pdf-next" aria-label="Next PDF page">→</button><label>Zoom <select id="pdf-zoom"><option value="fit">Fit width</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label><label>Find text <input id="pdf-search" type="search" maxlength="200"></label><button id="pdf-find">Find next</button><span id="pdf-find-status" role="status"></span></div><p id="pdf-view-status" role="status"></p><div class="pdf-page-scroll"><div class="pdf-page-surface"><canvas id="pdf-canvas" aria-label="PDF page"></canvas><div id="pdf-text-layer" class="textLayer"></div></div></div>`;
  this.$=id=>root.querySelector('#'+id);
  this.$('pdf-prev').onclick=()=>this.go(this.page-1);
  this.$('pdf-next').onclick=()=>this.go(this.page+1);
  this.$('pdf-page').onchange=()=>this.go(Number(this.$('pdf-page').value));
  this.$('pdf-zoom').onchange=()=>this.render();this.$('pdf-find').onclick=()=>this.find();
  this.$('pdf-search').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();void this.find();}};
  this.resize=new ResizeObserver(()=>{if(this.document&&this.$('pdf-zoom').value==='fit')void this.render();});this.resize.observe(root);
 }
 async open(blob,page=1){
  this.close();const generation=this.generation;this.$('pdf-view-status').textContent='Loading PDF…';
  this.library=await import('./vendor/pdfjs/pdf.mjs');
  this.library.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
  // Read bounded slices from local/browser blobs instead of copying a 125 MB
  // file into memory before the first page. PDF.js requests the needed ranges.
  const initial=new Uint8Array(await blob.slice(0,65536).arrayBuffer());
  if(generation!==this.generation)return;
  const Transport=this.library.PDFDataRangeTransport,onError=this.onError;
  let task;
  class BlobTransport extends Transport{
   constructor(){super(blob.size,initial,true);this.aborted=false;}
   requestDataRange(begin,end){void blob.slice(begin,end).arrayBuffer().then(buffer=>{if(!this.aborted)this.onDataRange(begin,new Uint8Array(buffer));}).catch(error=>{if(!this.aborted){onError(error);void task?.destroy();}});}
   abort(){this.aborted=true;}
  }
  task=this.library.getDocument({range:new BlobTransport(),length:blob.size,rangeChunkSize:65536,disableAutoFetch:true,disableStream:true,isEvalSupported:false,
   cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,
   standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,
   wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href});
  if(generation!==this.generation){await task.destroy();return;}this.loading=task;
  task.onPassword=(update,reason)=>{const password=prompt(reason===2?'Incorrect PDF password. Try again:':'This PDF is password protected. Enter its password:');if(password===null){void task.destroy();this.onError(Error('PDF opening cancelled.'));}else update(password);};
  try{const document=await task.promise;if(generation!==this.generation){await document.destroy();return;}this.document=document;this.page=Math.max(1,Math.min(document.numPages,page));await this.render();}
  catch(error){if(generation===this.generation){this.$('pdf-view-status').textContent='This PDF could not be displayed. You can download the original file.';throw error;}}
 }
 async go(page){if(!this.document)return;this.page=Math.max(1,Math.min(this.document.numPages,Number.isFinite(page)?Math.floor(page):1));await this.render();this.onPage(this.page);}
 render(){
  const generation=this.generation,page=this.page;
  this.queue=this.queue.catch(()=>{}).then(async()=>{
   if(generation!==this.generation||!this.document)return;
   const source=await this.document.getPage(page);if(generation!==this.generation)return;
   const original=source.getViewport({scale:1}),width=Math.max(200,this.root.clientWidth-32);
   const scale=this.$('pdf-zoom').value==='fit'?width/original.width:Number(this.$('pdf-zoom').value),viewport=source.getViewport({scale});
   const canvas=this.$('pdf-canvas'),ratio=Math.min(devicePixelRatio||1,2);
   canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
   const surface=this.root.querySelector('.pdf-page-surface');surface.style.width=viewport.width+'px';surface.style.height=viewport.height+'px';surface.style.setProperty('--scale-factor',scale);surface.style.setProperty('--total-scale-factor',scale);
   const rendering=source.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:undefined});this.rendering=rendering;await rendering.promise;
   if(generation!==this.generation)return;
   this.textLayer?.cancel();const container=this.$('pdf-text-layer');container.replaceChildren();
   this.textLayer=new this.library.TextLayer({textContentSource:await source.getTextContent(),container,viewport});await this.textLayer.render();
   this.$('pdf-page').value=page;this.$('pdf-page').max=this.document.numPages;this.$('pdf-page-count').textContent='/ '+this.document.numPages;
   this.$('pdf-prev').disabled=page<=1;this.$('pdf-next').disabled=page>=this.document.numPages;
   this.$('pdf-view-status').textContent=`Page ${page} of ${this.document.numPages}`;
  }).catch(error=>{if(generation===this.generation&&error.name!=='RenderingCancelledException')this.onError(error);});
  return this.queue;
 }
 async find(){
  const query=this.$('pdf-search').value.trim().toLocaleLowerCase(),doc=this.document,generation=this.generation;if(!query||!doc)return;
  this.$('pdf-find-status').textContent='Searching…';
  try{for(let step=1;step<=doc.numPages;step++){
   const page=(this.page-1+step)%doc.numPages+1,source=await doc.getPage(page),text=(await source.getTextContent()).items.map(i=>i.str||'').join(' ').toLocaleLowerCase();
   if(generation!==this.generation)return;
   if(text.includes(query)){await this.go(page);this.$('pdf-find-status').textContent=`Found on page ${page}`;return;}
  }this.$('pdf-find-status').textContent='No matching text. Scanned PDFs may need OCR.';}catch(error){if(generation===this.generation)this.onError(error);}
 }
 close(){this.generation++;this.rendering?.cancel();this.textLayer?.cancel();void this.loading?.destroy();this.loading=null;this.document=null;this.queue=Promise.resolve();this.$('pdf-search').value='';this.$('pdf-find-status').textContent='';this.$('pdf-text-layer').replaceChildren();const canvas=this.$('pdf-canvas');canvas.width=0;canvas.height=0;}
}
