import {TAXONOMY} from './library-taxonomy.js';
export function collectionChoices(category,placements=[]){const choices=new Map((TAXONOMY.CATEGORY_COLLECTIONS[category]||[]).map(id=>[id,{id,title:TAXONOMY.COLLECTIONS[id]}]));for(const p of placements)if(p.category_id===category&&p.collection_id)choices.set(p.collection_id,{id:p.collection_id,title:p.collection_title});return [...choices.values()];}
export function placementMatches(book,p){return p&&(!book.categoryId||book.categoryId===p.category_id);}
// Relative positions preserve the existing natural order of untouched articles.
// A missing/moved anchor falls back to the end; stale cycles never hide rows.
export function arrangeRows(rows){
 const aliases=new Map();for(const row of rows)for(const edition of row.editions)aliases.set(edition.id,row.id);
 const before=new Map(),after=new Map(),base=[],end=[];
 for(const row of rows){const p=row.book.placement;if(!p){base.push(row);continue;}const anchor=aliases.get(p.anchor_id);if(!anchor||anchor===row.id||p.side==='end'){end.push(row);continue;}const map=p.side==='before'?before:after;if(!map.has(anchor))map.set(anchor,[]);map.get(anchor).push(row);}
 const stamp=row=>row.book.placement?.updated_at||'';const sort=(list,reverse=false)=>list.sort((a,b)=>(reverse?-1:1)*(stamp(a).localeCompare(stamp(b))||a.id.localeCompare(b.id)));
 for(const list of before.values())sort(list);for(const list of after.values())sort(list,true);sort(end);
 const result=[],seen=new Set(),visiting=new Set();function visit(row){if(seen.has(row.id)||visiting.has(row.id))return;visiting.add(row.id);for(const child of before.get(row.id)||[])visit(child);if(!seen.has(row.id)){seen.add(row.id);result.push(row);}for(const child of after.get(row.id)||[])visit(child);visiting.delete(row.id);}
 for(const row of [...base,...end,...rows])visit(row);return result;
}
export function suggestedCollection(title,url){let host='';try{host=new URL(url).hostname;}catch{}for(const [id,label]of Object.entries(TAXONOMY.COLLECTIONS)){const plain=label.replace(/[《》]/g,'');if(plain&&title.includes(plain)||id==='guwen_guanzhi'&&host==='gwgz.5000yan.com')return {id,title:label,category:Object.entries(TAXONOMY.CATEGORY_COLLECTIONS).find(([,ids])=>ids.includes(id))?.[0]};}return null;}
