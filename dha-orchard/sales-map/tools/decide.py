import sys,json
from collections import Counter,defaultdict
T=sys.argv[1];P=json.load(open(T+'/plots_final4.json'));V=dict((i,r) for i,r in json.load(open(T+'/verify.json')))
stats=Counter()
used=defaultdict(set)
for p in P:
    if p['n'] and p['how']=='read': used[p['b']].add(p['n'])
for i,p in enumerate(P):
    if i not in V: continue
    rd=V[i];vals=Counter(v for v,c in rd);strong=Counter(v for v,c in rd if c>=75)
    h=p['how'];n=p['n']
    if h in ('corrected','inferred','read-single'):
        if n and vals.get(n,0)>=1 and n not in used[p['b']]:
            p['how']='read-2nd';used[p['b']].add(n);stats[h+'->confirmed']+=1
        else:
            p['n']=None;p['how']='not-read';stats[h+'->removed']+=1
    else:
        best=[v for v,c in strong.most_common() if c>=2 and v not in used[p['b']]]
        if best:
            p['n']=best[0];p['how']='read-2nd';used[p['b']].add(best[0]);stats['unread->read']+=1
        else:
            p['n']=None;p['how']='not-read';stats['unread->stays unread']+=1
print(dict(stats))
json.dump(P,open(T+'/plots_final5.json','w'))
tot=Counter(p['b'] for p in P);num=Counter(p['b'] for p in P if p['n'])
print({b:(tot[b],num[b]) for b in sorted(tot)})
print('total',len(P),'numbered',sum(num.values()),'not read',len(P)-sum(num.values()))
