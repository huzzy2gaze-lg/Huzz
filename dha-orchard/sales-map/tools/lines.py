import sys, numpy as np, cv2, pymupdf, pickle
src,out,dpi=sys.argv[1],sys.argv[2],float(sys.argv[3])
k=dpi/72
p=pymupdf.open(src)[0]
W,H=int(2384*k),int(2400*k)
can=np.zeros((H,W),np.uint8)
segs=[]
for d in p.get_drawings():
    if d['type']!='s': continue
    col=d.get('color') or (0,0,0)
    for it in d['items']:
        if it[0]=='l': a,b=it[1],it[2]; segs.append((a.x,a.y,b.x,b.y,col))
        elif it[0]=='re':
            r=it[1]; c=[(r.x0,r.y0),(r.x1,r.y0),(r.x1,r.y1),(r.x0,r.y1)]
            for i in range(4): segs.append((*c[i],*c[(i+1)%4],col))
        elif it[0]=='qu':
            q=it[1]; c=[(q.ul.x,q.ul.y),(q.ur.x,q.ur.y),(q.lr.x,q.lr.y),(q.ll.x,q.ll.y)]
            for i in range(4): segs.append((*c[i],*c[(i+1)%4],col))
        elif it[0]=='c':
            pts=[it[1],it[2],it[3],it[4]]
            prev=pts[0]
            for t in np.linspace(0,1,9)[1:]:
                x=(1-t)**3*pts[0].x+3*(1-t)**2*t*pts[1].x+3*(1-t)*t**2*pts[2].x+t**3*pts[3].x
                y=(1-t)**3*pts[0].y+3*(1-t)**2*t*pts[1].y+3*(1-t)*t**2*pts[2].y+t**3*pts[3].y
                segs.append((prev.x if hasattr(prev,'x') else prev[0],prev.y if hasattr(prev,'y') else prev[1],x,y,col)); prev=(x,y)
for x1,y1,x2,y2,col in segs:
    if y1>2400 and y2>2400: continue
    cv2.line(can,(int(round(x1*k)),int(round(y1*k))),(int(round(x2*k)),int(round(y2*k))),255,1)
cv2.imwrite(out,255-can)
pickle.dump(segs,open(out+'.segs.pkl','wb'))
print('segments',len(segs),'canvas',W,H)
