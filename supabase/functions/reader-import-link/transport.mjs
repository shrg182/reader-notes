import {Buffer} from 'node:buffer';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import {connect,isIP} from 'node:net';
import {lookup} from 'node:dns/promises';
import {createUnzip} from 'node:zlib';
export async function lookupAll(hostname){let timer;try{return await Promise.race([lookup(hostname,{all:true,verbatim:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Source DNS lookup timed out.')),5000);})]);}finally{clearTimeout(timer);}}
// Connect only to the checked address. Host, SNI and certificate validation still
// use the original hostname; there is no second DNS lookup during connection.
export function pinnedRequest(url,address,{maxBytes,signal}){
 return new Promise((resolve,reject)=>{
  const secure=url.protocol==='https:',hostname=url.hostname.replace(/^\[|\]$/g,''),Agent=secure?https.Agent:http.Agent,agent=new Agent({keepAlive:false});
  agent.createConnection=options=>secure?tls.connect({...options,host:address,port:443,servername:isIP(hostname)?undefined:hostname,rejectUnauthorized:true,checkServerIdentity:(_name,cert)=>tls.checkServerIdentity(hostname,cert),ALPNProtocols:['http/1.1']}):connect({...options,host:address,port:80});
  let settled=false;const finish=(error,result)=>{if(settled)return;settled=true;agent.destroy();error?reject(error):resolve(result);};
  const req=(secure?https:http).request(url,{method:'GET',agent,signal,headers:{'User-Agent':'ReaderNotesImporter/1.0','Accept':'application/pdf,text/html,text/plain,text/markdown;q=0.9','Accept-Encoding':'identity','Connection':'close'},maxHeaderSize:16384},res=>{
   const status=res.statusCode||0,headers=res.headers;
   if(status!==200){res.destroy();finish(null,{status,headers,body:new Uint8Array()});return;}
   if(Number(headers['content-length'])>maxBytes){res.destroy();finish(Error('Download exceeds the link-import size limit.'));return;}
   let bytes=0,rawBytes=0;const chunks=[];res.on('data',chunk=>{rawBytes+=chunk.length;if(rawBytes>maxBytes){res.destroy();finish(Error('Download exceeds the link-import size limit.'));}});
   let stream=res;if(headers['content-encoding']){if(!['gzip','deflate'].includes(String(headers['content-encoding']).toLowerCase())){res.destroy();finish(Error('The source uses unsupported compression. Download the file in your browser instead.'));return;}stream=res.pipe(createUnzip());}
   stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>maxBytes){stream.destroy();res.destroy();finish(Error('Expanded download exceeds the link-import size limit.'));}else chunks.push(chunk);});
   stream.on('error',()=>finish(Error('The source interrupted the download. Retry or download it in your browser.')));res.on('aborted',()=>finish(Error('The source interrupted the download.')));stream.on('end',()=>finish(null,{status,headers,body:Buffer.concat(chunks)}));
  });
  req.on('error',error=>finish(Error(error.name==='AbortError'?'Download timed out or was cancelled.':'Could not securely connect to this source. Try downloading it in your browser.')));req.setTimeout(12000,()=>req.destroy(Error('Timeout')));req.end();
 });
}
