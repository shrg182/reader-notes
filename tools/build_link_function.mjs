import {readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
await build({entryPoints:['supabase/functions/reader-import-link/index.ts'],bundle:true,platform:'node',target:'es2022',format:'esm',outfile:'supabase/functions/reader-import-link.bundle.ts',minifyWhitespace:true,legalComments:'inline'});

// Dashboard file-copy deployment must not depend on a browser's .txt charset guess.
const file='supabase/functions/reader-import-link.bundle.ts';
await writeFile(file,(await readFile(file,'utf8')).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0')));
