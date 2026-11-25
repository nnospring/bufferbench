# bufferbench

**English** | [简体中文](README.zh-CN.md)

**Buffer recipes and pH predictions that account for temperature and ionic strength, checked against NIST certified pH
standards.**

[Open the web app](https://nnospring.github.io/bufferbench/) · runs entirely in your browser, nothing is uploaded.

The pH of a real buffer depends not only on the ratio of acid to base but also on ionic strength and temperature, which
a Henderson–Hasselbalch calculation with a pKa for 25 °C leaves out. Two examples, as predicted by the model:

<!-- effects:start -->
- Adding 150 mM NaCl to a 20 mM phosphate buffer (10 mM each of KH₂PO₄ and Na₂HPO₄) is predicted to change its pH at 25 °C by −0.14 (ionic strength above 0.1: extrapolated).
- A 50 mM Tris buffer (30 mM HCl) made up at 22 °C is predicted to change by +0.55 when cooled to 4 °C.
<!-- effects:end -->

bufferbench solves the full equilibrium with activity coefficients and temperature-dependent constants, tells you what to
weigh and what the pH meter should read while you make the buffer, and says how far each answer has been checked.

<!-- demo:start -->
```text
$ bufferbench recipe tris --conc 50mM --ph 8.0 --temp 4 --prep-temp 22
Tris 50 mM, pH 8 @ 4 °C, 1 L

  Tris base                                    C4H11NO3           50 mM        6.057 g
  Hydrochloric acid                            HCl                43.004 mM    43.00 mL of 1 M

Titrate at 22 °C to pH 7.46 (at 80 % of the volume), then make up to volume
Meter reading at 22 °C after making up to volume: pH 7.45
At 4 °C: pH 8.00, I = 0.043 mol/kg, β = 13.9 mM/pH, dpH/dT = -0.0330 /°C, pKa′ = 8.79

Checked: the buffering step, temperature and pH are inside what NIST certified pH standards cover; the model reproduces all 62 certified values of 6 standards within 0.021 pH (I ≤ 0.1).
! Temperature matters here: the finished buffer reads pH 7.45 at 22 °C and is pH 8.00 at 4 °C.
· Tris buffers as a cationic acid (BH⁺ ⇌ B + H⁺). The only certified standard of this kind, Tris, is predicted about 0.02 pH low; whether other buffers of this kind share the offset is not known.
```
<!-- demo:end -->

## How accurate it is

The model predicts the pH of NIST certified buffer standards from their composition alone. No parameter was fitted to them.

<!-- accuracy:start -->
| Activity model | Certified values | Max \|Δ\| | Median \|Δ\| |
|---|---:|---:|---:|
| Davies (default) | 62 | 0.021 | 0.010 |
| Bates–Guggenheim | 62 | 0.021 | 0.008 |
| Ideal solution (no activity correction) | 62 | 0.354 | 0.184 |

6 NIST Standard Reference Materials (phosphate at two ratios, potassium hydrogen phthalate, borax, carbonate, Tris) at every temperature on their certificates, 0–50 °C. Δ = computed − certified, in pH units.
<!-- accuracy:end -->

Every point is listed in [docs/VALIDATION.md](docs/VALIDATION.md), which CI regenerates and compares on every change. Each
answer carries a tier:

- **Checked**: the buffering step is one a certified standard exercises (phosphate, phthalate, borate, carbonate and Tris),
  the pH is near it, the temperatures lie within that standard's certified range (5–50 °C for most, 10–35 °C for carbonate,
  0–50 °C for Tris), and the ionic strength is at most 0.1 mol/kg.
- **Model**: the same equations and NIST-evaluated constants, for a buffer with no certified standard (HEPES, MOPS, MES…).
- **Extrapolated**: ionic strength above 0.1, temperature outside 0–50 °C, or constants the source marks as missing or
  approximate. The notes say which.

