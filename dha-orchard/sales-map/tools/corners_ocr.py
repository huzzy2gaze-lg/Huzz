import sys,json,numpy as np,cv2,pytesseract,os
os.environ['OMP_THREAD_LIMIT']='1'
from multiprocessing import Pool
T=sys.argv[1];K=600/72;YO=300
CFG='--psm 7 -c tessedit_char_whitelist=0123456789'
MM=None
import pymupdf
def init():
    global MM;MM=pymupdf.open(T+'/../lop/LOP-PR.pdf')[0]
def read(im):
    d=pytesseract.image_to_data(im,config=CFG,output_type=pytesseract.Output.DICT)
    best=('',-1.0)
    for t,c in zip(d['text'],d['conf']):
        t=t.strip()
        if t and float(c)>best[1]:best=(t,float(c))
    return best
def one(a):
    i,c=a;r=np.array(c['poly'])
    x0,y0=r.min(0)-1;x1,y1=r.max(0)+1
    pix=MM.get_pixmap(matrix=pymupdf.Matrix(K,K),clip=pymupdf.Rect(x0,y0,x1,y1),alpha=False)
    rgb=np.frombuffer(pix.samples,np.uint8).reshape(pix.h,pix.w,3)
    dark=((rgb.max(2)<110)*255).astype(np.uint8)
    m=np.zeros_like(dark);cv2.fillPoly(m,[((r-[x0,y0])*pix.w/(x1-x0)).astype(np.int32)],255);m=cv2.erode(m,np.ones((9,9),np.uint8))
    dark=cv2.bitwise_and(dark,m)
    n,lab,st,_=cv2.connectedComponentsWithStats(dark,8)
    for j in range(1,n):
        if max(st[j][2],st[j][3])>0.6*max(dark.shape) or st[j][4]<6: dark[lab==j]=0
    txt=255-dark;h,w=txt.shape;cc=(w/2,h/2);res=[]
    for ang in range(0,360,15):
        M=cv2.getRotationMatrix2D(cc,ang,1.0);cs,sn=abs(M[0,0]),abs(M[0,1]);nw,nh=int(h*sn+w*cs),int(h*cs+w*sn)
        M[0,2]+=nw/2-cc[0];M[1,2]+=nh/2-cc[1]
        rot=cv2.warpAffine(txt,M,(nw,nh),borderValue=255)
        ys,xs=np.where(rot<128)
        if len(xs)<15:continue
        if (ys.max()-ys.min())>(xs.max()-xs.min()):continue     # text lies flat when read
        crop=cv2.copyMakeBorder(rot[max(0,ys.min()-6):ys.max()+7,max(0,xs.min()-6):xs.max()+7],15,15,15,15,cv2.BORDER_CONSTANT,value=255)
        t,cf=read(crop)
        if t:res.append((t,cf,ang))
    res.sort(key=lambda z:-z[1]);return i,res[:6]
if __name__=='__main__':
    C=json.load(open(T+'/corner_cands.json'))
    with Pool(4,initializer=init) as p:R=dict(p.map(one,list(enumerate(C))))
    for i,c in enumerate(C):c['ocr']=R[i]
    json.dump(C,open(T+'/corner_cands.json','w'))
    for i,c in enumerate(C):print(i,c['cx'],c['cy'],c['area'],R[i][:4])
