#!/usr/bin/env python3
"""Refresh stocknews from allowlisted original institutional RSS and Atom feeds."""
import datetime as dt
import email.utils
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE=Path(__file__).resolve().parent
SOURCES=json.loads((BASE/"sources.json").read_text())["sources"]
SNAP=BASE/"snapshot.json"
TERMS=re.compile(r"stock|equity|equit(y|ies)|securit|investor|investment|market|trading|exchange|ipo|listing|fund|etf|derivative|fraud|insider|broker|earnings|inflation|interest.rate|monetary.policy|economic.outlook|financial.stability|asset.management|portfolio|treasur|yield|volatility|digital.asset|crypto|compliance",re.I)
TOPICS=[("AI",r"artificial intelligence|agentic|machine learning|autonomous"),("Security",r"fraud|scam|insider.trading|market.manipulation|investor.protection"),("Markets",r"stock|equity|securit|exchange|ipo|listing|trading|etf|fund|portfolio|derivative|market|inflation|interest.rate"),("Policy",r"regulat|compliance|supervision|framework|policy|oversight")]
ATOM="{http://www.w3.org/2005/Atom}"
class Stripper(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,data):self.parts.append(data)
def clean(s,n=300):
 p=Stripper();p.feed(html.unescape(s or ""));return re.sub(r"\s+"," "," ".join(p.parts)).strip()[:n]
def value(node,*names):
 for n in names:
  e=node.find(n)
  if e is not None and e.text:return e.text.strip()
 return ""
def date(s):
 try:d=email.utils.parsedate_to_datetime(s)
 except (ValueError,TypeError,IndexError):
  try:d=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
  except (ValueError,AttributeError):return None
 if d.tzinfo is None:d=d.replace(tzinfo=dt.timezone.utc)
 d=d.astimezone(dt.timezone.utc)
 if d>dt.datetime.now(dt.timezone.utc)+dt.timedelta(days=1):return None
 return d.isoformat().replace("+00:00","Z")
def allowed(u,source):
 try:
  p=urllib.parse.urlsplit(u)
  if p.scheme!="https" or p.username or p.password or (p.port not in (None,443)) or (p.hostname or "").lower() not in source["allowedHosts"]:return None
  return urllib.parse.urlunsplit(("https",p.netloc,p.path,p.query,""))
 except (ValueError,TypeError):return None
def collect(source):
 u=source["feed"]
 if not allowed(u,source):raise ValueError("Non-allowlisted feed")
 req=urllib.request.Request(u,headers={"User-Agent":"ShareCapsuleResearch/1.0","Accept":"application/rss+xml, application/atom+xml, application/xml, text/xml"})
 with urllib.request.urlopen(req,timeout=20) as r:
  if not allowed(r.url,source):raise ValueError("Off-domain redirect")
  data=r.read(2000001)
  if len(data)>2000000:raise ValueError("Feed too large")
 root=ET.fromstring(data);is_atom=root.tag==ATOM+"feed"
 entries=root.findall(ATOM+"entry") if is_atom else root.findall("./channel/item")
 rows=[]
 for item in entries[:100]:
  title=clean(value(item,ATOM+"title" if is_atom else "title"),200)
  summary=clean(value(item,*( [ATOM+"summary",ATOM+"content"] if is_atom else ["description","{http://purl.org/rss/1.0/modules/content/}encoded"] )))
  link=""
  if is_atom:
   for a in item.findall(ATOM+"link"):
    if a.get("rel","alternate")=="alternate":link=a.get("href","");break
  else:link=value(item,"link")
  link=allowed(link,source)
  published=date(value(item,*( [ATOM+"published",ATOM+"updated"] if is_atom else ["pubDate","{http://purl.org/dc/elements/1.1/}date"] )))
  if not (title and link and published and TERMS.search(title+" "+summary)):continue
  topic=next((name for name,regex in TOPICS if re.search(regex,title+" "+summary,re.I)),source["topic"])
  rows.append(dict(title=title,summary=summary,url=link,published=published,source=source["name"],kind=source["kind"],topic=topic))
 return rows
def main():
 old=json.loads(SNAP.read_text()) if SNAP.exists() else {"articles":[]}
 rows=[];failed=[];success=0
 for s in SOURCES:
  try:
   data=collect(s);rows+=data;success+=1;print(s["id"],len(data))
  except (OSError,ValueError,ET.ParseError) as e:
   failed.append(s["id"]);print("Unavailable:",s["id"],str(e))
   rows.extend(a for a in old.get("articles",[]) if a.get("source")==s["name"])
 if not success:raise SystemExit("All feeds failed; preserving existing snapshot")
 seen=set();out=[];cut=dt.datetime.now(dt.timezone.utc)-dt.timedelta(days=120)
 for a in sorted(rows,key=lambda a:a["published"],reverse=True):
  key=a["url"].split("?")[0].lower()
  if key in seen or dt.datetime.fromisoformat(a["published"].replace("Z","+00:00"))<cut:continue
  seen.add(key);out.append(a)
 payload={"generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),"sourceCount":success,"feedFailures":failed,"articles":out[:160]}
 SNAP.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")
 print("Saved",len(payload["articles"]),"source-linked publications")
if __name__=="__main__":main()
