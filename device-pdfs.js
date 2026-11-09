import * as db from './storage.js';
import {saveBrowserFile,readBrowserFile} from './browser-files.js';
import {pdfDeviceIdentity} from './pdf-library-model.js';
// Device PDFs never call the cloud API. Source File objects last only this session
// unless the reader explicitly asks to retain a browser copy.
export class DevicePdfs{
 constructor(){this.records=[];this.files=new Map();}
 async activate(owner){this.reset();this.owner=owner;this.records=await db.getSetting(`pdf-device:${owner}`)||[];}
 reset(){this.version=(this.version||0)+1;this.records=[];this.files.clear();}
 find(id){return this.records.find(record=>record.id===id);}
 async persist(){await db.setSetting(`pdf-device:${this.owner}`,this.records);}
 async file(record){return this.files.get(record.id)||await readBrowserFile(this.owner,'device-pdf:'+record.id);}
 async add(file,values,keep,existing){
  const owner=this.owner,version=this.version,identity=await pdfDeviceIdentity(file);
  const check=()=>{if(owner!==this.owner||version!==this.version)throw Error('Account changed. Select the PDF again in the intended account.');};check();
  if(existing&&(identity!==existing.identity||file.size!==existing.size_bytes))throw Error('Choose the original PDF for this device entry.');
  const record=existing?{...existing,kept:keep}:{id:crypto.randomUUID(),storage:'device',status:'ready',deleted:false,revision:1,
   title:values.title,category_id:values.category.id,category_title:values.category.title,filename:file.name,size_bytes:file.size,
   notes:'',last_page:1,completed:false,identity,kept:keep,updated_at:new Date().toISOString()};
  if(keep)await saveBrowserFile(owner,'device-pdf:'+record.id,file);else await db.deleteAsset(owner,'device-pdf:'+record.id);
  check();this.files.set(record.id,file);this.records=this.records.filter(r=>r.id!==record.id);this.records.push(record);await this.persist();return record;
 }
 async change(record,action,patch={}){
  if(record.status==='purged')throw Error('PDF permanently deleted.');
  const next={...record,updated_at:new Date().toISOString(),revision:record.revision+1};
  if(action==='update')Object.assign(next,patch);
  else if(action==='trash')next.deleted=true;
  else if(action==='restore')next.deleted=false;
  else throw Error('Unsupported device PDF action.');
  this.records=this.records.map(r=>r.id===record.id?next:r);await this.persist();return next;
 }
 async removeCopy(record){await db.deleteAsset(this.owner,'device-pdf:'+record.id);return this.change(record,'update',{kept:false});}
 async purge(record){await db.deleteAsset(this.owner,'device-pdf:'+record.id);this.files.delete(record.id);this.records=this.records.filter(r=>r.id!==record.id);await this.persist();}
}
