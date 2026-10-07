"""Compile auditable OSM + Wikidata snapshots into the Kyoto city atlas.
Requires shapely. Reads artifacts/atlas; the checked-in output is sufficient to run the app.
"""
from pathlib import Path
import json,re,math,collections
from shapely.geometry import LineString,Point,mapping
from shapely.ops import polygonize,unary_union
BASE=Path('artifacts/atlas');OUT=Path('public/data');OUT.mkdir(exist_ok=True)
def read(name,default=None):
 p=BASE/name;return json.loads(p.read_text()) if p.exists() else default
wards=[];polys=[]
cn={'東山区':'东山区','伏見区':'伏见区'}
for r in read('wards.json')['elements']:
 lines=[LineString([(p['lon'],p['lat']) for p in m['geometry']]) for m in r['members'] if m.get('role')=='outer' and len(m.get('geometry',[]))>1]
 geom=unary_union(list(polygonize(unary_union(lines))))
 if geom.is_empty:raise ValueError('Empty boundary '+r['tags']['name'])
 name=cn.get(r['tags']['name'],r['tags']['name']);polys.append((name,geom))
 simple=geom.simplify(.00012,preserve_topology=True)
 wards.append({'type':'Feature','properties':{'name':name,'label':[geom.representative_point().x,geom.representative_point().y],'osmId':r['id']},'geometry':mapping(simple)})
def ward(lon,lat):
 p=Point(lon,lat)
 return next((name for name,g in polys if g.covers(p)),None)
E=read('entities.json',{});R=read('related.json',{})
def label(q):
 l=R.get(q,{}).get('labels',{});return next((l[k]['value'] for k in ['zh-hans','zh','ja','en'] if k in l),'')
def claims(q,prop):return [c['mainsnak']['datavalue']['value'] for c in E.get(q,{}).get('claims',{}).get(prop,[]) if c.get('rank')!='deprecated' and 'datavalue'in c.get('mainsnak',{})]
def ids(q,prop):return [v['id'] for v in claims(q,prop) if isinstance(v,dict) and 'id'in v]
normalize=lambda s:re.sub(r'[\s・·()（）]|(Temple|Shrine)','',s).replace('神','神').replace('淨','浄').replace('萬','万').replace('佛','仏').replace('德','徳')
sect_map={'rinzai':'临济宗','rinzai_school':'临济宗','zen':'禅宗（支派未详）','jodo_shu':'净土宗','jodo_shinshu':'净土真宗','shingon_shu':'真言宗','nichiren':'日莲宗','tendai':'天台宗','tiantai':'天台宗','soto':'曹洞宗','obaku':'黄檗宗','yogacara':'法相宗','shugendo':'修验道','nichiren_shoshu':'日莲正宗'}
def family(s):
 for needles,out in [(['臨','临'],'临济宗'),(['净土真','淨土真','浄土真','真宗'],'净土真宗'),(['净土','淨土','浄土','鎮西'],'净土宗'),(['真言'],'真言宗'),(['天台'],'天台宗'),(['日莲','日蓮','法華','法华','佛立'],'日莲／法华系'),(['曹洞'],'曹洞宗'),(['黄檗'],'黄檗宗'),(['法相'],'法相宗'),(['時宗','时宗','遊行'],'时宗'),(['修驗','修验','修験','当山'],'修验道'),(['禅','禪'],'禅宗（支派未详）'),(['律宗'],'律宗')]:
  if any(n in s for n in needles):return out
 return '其他／独立宗派' if s and s!='未详' else '未详'
