import {build} from 'esbuild';
await build({entryPoints:['supabase/functions/reader-import-link/index.ts'],bundle:true,platform:'node',target:'es2022',format:'esm',outfile:'supabase/functions/reader-import-link.bundle.ts',minifyWhitespace:true,legalComments:'inline'});
