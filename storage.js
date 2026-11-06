let database;
export async function openStore() {
  if (database) return database;
  database = await new Promise((resolve,reject)=>{
    // Preserve the preview database name so the Reader Notes rename keeps drafts.
    let blocked=false;
    const req=indexedDB.open('reader-studio-v1',2);
    req.onupgradeneeded=()=>{
      for(const name of ['books','assets','migration_files','migration_batches'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'key'});
      if(!req.result.objectStoreNames.contains('settings'))req.result.createObjectStore('settings');
    };
    req.onblocked=()=>{blocked=true;reject(new Error('Close other Reader Notes tabs, then reload to finish the storage upgrade. Existing data is preserved.'));};
    req.onsuccess=()=>{if(blocked){req.result.close();return;}req.result.onversionchange=()=>{req.result.close();database=undefined;};resolve(req.result);};
    req.onerror=()=>reject(req.error);
  });
  return database;
}
async function transaction(name,mode,operation) {
  const db=await openStore();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(name,mode), store=tx.objectStore(name);
    const req=operation(store);
    tx.oncomplete=()=>resolve(req?.result);
    tx.onerror=()=>reject(tx.error || new Error('Storage failed.'));
    tx.onabort=()=>reject(tx.error || new Error('Storage was interrupted.'));
  });
}
export const getSetting=key=>transaction('settings','readonly',s=>s.get(key));
export const setSetting=(key,value)=>transaction('settings','readwrite',s=>s.put(value,key));
export async function listBooks(scope) {
  const all=await transaction('books','readonly',s=>s.getAll());
  return all.filter(b=>b.scope===scope);
}
export const putBook=(scope,book)=>transaction('books','readwrite',s=>s.put({...book,key:`${scope}:${book.id}`,scope}));
export async function putBooks(scope,books,study,contributions) {
  if(study===undefined&&contributions===undefined)return transaction('books','readwrite',s=>{
    for (const b of books) s.put({...b,key:`${scope}:${b.id}`,scope});
  });
  const db=await openStore();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['books','settings'],'readwrite');
    for(const book of books)tx.objectStore('books').put({...book,key:`${scope}:${book.id}`,scope});
    if(study!==undefined)tx.objectStore('settings').put(study,`vocabulary:${scope}`);
    if(contributions!==undefined)tx.objectStore('settings').put(contributions,`contributions:${scope}`);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
export const listAssets=async scope=>(await transaction('assets','readonly',s=>s.getAll())).filter(a=>a.key.startsWith(scope+':'));
export const getAsset=(scope,id)=>transaction('assets','readonly',s=>s.get(`${scope}:${id}`));
export const putAsset=(scope,id,file)=>transaction('assets','readwrite',s=>s.put({key:`${scope}:${id}`,file}));
export const deleteAsset=(scope,id)=>transaction('assets','readwrite',s=>s.delete(`${scope}:${id}`));
export async function listMigrationBatches(scope){return (await transaction('migration_batches','readonly',s=>s.getAll())).filter(batch=>batch.scope===scope);}
export const getMigrationFile=(scope,hash)=>transaction('migration_files','readonly',s=>s.get(`${scope}:${hash}`));
export async function commitMigration(scope,batch,sources,books=[]){
  const db=await openStore();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['books','migration_files','migration_batches'],'readwrite');
    // add(), not put(): a stale preview can never replace an existing article.
    for(const book of books)tx.objectStore('books').add({...book,key:`${scope}:${book.id}`,scope});
    for(const source of sources)tx.objectStore('migration_files').put({key:`${scope}:${source.hash}`,scope,hash:source.hash,name:source.name,file:source.file});
    tx.objectStore('migration_batches').put({...batch,key:`${scope}:${batch.id}`,scope});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Migration transaction was cancelled.'));
  });
}
export async function clearAccount(scope) {
  const db=await openStore();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['books','assets','settings','migration_files','migration_batches'],'readwrite');
    tx.objectStore('settings').delete(`vocabulary:${scope}`);
    tx.objectStore('settings').delete(`contributions:${scope}`);
    tx.objectStore('settings').delete(`imports:${scope}`);
    tx.objectStore('settings').delete(`reading:${scope}`);
    tx.objectStore('settings').delete(`last-sync:${scope}`);
    tx.objectStore('settings').delete(`catalog-activity:${scope}`);
    const imported=tx.objectStore('settings').openCursor();imported.onsuccess=()=>{const c=imported.result;if(c){if(String(c.key).startsWith(`import-record:${scope}:`))c.delete();c.continue();}};
    for(const device of ['phone','desktop'])tx.objectStore('settings').delete(`tools:${scope}:${device}`);
    for(const name of ['books','assets','migration_files','migration_batches']) {
      const request=tx.objectStore(name).openCursor();
      request.onsuccess=()=>{const c=request.result;if(c){if(c.key.startsWith(`${scope}:`))c.delete();c.continue();}};
    }
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
