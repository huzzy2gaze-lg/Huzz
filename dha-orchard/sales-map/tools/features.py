import sys,json,numpy as np,cv2,pymupdf
src,T=sys.argv[1],sys.argv[2]
DPI=60;k=DPI/72
dl=pymupdf.open(src)[0].get_displaylist()
pix=dl.get_pixmap(matrix=pymupdf.Matrix(k,k),clip=pymupdf.Rect(0,0,2384,2400),alpha=False)
im=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3).copy()
P=json.load(open(T+'/plots_final6.json'))
# mask out plots (with a small margin) so plot rows do not count as coloured areas
pm=np.zeros(im.shape[:2],np.uint8)
for p in P: cv2.fillPoly(pm,[(np.array(p['poly'])*k).astype(np.int32)],255)
pm=cv2.dilate(pm,np.ones((3,3),np.uint8))
hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV)
sat=((hsv[:,:,1]>45)&(hsv[:,:,2]>90)).astype(np.uint8)*255
sat[pm>0]=0
sat=cv2.morphologyEx(sat,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
sat=cv2.morphologyEx(sat,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
n,lab,st,cen=cv2.connectedComponentsWithStats(sat,8)
feats=[]
for i in range(1,n):
    a=st[i][4]/k/k
    if a<250: continue
    m=(lab==i).astype(np.uint8)
    c=max(cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0],key=cv2.contourArea)
    ap=cv2.approxPolyDP(c,1.2,True).reshape(-1,2)
    if len(ap)<3: continue
    col=im[lab==i].mean(0)
    feats.append({'poly':[[round(x/k,1),round(y/k,1)] for x,y in ap],'area':round(a),'cx':round(cen[i][0]/k,1),'cy':round(cen[i][1]/k,1),'rgb':[int(v) for v in col]})
print('features',len(feats))
json.dump(feats,open(T+'/features.json','w'))
vis=im.copy()
for f in feats: cv2.polylines(vis,[(np.array(f['poly'])*k).astype(np.int32)],True,(0,0,0),2)
cv2.imwrite(T+'/features_vis.png',cv2.cvtColor(vis[250:1800,0:1990],cv2.COLOR_RGB2BGR))
