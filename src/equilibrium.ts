// Chemical equilibrium of a buffer solution: solves the charge balance for pH, iterating the ionic
// strength to self-consistency.

import { activityFunction, lnK, type ActivityModel } from './model.ts';
import { pKw } from './physics.ts';
import { getSystem } from './data/systems.ts';

/** Charges of the spectator ions this tool knows. Acid–base active ions belong to a system instead. */
export const ION_CHARGE: Readonly<Record<string, number>> = {
  'Na+': 1,
  'K+': 1,
  'Li+': 1,
  'Cl-': -1,
  'Br-': -1,
  'NO3-': -1,
  'Mg2+': 2,
  'Ca2+': 2,
};

/** Amounts per kilogram of water (molality, mol/kg). */
export interface Composition {
  /** Total amount of each acid–base system (all protonation states together). */
  systems: Readonly<Record<string, number>>;
  /** Spectator ions, e.g. Na⁺ from NaOH or NaCl, Cl⁻ from HCl or Tris·HCl. */
  ions: Readonly<Record<string, number>>;
}

export interface SpeciesState {
  system: string;
  /** Protons removed from the most protonated species of the system. */
  index: number;
  charge: number;
  molality: number;
  fraction: number;
  lgGamma: number;
}

export interface Equilibrium {
  tC: number;
  model: ActivityModel;
  /** −lg a(H⁺): the conventional pH a calibrated pH meter reports. */
  pH: number;
  /** Ionic strength, mol/kg. */
  ionicStrength: number;
  hydrogenMolality: number;
  hydroxideMolality: number;
  pKw: number;
  species: SpeciesState[];
  iterations: number;
}

export interface SolveOptions {
  tC: number;
  model?: ActivityModel;
}

interface PreparedSystem {
  id: string;
  total: number;
  z0: number;
  /** Cumulative Σ ln K_k for j = 0..n. */
  cumLnK: number[];
}

function prepare(c: Composition, tC: number): { systems: PreparedSystem[]; ionCharge: number; ionStrength2: number } {
  const systems: PreparedSystem[] = [];
  for (const [id, total] of Object.entries(c.systems)) {
    if (!(total >= 0) || !Number.isFinite(total)) throw new RangeError(`amount of ${id} must be a finite non-negative number`);
    if (total === 0) continue;
    const sys = getSystem(id);
    const cum = [0];
    for (const step of sys.steps) cum.push(cum[cum.length - 1]! + lnK(step, tC));
    systems.push({ id, total, z0: sys.z0, cumLnK: cum });
  }
  let ionCharge = 0;
  let ionStrength2 = 0;
  for (const [ion, m] of Object.entries(c.ions)) {
    const z = ION_CHARGE[ion];
    if (z === undefined) throw new Error(`unknown ion "${ion}"`);
    if (!(m >= 0) || !Number.isFinite(m)) throw new RangeError(`amount of ${ion} must be a finite non-negative number`);
    ionCharge += z * m;
    ionStrength2 += z * z * m;
  }
  return { systems, ionCharge, ionStrength2 };
}

/** Species distribution of one system at a given hydrogen-ion activity (ln aH) and ionic strength. */
function distribute(sys: PreparedSystem, lnAH: number, I: number, lgG: (z: number, I: number) => number, out?: SpeciesState[]): { charge: number; z2: number } {
  const n = sys.cumLnK.length;
  const logw: number[] = new Array(n);
  let max = -Infinity;
  for (let j = 0; j < n; j++) {
    const z = sys.z0 - j;
    // ln of (activity ratio / γ): a_j/a_0 = exp(Σ lnK − j ln aH); m_j ∝ a_j / γ_j
    const v = sys.cumLnK[j]! - j * lnAH - lgG(z, I) * Math.LN10;
    logw[j] = v;
    if (v > max) max = v;
  }
  let sum = 0;
  for (let j = 0; j < n; j++) sum += Math.exp(logw[j]! - max);
  let charge = 0;
  let z2 = 0;
  for (let j = 0; j < n; j++) {
    const f = Math.exp(logw[j]! - max) / sum;
    const z = sys.z0 - j;
    const m = sys.total * f;
    charge += z * m;
    z2 += z * z * m;
    if (out) out.push({ system: sys.id, index: j, charge: z, molality: m, fraction: f, lgGamma: lgG(z, I) });
  }
  return { charge, z2 };
}