heritage={'Q43113623':'世界遗产组成部分','Q1139795':'国宝相关','Q1188622':'重要文化财相关','Q30834580':'国家史迹','Q11414752':'名胜','Q94987823':'特别名胜','Q11579194':'登录有形文化财相关','Q26764449':'特别史迹','Q56347622':'景观重要建造物'}
raw=read('osm-test.json')['elements'];extra=read('extra.json',{}).get('elements',[]);building=read('buildings.json',{}).get('elements',[])
raw=list({f"{e['type']}/{e['id']}":e for e in raw+extra+building+read('fushimi.json',{}).get('elements',[])+read('landuse.json',{}).get('elements',[])}.values());rows=[];skipped=collections.Counter()
for e in raw:
 t=e.get('tags',{});p=e.get('center',e);lon=p.get('lon');lat=p.get('lat');name=t.get('name:ja')or t.get('name')or t.get('name:en');w=ward(lon,lat)
 if not w:skipped['outsideBoundary']+=1;continue
 if not name:skipped['unnamed']+=1;continue
 religion=t.get('religion');kind='寺院' if religion=='buddhist' else '神社' if religion=='shinto' else None
 # A building tag alone can describe a gate, storehouse or office. Only admit named
 # temple/shrine candidates whose name and building type agree; mark them as provisional.
 inferred=False
 if not religion:
  if t.get('building')=='temple' and re.search(r'(寺|院|庵)(?:[（(].*)?$',name):kind='寺院';inferred=True
  if t.get('building')=='shrine' and re.search(r'(社|宮|大明神|大神|大権現)$',name):kind='神社';inferred=True
 if not kind:skipped['unknownReligion']+=1;continue
 q=t.get('wikidata','');instance=ids(q,'P31')
 if 'Q5'in instance: q=''
 religions=[label(v) for v in ids(q,'P140')];religions=[v for v in religions if v and v not in ['神道教','佛教','日本佛教']]
 denom=t.get('denomination','');denom=sect_map.get(denom,denom)
 sect=' / '.join(religions) if religions else denom if denom not in ['shinto','buddhist','mahayana'] else ''
 if kind=='神社':sect='不适用（神道）'
 h=[heritage[v] for v in ids(q,'P1435') if v in heritage]
 ranks=[]
 for qid,title in [('Q114233444','门迹'),('Q10901138','敕愿寺'),('Q134917286','式内社'),('Q135160338','旧官币社'),('Q175288','敕祭社'),('Q118304363','国史见在社')]:
  if qid in instance:ranks.append(title)
 ancillary=bool(re.search(r'(殿|堂|楼|門|塔|蔵|庫|手水舎|社務所|納所|受付|書院|方丈|庫裡|庫裏|本坊|客殿|休憩所|御水屋|神饌所|舞台)$',name)) and not re.search(r'(寺|神社|大社)',name)
 unit='殿堂／附属建筑' if ancillary else '塔头' if 'Q9769742'in instance else '境外摄社' if 'Q135009977'in instance else '寺社地点'
 website=t.get('website')or t.get('contact:website')or next((x for x in claims(q,'P856') if isinstance(x,str)),'')
 if not re.match('https?://',website):website=''
 rows.append({'id':f"{e['type']}-{e['id']}",'name':name,'aliases':' · '.join(dict.fromkeys(filter(None,[t.get('name:zh'),t.get('name:en'),t.get('alt_name'),t.get('official_name')]+[x['value'] for k,x in E.get(q,{}).get('labels',{}).items() if k in ['zh','zh-hans']]))),'kind':kind,'kindSource':'建筑标签与名称推定，待核验' if inferred else 'OpenStreetMap religion','ward':w,'lon':round(lon,7),'lat':round(lat,7),'sect':sect or '未详','family':family(sect) if kind=='寺院' else '不适用（神道）','sectSource':'Wikidata P140' if religions and kind=='寺院' else 'OpenStreetMap denomination' if denom and kind=='寺院' else '', 'heritage':h,'ranks':ranks,'unit':unit,'website':website,'wikidata':q,'osm':[f"https://www.openstreetmap.org/{e['type']}/{e['id']}"],'address':t.get('addr:full',''),'access':t.get('access',''),'opening':t.get('opening_hours','')})
