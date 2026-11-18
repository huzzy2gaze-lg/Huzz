import sys, json, math, numpy as np
from collections import defaultdict, Counter
T = sys.argv[1]
RAW = json.load(open(T + '/plots_raw.json'))
OCR = dict((i, r) for i, r in json.load(open(T + '/ocr_all.json')))
EX = json.load(open(T + '/plots_extra.json'))
OCRX = dict((i, r) for i, r in json.load(open(T + '/ocr_extra.json')))
lab = np.load(T + '/regions_lab.npy'); KR = 2.0

# ---------- candidates ----------
P = []
for i, p in enumerate(RAW):
    if p['area'] < 40: continue
    p = dict(p); p['ocr'] = OCR.get(i, []); P.append(p)
for i, p in enumerate(EX):
    r = OCRX.get(i, [])
    if any(t and t.isdigit() and c >= 60 and int(t) <= 1100 for t, c in r):
        p = dict(p); p['ocr'] = r; P.append(p)
for p in P:
    r = np.array(p['rect']); e = [np.linalg.norm(r[(j + 1) % 4] - r[j]) for j in range(4)]
    p['short'] = min(e); p['long'] = max(e)
    j = int(np.argmax(e)); v = r[(j + 1) % 4] - r[j]; p['axis'] = v / np.linalg.norm(v)
    p['cands'] = {}
    for t, c in p['ocr']:
        if t and t.isdigit() and 1 <= len(t) <= 4 and c >= 30 and int(t) > 0:
            v = int(t); p['cands'][v] = max(p['cands'].get(v, 0), c)
P = [p for p in P if p['long'] / max(p['short'], 0.1) < 4.6]
N = len(P)
cent = np.array([[p['cx'], p['cy']] for p in P])

# ---------- initial block from plan borders ----------
LABELS = {'E': (1233, 1200), 'C': (870, 1160), 'A': (572, 918), 'B': (1012, 1594),
          'F': (1931, 1495), 'D': (1533, 1415), 'G': (854, 1931), 'H': (1775, 1675)}
def region_at(x, y):
    X, Y = int(x * KR), int(y * KR)
    for rad in (0, 3, 6, 10, 15):
        win = lab[max(0, Y - rad):Y + rad + 1, max(0, X - rad):X + rad + 1]
        v = win[win > 0]
        if v.size: return Counter(v.tolist()).most_common(1)[0][0]
    return 0
REG = {b: region_at(*xy) for b, xy in LABELS.items()}
BLVD = [(1250, 1588), (1650, 1596), (1720, 1612), (1800, 1652), (1880, 1722), (1950, 1802), (2010, 1890)]
def south_of_blvd(x, y):
    for (x1, y1), (x2, y2) in zip(BLVD, BLVD[1:]):
        if x1 <= x <= x2: return y > y1 + (y2 - y1) * (x - x1) / (x2 - x1)
    return y > BLVD[-1][1] if x > BLVD[-1][0] else y > BLVD[0][1]
def block_of(x, y):
    r = region_at(x, y)
    if r == REG['E']: return 'E'
    if r == REG['C']: return 'C'
    if r == REG['B']: return 'B'
    if r == REG['D']: return 'H' if south_of_blvd(x, y) else 'D'
    if x > 1650: return 'F'
    if y > 1790 or (y > 1735 and 420 < x < 760): return 'G'
    return 'A'
for p in P: p['b'] = block_of(p['cx'], p['cy'])

# ---------- rows: side-by-side neighbours ----------
nbr = defaultdict(set)
for a in range(N):
    d = np.hypot(*(cent - cent[a]).T)
    for b in np.where((d > 0) & (d < 1.45 * P[a]['short']))[0]:
        b = int(b)
        disp = cent[b] - cent[a]
        if abs(float(np.dot(disp, P[a]['axis']))) < 0.42 * P[a]['long'] and abs(P[a]['long'] - P[b]['long']) < 0.35 * P[a]['long']:
            nbr[a].add(b); nbr[b].add(a)
seen = [False] * N; rows = []
for s in range(N):
    if seen[s]: continue
    comp = []; st = [s]; seen[s] = True
    while st:
        u = st.pop(); comp.append(u)
        for v in nbr[u]:
            if not seen[v]: seen[v] = True; st.append(v)
    rows.append(comp)
def order_row(comp):
    if len(comp) <= 2:
        return sorted(comp, key=lambda u: tuple(cent[u]))
    ends = [u for u in comp if len(nbr[u] & set(comp)) == 1]
    if len(ends) == 2:
        path = [ends[0]]; prev = None; cur = ends[0]; ok = True
        while True:
            nx = [v for v in nbr[cur] if v != prev and v in comp]
            if not nx: break
            if len(nx) > 1: ok = False; break
            prev, cur = cur, nx[0]; path.append(cur)
        if ok and len(path) == len(comp): return path
    pts = cent[comp] - cent[comp].mean(0)
    u, s, vt = np.linalg.svd(pts, full_matrices=False)
    return [comp[i] for i in np.argsort(pts @ vt[0])]
rows = [order_row(r) for r in rows]

