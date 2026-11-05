// Shared block catalog. Format adapters expose capabilities, not separate toolbars.
export const BLOCKS = [
  {id:'navigate',label:'Navigate'}, {id:'view',label:'View'},
  {id:'layout',label:'Panes & layout'}, {id:'dictionary',label:'Dictionary & vocabulary'},
  {id:'speech',label:'Read aloud'}, {id:'contributions',label:'Contributions'}, {id:'files',label:'Files & recovery'}
];
export const ADAPTERS = {
  article:{label:'Editable article',textSelection:true,textView:true,speech:true},
  pdf:{label:'Original PDF',textSelection:false,textView:false,speech:false}
};
export const PROVIDERS = {
  wiktionary:{label:'Wiktionary',url:word=>`https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`},
  cambridge:{label:'Cambridge English',url:word=>`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`}
};
export function preset(name='reading') {
  const expanded={reading:['navigate','files'],study:['dictionary','files'],editing:['view','layout','files']}[name]||['navigate','files'];
  return Object.fromEntries(BLOCKS.map(b=>[b.id,{visible:true,expanded:expanded.includes(b.id),pinned:b.id==='files'}]));
}
export function effectivePreferences(profile={},format='article',bookId='') {
  const source=profile.books?.[`${bookId}:${format}`]||profile.formats?.[format]||profile.defaults;
  const base=preset();
  for(const {id} of BLOCKS)for(const key of ['visible','expanded','pinned']){
    if(typeof source?.[id]?.[key]==='boolean')base[id][key]=source[id][key];
  }
  return base;
}
export function validateStudy(data,bookIds) {
  if(data===undefined)return [];
  if(!data||data.version!==1||!Array.isArray(data.vocabulary)||data.vocabulary.length>20000)throw new Error('Invalid vocabulary backup.');
  const ids=new Set();
  return data.vocabulary.map(value=>{
    if(!value||typeof value.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)||ids.has(value.id)||!bookIds.includes(value.bookId))throw new Error('Invalid vocabulary source or ID.');
    ids.add(value.id);
    const next={id:value.id,bookId:value.bookId};
    for(const [key,max] of [['word',200],['definition',5000],['context',5000],['language',40],['note',5000]]){
      if(typeof value[key]!=='string'||value[key].length>max)throw new Error('Invalid vocabulary text.');
      next[key]=value[key];
    }
    if(!next.word.trim())throw new Error('Vocabulary word is empty.');
    return next;
  });
}
