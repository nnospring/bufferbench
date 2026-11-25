// What a person at the bench asks: how do I make this buffer, and what will its pH be?

import { getSystem, SYSTEMS, type AcidSystem, type Step } from './data/systems.ts';
import { getReagent, REAGENTS, type Reagent } from './data/reagents.ts';
import { molarMass } from './elements.ts';
import { activityFunction, MODEL_LIMIT, pKAt, type ActivityModel } from './model.ts';
import { bufferCapacity, solve, type Composition, type Equilibrium } from './equilibrium.ts';
import { compositionFromMolarities, molalityFromMolarity, type Amounts } from './mixture.ts';
import { CERTIFIED_T_RANGE, CHECKED_MAX_IONIC_STRENGTH } from './accuracy.ts';

/**
 * Ionization steps (index into the system's steps) that a NIST certified pH standard in benchmark/certified.ts
 * actually exercises: the pair of species that sets the standard's pH.
 */
export const CERTIFIED_STEPS: Readonly<Record<string, readonly number[]>> = {
  phosphate: [1], // H₂PO₄⁻/HPO₄²⁻ (SRM 186, both ratios)
  phthalate: [0, 1], // KHP sits between both pK values (SRM 185)
  borate: [0], // SRM 187
  carbonate: [1], // HCO₃⁻/CO₃²⁻ (SRM 191)
  tris: [0], // SRM 922/923
};
export const CERTIFIED_SYSTEMS: ReadonlySet<string> = new Set(Object.keys(CERTIFIED_STEPS));

/** Ionic strength (mol/kg) above which no number is given, whatever the model (the Davies equation's range). */
export const HARD_LIMIT = 0.5;
/** Fraction of the final volume at which a buffer is usually titrated before making up to volume. */
export const ADJUST_FRACTION = 0.8;

/** Temperatures (°C) covered by the certified standards and accepted at all. */
export const T_CHECKED: readonly [number, number] = [0, 50];
export const T_ACCEPTED: readonly [number, number] = [0, 60];

export type Tier = 'checked' | 'model' | 'extrapolated';

/** A machine-readable caveat; `params` fill the localized message. */
export interface Note {
  code: string;
  level: 'info' | 'warning';
  params?: Record<string, string | number>;
}

export class BufferError extends Error {
  code: string;
  params: Record<string, string | number>;
  constructor(code: string, message: string, params: Record<string, string | number> = {}) {
    super(message);
    this.name = 'BufferError';
    this.code = code;
    this.params = params;
  }
}

export interface Ingredient {
  reagent: string;
  name: string;
  zh: string;
  formula: string;
  role: Reagent['role'];
  state: Reagent['state'];
  molarMass: number;
  /** Final concentration in the solution being made, mol/L. */
  molarity: number;
  /** Amount for the requested volume, mol. */
  mol: number;
  /** Mass for the requested volume, g (for a titrant: of the pure substance). */
  grams: number;
  /** Titrants only: volume of the stock solution, mL. */
  stockML?: number;
  stockMolarity?: number;
}

export interface Assessment {
  tier: Tier;
  notes: Note[];
}

export interface Prediction extends Assessment {
  tC: number;
  pH: number;
  ionicStrength: number;
  /** mmol/L per pH unit (β), at the stated temperature. */
  bufferCapacity: number;
  /** dpH/dT, pH units per °C, at the stated temperature. */
  dpHdT: number;
  equilibrium: Equilibrium;
}

const COMPLEXING = ['phosphate', 'citrate', 'carbonate', 'pyrophosphate', 'oxalate', 'sulfate', 'tartrate', 'succinate', 'maleate', 'g2p', 'ada'];

