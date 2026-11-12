import sys,json,numpy as np,cv2
from shapely.geometry import Polygon
from collections import Counter
T=sys.argv[1]
P=json.load(open(T+'/plots_final6.json'))
FE=json.load(open(T+'/features.json'))
pm=np.load(T+'/purplemask72.npy')          # 1 px = 1 pt, full page
H,W=pm.shape
# --- purple loop: largest connected piece of purple pixels ---
pd=cv2.dilate(pm,np.ones((3,3),np.uint8))
n,cc,st,_=cv2.connectedComponentsWithStats(pd,8)
big=1+int(np.argmax(st[1:,cv2.CC_STAT_AREA]))
loop=(cc==big).astype(np.uint8)
print('loop px',loop.sum(),'bbox',st[big][:4])
# inside of loop
ff=loop.copy()*255;mask=np.zeros((H+2,W+2),np.uint8)
cv2.floodFill(ff,mask,(0,0),128)
inside=(ff==0).astype(np.uint8)
print('inside px',inside.sum())
# --- plots raster with block id ---
B='ABCDEFGH';bid=np.zeros((H,W),np.uint8)
for p in P:
    cv2.fillPoly(bid,[np.round(np.array(p['poly'])).astype(np.int32)],B.index(p['b'])+1)
# which side are plots on
side=Counter()
for p in P:
    x,y=int(p['cx']),int(p['cy']);side[(p['b'],'in' if inside[y,x] else 'out')]+=1
print(sorted(side.items()))
# --- scheme footprint: plots + areas, closed over the roads ---
fp=(bid>0).astype(np.uint8)
from shapely.ops import unary_union
allp=unary_union([Polygon(p['poly']).buffer(0) for p in P])
keep=[]
for f in FE:
    g=Polygon(f['poly']).buffer(0)
    if g.is_empty or g.area<250: continue
    mr=g.minimum_rotated_rectangle;xs,ys=mr.exterior.coords.xy
    e=sorted(((xs[i+1]-xs[i])**2+(ys[i+1]-ys[i])**2)**.5 for i in range(4))
    if e[0]<10: continue
    if g.distance(allp)>40: continue
    keep.append(f);cv2.fillPoly(fp,[np.round(np.array(f['poly'])).astype(np.int32)],1)
print('areas kept',len(keep))
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(45,45))
fpc=cv2.morphologyEx(fp,cv2.MORPH_CLOSE,k)
# fill holes
ff=fpc.copy()*255;mask=np.zeros((H+2,W+2),np.uint8);cv2.floodFill(ff,mask,(0,0),128)
fpc=((ff!=128)).astype(np.uint8)
n,cc,st,_=cv2.connectedComponentsWithStats(fpc,8)
print('footprint parts',[int(a) for a in st[1:,cv2.CC_STAT_AREA] if a>2000])
np.save(T+'/fp.npy',fpc);np.save(T+'/inside.npy',inside);np.save(T+'/loop.npy',loop);np.save(T+'/bid.npy',bid)
json.dump(keep,open(T+'/features_kept.json','w'))
