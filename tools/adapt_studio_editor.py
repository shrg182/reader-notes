"""Extract trusted reusable editor code, excluding all original reading contents."""
from pathlib import Path
import re
root=Path('/Users/ruixingshi/Python/automate_study_practices/practice')
source=(root/'rongzhai_suibi/volume_01/001_ou_lvgeng_tie/editor.html').read_text()
out=Path('studio')
styles='\n'.join(re.findall(r'<style[^>]*>([\s\S]*?)</style>',source))
(out/'editor.css').write_text(styles)
body=source[source.index('<body'):source.rindex('<script>')]
body=re.sub(r'<section id="editor"[\s\S]*?</section>','<section id="editor" class="editor" contenteditable="true" spellcheck="false" aria-label="正文编辑区"></section>',body,count=1)
body=re.sub(r'<h1>[\s\S]*?</h1>','<h1 id="studio-title">Reader Notes</h1>',body,count=1)
body=re.sub(r'<div class="brand">[\s\S]*?</div>','<div class="brand">Reader Notes · 校读编辑器</div>',body,count=1)
body=body.replace('所有自动保存只进入当前浏览器的本地存储。','自动保存到当前账户的工作副本；云端同步由 Reader Notes 管理。')
body=body.replace('保存到浏览器','保存并同步')
body=re.sub(r'href="[^\"]*project_dictionary/[^\"]*"','href="#dictionary"',body)
body=re.sub(r'href="(?:\.\./)+index.html"','href="#library"',body)
runtime=source[source.rindex('<script>')+len('<script>'):source.rindex('</script>')]
lines=runtime.splitlines();lines=[x for x in lines if not x.startswith('const TERMS=')]
runtime='\n'.join(lines)
runtime="""const TERMS=structuredClone(window.ReaderSeed.terms||[]), GLOBAL_TERMS=structuredClone(window.ReaderSeed.globalTerms||[]),SOURCE_URL=window.ReaderSeed.sourceUrl||'';
const INITIAL_FOOTNOTES=structuredClone(window.ReaderSeed.footnotes||[]),INITIAL_READING_NOTES=[],INITIAL_MEDIA=[];
const STORAGE_KEY='reader-rich-document',LOG_KEY=STORAGE_KEY+'-log-v1',NOTES_KEY=STORAGE_KEY+'-notes-v1',PROJECT_DICTIONARY_OVERRIDES_KEY='reading-lexicon-entry-overrides-v1';
editorInit();function editorInit(){document.getElementById('editor').innerHTML=window.ReaderSeed.bodyHTML||'<p><br></p>';document.getElementById('studio-title').textContent=window.ReaderSeed.title||'Reader Notes';}
"""+runtime
# Attachments live in this isolated frame until the parent atomically persists
# their data URLs with the rich state. No shared browser database or origin access.
a=runtime.index('function openMediaDb(');b=runtime.index('function mediaIds(',a)
runtime=runtime[:a]+"""async function loadMediaRecords(){renderAnnotationRegisters();renderNotes();renderDraftMedia();renderInlineMedia()}
async function putMedia(record){mediaRecords.set(record.id,record)}
async function deleteMedia(id){mediaRecords.delete(id)}
"""+runtime[b:]
runtime=runtime.replace("const response=await fetch(item.dataUrl),blob=await response.blob();", "const match=String(item.dataUrl).match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);if(!match||!['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'].includes(match[1]))throw Error('Unsupported attachment');const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:match[1]});")

runtime=runtime.replace("function saveLocal(auto=false){", "function saveLocal(auto=false){window.ReaderBridge.markDirty();")
runtime=runtime.replace("function changed(){", "function changed(){window.ReaderBridge.markDirty();")
runtime=runtime.replace("'ou_lvgeng_tie_", "'reader-notes_")
(out/'editor.js').write_text(runtime)
skin=(root/'workspace_skin.js').read_text()
skin=re.sub(r'  const reviewScript = document.createElement\("script"\);[\s\S]*?  document.head.append\(reviewScript\);','',skin,count=1)
skin=skin.replace('new URL("./", location.href);','new URL("./", window.ReaderAssetsBase || location.href);')
skin=skin.replace('  installPwaAssets();','  // Installation is managed by the host app.')
skin=skin.replace('installContextNavigation(); installHomeMark();','')
(out/'workspace.js').write_text(skin)
history=(root/'editor_history.js').read_text().replace("document.addEventListener('DOMContentLoaded', () => {","(() => {")
history=history.rsplit('});',1)[0]+'})();\n'
(out/'history.js').write_text(history)
(out/'theme.css').write_text((root/'workspace_theme.css').read_text())
head='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src 'self'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"><title>Reader Notes · Study Studio editor</title><link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="editor.css"><link rel="stylesheet" href="host.css"></head>'''
(out/'editor.html').write_text(head+body+'<script src="bridge.js"></script></body></html>')
print('Extracted trusted editor, workspace styling, commands and history. No source article state included.')