# ---------- fit numbering per row ----------
num = [None] * N; how = [''] * N
def fit_row(row):
    L = len(row); free = set(range(L)); segs = []
    while True:
        best = None
        hyps = set()
        for i in free:
            for v in P[row[i]]['cands']:
                for s in (1, -1): hyps.add((v - s * i, s))
        for a0, s in hyps:
            inl = [j for j in free if (a0 + s * j) in P[row[j]]['cands']]
            if len(inl) < 2: continue
            score = (len(inl), sum(P[row[j]]['cands'][a0 + s * j] for j in inl))
            if best is None or score > best[0]: best = (score, a0, s, inl)
        if not best: break
        _, a0, s, inl = best
        lo, hi = min(inl), max(inl)
        # extend one step past the ends when that plot has no confident other reading
        rng = [j for j in range(lo, hi + 1) if j in free]
        if len(inl) / max(1, len(rng)) < 0.45: rng = inl
        for j in (lo - 1, hi + 1):
            if 0 <= j < L and j in free and a0 + s * j > 0:
                c = P[row[j]]['cands']
                if not c or max(c.values()) < 70: rng.append(j)
        for j in rng:
            v = a0 + s * j
            if v <= 0: continue
            num[row[j]] = v
            how[row[j]] = 'read' if v in P[row[j]]['cands'] else ('corrected' if P[row[j]]['cands'] else 'inferred')
            free.discard(j)
        segs.append((a0, s, rng))
        SEGC[0] += 1
        for j in rng: seg_of[row[j]] = ('s', SEGC[0])
    for j in free:
        c = P[row[j]]['cands']
        if c:
            v, cf = max(c.items(), key=lambda t: t[1])
            if cf >= 60: num[row[j]] = v; how[row[j]] = 'read-single'
    return segs
row_of = {}; seg_of = {}; SEGC = [0]
for ri, row in enumerate(rows):
    fit_row(row)
    for u in row: row_of[u] = ri

# ---------- block per numbered run (segment): majority, then fix by numbering conflicts ----------
groups = defaultdict(list)
for u in range(N): groups[seg_of.get(u, ('u', u))].append(u)
GROUPS = list(groups.values())
group_of = {}
for gi, g in enumerate(GROUPS):
    for u in g: group_of[u] = gi
for g in GROUPS:
    votes = Counter(P[u]['b'] for u in g)
    if len(votes) > 1:
        maj = votes.most_common(1)[0][0]
        for u in g: P[u]['b'] = maj
def conflicts():
    used = defaultdict(list)
    for u in range(N):
        if num[u] is not None: used[(P[u]['b'], num[u])].append(u)
    return used
for it in range(6):
    used = conflicts(); moved = 0
    bad_rows = Counter(group_of[u] for k, v in used.items() if len(v) > 1 for u in v)
    for ri, cnt in bad_rows.most_common():
        row = GROUPS[ri]; b0 = P[row[0]]['b']
        nums = [num[u] for u in row if num[u] is not None]
        if not nums: continue
        # rows whose numbers clash more inside their own block than the other copy are candidates to move
        near = Counter()
        c = cent[row].mean(0)
        d = np.hypot(*(cent - c).T)
        for v in np.where(d < 80)[0]:
            if P[v]['b'] != b0: near[P[v]['b']] += 1
        def clash(b):
            return sum(1 for n in nums if any(u2 not in row for u2 in used.get((b, n), [])))
        cur = clash(b0)
        best = min(near, key=lambda b: (clash(b), -near[b]), default=None)
        if best and clash(best) < cur and cur >= max(1, len(nums) // 3):
            for u in row: P[u]['b'] = best
            moved += 1; used = conflicts()
    if not moved: break
# remaining duplicates: keep the stronger reading, clear the other
used = conflicts()
for (b, n), mem in used.items():
    if len(mem) < 2: continue
    rank = sorted(mem, key=lambda u: (how[u] == 'read', P[u]['cands'].get(n, 0), len(rows[row_of[u]])), reverse=True)
    for u in rank[1:]: num[u] = None; how[u] = 'dup-cleared'

# ---------- output ----------
def size_of(a): return '1K' if a >= 128 else '14M' if a >= 100 else '10M'
out = []
for u, p in enumerate(P):
    poly = p['poly'] if 4 <= len(p['poly']) <= 7 else p['rect']
    out.append({'b': p['b'], 'n': num[u], 'how': how[u], 'size': size_of(p['area']), 'area': round(p['area'], 1),
                'cx': round(p['cx'], 2), 'cy': round(p['cy'], 2), 'poly': [[round(x, 2), round(y, 2)] for x, y in poly],
                'row': row_of[u], 'extra': bool(p.get('extra'))})
json.dump(out, open(T + '/plots_final3.json', 'w'))
print('plots', N, 'rows', len(rows), 'numbered', sum(1 for n in num if n is not None))
print(Counter(how))
for b in 'ABCDEFGH':
    ps = [o for o in out if o['b'] == b]; ns = sorted(o['n'] for o in ps if o['n'] is not None)
    mx = max(ns) if ns else 0
    miss = [i for i in range(1, mx + 1) if i not in set(ns)]
    print(b, 'plots', len(ps), 'numbered', len(ns), 'max', mx, 'missing-in-sequence', len(miss), 'unnumbered', sum(1 for o in ps if o['n'] is None))
