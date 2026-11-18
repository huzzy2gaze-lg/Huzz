import sys,numpy as np,cv2,pymupdf
src,out,x0,y0,x1,y1,dpi=sys.argv[1],sys.argv[2],*map(float,sys.argv[3:8])
k=dpi/72;dl=pymupdf.open(src)[0].get_displaylist()
pix=dl.get_pixmap(matrix=pymupdf.Matrix(k,k),clip=pymupdf.Rect(x0,y0,x1,y1),alpha=False)
im=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3).copy()
im=cv2.cvtColor(im,cv2.COLOR_RGB2BGR)
for gx in range(int(x0//50*50),int(x1)+1,50):
    X=int((gx-x0)*k);cv2.line(im,(X,0),(X,im.shape[0]),(255,0,255) if gx%100==0 else (230,180,255),1)
    if gx%100==0: cv2.putText(im,str(gx),(X+2,14),0,0.45,(200,0,200),1)
for gy in range(int(y0//50*50),int(y1)+1,50):
    Y=int((gy-y0)*k);cv2.line(im,(0,Y),(im.shape[1],Y),(255,0,255) if gy%100==0 else (230,180,255),1)
    if gy%100==0: cv2.putText(im,str(gy),(2,Y-3),0,0.45,(200,0,200),1)
cv2.imwrite(out,im)
