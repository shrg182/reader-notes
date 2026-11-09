import {makeHandler} from '../supabase/functions/reader-import-link/handler.mjs';
globalThis.Buffer=undefined;
const req=new Request('https://function.example/',{method:'POST',headers:{Authorization:'Bearer user'},body:JSON.stringify({url:'https://example.com/test.txt',category:'personal',categoryTitle:'Reading',tags:[]})});
const handler=makeHandler({projectUrl:'https://project.supabase.co',publicKey:'public',lookup:async()=>[],request:async()=>{throw Error('Must not fetch');},fetcher:async()=>Response.json({message:'Invalid session'},{status:401})});
const response=await handler(req);if(response.status!==401||!(await response.json()).error.includes('Sign in again'))throw Error('Runtime validation failed');console.log('PASS no global Buffer');
