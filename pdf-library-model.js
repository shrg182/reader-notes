export const PDF_BUCKET='reader-pdfs';
export const PDF_MAX_BYTES=50*1024*1024;
export const PDF_DEVICE_MAX_BYTES=150*1024*1024;
export const isUuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function validatePdf(file,{device=false}={}){
  const limit=device?PDF_DEVICE_MAX_BYTES:PDF_MAX_BYTES;
  if(!file||!file.size||file.size>limit)throw Error(device?'Choose a PDF up to 150 MB for device-only reading.':'Cloud uploads support up to 50 MB on the free plan. Choose Read on this device for larger PDFs, or compress/split the PDF before uploading.');
  if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw Error('This file is not a PDF.');
  return file;
}
export async function pdfFingerprint(file){
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function pdfDeviceIdentity(file){
  // Bound memory even for large local files; this is a reselection hint, not a
  // cloud integrity hash. The cloud path still hashes the complete PDF.
  const samples=await new Blob([String(file.size),file.slice(0,65536),file.slice(Math.max(0,file.size-65536))]).arrayBuffer();
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',samples))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function pdfBook(record,categories=[]){
  const category=categories.find(c=>c.id===record.category_id);
  return {id:record.id,title:record.title,language:'',content:'',notes:record.notes||'',deleted:record.deleted,kind:'pdf',deviceOnly:record.storage==='device',
    categoryId:record.category_id,categoryTitle:record.category_title||category?.title||'My reading materials',completed:record.completed,
    updatedAt:record.updated_at,dirty:false,status:record.status,revision:record.revision};
}
export function safeUploadUrl(value,projectUrl){
  const url=new URL(value,projectUrl),base=new URL(projectUrl);
  if(url.origin!==base.origin||!url.pathname.startsWith('/storage/v1/upload/resumable/'))throw Error('Invalid upload address.');
  return url.href;
}