# Same-name nearby objects or matching knowledge IDs represent duplicate map features, not multiple temples.
merged=[];duplicates=0
for p in sorted(rows,key=lambda p:(p['id'].startswith('node'),-bool(p['wikidata']))):
 duplicate=next((r for r in merged if p['kind']==r['kind'] and math.hypot((p['lon']-r['lon'])*91000,(p['lat']-r['lat'])*111000)<160 and (normalize(p['name'])==normalize(r['name']) or p['wikidata'] and p['wikidata']==r['wikidata'])),None)
 if duplicate:
  duplicate['osm']+=p['osm'];duplicates+=1
  for k in ['website','address','opening','wikidata']:
   if not duplicate[k]:duplicate[k]=p[k]
 else:merged.append(p)
# Editorial additions are keyed by unique Wikidata identifiers, never ambiguous place names.
curated=json.loads(Path('scripts/atlas-curated.json').read_text())
for p in merged:
 c=curated.get(p['wikidata'])
 if c:
  for k in ['sect','family','ranks','deity','note','website','heritage']:
   if k in c:p[k]=list(dict.fromkeys(p[k]+c[k])) if k=='heritage' else c[k]
  p['editorialSources']=c.get('sources',[])
  if 'sect'in c:p['sectSource']='官方宗派／寺社资料（见下方链接）'
# Official directory enriches only unique same-name matches in the explicitly named ward.
unlocated=[];directoryMatches=0
for d in read('jodo-directory.json',[]):
 d['address']=re.sub(r'\s+',' ',d['address']).strip()
 w=next((cn.get(n,n) for n in ['北区','上京区','左京区','中京区','東山区','下京区','南区','右京区','伏見区','山科区','西京区'] if n in d['address']),None)
 matches=[p for p in merged if p['kind']=='寺院' and normalize(p['name'])==normalize(d['name']) and (not w or p['ward']==w)]
 if len(matches)==1:
  p=matches[0];p.update({'sect':'净土宗','family':'净土宗','sectSource':'净土宗官方寺院目录','directorySource':d['source'],'address':d['address'] or p['address']});directoryMatches+=1
 else:unlocated.append(d)
merged.sort(key=lambda p:(not bool(p['ranks']or p['heritage']),p['ward'],p['name']))
# Paths in geographic coordinates; simplified for display only.
features=[]
for filename,kind in [('roads.json','road'),('rivers.json','river')]:
 for e in read(filename,{}).get('elements',[]):
  coords=[(g['lon'],g['lat']) for g in e.get('geometry',[])]
  if len(coords)<2:continue
  g=LineString(coords).simplify(.00008);features.append({'type':'Feature','properties':{'kind':kind,'name':e.get('tags',{}).get('name','')},'geometry':mapping(g)})
meta={'updated':'2026-10-08','osmTimestamp':read('osm-test.json')['osm3s']['timestamp_osm_base'],'scope':'京都市 11 区（行政边界内）','total':len(merged),'kinds':dict(collections.Counter(p['kind']for p in merged)),'namedSites':sum(p['unit']!='殿堂／附属建筑'for p in merged),'typeProvisional':sum(p['kindSource']=='建筑标签与名称推定，待核验' for p in merged),'sectKnown':sum(p['kind']=='寺院'and p['sect']!='未详' for p in merged),'duplicatesMerged':duplicates,'excluded':dict(skipped),'directoryMatched':directoryMatches,'directoryUnlocated':len(unlocated),'coverage':'公开数据收录版，尚非全量寺社名录；不能与宗教法人数直接对比。','license':'OSM-derived database: ODbL 1.0; Wikidata facts: CC0. See ATLAS_DATA.md.'}
for file,data in [('kyoto-temples.json',{'meta':meta,'places':merged,'unlocated':unlocated}),('kyoto-geography.json',{'wards':{'type':'FeatureCollection','features':wards},'lines':{'type':'FeatureCollection','features':features}})]:
 (OUT/file).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(json.dumps(meta,ensure_ascii=False,indent=2));print('geography lines',len(features))
