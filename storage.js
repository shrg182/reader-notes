let database;
export async function openStore() {
  if (database) return database;
  database = await new Promise((resolve,reject)=>{
    // Preserve the preview database name so the Reader Notes rename keeps drafts.
    const req=indexedDB.open('reader-studio-v1',1);
    req.onupgradeneeded=()=>{
      req.result.createObjectStore('books',{keyPath:'key'});
      req.result.createObjectStore('assets',{keyPath:'key'});
      req.result.createObjectStore('settings');
    };
    req.onsuccess=()=>resolve(req.result);
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
export async function putBooks(scope,books) {
  return transaction('books','readwrite',s=>{
    for (const b of books) s.put({...b,key:`${scope}:${b.id}`,scope});
  });
}
export const getAsset=(scope,id)=>transaction('assets','readonly',s=>s.get(`${scope}:${id}`));
export const putAsset=(scope,id,file)=>transaction('assets','readwrite',s=>s.put({key:`${scope}:${id}`,file}));
export const deleteAsset=(scope,id)=>transaction('assets','readwrite',s=>s.delete(`${scope}:${id}`));
export async function clearAccount(scope) {
  const db=await openStore();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['books','assets'],'readwrite');
    for(const name of ['books','assets']) {
      const request=tx.objectStore(name).openCursor();
      request.onsuccess=()=>{const c=request.result;if(c){if(c.key.startsWith(`${scope}:`))c.delete();c.continue();}};
    }
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
