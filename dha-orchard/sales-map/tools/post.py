import sys,json,numpy as np
from collections import defaultdict,Counter
T=sys.argv[1];P=json.load(open(T+'/plots_final3.json'))
def core_max(b):
    ns=sorted(p['n'] for p in P if p['b']==b and p['n'])
    return ns[int(len(ns)*0.98)] if ns else 0
cm={b:core_max(b) for b in 'ABCDEFGH'}
cent=np.array([[p['cx'],p['cy']] for p in P])
rows=defaultdict(list)
for i,p in enumerate(P): rows[p['row']].append(i)
moved=0
cleared=0
for p in P:
    if p['n'] and p['how']=='read-single' and p['n']>1.15*cm[p['b']]:
        p['n']=None;p['how']='cleared-high';cleared+=1
print('rows moved',moved,'single reads cleared',cleared)
json.dump(P,open(T+'/plots_final4.json','w'))
for b in 'ABCDEFGH':
    ps=[o for o in P if o['b']==b];ns=sorted(o['n'] for o in ps if o['n'])
    print(b,'plots',len(ps),'numbered',len(ns),'max',max(ns),'unnumbered',sum(1 for o in ps if not o['n']),'dups',len(ns)-len(set(ns)))
print('total',len(P),'numbered',sum(1 for p in P if p['n']))
