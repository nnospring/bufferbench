// Acid–base systems and their ionization thermodynamics.
//
// Source: R. N. Goldberg, N. Kishore and R. M. Lennen, "Thermodynamic Quantities for the Ionization
// Reactions of Buffers", J. Phys. Chem. Ref. Data 31, 231–370 (2002), Section 8 (pp. 359–360):
// selected pK, ΔrH° (kJ/mol) and ΔrCp° (J/(K·mol)) at T = 298.15 K, p = 0.1 MPa, I = 0, molality
// standard state. Each step is one ionization H_nL → H⁺ + H_{n−1}L, listed from the most protonated
// species. `null` means the paper gives no value; `approx` marks values the paper prints with "≈".
//
// Transcription protocol (docs/DATA.md): digits were taken from the PDF text layer, signs, charges and
// "≈" from the rendered page images; the formula masses are checked against the molecular weights in
// the paper's Section 7 (test/data.test.ts).
//
// Charges (`z0`, the charge of the most protonated species listed) follow the reaction equations in
// Section 8, except where a note says otherwise.

export type Approx = 'pK' | 'dH' | 'dCp';

export interface Step {
  pK: number;
  dH: number | null;
  dCp: number | null;
  approx?: readonly Approx[];
  /** Not in the source: a strong-acid group that is treated as completely dissociated (see notes). */
  assumed?: true;
}

export interface AcidSystem {
  id: string;
  name: string;
  zh: string;
  aliases: readonly string[];
  /** Empirical formula of the reference species named in Goldberg's reaction (HL or L). */
  formula: string;
  /** Molecular weight printed in Goldberg Section 7 for that formula (g/mol). */
  mw: number;
  /** Goldberg Section 7 table number. */
  section: string;
  page: 359 | 360;
  /** Charge of the most protonated species in `steps`. */
  z0: number;
  steps: readonly Step[];
  notes?: readonly { en: string; zh: string }[];
  /** Used as a pH buffer in biology/chemistry, as opposed to a system that is only an ingredient. */
  buffer?: boolean;
}

const s = (pK: number, dH: number | null = null, dCp: number | null = null, approx?: Approx[]): Step =>
  approx ? { pK, dH, dCp, approx } : { pK, dH, dCp };

/** A sulfonic-acid proton: pK not in the source, completely dissociated at any pH this tool covers. */
const SULFONIC: Step = { pK: -2, dH: null, dCp: null, assumed: true };

