import sys,numpy as np,pymupdf,time
src,out=sys.argv[1],sys.argv[2];DPI=600;K=DPI/72
Y0,Y1=300,2150;X0,X1=0,2384
W,H=int((X1-X0)*K),int((Y1-Y0)*K)
mm=np.lib.format.open_memmap(out,mode='w+',dtype=np.uint8,shape=(H,W))
page=pymupdf.open(src)[0];dl=page.get_displaylist()
t=time.time();step=300
for ty in range(Y0,Y1,step):
    for tx in range(X0,X1,step):
        r=pymupdf.Rect(tx,ty,min(tx+step,X1),min(ty+step,Y1))
        pix=dl.get_pixmap(matrix=pymupdf.Matrix(K,K),clip=r,alpha=False)
        im=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3)
        dark=(im.max(axis=2)<110).astype(np.uint8)
        oy,ox=int((ty-Y0)*K),int((tx-X0)*K)
        h,w=min(dark.shape[0],H-oy),min(dark.shape[1],W-ox)
        mm[oy:oy+h,ox:ox+w]=dark[:h,:w]
mm.flush();print('mask',W,H,'time',round(time.time()-t))
