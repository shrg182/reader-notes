import {createHash} from 'node:crypto';
import {fetchPublic,safeUrl,robotsAllowed,MAX_BYTES} from './security.mjs';
import {extractDocument} from './extract.mjs';
export function makeHandler({projectUrl,publicKey,lookup,request,fetcher=fetch}){
 const origins=new Set(['https://shrg182.github.io','http://127.0.0.1:8780','http://localhost:8780']);
 return async req=>{
  const origin=req.headers.get('origin')||'',cors={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://shrg182.github.io','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const json=(data,status)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(origin&&!origins.has(origin))return json({error:'Origin not permitted.'},403);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});if(req.method!=='POST')return json({error:'Use POST.'},405);
  const token=req.headers.get('authorization');if(!token?.startsWith('Bearer '))return json({error:'Sign in to import links.'},401);
  const deadline=AbortSignal.timeout(35000),signal=AbortSignal.any([deadline,req.signal]);
  let payload;try{if(Number(req.headers.get('content-length'))>4096)throw Error();const reader=req.body?.getReader();let size=0,chunks=[];if(reader)for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw Error();}chunks.push(value);}payload=JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));safeUrl(payload.url);if(typeof payload.category!=='string'||!payload.category||payload.category.length>120||typeof payload.categoryTitle!=='string'||!payload.categoryTitle.trim()||payload.categoryTitle.length>120||!Array.isArray(payload.tags)||payload.tags.length>10||payload.tags.some(t=>typeof t!=='string'||t.length>60))throw Error('Invalid destination or tags.');}catch(error){return json({error:error.message||'Invalid import request.'},400);}
  async function api(path,{method='POST',body,raw=false,allowNotFound=false}={}){const res=await fetcher(projectUrl+path,{method,signal,headers:{apikey:publicKey,Authorization:token,'Content-Type':raw?'application/pdf':'application/json'},...(body!==undefined?{body:raw?body:JSON.stringify(body)}:{})});const data=await res.json().catch(()=>({}));if(allowNotFound&&[400,404].includes(res.status))return null;if(!res.ok){if([401,403].includes(res.status))throw Error('Sign in again to import links.');throw Error(data.message||data.error||'The private library could not save this import.');}return data;}
  try{await api('/auth/v1/user',{method:'GET'});await api('/rest/v1/rpc/reader_claim_link_fetch',{body:{}});}catch(error){return json({error:error.message},/limit/i.test(error.message)?429:401);}
  const stream=new ReadableStream({start(controller){const send=data=>{try{controller.enqueue(new TextEncoder().encode(JSON.stringify(data)+'\n'));}catch{}};void(async()=>{try{
   send({stage:'Fetching'});const original=safeUrl(payload.url),robotsCache=new Map();
   const checkRobots=async url=>{if(!robotsCache.has(url.origin)){let text='';try{const robots=await fetchPublic(new URL('/robots.txt',url).href,{lookup,request,maxBytes:65536,signal});text=new TextDecoder().decode(robots.body);}catch(error){if(!/HTTP 404|HTTP 410/.test(error.message))throw error;}robotsCache.set(url.origin,text);}if(!robotsAllowed(robotsCache.get(url.origin),url.pathname+url.search))throw Error('This source does not permit automated importing. Download permitted material in your browser instead.');};
   const downloaded=await fetchPublic(original.href,{lookup,request,maxBytes:MAX_BYTES,signal,beforeRequest:checkRobots});
   send({stage:'Extracting'});const document=extractDocument(downloaded.body,downloaded.headers,downloaded.url),sha=createHash('sha256').update(downloaded.body).digest('hex');
   const metadata={original_url:original.href,resolved_url:downloaded.url,title:document.title,mime_type:document.mime,filename:document.filename,size_bytes:downloaded.body.length,sha256:sha,kind:document.kind,category:payload.category,category_title:payload.categoryTitle,tags:payload.tags};
   send({stage:'Saving'});const result=await api('/rest/v1/rpc/reader_import_link',{body:{p_source:metadata,p_content:document.text??null}});let target=result.target;
   if(!target||target.deleted||target.status==='purged'||target.status==='deleting')throw Error('This content already exists in Trash or was removed. Check the Library before importing another copy.');
   if(document.kind==='pdf'&&!result.duplicate){
    if(target.status==='uploading'){
     const path=target.object_path.split('/').map(encodeURIComponent).join('/'),info=await api('/storage/v1/object/info/authenticated/reader-pdfs/'+path,{method:'GET',allowNotFound:true});
     if(!info){send({stage:'Uploading'});await api('/storage/v1/object/reader-pdfs/'+path,{body:downloaded.body,raw:true});}
     else if(Number(info.metadata?.size??info.size)!==downloaded.body.length)throw Error('An incomplete PDF is already reserved. Check the Library before retrying.');
     target=await api('/rest/v1/rpc/reader_change_pdf',{body:{p_id:target.id,p_revision:target.revision,p_action:'finish_upload',p_patch:{}}});
    }
    await api('/rest/v1/rpc/reader_finish_link_pdf',{body:{p_id:target.id}});
   }
   send({stage:result.duplicate?'Duplicate':'Ready',result:{id:target.id,kind:document.kind,title:target.title,duplicate:result.duplicate,source:result.source}});
  }catch(error){send({stage:'Failed',error:signal.aborted?'Import timed out or was cancelled. Check the Library before retrying.':error.message||'Import failed. Retry or download the file in your browser.'});}finally{try{controller.close();}catch{}}})();}});
  return new Response(stream,{headers:{...cors,'Content-Type':'application/x-ndjson; charset=utf-8'}});
 };
}
