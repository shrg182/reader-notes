import {digest,legacyId,plainText,parseCsv,canonical} from './migration-model.js';
import {validateBook} from './core.js';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export async function planBundle(bundle){
  if(bundle?.format!=='reader-notes-studio-bundle'||bundle.version!==1||!Array.isArray(bundle.sources)||!Array.isArray(bundle.archives)||!Array.isArray(bundle.dictionaries)||bundle.sources.length>5000)throw Error('Invalid Studio migration package.');
  const records=[],seen=new Set(),catalog=new Map((bundle.catalog||[]).map(x=>[x.key,x]));
  async function add(key,kind,title,payload,book){
    const id=await legacyId('complete:'+key);if(seen.has(id))return;seen.add(id);
    if(book)book=validateBook({...book,id});
    const fingerprint=await digest(canonical({payload,book}));
    records.push({id,kind,title:String(title).slice(0,200),bookId:book?.id||null,fingerprint,payload,book});
  }
  const lookup=new Map();
  for(const archive of bundle.archives){
    if(typeof archive.text!=='string'||await digest(archive.text)!==archive.sha256)throw Error('Archive fingerprint mismatch.');
    const data=JSON.parse(archive.text);if(data.archiveType!=='study-studio-all-editing-records'||data.archiveVersion!==1)throw Error('Unsupported Studio archive.');
    if([...data.records,...data.preferences].some(r=>/(^|[-_:])(auth|session|token|password|secret|credential)([-_:]|$)/i.test(r.key)))throw Error('Archive contains credential/session records. Export reading data only.');
    for(const r of [...data.records,...data.preferences])if(!/(^|[-_:])(auth|session|token|password|secret|credential)([-_:]|$)/i.test(r.key))lookup.set(r.key,r.value);
    // Exact original remains downloadable; never executed or published.
    await add('archive:'+archive.sha256,'archive',archive.name,{name:archive.name,text:archive.text});
  }
  function notesFor(key,value,entry){
    const notesKey=entry?.notesKey||key+'-notes-v1';const raw=lookup.get(notesKey)??value.notes??[];
    const uncertain=['-trash-v1','-suppressed-v1'].some(s=>lookup.has(notesKey+s)&&(!Array.isArray(lookup.get(notesKey+s))||lookup.get(notesKey+s).some(x=>typeof x!=='string'&&typeof x?.id!=='string')));
    const suppressed=new Set(['-trash-v1','-suppressed-v1'].flatMap(s=>Array.isArray(lookup.get(notesKey+s))?lookup.get(notesKey+s):[]).map(x=>typeof x==='string'?x:x?.id));
    const list=uncertain?[]:Array.isArray(raw)?raw.filter(x=>!x?.deleted&&!x?.trashed&&!suppressed.has(x?.id)):raw;
    return {notes:list,footnotes:value.footnotes||[],history:lookup.get(entry?.logKey||key+'-log-v1')??value.log??value.history??[],terms:value.terms??value.vocabulary??[]};
  }
  function readable(data){return [data.notes,data.footnotes].map(x=>Array.isArray(x)?x.map(n=>typeof n==='string'?n:plainText(String(n.text??n.content??n.note??n.html??JSON.stringify(n)))).join('\n\n'):JSON.stringify(x)).filter(Boolean).join('\n\n');}
  for(const source of bundle.sources){
    if(typeof source.original!=='string'||await digest(source.original)!==source.sha256||typeof source.html!=='string')throw Error('Source fingerprint mismatch.');
    const related=notesFor(source.key,{},source);const hasSaved=object(lookup.get(source.key));
    await add('source:'+source.key,'edition',source.title,{sourceKey:source.key,path:source.path,collection:source.path.split('/')[0],html:source.html,original:source.original,...(!hasSaved?related:{}),terms:source.terms,edition:'Source edition'},
      {title:source.title,language:'',content:plainText(source.html),notes:hasSaved?'':readable(related),deleted:false});
  }
  async function saved(key,value,titleOverride){
    if(!object(value))return;
    const entry=catalog.get(key),meta=value.metadata||{};
    let html=typeof value.bodyHTML==='string'?value.bodyHTML:typeof value.html==='string'?value.html:null;
    let text=html!==null?plainText(html):typeof value.text==='string'?value.text:null;
    if(object(value.texts)){
      text=Object.entries(value.texts).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([page,t])=>`[Page ${page}]\n${t}`).join('\n\n');
      // Per-page HTML must retain its original page association.
      html=typeof value.html==='string'?value.html:null;
    }
    if(text===null)return;
    const title=String(titleOverride||meta.title||value.title||entry?.title||key).slice(0,175);
    const related=notesFor(key,value,entry);
    await add('saved:'+key,'edition',title+' · saved edition',{sourceKey:key,path:entry?.path||'',collection:entry?.path?.split('/')[0]||key.split(/[:-]/)[0],html,...related,raw:value,edition:'Saved edition',savedAt:value.savedAt||null},
      {title:title+' · saved edition',language:String(meta.language||value.language||'').slice(0,40),content:text,notes:readable(related),deleted:false});
  }
  for(const [key,value] of lookup){
    await saved(key,value);
    if(Array.isArray(value?.entries))for(const [i,entry] of value.entries.entries())await saved(key+':entry:'+(entry.id||i),entry);
  }
  let dictionaryEntries=0,occurrences=0;
  for(const file of bundle.dictionaries){
    // CSV source bytes have CRLF; builder text may normalize line endings. Preserve exact text as packaged.
    const rows=parseCsv(file.text),kind=file.name==='sources.csv'?'occurrences':'dictionary';
    if(kind==='dictionary')dictionaryEntries+=rows.length;else occurrences+=rows.length;
    for(let i=0;i<rows.length;i+=200)await add(file.name+':'+i,kind,file.name+` (${i+1}–${Math.min(i+200,rows.length)})`,{rows:rows.slice(i,i+200)});
    await add('csv:'+file.name,'archive',file.name,{name:file.name,text:file.text});
  }
  const overrides=lookup.get('reading-lexicon-entry-overrides-v1')||{};
  await add('dictionary-overrides','corrections','Personal dictionary corrections',{overrides});
  // All supported/unsupported study records remain queryable and recoverable.
  const entries=[...lookup].map(([key,value])=>({key,value}));
  for(let i=0;i<entries.length;i+=40)await add('study-records:'+i,'study','Original study records',{records:entries.slice(i,i+40)});
  return {records,summary:{articles:records.filter(x=>x.book).length,sourceEditions:bundle.sources.length,savedEditions:records.filter(x=>x.book).length-bundle.sources.length,dictionaryEntries,occurrences,corrections:Object.keys(overrides).length,archives:bundle.archives.length},fingerprint:await digest(canonical(records.map(x=>[x.id,x.fingerprint])))};
}
export function safeRichDocument(html){
  // A sandbox without allow-scripts or allow-same-origin plus a deny-all CSP is
  // the second boundary. Only inert formatting is copied into the preview.
  const doc=new DOMParser().parseFromString(html||'','text/html');
  const allowed=new Set('P DIV SPAN BR HR H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE CODE B STRONG I EM U S SUB SUP RUBY RT RP TABLE THEAD TBODY TFOOT TR TD TH UL OL LI DL DT DD SECTION ARTICLE MARK SMALL FIGURE FIGCAPTION'.split(' '));
  function clean(parent){for(const el of [...parent.children]){if(!allowed.has(el.tagName)){if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','TEXTAREA','SELECT','LINK','META','BASE'].includes(el.tagName)){el.remove();continue;}el.replaceWith(...el.childNodes);clean(parent);continue;}for(const a of [...el.attributes])if(!['colspan','rowspan','lang','dir'].includes(a.name))el.removeAttribute(a.name);clean(el);}}
  clean(doc.body);
  return '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><style>body{font:18px/1.9 system-ui;padding:18px;color:#202124}rt{font-size:.65em}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px}pre{white-space:pre-wrap}</style>'+doc.body.innerHTML;
}
