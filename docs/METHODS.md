# Methods

This page states every equation bufferbench uses and every approximation it makes. Code references are to `src/`.

## 1. What is computed

The solution is described by the total molality of each acid–base system (all protonation states together) and of each
spectator ion (Na⁺, K⁺, Cl⁻, Mg²⁺, Ca²⁺…). Given a temperature, the solver finds the hydrogen-ion activity that makes the
solution electrically neutral, with activity coefficients that depend on the ionic strength, which itself depends on the
speciation. The reported pH is the conventional pH, pH = −lg a(H⁺), on the molality scale: the quantity a pH meter
calibrated with standard buffers reports and the quantity NIST certifies for its standards.

## 2. Ionization constants and temperature (`model.ts`)

Each ionization step H_nL ⇌ H⁺ + H_{n−1}L has a thermodynamic constant K at T = 298.15 K and zero ionic strength, with
the standard enthalpy ΔrH° and heat-capacity change ΔrCp° from Goldberg et al. (2002). At another temperature T, with
θ = 298.15 K and ΔrCp° assumed constant:

ln K(T) = ln K(θ) − (ΔrH°/R)(1/T − 1/θ) + (ΔrCp°/R)(θ/T − 1 + ln(T/θ))

This is the Clarke–Glew equation that Goldberg et al. use (their Eq. 12), truncated after the ΔrCp° term, which is how
their tabulated quantities are meant to predict constants at temperatures "not too far from ambient". A missing ΔrH° is taken
as zero and reported (note `no-enthalpy`); a missing ΔrCp° is taken as zero and noted when the temperature is more than
10 °C from 25 °C.

Water: pK_w from the IAPWS R11-24 (2024) equation, evaluated at the density of liquid water at 0.1 MPa (IAPWS SR6-08).

## 3. Activity coefficients (`model.ts`)

For an ion of charge z at ionic strength I (mol/kg):

| Model | lg γ | Intended range |
|---|---|---|
| Davies (default) | −A z² (√I/(1 + √I) − 0.3 I) | I ≤ 0.5 |
| Bates–Guggenheim | −A z² √I/(1 + 1.5 √I) | I ≤ 0.1 |
| Ideal solution | 0 | dilute limit |

The Bates–Guggenheim form is the convention used to assign pH(S) to primary standards (IUPAC 2002, eq. 6′). Neutral
species, including zwitterions with no net charge, have γ = 1.

A, the Debye–Hückel limiting slope on the molality scale, is computed from first principles,

A = (2π N_A ρ_w)^½ · (e²/(4π ε₀ ε_r k T))^{3/2} / ln 10,

with the density ρ_w and relative permittivity ε_r of water from IAPWS SR6-08. It agrees with IUPAC 2002 Table A-6 to
within 0.0006 from 0 to 50 °C (the IUPAC values rest on older permittivity data); see `test/physics.test.ts`.

Ionic strength I = ½ Σ m_i z_i² includes every species, including H⁺ and OH⁻, so it is consistent with the speciation.

## 4. Solving (`equilibrium.ts`)

For trial values of I, the charge balance

Σ z m(spectators) + m(H⁺) − m(OH⁻) + Σ_systems Σ_j z_j m_j = 0

is solved for pH by bisection between −3 and 17 (it is monotonic in pH). The species distribution of each system follows
from a_j/a_0 = Π_{k≤j} K_k / a(H⁺)^j and m_j = a_j/γ_j, normalized to the system total. I is then recomputed and the
cycle repeated until it changes by less than 10⁻¹³ relative. Tests check that charge and mass balance close to machine
precision.

**Buffer capacity** β = dC_b/dpH is computed by a central difference with ±10⁻⁶ mol/kg of strong base and reported in
mmol per litre per pH unit. **dpH/dT** is computed by a central difference of ±0.5 °C at constant composition.

**Apparent pKa** (shown as pKa′) is the value for which pH = pKa′ + lg(m_base/m_acid) at the stated temperature and ionic
strength: pKa′ = pK(T) + lg γ_base − lg γ_acid.

