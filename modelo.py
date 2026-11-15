import os
import json, math, random, itertools, statistics
import networkx as nx

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(PROJECT_ROOT, 'salida') + os.sep

# ---------- Conjunto de zonas y posiciones relativas (plano conceptual, no geográfico)
Z = {
    'SM': ('San Miguel', (0, 4)),
    'PL': ('Pueblo Libre', (2, 4)),
    'JM': ('Jesús María', (3, 6)),
    'LI': ('Lince', (5, 5)),
    'SI': ('San Isidro', (6, 3)),
    'MI': ('Miraflores', (5, 0)),
    'SU': ('Surco', (9, 1)),
    'LM': ('La Molina', (11, 3)),
}
# ---------- Aristas: (u, v, tiempo base en hora valle [min], factor de congestión en hora punta, avenida)
E = [
    ('SM', 'PL', 6, 1.5, 'Av. La Marina'),
    ('SM', 'JM', 9, 1.3, 'Av. Brasil'),
    ('PL', 'JM', 5, 1.2, 'Av. Sucre'),
    ('PL', 'LI', 7, 1.3, 'Av. Mariano Cornejo'),
    ('JM', 'LI', 4, 1.4, 'Av. Cuba'),
    ('JM', 'SI', 8, 1.6, 'Av. Salaverry'),
    ('LI', 'SI', 5, 1.5, 'Av. Arequipa'),
    ('LI', 'MI', 9, 1.4, 'Av. Petit Thouars'),
    ('SI', 'MI', 6, 1.6, 'Vía Expresa'),
    ('SI', 'SU', 10, 2.0, 'Av. Javier Prado'),
    ('MI', 'SU', 8, 1.5, 'Av. Benavides'),
    ('SU', 'LM', 7, 1.4, 'Av. Primavera'),
    ('SI', 'LM', 11, 2.6, 'Av. Javier Prado Este'),
]
SERV = 2  # minutos de servicio por parada (recojo o entrega)
LIMITE = 45

G = nx.Graph()
for k, (n, p) in Z.items():
    G.add_node(k, nombre=n, pos=p)
for u, v, t, f, av in E:
    G.add_edge(u, v, valle=t, punta=round(t * f, 1), f=f, av=av)

nodes = list(Z.keys())

# ---------- Estructura básica
deg = dict(G.degree())
odd = [n for n in nodes if deg[n] % 2]
adj = [[1 if G.has_edge(a, b) else 0 for b in nodes] for a in nodes]
# Distancia euclidiana (geometría) de cada arista en el plano
def dist(a, b):
    (x1, y1), (x2, y2) = Z[a][1], Z[b][1]
    return math.hypot(x2 - x1, y2 - y1)

# ---------- Algoritmo 1: Dijkstra paso a paso desde Lince (hora punta)
def dijkstra_trace(src, w):
    INF = float('inf')
    d = {n: INF for n in nodes}; prev = {n: None for n in nodes}; d[src] = 0
    vis = set(); trace = []
    while len(vis) < len(nodes):
        u = min((n for n in nodes if n not in vis), key=lambda n: d[n])
        vis.add(u)
        for v in G[u]:
            if v not in vis and d[u] + G[u][v][w] < d[v]:
                d[v] = round(d[u] + G[u][v][w], 1); prev[v] = u
        trace.append({'sel': u, 'd': {n: (None if d[n] == INF else d[n]) for n in nodes}})
    return d, prev, trace

d_lp, prev_lp, trace = dijkstra_trace('LM', 'punta')

# ---------- Algoritmo 2: Floyd-Warshall (todas las parejas) en valle y punta
fw_v = nx.floyd_warshall(G, weight='valle')
fw_p = nx.floyd_warshall(G, weight='punta')
# ---------- Algoritmo 3: Bellman-Ford (verificación)
bf_p = nx.single_source_bellman_ford_path_length(G, 'LM', weight='punta')
check = all(abs(bf_p[n] - fw_p['LM'][n]) < 1e-9 and abs(d_lp[n] - fw_p['LM'][n]) < 0.051 for n in nodes)

# ---------- Árbol de expansión mínima (Kruskal y Prim)
mst_k = nx.minimum_spanning_tree(G, weight='punta', algorithm='kruskal')
mst_p = nx.minimum_spanning_tree(G, weight='punta', algorithm='prim')
mst_edges = sorted([(u, v, G[u][v]['punta']) for u, v in mst_k.edges()], key=lambda x: x[2])
mst_w = round(sum(x[2] for x in mst_edges), 1)
tot_w = round(sum(G[u][v]['punta'] for u, v in G.edges()), 1)

# ---------- Escenario: 3 pedidos
PED = [('O1', 'LM', 'MI'), ('O2', 'SI', 'JM'), ('O3', 'PL', 'LI')]
REQ = {'LM', 'MI', 'SI', 'JM', 'PL', 'LI'}
START = 'LM'

def eval_walk(walk, w):
    """walk: lista de nodos recorridos (pueden incluir zonas de paso). Paradas = primera visita de cada zona requerida."""
    t = 0.0; times = {}; stops = []
    seen = set()
    for i, n in enumerate(walk):
        if i > 0:
            t += G[walk[i - 1]][n][w]
        if n in REQ and n not in seen:
            t += SERV; seen.add(n); times[n] = t; stops.append(n)
    res = {}
    for o, p, dlv in PED:
        res[o] = round(times[dlv] - (times[p]), 1)  # desde que sale del restaurante hasta la entrega
    return round(t, 1), res, stops

