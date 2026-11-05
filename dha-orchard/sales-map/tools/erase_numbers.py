# Erase the plan's own printed number inside each numbered plot (the map draws the number again, upright).
# Only digit-sized dark shapes whose larger part is in the plot's centre are erased; lines and road names stay.
import sys,json,numpy as np,cv2
src,PD,out_path=sys.argv[1],sys.argv[2],sys.argv[3]
D=json.load(open(PD))
im=cv2.imread(src);H,W=im.shape[:2];k=W/D['w']
mx=im.max(2).astype(int);mn=im.min(2).astype(int)
textish=((mx<170)|((mn<215)&(mx-mn<40))).astype(np.uint8)
clean=np.zeros((H,W),np.uint8);n=0
for b,num,size,flat,cx,cy,L in D['plots']:
    if num is None: continue
    q=(np.array(flat).reshape(-1,2)*k).round().astype(np.int32)
    x0,y0=q.min(0)-2;x1,y1=q.max(0)+3
    full=np.zeros((y1-y0,x1-x0),np.uint8);cv2.fillPoly(full,[q-[x0,y0]],1)
    inner=cv2.erode(full,np.ones((3,3),np.uint8));core=cv2.erode(full,np.ones((5,5),np.uint8))
    t=textish[y0:y1,x0:x1]&inner
    nc,lab,st,_=cv2.connectedComponentsWithStats(t,8);hit=False
    for i in range(1,nc):
        w,h,a=st[i,2],st[i,3],st[i,4]
        if max(w,h)>24 or a>220: continue
        comp=lab==i
        if (comp&(core>0)).sum()<a*0.5: continue
        clean[y0:y1,x0:x1][comp]=1;hit=True
    n+=hit
clean=cv2.dilate(clean,np.ones((3,3),np.uint8))
out=im.copy();out[(clean>0)&((mx-mn)<40)]=(255,255,255)
cv2.imwrite(out_path,out,[cv2.IMWRITE_WEBP_QUALITY,82])
print('plots cleaned',n,'of',sum(1 for p in D['plots'] if p[1] is not None))
