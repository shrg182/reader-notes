import {makeHandler} from './handler.mjs';
import {lookupAll,pinnedRequest} from './transport.mjs';
const projectUrl=Deno.env.get('SUPABASE_URL')||'';
if(projectUrl!=='https://zkffujfbzbxoexohcmwk.supabase.co')throw Error('This function is restricted to the Reader Notes project.');
Deno.serve(makeHandler({projectUrl,publicKey:Deno.env.get('SUPABASE_ANON_KEY')||'',lookup:lookupAll,request:pinnedRequest}));