def precedence_ok(stops):
    return all(stops.index(p) < stops.index(d) for _, p, d in PED)


paths = []
def dfs(path):
    if REQ.issubset(path):
        paths.append(list(path)); return
    for v in G[path[-1]]:
        if v not in path:
            path.append(v); dfs(path); path.pop()
dfs([START])
feas = []
for pth in paths:
    tv, rv, st = eval_walk(pth, 'valle')
    tp, rp, _ = eval_walk(pth, 'punta')
    if precedence_ok(st):
        feas.append({'path': pth, 'stops': st, 'tv': tv, 'tp': tp, 'rv': rv, 'rp': rp,
                     'ok45': all(x <= LIMITE for x in rp.values()), 'zonas': len(pth)})

# Ruta más corta (clásica, sin congestión): mínimo tiempo en valle
shortest = min(feas, key=lambda r: (r['tv'], r['tp']))
# Ruta propuesta: mínimo tiempo en punta cumpliendo 45 min por pedido
prop_cands = [r for r in feas if r['ok45']]
proposed = min(prop_cands, key=lambda r: r['tp'])

# Ruta aleatoria actual: orden aleatorio de paradas (respetando recojo antes de entrega) unido por caminos más cortos en valle
random.seed(2026)
def random_route():
    while True:
        order = [START] + random.sample(sorted(REQ - {START}), 5)
        if precedence_ok(order):
            break
    segs = [nx.shortest_path(G, a, b, weight='valle') for a, b in zip(order, order[1:])]
    return order, segs
def eval_order(order, segs, w):
    t = SERV; times = {order[0]: t}
    for stop, seg in zip(order[1:], segs):
        t += sum(G[a][b][w] for a, b in zip(seg, seg[1:])) + SERV
        times[stop] = t
    return round(t, 1), {o: round(times[d] - times[p], 1) for o, p, d in PED}
sims = []
for _ in range(1000):
    order, segs = random_route()
    walk = [START] + [n for sg in segs for n in sg[1:]]
    tp, rp = eval_order(order, segs, 'punta')
    tv, rv = eval_order(order, segs, 'valle')
    sims.append({'order': order, 'walk': walk, 'tp': tp, 'tv': tv, 'rp': rp, 'rv': rv,
                 'ok45': all(x <= LIMITE for x in rp.values()), 'ok45v': all(x <= LIMITE for x in rv.values()),
                 'zonas': len(walk), 'repite': len(walk) != len(set(walk))})
mean_tp = statistics.mean(s['tp'] for s in sims)
rep = min(sims, key=lambda s: abs(s['tp'] - mean_tp))

out = {
    'Z': {k: {'nombre': v[0], 'pos': v[1], 'grado': deg[k]} for k, v in Z.items()},
    'E': [{'u': u, 'v': v, 'valle': t, 'f': f, 'punta': round(t * f, 1), 'av': av, 'dist': round(dist(u, v), 2)} for u, v, t, f, av in E],
    'odd': odd, 'adj': adj, 'nodes': nodes,
    'trace': trace, 'dijkstra': {'d': d_lp, 'prev': prev_lp}, 'check': check,
    'fw_v': {a: {b: fw_v[a][b] for b in nodes} for a in nodes},
    'fw_p': {a: {b: round(fw_p[a][b], 1) for b in nodes} for a in nodes},
    'mst': mst_edges, 'mst_w': mst_w, 'tot_w': tot_w, 'mst_same': sorted(map(sorted, mst_k.edges())) == sorted(map(sorted, mst_p.edges())),
    'n_paths': len(paths), 'feas': feas, 'n_feas': len(feas), 'n_ok45': len(prop_cands),
    'shortest': shortest, 'proposed': proposed, 'random_rep': rep,
    'sim': {
        'n': len(sims), 'mean_tp': round(mean_tp, 1), 'min_tp': min(s['tp'] for s in sims), 'max_tp': max(s['tp'] for s in sims),
        'sd_tp': round(statistics.pstdev(s['tp'] for s in sims), 1),
        'mean_tv': round(statistics.mean(s['tv'] for s in sims), 1),
        'pct_ok45': round(100 * sum(s['ok45'] for s in sims) / len(sims), 1),
        'pct_ok45v': round(100 * sum(s['ok45v'] for s in sims) / len(sims), 1),
        'mean_zonas': round(statistics.mean(s['zonas'] for s in sims), 1),
        'pct_repite': round(100 * sum(s['repite'] for s in sims) / len(sims), 1),
        'tps': [s['tp'] for s in sims],
    },
}
# Hamiltoniano / euleriano
ham = None
for perm in itertools.permutations(nodes):
    if all(G.has_edge(a, b) for a, b in zip(perm, perm[1:])):
        ham = list(perm); break
out['ham_path'] = ham
out['euler_path'] = nx.has_eulerian_path(G)
os.makedirs(OUT, exist_ok=True)
json.dump(out, open(OUT + 'resultados.json', 'w'), ensure_ascii=False, indent=1)
print('paths', len(paths), 'feas', len(feas), 'ok45', len(prop_cands), 'check', check)
print('odd', odd, 'deg', deg)
print('shortest', shortest)
print('proposed', proposed)
print('random rep', rep['order'], rep['walk'], rep['tp'], rep['tv'], rep['rp'], rep['rv'], rep['ok45'])
print('ham', out['ham_path'], 'euler', out['euler_path'])
print({k: v for k, v in out['sim'].items() if k != 'tps'})
print('mst', mst_edges, mst_w, tot_w, out['mst_same'])
print('dijkstra', d_lp)
