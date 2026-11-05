import sys,pickle,json,cv2,numpy as np
T=sys.argv[1];k=2.0
W,H=int(2384*k),int(2400*k)
bar=np.zeros((H,W),np.uint8)
polys=pickle.load(open(T+'/fills.pkl','rb'))
RED=(1.0,0.0,0.0);PUR=(0.664,0.324,0.629)
for f,s in polys:
    if f in (RED,PUR):
        cv2.fillPoly(bar,[np.array([[x*k,y*k] for x,y in s],np.int32)],255)
segs=pickle.load(open(T+'/lines300.png.segs.pkl','rb'))
for x1,y1,x2,y2,c in segs:
    c=tuple(round(v,3) for v in c)
    if c in ((0.0,0.0,1.0),):
        cv2.line(bar,(int(x1*k),int(y1*k)),(int(x2*k),int(y2*k)),255,2)
bar=cv2.dilate(bar,np.ones((9,9),np.uint8))
free=(bar==0).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(free,4)
print('regions',n)
big=[(i,st[i][4]) for i in range(1,n) if st[i][4]>20000]
print(sorted(big,key=lambda t:-t[1])[:20])
np.save(T+'/regions_lab.npy',lab.astype(np.int32))
# grey label centres
labs=[]
GR=(0.461,0.461,0.461)
pts=[ (np.mean([p[0] for p in s]),np.mean([p[1] for p in s])) for f,s in polys if f==GR]
pts=np.array(pts)
# cluster label glyphs
from collections import defaultdict
used=[False]*len(pts);clusters=[]
for i in range(len(pts)):
    if used[i]:continue
    grp=[i];used[i]=True;q=[i]
    while q:
        j=q.pop()
        for m in range(len(pts)):
            if not used[m] and np.hypot(*(pts[m]-pts[j]))<40: used[m]=True;grp.append(m);q.append(m)
    clusters.append(pts[grp].mean(axis=0).tolist()+[len(grp)])
print('label clusters',[[round(a),round(b),c] for a,b,c in clusters])
vis=np.full((H,W,3),255,np.uint8)
rng=np.random.default_rng(3);cols=rng.integers(60,230,(n,3))
for i,_ in big: vis[lab==i]=cols[i]
vis[bar>0]=(0,0,0)
for x,y,c in clusters: cv2.circle(vis,(int(x*k),int(y*k)),18,(0,0,255),-1)
cv2.imwrite(T+'/regions.png',cv2.resize(vis,(W//4,H//4)))
json.dump(clusters,open(T+'/labels.json','w'))
