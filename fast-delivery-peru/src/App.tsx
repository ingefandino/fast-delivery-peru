import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZONES, EDGES, PEDIDOS, REQ, START, SERV, LIMITE, punta, euclid, zoneByName } from './data';
import {
  buildAdj, dijkstra, floyd, bellmanFord, kruskal, prim, enumeratePaths, randomSim,
  type Weight, type GraphEdge,
} from './lib/algorithms';

const SCALE = 85;

function toNode(z: { key: string; name: string; pos: [number, number] }): Node {
  return {
    id: z.key,
    type: 'zone',
    position: { x: z.pos[0] * SCALE, y: z.pos[1] * SCALE },
    data: { key: z.key, name: z.name, pos: z.pos },
  };
}

function toEdge(e: { id: string; u: string; v: string; valle: number; factor: number; av: string }): Edge {
  return {
    id: e.id,
    source: e.u,
    target: e.v,
    label: `${e.av} · ${e.valle}/${(Math.round(e.valle * e.factor * 10) / 10).toFixed(1)} min`,
    data: { u: e.u, v: e.v, valle: e.valle, factor: e.factor, av: e.av },
    animated: false,
  };
}

function ZoneNode({ data, selected }: any) {
  return (
    <div className={`zone-node ${selected ? 'sel' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="zone-key">{data.key}</div>
      <div className="zone-name">{data.name}</div>
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Left} />
      <Handle type="target" position={Position.Right} />
    </div>
  );
}

const nodeTypes: NodeTypes = { zone: ZoneNode };

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(ZONES.map(toNode));
  const [edges, setEdges, onEdgesChange] = useEdgesState(EDGES.map(toEdge));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [weight, setWeight] = useState<Weight>('punta');
  const [source, setSource] = useState<string>(START);
  const [result, setResult] = useState<any>(null);
  const [trace, setTrace] = useState<any>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightEdges, setHighlightEdges] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'inspector' | 'result' | 'trace'>('inspector');



  const onConnect = useCallback((conn: Connection) => {
    setEdges((eds) => addEdge({ ...conn, id: `${conn.source}-${conn.target}`, label: 'nueva', data: { u: conn.source!, v: conn.target!, valle: 5, factor: 1.2, av: 'Nueva avenida' } }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: any, n: Node) => { setSelectedNode(n); setSelectedEdge(null); setTab('inspector'); }, []);
  const onEdgeClick = useCallback((_: any, e: Edge) => { setSelectedEdge(e); setSelectedNode(null); setTab('inspector'); }, []);

  const toGraphEdges = useCallback((): GraphEdge[] => edges.map((e) => ({
    u: e.source, v: e.target, valle: (e.data as any).valle, factor: (e.data as any).factor, av: (e.data as any).av,
  })), [edges]);

  const styledEdges = useMemo(() => edges.map((e) => ({
    ...e,
    style: highlightEdges.has(e.id) ? { stroke: '#e11d48', strokeWidth: 4 } : { stroke: '#475569', strokeWidth: 2 },
    animated: highlightEdges.has(e.id),
  })), [edges, highlightEdges]);

  const styledNodes = useMemo(() => nodes.map((n) => ({
    ...n,
    style: highlightNodes.has(n.id) ? { boxShadow: '0 0 0 3px #e11d48' } : undefined,
  })), [nodes, highlightNodes]);

  const runDijkstra = () => {
    const ge = toGraphEdges();
    const { nodes: ns, adj } = buildAdj(ge, weight);
    const { d, prev, trace } = dijkstra(ns, adj, source);
    setResult({ type: 'Dijkstra', source, weight, d, prev });
    setTrace(trace);
    setTab('result');
  };

  const runFloyd = () => {
    const ge = toGraphEdges();
    const { nodes: ns, adj } = buildAdj(ge, weight);
    const dist = floyd(ns, adj);
    setResult({ type: 'Floyd-Warshall', weight, dist });
    setTab('result');
  };

  const runBellman = () => {
    const ge = toGraphEdges();
    const { nodes: ns } = buildAdj(ge, weight);
    const dist = bellmanFord(ns, ge, source, weight);
    setResult({ type: 'Bellman-Ford', source, weight, dist });
    setTab('result');
  };

  const runMST = (algo: 'Kruskal' | 'Prim') => {
    const ge = toGraphEdges();
    const edgesRes = algo === 'Kruskal' ? kruskal(ZONES.map((z) => z.key), ge, weight) : prim(ZONES.map((z) => z.key), ge, weight);
    const ids = new Set(edgesRes.map((e) => `${e.u}-${e.v}`));

    const matched = new Set<string>();
    for (const e of edges) {
      const key1 = `${e.source}-${e.target}`;
      const key2 = `${e.target}-${e.source}`;
      if (ids.has(key1) || ids.has(key2)) matched.add(e.id);
    }
    setHighlightEdges(matched);
    setHighlightNodes(new Set());
    setResult({ type: algo, weight, edges: edgesRes, total: Math.round(edgesRes.reduce((a, e) => a + (weight === 'valle' ? e.valle : e.valle * e.factor), 0) * 10) / 10 });
    setTab('result');
  };

  const runEnumerate = () => {
    const ge = toGraphEdges();
    const { feas } = enumeratePaths(ge);
    const shortest = feas.length ? feas.reduce((a, b) => (a.tv < b.tv ? a : b)) : null;
    const propCands = feas.filter((f) => f.ok45);
    const proposed = propCands.length ? propCands.reduce((a, b) => (a.tp < b.tp ? a : b)) : null;

    if (proposed) {
      const nodeSet = new Set<string>(proposed.path);
      const edgeSet = new Set<string>();
      for (let i = 0; i < proposed.path.length - 1; i++) {
        const a = proposed.path[i], b = proposed.path[i + 1];
        const e = edges.find((x) => (x.source === a && x.target === b) || (x.source === b && x.target === a));
        if (e) edgeSet.add(e.id);
      }
      setHighlightNodes(nodeSet);
      setHighlightEdges(edgeSet);
    }
    setResult({ type: 'Rutas factibles', feas, n: feas.length, n_ok45: propCands.length, shortest, proposed });
    setTab('result');
  };

  const runSim = () => {
    const ge = toGraphEdges();
    const sim = randomSim(ge, 1000);
    setResult({ type: 'Simulación 1000', sim });
    setTab('result');
  };

  const clearHighlight = () => { setHighlightNodes(new Set()); setHighlightEdges(new Set()); };

  const addNode = () => {
    const key = prompt('Clave de la zona (ej. BA):');
    if (!key) return;
    const name = prompt('Nombre:') || key;
    const x = parseFloat(prompt('x (coord relativa):') || '0');
    const y = parseFloat(prompt('y (coord relativa):') || '0');
    setNodes((ns) => [...ns, { id: key, type: 'zone', position: { x: x * SCALE, y: y * SCALE }, data: { key, name, pos: [x, y] } }]);
  };

  const removeSelected = () => {
    if (selectedNode) {
      setNodes((ns) => ns.filter((n) => n.id !== selectedNode.id));
      setEdges((es) => es.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    } else if (selectedEdge) {
      setEdges((es) => es.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  };

  const updateEdge = (field: string, value: any) => {
    if (!selectedEdge) return;
    setEdges((es) => es.map((e) => {
      if (e.id !== selectedEdge.id) return e;
      const nd = { ...e.data, [field]: value } as any;
      const p = Math.round(nd.valle * nd.factor * 10) / 10;
      return { ...e, data: nd, label: `${nd.av} · ${nd.valle}/${p.toFixed(1)} min` };
    }));
  };


  let inspectorContent: any = <p className="muted">Selecciona un nodo o arista en el canvas.</p>;
  if (selectedNode) {
    const d = selectedNode.data as any;
    const others = nodes.filter((n) => n.id !== selectedNode.id).map((n) => {
      const nd = n.data as any;
      return { key: n.id, dist: euclid(d.pos, nd.pos) };
    });
    inspectorContent = (
      <div>
        <h3>Nodo: {d.key}</h3>
        <div className="form-row"><label>Nombre <input value={d.name} onChange={(e) => {
          const v = e.target.value;
          setNodes((ns) => ns.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, name: v } } : n));
          setSelectedNode((prev: any) => prev ? { ...prev, data: { ...prev.data, name: v } } : prev);
        }} /></label></div>
        <div className="form-row"><label>x <input type="number" step="0.1" value={d.pos[0]} onChange={(e) => {
          const v = parseFloat(e.target.value);
          setNodes((ns) => ns.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, pos: [v, d.pos[1]] }, position: { x: v * SCALE, y: d.pos[1] * SCALE } } : n));
          setSelectedNode((prev: any) => prev ? { ...prev, data: { ...prev.data, pos: [v, d.pos[1]] }, position: { x: v * SCALE, y: d.pos[1] * SCALE } } : prev);
        }} /></label>
        <label>y <input type="number" step="0.1" value={d.pos[1]} onChange={(e) => {
          const v = parseFloat(e.target.value);
          setNodes((ns) => ns.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, pos: [d.pos[0], v] }, position: { x: d.pos[0] * SCALE, y: v * SCALE } } : n));
          setSelectedNode((prev: any) => prev ? { ...prev, data: { ...prev.data, pos: [d.pos[0], v] }, position: { x: d.pos[0] * SCALE, y: v * SCALE } } : prev);
        }} /></label></div>
        <p>Grado: {edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length}</p>
        <h4>Distancias euclidianas a otros nodos</h4>
        <ul className="dist-list">
          {others.map((o) => <li key={o.key}>{d.key} → {o.key}: d = √((x₂−x₁)²+(y₂−y₁)²) = {o.dist.toFixed(2)}</li>)}
        </ul>
      </div>
    );
  } else if (selectedEdge) {
    const d = selectedEdge.data as any;
    const a = zoneByName(d.u), b = zoneByName(d.v);
    const dist = euclid(a.pos, b.pos);
    const p = punta({ id: selectedEdge.id, u: d.u, v: d.v, valle: d.valle, factor: d.factor, av: d.av });
    inspectorContent = (
      <div>
        <h3>Arista: {d.u} — {d.v} ({d.av})</h3>
        <p>Valle: {d.valle} min · Factor punta: {d.factor} · Punta: {p} min</p>
        <p>Distancia euclidiana: d = √(({b.pos[0]}−{a.pos[0]})² + ({b.pos[1]}−{a.pos[1]})²) = {dist.toFixed(2)}</p>
        <div className="form-row"><label>Valle <input type="number" step="0.1" value={d.valle} onChange={(e) => updateEdge('valle', parseFloat(e.target.value))} /></label></div>
        <div className="form-row"><label>Factor <input type="number" step="0.1" value={d.factor} onChange={(e) => updateEdge('factor', parseFloat(e.target.value))} /></label></div>
        <div className="form-row"><label>Avenida <input value={d.av} onChange={(e) => updateEdge('av', e.target.value)} /></label></div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>FastDelivery Perú — Simulador de grafos</h1>
        <div className="controls">
          <label>Peso <select value={weight} onChange={(e) => setWeight(e.target.value as Weight)}><option value="valle">Valle</option><option value="punta">Punta</option></select></label>
          <label>Fuente <select value={source} onChange={(e) => setSource(e.target.value)}>{ZONES.map((z) => <option key={z.key} value={z.key}>{z.key}</option>)}</select></label>
          <button onClick={runDijkstra}>Dijkstra</button>
          <button onClick={runFloyd}>Floyd-Warshall</button>
          <button onClick={runBellman}>Bellman-Ford</button>
          <button onClick={() => runMST('Kruskal')}>Kruskal</button>
          <button onClick={() => runMST('Prim')}>Prim</button>
          <button onClick={runEnumerate}>Rutas factibles</button>
          <button onClick={runSim}>Simular 1000</button>
          <button onClick={clearHighlight}>Limpiar resalte</button>
          <button onClick={addNode}>+ Nodo</button>
          <button onClick={removeSelected}>Eliminar</button>
        </div>
      </header>

      <div className="main">
        <div className="canvas" onMouseMove={(e) => { if (hover) setHover({ ...hover, x: e.clientX, y: e.clientY }); }}>
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDragStop={(_, n) => {
              setNodes((ns) => ns.map((x) => x.id === n.id ? { ...x, data: { ...x.data, pos: [n.position.x / SCALE, n.position.y / SCALE] } } : x));
              if (selectedNode?.id === n.id) setSelectedNode({ ...n, data: { ...n.data, pos: [n.position.x / SCALE, n.position.y / SCALE] } });
            }}
            onNodeMouseEnter={(e, n) => { const d = n.data as any; setHover({ x: e.clientX, y: e.clientY, text: `${d.key} — ${d.name}\ncoords: (${d.pos[0]}, ${d.pos[1]})` }); }}
            onNodeMouseLeave={() => setHover(null)}
            onEdgeMouseEnter={(e, edge) => {
              const d = edge.data as any;
              const a = zoneByName(d.u), b = zoneByName(d.v);
              const dist = euclid(a.pos, b.pos);
              const p = punta({ id: edge.id, u: d.u, v: d.v, valle: d.valle, factor: d.factor, av: d.av });
              setHover({ x: e.clientX, y: e.clientY, text: `${d.u}—${d.v} · ${d.av}\nvalle: ${d.valle} min · factor: ${d.factor} · punta: ${p} min\ndist euclidiana: ${dist.toFixed(2)}` });
            }}
            onEdgeMouseLeave={() => setHover(null)}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
          {hover && (
            <div className="tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}>{hover.text}</div>
          )}
        </div>

        <aside className="sidebar">
          <div className="tabs">
            <button className={tab === 'inspector' ? 'active' : ''} onClick={() => setTab('inspector')}>Inspector</button>
            <button className={tab === 'result' ? 'active' : ''} onClick={() => setTab('result')}>Resultados</button>
            <button className={tab === 'trace' ? 'active' : ''} onClick={() => setTab('trace')}>Traza</button>
          </div>
          <div className="panel">
            {tab === 'inspector' && inspectorContent}
            {tab === 'result' && (
              <div className="result">
                {result ? (
                  <>
                    <h3>{result.type}</h3>
                    <pre>{JSON.stringify(result, (k, v) => (k === 'tps' ? `[${(v as number[]).length} valores]` : v), 2)}</pre>
                  </>
                ) : <p className="muted">Ejecuta un algoritmo.</p>}
              </div>
            )}
            {tab === 'trace' && (
              <div>
                {trace ? (
                  <ol className="trace">
                    {trace.map((t: any, i: number) => (
                      <li key={i}><b>{t.sel}</b>: {Object.entries(t.d).map(([k, v]) => `${k}=${v ?? '∞'}`).join(', ')}</li>
                    ))}
                  </ol>
                ) : <p className="muted">La traza aparece tras Dijkstra.</p>}
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="bottombar">
        <span>Nodos: {nodes.length} · Aristas: {edges.length} · Pedidos: {PEDIDOS.map((p) => `${p.id}: ${p.pickup}→${p.delivery}`).join(' | ')}</span>
        <span>SERV={SERV} min · LIMITE={LIMITE} min · REQ: {[...REQ].join(', ')}</span>
      </footer>
    </div>
  );
}