/** Solves for the equilibrium pH of a composition. Throws if the composition is not physically meaningful. */
export function solve(c: Composition, opts: SolveOptions): Equilibrium {
  const tC = opts.tC;
  const model = opts.model ?? 'davies';
  const lgG = activityFunction(model, tC);
  const { systems, ionCharge, ionStrength2 } = prepare(c, tC);
  const pkw = pKw(tC);
  const lnKw = -pkw * Math.LN10;

  let I = 0.5 * ionStrength2;
  for (const s of systems) I += 0.5 * s.total * Math.max(1, s.z0 * s.z0);
  let pH = 7;
  let iterations = 0;
  for (; iterations < 500; iterations++) {
    const g1 = lgG(1, I) * Math.LN10;
    // charge(lnAH): positive when too acidic; decreasing in pH
    const charge = (x: number): number => {
      const lnAH = -x * Math.LN10;
      const mH = Math.exp(lnAH - g1);
      const mOH = Math.exp(lnKw - lnAH - g1);
      let q = ionCharge + mH - mOH;
      for (const s of systems) q += distribute(s, lnAH, I, lgG).charge;
      return q;
    };
    let lo = -3, hi = 17;
    if (charge(lo) < 0 || charge(hi) > 0) throw new RangeError('no pH between −3 and 17 balances the charges: the composition is outside what this model covers');
    for (let k = 0; k < 80 && hi - lo > 1e-13; k++) {
      const mid = 0.5 * (lo + hi);
      if (charge(mid) > 0) lo = mid; else hi = mid;
    }
    pH = 0.5 * (lo + hi);
    const lnAH = -pH * Math.LN10;
    const mH = Math.exp(lnAH - g1);
    const mOH = Math.exp(lnKw - lnAH - g1);
    let z2 = ionStrength2 + mH + mOH;
    for (const s of systems) z2 += distribute(s, lnAH, I, lgG).z2;
    const Inew = 0.5 * z2;
    if (Math.abs(Inew - I) <= 1e-13 * Math.max(1, I)) { I = Inew; break; }
    I = iterations > 20 ? 0.5 * (I + Inew) : Inew;
  }

  const lnAH = -pH * Math.LN10;
  const g1 = lgG(1, I) * Math.LN10;
  const species: SpeciesState[] = [];
  for (const s of systems) distribute(s, lnAH, I, lgG, species);
  return {
    tC,
    model,
    pH,
    ionicStrength: I,
    hydrogenMolality: Math.exp(lnAH - g1),
    hydroxideMolality: Math.exp(lnKw - lnAH - g1),
    pKw: pkw,
    species,
    iterations: iterations + 1,
  };
}

/**
 * Buffer capacity β = dC_base/dpH in mol/kg per pH unit, by a central difference with a strong base
 * (Na⁺ ± δ, which is what adding or removing NaOH does to the charge balance).
 */
export function bufferCapacity(c: Composition, opts: SolveOptions): number {
  const d = 1e-6;
  const na = c.ions['Na+'] ?? 0;
  const plus = solve({ systems: c.systems, ions: { ...c.ions, 'Na+': na + d } }, opts).pH;
  const minusNa = na - d;
  const minus = minusNa >= 0
    ? solve({ systems: c.systems, ions: { ...c.ions, 'Na+': minusNa } }, opts).pH
    : solve({ systems: c.systems, ions: { ...c.ions, 'Cl-': (c.ions['Cl-'] ?? 0) + d } }, opts).pH;
  return (2 * d) / (plus - minus);
}
