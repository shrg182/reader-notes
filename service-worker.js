const CACHE='reader-notes-shell-0.7.1';
const FILES=['./', 'index.html', 'styles.css', 'app.js', 'core.js', 'cloud.js', 'storage.js', 'config.js', 'toolbar.js', 'toolbar-model.js', 'sharing-model.js', 'sharing-ui.js', 'migration-model.js', 'migration-ui.js', 'migration-library.js', 'migration-complete-ui.js', 'library-taxonomy.js', 'library-groups.js', 'rich-model.js', 'rich-editor.js', 'manifest.webmanifest', 'reader-icon.svg', 'studio/theme.css', 'studio/editor.css', 'studio/bridge.js', 'studio/editor.html', 'studio/host.css', 'studio/editor.js', 'studio/workspace.js', 'studio/history.js'];
const allowed=new Set(FILES.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('reader-notes-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Static app assets only: never cache Supabase, account requests or reading data.
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!allowed.has(e.request.url))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request)));});
