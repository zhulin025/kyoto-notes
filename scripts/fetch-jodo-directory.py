"""Fetch factual name/address listings from Jodo-shu's public Kyoto directory.
Coordinates are NOT inferred from Google embed viewport centers.
"""
from pathlib import Path
import concurrent.futures,json,subprocess,re
from bs4 import BeautifulSoup
base=Path('artifacts/atlas/jodo');base.mkdir(parents=True,exist_ok=True)
def one(i):
 url='https://otera.jodo.or.jp/temple/kyoto/ka/kyotosi/'+(f'page/{i}/' if i>1 else '')
 p=base/f'{i}.html'
 try:
  if not p.exists():p.write_bytes(subprocess.check_output(['curl','-fLsS','--max-time','20',url]))
  s=BeautifulSoup(p.read_text(),'html.parser');out=[]
  for a in s.select('a[href]'):
   href=a['href'];name=a.get_text(' ',strip=True)
   if not re.search(r'/temple/29-\d+',href) or not name:continue
   parent=a.parent.parent
   text=parent.get_text(' ',strip=True)
   td=parent.select_one('td')
   address=td.get_text(' ',strip=True) if td else ''
   out.append({'name':name,'source':href,'address':address,'page':url})
  return out
 except Exception as e:raise RuntimeError(f'Directory page {i} failed; leaving existing output intact') from e
all=[]
for result in concurrent.futures.ThreadPoolExecutor(max_workers=3).map(one,range(1,50)):all.extend(result)
all=list({p['source']:p for p in all}.values());Path('artifacts/atlas/jodo-directory.json').write_text(json.dumps(all,ensure_ascii=False,indent=2));print('Directory records',len(all))
