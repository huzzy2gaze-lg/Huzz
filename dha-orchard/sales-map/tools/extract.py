import sys, pickle, collections, time
import pymupdf
src, out = sys.argv[1], sys.argv[2]
t=time.time()
doc = pymupdf.open(src); page = doc[0]
dr = page.get_drawings()
print('drawings', len(dr), 'in', round(time.time()-t,1), 's', 'page', page.rect, 'rotation', page.rotation)
fills = collections.Counter(); strokes = collections.Counter(); types = collections.Counter()
slim=[]
for d in dr:
    types[d['type']] += 1
    f = tuple(round(c,3) for c in d['fill']) if d.get('fill') else None
    s = tuple(round(c,3) for c in d['color']) if d.get('color') else None
    if f: fills[f]+=1
    if s: strokes[s]+=1
    pts=[]
    for it in d['items']:
        if it[0]=='l': pts += [(it[1].x,it[1].y),(it[2].x,it[2].y)]
        elif it[0]=='re': r=it[1]; pts += [(r.x0,r.y0),(r.x1,r.y0),(r.x1,r.y1),(r.x0,r.y1)]
        elif it[0]=='qu': q=it[1]; pts += [(q.ul.x,q.ul.y),(q.ur.x,q.ur.y),(q.lr.x,q.lr.y),(q.ll.x,q.ll.y)]
        elif it[0]=='c': pts += [(it[1].x,it[1].y),(it[4].x,it[4].y)]
    slim.append({'type':d['type'],'fill':f,'color':s,'w':d.get('width'),'rect':tuple(d['rect']),'n':len(d['items']),'ops':''.join(i[0][0] for i in d['items'])[:40],'pts':pts,'closed':d.get('closePath')})
print('types', types.most_common())
print('top fills', fills.most_common(25))
print('top strokes', strokes.most_common(12))
pickle.dump(slim, open(out,'wb'))
