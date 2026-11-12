import sys,json,math,numpy as np,cv2,pymupdf,pytesseract
from multiprocessing import Pool
DL=None;K=900/72
def init(src):
    global DL; DL=pymupdf.open(src)[0].get_displaylist()
def readings(img):
    out=[]
    for psm in (7,8):
        d=pytesseract.image_to_data(img,config=f'--psm {psm} -c tessedit_char_whitelist=0123456789',output_type=pytesseract.Output.DICT)
        for t,c in zip(d['text'],d['conf']):
            t=t.strip()
            if t.isdigit() and 1<=len(t)<=4 and float(c)>=50: out.append((int(t),float(c)))
    return out
def one(args):
    idx,p=args
    poly=np.array(p['poly'],float)
    from_rect=cv2.minAreaRect(poly.astype(np.float32))
    box=cv2.boxPoints(from_rect)
    x0,y0=poly.min(0)-1;x1,y1=poly.max(0)+1
    pix=DL.get_pixmap(matrix=pymupdf.Matrix(K,K),clip=pymupdf.Rect(x0,y0,x1,y1),alpha=False)
    im=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3)
    m=np.zeros(im.shape[:2],np.uint8);cv2.fillPoly(m,[((poly-[x0,y0])*K).astype(np.int32)],255);m=cv2.erode(m,np.ones((9,9),np.uint8))
    e=[(np.linalg.norm(box[(i+1)%4]-box[i]),i) for i in range(4)];L,i=max(e);v=box[(i+1)%4]-box[i];ang=math.degrees(math.atan2(v[1],v[0]))
    res=[]
    for thr in (100,140,175):
        dark=((im.max(axis=2)<thr).astype(np.uint8)*255)&m
        n,lab,st,_=cv2.connectedComponentsWithStats(dark,8)
        for j in range(1,n):
            if max(st[j][2],st[j][3])>0.8*max(dark.shape): dark[lab==j]=0
        txt=255-dark;h,w=txt.shape;c=(w/2,h/2)
        for a in (ang,ang+180,ang+90,ang-90):
            M=cv2.getRotationMatrix2D(c,a,1.0);cs,sn=abs(M[0,0]),abs(M[0,1]);nw,nh=int(h*sn+w*cs),int(h*cs+w*sn)
            M[0,2]+=nw/2-c[0];M[1,2]+=nh/2-c[1]
            rot=cv2.warpAffine(txt,M,(nw,nh),borderValue=255)
            ys,xs=np.where(rot<128)
            if len(xs)<20: continue
            crop=rot[max(0,ys.min()-8):ys.max()+9,max(0,xs.min()-8):xs.max()+9]
            crop=cv2.copyMakeBorder(crop,20,20,20,20,cv2.BORDER_CONSTANT,value=255)
            res+=readings(crop)
    return idx,res
if __name__=='__main__':
    src,inp,out=sys.argv[1],sys.argv[2],sys.argv[3]
    P=json.load(open(inp))
    targets=[(i,p) for i,p in enumerate(P) if p['how'] in ('corrected','inferred','','dup-cleared','cleared-high','read-single')]
    print('targets',len(targets))
    with Pool(4,initializer=init,initargs=(src,)) as pool: R=pool.map(one,targets,chunksize=4)
    json.dump(R,open(out,'w'));print('done',len(R))