function assess(systems: readonly string[], comp: Composition, eq: Equilibrium, temps: readonly number[], model: ActivityModel, pHTarget?: number): Assessment {
  const notes: Note[] = [];
  const buffering = systems.map((id) => ({ id, ...nearestStepOf(getSystem(id), eq.pH, eq.tC, eq.ionicStrength, model) }));
  // "checked" needs, for every buffer present: the working step is one a certified standard exercises, the pH lies
  // within one unit of the certified steps' pKa′ values (or between them), and every temperature involved is inside
  // the certificates' range for that buffer.
  const inRange = (id: string) => { const r = CERTIFIED_T_RANGE[id]; return !!r && temps.every((t) => t >= r[0] && t <= r[1]); };
  const nearCertified = (id: string) => {
    const sys = getSystem(id);
    const pKas = (CERTIFIED_STEPS[id] ?? []).map((j) => apparentPKa(sys, sys.steps[j]!, eq.tC, eq.ionicStrength, model));
    return pKas.length > 0 && eq.pH >= Math.min(...pKas) - 1 && eq.pH <= Math.max(...pKas) + 1;
  };
  let tier: Tier = buffering.length > 0 && buffering.every((b) => CERTIFIED_STEPS[b.id]?.includes(b.index) && nearCertified(b.id) && inRange(b.id)) ? 'checked' : 'model';
  const I = eq.ionicStrength;
  if (I > HARD_LIMIT) throw new BufferError('ionic-strength-too-high', `ionic strength ${I.toFixed(2)} mol/kg is above ${HARD_LIMIT}, beyond the activity models used here`, { I: round(I, 3), limit: HARD_LIMIT });
  if (I > CHECKED_MAX_IONIC_STRENGTH) { tier = 'extrapolated'; notes.push({ code: 'ionic-strength-above-checked', level: 'warning', params: { I: round(I, 3), limit: CHECKED_MAX_IONIC_STRENGTH } }); }
  if (model === 'ideal') { tier = 'extrapolated'; notes.push({ code: 'ideal-model', level: 'warning' }); }
  else if (I > MODEL_LIMIT[model]) notes.push({ code: 'model-limit-exceeded', level: 'warning', params: { I: round(I, 3), limit: MODEL_LIMIT[model], model } });
  for (const t of temps) {
    if (t < T_ACCEPTED[0] || t > T_ACCEPTED[1]) throw new BufferError('temperature-out-of-range', `${t} °C is outside ${T_ACCEPTED[0]}–${T_ACCEPTED[1]} °C`, { t, min: T_ACCEPTED[0], max: T_ACCEPTED[1] });
    if (t < T_CHECKED[0] || t > T_CHECKED[1]) { tier = 'extrapolated'; notes.push({ code: 'temperature-above-checked', level: 'warning', params: { t } }); }
  }
  for (const id of systems) {
    const sys = getSystem(id);
    // the steps that matter are those with pK within 2 units of the solution pH
    const relevant = sys.steps.filter((s) => !s.assumed && Math.abs(s.pK - eq.pH) < 2);
    const away = temps.some((t) => Math.abs(t - 25) > 2);
    for (const s of relevant) {
      if (away && s.dH === null) { tier = 'extrapolated'; notes.push({ code: 'no-enthalpy', level: 'warning', params: { system: sys.name, pK: s.pK } }); }
      else if (away && s.dCp === null && temps.some((t) => Math.abs(t - 25) > 10)) notes.push({ code: 'no-heat-capacity', level: 'info', params: { system: sys.name, pK: s.pK } });
      if (s.approx?.includes('pK')) { tier = 'extrapolated'; notes.push({ code: 'approximate-pK', level: 'warning', params: { system: sys.name, pK: s.pK } }); }
    }
    for (const n of sys.notes ?? []) notes.push({ code: 'system-note', level: 'info', params: { system: sys.name, text: n.en, textZh: n.zh } });
    if (id === 'borate') {
      const total = eq.species.filter((x) => x.system === 'borate').reduce((a, x) => a + x.molality, 0);
      if (total > 0.025) notes.push({ code: 'polyborate', level: 'warning', params: { m: round(total, 4) } });
    }
  }
  if (eq.pH > 9) notes.push({ code: 'carbon-dioxide', level: 'info' });
  const nearest = nearestStep(systems, eq.pH, eq.tC, eq.ionicStrength, model);
  if (nearest) {
    if (pHTarget !== undefined && Math.abs(pHTarget - nearest.pKa) > 1) notes.push({ code: 'weak-buffering', level: 'warning', params: { pKa: round(nearest.pKa, 2), system: nearest.system } });
    // The Tris standard (a cationic acid, BH⁺ ⇌ B + H⁺) is predicted about 0.02 low: say so for this charge type.
    if (nearest.zAcid > 0) notes.push({ code: 'cationic-acid-offset', level: 'info', params: { system: nearest.system } });
  }
  const divalent = (comp.ions['Mg2+'] ?? 0) + (comp.ions['Ca2+'] ?? 0) > 0;
  const binder = systems.find((s) => COMPLEXING.includes(s));
  if (divalent && binder) notes.push({ code: 'metal-complexation', level: 'warning', params: { system: getSystem(binder).name } });
  return { tier, notes: dedupe(notes) };
}

