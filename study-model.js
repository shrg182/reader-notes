import {encodeRichState} from './rich-model.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const studySupported=url=>{try{return /(^|\.)5000yan\.com$/.test(new URL(url).hostname)&&/^https?:$/.test(new URL(url).protocol);}catch{return false;}};
export function studyProtected(book,baseline){let state;try{state=JSON.parse(book.richState||'null')?.state;}catch{return true;}return Boolean(state?.studySource||state?.footnotes?.length||state?.terms?.length||/<(?:ruby|mark|strong|b|em|i|u|s)\b|class="[^"]*(?:notation|doubt|comment-block|interlinear-note)/i.test(state?.bodyHTML||'')||book.content.replace(/\s/g,'')!==baseline.replace(/\s/g,''));}
export function studyEdition(book,result){
 const study=result.study;if(study?.format!=='reader-study-source-v1'||!Array.isArray(study.paragraphs)||!Array.isArray(study.notes)||typeof study.original!=='string'||!studySupported(study.url))throw Error('Invalid structured source.');
 let previous={};if(book.richState)previous=JSON.parse(book.richState).state;
 const notes=study.notes.filter(n=>n.linked).sort((a,b)=>a.start-b.start),footnotes=[],terms=[];let cursor=0,html='';
 for(const note of notes){if(note.start<cursor||study.original.slice(note.start,note.end)!==note.term)throw Error('Invalid source annotation position.');const id='source-'+footnotes.length;html+=esc(study.original.slice(cursor,note.start));let word=esc(note.term);if(note.pinyin)word='<ruby>'+word+'<rt>'+esc(note.pinyin)+'</rt></ruby>';html+='<span class="notation'+(note.issues.length?' doubt':'')+'" data-term="'+esc(note.term)+'" data-note="'+esc(note.annotation)+'"'+(note.issues.length?' data-issue="'+esc(note.issues.join('；'))+'"':'')+'>'+word+'</span><sup class="footnote-ref" data-note-id="'+id+'" contenteditable="false">〔'+(footnotes.length+1)+'〕</sup>';footnotes.push({id,note:'【来源注释】'+note.term+'：'+note.annotation});terms.push({term:note.term,pinyin:note.pinyin||'',annotation:note.annotation,type:'source_note'});cursor=note.end;}
 html+=esc(study.original.slice(cursor));html='<p>'+html.replaceAll('\n\n','</p><p>').replaceAll('\n','<br>')+'</p>';
 const state={...previous,version:4,bodyHTML:html,terms,footnotes,notes:previous.notes||[],log:[...(previous.log||[]),{time:new Date().toISOString(),action:'整理为校读稿',detail:'来源原文、译文与注释分层；无 AI 生成内容'}],media:previous.media||[],preferences:previous.preferences||{},sourceUrl:study.url,studySource:{...study,sha256:result.sha256,retrievedAt:result.retrievedAt}};
 return {content:study.original,richState:encodeRichState(state)};
}
