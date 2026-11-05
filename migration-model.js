import {validateBook,sameEdition,MAX_TEXT} from './core.js';
export const LIMITS={files:60,fileBytes:50*1024*1024,totalBytes:100*1024*1024,records:20000,trial:10};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
export async function legacyId(key){const hash=await digest('reader-notes:study-studio:'+key);return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;}
function checkStructure(value){
  const stack=[[value,0]];let count=0;
  while(stack.length){const [item,depth]=stack.pop();if(++count>500000||depth>64)throw new Error('Archive structure exceeds the inspection limit.');if(item&&typeof item==='object')for(const child of Object.values(item))stack.push([child,depth+1]);}
}
export function canonical(value){return JSON.stringify(stable(value));}
function stable(value){if(Array.isArray(value))return value.map(stable);if(!object(value))return value;return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));}
export function parseCsv(raw){
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<raw.length;i++){
    const c=raw[i];
    if(quoted){if(c==='"'&&raw[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;closed=true;}else cell+=c;}
    else if(c==='"'&&!cell&&!closed)quoted=true;
    else if(c===','||c==='\n'||c==='\r'){
      row.push(cell);cell='';closed=false;
      if(c!==','){if(c==='\r'&&raw[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];if(rows.length>100001)throw new Error('CSV exceeds 100,000 rows.');}
      if(row.length>100)throw new Error('CSV has too many columns.');
    }else{if(closed&&!/\s/.test(c))throw new Error('Malformed quoted CSV field.');if(!closed)cell+=c;}
  }
  if(quoted)throw new Error('CSV contains an unclosed quote.');
  row.push(cell);if(row.some(Boolean))rows.push(row);
  if(!rows.length)throw new Error('CSV is empty.');
  const headers=rows.shift().map((header,index)=>header.replace(index===0?/^\uFEFF/:/^$/,'').trim().toLowerCase());
  if(new Set(headers).size!==headers.length||headers.some(header=>!header))throw new Error('CSV headers must be distinct and nonempty.');
  return rows.map(values=>{if(values.length!==headers.length)throw new Error('CSV row has a different number of columns.');return Object.fromEntries(headers.map((key,index)=>[key,values[index]]));});
}
export function plainText(html){
  const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…',ldquo:'“',rdquo:'”',lsquo:'‘',rsquo:'’'};
  return html.replace(/<!--[^]*?-->/g,'').replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[^]*?<\/\1\s*>/gi,'')
    .replace(/<(?:br|hr)\b[^>]*>|<\/(?:p|div|h[1-6]|li|tr|section|blockquote)>/gi,'\n')
    .replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(match,key)=>{
      if(key[0]!=='#')return entities[key]??match;
      const number=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
      return number>0&&number<=0x10ffff&&!(number>=0xd800&&number<=0xdfff)?String.fromCodePoint(number):'�';
    }).replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
