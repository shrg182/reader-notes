// Reproduce the checked-in browser assets after npm ci.
import {mkdir,copyFile,cp,readFile,writeFile,unlink} from 'node:fs/promises';
const root=new URL('../',import.meta.url),file=p=>new URL(p,root);
await mkdir(file('vendor/pdfjs/'),{recursive:true});
const compatPrelude=await readFile(new URL('./pdf_compat_prelude.js',import.meta.url),'utf8');
for(const [from,to] of [
 ['pdfjs-dist/legacy/build/pdf.min.mjs','pdfjs/pdf.compat.mjs'],['pdfjs-dist/legacy/build/pdf.worker.min.mjs','pdfjs/pdf.worker.compat.mjs'],
 ['pdfjs-dist/LICENSE','pdfjs/LICENSE'],['tus-js-client/dist/tus.min.js','tus.min.js'],['tus-js-client/LICENSE','tus.LICENSE']
]){if(to.endsWith('.compat.mjs'))await writeFile(file('vendor/'+to),compatPrelude+'\n'+await readFile(file('node_modules/'+from),'utf8'));else await copyFile(file('node_modules/'+from),file('vendor/'+to));}
for(const dir of ['cmaps','standard_fonts','wasm'])await cp(file('node_modules/pdfjs-dist/'+dir),file('vendor/pdfjs/'+dir),{recursive:true});
const css=await readFile(file('node_modules/pdfjs-dist/web/pdf_viewer.css'),'utf8');
await writeFile(file('vendor/pdfjs/text-layer.css'),'/* PDF.js text layer. Apache-2.0; see LICENSE. */\n'+css.slice(css.indexOf('.textLayer {'),css.indexOf('\n.textLayerImages')));

for(const name of ['pdf.mjs','pdf.worker.mjs'])await unlink(file('vendor/pdfjs/'+name)).catch(error=>{if(error.code!=='ENOENT')throw error;});
