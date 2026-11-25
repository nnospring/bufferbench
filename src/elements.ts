// Molar masses from empirical formulas, using the CIAAW abridged standard atomic weights (2024).
// https://www.ciaaw.org/abridged-atomic-weights.htm — only the elements that occur in buffer reagents.

export const ATOMIC_WEIGHTS: Readonly<Record<string, number>> = {
  H: 1.008,
  B: 10.81,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  Na: 22.99,
  Mg: 24.305,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  K: 39.098,
  Ca: 40.078,
  As: 74.922,
};

/**
 * Parses an empirical formula such as `C8H18N2O4S`, `Na2HPO4·7H2O`, `Na2HPO4.7H2O` or `(HOCH2)3CNH2`
 * into element counts. Hydrate parts may start with a multiplier (`·7H2O`, `·1.5H2O`).
 */
export function parseFormula(formula: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const rawPart of formula.split(/[·•.](?=\d*\.?\d*[A-Z(])/)) {
    const part = rawPart.trim();
    if (!part) throw new SyntaxError(`empty part in formula "${formula}"`);
    const lead = /^(\d+(?:\.\d+)?)/.exec(part);
    const mult = lead ? Number(lead[1]) : 1;
    const body = lead ? part.slice(lead[1]!.length) : part;
    const partCounts = parseGroup(body, formula);
    for (const [el, n] of partCounts) counts.set(el, (counts.get(el) ?? 0) + n * mult);
  }
  return counts;
}

function parseGroup(s: string, whole: string): Map<string, number> {
  const stack: Map<string, number>[] = [new Map()];
  let i = 0;
  const readNumber = (): number => {
    const m = /^\d+(?:\.\d+)?/.exec(s.slice(i));
    if (!m) return 1;
    i += m[0].length;
    return Number(m[0]);
  };
  while (i < s.length) {
    const c = s[i]!;
    if (c === '(') { stack.push(new Map()); i++; continue; }
    if (c === ')') {
      i++;
      const n = readNumber();
      const inner = stack.pop();
      if (!inner || stack.length === 0) throw new SyntaxError(`unbalanced ")" in formula "${whole}"`);
      const top = stack[stack.length - 1]!;
      for (const [el, k] of inner) top.set(el, (top.get(el) ?? 0) + k * n);
      continue;
    }
    const m = /^[A-Z][a-z]?/.exec(s.slice(i));
    if (!m) throw new SyntaxError(`unexpected "${c}" in formula "${whole}"`);
    const el = m[0];
    if (!(el in ATOMIC_WEIGHTS)) throw new SyntaxError(`element "${el}" in formula "${whole}" has no atomic weight in this table`);
    i += el.length;
    const n = readNumber();
    const top = stack[stack.length - 1]!;
    top.set(el, (top.get(el) ?? 0) + n);
  }
  if (stack.length !== 1) throw new SyntaxError(`unbalanced "(" in formula "${whole}"`);
  return stack[0]!;
}

/** Molar mass in g/mol. */
export function molarMass(formula: string): number {
  let m = 0;
  for (const [el, n] of parseFormula(formula)) m += ATOMIC_WEIGHTS[el]! * n;
  return m;
}
