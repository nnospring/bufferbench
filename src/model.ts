// Thermodynamic model: temperature dependence of ionization constants and ionic activity coefficients.

import { GAS_CONSTANT, KELVIN, T_REF, debyeHuckelA } from './physics.ts';
import type { Step } from './data/systems.ts';

/**
 * ln K of one ionization step at temperature tC (°C), integrating the van 't Hoff equation with a
 * constant heat-capacity change: the Clarke–Glew equation used by Goldberg et al. (2002, Eq. 12), truncated after
 * the ΔrCp° term:
 * ln K(T) = ln K(θ) − (ΔH/R)(1/T − 1/θ) + (ΔCp/R)(θ/T − 1 + ln(T/θ)), θ = 298.15 K.
 * A missing ΔH or ΔCp is taken as zero; callers report that as a limitation.
 */
export function lnK(step: Step, tC: number): number {
  const T = tC + KELVIN;
  const lnK0 = -step.pK * Math.LN10;
  const dH = (step.dH ?? 0) * 1000;
  const dCp = step.dCp ?? 0;
  return lnK0 - (dH / GAS_CONSTANT) * (1 / T - 1 / T_REF) + (dCp / GAS_CONSTANT) * (T_REF / T - 1 + Math.log(T / T_REF));
}

export function pKAt(step: Step, tC: number): number {
  return -lnK(step, tC) / Math.LN10;
}

export type ActivityModel = 'davies' | 'bates-guggenheim' | 'ideal';

export const ACTIVITY_MODELS: readonly ActivityModel[] = ['davies', 'bates-guggenheim', 'ideal'];

/** Ionic strength (mol/kg) above which each model is no longer used without a warning. */
export const MODEL_LIMIT: Readonly<Record<ActivityModel, number>> = {
  davies: 0.5,
  'bates-guggenheim': 0.1,
  ideal: 0.001,
};

/**
 * Returns lg γ for an ion of charge z at ionic strength I (mol/kg) and temperature tC.
 * - Davies: lg γ = −A z² (√I/(1+√I) − 0.3 I)
 * - Bates–Guggenheim: lg γ = −A z² √I/(1 + 1.5 √I), the convention that defines pH(PS) of primary standards
 * - ideal: lg γ = 0
 * Neutral species (z = 0), including zwitterions with no net charge, get lg γ = 0 in every model.
 */
export function activityFunction(model: ActivityModel, tC: number): (z: number, I: number) => number {
  if (model === 'ideal') return () => 0;
  const A = debyeHuckelA(tC);
  if (model === 'davies') {
    return (z, I) => {
      if (z === 0) return 0;
      const r = Math.sqrt(I);
      return -A * z * z * (r / (1 + r) - 0.3 * I);
    };
  }
  return (z, I) => {
    if (z === 0) return 0;
    const r = Math.sqrt(I);
    return (-A * z * z * r) / (1 + 1.5 * r);
  };
}
