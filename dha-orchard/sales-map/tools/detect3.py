import sys, json, pickle, numpy as np, cv2
T=sys.argv[1]; k=300/72
segs=pickle.load(open(T+'/lines300.png.segs.pkl','rb'))
W,H=int(2384*k),int(2400*k)
can=np.zeros((H,W),np.uint8)
for x1,y1,x2,y2,c in segs:
    if y1>2400 and y2>2400: continue
    cv2.line(can,(int(round(x1*k)),int(round(y1*k))),(int(round(x2*k)),int(round(y2*k))),255,2)
white=(can==0).astype(np.uint8)
n,lab,stats,cent=cv2.connectedComponentsWithStats(white,4)
acc=json.load(open(T+'/plots_raw.json'))
accc=np.array([[p['cx'],p['cy']] for p in acc])
extra=[]
for i in range(1,n):
    x,y,w,h,a=stats[i]
    ar=a/k/k
    if ar<25 or ar>450: continue
    mask=(lab[y:y+h,x:x+w]==i).astype(np.uint8)
    cnts,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    c=max(cnts,key=cv2.contourArea); full=cv2.contourArea(c)
    (cx,cy),(rw,rh),ang=cv2.minAreaRect(c)
    if rw*rh==0: continue
    fill=full/(rw*rh); asp=max(rw,rh)/max(1,min(rw,rh))
    ok_strict = (300<=a<=40000) and fill>=0.8 and 1.15<=asp<=3.5
    if ok_strict: continue
    if fill<0.55 or asp>4.5 or min(rw,rh)/k<4.5 or (ar>260 and fill<0.75): continue
    pcx,pcy=(cx+x)/k,(cy+y)/k
    d=np.hypot(*(accc-[pcx,pcy]).T)
    if d.min()>22: continue
    peri=cv2.arcLength(c,True)
    ap=cv2.approxPolyDP(c,0.015*peri,True).reshape(-1,2)+[x,y]
    box=cv2.boxPoints(((cx,cy),(rw,rh),ang))+[x,y]
    extra.append({'cx':pcx,'cy':pcy,'w':rw/k,'h':rh/k,'ang':ang,'area':ar,'fill':fill,'asp':asp,
        'poly':[[round(px/k,2),round(py/k,2)] for px,py in ap],'rect':[[round(px/k,2),round(py/k,2)] for px,py in box],'extra':True})
print('extra candidates',len(extra))
json.dump(extra,open(T+'/plots_extra.json','w'))
