import sys, numpy as np, cv2, pymupdf, pickle, collections
src,out=sys.argv[1],sys.argv[2]
p=pymupdf.open(src)[0]
polys=[]
stat=collections.defaultdict(list)
for d in p.get_drawings():
    if d['type']=='s' or not d.get('fill'): continue
    f=tuple(round(c,3) for c in d['fill'])
    if f==(0.0,0.0,0.0): continue
    r=d['rect']
    # each fill drawing may hold many subpaths; collect polygons per subpath
    cur=[];subs=[]
    for it in d['items']:
        if it[0]=='l':
            if not cur: cur=[(it[1].x,it[1].y)]
            cur.append((it[2].x,it[2].y))
        elif it[0]=='re':
            rr=it[1]; subs.append([(rr.x0,rr.y0),(rr.x1,rr.y0),(rr.x1,rr.y1),(rr.x0,rr.y1)])
        elif it[0]=='qu':
            q=it[1]; subs.append([(q.ul.x,q.ul.y),(q.ur.x,q.ur.y),(q.lr.x,q.lr.y),(q.ll.x,q.ll.y)])
        elif it[0]=='c':
            if not cur: cur=[(it[1].x,it[1].y)]
            cur.append((it[4].x,it[4].y))
    if cur: subs.append(cur)
    for s in subs: polys.append((f,s))
    stat[f].append((r.width,r.height,len(d['items'])))
for f,v in stat.items():
    ws=sorted(min(a,b) for a,b,_ in v); print(f,len(v),'min-dim median',round(ws[len(ws)//2],2),'max',round(ws[-1],1),'items median',sorted(n for *_,n in v)[len(v)//2])
pickle.dump(polys,open(out,'wb'))