function dedupe(notes: Note[]): Note[] {
  const seen = new Set<string>();
  return notes.filter((n) => { const k = n.code + JSON.stringify(n.params ?? {}); if (seen.has(k)) return false; seen.add(k); return true; });
}

function round(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

/** Apparent pKa of the step nearest to pH: pH = pKa′ + lg(m_base/m_acid) at this temperature and ionic strength. */
export function apparentPKa(sys: AcidSystem, step: Step, tC: number, I: number, model: ActivityModel): number {
  const j = sys.steps.indexOf(step);
  const zAcid = sys.z0 - j;
  const zBase = zAcid - 1;
  const lg = activityFunction(model, tC);
  return pKAt(step, tC) + lg(zBase, I) - lg(zAcid, I);
}

function nearestStepOf(sys: AcidSystem, pH: number, tC: number, I: number, model: ActivityModel): { index: number; pKa: number } {
  let best = { index: -1, pKa: NaN };
  sys.steps.forEach((st, j) => {
    if (st.assumed) return;
    const pKa = apparentPKa(sys, st, tC, I, model);
    if (best.index < 0 || Math.abs(pKa - pH) < Math.abs(best.pKa - pH)) best = { index: j, pKa };
  });
  return best;
}

function nearestStep(systems: readonly string[], pH: number, tC: number, I: number, model: ActivityModel): { system: string; pKa: number; zAcid: number } | undefined {
  let best: { system: string; pKa: number; zAcid: number } | undefined;
  for (const id of systems) {
    const sys = getSystem(id);
    sys.steps.forEach((st, j) => {
      if (st.assumed) return;
      const pKa = apparentPKa(sys, st, tC, I, model);
      if (!best || Math.abs(pKa - pH) < Math.abs(best.pKa - pH)) best = { system: sys.name, pKa, zAcid: sys.z0 - j };
    });
  }
  return best;
}

function systemsOf(amounts: Amounts): string[] {
  const out = new Set<string>();
  for (const [id, c] of Object.entries(amounts)) if (c > 0) { const r = getReagent(id); if (r.system) out.add(r.system); }
  return [...out];
}

export interface PredictRequest {
  /** Reagent id → concentration in the final solution, mol/L. */
  amounts: Amounts;
  /** Temperature at which the solution was made up to volume (°C). Fixes the molality. */
  tPrep?: number;
  /** Temperature at which to predict the pH (°C). */
  t: number;
  model?: ActivityModel;
}

/** Predicts the pH (and buffer capacity, temperature coefficient) of a solution of known composition. */
export function predict(req: PredictRequest): Prediction {
  const model = req.model ?? 'davies';
  const tPrep = req.tPrep ?? req.t;
  const comp = compositionFromMolarities(req.amounts, tPrep);
  return predictComposition(comp, systemsOf(req.amounts), req.t, [tPrep, req.t], model);
}

function predictComposition(comp: Composition, systems: string[], t: number, temps: number[], model: ActivityModel, pHTarget?: number): Prediction {
  const eq = solve(comp, { tC: t, model });
  const a = assess(systems, comp, eq, temps, model, pHTarget);
  const beta = bufferCapacity(comp, { tC: t, model });
  const dt = 0.5;
  const tLo = Math.max(T_ACCEPTED[0], t - dt), tHi = Math.min(T_ACCEPTED[1], t + dt);
  const dpHdT = (solve(comp, { tC: tHi, model }).pH - solve(comp, { tC: tLo, model }).pH) / (tHi - tLo);
  // β is per kg of water; per litre of solution it is smaller by the water mass per litre (≈ ρ_w)
  return { tC: t, pH: eq.pH, ionicStrength: eq.ionicStrength, bufferCapacity: beta * 1000 * (molalityFromMolarity(1, temps[0]!) ** -1), dpHdT, equilibrium: eq, ...a };
}

export type Method = 'titrate' | 'mix';

export interface RecipeRequest {
  /** Acid–base system id, e.g. 'hepes', 'tris', 'phosphate'. */
  system: string;
  /** Total buffer concentration in the working solution, mol/L (all protonation states). */
  concentration: number;
  /** Target pH of the working solution at tUse. */
  pH: number;
  /** Temperature at which the pH must be right (°C). */
  tUse: number;
  /** Temperature at which the buffer is made and the pH meter is read (°C). Default 25. */
  tPrep?: number;
  /** Volume to make, L. */
  volume: number;
  /** 'titrate': one form plus strong acid or base. 'mix': two forms of the buffer, no titrant. Default 'titrate'. */
  method?: Method;
  /** Starting form for 'titrate' (reagent id); chosen automatically if omitted. */
  start?: string;
  /** 'naoh' | 'koh' | 'hcl'; chosen automatically to match the starting form if omitted. */
  titrant?: string;
  /** Concentration of the titrant stock, mol/L (default 1). */
  titrantMolarity?: number;
  /** The two forms for 'mix' (reagent ids); chosen automatically if omitted. */
  forms?: readonly [string, string];
  /** Other components of the working solution: reagent id → mol/L (e.g. { nacl: 0.15 }). */
  additives?: Amounts;
  /** Make a concentrated stock: amounts are multiplied by this factor, the target applies after dilution. */
  stockFactor?: number;
  model?: ActivityModel;
}

export interface Recipe extends Assessment {
  request: Required<Pick<RecipeRequest, 'system' | 'concentration' | 'pH' | 'tUse' | 'tPrep' | 'volume' | 'method' | 'model'>> & { stockFactor: number };
  system: { id: string; name: string; zh: string };
  ingredients: Ingredient[];
  /** The working solution at tUse. */
  use: Prediction;
  /**
   * The solution you make (the stock if stockFactor > 1) at tPrep. `pH` is the meter reading after making up to
   * volume; `pHAdjust` (titration only) is the reading to titrate to at ADJUST_FRACTION of the final volume,
   * where the solution is more concentrated. null when the ionic strength is beyond the model.
   */
  prep: { pH: number | null; pHAdjust: number | null; ionicStrength: number; tC: number; note?: Note };
  /** Apparent pKa at use conditions of the step that does the buffering. */
  pKa: number;
}

function formsOf(system: string): Reagent[] {
  return REAGENTS.filter((r) => r.role === 'buffer' && r.system === system && (r.perUnit ?? 1) === 1);
}

/** pH of one form alone at the working concentration: tells which side of the target it sits on. */
function soloPH(r: Reagent, c: number, tC: number, model: ActivityModel, tPrep: number, additives: Amounts): number {
  return solve(compositionFromMolarities({ ...additives, [r.id]: c }, tPrep), { tC, model }).pH;
}

function bisect(f: (x: number) => number, lo: number, hi: number, target: number): number {
  let flo = f(lo) - target;
  const fhi = f(hi) - target;
  if (flo * fhi > 0) throw new BufferError('target-unreachable', `pH ${target} cannot be reached this way`, { pH: target });
  for (let k = 0; k < 100; k++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid) - target;
    if (Math.abs(hi - lo) < 1e-12 * Math.max(1, Math.abs(hi))) break;
    if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
  }
  return 0.5 * (lo + hi);
}

