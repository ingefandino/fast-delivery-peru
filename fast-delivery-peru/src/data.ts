export type ZoneKey = string;

export interface Zone {
  key: string;
  name: string;
  pos: [number, number];
}

export interface Edge {
  id: string;
  u: string;
  v: string;
  valle: number;
  factor: number;
  av: string;
}

export const ZONES: Zone[] = [
  { key: 'SM', name: 'San Miguel', pos: [0, 4] },
  { key: 'PL', name: 'Pueblo Libre', pos: [2, 4] },
  { key: 'JM', name: 'Jesús María', pos: [3, 6] },
  { key: 'LI', name: 'Lince', pos: [5, 5] },
  { key: 'SI', name: 'San Isidro', pos: [6, 3] },
  { key: 'MI', name: 'Miraflores', pos: [5, 0] },
  { key: 'SU', name: 'Surco', pos: [9, 1] },
  { key: 'LM', name: 'La Molina', pos: [11, 3] },
];

export const EDGES: Edge[] = [
  { id: 'SM-PL', u: 'SM', v: 'PL', valle: 6, factor: 1.5, av: 'Av. La Marina' },
  { id: 'SM-JM', u: 'SM', v: 'JM', valle: 9, factor: 1.3, av: 'Av. Brasil' },
  { id: 'PL-JM', u: 'PL', v: 'JM', valle: 5, factor: 1.2, av: 'Av. Sucre' },
  { id: 'PL-LI', u: 'PL', v: 'LI', valle: 7, factor: 1.3, av: 'Av. Mariano Cornejo' },
  { id: 'JM-LI', u: 'JM', v: 'LI', valle: 4, factor: 1.4, av: 'Av. Cuba' },
  { id: 'JM-SI', u: 'JM', v: 'SI', valle: 8, factor: 1.6, av: 'Av. Salaverry' },
  { id: 'LI-SI', u: 'LI', v: 'SI', valle: 5, factor: 1.5, av: 'Av. Arequipa' },
  { id: 'LI-MI', u: 'LI', v: 'MI', valle: 9, factor: 1.4, av: 'Av. Petit Thouars' },
  { id: 'SI-MI', u: 'SI', v: 'MI', valle: 6, factor: 1.6, av: 'Vía Expresa' },
  { id: 'SI-SU', u: 'SI', v: 'SU', valle: 10, factor: 2.0, av: 'Av. Javier Prado' },
  { id: 'MI-SU', u: 'MI', v: 'SU', valle: 8, factor: 1.5, av: 'Av. Benavides' },
  { id: 'SU-LM', u: 'SU', v: 'LM', valle: 7, factor: 1.4, av: 'Av. Primavera' },
  { id: 'SI-LM', u: 'SI', v: 'LM', valle: 11, factor: 2.6, av: 'Av. Javier Prado Este' },
];

export const PEDIDOS = [
  { id: 'O1', pickup: 'LM', delivery: 'MI' },
  { id: 'O2', pickup: 'SI', delivery: 'JM' },
  { id: 'O3', pickup: 'PL', delivery: 'LI' },
];

export const REQ = new Set(['LM', 'MI', 'SI', 'JM', 'PL', 'LI']);
export const START = 'LM';
export const SERV = 2;
export const LIMITE = 45;

export function punta(e: Edge) {
  return Math.round(e.valle * e.factor * 10) / 10;
}

export function euclid(a: [number, number], b: [number, number]) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function zoneByName(key: string) {
  return ZONES.find((z) => z.key === key)!;
}