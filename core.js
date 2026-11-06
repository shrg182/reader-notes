import {validateRichState} from './rich-model.js';
export const MAX_TEXT = 1_000_000;
export function validateBook(value) {
  if (!value || typeof value !== 'object' ||
      typeof value.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id) ||
      typeof value.title !== 'string' || !value.title.trim() || value.title.length > 200 ||
      typeof value.language !== 'string' || value.language.length > 40 ||
      typeof value.content !== 'string' || value.content.length > MAX_TEXT ||
      typeof value.notes !== 'string' || value.notes.length > MAX_TEXT ||
      typeof value.deleted !== 'boolean') throw new Error('Invalid article record.');
  const rich=value.richState??value.rich_state;
  if(rich!==undefined&&rich!==null)validateRichState(rich);
  return {id:value.id, title:value.title, language:value.language,
    content:value.content, notes:value.notes, deleted:value.deleted,...(value.richState!==undefined||value.rich_state!==undefined?{richState:rich??null}:{})};
}
export function validateBackup(data) {
  if (!data || !['reader-notes','reader-studio'].includes(data.format) || data.version !== 1 ||
      !Array.isArray(data.books) || data.books.length > 5000) throw new Error('Unsupported backup format.');
  const books = data.books.map(validateBook);
  if (new Set(books.map(b=>b.id)).size !== books.length) throw new Error('Backup contains duplicate article IDs.');
  return books;
}
export function sameEdition(a,b) {
  return ['title','language','content','notes','deleted'].every(k=>a[k]===b[k])&&(a.richState??a.rich_state??null)===(b.richState??b.rich_state??null);
}
export function makeBackup(books) {
  return {format:'reader-notes',version:1,exportedAt:new Date().toISOString(),
    books:books.map(b=>({...validateBook(b)}))};
}
export function mergeRemote(local, remote) {
  if (!local) return {...validateBook(remote),revision:remote.revision,dirty:false,history:[],updatedAt:remote.updated_at};
  if (local.dirty && remote.revision !== local.revision) {
    return {...local,conflict:remote};
  }
  if (local.dirty) return local;
  return {...local,...validateBook(remote),revision:remote.revision,dirty:false,conflict:null,updatedAt:remote.updated_at};
}
