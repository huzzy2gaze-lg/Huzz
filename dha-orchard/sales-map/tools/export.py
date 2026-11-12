import sys,json,numpy as np,pymupdf,cv2
from shapely.geometry import Polygon
from shapely.ops import unary_union
src,T,OUT=sys.argv[1],sys.argv[2],sys.argv[3]
P=json.load(open(T+'/plots_final6.json'))
xs=[x for p in P for x,_ in p['poly']];ys=[y for p in P for _,y in p['poly']]
X0,Y0,X1,Y1=min(xs)-60,min(ys)-60,max(xs)+60,max(ys)+60
LABELS={'E':(1233,1200),'C':(870,1160),'A':(572,918),'B':(1012,1594),'F':(1931,1495),'D':(1533,1415),'G':(854,1931),'H':(1775,1675)}
r=lambda v:round(v,1)
# ---- block areas: plots + the parks/amenities/commercial areas that sit in the block ----
import numpy as _np
from collections import Counter as _C
FE=json.load(open(T+'/features.json'))
lab=_np.load(T+'/regions_lab.npy');KR=2.0
def region_at(x,y):
    X,Y=int(x*KR),int(y*KR)
    for rad in (0,3,6,10,15,25):
        win=lab[max(0,Y-rad):Y+rad+1,max(0,X-rad):X+rad+1];v=win[win>0]
        if v.size: return _C(v.tolist()).most_common(1)[0][0]
    return 0
REG={b:region_at(*xy) for b,xy in LABELS.items()}
BLVD=[(1250,1588),(1650,1596),(1720,1612),(1800,1652),(1880,1722),(1950,1802),(2010,1890)]
def south(x,y):
    for (x1,y1),(x2,y2) in zip(BLVD,BLVD[1:]):
        if x1<=x<=x2: return y>y1+(y2-y1)*(x-x1)/(x2-x1)
    return y>BLVD[-1][1] if x>BLVD[-1][0] else y>BLVD[0][1]
bplots={b:unary_union([Polygon(p['poly']).buffer(0) for p in P if p['b']==b]) for b in 'ABCDEFGH'}
allplots=unary_union(list(bplots.values()))
feat_of={b:[] for b in 'ABCDEFGH'}
for f in FE:
    g=Polygon(f['poly']).buffer(0)
    if g.is_empty or g.area<250: continue
    mr=g.minimum_rotated_rectangle;xs,ys=mr.exterior.coords.xy
    e=sorted(((xs[i+1]-xs[i])**2+(ys[i+1]-ys[i])**2)**.5 for i in range(4))
    if e[0]<10: continue                       # long thin shapes (the stream) are not areas
    if g.distance(allplots)>25: continue       # outside the scheme
    rg=region_at(f['cx'],f['cy'])
    if rg==REG['E']: b='E'
    elif rg==REG['C']: b='C'
    elif rg==REG['B']: b='B'
    elif rg==REG['D']: b='H' if south(f['cx'],f['cy']) else 'D'
    else:
        ring=g.buffer(25).difference(g)
        share={q:ring.intersection(bplots[q]).area for q in 'ABCDEFGH'}
        b=max(share,key=share.get) if max(share.values())>0 else min('ABCDEFGH',key=lambda q:g.distance(bplots[q]))
    feat_of[b].append(g)
blocks={}
for b in 'ABCDEFGH':
    parts=[bplots[b].buffer(3)]+[g.buffer(3) for g in feat_of[b]]
    others=unary_union([bplots[q] for q in 'ABCDEFGH' if q!=b]).buffer(1.5)
    u=unary_union(parts).buffer(12).buffer(-12).difference(others).buffer(-1).buffer(1)
    geoms=list(u.geoms) if u.geom_type=='MultiPolygon' else [u]
    geoms=[Polygon(g.exterior).simplify(1.2) for g in geoms if g.area>500]
    geoms.sort(key=lambda g:-g.area)
    blocks[b]={'hull':[[[r(x-X0),r(y-Y0)] for x,y in g.exterior.coords] for g in geoms],'label':[r(LABELS[b][0]-X0),r(LABELS[b][1]-Y0)],
               'n':sum(1 for p in P if p['b']==b),'areas':len(feat_of[b])}
    print(b,'areas in block',len(feat_of[b]),'outline parts',len(geoms))
plots=[]
for i,p in enumerate(P):
    pts=[v for x,y in p['poly'] for v in (r(x-X0),r(y-Y0))]
    q=np.array(p['poly']);e=[np.linalg.norm(q[(j+1)%len(q)]-q[j]) for j in range(len(q))]
    plots.append([p['b'],p['n'],p['size'],pts,r(p['cx']-X0),r(p['cy']-Y0),r(max(e))])
W,H=X1-X0,Y1-Y0
data={'w':r(W),'h':r(H),'ox':r(X0),'oy':r(Y0),'blocks':blocks,'plots':plots}
s=json.dumps(data,separators=(',',':'))
open(OUT+'/plotdata.json','w').write(s)
print('json bytes',len(s),'world',r(W),r(H))
dpi=150;k=dpi/72
dl=pymupdf.open(src)[0].get_displaylist()
pix=dl.get_pixmap(matrix=pymupdf.Matrix(k,k),clip=pymupdf.Rect(X0,Y0,X1,Y1),alpha=False)
im=cv2.cvtColor(np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3),cv2.COLOR_RGB2BGR)
cv2.imwrite(OUT+'/plan.webp',im,[cv2.IMWRITE_WEBP_QUALITY,82])
import os;print('plan',im.shape,os.path.getsize(OUT+'/plan.webp'))