const recognizedKey=key=>/(?:editor[-:]v\d|editor-v\d|russian-wars-draft-|personal-writings-|reader-articles-)/.test(key);
const excludedKey=key=>/(^|[-_:])(auth|session|token|password|secret|credential)([-_:]|$)/i.test(key);
const count=value=>Array.isArray(value)?value.length:0;
function arrayNotes(value){return (Array.isArray(value)?value:[]).map(note=>{
  if(typeof note==='string')return note;
  if(!object(note))return JSON.stringify(note);
  const content=note.text??note.content??note.note??note.html;
  return [note.id?`[${note.id}]`:'',typeof content==='string'?plainText(content):JSON.stringify(note)].filter(Boolean).join(' ');
}).join('\n\n');}
function extractArticle(value){
  if(!object(value))return null;
  if(typeof value.bodyHTML==='string')return {text:plainText(value.bodyHTML),rich:true};
  if(typeof value.html==='string')return {text:plainText(value.html),rich:true};
  if(object(value.texts)&&Object.values(value.texts).every(text=>typeof text==='string'))return {text:Object.keys(value.texts).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(key=>`[Page ${key}]\n${value.texts[key]}`).join('\n\n'),rich:true,paged:true};
  if(typeof value.text==='string')return {text:value.text,rich:false};
  return null;
}
function metadata(value){return object(value.metadata)?value.metadata:{};}
function assetReferences(value){
  const html=typeof value.bodyHTML==='string'?value.bodyHTML:typeof value.html==='string'?value.html:'',references=[];
  for(const match of html.matchAll(/<(?:img|audio|video|source|embed|object)\b[^>]*?\b(?:src|data|poster)\s*=\s*["']([^"']+)["']/gi))references.push(match[1]);
  for(const field of ['pdfUrl','sourcePdf','sourceURL','sourceUrl'])if(typeof value[field]==='string'&&/\.(pdf|epub)(?:[?#]|$)/i.test(value[field]))references.push(value[field]);
  return [...new Set(references.slice(0,1000).filter(url=>!/^data:|^blob:|^javascript:/i.test(url)).map(url=>{
    // Report paths, not signed query strings. Exact original URLs remain in the source file.
    try{const parsed=new URL(url);return ['http:','https:','file:'].includes(parsed.protocol)?parsed.origin+parsed.pathname:'';}catch{return url.split(/[?#]/)[0];}
  }).filter(Boolean))];
}
async function articleRecord(key,value,lookup,catalog,sourceFile){
  const extracted=extractArticle(value);if(!extracted)return null;
  const identity=extracted.paged?key.replace(/:editor:v\d+.*$/,':editor'):key;
  const catalogEntry=catalog.get(key),meta=metadata(value),id=await legacyId(identity);
  const notesKey=catalogEntry?.notesKey||`${key}-notes-v1`,logKey=catalogEntry?.logKey||`${key}-log-v1`;
  const notes=lookup.has(notesKey)?lookup.get(notesKey):(value.readingNotes??value.notes??[]);
  const footnotes=value.footnotes||[],history=lookup.get(logKey)||value.history||[];
  const suppressed=new Set();let uncertainDeletion=false;
  for(const suffix of ['-trash-v1','-suppressed-v1']){
    const records=lookup.get(notesKey+suffix);if(records===undefined)continue;
    if(!Array.isArray(records)){uncertainDeletion=true;continue;}
    for(const item of records){const id=typeof item==='string'?item:item?.id;if(typeof id==='string')suppressed.add(id);else uncertainDeletion=true;}
  }
  const visibleNotes=uncertainDeletion?[]:(Array.isArray(notes)?notes:[]).filter(note=>!note?.deleted&&!note?.trashed&&!suppressed.has(note?.id));
  const body={id,title:String(meta.title||value.title||catalogEntry?.title||key).slice(0,200)||'Imported article',language:String(meta.language||value.language||'').slice(0,40),content:extracted.text,
    notes:[`Reader Studio source: ${key}`,catalogEntry?.path?`Original path: ${catalogEntry.path}`:'',arrayNotes(visibleNotes),count(footnotes)?'Footnotes\n'+arrayNotes(footnotes):''].filter(Boolean).join('\n\n'),deleted:false};
  const warnings=[];
  if(extracted.rich)warnings.push('Plain-text reading copy only. Rich formatting and inline annotations remain in the original archive.');
  if(count(notes)||count(footnotes))warnings.push('Notes become readable text; passage anchors and footnote links require later conversion.');
  if(uncertainDeletion)warnings.push('Note deletion metadata is not understood; reading notes stay archive-only to avoid restoring removed notes.');
  if(count(history))warnings.push('Editing history is retained in the original archive, not installed as Reader Notes revisions.');
  if(extracted.paged)warnings.push('Page boundaries are labelled; book/chapter relationships need later conversion.');
  let blocked='';
  try{validateBook(body);}catch{blocked=`Article exceeds the current title/text/note limits (${MAX_TEXT.toLocaleString()} characters per text field).`;}
  const terms=Array.isArray(value.vocabulary)?value.vocabulary:Array.isArray(value.terms)?value.terms:[];
  if(terms.length)warnings.push('Article vocabulary stays in the source archive for a later structured vocabulary adapter.');
  const edition={...value};delete edition.savedAt;
  return {key,identity,sourceFile,title:body.title,kind:'article',book:body,assetReferences:assetReferences(value),notes:count(notes)+count(footnotes),history:count(history),vocabulary:terms.length,warnings,blocked,
    sourcePath:catalogEntry?.path||'',fingerprint:await digest(canonical({value:edition,notes,history}))};
}
function classify(key,value){
  if(excludedKey(key))return 'excluded settings';
  if(key==='reading-lexicon-entry-overrides-v1')return 'dictionary corrections';
  if(/trash|suppressed/.test(key))return 'deletion/recovery records';
  if(/notes|footnote|annotation/i.test(key)&&Array.isArray(value))return 'notes';
  if(/log|history/i.test(key))return 'history';
  if(/dictionary|lexicon|vocab/i.test(key))return 'dictionary data';
  return 'unsupported record';
}
async function fromRecords(records,catalog,sourceFile){
  if(!Array.isArray(records)||records.length>LIMITS.records)throw new Error('Archive must contain at most 20,000 records.');
  const lookup=new Map();
  for(const record of records){if(!record||typeof record.key!=='string'||lookup.has(record.key)||!['text','json'].includes(record.format))throw new Error('Archive has invalid or duplicate record keys.');lookup.set(record.key,record.value);}
  const items=[];
  for(const [key,value] of lookup){
    const candidate=!excludedKey(key)&&(catalog.has(key)||recognizedKey(key))?await articleRecord(key,value,lookup,catalog,sourceFile):null;
    const kind=candidate?'article':classify(key,value);
    items.push(candidate||{key,sourceFile,kind,title:key,notes:kind==='notes'?count(value):0,history:kind==='history'?count(value):0,
      vocabulary:kind==='dictionary corrections'&&object(value)?Object.keys(value).length:0,warnings:[],blocked:'Archive only; a format-specific conversion is required.'});
  }
  return items;
}
export async function inspectData(data,{catalog=new Map(),name='archive.json'}={}){
  checkStructure(data);
  if(data?.archiveType==='study-studio-all-editing-records'){
    if(data.archiveVersion!==1||!Array.isArray(data.preferences))throw new Error('Unsupported full editing archive version.');
    const records=[...(data.records||[]),...data.preferences];
    return {type:'Full editing archive',items:await fromRecords(records,catalog,name),warnings:['Source PDF/EPUB files and IndexedDB attachments are not embedded in this editing archive.'],recordCount:records.length};
  }
  if(data?.schema==='study-studio-portable-v1'){
    if(!object(data.records)||Object.keys(data.records).length>LIMITS.records)throw new Error('Invalid portable package records.');
    const items=[];
    for(const [key,record] of Object.entries(data.records)){
      if(!object(record)||typeof record.revision!=='string'||!Array.isArray(record.ancestors)||record.ancestors.length>256||!record.ancestors.every(id=>typeof id==='string')||!['primary','secondary'].includes(record.role)||typeof record.author!=='string'||!Number.isFinite(Date.parse(record.updatedAt)))throw new Error('Invalid portable article history.');
      if(record.value!==null&&!object(record.value))throw new Error('Invalid portable article contents.');
      const normalized=record.value===null?null:Object.create(null);
      const records=[];
      if(record.value!==null)for(const [storageKey,raw] of Object.entries(record.value)){
        if(typeof raw!=='string')throw new Error('Portable storage records must contain JSON strings.');
        const parsed=JSON.parse(raw);if(storageKey===key?!object(parsed):!Array.isArray(parsed))throw new Error('Invalid portable record shape.');records.push({key:storageKey,value:parsed,format:'json'});
        normalized[storageKey]=JSON.parse(raw);if(storageKey===key&&object(normalized[storageKey]))delete normalized[storageKey].savedAt;
      }
      if(record.hash!==await digest(canonical(normalized)))throw new Error('Portable package fingerprint does not match its contents.');
      if(record.value===null){items.push({key,sourceFile:name,title:key,kind:'deletion/recovery records',notes:0,history:record.ancestors.length,vocabulary:0,warnings:[],blocked:'A deletion marker is retained; no Reader Notes article will be deleted.'});continue;}
      const classified=await fromRecords(records,catalog,name);
      const primary=classified.find(item=>item.key===key);if(primary)primary.portableRevision=record.revision;
      items.push(...classified);
    }
    return {type:'Portable reading package',items,recordCount:items.length,warnings:['Portable packages omit source files, media, reading positions, and global dictionary corrections. Device priority is not used to overwrite Reader Notes data.']};
  }
  if(data?.storage_key==='reading-lexicon-entry-overrides-v1'&&data.version===1&&object(data.overrides)){
    return {type:'Dictionary corrections',recordCount:Object.keys(data.overrides).length,warnings:['These are personal corrections; the base dictionary and source-occurrence files are also needed.'],items:Object.keys(data.overrides).map(key=>({key,sourceFile:name,title:key.replace('\0',' · '),kind:'dictionary corrections',notes:0,history:0,vocabulary:1,warnings:[],blocked:'Retained for the dictionary-library adapter; not forced into a book vocabulary list.'}))};
  }
  if(object(data)&&data.schema==='reader-article-v1'&&extractArticle(data)){
    const key=String(data.id||name),candidate=await articleRecord(key,data,new Map(),catalog,name);
    return {type:'Reader Studio article backup',items:[candidate],recordCount:1,warnings:[]};
  }
  throw new Error('Unrecognized JSON schema. Keep this source file for a later adapter.');
}
function unwrapScript(raw){
  const match=raw.match(/^\s*window\.(ReadingReviewCatalog|DICTIONARY_ENTRIES)\s*=\s*([^]*?)\s*;?\s*$/);
  if(!match)throw new Error('Only JSON-form catalog/dictionary assignments can be inspected; JavaScript is never executed.');
  let json=match[2];if(json.endsWith(';'))json=json.slice(0,-1);
  return {kind:match[1],value:JSON.parse(json)};
}
export async function inspectFiles(files,existing=[]){
  if(!files.length||files.length>LIMITS.files)throw new Error(`Choose between 1 and ${LIMITS.files} files.`);
  if(files.reduce((sum,file)=>sum+file.size,0)>LIMITS.totalBytes||files.some(file=>file.size>LIMITS.fileBytes))throw new Error('Inspection supports 50 MB per file and 100 MB per batch.');
  const catalog=new Map(),sources=[],parsed=new Map();
  for(const file of files){
    const bytes=await file.arrayBuffer(),hash=await digest(bytes),source={name:file.name,size:file.size,hash,file,type:'',items:[],warnings:[],recordCount:0};sources.push(source);
    try{
      if(/\.(json|js|csv|txt|md|html?)$/i.test(file.name)){
        const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
        if(/\.js$/i.test(file.name)){
          const script=unwrapScript(raw);checkStructure(script.value);
          if(script.kind==='ReadingReviewCatalog'){
            if(!Array.isArray(script.value)||script.value.length>LIMITS.records)throw new Error('Invalid reading catalog.');
            const local=new Map();
            for(const entry of script.value){if(!object(entry)||typeof entry.key!=='string'||typeof entry.title!=='string'||typeof entry.path!=='string'||catalog.has(entry.key)||local.has(entry.key))throw new Error('Catalog contains invalid or duplicate article keys.');local.set(entry.key,entry);}
            for(const [key,value] of local)catalog.set(key,value);
          }
          parsed.set(source,{script});
        }else if(/\.json$/i.test(file.name)){const data=JSON.parse(raw.replace(/^\uFEFF/,''));checkStructure(data);parsed.set(source,{data});}
        else parsed.set(source,{raw});
      }else parsed.set(source,{bytes});
    }catch(error){source.error=error.message;source.type='Not convertible';}
  }
  for(const source of sources){
    if(source.error)continue;
    const {data,script,raw,bytes}=parsed.get(source);
    try{
      if(data!==undefined){Object.assign(source,await inspectData(data,{catalog,name:source.name}));}
      else if(script?.kind==='ReadingReviewCatalog'){source.type='Reading catalog';source.recordCount=script.value.length;source.warnings.push('Catalog metadata helps match article titles, note keys and original paths. It does not contain article text.');}
      else if(script?.kind==='DICTIONARY_ENTRIES'){
        if(!Array.isArray(script.value)||script.value.length>100000)throw new Error('Invalid dictionary dataset.');
        source.type='Dictionary dataset';source.recordCount=script.value.length;source.items=script.value.map((entry,index)=>({key:String(index),sourceFile:source.name,title:String(entry.term||''),kind:'dictionary entries',notes:0,history:0,vocabulary:1,warnings:[],blocked:'Dictionary-library conversion pending; original fields and sources are retained.'}));
      }else if(/\.csv$/i.test(source.name)){
        const rows=parseCsv(raw);if(!rows.length||!('term' in rows[0]))throw new Error('CSV needs a term column.');
        const occurrences='source_target' in rows[0]||'source' in rows[0];source.type=occurrences?'Dictionary source occurrences':'Dictionary entries';source.recordCount=rows.length;
        source.items=rows.map((row,index)=>({key:String(index),sourceFile:source.name,title:row.term,kind:occurrences?'dictionary occurrences':'dictionary entries',notes:0,history:0,vocabulary:occurrences?0:1,warnings:[],blocked:'Dictionary-library conversion pending; original CSV columns are retained.'}));
      }else if(/\.(txt|md)$/i.test(source.name)){
        const value={title:source.name, text:raw};source.items=[await articleRecord(`file:${source.name}`,value,new Map(),catalog,source.name)];source.type='Plain-text source';source.recordCount=1;
      }else if(/\.html?$/i.test(source.name)){
        source.type='Original HTML source';source.recordCount=1;source.warnings.push('Original HTML is retained without executing scripts. No automatic extraction from executable editor pages.');
      }else{
        if(/\.pdf$/i.test(source.name)&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('Invalid PDF header.');
        if(/\.epub$/i.test(source.name)&&!(new Uint8Array(bytes)[0]===80&&new Uint8Array(bytes)[1]===75))throw new Error('Invalid EPUB ZIP header.');
        source.type=/\.pdf$/i.test(source.name)?'Original PDF':/\.epub$/i.test(source.name)?'Original EPUB':'Attachment / unrecognized file';source.recordCount=1;
        source.warnings.push('File bytes can be retained on this device. Links to articles need a later asset-matching step.');
      }
    }catch(error){source.error=error.message;source.type='Not convertible';source.items=[];}
  }
  const items=sources.flatMap(source=>source.items),candidates=items.filter(item=>item.book),byKey=new Map();
  for(const item of candidates){
    item.assetMatches=(item.assetReferences||[]).map(reference=>{
      let basename=reference.split('/').at(-1);try{basename=decodeURIComponent(basename);}catch{}
      return {reference,candidateFiles:sources.filter(source=>source.name.toLowerCase()===basename.toLowerCase()).map(source=>source.name)};
    });
    if(item.assetMatches.length)item.warnings.push('Referenced assets require manual association. Matching filenames are suggestions, not verified links.');
  }
  for(const item of candidates){const group=byKey.get(item.identity)||[];group.push(item);byKey.set(item.identity,group);}
  for(const group of byKey.values()){
    const fingerprints=new Set(group.map(item=>item.fingerprint));
    for(const [index,item] of group.entries()){
      const old=existing.find(book=>book.id===item.book.id);
      item.status=item.blocked?'blocked':old?(sameEdition(old,item.book)?'already imported':'destination conflict'):fingerprints.size>1?'source conflict':index>0?'duplicate':'ready';
    }
  }
  return {version:1,createdAt:new Date().toISOString(),sources,items,candidates,catalogCount:catalog.size,
    summary:{files:sources.length,records:items.length,articleVersions:candidates.length,distinctArticles:byKey.size,ready:candidates.filter(item=>item.status==='ready').length,
      notes:items.reduce((sum,item)=>sum+(item.notes||0),0),history:items.reduce((sum,item)=>sum+(item.history||0),0),
      dictionaryEntries:items.filter(item=>item.kind==='dictionary entries').length,dictionaryCorrections:items.filter(item=>item.kind==='dictionary corrections').reduce((sum,item)=>sum+(item.vocabulary||0),0),
      dictionaryOccurrences:items.filter(item=>item.kind==='dictionary occurrences').length,
      unmatchedAssets:candidates.flatMap(item=>item.assetMatches).filter(match=>!match.candidateFiles.length).length,errors:sources.filter(source=>source.error).length}};
}
export function migrationReport(plan){
  return {format:'reader-notes-migration-report',version:1,createdAt:plan.createdAt,summary:plan.summary,catalogCount:plan.catalogCount,
    limitations:['Read-only inventory. Plain-text trial imports do not convert rich formatting, annotation anchors, history, or global dictionaries.','Original input files remain authoritative. Staged copies are device caches, not cloud backups.','Detected note/history counts may include both embedded snapshots and separate records; they are not deduplicated migration totals.'],
    sources:plan.sources.map(({name,size,hash,type,recordCount,warnings,error})=>({name,size,sha256:hash,type,recordCount,warnings,...(error?{error}:{})})),
    records:plan.items.map(({key,identity,sourceFile,title,kind,notes,history,vocabulary,warnings,blocked,status,sourcePath,portableRevision,book,assetMatches})=>({key,identity,sourceFile,title,kind,notes,history,vocabulary,warnings,blocked,status,sourcePath,portableRevision,assetMatches,...(book?{destinationId:book.id}:{})}))};
}
