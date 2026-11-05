import {TAXONOMY} from './library-taxonomy.js';
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
 for(const book of books){const meta=index.get(book.id),group=meta?classifyImport(meta):{category:'personal',collection:'personal',categoryTitle:'My reading materials',collectionTitle:'My reading materials',path:''};const key=group.category+':'+group.collection;if(!groups.has(key))groups.set(key,{...group,books:[]});groups.get(key).books.push(book);}
 const order=[...Object.keys(TAXONOMY.CATEGORIES),'other','personal'];
 return [...groups.values()].sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category)||(TAXONOMY.CATEGORY_COLLECTIONS[a.category]||[]).indexOf(a.collection)-(TAXONOMY.CATEGORY_COLLECTIONS[b.category]||[]).indexOf(b.collection));
}
