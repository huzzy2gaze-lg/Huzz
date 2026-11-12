import sys,json,numpy as np,cv2
from shapely.geometry import Polygon
from shapely.ops import unary_union
T,PD=sys.argv[1],sys.argv[2]
lab=np.load(T+'/blocklab.npy');B='ABCDEFGH'
D=json.load(open(PD))
ox,oy=D['ox'],D['oy'];GAP=float(sys.argv[3]) if len(sys.argv)>3 else 2.2
r=lambda v:round(v,1)
out={}
for k,b in enumerate(B,1):
    m=(lab==k).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    gs=[]
    for c in cs:
        if cv2.contourArea(c)<600: continue
        c=cv2.approxPolyDP(c,0.8,True)[:,0,:].astype(float)
        g=Polygon(c).buffer(0).buffer(-GAP,join_style=2).buffer(0)
        for q in (g.geoms if g.geom_type=='MultiPolygon' else [g]):
            if q.area>400: gs.append(q.simplify(0.4))
    gs.sort(key=lambda g:-g.area)
    D['blocks'][b]['hull']=[[[r(x-ox),r(y-oy)] for x,y in g.exterior.coords] for g in gs]
    print(b,'parts',len(gs),'pts',sum(len(g.exterior.coords) for g in gs),'area',int(sum(g.area for g in gs)))
D.pop('borders',None)
s=json.dumps(D,separators=(',',':'));open(PD,'w').write(s);print('bytes',len(s))
