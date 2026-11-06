import sys,json,numpy as np,cv2,pymupdf
src,T,out,x0,y0,x1,y1,dpi=sys.argv[1],sys.argv[2],sys.argv[3],*map(float,sys.argv[4:9])
k=dpi/72;dl=pymupdf.open(src)[0].get_displaylist()
pix=dl.get_pixmap(matrix=pymupdf.Matrix(k,k),clip=pymupdf.Rect(x0,y0,x1,y1),alpha=False)
im=cv2.cvtColor(np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3),cv2.COLOR_RGB2BGR)
im=(im*0.45+255*0.55).astype(np.uint8)
COL={'A':(180,60,60),'B':(60,140,60),'C':(40,40,200),'D':(160,40,160),'E':(0,120,200),'F':(120,120,0),'G':(0,90,160),'H':(90,60,0)}
for p in json.load(open(T+'/plots_final2.json')):
    if not(x0<p['cx']<x1 and y0<p['cy']<y1):continue
    pts=np.array([[(x-x0)*k,(y-y0)*k] for x,y in p['poly']],np.int32)
    cv2.polylines(im,[pts],True,COL[p['b']],1)
    t=f"{p['b']}{p['n']}" if p['n'] else f"{p['b']}?"
    cx,cy=int((p['cx']-x0)*k),int((p['cy']-y0)*k)
    cv2.putText(im,t,(cx-14,cy+4),0,0.32,(0,0,0) if p['n'] else (0,0,255),1,cv2.LINE_AA)
cv2.imwrite(out,im)
