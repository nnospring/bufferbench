# bufferbench

[English](README.md) | **简体中文**

**缓冲液配方与 pH 预测：考虑温度和离子强度，并对照 NIST 认证 pH 标准验证。**

[打开网页版](https://nnospring.github.io/bufferbench/) · 全部计算在浏览器里完成，不上传任何内容。

实际缓冲液的 pH 不只取决于酸碱比例，还取决于离子强度和温度；用 25 °C 的 pKa 做 Henderson–Hasselbalch 计算会把这两项漏掉。下面两个例子是模型的预测值：

<!-- effects:start -->
- 20 mM 磷酸盐缓冲液（KH₂PO₄ + Na₂HPO₄ 各 10 mM）加入 150 mM NaCl 后，25 °C 下 pH 预计变化 −0.14（离子强度超过 0.1，属外推）。
- 22 °C 配好的 50 mM Tris 缓冲液（30 mM HCl）冷到 4 °C，pH 预计变化 +0.55。
<!-- effects:end -->

bufferbench 用活度系数和随温度变化的常数求解完整的平衡，告诉你称多少、配制时 pH 计应读多少，并说明每个结果核对到了什么程度。

<!-- demo:start -->
```text
$ bufferbench recipe tris --conc 50mM --ph 8.0 --temp 4 --prep-temp 22 --lang zh
Tris（三羟甲基氨基甲烷） 50 mM, pH 8 @ 4 °C, 1 L

  Tris 碱                                      C4H11NO3           50 mM        6.057 g
  盐酸                                         HCl                43.004 mM    43.00 mL of 1 M

Titrate at 22 °C to pH 7.46 (at 80 % of the volume), then make up to volume
Meter reading at 22 °C after making up to volume: pH 7.45
At 4 °C: pH 8.00, I = 0.043 mol/kg, β = 13.9 mM/pH, dpH/dT = -0.0330 /°C, pKa′ = 8.79

已核对：起缓冲作用的电离步骤、温度和 pH 都在 NIST 认证 pH 标准覆盖范围内；6 种标准的全部 62 个认证值（I ≤ 0.1），模型偏差都不超过 0.021。
! 这里温度影响明显：配好的缓冲液在 22 °C 读数为 pH 7.45，到 4 °C 时为 pH 8.00。
· Tris 以阳离子酸方式缓冲（BH⁺ ⇌ B + H⁺）。同类中唯一的认证标准 Tris 被预测偏低约 0.02 pH；其他同类缓冲剂是否有同样偏差尚不清楚。
```
<!-- demo:end -->

## 准确度

模型只根据组成预测 NIST 认证标准缓冲液的 pH，没有任何参数是对着这些数据拟合的。

<!-- accuracy:start -->
| 活度模型 | 认证值个数 | 最大 \|Δ\| | \|Δ\| 中位数 |
|---|---:|---:|---:|
| Davies（默认） | 62 | 0.021 | 0.010 |
| Bates–Guggenheim | 62 | 0.021 | 0.008 |
| 理想溶液（不计活度） | 62 | 0.354 | 0.184 |

6 种 NIST 标准物质（磷酸盐两种配比、邻苯二甲酸氢钾、硼砂、碳酸盐、Tris），0–50 °C 下证书所列的每个温度，Δ = 计算值 − 认证值（pH）。
<!-- accuracy:end -->

每个点都列在 [docs/VALIDATION.md](docs/VALIDATION.md)，CI 每次改动都会重新生成并比对。每个结果带一个等级：

- **已核对**：起缓冲作用的那一步有认证标准覆盖（磷酸盐、邻苯二甲酸盐、硼酸盐、碳酸盐、Tris），pH 在其附近，温度在该标准的认证范围内（多数为 5–50 °C，碳酸盐 10–35 °C，Tris 0–50 °C），离子强度不超过 0.1 mol/kg。
- **模型**：同一套方程和 NIST 评估的常数，但这种缓冲剂没有认证标准（HEPES、MOPS、MES 等）。
- **外推**：离子强度高于 0.1、温度在 0–50 °C 之外，或原始数据缺失、标为近似。提示会说明是哪一种。

离子强度超过 0.5 mol/kg 时不给出 pH。10× PBS 储液就是这种情况：bufferbench 给出称量用量和稀释后的 pH，并说明储液本身的读数无法预测。

## 功能

- **配方**：各形式的克数、滴定液体积、配制温度下应滴定到的 pH（在最终体积约 80% 时，溶液更浓）、定容后的读数，以及使用温度下的
  pH。可以用 NaOH、KOH 或 HCl 滴定一种形式，也可以混合两种形式；可加 NaCl、KCl、MgCl₂、CaCl₂；可配成 n× 储液。
- **预测 pH**：表中任意试剂组合在 0–60 °C 的 pH，附离子强度、缓冲容量、dpH/dT 和各物种分布。
- **选缓冲剂**：在你的温度和离子强度下，表观 pKa 接近目标 pH 的缓冲剂，以及它们的温度系数。
- <!-- counts:start -->64 个酸碱体系、75 种试剂<!-- counts:end -->（游离酸、碱、盐和水合物），清单见 [docs/BUFFERS.md](docs/BUFFERS.md)。

## 命令行

需要 Node.js 20 或更高版本。尚未发布到 npm，请从源码运行：

```bash
git clone https://github.com/nnospring/bufferbench.git
cd bufferbench
npm ci
npm run build
node dist/cli.js recipe hepes --conc 50mM --ph 7.4 --temp 37 --add nacl=150mM --lang zh
node dist/cli.js ph tris=50mM hcl=40mM --temp 4
node dist/cli.js suggest 7.4 --temp 37
node dist/cli.js --help
```

加 `--json` 输出机器可读结果，加 `--lang zh` 输出中文。

## 作为库使用

```ts
import { recipe, predict, noteText } from 'bufferbench';

const r = recipe({ system: 'hepes', concentration: 0.05, pH: 7.4, tUse: 37, tPrep: 22, volume: 1, additives: { nacl: 0.15 } });
r.ingredients;        // 试剂、浓度、克数、滴定液体积
r.prep.pHAdjust;      // 22 °C、80% 体积时滴定到这个读数
r.prep.pH;            // 定容后的读数
r.use.pH;             // 37 °C 时为 7.4
r.tier;               // 'checked' | 'model' | 'extrapolated'
r.notes.map((n) => noteText(n, 'zh'));

predict({ amounts: { kh2po4: 0.025, na2hpo4: 0.025 }, t: 37 }).pH;
```

库没有任何依赖，可在浏览器和 Node.js 中运行。请求无法满足或超出模型范围时，`recipe` 抛出带 `code` 的 `BufferError`。

## 原理

- **常数**：64 个酸碱体系各电离步骤的 pK、ΔrH°、ΔrCp°，取自 NIST 的 Goldberg、Kishore 与 Lennen（2002）评估；温度外推用热容恒定的
  van 't Hoff 方程。
- **水**：密度和介电常数取自 IAPWS SR6-08，电离常数取自 IAPWS R11-24，Debye–Hückel 斜率由它们算出。**摩尔质量**：CIAAW 2024 原子量。
- **活度**：默认 Davies 方程（可选 Bates–Guggenheim 或理想溶液）；按电荷平衡求 pH，离子强度迭代到自洽。
- 结果是校准过的 pH 计显示的约定 pH。

方程与细节见 [docs/METHODS.md](docs/METHODS.md)；每个数字的出处和转录核对过程见 [docs/DATA.md](docs/DATA.md)。

## 局限

- 不计离子对和金属络合：Mg²⁺、Ca²⁺ 与磷酸盐、柠檬酸盐、碳酸盐共存时只给提示，不建模。
- 中性和两性离子物种的活度系数取 1。Tris 是标准中唯一的阳离子酸缓冲剂，预测值偏低约 0.02。
- 体积摩尔浓度换算成质量摩尔浓度时忽略溶质体积（0.1 M 以下误差不到 1%）。
- 碳酸盐按封闭体系处理；硼酸盐超过约 0.025 mol/kg 会生成多硼酸根，未建模。

## 参与和许可

见 [CONTRIBUTING.md](CONTRIBUTING.md)。改动任何常数都要给出一手来源。许可证为 GPL-3.0-only，见 [LICENSE](LICENSE)。
