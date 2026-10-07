"""Refresh OSM source snapshots; existing snapshots are reused. Not run on build.
Remove a selected artifacts/atlas/*.json file to refresh it. Never replaces a
valid cache with a failed request. See ATLAS_DATA.md for scope and limitations.
"""
from pathlib import Path
import subprocess, json
BASE=Path('artifacts/atlas');BASE.mkdir(parents=True,exist_ok=True)
area='area["boundary"="administrative"]["name:en"="Kyoto"]["admin_level"="7"]->.a;'
queries={
'osm-test':area+'nwr(area.a)["amenity"="place_of_worship"]["religion"~"^(buddhist|shinto)$"];out center tags;',
'wards':area+'rel(area.a)["boundary"="administrative"]["admin_level"="8"];out geom;',
'buildings':'nwr["building"~"^(temple|shrine)$"](34.87,135.55,35.35,135.9);out center tags;',
'landuse':'way["landuse"="religious"](34.87,135.55,35.35,135.9);out center tags;',
'fushimi':'nwr["name"="伏見稲荷大社"];out center tags;',
'rivers':'way["waterway"="river"]["name"~"鴨|賀茂|桂川|高野"](34.9,135.6,35.2,135.88);out geom;',
'roads':'way["highway"="primary"](34.9,135.6,35.12,135.88);out geom;'
}
for name,q in queries.items():
 p=BASE/(name+'.json')
 if p.exists():continue
 temp=p.with_suffix('.tmp');print('fetch',name,flush=True)
 try:
  subprocess.run(['curl','-fLsS','--max-time','75','-A','KyotoNotes/1.1','--data-urlencode','data=[out:json][timeout:60];'+q,'https://overpass-api.de/api/interpreter','-o',str(temp)],check=True)
  data=json.loads(temp.read_text())
  if 'remark'in data or not data.get('elements'):raise ValueError('Incomplete or empty Overpass response')
  temp.replace(p);print(name,len(data['elements']),flush=True)
 finally:
  temp.unlink(missing_ok=True)
