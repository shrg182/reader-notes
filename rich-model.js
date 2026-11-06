export const RICH_LIMIT=40_000_000;
export function validateRichState(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>RICH_LIMIT)throw Error('Rich edition exceeds the 40 MB limit. Export media separately or reduce attachment sizes.');
 const data=JSON.parse(text);if(data?.format!=='reader-notes-rich-v1'||!data.state||typeof data.state.bodyHTML!=='string'||data.state.bodyHTML.length>1_000_000)throw Error('Invalid rich edition.');
 for(const key of ['terms','footnotes','notes','log','media'])if(data.state[key]!==undefined&&(!Array.isArray(data.state[key])||data.state[key].length>20000))throw Error('Invalid rich '+key);
 for(const media of data.state.media||[])if(typeof media.dataUrl!=='string'||!/^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm));base64,[A-Za-z0-9+/=]+$/.test(media.dataUrl))throw Error('Unsupported rich attachment.');
 return data;
}
export function encodeRichState(state){state={...state};delete state.savedAt;const text=JSON.stringify({format:'reader-notes-rich-v1',state});validateRichState(text);return text;}
export function jsonConstant(source,name){
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const match=new RegExp('\\b'+escaped+'\\s*=\\s*').exec(source||'');if(!match)return null;
 const start=match.index+match[0].length,first=source[start];if(!['[','{'].includes(first))return null;
 let depth=0,string=false,escape=false;
 for(let i=start;i<source.length;i++){const c=source[i];if(string){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')string=false;}else if(c==='"')string=true;else if(c==='['||c==='{')depth++;else if(c===']'||c==='}'){if(--depth===0){try{return JSON.parse(source.slice(start,i+1));}catch{return null;}}}}
 return null;
}

export function mergeDictionaryOverrides(books,base={}){
 const result={...base},changes=new Map();
 for(const book of books||[]){if(!book.richState)continue;let data;try{data=JSON.parse(book.richState).state;}catch{continue;}
  for(const [key,change] of Object.entries(data?.dictionaryMutations||{})){if(typeof change?.time!=='string')continue;const previous=changes.get(key);if(!previous||change.time>previous.time)changes.set(key,change);}
 }
 for(const [key,change] of changes){if(change.deleted)delete result[key];else if(change.value&&typeof change.value==='object')result[key]=change.value;}
 return result;
}
