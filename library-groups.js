import {TAXONOMY,SOURCE_PATHS} from './library-taxonomy.js';
export const categories=Object.entries(TAXONOMY.CATEGORIES).map(([id,[title]])=>({id,title}));
export function classifyImport(meta){
 let collection=(meta?.sourcePath||'').replace(/^\.\//,'').split('/')[0];
 const key=meta?.sourceKey||'';
 if(['python_learning_path','python_tutorial'].includes(collection))collection='python';
 if(!TAXONOMY.COLLECTIONS[collection]){
   if(key.startsWith('news-report-'))collection='news_reports';
   else if(key.startsWith('nine-commentaries:'))collection='nine_commentaries';
   else if(key.startsWith('qibenyu-editor-'))collection='qibenyu_memoir';
   else if(key.startsWith('jianshang:'))collection='jianshang';
   else if(key.startsWith('reader-articles-'))collection='reader_articles';
   else if(key.startsWith('personal-writings-'))collection='personal_writings';
   else if(key.startsWith('russian-wars-'))collection='russian_wars';
 }
 const category=Object.entries(TAXONOMY.CATEGORY_COLLECTIONS).find(([,list])=>list.includes(collection))?.[0];
 return category?{category,collection,categoryTitle:TAXONOMY.CATEGORIES[category][0],collectionTitle:TAXONOMY.COLLECTIONS[collection],path:meta.sourcePath||key}:{category:'other',collection:'other',categoryTitle:'Other reading materials',collectionTitle:'Other reading materials',path:key};
}
export function groupedBooks(books,metadata){
 const index=new Map(metadata.filter(x=>x.bookId).map(x=>[x.bookId,x]));const groups=new Map();
 for(const book of books){const meta=index.get(book.id),group=book.categoryId?{category:book.categoryId,categoryTitle:book.categoryTitle,collection:'category-'+book.categoryId,collectionTitle:'My documents',path:''}:meta?classifyImport(meta):{category:'personal',collection:'personal',categoryTitle:'My reading materials',collectionTitle:'My reading materials',path:''};const key=group.category+':'+group.collection;if(!groups.has(key))groups.set(key,{...group,books:[]});groups.get(key).books.push(book);}
 const order=[...Object.keys(TAXONOMY.CATEGORIES),'other','personal'];
 return [...groups.values()].sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category)||(TAXONOMY.CATEGORY_COLLECTIONS[a.category]||[]).indexOf(a.collection)-(TAXONOMY.CATEGORY_COLLECTIONS[b.category]||[]).indexOf(b.collection));
}

// Titles are editable and are never used to identify an article.
export function articleIdentity(book,meta){
 const key=meta?.sourceKey||'';
 const chapter=key.match(/^jianshang:(chapter_\d+):editor(?::v\d+(?::[^:]+)?)?$/);
 const path=SOURCE_PATHS[key]||meta?.sourcePath||(chapter?`jianshang/${chapter[1]}/editor.html`:'');
 return path?'path:'+path.replace(/^\.\//,''):key?'key:'+key:'book:'+book.id;
}
export function articleRows(books,metadata){
 const index=new Map(metadata.filter(x=>x.bookId).map(x=>[x.bookId,x])),rows=new Map();
 for(const book of books){const meta=index.get(book.id),id=articleIdentity(book,meta);if(!rows.has(id))rows.set(id,{id,path:id.startsWith('path:')?id.slice(5):'',editions:[]});rows.get(id).editions.push(book);}
 for(const row of rows.values()){
  row.editions.sort((a,b)=>(index.get(a.id)?.edition==='Source edition'?1:0)-(index.get(b.id)?.edition==='Source edition'?1:0)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  row.book=row.editions[0];const source=row.editions.find(b=>index.get(b.id)?.edition==='Source edition');row.title=source?.title||row.book.title.replace(/ · saved edition$/,'');
 }
 return [...rows.values()].sort((a,b)=>(a.path||a.id).localeCompare(b.path||b.id,undefined,{numeric:true}));
}

// Shorten only an exact repeated collection prefix; never change stored titles.
export function catalogTitle(title,collectionTitle){
 const unwrap=value=>value.startsWith('《')&&value.endsWith('》')?value.slice(1,-1):value;
 const full=unwrap(title),collection=unwrap(collectionTitle);
 if(collection&&full.startsWith(collection)){
  const suffix=full.slice(collection.length),match=suffix.match(/^\s*(?:[·:：—–-]|\/|\s)\s*(.+)$/s);
  if(match?.[1]?.trim())return match[1].trim();
 }
 return title;
}