function ingredient(id: string, molarity: number, volume: number, factor: number, stockMolarity?: number): Ingredient {
  const r = getReagent(id);
  const mm = molarMass(r.formula);
  const mol = molarity * factor * volume;
  const ing: Ingredient = { reagent: id, name: r.name, zh: r.zh, formula: r.formula, role: r.role, state: r.state, molarMass: mm, molarity: molarity * factor, mol, grams: mol * mm };
  if (stockMolarity) { ing.stockMolarity = stockMolarity; ing.stockML = (mol / stockMolarity) * 1000; }
  return ing;
}

/** Computes how to make a buffer. Throws BufferError when the request cannot be met or is outside the model. */
export function recipe(req: RecipeRequest): Recipe {
  const sys = getSystem(req.system);
  const model = req.model ?? 'davies';
  const tPrep = req.tPrep ?? 25;
  const factor = req.stockFactor ?? 1;
  const additives = req.additives ?? {};
  const c = req.concentration;
  for (const [k, v] of [['concentration', c], ['volume', req.volume], ['pH', req.pH], ['stockFactor', factor]] as const) {
    if (!(Number.isFinite(v) && v > 0)) throw new BufferError('invalid-input', `${k} must be a positive number`, { field: k });
  }
  const forms = formsOf(sys.id);
  if (forms.length === 0) throw new BufferError('no-reagents', `no weighable form of ${sys.name} is defined`, { system: sys.name });
  // Systems sold only as salts (phosphate, citrate…) are usually made by mixing two forms.
  const method: Method = req.method ?? (forms.some((r) => Object.keys(r.ions).length === 0) ? 'titrate' : 'mix');

  let amounts: Record<string, number>;
  const ingredients: Ingredient[] = [];

  if (method === 'titrate') {
    const solo = forms.map((r) => ({ r, pH: soloPH(r, c, req.tUse, model, tPrep, additives) }));
    let start = req.start ? solo.find((x) => x.r.id === req.start) : undefined;
    if (req.start && !start) throw new BufferError('bad-start', `${req.start} is not a form of ${sys.name}`, { start: req.start, system: sys.name });
    let titrant = req.titrant;
    if (!start) {
      // prefer the free acid/base (no counter-ion) on the correct side, closest to the target
      const below = solo.filter((x) => x.pH <= req.pH);
      const above = solo.filter((x) => x.pH >= req.pH);
      const plain = (xs: typeof solo) => xs.filter((x) => Object.keys(x.r.ions).length === 0);
      const pick = (xs: typeof solo, dir: 1 | -1) => xs.sort((a, b) => dir * (b.pH - a.pH))[0];
      start = pick(plain(below), 1) ?? pick(plain(above), -1) ?? pick(below, 1) ?? pick(above, -1);
    }
    if (!start) throw new BufferError('no-start', 'no starting form', {});
    if (!titrant) titrant = start.pH <= req.pH ? 'naoh' : 'hcl';
    const tr = getReagent(titrant);
    if (tr.role !== 'titrant') throw new BufferError('bad-titrant', `${titrant} is not a strong acid or base`, { titrant });
    const isBase = 'OH-' in tr.ions;
    if (isBase && start.pH > req.pH) throw new BufferError('target-unreachable', `${start.r.name} alone is already above pH ${req.pH}; titrate it with acid instead`, { start: start.r.name, pH: req.pH, solo: round(start.pH, 2) });
    if (!isBase && start.pH < req.pH) throw new BufferError('target-unreachable', `${start.r.name} alone is already below pH ${req.pH}; titrate it with base instead`, { start: start.r.name, pH: req.pH, solo: round(start.pH, 2) });
    const maxEq = c * (sys.steps.length + 1);
    const f = (n: number) => solve(compositionFromMolarities({ ...additives, [start!.r.id]: c, [titrant!]: n }, tPrep), { tC: req.tUse, model }).pH;
    const pHmax = f(maxEq);
    if ((isBase && pHmax < req.pH) || (!isBase && pHmax > req.pH)) throw new BufferError('target-unreachable', `pH ${req.pH} cannot be reached with ${tr.name}`, { pH: req.pH });
    const n = bisect(f, 0, maxEq, req.pH);
    amounts = { ...additives, [start.r.id]: c, [titrant]: n };
    ingredients.push(ingredient(start.r.id, c, req.volume, factor));
    ingredients.push(ingredient(titrant, n, req.volume, factor, req.titrantMolarity ?? 1));
  } else {
    let pair: [Reagent, Reagent];
    if (req.forms) {
      const a = getReagent(req.forms[0]), b = getReagent(req.forms[1]);
      if (a.system !== sys.id || b.system !== sys.id) throw new BufferError('bad-forms', `both forms must belong to ${sys.name}`, { system: sys.name });
      pair = [a, b];
    } else {
      const solo = forms.map((r) => ({ r, pH: soloPH(r, c, req.tUse, model, tPrep, additives) }));
      const lo = solo.filter((x) => x.pH < req.pH).sort((x, y) => y.pH - x.pH)[0];
      const hi = solo.filter((x) => x.pH > req.pH).sort((x, y) => x.pH - y.pH)[0];
      if (!lo || !hi) throw new BufferError('target-unreachable', `no two forms of ${sys.name} bracket pH ${req.pH}`, { system: sys.name, pH: req.pH });
      pair = [lo.r, hi.r];
    }
    const [a, b] = pair;
    const f = (x: number) => solve(compositionFromMolarities({ ...additives, [a.id]: c * (1 - x), [b.id]: c * x }, tPrep), { tC: req.tUse, model }).pH;
    const lo = f(0), hi = f(1);
    if ((req.pH - lo) * (req.pH - hi) > 0) throw new BufferError('target-unreachable', `pH ${req.pH} is not between ${a.name} (${lo.toFixed(2)}) and ${b.name} (${hi.toFixed(2)})`, { pH: req.pH, a: a.name, b: b.name, lo: round(lo, 2), hi: round(hi, 2) });
    const x = bisect(f, 0, 1, req.pH);
    amounts = { ...additives, [a.id]: c * (1 - x), [b.id]: c * x };
    ingredients.push(ingredient(a.id, c * (1 - x), req.volume, factor));
    ingredients.push(ingredient(b.id, c * x, req.volume, factor));
  }
  for (const [id, m] of Object.entries(additives)) if (m > 0) ingredients.push(ingredient(id, m, req.volume, factor));

  const systems = systemsOf(amounts);
  const work = compositionFromMolarities(amounts, tPrep);
  const use = predictComposition(work, systems, req.tUse, [tPrep, req.tUse], model, req.pH);
  const notes = [...use.notes];

  let prep: Recipe['prep'];
  const stockAmounts: Record<string, number> = {};
  for (const [id, m] of Object.entries(amounts)) stockAmounts[id] = m * factor;
  const stock = compositionFromMolarities(stockAmounts, tPrep);
  const stockEq = solve(stock, { tC: tPrep, model });
  let pHAdjust: number | null = null;
  if (method === 'titrate') {
    const concentrated: Record<string, number> = {};
    for (const [id, m] of Object.entries(stockAmounts)) concentrated[id] = m / ADJUST_FRACTION;
    const adj = solve(compositionFromMolarities(concentrated, tPrep), { tC: tPrep, model });
    if (adj.ionicStrength <= HARD_LIMIT) pHAdjust = adj.pH;
  }
  if (stockEq.ionicStrength > HARD_LIMIT) {
    prep = { pH: null, pHAdjust: null, ionicStrength: stockEq.ionicStrength, tC: tPrep, note: { code: 'stock-pH-unpredictable', level: 'warning', params: { I: round(stockEq.ionicStrength, 2) } } };
    notes.push(prep.note!);
  } else {
    prep = { pH: stockEq.pH, pHAdjust, ionicStrength: stockEq.ionicStrength, tC: tPrep };
    if (method === 'titrate' && pHAdjust === null) notes.push({ code: 'adjust-reading-unpredictable', level: 'warning', params: { fraction: Math.round(ADJUST_FRACTION * 100) } });
    if (factor > 1) notes.push({ code: 'stock-dilution-shift', level: 'info', params: { stock: round(stockEq.pH, 2), work: round(use.pH, 2), factor } });
    if (stockEq.ionicStrength > CHECKED_MAX_IONIC_STRENGTH && factor > 1) notes.push({ code: 'stock-ionic-strength', level: 'warning', params: { I: round(stockEq.ionicStrength, 2) } });
  }
  if (Math.abs(prep.pH !== null ? prep.pH - req.pH : 0) >= 0.05 && Math.abs(tPrep - req.tUse) > 0.5) notes.push({ code: 'adjust-at-prep-temperature', level: 'warning', params: { prep: prep.pH!.toFixed(2), tPrep, use: use.pH.toFixed(2), tUse: req.tUse } });
  const titr = ingredients.find((i) => i.role === 'titrant');
  if (titr?.stockML && titr.stockML > 100 * req.volume) notes.push({ code: 'titrant-volume-large', level: 'info', params: { mL: round(titr.stockML, 1) } });
  for (const i of ingredients) if (i.state === 'liquid' && i.role !== 'titrant') notes.push({ code: 'liquid-reagent', level: 'info', params: { name: i.name } });

  const st = sys.steps.filter((s) => !s.assumed).reduce((b, s) => (Math.abs(pKAt(s, req.tUse) - req.pH) < Math.abs(pKAt(b, req.tUse) - req.pH) ? s : b));
  return {
    request: { system: sys.id, concentration: c, pH: req.pH, tUse: req.tUse, tPrep, volume: req.volume, method, model, stockFactor: factor },
    system: { id: sys.id, name: sys.name, zh: sys.zh },
    ingredients,
    use,
    prep,
    pKa: apparentPKa(sys, st, req.tUse, use.ionicStrength, model),
    tier: use.tier,
    notes: dedupe(notes),
  };
}

