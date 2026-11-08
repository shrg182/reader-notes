import {PDF_BUCKET,safeUploadUrl} from './pdf-library-model.js';
const pathFor=path=>path.split('/').map(encodeURIComponent).join('/');
export class PdfCloud{
 constructor(cloud){this.cloud=cloud;}
 async rpc(name,body){return this.cloud.request('/rest/v1/rpc/'+name,{method:'POST',token:await this.cloud.token(),body});}
 async all(table){const result=[];for(let offset=0;;offset+=1000){const page=await this.cloud.request(`/rest/v1/${table}?select=*&order=${table==='reader_document_categories'?'document_id':'id'}.asc&limit=1000&offset=${offset}`,{token:await this.cloud.token()});if(!Array.isArray(page))throw Error('Invalid PDF library response');result.push(...page);if(page.length<1000)return result;}}
 async snapshot(){const [records,categories,assignments]=await Promise.all([this.all('reader_pdfs'),this.all('reader_categories'),this.all('reader_document_categories')]);return {records,categories,assignments};}
 category(id,title){return this.rpc('reader_save_category',{p_id:id,p_title:title});}
 assign(id,category){return this.rpc('reader_set_document_category',{p_id:id,p_category:category});}
 reserve(value){return this.rpc('reader_reserve_pdf',{p_id:value.id,p_title:value.title,p_category:value.category_id,p_filename:value.filename,p_size:value.size_bytes,p_sha256:value.sha256});}
 change(record,action,patch={}){return this.rpc('reader_change_pdf',{p_id:record.id,p_revision:record.revision,p_action:action,p_patch:patch});}
 async file(record,{signal}={}){
  const response=await fetch(`${this.cloud.url}/storage/v1/object/authenticated/${PDF_BUCKET}/${pathFor(record.object_path)}`,{headers:{apikey:this.cloud.key,Authorization:`Bearer ${await this.cloud.token()}`},signal});
  if(!response.ok){const error=Error('PDF download failed. Check your connection and retry.');error.status=response.status;throw error;}
  return response.blob();
 }
 async remove(record){return this.cloud.request(`/storage/v1/object/${PDF_BUCKET}`,{method:'DELETE',token:await this.cloud.token(),body:{prefixes:[record.object_path]}});}
 async upload(record,file,{url,onProgress,onUrl,signal}={}){
  await import('./vendor/tus.min.js');
  const token=await this.cloud.token();
  return new Promise((resolve,reject)=>{
   let settled=false;
   const finish=error=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);error?reject(error):resolve();};
   const upload=new globalThis.tus.Upload(file,{
    endpoint:this.cloud.url+'/storage/v1/upload/resumable',chunkSize:6*1024*1024,
    retryDelays:[0,1000,3000,5000],uploadDataDuringCreation:true,storeFingerprintForResuming:false,
    headers:{authorization:`Bearer ${token}`,apikey:this.cloud.key},
    metadata:{bucketName:PDF_BUCKET,objectName:record.object_path,contentType:'application/pdf',cacheControl:'3600'},
    onBeforeRequest:async request=>{request.setHeader('authorization',`Bearer ${await this.cloud.token()}`);},
    onAfterResponse:async()=>{if(upload.url)await onUrl?.(safeUploadUrl(upload.url,this.cloud.url));},
    onProgress:(sent,total)=>onProgress?.(Math.round(sent/total*100)),onError:finish,onSuccess:()=>finish()
   });
   const abort=()=>{void upload.abort(false).then(()=>finish(new DOMException('Upload paused','AbortError')),finish);};
   signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted){abort();return;}
   if(url)upload.url=safeUploadUrl(url,this.cloud.url);
   upload.start();
  });
 }
}
