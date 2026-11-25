// Physical constants and the properties of pure water that the equilibrium model needs.
//
// Every number here comes from a primary source named next to it. The tests reproduce the
// verification values printed in those sources (test/physics.test.ts).

/** SI defining constants (exact since 2019). */
export const ELEMENTARY_CHARGE = 1.602176634e-19; // C
export const BOLTZMANN = 1.380649e-23; // J/K
export const AVOGADRO = 6.02214076e23; // 1/mol
/** Molar gas constant, R = N_A·k (exact). */
export const GAS_CONSTANT = AVOGADRO * BOLTZMANN; // J/(mol·K)
/** Vacuum electric permittivity, CODATA 2018 recommended value. */
export const VACUUM_PERMITTIVITY = 8.8541878128e-12; // F/m

export const KELVIN = 273.15;
export const T_REF = 298.15; // K, reference temperature of the tabulated buffer data

/** Temperature range (°C) of the water correlations used below (IAPWS SR6-08, 253.15–383.15 K). */
export const WATER_T_MIN = -20;
export const WATER_T_MAX = 110;

function kelvin(tC: number): number {
  if (!(tC >= WATER_T_MIN && tC <= WATER_T_MAX)) throw new RangeError(`temperature ${tC} °C is outside ${WATER_T_MIN}–${WATER_T_MAX} °C`);
  return tC + KELVIN;
}

// IAPWS SR6-08(2011), Revised Supplementary Release on Properties of Liquid Water at 0.1 MPa.
// Eq. (2): v0 = (R·T_R/p0)·(a5 + Σ_{i=6..10} a_i α^{n_i} + Σ_{i=5..10} b_i β^{m_i}),
// α = T_R/(T_a − T), β = T_R/(T − T_b). Coefficients: Table 1 (rows 5–10).
const SR6 = {
  R: 461.51805, // J/(kg·K)
  TR: 10,
  p0: 0.1e6,
  Ta: 593,
  Tb: 232,
  a5: 1.93763157e-2,
  a: [ // [n_i, a_i] for i = 6..10
    [4, 6.74458446e3],
    [5, -2.22521604e5],
    [7, 1.00231247e8],
    [8, -1.63552118e9],
    [9, 8.32299658e9],
  ],
  b: [ // [m_i, b_i] for i = 5..10
    [1, 5.78545292e-3],
    [2, -1.53195665e-2],
    [3, 3.11337859e-2],
    [4, -4.23546241e-2],
    [5, 3.38713507e-2],
    [6, -1.19946761e-2],
  ],
} as const;

/** Density of liquid water at 0.1 MPa, kg/m³ (IAPWS SR6-08 Eq. 2). */
export function waterDensity(tC: number): number {
  const T = kelvin(tC);
  const alpha = SR6.TR / (SR6.Ta - T);
  const beta = SR6.TR / (T - SR6.Tb);
  let sum = SR6.a5;
  for (const [n, a] of SR6.a) sum += a * alpha ** n;
  for (const [m, b] of SR6.b) sum += b * beta ** m;
  const v = ((SR6.R * SR6.TR) / SR6.p0) * sum; // m³/kg
  return 1 / v;
}

// IAPWS SR6-08 Eq. (9): ε = Σ e_i (T/300 K)^{f_i}, Table 7.
const EPS: readonly (readonly [number, number])[] = [
  [-43.7527, -0.05],
  [299.504, -1.47],
  [-399.364, -2.11],
  [221.327, -2.31],
];

/** Static relative permittivity (dielectric constant) of liquid water at 0.1 MPa (IAPWS SR6-08 Eq. 9). */
export function waterPermittivity(tC: number): number {
  const Ts = kelvin(tC) / 300;
  let eps = 0;
  for (const [e, f] of EPS) eps += e * Ts ** f;
  return eps;
}

// IAPWS R11-24 (2024), Revised Release on the Ionization Constant of H2O, Eqs. (2)–(4) and Table 1.
const KW = {
  n: 6,
  Mw: 18.015268, // g/mol
  alpha: [-0.702132, 8681.05, -24145.1],
  beta: [0.813876, -51.4471, -0.46992],
} as const;

/** pK_w of water as a function of temperature (K) and density (g/cm³), IAPWS R11-24 Eq. (2). */
export function pKwAt(T: number, rho: number): number {
  const [a0, a1, a2] = KW.alpha;
  const [b0, b1, b2] = KW.beta;
  const Z = rho * Math.exp(a0 + a1 / T + (a2 / (T * T)) * rho ** (2 / 3));
  const pKG = 0.61415 + 48251.33 / T - 67707.93 / T ** 2 + 10102100 / T ** 3;
  return -2 * KW.n * (Math.log10(1 + Z) - (Z / (Z + 1)) * rho * (b0 + b1 / T + b2 * rho)) + pKG + 2 * Math.log10(KW.Mw / 1000);
}

/** pK_w of liquid water at 0.1 MPa (molality scale). */
export function pKw(tC: number): number {
  return pKwAt(kelvin(tC), waterDensity(tC) / 1000);
}

/**
 * Debye–Hückel limiting-law slope A for lg γ on the molality scale, (kg/mol)^½:
 * A = (2π N_A ρ_w)^½ · (e²/(4π ε0 ε_r k T))^{3/2} / ln 10,
 * evaluated with the IAPWS density and permittivity above.
 */
export function debyeHuckelA(tC: number): number {
  const T = kelvin(tC);
  const rho = waterDensity(tC); // kg/m³
  const eps = waterPermittivity(tC);
  const bjerrum = ELEMENTARY_CHARGE ** 2 / (4 * Math.PI * VACUUM_PERMITTIVITY * eps * BOLTZMANN * T); // m
  return (Math.sqrt(2 * Math.PI * AVOGADRO * rho) * bjerrum ** 1.5) / Math.LN10;
}
