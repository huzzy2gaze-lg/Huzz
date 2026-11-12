import sys,json,numpy as np,cv2,pymupdf
T=sys.argv[1];K=3
P=json.load(open(T+'/plots_final6.json'))
fp=np.load(T+'/fp.npy')          # scheme footprint, 1 px = 1 pt
xs=[x for p in P for x,_ in p['poly']];ys=[y for p in P for _,y in p['poly']]
X0,Y0,X1,Y1=min(xs)-20,min(ys)-20,max(xs)+20,max(ys)+20
pg=pymupdf.open(T+'/../lop/LOP-PR.pdf')[0]
pix=pg.get_pixmap(matrix=pymupdf.Matrix(K,K),clip=pymupdf.Rect(X0,Y0,X1,Y1),alpha=False)
im=np.frombuffer(pix.samples,np.uint8).reshape(pix.h,pix.w,3)
ink=(im.min(2)<225).astype(np.uint8)
plots=np.zeros(ink.shape,np.uint8)
for p in P: cv2.fillPoly(plots,[np.round((np.array(p['poly'])-[X0,Y0])*K).astype(np.int32)],1)
plots=cv2.dilate(plots,np.ones((5,5),np.uint8))
free=((ink==0)&(plots==0)).astype(np.uint8)
n,cc,st,cen=cv2.connectedComponentsWithStats(free,4)
near=cv2.dilate(plots,np.ones((9,9),np.uint8))
out=[]
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a<40*K*K or a>320*K*K or w*h>900*K*K: continue
    m=(cc[y:y+h,x:x+w]==i).astype(np.uint8)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea);A=cv2.contourArea(c)/K/K
    if A<55 or A>300: continue
    rr=cv2.minAreaRect(c);rw,rh=sorted(rr[1]);
    if rw/K<7 or rh/max(rw,1)>3.2: continue
    if A/((rw*rh)/K/K)<0.6: continue
    # must touch traced plots and lie in the scheme
    if near[y:y+h,x:x+w][m>0].mean()<0.08: continue
    cx,cy=cen[i][0]/K+X0,cen[i][1]/K+Y0
    if not fp[int(cy),int(cx)]: continue
    poly=((c[:,0,:]+[x,y])/K+[X0,Y0])
    poly=cv2.approxPolyDP(np.float32(poly*4),1.6,True)[:,0,:]/4
    out.append({'cx':round(float(cx),2),'cy':round(float(cy),2),'area':round(float(A),1),'poly':[[round(float(a),2),round(float(b),2)] for a,b in poly]})
json.dump(out,open(T+'/corner_cands.json','w'))
print('candidates',len(out))
