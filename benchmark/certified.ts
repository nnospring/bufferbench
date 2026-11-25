// Certified pH values of NIST Standard Reference Material buffers.
//
// These are the external reference this project is measured against. Every value was read from the
// certificate named in `source` (text layer where the PDF has one, otherwise the scanned page image)
// and is never adjusted. pH(S) is lg(1/a_H) on the molality scale under the Bates–Guggenheim
// convention, measured with cells without liquid junction (Harned cells).
//
// Compositions are in mol/kg of water, as specified by each certificate.

export interface Certified {
  id: string;
  name: string;
  /** Reagent id → molality (mol/kg). */
  composition: Readonly<Record<string, number>>;
  /** t (°C) → certified pH(S). */
  values: Readonly<Record<number, number>>;
  /** Expanded uncertainty (≈95 %) stated by the certificate, pH units. */
  uncertainty: number;
  source: string;
  /** What kind of chemistry the standard exercises. */
  covers: string;
}

export const CERTIFIED: readonly Certified[] = [
  {
    id: 'srm185i',
    name: 'Potassium hydrogen phthalate, 0.05 mol/kg',
    composition: { khp: 0.05 },
    values: { 5: 4.003, 10: 3.999, 15: 3.999, 20: 4.001, 25: 4.005, 30: 4.012, 35: 4.021, 37: 4.025, 40: 4.031, 45: 4.044, 50: 4.058 },
    uncertainty: 0.010,
    source: 'NIST SRM 185i certificate, Table 1 (issued 24 July 2025)',
    covers: 'diprotic carboxylic acid, amphoteric salt, I ≈ 0.05',
  },
  {
    id: 'srm186-1to1',
    name: 'KH₂PO₄ 0.025 + Na₂HPO₄ 0.025 mol/kg',
    composition: { kh2po4: 0.025, na2hpo4: 0.025 },
    values: { 5: 6.9515, 10: 6.9229, 15: 6.8989, 20: 6.8796, 25: 6.864, 30: 6.8526, 35: 6.8435, 37: 6.8408, 40: 6.8372, 45: 6.8346, 50: 6.8331 },
    uncertainty: 0.010,
    source: 'NIST SRM 186-I-g / 186-II-g certificate, Table 1 (issued 23 May 2003; from the NIST certificate archive)',
    covers: 'phosphate H₂PO₄⁻/HPO₄²⁻ (charge −1/−2), I ≈ 0.10',
  },
  {
    id: 'srm186-1to3.5',
    name: 'KH₂PO₄ 0.008695 + Na₂HPO₄ 0.03043 mol/kg',
    composition: { kh2po4: 0.008695, na2hpo4: 0.03043 },
    values: { 5: 7.5026, 10: 7.4747, 15: 7.4511, 20: 7.4323, 25: 7.4157, 30: 7.4044, 35: 7.3956, 37: 7.394, 40: 7.3897, 45: 7.387, 50: 7.3848 },
    uncertainty: 0.010,
    source: 'NIST SRM 186-I-g / 186-II-g certificate, Table 2 (issued 23 May 2003; from the NIST certificate archive)',
    covers: 'phosphate at a 1:3.5 ratio, I ≈ 0.10',
  },
  {
    id: 'srm187e',
    name: 'Borax (Na₂B₄O₇·10H₂O), 0.01 mol/kg',
    composition: { borax: 0.01 },
    values: { 5: 9.3934, 10: 9.3328, 15: 9.2784, 20: 9.2295, 25: 9.1855, 30: 9.1459, 35: 9.1099, 37: 9.0965, 40: 9.0772, 45: 9.0472, 50: 9.0195 },
    uncertainty: 0.010,
    source: 'NIST SRM 187e certificate, Tables 1–2 (issued 30 May 2014)',
    covers: 'boric acid / borate (charge 0/−1), I ≈ 0.02',
  },
  {
    id: 'srm191d',
    name: 'NaHCO₃ 0.025 + Na₂CO₃ 0.025 mol/kg',
    composition: { nahco3: 0.025, na2co3: 0.025 },
    values: { 10: 10.179, 15: 10.118, 20: 10.063, 25: 10.014, 30: 9.968, 35: 9.926 },
    uncertainty: 0.010,
    source: 'NIST SRM 191d certificate, Table 1 (issued 5 February 2025)',
    covers: 'carbonate HCO₃⁻/CO₃²⁻ (charge −1/−2), I ≈ 0.10',
  },
  {
    id: 'srm922-923',
    name: 'Tris 0.01667 + Tris·HCl 0.0500 mol/kg',
    composition: { tris: 0.01667, 'tris-hcl': 0.05 },
    values: { 0: 8.471, 5: 8.303, 10: 8.142, 15: 7.988, 20: 7.84, 25: 7.699, 30: 7.563, 35: 7.433, 37: 7.382, 40: 7.307, 45: 7.186, 50: 7.07 },
    uncertainty: 0.005,
    source: 'NIST SRM 922 / 923 certificate (revision of 24 May 1993; from the NIST certificate archive), page 1',
    covers: 'cationic acid TrisH⁺/Tris (charge +1/0), I ≈ 0.05',
  },
];