Above an ionic strength of 0.5 mol/kg no pH is given. A 10× PBS stock is such a case: bufferbench gives the amounts to
weigh and the pH after dilution, and says that the stock's own reading cannot be predicted.

## What it does

- **Recipe**: grams of each form, titrant volume, the pH to titrate to at the preparation temperature (at 80 % of the
  final volume, where the solution is more concentrated), the reading after making up to volume, and the pH at the
  temperature of use. Titrate one form with NaOH, KOH or HCl, or mix two forms; add NaCl, KCl, MgCl₂, CaCl₂; make an n×
  stock.
- **Predict pH** of any mixture of the listed reagents at any temperature from 0 to 60 °C, with ionic strength, buffer
  capacity, dpH/dT and the species distribution.
- **Choose a buffer**: buffers whose apparent pKa at your temperature and ionic strength is near your target pH, with their
  temperature coefficients.
- <!-- counts:start -->64 acid–base systems and 75 reagents<!-- counts:end --> (free acids, bases, salts and hydrates), listed in [docs/BUFFERS.md](docs/BUFFERS.md).

## Command line

Requires Node.js 20 or later. The package is not on npm yet; run it from a clone:

```bash
git clone https://github.com/nnospring/bufferbench.git
cd bufferbench
npm ci
npm run build
node dist/cli.js recipe hepes --conc 50mM --ph 7.4 --temp 37 --add nacl=150mM
node dist/cli.js ph tris=50mM hcl=40mM --temp 4
node dist/cli.js suggest 7.4 --temp 37
node dist/cli.js --help
```

Add `--json` for machine-readable output and `--lang zh` for Chinese.

## Library

```ts
import { recipe, predict, noteText } from 'bufferbench';

const r = recipe({ system: 'hepes', concentration: 0.05, pH: 7.4, tUse: 37, tPrep: 22, volume: 1, additives: { nacl: 0.15 } });
r.ingredients;        // reagent, molarity, grams, titrant volume
r.prep.pHAdjust;      // titrate to this at 22 °C, at 80 % of the volume
r.prep.pH;            // reading after making up to volume
r.use.pH;             // 7.4 at 37 °C
r.tier;               // 'checked' | 'model' | 'extrapolated'
r.notes.map((n) => noteText(n, 'en'));

predict({ amounts: { kh2po4: 0.025, na2hpo4: 0.025 }, t: 37 }).pH;
```

The library has no dependencies and runs in browsers and Node.js. Recipes throw a `BufferError` with a `code` when a
request cannot be met or lies outside the model.

## How it works

- **Constants**: pK, ΔrH° and ΔrCp° of the ionization steps of 64 acid–base systems from the NIST evaluation by Goldberg, Kishore & Lennen (2002),
  extrapolated in temperature with the van 't Hoff equation at constant ΔCp.
- **Water**: density and permittivity from IAPWS SR6-08, the ionization constant from IAPWS R11-24; the Debye–Hückel slope
  is computed from them. **Molar masses**: CIAAW 2024 atomic weights.
- **Activity**: Davies equation by default (Bates–Guggenheim and ideal solution as options); the charge balance is solved
  for pH and the ionic strength iterated to self-consistency.
- The result is the conventional pH a calibrated pH meter reports.

Details and equations: [docs/METHODS.md](docs/METHODS.md). Where every number comes from and how the transcription was
checked: [docs/DATA.md](docs/DATA.md).

## Limits

- No ion pairing or metal complexation: Mg²⁺ and Ca²⁺ with phosphate, citrate or carbonate are flagged, not modelled.
- Neutral and zwitterionic species are given an activity coefficient of 1. The Tris standard, the only cationic-acid
  buffer among the standards, comes out about 0.02 low.
- Molarity is converted to molality as if the solutes took no volume (under 1 % error below 0.1 M).
- Carbonate is treated as a closed system; borate above about 0.025 mol/kg forms polyborates that are not modelled.

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md). A change to a constant needs its primary source. GPL-3.0-only; see
[LICENSE](LICENSE).
