import {parseHTML} from 'linkedom';
export function extractDocument(body,headers,url){
 const bytes=new Uint8Array(body),head=new TextDecoder().decode(bytes.slice(0,512)),mime=String(headers['content-type']||'').split(';')[0].trim().toLowerCase();
 let filename;try{filename=decodeURIComponent(new URL(url).pathname.split('/').pop()||'document');}catch{filename='document';}filename=filename.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,190)||'document';
 if(head.startsWith('%PDF-'))return {kind:'pdf',mime:'application/pdf',filename:/\.pdf$/i.test(filename)?filename:filename+'.pdf',title:filename.replace(/\.pdf$/i,'').slice(0,200),bytes};
 if(bytes.length>2*1024*1024)throw Error('Text and web pages must be under 2 MB. PDF link imports support up to 20 MB.');
 if(bytes[0]===0x50&&bytes[1]===0x4b)throw Error('EPUB and DOCX link imports are not supported yet.');
 if((mime&&!['text/plain','text/markdown','text/x-markdown','text/html','application/xhtml+xml','application/octet-stream'].includes(mime))||/\.(epub|docx|zip|jpg|png|exe)$/i.test(new URL(url).pathname))throw Error('This link is not a supported PDF, TXT, Markdown, or HTML article.');
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('The source is not UTF-8 text or a supported PDF.');}if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text))throw Error('The downloaded file contains binary data.');
 const html=['text/html','application/xhtml+xml'].includes(mime)||/^\s*(?:<!doctype\s+html|<html|<head|<body)/i.test(text);let title=filename.replace(/\.(txt|md)$/i,'');
 if(html){
  if((text.match(/</g)||[]).length>50000)throw Error('This web page is too complex. Download the article text or PDF instead.');
  const {document}=parseHTML(text);title=(document.querySelector('title')?.textContent||document.querySelector('h1')?.textContent||title).trim();
  for(const node of document.querySelectorAll('script,style,noscript,nav,header,footer,aside,form,iframe,object,embed,template,svg,math,button,input,select,textarea'))node.remove();
  const root=document.querySelector('article')||document.querySelector('main')||document.body;
  if(!root)throw Error('No readable article was found at this URL.');for(const br of root.querySelectorAll('br'))br.replaceWith('\n');for(const block of root.querySelectorAll('p,div,section,li,h1,h2,h3,h4,h5,blockquote,pre,tr'))block.append('\n');text=root.textContent;
 }
 text=text.replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();if(!text||text.length>1000000)throw Error('The source has no readable text or exceeds the article length limit.');
 return {kind:'text',mime:html?'text/html':mime==='text/markdown'||/\.md$/i.test(filename)?'text/markdown':'text/plain',filename,title:title.replace(/\s+/g,' ').slice(0,200)||'Imported article',text};
}
