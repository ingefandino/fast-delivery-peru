import { ZONES, REQ, PEDIDOS, START, SERV, LIMITE } from '../data';

export type Weight = 'valle' | 'punta';

export interface GraphEdge {
  u: string;
  v: string;
  valle: number;
  factor: number;
  av: string;
}

export function buildAdj(edges: GraphEdge[], w: Weight) {
  const adj: Record<string, Record<string, number>> = {};
  const nodes = ZONES.map((z) => z.key);
  for (const n of nodes) adj[n] = {};
  for (const e of edges) {
    const weight = w === 'valle' ? e.valle : Math.round(e.valle * e.factor * 10) / 10;
    adj[e.u][e.v] = weight;
    adj[e.v][e.u] = weight;
  }
  return { nodes, adj };
}

export function dijkstra(nodes: string[], adj: Record<string, Record<string, number>>, src: string) {
  const INF = Infinity;
  const d: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  for (const n of nodes) { d[n] = INF; prev[n] = null; }
  d[src] = 0;
  const vis = new Set<string>();
  const trace: { sel: string; d: Record<string, number | null> }[] = [];
  while (vis.size < nodes.length) {
    let u: string | null = null;
    for (const n of nodes) if (!vis.has(n) && (u === null || d[n] < d[u])) u = n;
    if (u === null) break;
    vis.add(u);
    for (const v in adj[u]) {
      if (!vis.has(v) && d[u] + adj[u][v] < d[v]) {
        d[v] = Math.round((d[u] + adj[u][v]) * 10) / 10;
        prev[v] = u;
      }
    }
    trace.push({ sel: u, d: Object.fromEntries(nodes.map((n) => [n, d[n] === INF ? null : d[n]])) });
  }
  return { d, prev, trace };
}

export function floyd(nodes: string[], adj: Record<string, Record<string, number>>) {
  const dist: Record<string, Record<string, number>> = {};
  for (const a of nodes) {
    dist[a] = {};
    for (const b of nodes) dist[a][b] = a === b ? 0 : adj[a][b] ?? Infinity;
  }
  for (const k of nodes)
    for (const i of nodes)
      for (const j of nodes)
        if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
  return dist;
}

export function bellmanFord(nodes: string[], edges: GraphEdge[], src: string, w: Weight) {
  const dist: Record<string, number> = {};
  for (const n of nodes) dist[n] = Infinity;
  dist[src] = 0;
  const elist = edges.map((e) => ({ u: e.u, v: e.v, w: w === 'valle' ? e.valle : Math.round(e.valle * e.factor * 10) / 10 }));
  for (let i = 0; i < nodes.length - 1; i++) {
    for (const e of elist) {
      if (dist[e.u] + e.w < dist[e.v]) dist[e.v] = Math.round((dist[e.u] + e.w) * 10) / 10;
      if (dist[e.v] + e.w < dist[e.u]) dist[e.u] = Math.round((dist[e.v] + e.w) * 10) / 10;
    }
  }
  return dist;
}

export function kruskal(nodes: string[], edges: GraphEdge[], w: Weight) {
  const sorted = [...edges].sort((a, b) => {
    const wa = w === 'valle' ? a.valle : a.valle * a.factor;
    const wb = w === 'valle' ? b.valle : b.valle * b.factor;
    return wa - wb;
  });
  const parent: Record<string, string> = {};
  for (const n of nodes) parent[n] = n;
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const res: GraphEdge[] = [];
  for (const e of sorted) {
    if (find(e.u) !== find(e.v)) {
      parent[find(e.u)] = find(e.v);
      res.push(e);
    }
  }
  return res;
}

