// Turning amounts of reagents into a composition the equilibrium solver understands.

import { getReagent } from './data/reagents.ts';
import type { Composition } from './equilibrium.ts';
import { waterDensity } from './physics.ts';

/** Reagent id → amount. Units depend on the function (mol/kg or mol/L). */
export type Amounts = Readonly<Record<string, number>>;

/** Builds a composition (mol/kg) from reagent molalities. `H+` and `OH-` are not spectators and are dropped. */
export function compositionFromMolalities(amounts: Amounts): Composition {
  const systems: Record<string, number> = {};
  const ions: Record<string, number> = {};
  for (const [id, m] of Object.entries(amounts)) {
    if (!(m >= 0) || !Number.isFinite(m)) throw new RangeError(`amount of ${id} must be a finite non-negative number`);
    if (m === 0) continue;
    const r = getReagent(id);
    if (r.system) systems[r.system] = (systems[r.system] ?? 0) + m * (r.perUnit ?? 1);
    for (const [ion, n] of Object.entries(r.ions)) {
      if (ion === 'H+' || ion === 'OH-') continue;
      ions[ion] = (ions[ion] ?? 0) + m * n;
    }
  }
  return { systems, ions };
}

/**
 * Converts concentrations in mol/L of solution to mol/kg of water.
 *
 * The approximation is that one litre of a dilute buffer contains the mass of water that fills one
 * litre at the preparation temperature: m = c / ρ_w(t). For 0.1 mol/L of solutes this overestimates
 * the water and underestimates molality by well under 1 %, which moves pH by less than 0.001 through the
 * ionic strength. Molality does not change with temperature afterwards, so a buffer made up at 20 °C
 * and used at 4 °C has the same composition in both.
 */
export function molalityFromMolarity(c: number, tPrepC: number): number {
  return c / (waterDensity(tPrepC) / 1000);
}

export function compositionFromMolarities(amounts: Amounts, tPrepC: number): Composition {
  const molal: Record<string, number> = {};
  for (const [id, c] of Object.entries(amounts)) molal[id] = molalityFromMolarity(c, tPrepC);
  return compositionFromMolalities(molal);
}
