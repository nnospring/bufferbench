// Substances you weigh or pipette. Molar masses are computed from the formulas (src/elements.ts), so
// the formula is the single thing to check against the label on the bottle.
//
// `h` is the number of dissociable protons per system unit that the substance carries, counted from
// the least protonated species of its system. Every reagent must be electrically neutral:
// perUnit·(z_last + h) + Σ z·n(ions) = 0, where z_last = z0 − (number of steps). test/data.test.ts
// checks this for every entry.

import { getSystem } from './systems.ts';

export type ReagentRole = 'buffer' | 'titrant' | 'salt';

export interface Reagent {
  id: string;
  name: string;
  zh: string;
  formula: string;
  role: ReagentRole;
  /** Physical form as usually sold. Liquids are dosed by mass here (density varies by grade). */
  state: 'solid' | 'liquid';
  system?: string;
  /** System units per formula unit (borax carries 4 boron atoms). */
  perUnit?: number;
  h?: number;
  /** Spectator ions per formula unit. `H+` / `OH-` mark strong acids and bases. */
  ions: Readonly<Record<string, number>>;
  aliases?: readonly string[];
}

const buf = (id: string, name: string, zh: string, formula: string, system: string, h: number, ions: Record<string, number> = {}, extra: Partial<Reagent> = {}): Reagent =>
  ({ id, name, zh, formula, role: 'buffer', state: 'solid', system, h, ions, ...extra });