export const SYSTEMS: readonly AcidSystem[] = [
  { id: 'aces', name: 'ACES', zh: 'ACES', aliases: ['N-(2-acetamido)-2-aminoethanesulfonic acid'], formula: 'C4H10N2O4S', mw: 182.20, section: '7.1', page: 359, z0: 0, buffer: true,
    steps: [s(6.847, 30.43, -49)] },
  { id: 'acetate', name: 'Acetate', zh: '乙酸盐', aliases: ['acetic acid', 'sodium acetate', 'NaOAc'], formula: 'C2H4O2', mw: 60.05, section: '7.2', page: 359, z0: 0, buffer: true,
    steps: [s(4.756, -0.41, -142)] },
  { id: 'ada', name: 'ADA', zh: 'ADA', aliases: ['N-(2-acetamido)iminodiacetic acid'], formula: 'C6H10N2O5', mw: 190.15, section: '7.3', page: 359, z0: 1, buffer: true,
    steps: [s(1.59), s(2.48, 16.7), s(6.844, 12.23, -144)] },
  { id: 'ampd', name: 'AMPD', zh: 'AMPD', aliases: ['2-amino-2-methyl-1,3-propanediol', 'ammediol'], formula: 'C4H11NO2', mw: 105.14, section: '7.4', page: 359, z0: 1, buffer: true,
    steps: [s(8.801, 49.85, -44)] },
  { id: 'amp', name: 'AMP (2-amino-2-methyl-1-propanol)', zh: '2-氨基-2-甲基-1-丙醇', aliases: ['2-amino-2-methyl-1-propanol', 'AMP'], formula: 'C4H11NO', mw: 89.14, section: '7.5', page: 359, z0: 1, buffer: true,
    steps: [s(9.694, 54.05, -21, ['dCp'])] },
  { id: 'apsa', name: '3-Amino-1-propanesulfonic acid', zh: '3-氨基-1-丙磺酸', aliases: ['homotaurine'], formula: 'C3H9NO3S', mw: 139.17, section: '7.6', page: 359, z0: 0,
    steps: [s(10.2)] },
  { id: 'ammonia', name: 'Ammonia', zh: '氨', aliases: ['ammonium', 'NH4Cl'], formula: 'NH3', mw: 17.03, section: '7.7', page: 359, z0: 1, buffer: true,
    steps: [s(9.245, 51.95, 8)] },
  { id: 'ampso', name: 'AMPSO', zh: 'AMPSO', aliases: [], formula: 'C7H17NO5S', mw: 227.28, section: '7.8', page: 359, z0: 0, buffer: true,
    steps: [s(9.138, 43.19, -61)] },
  { id: 'arsenate', name: 'Arsenate', zh: '砷酸盐', aliases: ['arsenic acid'], formula: 'AsH3O4', mw: 141.94, section: '7.9', page: 359, z0: 0,
    steps: [s(2.31, -7.8), s(7.05, 1.7), s(11.9, 15.9)], notes: [{ en: 'Contains arsenic: toxic.', zh: '含砷，有毒。' }] },
  { id: 'barbital', name: 'Barbital', zh: '巴比妥', aliases: ['veronal', 'diethylbarbituric acid'], formula: 'C8H12N2O3', mw: 184.19, section: '7.10', page: 359, z0: 0, buffer: true,
    steps: [s(7.98, 24.27, -135), s(12.8)], notes: [{ en: 'A controlled substance in many countries.', zh: '在许多国家属于管制药品。' }] },
  { id: 'bes', name: 'BES', zh: 'BES', aliases: ['N,N-bis(2-hydroxyethyl)-2-aminoethanesulfonic acid'], formula: 'C6H15NO5S', mw: 213.25, section: '7.11', page: 359, z0: 0, buffer: true,
    steps: [s(7.187, 24.25, -2)] },
  { id: 'bicine', name: 'Bicine', zh: 'Bicine（二甘氨酸）', aliases: ['N,N-bis(2-hydroxyethyl)glycine'], formula: 'C6H13NO4', mw: 163.17, section: '7.12', page: 359, z0: 1, buffer: true,
    steps: [s(2.0), s(8.334, 26.34, 0)] },
  { id: 'bistris', name: 'Bis-tris', zh: 'Bis-Tris', aliases: ['bis(2-hydroxyethyl)amino-tris(hydroxymethyl)methane'], formula: 'C8H19NO5', mw: 209.24, section: '7.13', page: 359, z0: 1, buffer: true,
    steps: [s(6.484, 28.4, 27)] },
  { id: 'btp', name: 'Bis-tris propane', zh: 'Bis-Tris 丙烷', aliases: ['BTP', '1,3-bis[tris(hydroxymethyl)methylamino]propane'], formula: 'C11H26N2O6', mw: 282.34, section: '7.14', page: 359, z0: 2, buffer: true,
    steps: [s(6.65), s(9.1)] },
  { id: 'borate', name: 'Borate', zh: '硼酸盐', aliases: ['boric acid', 'borax'], formula: 'H3BO3', mw: 61.83, section: '7.15', page: 359, z0: 0, buffer: true,
    steps: [s(9.237, 13.8, -240, ['dCp'])],
    notes: [{ en: 'Polyborate ions form above about 0.025 mol/kg total boron and are not modelled.', zh: '总硼超过约 0.025 mol/kg 时会生成多硼酸根，未建模。' }] },
  { id: 'cacodylate', name: 'Cacodylate', zh: '二甲胂酸盐', aliases: ['cacodylic acid', 'dimethylarsinic acid'], formula: 'C2H7AsO2', mw: 138.00, section: '7.17', page: 359, z0: 1, buffer: true,
    steps: [s(1.78, -3.5), s(6.28, -3.0, -86)], notes: [{ en: 'Contains arsenic: toxic.', zh: '含砷，有毒。' }] },
  { id: 'caps', name: 'CAPS', zh: 'CAPS', aliases: ['3-(cyclohexylamino)-1-propanesulfonic acid'], formula: 'C9H19NO3S', mw: 221.32, section: '7.18', page: 359, z0: 0, buffer: true,
    steps: [s(10.499, 48.1, 57)] },
  { id: 'capso', name: 'CAPSO', zh: 'CAPSO', aliases: [], formula: 'C9H19NO4S', mw: 237.32, section: '7.19', page: 359, z0: 0, buffer: true,
    steps: [s(9.825, 46.67, 21)] },
  { id: 'carbonate', name: 'Carbonate', zh: '碳酸盐', aliases: ['bicarbonate', 'carbonic acid'], formula: 'CO2', mw: 44.01, section: '7.20', page: 359, z0: 0, buffer: true,
    steps: [s(6.351, 9.15, -371), s(10.329, 14.7, -249)],
    notes: [{ en: 'A closed system is assumed: CO₂ exchange with air is not modelled.', zh: '按封闭体系计算，未考虑与空气交换 CO₂。' }] },
  { id: 'ches', name: 'CHES', zh: 'CHES', aliases: ['2-(cyclohexylamino)ethanesulfonic acid'], formula: 'C8H17NO3S', mw: 207.29, section: '7.21', page: 359, z0: 0, buffer: true,
    steps: [s(9.394, 39.55, 9)] },
  { id: 'citrate', name: 'Citrate', zh: '柠檬酸盐', aliases: ['citric acid', 'sodium citrate'], formula: 'C6H8O7', mw: 192.13, section: '7.22', page: 359, z0: 0, buffer: true,
    steps: [s(3.128, 4.07, -131), s(4.761, 2.23, -178), s(6.396, -3.38, -254)] },
  { id: 'cysteine', name: 'L-Cysteine', zh: 'L-半胱氨酸', aliases: ['cysteine'], formula: 'C3H7NO2S', mw: 121.16, section: '7.23', page: 359, z0: 1,
    steps: [s(1.71, -0.6, null, ['dH']), s(8.36, 36.1, -66, ['dCp']), s(10.75, 34.1, -204, ['dCp'])] },
  { id: 'diethanolamine', name: 'Diethanolamine', zh: '二乙醇胺', aliases: ['DEA'], formula: 'C4H11NO2', mw: 105.14, section: '7.24', page: 359, z0: 1, buffer: true,
    steps: [s(8.883, 42.08, 36)] },
  { id: 'diglycolate', name: 'Diglycolate', zh: '二甘醇酸盐', aliases: ['diglycolic acid'], formula: 'C4H6O5', mw: 134.09, section: '7.25', page: 359, z0: 0,
    steps: [s(3.05, -0.1, -142, ['dCp']), s(4.37, -7.2, -138, ['dCp'])] },
  { id: 'dmg', name: '3,3-Dimethylglutarate', zh: '3,3-二甲基戊二酸盐', aliases: ['3,3-dimethylglutaric acid'], formula: 'C7H12O4', mw: 160.17, section: '7.26', page: 359, z0: 0, buffer: true,
    steps: [s(3.7), s(6.34)] },
  { id: 'dipso', name: 'DIPSO', zh: 'DIPSO', aliases: [], formula: 'C7H17NO6S', mw: 243.28, section: '7.27', page: 359, z0: 0, buffer: true,
    steps: [s(7.576, 30.18, 42)] },
  { id: 'ethanolamine', name: 'Ethanolamine', zh: '乙醇胺', aliases: ['monoethanolamine', '2-aminoethanol'], formula: 'C2H7NO', mw: 61.08, section: '7.28', page: 359, z0: 1, buffer: true,
    steps: [s(9.498, 50.52, 26)] },
  { id: 'nem', name: 'N-Ethylmorpholine', zh: 'N-乙基吗啉', aliases: ['4-ethylmorpholine'], formula: 'C6H13NO', mw: 115.17, section: '7.29', page: 359, z0: 1, buffer: true,
    steps: [s(7.77, 27.4)] },
  { id: 'g2p', name: 'Glycerol 2-phosphate', zh: '2-磷酸甘油', aliases: ['β-glycerophosphate', 'beta-glycerophosphate'], formula: 'C3H9O6P', mw: 172.07, section: '7.30', page: 359, z0: 0, buffer: true,
    steps: [s(1.329, -12.2, -330), s(6.65, -1.85, -212)] },
  { id: 'glycine', name: 'Glycine', zh: '甘氨酸', aliases: ['Gly'], formula: 'C2H5NO2', mw: 75.07, section: '7.31', page: 359, z0: 1, buffer: true,
    steps: [s(2.351, 4.0, -139), s(9.78, 44.2, -57)] },
  { id: 'glycinamide', name: 'Glycine amide', zh: '甘氨酰胺', aliases: ['glycinamide'], formula: 'C2H6N2O', mw: 74.08, section: '7.32', page: 359, z0: 1, buffer: true,
    steps: [s(8.04, 42.9)] },
  { id: 'glygly', name: 'Glycylglycine', zh: '双甘肽', aliases: ['Gly-Gly', 'diglycine'], formula: 'C4H8N2O3', mw: 132.12, section: '7.33', page: 359, z0: 1, buffer: true,
    steps: [s(3.14, 0.11, -128), s(8.265, 43.4, -16)] },
  { id: 'glyglygly', name: 'Glycylglycylglycine', zh: '三甘肽', aliases: ['Gly-Gly-Gly', 'triglycine'], formula: 'C6H11N3O4', mw: 189.17, section: '7.34', page: 359, z0: 1, buffer: true,
    steps: [s(3.224, 0.84), s(8.09, 41.7)] },
  { id: 'hepes', name: 'HEPES', zh: 'HEPES', aliases: ['4-(2-hydroxyethyl)piperazine-1-ethanesulfonic acid'], formula: 'C8H18N2O4S', mw: 238.31, section: '7.36', page: 359, z0: 1, buffer: true,
    steps: [s(3.0, null, null, ['pK']), s(7.564, 20.4, 47)] },
  { id: 'hepps', name: 'HEPPS (EPPS)', zh: 'HEPPS（EPPS）', aliases: ['EPPS', '4-(2-hydroxyethyl)piperazine-1-propanesulfonic acid'], formula: 'C9H20N2O4S', mw: 252.33, section: '7.37', page: 359, z0: 0, buffer: true,
    steps: [s(7.957, 21.3, 48)] },
  { id: 'heppso', name: 'HEPPSO', zh: 'HEPPSO', aliases: [], formula: 'C9H20N2O5S', mw: 268.33, section: '7.38', page: 360, z0: 0, buffer: true,
    steps: [s(8.042, 23.7, 47)] },
  { id: 'histidine', name: 'L-Histidine', zh: 'L-组氨酸', aliases: ['histidine', 'His'], formula: 'C6H9N3O2', mw: 155.16, section: '7.39', page: 360, z0: 2, buffer: true,
    steps: [s(1.54, 3.6), s(6.07, 29.5, 176), s(9.34, 43.8, -233)] },
  { id: 'hydrazine', name: 'Hydrazine', zh: '肼', aliases: [], formula: 'H4N2', mw: 32.05, section: '7.40', page: 360, z0: 2,
    steps: [s(-0.99, 38.1), s(8.02, 41.7)], notes: [{ en: 'Toxic.', zh: '有毒。' }] },
  { id: 'imidazole', name: 'Imidazole', zh: '咪唑', aliases: [], formula: 'C3H4N2', mw: 68.08, section: '7.41', page: 360, z0: 1, buffer: true,
    steps: [s(6.993, 36.64, -9)] },
  { id: 'maleate', name: 'Maleate', zh: '马来酸盐', aliases: ['maleic acid'], formula: 'C4H4O4', mw: 116.07, section: '7.42', page: 360, z0: 0, buffer: true,
    steps: [s(1.92, 1.1, -21, ['dCp']), s(6.27, -3.6, -31, ['dCp'])] },
  { id: 'mercaptoethanol', name: '2-Mercaptoethanol', zh: '2-巯基乙醇', aliases: ['β-mercaptoethanol', 'BME'], formula: 'C2H6OS', mw: 78.13, section: '7.43', page: 360, z0: 0,
    steps: [s(9.75, 26.2)] },
  { id: 'mes', name: 'MES', zh: 'MES', aliases: ['2-(N-morpholino)ethanesulfonic acid'], formula: 'C6H13NO4S', mw: 195.24, section: '7.44', page: 360, z0: 0, buffer: true,
    steps: [s(6.27, 14.8, 5)] },
  { id: 'methylamine', name: 'Methylamine', zh: '甲胺', aliases: [], formula: 'CH5N', mw: 31.06, section: '7.45', page: 360, z0: 1,
    steps: [s(10.645, 55.34, 33)] },
  { id: 'methylimidazole', name: '2-Methylimidazole', zh: '2-甲基咪唑', aliases: [], formula: 'C4H6N2', mw: 82.104, section: '7.46', page: 360, z0: 1, buffer: true,
    steps: [s(8.01, 36.8)] },
  { id: 'mops', name: 'MOPS', zh: 'MOPS', aliases: ['3-(N-morpholino)propanesulfonic acid'], formula: 'C7H15NO4S', mw: 209.26, section: '7.48', page: 360, z0: 0, buffer: true,
    steps: [s(7.184, 21.1, 25)] },
  { id: 'mopso', name: 'MOPSO', zh: 'MOPSO', aliases: [], formula: 'C7H15NO5S', mw: 225.26, section: '7.49', page: 360, z0: 1, buffer: true,
    steps: [s(0.06), s(6.9, 25.0, 38, ['dCp'])] },
  { id: 'oxalate', name: 'Oxalate', zh: '草酸盐', aliases: ['oxalic acid'], formula: 'C2H2O4', mw: 90.036, section: '7.50', page: 360, z0: 0,
    steps: [s(1.27, -3.9, -231, ['dCp']), s(4.266, 7.0, -231)] },
  { id: 'phosphate', name: 'Phosphate', zh: '磷酸盐', aliases: ['phosphoric acid', 'PBS', 'sodium phosphate', 'potassium phosphate'], formula: 'H3PO4', mw: 98.00, section: '7.51', page: 360, z0: 0, buffer: true,
    steps: [s(2.148, -8.0, -141), s(7.198, 3.6, -230), s(12.35, 16.0, -242)] },
  { id: 'phthalate', name: 'Phthalate', zh: '邻苯二甲酸盐', aliases: ['phthalic acid', 'potassium hydrogen phthalate', 'KHP'], formula: 'C8H6O4', mw: 166.13, section: '7.52', page: 360, z0: 0, buffer: true,
    steps: [s(2.95, -2.7, -91), s(5.408, -2.17, -295)] },
  { id: 'piperazine', name: 'Piperazine', zh: '哌嗪', aliases: [], formula: 'C4H10N2', mw: 86.136, section: '7.53', page: 360, z0: 2, buffer: true,
    steps: [s(5.333, 31.11, 86), s(9.731, 42.89, 75)] },
  { id: 'pipes', name: 'PIPES', zh: 'PIPES', aliases: ['piperazine-N,N′-bis(2-ethanesulfonic acid)'], formula: 'C8H18N2O6S2', mw: 302.37, section: '7.54', page: 360, z0: 0, buffer: true,
    steps: [SULFONIC, s(7.141, 11.2, 22)],
    notes: [{ en: 'PIPES carries two sulfonate groups. Goldberg writes the buffering step as HL± = H⁺ + L⁻; here the free acid is H₂L (one sulfonic acid proton, completely dissociated in solution) and the buffering step is HL⁻ = H⁺ + L²⁻, so the free acid needs about 1.5 equivalents of base to reach its pK.', zh: 'PIPES 有两个磺酸基。Goldberg 把缓冲步骤写成 HL± = H⁺ + L⁻；这里把游离酸记为 H₂L（其中一个磺酸质子在溶液中完全解离），缓冲步骤为 HL⁻ = H⁺ + L²⁻，因此游离酸要加约 1.5 当量的碱才到 pK。' }] },
  { id: 'popso', name: 'POPSO', zh: 'POPSO', aliases: [], formula: 'C10H22N2O8S2', mw: 362.42, section: '7.55', page: 360, z0: 0, buffer: true,
    steps: [SULFONIC, s(8.0, null, null, ['pK'])],
    notes: [{ en: 'Two sulfonate groups: treated like PIPES (see its note).', zh: '有两个磺酸基，按 PIPES 的方式处理（见其说明）。' }] },
  { id: 'pyrophosphate', name: 'Pyrophosphate', zh: '焦磷酸盐', aliases: ['diphosphate'], formula: 'H4P2O7', mw: 177.98, section: '7.56', page: 360, z0: 0, buffer: true,
    steps: [s(0.83, -9.2, -90, ['dCp']), s(2.26, -5.0, -130, ['dCp']), s(6.72, 0.5, -136), s(9.46, 1.4, -141)] },
  { id: 'succinate', name: 'Succinate', zh: '琥珀酸盐', aliases: ['succinic acid'], formula: 'C4H6O4', mw: 118.09, section: '7.57', page: 360, z0: 0, buffer: true,
    steps: [s(4.207, 3.0, -121), s(5.636, -0.5, -217)] },
  { id: 'sulfate', name: 'Sulfate', zh: '硫酸盐', aliases: ['hydrogen sulfate'], formula: 'H2SO4', mw: 98.08, section: '7.58', page: 360, z0: -1,
    steps: [s(1.987, -22.4, -258)], notes: [{ en: 'Only HSO₄⁻ = H⁺ + SO₄²⁻ is tabulated; the first proton of sulfuric acid is treated as completely dissociated.', zh: '原表只给出 HSO₄⁻ = H⁺ + SO₄²⁻；硫酸的第一个质子按完全解离处理。' }] },
  { id: 'sulfite', name: 'Sulfite', zh: '亚硫酸盐', aliases: [], formula: 'H2SO3', mw: 82.08, section: '7.59', page: 360, z0: 0,
    steps: [s(1.857, -17.8, -272), s(7.172, -3.65, -262)] },
  { id: 'taps', name: 'TAPS', zh: 'TAPS', aliases: [], formula: 'C7H17NO6S', mw: 243.28, section: '7.61', page: 360, z0: 0, buffer: true,
    steps: [s(8.44, 40.4, 15)] },
  { id: 'tapso', name: 'TAPSO', zh: 'TAPSO', aliases: [], formula: 'C7H17NO7S', mw: 259.28, section: '7.62', page: 360, z0: 0, buffer: true,
    steps: [s(7.635, 39.09, -16)] },
  { id: 'tartrate', name: 'L(+)-Tartrate', zh: 'L-酒石酸盐', aliases: ['tartaric acid'], formula: 'C4H6O6', mw: 150.09, section: '7.63', page: 360, z0: 0, buffer: true,
    steps: [s(3.036, 3.19, -147), s(4.366, 0.93, -218)] },
  { id: 'tes', name: 'TES', zh: 'TES', aliases: [], formula: 'C6H15NO6S', mw: 229.25, section: '7.64', page: 360, z0: 0, buffer: true,
    steps: [s(7.55, 32.13, 0)] },
  { id: 'tricine', name: 'Tricine', zh: 'Tricine（三(羟甲基)甲基甘氨酸）', aliases: ['N-[tris(hydroxymethyl)methyl]glycine'], formula: 'C6H13NO5', mw: 179.17, section: '7.65', page: 360, z0: 1, buffer: true,
    steps: [s(2.023, 5.85, -196), s(8.135, 31.37, -53)] },
  { id: 'tea', name: 'Triethanolamine', zh: '三乙醇胺', aliases: ['TEA', 'TEOA'], formula: 'C6H15NO3', mw: 149.19, section: '7.66', page: 360, z0: 1, buffer: true,
    steps: [s(7.762, 33.6, 50)] },
  { id: 'triethylamine', name: 'Triethylamine', zh: '三乙胺', aliases: ['TEtA'], formula: 'C6H15N', mw: 101.19, section: '7.67', page: 360, z0: 1, buffer: true,
    steps: [s(10.72, 43.13, 151)] },
  { id: 'tris', name: 'Tris', zh: 'Tris（三羟甲基氨基甲烷）', aliases: ['tris(hydroxymethyl)aminomethane', 'THAM', 'Trizma', 'tromethamine'], formula: 'C4H11NO3', mw: 121.14, section: '7.68', page: 360, z0: 1, buffer: true,
    steps: [s(8.072, 47.45, -59)] },
];

export const SYSTEM_BY_ID: ReadonlyMap<string, AcidSystem> = new Map(SYSTEMS.map((x) => [x.id, x]));

export function getSystem(id: string): AcidSystem {
  const sys = SYSTEM_BY_ID.get(id);
  if (!sys) throw new Error(`unknown acid–base system "${id}"`);
  return sys;
}
