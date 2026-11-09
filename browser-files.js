import * as db from './storage.js';
// Some WebKit environments reject Blob persistence; bounded byte chunks are
// structured-cloneable there. Existing Blob records remain readable.
export async function saveBrowserFile(owner,key,file){
 try{await db.putAsset(owner,key,file.slice(0,file.size,file.type));}
 catch(error){if(error.name==='QuotaExceededError')throw error;const chunks=[];for(let start=0;start<file.size;start+=4*1024*1024)chunks.push(await file.slice(start,start+4*1024*1024).arrayBuffer());await db.putAsset(owner,key,{format:'mixed-bytes-v1',type:file.type,chunks});}
}
export async function readBrowserFile(owner,key){const value=(await db.getAsset(owner,key))?.file;return value?.format==='mixed-bytes-v1'?new Blob(value.chunks,{type:value.type}):value;}
