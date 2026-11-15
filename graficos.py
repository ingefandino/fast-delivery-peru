import os
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
from matplotlib.lines import Line2D

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(PROJECT_ROOT, 'salida') + os.sep
r = json.load(open(D + 'resultados.json'))
Z = r['Z']; E = r['E']
pos = {k: tuple(v['pos']) for k, v in Z.items()}
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9})

INK = '#1f2a24'; MUTED = '#6b7280'; GRID = '#e5e7eb'
GREEN = '#1F7A4D'; RED = '#C0392B'; ORANGE = '#D9822B'; BLUE = '#2B5C9A'

def base(ax):
    ax.set_xlim(-1.2, 12.2); ax.set_ylim(-1.3, 7.2)
    ax.set_xticks(range(0, 13)); ax.set_yticks(range(-1, 8))
    ax.grid(True, color=GRID, lw=0.6); ax.set_axisbelow(True)
    ax.set_xlabel('x (unidades relativas)'); ax.set_ylabel('y (unidades relativas)')
    for s in ['top', 'right']: ax.spines[s].set_visible(False)
    ax.set_aspect('equal')

def nodes(ax, hi=()):
    for k, (x, y) in pos.items():
        ax.scatter(x, y, s=520, color='white', edgecolor=INK, lw=1.4, zorder=5)
        ax.text(x, y, k, ha='center', va='center', fontsize=8.5, fontweight='bold', zorder=6, color=INK)
        off = {'SM': (0, -0.75), 'PL': (0, -0.75), 'JM': (0, 0.72), 'LI': (0, 0.72), 'SI': (1.25, -0.45), 'MI': (0, -0.75), 'SU': (0, -0.75), 'LM': (0, 0.72)}[k]
        ax.text(x + off[0], y + off[1], f"{Z[k]['nombre']} ({x},{y})", ha='center', va='center', fontsize=7.2, color=MUTED, zorder=6)

# ---------------- Figura 1: grafo ponderado
fig, ax = plt.subplots(figsize=(8.2, 4.9))
base(ax)
for e in E:
    (x1, y1), (x2, y2) = pos[e['u']], pos[e['v']]
    col = RED if e['f'] >= 2 else (ORANGE if e['f'] >= 1.5 else '#7a8a80')
    ax.plot([x1, x2], [y1, y2], color=col, lw=2.2 if e['f'] >= 2 else 1.6, zorder=2)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    ax.text(mx, my, f"{e['valle']:g} | {e['punta']:g}".replace('.', ','), ha='center', va='center', fontsize=7.4, color=INK,
            bbox=dict(boxstyle='round,pad=0.18', fc='white', ec=col, lw=0.8), zorder=4)
nodes(ax)
leg = [Line2D([0], [0], color='#7a8a80', lw=1.6, label='factor < 1,5'),
       Line2D([0], [0], color=ORANGE, lw=1.6, label='factor 1,5 a 1,9'),
       Line2D([0], [0], color=RED, lw=2.2, label='factor ≥ 2 (congestión alta)')]
ax.legend(handles=leg, loc='upper right', fontsize=7.5, frameon=True, title='Etiqueta: min valle | min punta', title_fontsize=7.5)
fig.tight_layout(); fig.savefig(D + 'fig1_grafo.png', dpi=220); plt.close(fig)

# ---------------- Figura 2: ruta óptima y puntos críticos
prop = r['proposed']['path']; short = r['shortest']['path']
fig, ax = plt.subplots(figsize=(8.2, 4.9))
base(ax)
for e in E:
    (x1, y1), (x2, y2) = pos[e['u']], pos[e['v']]
    ax.plot([x1, x2], [y1, y2], color='#cfd6d1', lw=1.3, zorder=1)
# ruta más corta (valle) punteada
for a, b in zip(short, short[1:]):
    (x1, y1), (x2, y2) = pos[a], pos[b]
    ax.plot([x1, x2], [y1, y2], color=MUTED, lw=1.6, ls=(0, (4, 3)), zorder=2)
# ruta propuesta con flechas numeradas
for i, (a, b) in enumerate(zip(prop, prop[1:]), 1):
    (x1, y1), (x2, y2) = pos[a], pos[b]
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle='-|>', mutation_scale=14, color=GREEN, lw=2.8,
                                 shrinkA=13, shrinkB=13, zorder=3))
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    ax.text(mx, my, str(i), ha='center', va='center', fontsize=7.5, color='white', fontweight='bold',
            bbox=dict(boxstyle='circle,pad=0.2', fc=GREEN, ec='none'), zorder=4)
nodes(ax)
# puntos críticos
crit = [('SI', 'LM'), ('SI', 'SU')]
for a, b in crit:
    (x1, y1), (x2, y2) = pos[a], pos[b]
    ax.plot([x1, x2], [y1, y2], color=RED, lw=5, alpha=0.25, zorder=1)
