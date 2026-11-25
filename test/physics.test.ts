import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debyeHuckelA, GAS_CONSTANT, pKw, pKwAt, waterDensity, waterPermittivity } from '../src/physics.ts';

const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (tol ${tol})`);
const C = (K: number) => K - 273.15;

test('IAPWS SR6-08 Table 8: density of liquid water at 0.1 MPa', () => {
  close(waterDensity(C(260)), 997.06836, 5e-6);
  close(waterDensity(C(298.15)), 997.047013, 5e-6);
  close(waterDensity(C(375)), 957.00971, 5e-6);
});

test('IAPWS SR6-08 Table 8: static dielectric constant', () => {
  close(waterPermittivity(C(260)), 93.455835, 5e-6);
  close(waterPermittivity(C(298.15)), 78.375218, 5e-6);
  close(waterPermittivity(C(375)), 55.266199, 5e-6);
});

test('IAPWS R11-24 Table 2: pKw test values', () => {
  const table: [number, number, number][] = [
    [300, 1.0, 13.906672],
    [600, 0.07, 20.161651],
    [600, 0.7, 11.147093],
    [800, 0.2, 14.487671],
    [800, 1.2, 6.4058649],
    [1270, 0.0, 35.081557],
  ];
  for (const [T, rho, expected] of table) close(pKwAt(T, rho), expected, 5e-7, `T=${T} ρ=${rho}`);
});

test('IAPWS R11-24 Table 3: pKw of liquid water at 0.1 MPa (printed to 0.01)', () => {
  close(pKw(0), 14.95, 0.005);
  close(pKw(25), 13.99, 0.005);
  close(pKw(50), 13.26, 0.006);
});

test('Debye–Hückel A from IAPWS ε and ρ agrees with IUPAC 2002 Table A-6', () => {
  // IUPAC 2002 (Buck et al.) Table A-6, A in (mol/kg)^-1/2, based on older permittivity data
  const iupac: [number, number][] = [[0, 0.4904], [5, 0.4941], [10, 0.4978], [15, 0.5017], [20, 0.5058], [25, 0.51], [30, 0.5145], [35, 0.5192], [40, 0.5241], [45, 0.5292], [50, 0.5345]];
  for (const [t, A] of iupac) close(debyeHuckelA(t), A, 0.0006, `${t} °C`);
});

test('gas constant is N_A·k exactly', () => {
  close(GAS_CONSTANT, 8.31446261815324, 1e-12);
});

test('temperatures outside the IAPWS range are refused', () => {
  assert.throws(() => waterDensity(-30), RangeError);
  assert.throws(() => pKw(120), RangeError);
});
