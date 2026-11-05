import sys,json,numpy as np
from collections import defaultdict,Counter
T=sys.argv[1];P=json.load(open(T+'/plots_final.json'))
RAW=json.load(open(T+'/plots_raw.json'))
OCR=dict((i,r) for i,r in json.load(open(T+'/ocr_all.json')))
# map final plots back to raw index by centroid
rawc=np.array([[p['cx'],p['cy']] for p in RAW])
for p in P:
    j=int(np.argmin(np.hypot(*(rawc-[p['cx'],p['cy']]).T)));p['raw']=j
    r=np.array(RAW[j]['rect']);e=[np.linalg.norm(r[(k+1)%4]-r[k]) for k in range(4)]
    p['short']=min(e);p['long']=max(e);k=int(np.argmax(e));v=r[(k+1)%4]-r[k];p['axis']=(v/np.linalg.norm(v)).tolist()
    p['alts']=[int(t) for t,c in OCR.get(j,[]) if t and t.isdigit() and len(t)<=4 and c>=30 and int(t)>0]
cent=np.array([[p['cx'],p['cy']] for p in P])
side=defaultdict(list)
for a,p in enumerate(P):
    d=np.hypot(*(cent-cent[a]).T)
    for b in np.where((d>0)&(d<1.3*p['short']))[0]:
        b=int(b)
        if P[b]['b']!=p['b']:continue
        if abs(float(np.dot(cent[b]-cent[a],p['axis'])))<0.45*p['long']: side[a].append(b)
count=Counter(p['b'] for p in P)
cap={b:int(c*1.06)+5 for b,c in count.items()}
for p in P:
    if p['n'] is not None and p['n']>cap[p['b']]: p['n']=None;p['how']='dropped-high'
def support(a,v):
    return sum(1 for b in side[a] if P[b]['n'] is not None and abs(P[b]['n']-v)==1)
for rnd in range(4):
    seen=defaultdict(list)
    for a,p in enumerate(P):
        if p['n'] is not None: seen[(p['b'],p['n'])].append(a)
    for key,mem in seen.items():
        if len(mem)<2: continue
        mem.sort(key=lambda a:(support(a,P[a]['n']),P[a]['conf']),reverse=True)
        for a in mem[1:]:
            alt=[v for v in P[a]['alts'] if v!=P[a]['n'] and (P[a]['b'],v) not in seen and v<=cap[P[a]['b']]]
            if alt and support(a,alt[0])>0: P[a]['n']=alt[0];P[a]['how']='alt';seen[(P[a]['b'],alt[0])].append(a)
            else: P[a]['n']=None;P[a]['how']='dup-cleared'
    # infer blanks from neighbours
    for a,p in enumerate(P):
        if p['n'] is not None: continue
        nb=sorted(P[b]['n'] for b in side[a] if P[b]['n'] is not None)
        cand=None
        if len(nb)>=2:
            for x in nb:
                for y in nb:
                    if y-x==2: cand=x+1
        if cand is None:
            for v in p['alts']:
                if support(a,v)>0 and v<=cap[p['b']]: cand=v
        if cand is not None and (p['b'],cand) not in seen:
            p['n']=cand;p['how']='inferred';seen[(p['b'],cand)].append(a)
seen=defaultdict(list)
for a,p in enumerate(P):
    if p['n'] is not None: seen[(p['b'],p['n'])].append(a)
d=sum(1 for v in seen.values() if len(v)>1)
print('numbered',sum(1 for p in P if p['n'] is not None),'of',len(P),'dup keys',d)
print(Counter(p['how'] for p in P))
for b in sorted(count):
    ns=set(p['n'] for p in P if p['b']==b and p['n'] is not None);mx=max(ns)
    miss=[i for i in range(1,mx+1) if i not in ns]
    print(b,'plots',count[b],'max',mx,'missing numbers',len(miss),'unnumbered plots',sum(1 for p in P if p['b']==b and p['n'] is None))
for p in P:
    for k in ('raw','short','long','axis','alts'): p.pop(k,None)
json.dump(P,open(T+'/plots_final2.json','w'))
