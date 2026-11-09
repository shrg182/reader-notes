import test from 'node:test';import assert from 'node:assert/strict';
import {safeUrl,publicAddress,fetchPublic,robotsAllowed} from '../supabase/functions/reader-import-link/security.mjs';
import {extractDocument} from '../supabase/functions/reader-import-link/extract.mjs';
import {makeHandler} from '../supabase/functions/reader-import-link/handler.mjs';
import {parseLinkRows,readImportEvents} from '../link-import-model.js';
const bytes=s=>new TextEncoder().encode(s),lookup=async()=>[{address:'93.184.215.14'}];
test('URL import rejects private/reserved IPv4/IPv6, encoded literals, credentials, schemes and ports',()=>{
 for(const url of ['file:///etc/passwd','ftp://example.com/x','http://localhost','http://metadata.google.internal','http://127.1/','http://2130706433','http://0x7f000001','http://[::1]/','http://[::ffff:127.0.0.1]/','http://192.168.1.1','http://169.254.169.254','http://example.com:8080','http://user:pass@example.com','https://example.com./','http://10.0.0.1','http://100.64.0.1'])assert.throws(()=>safeUrl(url),undefined,url);
 for(const ip of ['0.0.0.0','127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.1','169.254.1.1','100.64.0.1','224.0.0.1','::','::1','fd12::1','fe80::1','::ffff:10.0.0.1','2001:db8::1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(safeUrl('https://example.com:443/file#fragment').href,'https://example.com/file');assert.equal(publicAddress('8.8.8.8'),true);
});
test('every DNS answer and redirect is checked; selected public address is pinned for request',async()=>{
 let calls=[];const request=async(url,address)=>{calls.push({url:url.href,address});return {status:200,headers:{},body:bytes('hello')};};await fetchPublic('https://example.com/a',{lookup,request});assert.equal(calls[0].address,'93.184.215.14');
 await assert.rejects(()=>fetchPublic('https://example.com',{lookup:async()=>[{address:'8.8.8.8'},{address:'127.0.0.1'}],request}),/public addresses/);assert.equal(calls.length,1);
 await assert.rejects(()=>fetchPublic('https://example.com',{lookup,request:async()=>({status:302,headers:{location:'http://169.254.169.254/latest'},body:bytes('')})}),/Private/);
 let n=0;await assert.rejects(()=>fetchPublic('https://example.com',{lookup:async()=>++n===1?[{address:'8.8.8.8'}]:[{address:'10.0.0.1'}],request:async()=>({status:302,headers:{location:'https://other.example.com/a'},body:bytes('')})}),/public addresses/);
 await assert.rejects(()=>fetchPublic('https://example.com',{lookup,request:async()=>({status:200,headers:{},body:new Uint8Array(100)}),maxBytes:50}),/limit/);
 await assert.rejects(()=>fetchPublic('https://example.com',{lookup,request:async()=>({status:403,headers:{},body:bytes('')})}),/permission/);
 let checked=false;await fetchPublic('https://example.com',{lookup,beforeRequest:async()=>{checked=true;},request:async()=>{assert.equal(checked,true);return {status:200,headers:{},body:bytes('ok')};}});
});
test('robots restrictions, specific agents, wildcard rules and longest allow are respected',()=>{
 assert.equal(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/open','/private/x'),false);assert.equal(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/open','/private/open'),true);
 assert.equal(robotsAllowed('User-agent: ReaderNotesImporter\nDisallow: /\nUser-agent: *\nAllow: /','/a'),false);assert.equal(robotsAllowed('User-agent: *\nDisallow: /*.pdf$','/book.pdf'),false);assert.equal(robotsAllowed('User-agent: *\nDisallow: /*.pdf$','/book.pdf/more'),true);
});
test('actual content detects PDF/text/HTML; readable extraction excludes scripts/navigation and supports multilingual text',()=>{
 assert.equal(extractDocument(bytes('%PDF-1.4\n'),{'content-type':'text/plain'},'https://example.com/file.txt').kind,'pdf');
 const result=extractDocument(bytes('<!doctype html><html><head><title>读书</title></head><body><nav>Menu</nav><article><h1>你好</h1><p>Русский text</p><script>steal()</script><img src="http://127.0.0.1/private"></article></body></html>'),{'content-type':'text/html'},'https://example.com/article');assert.equal(result.title,'读书');assert.match(result.text,/你好\nРусский text/);assert.doesNotMatch(result.text,/Menu|steal|private/);
 assert.throws(()=>extractDocument(bytes('PK\x03\x04'),{},'https://example.com/book.epub'),/EPUB/);assert.throws(()=>extractDocument(new Uint8Array([0,1,2]),{},'https://example.com/file.txt'),/binary/);assert.throws(()=>extractDocument(new Uint8Array([255,254]),{},'https://example.com/file.txt'),/UTF-8/);
});
test('batch URLs retain individual failures and duplicates, and progress requires a terminal result',async()=>{
 const rows=parseLinkRows('https://example.com/a\n\ninvalid\nhttps://example.com/a#x\nhttps://example.com/b');assert.deepEqual(rows.map(r=>r.stage),['Queued','Failed','Skipped','Queued']);assert.throws(()=>parseLinkRows(''),/at least/);
 const events=[],result=await readImportEvents(new Response('{"stage":"Fetching"}\n{"stage":"Ready","result":{"id":"a"}}\n'),e=>events.push(e.stage));assert.equal(result.id,'a');assert.deepEqual(events,['Fetching','Ready']);await assert.rejects(()=>readImportEvents(new Response('{"stage":"Fetching"}\n'),()=>{}),/interrupted/);await assert.rejects(()=>readImportEvents(new Response('{"stage":"Failed","error":"Unavailable"}\n'),()=>{}),/Unavailable/);
});
test('authenticated handler streams true stages, saves text with attribution, and never fetches unauthenticated requests',async()=>{
 let requests=0,submitted;const api=async(url,options)=>{if(url.endsWith('/auth/v1/user'))return Response.json({id:'owner'});if(url.endsWith('reader_claim_link_fetch'))return Response.json(null);if(url.endsWith('reader_import_link')){submitted=JSON.parse(options.body);return Response.json({source:{id:'doc'},target:{id:'doc',title:'Test'},duplicate:false});}throw Error('Unexpected API '+url);};
 const handler=makeHandler({projectUrl:'https://project.supabase.co',publicKey:'public',lookup,fetcher:api,request:async url=>{requests++;return url.pathname==='/robots.txt'?{status:404,headers:{},body:bytes('')}:{status:200,headers:{'content-type':'text/plain'},body:bytes('Hello 中文 Русский')};}});
 const req=token=>new Request('https://function.example/',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer user'}:{})},body:JSON.stringify({url:'https://example.com/test.txt',category:'personal',categoryTitle:'Reading',tags:['test']})});assert.equal((await handler(req(false))).status,401);assert.equal(requests,0);
 const stages=[];const result=await readImportEvents(await handler(req(true)),e=>stages.push(e.stage));assert.equal(result.id,'doc');assert.deepEqual(stages,['Fetching','Extracting','Saving','Ready']);assert.equal(submitted.p_content,'Hello 中文 Русский');assert.equal(submitted.p_source.original_url,'https://example.com/test.txt');assert.equal(submitted.p_source.sha256.length,64);
});
test('PDF handler uploads privately, finalizes only after storage, and reports interrupted upload failure',async()=>{
 let fail=true,finished=0,uploads=0;const metadata={id:'pdf-id',status:'uploading',revision:1,object_path:'owner/pdf-id.pdf',title:'Book'};const api=async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer user');
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'owner'});if(url.endsWith('reader_claim_link_fetch'))return Response.json(null);
  if(url.endsWith('reader_import_link'))return Response.json({source:{id:'pdf-id'},target:metadata,duplicate:false});
  if(url.includes('/object/info/'))return Response.json({message:'Not found'},{status:404});
  if(url.includes('/object/reader-pdfs/')){uploads++;assert.equal(options.headers['Content-Type'],'application/pdf');assert.equal(new TextDecoder().decode(options.body),'%PDF-1.4\n');return fail?Response.json({message:'Temporary upload interruption'},{status:503}):Response.json({});}
  if(url.endsWith('reader_change_pdf'))return Response.json({...metadata,status:'ready',revision:2});if(url.endsWith('reader_finish_link_pdf')){finished++;return Response.json({});}throw Error('Unexpected request');
 };
 const handler=makeHandler({projectUrl:'https://project.supabase.co',publicKey:'public',lookup,fetcher:api,request:async url=>url.pathname==='/robots.txt'?{status:404,headers:{},body:bytes('')}:{status:200,headers:{'content-type':'application/pdf'},body:bytes('%PDF-1.4\n')}});
 const req=()=>new Request('https://function.example/',{method:'POST',headers:{Authorization:'Bearer user'},body:JSON.stringify({url:'https://example.com/book.pdf',category:'personal',categoryTitle:'Reading',tags:[]})});
 async function attempt(){const response=await handler(req());return readImportEvents(response,()=>{});}
 await assert.rejects(attempt,/Temporary upload interruption/);assert.equal(finished,0);fail=false;const result=await attempt();assert.equal(result.id,'pdf-id');assert.equal(finished,1);assert.equal(uploads,2);
});
test('hosted Deno runtime does not require a global Buffer',async()=>{
 const {spawnSync}=await import('node:child_process');const {fileURLToPath}=await import('node:url');const result=spawnSync(fileURLToPath(new URL('../node_modules/.bin/deno',import.meta.url)),['run','--allow-env',fileURLToPath(new URL('./link-import-runtime.mjs',import.meta.url))],{encoding:'utf8',timeout:15000});assert.equal(result.status,0,result.stderr||result.error?.message);assert.match(result.stdout,/PASS no global Buffer/);
});
