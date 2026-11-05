export const CONTRIBUTION_TYPES={pinyin:'Pinyin / pronunciation',inline:'Inline note',annotation:'Annotation',footnote:'Footnote',note:'Reading note',highlight:'Highlight explanation',revision:'Revised edition'};
export const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function audience(visibility='private',groupIds=[]){
  if(!['private','group','public'].includes(visibility)||!Array.isArray(groupIds)||groupIds.length>20||groupIds.some(id=>!uuid(id)))throw new Error('Invalid audience.');
  const groups=[...new Set(groupIds)].sort();
  if((visibility==='group')!==(groups.length>0))throw new Error('Select at least one group, or choose Private/Public.');
  return {visibility,groupIds:groups};
}
export function audienceWithinSource(choice,source){
  if(choice.visibility==='private')return true;
  if(!source||source.visibility==='private')return false;
  return source.visibility==='public'||(choice.visibility==='group'&&choice.groupIds.every(id=>source.group_ids.includes(id)));
}
export function validateContribution(value){
  if(!value||!uuid(value.id)||!Object.hasOwn(CONTRIBUTION_TYPES,value.kind)||typeof value.body!=='string'||!value.body.trim()||value.body.length>1000000||typeof value.quote!=='string'||value.quote.length>5000)throw new Error('Invalid contribution text or type.');
  if(value.sourceId!==null&&!uuid(value.sourceId))throw new Error('Invalid source reference.');
  if(value.localBookId!==null&&!uuid(value.localBookId))throw new Error('Invalid local book reference.');
  if(!value.sourceId&&!value.localBookId)throw new Error('A source is required.');
  if(value.anchorStart!==null||value.anchorEnd!==null){if(!Number.isSafeInteger(value.anchorStart)||!Number.isSafeInteger(value.anchorEnd)||value.anchorStart<0||value.anchorEnd<value.anchorStart)throw new Error('Invalid passage anchor.');}
  if(value.originId!==undefined&&!uuid(value.originId))throw new Error('Invalid contribution provenance.');
  const choice=audience(value.visibility,value.groupIds);
  return {id:value.id,kind:value.kind,body:value.body,quote:value.quote,sourceId:value.sourceId,localBookId:value.localBookId,
    anchorStart:value.anchorStart,anchorEnd:value.anchorEnd,sourceRevision:Number.isSafeInteger(value.sourceRevision)&&value.sourceRevision>=0?value.sourceRevision:0,
    sourceHash:typeof value.sourceHash==='string'?value.sourceHash:'',...choice,...(value.originId?{originId:value.originId}:{})};
}
export function validateSharingBackup(data,bookIds){
  if(data===undefined)return [];
  if(!data||data.version!==1||!Array.isArray(data.contributions)||data.contributions.length>20000)throw new Error('Unsupported contributions backup.');
  const seen=new Set();
  return data.contributions.map(value=>{
    const draft=validateContribution(value);
    if(seen.has(draft.id)||draft.localBookId&&!bookIds.includes(draft.localBookId))throw new Error('Duplicate contribution or missing source book.');
    seen.add(draft.id);return draft;
  });
}
export function codePointSelection(content,start,end){
  // Textareas normalize CRLF/CR to LF, whereas stored source text may retain it.
  const originalOffset=offset=>{let raw=0,displayed=0;while(raw<content.length&&displayed<offset){if(content[raw]==='\r'&&content[raw+1]==='\n')raw+=2;else raw++;displayed++;}return raw;};
  const rawStart=originalOffset(start),rawEnd=originalOffset(end);
  return {quote:content.slice(rawStart,rawEnd),anchorStart:[...content.slice(0,rawStart)].length,anchorEnd:[...content.slice(0,rawEnd)].length};
}
export function anchorMatches(draft,source){
  if(!draft.quote)return true;
  if(draft.anchorStart===null||draft.anchorEnd===null)return false;
  return [...source.content].slice(draft.anchorStart,draft.anchorEnd).join('')===draft.quote;
}
export function publicContent(book){return {title:book.title,language:book.language,content:book.content};}
export function fromCloudDraft(row,previous={}){
  return {...previous,id:row.id,sourceId:row.source_id,localBookId:previous.localBookId??null,kind:row.kind,body:row.body,quote:row.quote,
    anchorStart:row.anchor_start,anchorEnd:row.anchor_end,sourceRevision:row.source_revision,sourceHash:previous.sourceHash||'',visibility:row.requested_visibility,groupIds:row.group_ids,cloudRevision:row.revision,dirty:false,conflict:null};
}
