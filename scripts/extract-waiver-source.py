"""Preserve Word run formatting for the web agreement and PDF renderer."""
from pathlib import Path
import zipfile, xml.etree.ElementTree as E, json, html
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile('assets/Golf Cart and Other Equipment Waiver.docx') as z:
 root=E.fromstring(z.read('word/document.xml'))
def val(r,k):
 e=r.find('w:rPr/w:'+k,ns)
 return None if e is None else e.get('{'+ns['w']+'}val','true')
paragraphs=[]
for p in root.findall('.//w:body/w:p',ns):
 runs=[]
 for r in p.findall('.//w:r',ns):
  t=''.join(x.text or '' for x in r.findall('w:t',ns))
  if t:runs.append(dict(text=t,bold=val(r,'b') not in [None,'false','0'],italic=val(r,'i') not in [None,'false','0'],underline=val(r,'u') not in [None,'none','false','0'],color=val(r,'color') or '333333',highlight=val(r,'highlight')=='yellow'))
 text=''.join(r['text'] for r in runs).strip()
 if text:paragraphs.append(dict(text=text,runs=runs))
end=next(i for i,p in enumerate(paragraphs) if p['text']=='SIGNATURE & GUEST INFORMATION')
items=[]
for i,p in enumerate(paragraphs[1:end],1):
 if p['text'].startswith('INITIAL'):continue
 p['kind']='term' if i+1<len(paragraphs) and paragraphs[i+1]['text'].startswith('INITIAL') else 'heading' if p['text'] in ['GOLF CART TERMS','BBQ GRILL, KITCHEN APPLIANCES & EQUIPMENT TERMS','GENERAL RESPONSIBILITY & ACCEPTANCE'] else 'paragraph'
 items.append(p)
Path('src/content/waiver.json').write_text(json.dumps(items,indent=2)+'\n')
p=Path('index.html');s=p.read_text()
for item in items:
 old=html.escape(item['text'])
 if old not in s:continue
 spans=[]
 for r in item['runs']:
  styles=[f"color:#{r['color']}"]
  if r['bold']:styles.append('font-weight:bold')
  if r['italic']:styles.append('font-style:italic')
  if r['underline']:styles.append('text-decoration:underline')
  if r['highlight']:styles.append('background-color:#ffff00')
  spans.append('<span style="'+';'.join(styles)+'">'+html.escape(r['text'])+'</span>')
 s=s.replace(old,''.join(spans),1)
p.write_text(s)
print('Extracted',len(items),'paragraphs; styled runs:',sum(r['underline'] or r['highlight'] or r['color']=='FF0000' for p in items for r in p['runs']))
