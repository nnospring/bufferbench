# Data: sources and how they were checked

Every number the model uses comes from a primary source named here. None was adjusted to fit the benchmark.

## Sources

| What | Source | Where in the code |
|---|---|---|
| pK, ΔrH°, ΔrCp° of 64 buffer ionizations | Goldberg, Kishore & Lennen, J. Phys. Chem. Ref. Data 31, 231 (2002), Section 8, pp. 359–360 | `src/data/systems.ts` |
| Density and permittivity of water at 0.1 MPa | IAPWS SR6-08(2011), Eqs. (2) and (9), Tables 1 and 7 | `src/physics.ts` |
| Ionization constant of water | IAPWS R11-24 (2024), Eqs. (2)–(4), Table 1 | `src/physics.ts` |
| Atomic weights | CIAAW abridged standard atomic weights (2024) | `src/elements.ts` |
| Physical constants | SI defining constants; ε₀ from CODATA 2018 | `src/physics.ts` |
| Certified pH values (benchmark only) | NIST SRM certificates 185i, 186-I-g/186-II-g, 187e, 191d, 922/923 | `benchmark/certified.ts` |

The NIST paper is free to read at https://www.nist.gov/document/jpcrd615pdf. It is not redistributed here.

## How the buffer constants were transcribed

The PDF's text layer loses minus signs, charge superscripts, "≈" and subscript digits (hydrazine's pK of −0.99 reads as
"0.99"). So:

1. Digits were taken from the text layer.
2. Signs, charges and "≈" were read from the rendered page images of pp. 359–360.
3. Three machine checks against Section 7 of the paper (the per-buffer tables), run with
   `node scripts/audit-goldberg.ts <text of the paper>`:
   - **Constants, formulas and molecular weights.** For every system, the empirical formula, the molecular weight and every
     pK, |ΔrH°| and |ΔrCp°| in the "Selected values" line match the data file, and ΔrG° = RT·ln 10·pK. Result: every
     value matches; the script reports one finding, an extra ΔrG° in the sulfite section that belongs to the disulfite
     equilibrium (63 of 64 systems without findings).
     `test/data.test.ts` repeats the formula-mass check on every run.
   - **Signs of ΔrH°.** Where the paper lists pK values measured at I = 0 at several temperatures, pK must fall with
     temperature when ΔrH° > 0. Result: 55 of 59 checkable steps agree. The other four (maleate pK 6.27, oxalate pK 4.266,
     pyrophosphate pK 2.26, arsenate pK 11.9) have small or scattered temperature trends in the literature; the sign printed
     in Section 8 was kept.
   - **Charges.** pK values measured at I = 0.05–0.5 M near 25 °C differ from the I = 0 value by roughly
     (2·z_acid − 1)·A·f(I), so the size and direction of the shift tell the charge type. Result: 64 of 75 checkable steps
     agree. The other eleven are steps below pK 3 (ADA, Bicine, Tricine, glycerol 2-phosphate, pyrophosphate pK 0.83),
     steps with one or two measurements (3-aminopropanesulfonic acid, arsenate pK 7.05, cysteine pK 10.75, HEPPSO) and
     pyrophosphate pK 9.46, where alkali-metal ion pairing is strong. None is the working step of a common buffer; the
     charges printed in Section 8 were kept.

     The same comparison is the only external check of the model above I = 0.1, and it is coarse: for the working steps
     of HEPES, MOPS, MES, TES, Bicine, imidazole and triethanolamine, literature pKa values measured at I = 0.05–0.5 M
     near 25 °C differ from the model's apparent pKa by 0.03–0.09 on average (2–19 values per buffer), about as much as
     the literature values scatter among themselves.

Four buffers in the paper (CABS, HEPBS, MOBS, TABS) have no selected pK and are left out.

## Departures from the printed reactions

- **PIPES.** Section 8 writes the buffering step as HL± = H⁺ + L⁻ with HL = C₈H₁₈N₂O₆S₂. PIPES has two sulfonate groups,
  so the free acid carries one sulfonic-acid proton that is completely dissociated in solution, and the buffering step is
  HL⁻ = H⁺ + L²⁻. The paper's own literature table supports this: Good et al. (1966) measured pK 6.82 at 20 °C and
  I = 0.1 M against 7.171 at I = 0, a shift of −0.35; a −1/−2 step predicts about −0.32, a 0/−1 step about −0.11. The
  charge audit above agrees. The practical consequence is that PIPES free acid needs about 1.5 equivalents of base at its
  pKa. The sulfonic step is given pK −2 and marked `assumed`.
- **POPSO** has the same two sulfonate groups and is treated the same way. Its pK (8.0) is marked approximate in the
  paper, which derived it from a single measurement at unknown ionic strength.
- **Sulfate.** Only HSO₄⁻ = H⁺ + SO₄²⁻ is tabulated; the first proton of sulfuric acid is treated as fully dissociated.
- **Carbonate.** The paper's reference species is CO₂(aq); the data file uses its formula and molecular weight.

## Reagents

`src/data/reagents.ts` lists the substances you weigh, with their formulas. Molar masses are computed from the formulas.
Two tests guard them: every reagent is electrically neutral given its system's charges, and every buffer reagent carries
exactly the heavy-atom skeleton (C, N, S, P, B, As) of its system, which catches a wrong salt or hydrate formula.

## The benchmark

`benchmark/certified.ts` holds the certified pH(S) values of six NIST Standard Reference Material buffers, each with the
certificate and table it came from. The values were read from the text layer of the certificate PDFs, except SRM 922/923,
a scanned page that was read from the image. SRM 186-g (issued 2003) and 922/923 (revised 1993) come from NIST's
certificate archive because the current certificates were not retrievable; later lots can differ by a few thousandths.

The IUPAC 2002 recommendations (Buck et al., Table 2) give "typical" pH(PS) values for the same primary standards and
state that they should not replace the certified value of a specific batch. They differ from the NIST certificates by up
to 0.018 (1:3.5 phosphate at 50 °C: 7.367 against 7.3848), so the benchmark uses the certificates only.

## Adding or changing a constant

A pull request that adds a buffer or changes a constant must say where the value comes from (paper, page, table, row) and
must not be motivated by the benchmark. Run `npm test`, `node scripts/benchmark.ts` and `node scripts/gen-docs.ts`, and
commit the regenerated files.