export const REAGENTS: readonly Reagent[] = [
  // Good's and related zwitterionic/amine buffers: free acid (or base) and sodium salt
  buf('aces', 'ACES', 'ACES', 'C4H10N2O4S', 'aces', 1),
  buf('ada', 'ADA', 'ADA', 'C6H10N2O5', 'ada', 2),
  buf('ampso', 'AMPSO', 'AMPSO', 'C7H17NO5S', 'ampso', 1),
  buf('bes', 'BES', 'BES', 'C6H15NO5S', 'bes', 1),
  buf('bicine', 'Bicine', 'Bicine', 'C6H13NO4', 'bicine', 1),
  buf('bistris', 'Bis-tris', 'Bis-Tris', 'C8H19NO5', 'bistris', 0),
  buf('btp', 'Bis-tris propane', 'Bis-Tris 丙烷', 'C11H26N2O6', 'btp', 0),
  buf('caps', 'CAPS', 'CAPS', 'C9H19NO3S', 'caps', 1),
  buf('capso', 'CAPSO', 'CAPSO', 'C9H19NO4S', 'capso', 1),
  buf('ches', 'CHES', 'CHES', 'C8H17NO3S', 'ches', 1),
  buf('dipso', 'DIPSO', 'DIPSO', 'C7H17NO6S', 'dipso', 1),
  buf('glycine', 'Glycine', '甘氨酸', 'C2H5NO2', 'glycine', 1),
  buf('glygly', 'Glycylglycine', '双甘肽', 'C4H8N2O3', 'glygly', 1),
  buf('hepes', 'HEPES (free acid)', 'HEPES（游离酸）', 'C8H18N2O4S', 'hepes', 1),
  buf('hepes-na', 'HEPES sodium salt', 'HEPES 钠盐', 'C8H17N2NaO4S', 'hepes', 0, { 'Na+': 1 }),
  buf('hepps', 'HEPPS (EPPS)', 'HEPPS（EPPS）', 'C9H20N2O4S', 'hepps', 1),
  buf('heppso', 'HEPPSO', 'HEPPSO', 'C9H20N2O5S', 'heppso', 1),
  buf('histidine', 'L-Histidine', 'L-组氨酸', 'C6H9N3O2', 'histidine', 1),
  buf('histidine-hcl', 'L-Histidine monohydrochloride monohydrate', 'L-组氨酸盐酸盐一水合物', 'C6H9N3O2·HCl·H2O', 'histidine', 2, { 'Cl-': 1 }),
  buf('imidazole', 'Imidazole', '咪唑', 'C3H4N2', 'imidazole', 0),
  buf('mes', 'MES (free acid)', 'MES（游离酸）', 'C6H13NO4S', 'mes', 1),
  buf('mes-h2o', 'MES monohydrate', 'MES 一水合物', 'C6H13NO4S·H2O', 'mes', 1),
  buf('mes-na', 'MES sodium salt', 'MES 钠盐', 'C6H12NNaO4S', 'mes', 0, { 'Na+': 1 }),
  buf('mops', 'MOPS (free acid)', 'MOPS（游离酸）', 'C7H15NO4S', 'mops', 1),
  buf('mops-na', 'MOPS sodium salt', 'MOPS 钠盐', 'C7H14NNaO4S', 'mops', 0, { 'Na+': 1 }),
  buf('mopso', 'MOPSO', 'MOPSO', 'C7H15NO5S', 'mopso', 1),
  buf('pipes', 'PIPES (free acid)', 'PIPES（游离酸）', 'C8H18N2O6S2', 'pipes', 2),
  buf('pipes-na2', 'PIPES disodium salt', 'PIPES 二钠盐', 'C8H16N2Na2O6S2', 'pipes', 0, { 'Na+': 2 }),
  buf('taps', 'TAPS', 'TAPS', 'C7H17NO6S', 'taps', 1),
  buf('tapso', 'TAPSO', 'TAPSO', 'C7H17NO7S', 'tapso', 1),
  buf('tes', 'TES', 'TES', 'C6H15NO6S', 'tes', 1),
  buf('tricine', 'Tricine', 'Tricine', 'C6H13NO5', 'tricine', 1),
  buf('tris', 'Tris base', 'Tris 碱', 'C4H11NO3', 'tris', 0, {}, { aliases: ['Trizma base', 'THAM'] }),
  buf('tris-hcl', 'Tris hydrochloride', 'Tris 盐酸盐', 'C4H11NO3·HCl', 'tris', 1, { 'Cl-': 1 }, { aliases: ['Tris-HCl', 'Trizma HCl'] }),
  buf('tea', 'Triethanolamine', '三乙醇胺', 'C6H15NO3', 'tea', 0, {}, { state: 'liquid' }),
  buf('tea-hcl', 'Triethanolamine hydrochloride', '三乙醇胺盐酸盐', 'C6H15NO3·HCl', 'tea', 1, { 'Cl-': 1 }),
  buf('ammonium-chloride', 'Ammonium chloride', '氯化铵', 'NH4Cl', 'ammonia', 1, { 'Cl-': 1 }),
  buf('ethanolamine', 'Ethanolamine', '乙醇胺', 'C2H7NO', 'ethanolamine', 0, {}, { state: 'liquid' }),
  buf('diethanolamine', 'Diethanolamine', '二乙醇胺', 'C4H11NO2', 'diethanolamine', 0),
  // inorganic and carboxylic acid buffers
  buf('acetic-acid', 'Acetic acid (glacial)', '冰乙酸', 'C2H4O2', 'acetate', 1, {}, { state: 'liquid' }),
  buf('na-acetate', 'Sodium acetate', '乙酸钠（无水）', 'C2H3NaO2', 'acetate', 0, { 'Na+': 1 }),
  buf('na-acetate-3h2o', 'Sodium acetate trihydrate', '三水合乙酸钠', 'C2H3NaO2·3H2O', 'acetate', 0, { 'Na+': 1 }),
  buf('citric-acid', 'Citric acid (anhydrous)', '柠檬酸（无水）', 'C6H8O7', 'citrate', 3),
  buf('citric-acid-h2o', 'Citric acid monohydrate', '一水合柠檬酸', 'C6H8O7·H2O', 'citrate', 3),
  buf('na3-citrate-2h2o', 'Trisodium citrate dihydrate', '二水合柠檬酸三钠', 'C6H5Na3O7·2H2O', 'citrate', 0, { 'Na+': 3 }),
  buf('kh2-citrate', 'Potassium dihydrogen citrate', '柠檬酸二氢钾', 'C6H7KO7', 'citrate', 2, { 'K+': 1 }),
  buf('succinic-acid', 'Succinic acid', '琥珀酸', 'C4H6O4', 'succinate', 2),
  buf('na2-succinate-6h2o', 'Disodium succinate hexahydrate', '六水合琥珀酸二钠', 'C4H4Na2O4·6H2O', 'succinate', 0, { 'Na+': 2 }),
  buf('maleic-acid', 'Maleic acid', '马来酸', 'C4H4O4', 'maleate', 2),
  buf('khp', 'Potassium hydrogen phthalate', '邻苯二甲酸氢钾', 'C8H5KO4', 'phthalate', 1, { 'K+': 1 }, { aliases: ['KHP'] }),
  buf('kh2po4', 'Potassium dihydrogen phosphate', '磷酸二氢钾', 'KH2PO4', 'phosphate', 2, { 'K+': 1 }),
  buf('k2hpo4', 'Dipotassium hydrogen phosphate', '磷酸氢二钾', 'K2HPO4', 'phosphate', 1, { 'K+': 2 }),
  buf('k2hpo4-3h2o', 'Dipotassium hydrogen phosphate trihydrate', '三水合磷酸氢二钾', 'K2HPO4·3H2O', 'phosphate', 1, { 'K+': 2 }),
  buf('nah2po4', 'Sodium dihydrogen phosphate (anhydrous)', '磷酸二氢钠（无水）', 'NaH2PO4', 'phosphate', 2, { 'Na+': 1 }),
  buf('nah2po4-h2o', 'Sodium dihydrogen phosphate monohydrate', '一水合磷酸二氢钠', 'NaH2PO4·H2O', 'phosphate', 2, { 'Na+': 1 }),
  buf('nah2po4-2h2o', 'Sodium dihydrogen phosphate dihydrate', '二水合磷酸二氢钠', 'NaH2PO4·2H2O', 'phosphate', 2, { 'Na+': 1 }),
  buf('na2hpo4', 'Disodium hydrogen phosphate (anhydrous)', '磷酸氢二钠（无水）', 'Na2HPO4', 'phosphate', 1, { 'Na+': 2 }),
  buf('na2hpo4-2h2o', 'Disodium hydrogen phosphate dihydrate', '二水合磷酸氢二钠', 'Na2HPO4·2H2O', 'phosphate', 1, { 'Na+': 2 }),
  buf('na2hpo4-7h2o', 'Disodium hydrogen phosphate heptahydrate', '七水合磷酸氢二钠', 'Na2HPO4·7H2O', 'phosphate', 1, { 'Na+': 2 }),
  buf('na2hpo4-12h2o', 'Disodium hydrogen phosphate dodecahydrate', '十二水合磷酸氢二钠', 'Na2HPO4·12H2O', 'phosphate', 1, { 'Na+': 2 }),
  buf('boric-acid', 'Boric acid', '硼酸', 'H3BO3', 'borate', 1),
  buf('borax', 'Sodium tetraborate decahydrate (borax)', '十水合四硼酸钠（硼砂）', 'Na2B4O7·10H2O', 'borate', 0.5, { 'Na+': 2 }, { perUnit: 4 }),
  buf('nahco3', 'Sodium hydrogen carbonate', '碳酸氢钠', 'NaHCO3', 'carbonate', 1, { 'Na+': 1 }),
  buf('na2co3', 'Sodium carbonate (anhydrous)', '碳酸钠（无水）', 'Na2CO3', 'carbonate', 0, { 'Na+': 2 }),
  buf('na-cacodylate-3h2o', 'Sodium cacodylate trihydrate', '三水合二甲胂酸钠', 'C2H6AsNaO2·3H2O', 'cacodylate', 0, { 'Na+': 1 }),
  buf('na2-g2p-5h2o', 'Sodium glycerol 2-phosphate pentahydrate', 'β-甘油磷酸钠五水合物', 'C3H7Na2O6P·5H2O', 'g2p', 0, { 'Na+': 2 }),
  // strong acids and bases used to titrate
  { id: 'hcl', name: 'Hydrochloric acid', zh: '盐酸', formula: 'HCl', role: 'titrant', state: 'liquid', ions: { 'H+': 1, 'Cl-': 1 } },
  { id: 'naoh', name: 'Sodium hydroxide', zh: '氢氧化钠', formula: 'NaOH', role: 'titrant', state: 'solid', ions: { 'Na+': 1, 'OH-': 1 } },
  { id: 'koh', name: 'Potassium hydroxide', zh: '氢氧化钾', formula: 'KOH', role: 'titrant', state: 'solid', ions: { 'K+': 1, 'OH-': 1 } },
  // neutral salts
  { id: 'nacl', name: 'Sodium chloride', zh: '氯化钠', formula: 'NaCl', role: 'salt', state: 'solid', ions: { 'Na+': 1, 'Cl-': 1 } },
  { id: 'kcl', name: 'Potassium chloride', zh: '氯化钾', formula: 'KCl', role: 'salt', state: 'solid', ions: { 'K+': 1, 'Cl-': 1 } },
  { id: 'mgcl2-6h2o', name: 'Magnesium chloride hexahydrate', zh: '六水合氯化镁', formula: 'MgCl2·6H2O', role: 'salt', state: 'solid', ions: { 'Mg2+': 1, 'Cl-': 2 } },
  { id: 'cacl2-2h2o', name: 'Calcium chloride dihydrate', zh: '二水合氯化钙', formula: 'CaCl2·2H2O', role: 'salt', state: 'solid', ions: { 'Ca2+': 1, 'Cl-': 2 } },
  { id: 'na2so4', name: 'Sodium sulfate (anhydrous)', zh: '硫酸钠（无水）', formula: 'Na2SO4', role: 'salt', state: 'solid', system: 'sulfate', h: 0, ions: { 'Na+': 2 } },
  { id: 'mgso4-7h2o', name: 'Magnesium sulfate heptahydrate', zh: '七水合硫酸镁', formula: 'MgSO4·7H2O', role: 'salt', state: 'solid', system: 'sulfate', h: 0, ions: { 'Mg2+': 1 } },
];

export const REAGENT_BY_ID: ReadonlyMap<string, Reagent> = new Map(REAGENTS.map((r) => [r.id, r]));

export function getReagent(id: string): Reagent {
  const r = REAGENT_BY_ID.get(id);
  if (!r) throw new Error(`unknown reagent "${id}"`);
  return r;
}

/** Net charge of one formula unit (should be 0). */
export function reagentCharge(r: Reagent): number {
  let q = 0;
  if (r.system) {
    const sys = getSystem(r.system);
    const zLast = sys.z0 - sys.steps.length;
    q += (r.perUnit ?? 1) * (zLast + (r.h ?? 0));
  }
  for (const [ion, n] of Object.entries(r.ions)) {
    const z = ion === 'H+' ? 1 : ion === 'OH-' ? -1 : /(\d*)([+-])$/.exec(ion) ? (Number(/(\d*)([+-])$/.exec(ion)![1] || 1) * (ion.endsWith('+') ? 1 : -1)) : NaN;
    q += z * n;
  }
  return q;
}