export interface Suggestion {
  system: string;
  name: string;
  zh: string;
  /** Apparent pKa at the requested temperature and ionic strength. */
  pKa: number;
  /** d(pKa)/dT, per °C, at the requested temperature (null without ΔH). */
  dpKadT: number | null;
  distance: number;
  certified: boolean;
  flags: string[];
}

/** Buffers whose pKa (at t and ionic strength I) is within `window` of the target pH, nearest first. */
export function suggest(opts: { pH: number; t: number; I?: number; window?: number; model?: ActivityModel }): Suggestion[] {
  const I = opts.I ?? 0.1;
  const model = opts.model ?? 'davies';
  const win = opts.window ?? 1;
  const out: Suggestion[] = [];
  for (const sys of SYSTEMS) {
    if (!sys.buffer || formsOf(sys.id).length === 0) continue;
    for (const st of sys.steps) {
      if (st.assumed) continue;
      const pKa = apparentPKa(sys, st, opts.t, I, model);
      const distance = Math.abs(pKa - opts.pH);
      if (distance > win) continue;
      const flags: string[] = [];
      if (st.dH === null) flags.push('no-enthalpy');
      if (st.approx?.includes('pK')) flags.push('approximate-pK');
      if (sys.notes?.some((n) => /arsenic|toxic|controlled/i.test(n.en))) flags.push('hazard');
      const dpKadT = st.dH === null ? null : (pKAt(st, opts.t + 0.5) - pKAt(st, opts.t - 0.5));
      out.push({ system: sys.id, name: sys.name, zh: sys.zh, pKa, dpKadT, distance, certified: CERTIFIED_STEPS[sys.id]?.includes(sys.steps.indexOf(st)) ?? false, flags });
    }
  }
  return out.sort((a, b) => a.distance - b.distance);
}