## 5. Concentrations (`mixture.ts`)

Recipes are written in mol per litre of final solution. They are converted to molality as

m = c / ρ_w(t_prep),

that is, as if one litre of buffer contained the mass of water that fills one litre at the preparation temperature. The
solutes' own volume is neglected; below 0.1 mol/L this underestimates molality by well under 1 %, which moves pH by less
than 0.001 through the ionic strength. Molality does not change with temperature, so a buffer made up at 22 °C and used at
4 °C has the same composition in both.

## 6. Recipes (`recipe.ts`)

- **Titration**: a weighed form of the buffer (chosen automatically, or given) plus a strong acid or base. The amount of
  titrant n is found by bisection so that the pH at the temperature of use equals the target. The starting form must lie on
  the correct side of the target, otherwise the request is refused with a reason.
- **Mixing two forms**: the fraction x of the more basic form is found the same way, with the total fixed.
- **Stocks**: for an n× stock the target applies to the diluted solution; the amounts are multiplied by n and the stock's
  own reading is computed separately.
- **Meter readings**: the reading after making up to volume is the pH of the final composition at the preparation
  temperature. Buffers are usually titrated before making up to volume; the reading to titrate to is computed for the same
  amounts at 80 % of the final volume (`ADJUST_FRACTION`), where the solution is 1.25 times more concentrated. For 0.1 M
  phosphate the two readings differ by about 0.01.

## 7. Tiers and limits

| Tier | Condition |
|---|---|
| checked | For every buffer present, the buffering step (the one whose pKa′ is closest to the solution pH) is one a NIST certified standard in the benchmark exercises, the pH lies within one unit of the certified steps' pKa′ values (or between them), every temperature involved lies inside the certificates' range for that buffer (`CERTIFIED_T_RANGE`, e.g. 10–35 °C for carbonate), and I ≤ 0.1 |
| model | The same model and NIST-evaluated constants, but no certified standard for that step |
| extrapolated | I > 0.1, temperature outside 0–50 °C, the ideal-solution model, a missing ΔrH° away from 25 °C, or an approximate pK |

No pH is given above I = 0.5 mol/kg (the range of the Davies equation) or outside 0–60 °C. The Bates–Guggenheim model is
used above 0.1 only with a warning.

## 8. What the model leaves out

- **Specific ion interactions and ion pairing.** The activity coefficient depends only on charge. Sodium and potassium
  phosphate, for example, are treated alike; the two NIST phosphate standards, which differ in Na/K ratio, show a residual
  difference of about 0.008 that this model cannot reproduce.
- **Metal complexation.** Mg²⁺ and Ca²⁺ bind phosphate, citrate, carbonate and other anions; this is flagged, not modelled.
- **Neutral-species activity.** The Tris standard, a cationic acid whose base form is neutral, is predicted about 0.02 low
  at every temperature, which points to the activity of neutral Tris or a Tris-specific interaction rather than to the
  temperature model.
- **Open systems.** Carbonate is treated as closed (no CO₂ exchange with air). Alkaline solutions absorb CO₂; a note says so
  above pH 9.
- **Polyborates** above about 0.025 mol/kg total boron.

## References

- R. N. Goldberg, N. Kishore, R. M. Lennen, Thermodynamic quantities for the ionization reactions of buffers, J. Phys.
  Chem. Ref. Data 31, 231–370 (2002).
- R. P. Buck et al., Measurement of pH. Definition, standards, and procedures (IUPAC Recommendations 2002), Pure Appl.
  Chem. 74, 2169–2200 (2002).
- IAPWS SR6-08(2011), Revised Supplementary Release on Properties of Liquid Water at 0.1 MPa.
- IAPWS R11-24 (2024), Revised Release on the Ionization Constant of H₂O.
- CIAAW, Abridged standard atomic weights (2024).
- C. W. Davies, Ion Association, Butterworths, London (1962).
- R. G. Bates, E. A. Guggenheim, Report on the standardization of pH and related terminology, Pure Appl. Chem. 1, 163 (1960).
