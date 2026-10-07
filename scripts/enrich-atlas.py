"""Fetch missing Wikidata facts for the cached OSM source objects. No API key."""
from pathlib import Path
import json, subprocess, urllib.parse, hashlib, time
BASE=Path('artifacts/atlas');CACHE=BASE/'wikidata';CACHE.mkdir(exist_ok=True)
def read(file):
 p=BASE/file
 return json.loads(p.read_text()) if p.exists() else {}
def enrich(ids,existing):
 missing=sorted(set(ids)-set(existing))
 for start in range(0,len(missing),35):
  batch=missing[start:start+35]
  cache=CACHE/(hashlib.sha256('|'.join(batch).encode()).hexdigest()[:16]+'.json')
  for attempt in range(3):
   try:
    if cache.exists():data=json.loads(cache.read_text())
    else:
     url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(batch),'props':'labels|claims','languages':'zh|zh-hans|ja|en','format':'json'})
     data=json.loads(subprocess.check_output(['curl','-fLsS','--max-time','30','-A','KyotoNotes/1.1',url]));cache.write_text(json.dumps(data,ensure_ascii=False))
    existing.update(data.get('entities',{}));break
   except Exception as err:
    print('Wikidata retry',attempt+1,str(err)[:100],flush=True);time.sleep(2+attempt*3)
  time.sleep(.8)
 return existing
raw=[]
for file in ['osm-test.json','buildings.json','landuse.json','fushimi.json']:
 raw+=read(file).get('elements',[])
ids={e.get('tags',{}).get('wikidata','') for e in raw};ids={q for q in ids if q.startswith('Q') and q[1:].isdigit()}
entities=enrich(ids,read('entities.json'));(BASE/'entities.json').write_text(json.dumps(entities,ensure_ascii=False));print('entities',len(entities),flush=True)
related=set()
for e in entities.values():
 for prop in ['P140','P1435','P31']:
  for c in e.get('claims',{}).get(prop,[]):
   v=c.get('mainsnak',{}).get('datavalue',{}).get('value',{})
   if isinstance(v,dict) and 'id'in v:related.add(v['id'])
labels=enrich(related,read('related.json'));(BASE/'related.json').write_text(json.dumps(labels,ensure_ascii=False));print('related',len(labels),flush=True)
