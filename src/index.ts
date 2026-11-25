// bufferbench: buffer recipes and pH predictions from evaluated thermodynamic data, checked against
// NIST certified pH standards.

export { VERSION, HOMEPAGE } from './version.ts';
export { SYSTEMS, SYSTEM_BY_ID, getSystem, type AcidSystem, type Step, type Approx } from './data/systems.ts';
export { REAGENTS, REAGENT_BY_ID, getReagent, reagentCharge, type Reagent, type ReagentRole } from './data/reagents.ts';
export { ATOMIC_WEIGHTS, molarMass, parseFormula } from './elements.ts';
export { waterDensity, waterPermittivity, pKw, pKwAt, debyeHuckelA, GAS_CONSTANT, T_REF } from './physics.ts';
export { lnK, pKAt, activityFunction, ACTIVITY_MODELS, MODEL_LIMIT, type ActivityModel } from './model.ts';
export { solve, bufferCapacity, ION_CHARGE, type Composition, type Equilibrium, type SpeciesState, type SolveOptions } from './equilibrium.ts';
export { compositionFromMolalities, compositionFromMolarities, molalityFromMolarity, type Amounts } from './mixture.ts';
export {
  recipe, predict, suggest, apparentPKa, BufferError, CERTIFIED_SYSTEMS, CERTIFIED_STEPS, HARD_LIMIT, ADJUST_FRACTION, T_CHECKED, T_ACCEPTED,
  type Recipe, type RecipeRequest, type Prediction, type PredictRequest, type Ingredient, type Note, type Tier, type Method, type Suggestion, type Assessment,
} from './recipe.ts';
export { noteText, tierText, type Lang } from './messages.ts';
