export const PDF_BUCKET='reader-pdfs';
export const PDF_MAX_BYTES=25*1024*1024;
export const isUuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function validatePdf(file){
  if(!file||!file.size||file.size>PDF_MAX_BYTES)throw Error('Choose a PDF up to 25 MB.');
  if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw Error('This file is not a PDF.');
  return file;
}
export async function pdfFingerprint(file){
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function pdfBook(record,categories=[]){
  const category=categories.find(c=>c.id===record.category_id);
  return {id:record.id,title:record.title,language:'',content:'',notes:record.notes||'',deleted:record.deleted,kind:'pdf',
    categoryId:record.category_id,categoryTitle:category?.title||'My reading materials',completed:record.completed,
    updatedAt:record.updated_at,dirty:false,status:record.status,revision:record.revision};
}
export function safeUploadUrl(value,projectUrl){
  const url=new URL(value,projectUrl),base=new URL(projectUrl);
  if(url.origin!==base.origin||!url.pathname.startsWith('/storage/v1/upload/resumable/'))throw Error('Invalid upload address.');
  return url.href;
}
