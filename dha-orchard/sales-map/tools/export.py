import sys,json,numpy as np,pymupdf,cv2
from shapely.geometry import Polygon
from shapely.ops import unary_union
src,T,OUT=sys.argv[1],sys.argv[2],sys.argv[3]
P=json.load(open(T+'/plots_final6.json'))
xs=[x for p in P for x,_ in p['poly']];ys=[y for p in P for _,y in p['poly']]
X0,Y0,X1,Y1=min(xs)-60,min(ys)-60,max(xs)+60,max(ys)+60
LABELS={'E':(1233,1200),'C':(870,1160),'A':(572,918),'B':(1012,1594),'F':(1931,1495),'D':(1533,1415),'G':(854,1931),'H':(1775,1675)}
r=lambda v:round(v,1)
blocks={}
for b in 'ABCDEFGH':
    polys=[Polygon(p['poly']).buffer(0) for p in P if p['b']==b]
    u=unary_union([q.buffer(7) for q in polys]).buffer(-5)
    if u.geom_type=='MultiPolygon': parts=sorted(u.geoms,key=lambda g:-g.area)
    else: parts=[u]
    parts=[g.simplify(1.5) for g in parts if g.area>500]
    blocks[b]={'hull':[[[r(x-X0),r(y-Y0)] for x,y in g.exterior.coords] for g in parts],'label':[r(LABELS[b][0]-X0),r(LABELS[b][1]-Y0)],
               'n':sum(1 for p in P if p['b']==b)}
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
