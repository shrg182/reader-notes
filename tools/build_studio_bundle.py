"""Build a private, lossless migration package. Never writes into the source tree."""
import argparse, base64, hashlib, json, re
from html.parser import HTMLParser
from pathlib import Path

class Editor(HTMLParser):
    def __init__(self, raw):
        super().__init__(convert_charrefs=False); self.raw=raw; self.lines=raw.splitlines(True); self.depth=0; self.start=None; self.result=None
    def source_offset(self):
        line,col=self.getpos(); return sum(map(len,self.lines[:line-1]))+col
    def handle_starttag(self,tag,attrs):
        if self.depth: self.depth+=tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
        elif dict(attrs).get('id')=='editor': self.depth=1; self.start=self.source_offset()+len(self.get_starttag_text())
    def handle_startendtag(self,tag,attrs):
        pass
    def handle_endtag(self,tag):
        if self.depth:
            self.depth-=1
            if not self.depth: self.result=self.raw[self.start:self.source_offset()]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--studio',type=Path,required=True);parser.add_argument('--archive',type=Path,action='append',default=[]);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    root=args.studio.resolve();raw=(root/'reading-review-catalog.js').read_text();catalog=json.loads(raw[raw.index('=')+1:].strip().rstrip(';'));sources=[];errors=[]
    for entry in catalog:
        p=(root/entry['path']).resolve()
        if not p.is_relative_to(root) or not p.is_file():errors.append(entry['path']);continue
        raw=p.read_bytes().decode('utf-8'); editor=Editor(raw);editor.feed(raw)
        if editor.result is None: errors.append(entry['path']);continue
        match=re.search(r'const TERMS\s*=\s*',raw);terms=json.JSONDecoder().raw_decode(raw[match.end():])[0] if match else []
        sources.append({**entry,'html':editor.result,'terms':terms,'original':raw,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    if errors: raise SystemExit('Source extraction failed: '+json.dumps(errors,ensure_ascii=False))
    dictionaries=[]
    for name in ['dictionary.csv','sources.csv']:
        p=root.parent/'project_dictionary'/name
        if p.exists():dictionaries.append({'name':name,'text':p.read_bytes().decode('utf-8'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    archives=[{'name':p.name,'text':p.read_bytes().decode('utf-8'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in args.archive]
    result={'format':'reader-notes-studio-bundle','version':1,'catalog':catalog,'sources':sources,'archives':archives,'dictionaries':dictionaries}
    args.output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')));args.output.chmod(0o600)
    print(json.dumps({'sources':len(sources),'archives':len(archives),'dictionaries':len(dictionaries),'bytes':args.output.stat().st_size,'output':str(args.output)}))
if __name__=='__main__':main()
