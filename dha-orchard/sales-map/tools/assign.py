import sys, json, math, numpy as np
from collections import defaultdict, Counter
T = sys.argv[1]
P = json.load(open(T + '/plots_raw.json'))
R = dict((i, r) for i, r in json.load(open(T + '/ocr_all.json')))
lab = np.load(T + '/regions_lab.npy'); K = 2.0
LABELS = {'E': (1233, 1200), 'C': (870, 1160), 'A': (572, 918), 'B': (1012, 1594),
          'F': (1931, 1495), 'D': (1533, 1415), 'G': (854, 1931), 'H': (1775, 1675)}
def region_at(x, y):
    X, Y = int(x * K), int(y * K)
    for rad in (0, 3, 6, 10, 15):
        win = lab[max(0, Y - rad):Y + rad + 1, max(0, X - rad):X + rad + 1]
        v = win[win > 0]
        if v.size: return Counter(v.tolist()).most_common(1)[0][0]
    return 0
REG = {b: region_at(*xy) for b, xy in LABELS.items()}
OUT = REG['A']
BLVD = [(1250, 1588), (1650, 1596), (1720, 1612), (1800, 1652), (1880, 1722), (1950, 1802), (2010, 1890)]
def south_of_blvd(x, y):
    for (x1, y1), (x2, y2) in zip(BLVD, BLVD[1:]):
        if x1 <= x <= x2:
            yy = y1 + (y2 - y1) * (x - x1) / (x2 - x1); return y > yy
    return y > BLVD[-1][1] if x > BLVD[-1][0] else y > BLVD[0][1]
def block_of(x, y):
    r = region_at(x, y)
    if r == REG['E']: return 'E'
    if r == REG['C']: return 'C'
    if r == REG['B']: return 'B'
    if r == REG['D']: return 'H' if south_of_blvd(x, y) else 'D'
    # outside the dashed borders
    if x > 1650: return 'F'
    if y > 1790 or (y > 1735 and 420 < x < 760): return 'G'
    return 'A'
# geometry helpers
for i, p in enumerate(P):
    r = np.array(p['rect']); e = [np.linalg.norm(r[(j + 1) % 4] - r[j]) for j in range(4)]
    p['short'] = min(e); p['long'] = max(e); p['i'] = i
    j = int(np.argmax(e)); v = r[(j + 1) % 4] - r[j]; p['axis'] = v / np.linalg.norm(v)
# drop junk: too small or long thin
P = [p for p in P if p['area'] >= 40 and p['long'] / max(p['short'], 0.1) < 3.2]
# street groups: plots touching side by side or back to back
cent = np.array([[p['cx'], p['cy']] for p in P])
idx = {p['i']: n for n, p in enumerate(P)}
parent = list(range(len(P)))
def find(a):
    while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
    return a
side = defaultdict(list)
for a in range(len(P)):
    d = np.hypot(*(cent - cent[a]).T)
    for b in np.where((d > 0) & (d < 1.35 * max(P[a]['long'], P[b if False else a]['long'])))[0]:
        b = int(b)
        if d[b] < 1.3 * P[a]['long']:
            parent[find(a)] = find(b)
        # side neighbour: displacement mostly along the plot's short axis
        disp = cent[b] - cent[a]
        along_long = abs(float(np.dot(disp, P[a]['axis'])))
        if d[b] < 1.3 * P[a]['short'] and along_long < 0.45 * P[a]['long']:
            side[a].append(b)
groups = defaultdict(list)
for a in range(len(P)): groups[find(a)].append(a)
# block per group by majority of member votes
blk = [None] * len(P)
for g, mem in groups.items():
    votes = Counter(block_of(P[m]['cx'], P[m]['cy']) for m in mem)
    if len(votes) > 1 and len(mem) > 40:
        for m in mem: blk[m] = block_of(P[m]['cx'], P[m]['cy'])
    else:
        b = votes.most_common(1)[0][0]
        for m in mem: blk[m] = b
# numbers
def cands(n):
    out = []
    for t, c in R.get(P[n]['i'], []):
        if t and t.isdigit() and 1 <= len(t) <= 4 and c >= 30 and int(t) > 0:
            out.append((int(t), c))
    return out
num = [None] * len(P); conf = [0] * len(P); how = [''] * len(P)
C = [cands(n) for n in range(len(P))]
for n, cs in enumerate(C):
    vals = set(v for v, _ in cs)
    if len(vals) == 1: num[n] = cs[0][0]; conf[n] = max(c for _, c in cs); how[n] = 'ocr'
for it in range(8):
    changed = 0
    for n, cs in enumerate(C):
        if num[n] is not None or not cs: continue
        nb = [num[b] for b in side[n] if num[b] is not None and blk[b] == blk[n]]
        best = None
        for v, c in cs:
            s = sum(1 for x in nb if abs(x - v) == 1) * 2 + sum(1 for x in nb if abs(x - v) == 2)
            key = (s, c)
            if best is None or key > best[0]: best = (key, v, c)
        if best and (best[0][0] > 0 or it == 7):
            num[n] = best[1]; conf[n] = best[2]; how[n] = 'ocr+nb'; changed += 1
    if not changed and it < 7: continue
# fill gaps from neighbours: a-1 and a+1 around
for it in range(3):
    for n in range(len(P)):
        if num[n] is not None: continue
        nb = sorted(num[b] for b in side[n] if num[b] is not None and blk[b] == blk[n])
        if len(nb) == 2 and nb[1] - nb[0] == 2: num[n] = nb[0] + 1; how[n] = 'inferred'
# duplicates per block
seen = defaultdict(list)
for n in range(len(P)):
    if num[n] is not None: seen[(blk[n], num[n])].append(n)
dups = {k: v for k, v in seen.items() if len(v) > 1}
def size_of(a):
    return '1K' if a >= 128 else '14M' if a >= 100 else '10M'
plots = []
for n, p in enumerate(P):
    poly = p['poly'] if 4 <= len(p['poly']) <= 6 else p['rect']
    plots.append({'b': blk[n], 'n': num[n], 'how': how[n], 'conf': round(conf[n]), 'size': size_of(p['area']),
                  'area': round(p['area'], 1), 'cx': round(p['cx'], 2), 'cy': round(p['cy'], 2),
                  'poly': [[round(x, 2), round(y, 2)] for x, y in poly],
                  'dup': (blk[n], num[n]) in dups})
json.dump(plots, open(T + '/plots_final.json', 'w'))
bc = Counter(p['b'] for p in plots)
print('plots', len(plots), 'by block', dict(sorted(bc.items())))
print('numbered', sum(1 for p in plots if p['n'] is not None), 'by how', Counter(p['how'] for p in plots))
print('duplicate keys', len(dups), 'plots in dups', sum(len(v) for v in dups.values()))
print('size by block', {b: dict(Counter(p['size'] for p in plots if p['b'] == b)) for b in sorted(bc)})
for b in sorted(bc):
    ns = sorted(p['n'] for p in plots if p['b'] == b and p['n'] is not None)
    if ns: print(b, 'range', ns[0], ns[-1], 'count', len(ns), 'distinct', len(set(ns)))
