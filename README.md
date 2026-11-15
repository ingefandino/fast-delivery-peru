# FastDelivery Perú — Optimización de rutas con grafos

Simulador que modela la red de entrega de **FastDelivery Perú** (delivery de comida rápida en Lima) como un grafo ponderado y calcula rutas óptimas considerando tiempos en hora valle y hora punta.

Incluye un **backend en Python** (NetworkX) que genera los resultados y un **simulador web** (React + drag & drop) para visualizar y experimentar con las rutas en tiempo real.

## ✨ Características

- Modelo de 8 zonas de Lima conectadas por 13 avenidas principales.
- Tiempos de tránsito con factor de congestión (hora valle vs. hora punta).
- Restricción de entrega: máximo 45 minutos por pedido.
- Comparación de 3 estrategias: ruta aleatoria, ruta más corta y ruta propuesta.
- Simulación de 1000 rutas aleatorias con métricas estadísticas.
- Visualización web interactiva con drag & drop, tooltips y resultados en vivo.

## 🧮 Algoritmos incluidos

- Dijkstra (con tabla de iteraciones)
- Floyd-Warshall (todas las parejas)
- Bellman-Ford (verificación)
- Kruskal y Prim (árbol de expansión mínima)
- Enumeración de rutas factibles con precedencia de pedidos
- Simulación Monte Carlo de rutas aleatorias

## 📦 Requisitos

- Python 3.10 o superior
- Node.js 18 o superior (solo para el simulador web)

## 🚀 Instalación y ejecución

### Backend (Python)

```bash
python3 -m venv .venv
source .venv/bin/activate          # En Windows: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python modelo.py                   # genera salida/resultados.json
python graficos.py                 # genera las figuras en salida/
```

### Simulador web (React)

Usa el gestor de paquetes que prefieras:

```bash
cd fast-delivery-peru
# npm
npm install && npm run dev
# pnpm
pnpm install && pnpm dev
# yarn
yarn && yarn dev
# bun
bun install && bun dev
```

Abre `http://localhost:5173`.

## 📁 Estructura del proyecto

```
.
├── modelo.py          # Construye el grafo, ejecuta algoritmos y guarda resultados
├── graficos.py        # Genera las figuras (PNG) en salida/
├── requirements.txt   # Dependencias de Python
├── fast-delivery-peru/  # Simulador visual (React + React Flow)
└── salida/            # Artefactos generados (ignorado en git)
```

## 🗺️ Zonas y datos

Las 8 zonas modeladas son: San Miguel, Pueblo Libre, Jesús María, Lince, San Isidro, Miraflores, Surco y La Molina.

Para cambiar los datos, edita en `modelo.py`:
- `Z`: zonas y coordenadas relativas.
- `E`: aristas (tiempo en valle, factor de congestión, avenida).
- `PED`, `REQ`, `START`: pedidos, zonas requeridas y punto de partida.
- `SERV` (minutos de servicio por parada) y `LIMITE` (45 min).

La simulación usa la semilla `2026`, por lo que siempre produce los mismos resultados.

## 🌐 Simulador web

El simulador web permite:
- Arrastrar nodos y crear aristas conectando handles.
- Editar pesos (valle, factor, avenida) desde el inspector.
- Ejecutar los algoritmos y ver la ruta resaltada en el canvas.
- Tooltips con coordenadas, pesos, factor y distancia euclidiana.
- Métricas y traza de Dijkstra en paneles laterales.

## 📄 Licencia

MIT. Puedes usar, modificar y distribuir este proyecto libremente.