export function prim(nodes: string[], edges: GraphEdge[], w: Weight) {
  const adj: Record<string, { v: string; w: number; e: GraphEdge }[]> = {};
  for (const n of nodes) adj[n] = [];
  for (const e of edges) {
    const weight = w === 'valle' ? e.valle : Math.round(e.valle * e.factor * 10) / 10;
    adj[e.u].push({ v: e.v, w: weight, e });
    adj[e.v].push({ v: e.u, w: weight, e });
  }
  const vis = new Set<string>();
  const res: GraphEdge[] = [];
  vis.add(nodes[0]);
  while (vis.size < nodes.length) {
    let best: { v: string; w: number; e: GraphEdge } | null = null;
    for (const u of vis) {
      for (const cand of adj[u]) {
        if (!vis.has(cand.v) && (best === null || cand.w < best.w)) {
          best = cand;
        }
      }
    }
    if (!best) break;
    vis.add(best.v);
    res.push(best.e);
  }
  return res;
}

export function evalWalk(walk: string[], w: Weight, edges: GraphEdge[]) {
  const adjMap: Record<string, Record<string, number>> = {};
  for (const n of ZONES.map((z) => z.key)) adjMap[n] = {};
  for (const e of edges) {
    const weight = w === 'valle' ? e.valle : Math.round(e.valle * e.factor * 10) / 10;
    adjMap[e.u][e.v] = weight;
    adjMap[e.v][e.u] = weight;
  }
  let t = 0;
  const times: Record<string, number> = {};
  const seen = new Set<string>();
  const stops: string[] = [];
  for (let i = 0; i < walk.length; i++) {
    if (i > 0) t += adjMap[walk[i - 1]][walk[i]];
    const n = walk[i];
    if (REQ.has(n) && !seen.has(n)) {
      t += SERV; seen.add(n); times[n] = Math.round(t * 10) / 10; stops.push(n);
    }
  }
  const res: Record<string, number> = {};
  for (const p of PEDIDOS) {
    res[p.id] = Math.round((times[p.delivery] - times[p.pickup]) * 10) / 10;
  }
  return { total: Math.round(t * 10) / 10, times, stops, perOrder: res };
}

export function precedenceOk(stops: string[]) {
  return PEDIDOS.every((p) => stops.indexOf(p.pickup) < stops.indexOf(p.delivery));
}

export function enumeratePaths(edges: GraphEdge[]) {
  const adjMap: Record<string, string[]> = {};
  for (const z of ZONES) adjMap[z.key] = [];
  for (const e of edges) { adjMap[e.u].push(e.v); adjMap[e.v].push(e.u); }
  const paths: string[][] = [];
  function dfs(path: string[]) {
    const set = new Set(path);
    if ([...REQ].every((r) => set.has(r))) { paths.push([...path]); return; }
    for (const v of adjMap[path[path.length - 1]] || []) {
      if (!set.has(v)) { path.push(v); dfs(path); path.pop(); }
    }
  }
  dfs([START]);
  const feas: any[] = [];
  for (const pth of paths) {
    const v = evalWalk(pth, 'valle', edges);
    const p = evalWalk(pth, 'punta', edges);
    if (precedenceOk(v.stops)) {
      feas.push({ path: pth, stops: v.stops, tv: v.total, tp: p.total, rv: v.perOrder, rp: p.perOrder, ok45: Object.values(p.perOrder).every((x) => x <= LIMITE), zonas: pth.length });
    }
  }
  return { paths, feas };
}

