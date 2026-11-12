import sys,json,numpy as np,cv2
from collections import Counter
T=sys.argv[1]
fp=np.load(T+'/fp.npy');inside=np.load(T+'/inside.npy');loop=np.load(T+'/loop.npy');bid=np.load(T+'/bid.npy')
H,W=fp.shape;B='ABCDEFGH'
lab=np.zeros((H,W),np.uint8)
for side,blks in ((1,'BCDEH'),(0,'AFG')):
    piece=(fp>0)&(inside==side)
    seeds=np.isin(bid,[B.index(b)+1 for b in blks])&piece
    src=np.where(seeds,0,255).astype(np.uint8)
    d,li=cv2.distanceTransformWithLabels(src,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
    # map label index -> block of that seed pixel
    m=np.zeros(li.max()+1,np.uint8);m[li[seeds]]=bid[seeds]
    lab[piece]=m[li[piece]]
# the loop line itself: give it to the nearest side later (leave 0 = gap)
# areas: whole area goes to its majority block on each side
FE=json.load(open(T+'/features_kept.json'))
moved=0
for f in FE:
    fm=np.zeros((H,W),np.uint8);cv2.fillPoly(fm,[np.round(np.array(f['poly'])).astype(np.int32)],1)
    for side in (0,1):
        part=(fm>0)&(inside==side)&(fp>0)
        if part.sum()<30: continue
        v=Counter(lab[part].tolist()).most_common(1)[0][0]
        if v: moved+=int((lab[part]!=v).sum()); lab[part]=v
print('area px reassigned',moved)
# every plot stays whole in its own block
lab[bid>0]=bid[bid>0]
np.save(T+'/blocklab.npy',lab)
cols={1:(60,60,230),2:(60,170,60),3:(230,120,40),4:(40,170,220),5:(200,60,200),6:(150,150,40),7:(40,90,160),8:(120,60,30)}
im=np.full((H,W,3),255,np.uint8)
for k,c in cols.items(): im[lab==k]=c
im[loop>0]=(0,0,0)
cv2.imwrite(T+'/blocklab.png',cv2.resize(im[550:2250,250:2250],None,fx=0.6,fy=0.6,interpolation=cv2.INTER_AREA))
for k in range(1,9):print(B[k-1],int((lab==k).sum()))
