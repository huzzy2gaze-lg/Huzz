import sys,json,math,numpy as np,cv2,pytesseract
from multiprocessing import Pool
K=600/72;Y0=300
CFG='--psm 7 -c tessedit_char_whitelist=0123456789'
MM=None
def init(path):
    global MM; MM=np.load(path,mmap_mode='r')
def read(im):
    d=pytesseract.image_to_data(im,config=CFG,output_type=pytesseract.Output.DICT)
    best=('',-1.0)
    for t,c in zip(d['text'],d['conf']):
        t=t.strip()
        if t and float(c)>best[1]: best=(t,float(c))
    return best
def one(args):
    idx,p=args
    r=np.array(p['rect'])
    x0,y0=r.min(0)-1;x1,y1=r.max(0)+1
    X0,Y0p,X1,Y1p=int(x0*K),int((y0-Y0)*K),int(x1*K),int((y1-Y0)*K)
    if Y0p<0 or X0<0: return idx,[]
    dark=(np.array(MM[Y0p:Y1p,X0:X1])*255).astype(np.uint8)
    poly=((r-[x0,y0])*K).astype(np.int32)
    m=np.zeros_like(dark);cv2.fillPoly(m,[poly],255);m=cv2.erode(m,np.ones((7,7),np.uint8))
    dark=cv2.bitwise_and(dark,m)
    # drop long straight line remnants: remove components spanning most of the box
    n,lab,st,_=cv2.connectedComponentsWithStats(dark,8)
    for i in range(1,n):
        if max(st[i][2],st[i][3])>0.8*max(dark.shape): dark[lab==i]=0
    txt=255-dark
    e=[(np.linalg.norm(r[(i+1)%4]-r[i]),i) for i in range(4)]
    L,i=max(e);v=r[(i+1)%4]-r[i];ang=math.degrees(math.atan2(v[1],v[0]))
    h,w=txt.shape;c=(w/2,h/2);res=[]
    for a in (ang,ang+180,ang+90,ang-90):
        M=cv2.getRotationMatrix2D(c,a,1.0)
        cos,sin=abs(M[0,0]),abs(M[0,1]);nw,nh=int(h*sin+w*cos),int(h*cos+w*sin)
        M[0,2]+=nw/2-c[0];M[1,2]+=nh/2-c[1]
        rot=cv2.warpAffine(txt,M,(nw,nh),borderValue=255)
        ys,xs=np.where(rot<128)
        if len(xs)<15: res.append(['',-1.0]);continue
        crop=rot[max(0,ys.min()-6):ys.max()+7,max(0,xs.min()-6):xs.max()+7]
        crop=cv2.copyMakeBorder(crop,15,15,15,15,cv2.BORDER_CONSTANT,value=255)
        res.append(list(read(crop)))
    return idx,res
if __name__=='__main__':
    mask,plots,out=sys.argv[1],sys.argv[2],sys.argv[3]
    lim=int(sys.argv[4]) if len(sys.argv)>4 else None
    P=json.load(open(plots));items=list(enumerate(P))[:lim]
    with Pool(4,initializer=init,initargs=(mask,)) as pool:
        R=pool.map(one,items,chunksize=25)
    json.dump(R,open(out,'w'))
    print('done',len(R))
