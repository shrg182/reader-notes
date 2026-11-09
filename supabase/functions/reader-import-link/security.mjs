import ipaddr from 'ipaddr.js';
export const MAX_BYTES=20*1024*1024;
export function publicAddress(value){try{const ip=ipaddr.process(value);return ip.range()==='unicast';}catch{return false;}}
export function safeUrl(value){
 if(typeof value!=='string'||value.length>2048)throw Error('Use a public HTTP or HTTPS URL up to 2,048 characters.');let url;try{url=new URL(value);}catch{throw Error('Invalid URL. Include https:// or http://.');}
 const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||!host||host.endsWith('.')||(!host.includes('.')&&!host.includes(':'))||/(^|\.)(localhost|local|internal|intranet|test|invalid|onion|home|lan)$/.test(host))throw Error('Only public HTTP/HTTPS links on standard ports are supported.');
 if(ipaddr.isValid(host)&&!publicAddress(host))throw Error('Private, local and reserved addresses are not supported.');url.hash='';return url;
}
export async function resolvePublic(url,lookup){const hostname=url.hostname.replace(/^\[|\]$/g,'');const addresses=ipaddr.isValid(hostname)?[{address:hostname}]:await lookup(hostname);if(!addresses?.length||addresses.some(item=>!publicAddress(item.address)))throw Error('This hostname does not resolve exclusively to public addresses.');return addresses[0].address;}
export async function fetchPublic(value,{lookup,request,maxBytes=MAX_BYTES,signal,beforeRequest}={}){
 let url=safeUrl(value);const visited=new Set();
 for(let hop=0;hop<5;hop++){
  if(signal?.aborted)throw Error('Import cancelled.');if(visited.has(url.href))throw Error('Redirect loop.');visited.add(url.href);
  const address=await resolvePublic(url,lookup);await beforeRequest?.(url);const response=await request(url,address,{maxBytes,signal});
  if([301,302,303,307,308].includes(response.status)){if(!response.headers.location)throw Error('Redirect is missing a destination.');const next=safeUrl(new URL(response.headers.location,url).href);if(url.protocol==='https:'&&next.protocol==='http:')throw Error('An HTTPS link redirected to an insecure HTTP page.');url=next;continue;}
  if(response.status!==200)throw Error([401,403].includes(response.status)?'This link requires access permission or blocks automated downloads. Download it in your browser and import the file instead.':`The source returned HTTP ${response.status}. Try another public link.`);
  if(response.body.byteLength>maxBytes)throw Error('Download exceeds the 20 MB link-import limit.');return {...response,url:url.href};
 }throw Error('Too many redirects.');
}
export function robotsAllowed(text,path){
 let groups=[],current={agents:[],rules:[]},rulesStarted=false;
 for(const raw of text.split(/\r?\n/)){const line=raw.replace(/#.*/,'').trim(),match=line.match(/^([^:]+):\s*(.*)$/);if(!match)continue;const key=match[1].toLowerCase(),value=match[2].trim();if(key==='user-agent'){if(rulesStarted){groups.push(current);current={agents:[],rules:[]};rulesStarted=false;}current.agents.push(value.toLowerCase());}else if(['allow','disallow'].includes(key)&&current.agents.length){rulesStarted=true;if(value)current.rules.push({allow:key==='allow',path:value});}}
 groups.push(current);const named=groups.filter(g=>g.agents.some(a=>a!=='*'&&'readernotesimporter'.includes(a)));const selected=named.length?named:groups.filter(g=>g.agents.includes('*'));let best=null;
 for(const rule of selected.flatMap(g=>g.rules)){const pattern=rule.path.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\\\$$/,'$');if(new RegExp('^'+pattern).test(path)){const length=rule.path.replace(/\*/g,'').length;if(!best||length>best.length||(length===best.length&&rule.allow))best={length,allow:rule.allow};}}
 return best?.allow!==false;
}
