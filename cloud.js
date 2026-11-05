import {getSetting,setSetting} from './storage.js';
export class Cloud {
  constructor(config) {
    this.config=config||{};
    this.url=(config?.supabaseUrl||'').replace(/\/$/,'');
    this.key=config?.supabaseKey||'';
    this.appUrl=config?.appUrl||location.origin+location.pathname;
    this.sharingReady=this.configured&&config?.sharingEnabled===true;
    this.session=null;
    this.refreshing=null;
  }
  get configured(){return Boolean(this.url && this.key);}
  async request(path,{method='GET',body,token,auth=false}={}) {
    const response=await fetch(this.url+path,{method,signal:AbortSignal.timeout(15000),
      headers:{apikey:this.key,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
      ...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const error=new Error(data.msg||data.message||data.error_description||data.error||`Request failed (${response.status}).`);
      error.status=response.status;error.auth=auth;throw error;
    }
    return data;
  }
  async remember(session) {
    const next={...session,projectUrl:this.url,expires_at:session.expires_at||Math.floor(Date.now()/1000)+(session.expires_in||3600)};
    await setSetting('session',next);this.session=next;return next;
  }
  async restore() {
    const saved=await getSetting('session');
    this.session=saved?.projectUrl===this.url?saved:null;
    return this.session;
  }
  async token() {
    if(!this.session)throw new Error('Sign in to synchronize.');
    if(this.session.expires_at*1000>Date.now()+60_000)return this.session.access_token;
    if(!this.refreshing)this.refreshing=this.request('/auth/v1/token?grant_type=refresh_token',{
      method:'POST',body:{refresh_token:this.session.refresh_token},auth:true
    }).then(s=>this.remember(s)).catch(async e=>{
      // Retain the local queue and account identity even if renewed sign-in is needed.
      if([400,401,403].includes(e.status))throw new Error('Your session expired. Sign in again to sync; your device drafts are retained.');
      throw e;
    }).finally(()=>{this.refreshing=null;});
    return (await this.refreshing).access_token;
  }
  async signIn(email,password) {
    const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},auth:true});
    return this.remember(data);
  }
  async signUp(email,password) {return this.request(`/auth/v1/signup?redirect_to=${encodeURIComponent(this.appUrl)}`,{method:'POST',body:{email,password},auth:true});}
  async recover(email) {
    return this.request(`/auth/v1/recover?redirect_to=${encodeURIComponent(this.appUrl)}`,{method:'POST',body:{email},auth:true});
  }
  async acceptAuthReturn(hash) {
    const p=new URLSearchParams(hash.replace(/^#/,''));
    if(p.get('error')||p.get('error_description'))throw new Error(p.get('error_description')||'This account link is invalid or expired. Request a new link.');
    if(!['recovery','signup'].includes(p.get('type'))||!p.get('access_token'))return false;
    if(!p.get('refresh_token'))throw new Error('This account link is incomplete. Request a new link.');
    const user=await this.request('/auth/v1/user',{token:p.get('access_token'),auth:true});
    await this.remember({access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),
      expires_in:Number(p.get('expires_in'))||3600,user});
    return p.get('type');
  }
  async updatePassword(password) {return this.request('/auth/v1/user',{method:'PUT',token:await this.token(),body:{password},auth:true});}
  async signOut() {
    // Local sign-out does not displace another device's session.
    try{await this.request('/auth/v1/logout?scope=local',{method:'POST',token:await this.token(),auth:true});}
    catch{} // Clearing this device must remain possible offline.
    await setSetting('session',null);this.session=null;
  }
  async list(){
    const token=await this.token(),all=[];
    for(let offset=0;;offset+=1000){
      const page=await this.request(`/rest/v1/reader_documents?select=*&order=id.asc&limit=1000&offset=${offset}`,{token});
      if(!Array.isArray(page))throw new Error('Cloud returned an invalid library.');
      all.push(...page);if(page.length<1000)return all;
    }
  }
  async save(book) {
    return this.request('/rest/v1/rpc/save_reader_document',{method:'POST',token:await this.token(),body:{
      p_id:book.id,p_title:book.title,p_language:book.language,p_content:book.content,
      p_notes:book.notes,p_deleted:book.deleted,p_revision:book.revision
    }});
  }
  async sharingRead(path){
    if(!this.sharingReady)throw new Error('Sharing is not configured yet. Private drafts remain on this device.');
    return this.request('/rest/v1/'+path,{token:this.session?await this.token():undefined});
  }
  async sharingRpc(name,body){
    if(!this.sharingReady)throw new Error('Sharing is not configured yet.');
    return this.request('/rest/v1/rpc/'+name,{method:'POST',body,token:await this.token()});
  }
  async importIndex(){
    const all=[];for(let offset=0;;offset+=1000){const page=await this.sharingRead(`reader_import_index?select=*&order=id.asc&limit=1000&offset=${offset}`);all.push(...page.map(r=>({...r,bookId:r.book_id,sourcePath:r.source_path||'',sourceKey:r.source_key||''})));if(page.length<1000)return all;}
  }
  async importPayload(id){
    const row=(await this.sharingRead(`reader_import_records?select=*&id=eq.${encodeURIComponent(id)}`))[0]||null;
    if(row?.payload?.encoding==='json-text-v1')row.payload=JSON.parse(row.payload.data);
    return row;
  }
  async importRecord(record){
    // Studio dictionary keys contain NUL separators, which PostgreSQL jsonb
    // cannot represent directly. A JSON text envelope preserves them exactly.
    return this.sharingRpc('reader_import_record',{p_record:{...record,payload:{encoding:'json-text-v1',data:JSON.stringify(record.payload)}}});
  }
  async sharedSources(offset=0){return this.sharingRead(`reader_publications?select=*&visibility=neq.private&order=updated_at.desc&limit=50&offset=${offset}`);}
  async sourceById(id){return (await this.sharingRead(`reader_publications?select=*&id=eq.${encodeURIComponent(id)}`))[0]||null;}
  async ownPublication(id){return (await this.sharingRead(`reader_publications?select=*&document_id=eq.${encodeURIComponent(id)}&owner_id=eq.${this.session.user.id}`))[0]||null;}
  async sharedContributions(id){return this.sharingRead(`reader_shared_contributions?select=*&source_id=eq.${encodeURIComponent(id)}&visibility=neq.private&order=updated_at.desc&limit=1000`);}
  async myContributions(){
    const all=[];
    for(let offset=0;;offset+=1000){const page=await this.sharingRead(`reader_contribution_drafts?select=*&order=id.asc&limit=1000&offset=${offset}`);all.push(...page);if(page.length<1000)return all;}
  }
  async groups(){return this.sharingRead('reader_groups?select=*&order=created_at.desc');}
  async groupMembers(){return this.sharingRead('reader_group_members?select=*');}
  async saveContribution(draft){return this.sharingRpc('reader_save_contribution',{
    p_id:draft.id,p_source:draft.sourceId,p_kind:draft.kind,p_body:draft.body,p_quote:draft.quote,p_start:draft.anchorStart,p_end:draft.anchorEnd,
    p_source_revision:draft.sourceRevision,p_visibility:draft.visibility,p_groups:draft.groupIds,p_revision:draft.cloudRevision||0
  });}
}