ax.annotate('Tramo crítico: Javier Prado Este\n11 min valle → 28,6 min punta', xy=(8.5, 3.0), xytext=(7.6, 5.6), fontsize=7.4, color=RED,
            arrowprops=dict(arrowstyle='->', color=RED, lw=0.9), ha='center')
ax.annotate('Intersección crítica\nSan Isidro: grado 5', xy=(5.7, 2.8), xytext=(2.4, 2.2), fontsize=7.4, color=RED,
            arrowprops=dict(arrowstyle='->', color=RED, lw=0.9), ha='center')
ax.annotate('Javier Prado (×2,0)', xy=(7.4, 2.05), xytext=(7.3, -0.75), fontsize=7.4, color=RED,
            arrowprops=dict(arrowstyle='->', color=RED, lw=0.9), ha='center')
leg = [Line2D([0], [0], color=GREEN, lw=2.8, label='Ruta propuesta (71,3 min punta)'),
       Line2D([0], [0], color=MUTED, lw=1.6, ls=(0, (4, 3)), label='Ruta más corta en valle (81,1 min punta)'),
       Line2D([0], [0], color=RED, lw=5, alpha=0.3, label='Tramo de alta congestión')]
ax.legend(handles=leg, loc='lower left', fontsize=7.3, frameon=True)
fig.tight_layout(); fig.savefig(D + 'fig2_ruta.png', dpi=220); plt.close(fig)

# ---------------- Figura 3: comparación (a) tiempos por pedido, (b) simulación
rep = r['random_rep']; sh = r['shortest']; pr = r['proposed']; sim = r['sim']
fig, (a1, a2) = plt.subplots(1, 2, figsize=(8.4, 3.2), gridspec_kw={'width_ratios': [1.05, 1]})
orders = ['O1', 'O2', 'O3']
series = [('Aleatoria actual', rep['rp'], '#9aa3ab'), ('Más corta (valle)', sh['rp'], '#7d8f86'), ('Propuesta', pr['rp'], GREEN)]
w = 0.26
for i, (lab, vals, col) in enumerate(series):
    xs = [j + (i - 1) * w for j in range(3)]
    ys = [vals[o] for o in orders]
    a1.bar(xs, ys, w * 0.92, color=col, label=lab)
    for x, y in zip(xs, ys):
        a1.text(x, y + 1.2, f'{y:.0f}', ha='center', fontsize=6.8, color=INK)
a1.axhline(45, color=RED, lw=1.2, ls='--'); a1.text(2.45, 46.5, 'límite 45 min', color=RED, fontsize=7, ha='right')
a1.set_xticks(range(3)); a1.set_xticklabels(['O1: LM→MI', 'O2: SI→JM', 'O3: PL→LI'])
a1.set_ylabel('minutos desde el recojo'); a1.set_title('(a) Tiempo por pedido en hora punta', fontsize=8.6, loc='left')
a1.legend(fontsize=6.8, frameon=False, loc='upper right'); a1.set_ylim(0, 92)
for s in ['top', 'right']: a1.spines[s].set_visible(False)
a1.grid(axis='y', color=GRID, lw=0.6); a1.set_axisbelow(True)

a2.hist(sim['tps'], bins=range(68, 122, 3), color='#b8c2bb', edgecolor='white')
for val, lab, col, yy in [(pr['tp'], 'Propuesta 71,3', GREEN, 0.92), (sh['tp'], 'Más corta 81,1', '#4b5563', 0.80), (sim['mean_tp'], f"Promedio aleatorio {sim['mean_tp']:.1f}".replace('.', ','), RED, 0.68)]:
    a2.axvline(val, color=col, lw=1.6)
    a2.text(val + 0.8, a2.get_ylim()[1] * yy if False else 0, '', fontsize=7)
ymax = a2.get_ylim()[1]
for val, lab, col, yy in [(pr['tp'], 'Propuesta\n71,3', GREEN, 0.86), (sh['tp'], 'Más corta\n81,1', '#4b5563', 0.86), (sim['mean_tp'], 'Promedio\naleatorio 94,8', RED, 0.86)]:
    a2.text(val + 0.8, ymax * yy, lab, fontsize=6.8, color=col, va='top')
a2.set_xlabel('tiempo total de la ruta en hora punta (min)'); a2.set_ylabel('n.º de rutas simuladas')
a2.set_title('(b) 1 000 rutas aleatorias simuladas', fontsize=8.6, loc='left')
for s in ['top', 'right']: a2.spines[s].set_visible(False)
a2.grid(axis='y', color=GRID, lw=0.6); a2.set_axisbelow(True)
fig.tight_layout(); fig.savefig(D + 'fig3_comparacion.png', dpi=220); plt.close(fig)
print('ok')
