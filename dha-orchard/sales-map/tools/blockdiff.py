import sys,json,numpy as np
from collections import Counter,defaultdict
T=sys.argv[1];P=json.load(open(T+'/plots_final5.json'))
src=open(T+'/refine2.py').read()
ns={}
exec(src[src.index('lab = np.load'):src.index('lab = np.load')+60].split('\n')[0],{'np':np,'T':T},ns)
lab=ns['lab'];KR=2.0
g={'np':np,'Counter':Counter,'lab':lab,'KR':KR}
a=src.index('LABELS = {');b=src.index('for p in P: p[\'b\'] = block_of')
exec(src[a:b],g)
diff=[(i,p['b'],g['block_of'](p['cx'],p['cy'])) for i,p in enumerate(P)]
diff=[d for d in diff if d[1]!=d[2]]
print('plots whose block differs from the plain border rule:',len(diff))
grp=defaultdict(list)
for i,b,geo in diff: grp[(geo,b,P[i]['row'])].append(i)
for (geo,b,r),mem in sorted(grp.items(),key=lambda t:-len(t[1])):
    xs=[P[i]['cx'] for i in mem];ys=[P[i]['cy'] for i in mem];nums=sorted(P[i]['n'] for i in mem if P[i]['n'])
    print(f'border rule {geo} -> now {b}: {len(mem)} plots at x {min(xs):.0f}-{max(xs):.0f}, y {min(ys):.0f}-{max(ys):.0f}, numbers {nums[:8]}')