export function randomSim(edges: GraphEdge[], n = 1000) {
  const rand = seededRandom(2026);
  const sims: any[] = [];
  function randomRoute() {
    while (true) {
      const rest = [...REQ].filter((r) => r !== START);

      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      const order = [START, ...rest];
      if (precedenceOk(order)) return order;
    }
  }
  function shortestSegs(order: string[]) {

    const segs: string[][] = [];
    for (let i = 0; i < order.length - 1; i++) {

      segs.push(shortestPath(edges, order[i], order[i + 1], 'valle'));
    }
    return segs;
  }
  for (let k = 0; k < n; k++) {
    const order = randomRoute();
    const segs = shortestSegs(order);
    const walk = [START, ...segs.flatMap((s) => s.slice(1))];
    const tp = evalOrder(order, segs, 'punta', edges);
    const tv = evalOrder(order, segs, 'valle', edges);
    sims.push({ order, walk, tp: tp.total, tv: tv.total, rp: tp.perOrder, rv: tv.perOrder, ok45: Object.values(tp.perOrder).every((x) => (x as number) <= LIMITE), ok45v: Object.values(tv.perOrder).every((x) => (x as number) <= LIMITE), zonas: walk.length, repite: walk.length !== new Set(walk).size });
  }
  const meanTp = sims.reduce((a, s) => a + s.tp, 0) / sims.length;
  const rep = sims.reduce((best, s) => (best === null || Math.abs(s.tp - meanTp) < Math.abs(best.tp - meanTp) ? s : best), null as any);
  const sd = Math.sqrt(sims.reduce((a, s) => a + (s.tp - meanTp) ** 2, 0) / sims.length);
  return {
    n: sims.length,
    mean_tp: Math.round(meanTp * 10) / 10,
    min_tp: Math.min(...sims.map((s) => s.tp)),
    max_tp: Math.max(...sims.map((s) => s.tp)),
    sd_tp: Math.round(sd * 10) / 10,
    mean_tv: Math.round((sims.reduce((a, s) => a + s.tv, 0) / sims.length) * 10) / 10,
    pct_ok45: Math.round((100 * sims.filter((s) => s.ok45).length) / sims.length * 10) / 10,
    pct_ok45v: Math.round((100 * sims.filter((s) => s.ok45v).length) / sims.length * 10) / 10,
    mean_zonas: Math.round((sims.reduce((a, s) => a + s.zonas, 0) / sims.length) * 10) / 10,
    pct_repite: Math.round((100 * sims.filter((s) => s.repite).length) / sims.length * 10) / 10,
    tps: sims.map((s) => s.tp),
    rep,
  };
}

function evalOrder(order: string[], segs: string[][], w: Weight, edges: GraphEdge[]) {
  const adjMap: Record<string, Record<string, number>> = {};
  for (const z of ZONES) adjMap[z.key] = {};
  for (const e of edges) {
    const weight = w === 'valle' ? e.valle : Math.round(e.valle * e.factor * 10) / 10;
    adjMap[e.u][e.v] = weight; adjMap[e.v][e.u] = weight;
  }
  let t = SERV;
  const times: Record<string, number> = { [order[0]]: t };
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const stop = order[i + 1];
    t += seg.slice(1).reduce((a, _, idx) => a + adjMap[seg[idx]][seg[idx + 1]], 0) + SERV;
    times[stop] = Math.round(t * 10) / 10;
  }
  const perOrder: Record<string, number> = {};
  for (const p of PEDIDOS) perOrder[p.id] = Math.round((times[p.delivery] - times[p.pickup]) * 10) / 10;
  return { total: Math.round(t * 10) / 10, perOrder };
}

function shortestPath(edges: GraphEdge[], src: string, dst: string, w: Weight): string[] {
  const adj: Record<string, { v: string; w: number }[]> = {};
  for (const z of ZONES) adj[z.key] = [];
  for (const e of edges) {
    const weight = w === 'valle' ? e.valle : Math.round(e.valle * e.factor * 10) / 10;
    adj[e.u].push({ v: e.v, w: weight }); adj[e.v].push({ v: e.u, w: weight });
  }
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  for (const z of ZONES) { dist[z.key] = Infinity; prev[z.key] = null; }
  dist[src] = 0;
  const vis = new Set<string>();
  while (vis.size < ZONES.length) {
    let u: string | null = null;
    for (const z of ZONES) if (!vis.has(z.key) && (u === null || dist[z.key] < dist[u])) u = z.key;
    if (u === null || dist[u] === Infinity) break;
    vis.add(u);
    for (const c of adj[u]) {
      if (!vis.has(c.v) && dist[u] + c.w < dist[c.v]) { dist[c.v] = dist[u] + c.w; prev[c.v] = u; }
    }
  }
  const path: string[] = [];
  let cur: string | null = dst;
  while (cur) { path.unshift(cur); cur = prev[cur]; }
  return path.length && path[0] === src ? path : [src, dst];
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}