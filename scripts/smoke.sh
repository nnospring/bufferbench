#!/bin/sh
# Installs a packed tarball into an empty project and runs the CLI and the library from it.
# Usage: sh scripts/smoke.sh bufferbench-<version>.tgz
set -eu
tgz=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
dir=$(mktemp -d)
cd "$dir"
npm init -y >/dev/null
npm install --no-audit --no-fund "$tgz" >/dev/null
npx bufferbench --version
npx bufferbench recipe hepes --conc 50mM --ph 7.4 --temp 37 | grep -q "At 37 °C: pH 7.40"
npx bufferbench ph kh2po4=25mM na2hpo4=25mM | grep -q "^pH 6.8"
node --input-type=module -e "
import { recipe, predict, VERSION } from 'bufferbench';
const r = recipe({ system: 'tris', concentration: 0.05, pH: 8, tUse: 25, volume: 1 });
if (Math.abs(r.use.pH - 8) > 1e-6) throw new Error('recipe');
if (Math.abs(predict({ amounts: { khp: 0.05 }, t: 25 }).pH - 4.01) > 0.03) throw new Error('predict');
console.log('library ok', VERSION);
"
echo "smoke ok in $dir"
