// Human-readable text for notes and errors, in English and Simplified Chinese.
// Used by the CLI and the web page; the library itself returns codes and parameters.

import type { Note, Tier } from './recipe.ts';
import { CHECKED_MAX_DEVIATION, CHECKED_POINTS, CHECKED_STANDARDS, IDEAL_DEVIATION_RANGE } from './accuracy.ts';

const IDEAL = `${IDEAL_DEVIATION_RANGE[0]}–${IDEAL_DEVIATION_RANGE[1]}`;

export type Lang = 'en' | 'zh';

type Params = Record<string, string | number>;
type Msg = (p: Params) => string;

const EN: Record<string, Msg> = {
  'ionic-strength-above-checked': (p) => `Ionic strength ${p.I} mol/kg is above ${p.limit}, the highest ionic strength of the certified standards; the activity model is extrapolated here.`,
  'ideal-model': () => `Ideal-solution model: activity coefficients are ignored; on the certified standards this is off by up to ${IDEAL} pH units, depending on the standard.`,
  'model-limit-exceeded': (p) => `Ionic strength ${p.I} mol/kg is above ${p.limit}, the range the ${p.model} equation was defined for.`,
  'adjust-reading-unpredictable': (p) => `At ${p.fraction} % of the final volume the solution is beyond the model, so no meter reading is given for titrating there; add the amount listed, make up to volume, then check.`,
  'temperature-above-checked': (p) => `${p.t} °C is outside 0–50 °C, the range of the certified standards.`,
  'no-enthalpy': (p) => `${p.system} (pK ${p.pK}): no ionization enthalpy is tabulated, so its pK is held at the 25 °C value.`,
  'no-heat-capacity': (p) => `${p.system} (pK ${p.pK}): no heat-capacity change is tabulated; the temperature correction uses ΔH only.`,
  'approximate-pK': (p) => `${p.system}: the tabulated pK ${p.pK} is approximate.`,
  'system-note': (p) => `${p.system}: ${p.text}`,
  'polyborate': (p) => `Total boron is ${p.m} mol/kg; above about 0.025 mol/kg polyborates form, which this model leaves out.`,
  'carbon-dioxide': () => 'Above pH 9 the solution absorbs CO₂ from air; keep it closed.',
  'weak-buffering': (p) => `The nearest pKa of ${p.system} is ${p.pKa}, more than one unit from the target: little buffer capacity.`,
  'cationic-acid-offset': (p) => `${p.system} buffers as a cationic acid (BH⁺ ⇌ B + H⁺). The only certified standard of this kind, Tris, is predicted about 0.02 pH low; whether other buffers of this kind share the offset is not known.`,
  'metal-complexation': (p) => `Mg²⁺/Ca²⁺ bind ${p.system}; complexation (and possible precipitation) is not modelled.`,
  'stock-pH-unpredictable': (p) => `The stock's ionic strength (${p.I} mol/kg) is beyond the model, so its pH reading cannot be predicted. Add the amounts listed instead of titrating the stock to a meter reading, then check the diluted solution.`,
  'stock-dilution-shift': (p) => `The ${p.factor}× stock reads pH ${p.stock}; after dilution it will be ${p.work}.`,
  'stock-ionic-strength': (p) => `The stock's ionic strength (${p.I} mol/kg) is above the checked range; its meter reading is less certain than the working solution's.`,
  'adjust-at-prep-temperature': (p) => `Temperature matters here: the finished buffer reads pH ${p.prep} at ${p.tPrep} °C and is pH ${p.use} at ${p.tUse} °C.`,
  'titrant-volume-large': (p) => `About ${p.mL} mL of titrant per litre: use a more concentrated stock or leave room before making up to volume.`,
  'liquid-reagent': (p) => `${p.name} is a liquid: weigh it, or convert with the density on its label.`,
  'ionic-strength-too-high': (p) => `Ionic strength ${p.I} mol/kg is above ${p.limit}, beyond the activity models used here; no pH is given.`,
  'temperature-out-of-range': (p) => `${p.t} °C is outside ${p.min}–${p.max} °C.`,
  'target-unreachable': (p) => p.a ? `pH ${p.pH} is not between ${p.a} (${p.lo}) and ${p.b} (${p.hi}).` : p.start ? `${p.start} alone already gives pH ${p.solo}; titrate the other way or start from another form.` : `pH ${p.pH} cannot be reached this way.`,
  'invalid-input': (p) => `${p.field} must be a positive number.`,
  'no-reagents': (p) => `No weighable form of ${p.system} is defined.`,
  'bad-start': (p) => `${p.start} is not a form of ${p.system}.`,
  'bad-forms': (p) => `Both forms must belong to ${p.system}.`,
  'bad-titrant': (p) => `${p.titrant} is not a strong acid or base.`,
  'no-start': () => 'No form of this buffer can be titrated to that pH.',
};

const ZH: Record<string, Msg> = {
  'ionic-strength-above-checked': (p) => `离子强度 ${p.I} mol/kg，高于认证标准缓冲液的最高值 ${p.limit}，活度模型在此属于外推。`,
  'ideal-model': () => `理想溶液模型忽略活度系数；在各认证标准上的最大偏差为 ${IDEAL} pH，视标准而定。`,
  'model-limit-exceeded': (p) => `离子强度 ${p.I} mol/kg，超过 ${p.model} 方程的适用范围 ${p.limit}。`,
  'adjust-reading-unpredictable': (p) => `在最终体积的 ${p.fraction}% 时溶液已超出模型范围，因此不给出这时的滴定读数；请按表中用量加入，定容后再测。`,
  'temperature-above-checked': (p) => `${p.t} °C 超出认证标准覆盖的 0–50 °C。`,
  'no-enthalpy': (p) => `${p.system}（pK ${p.pK}）没有电离焓数据，pK 只能按 25 °C 的值算。`,
  'no-heat-capacity': (p) => `${p.system}（pK ${p.pK}）没有热容变化数据，温度修正只用了 ΔH。`,
  'approximate-pK': (p) => `${p.system} 的 pK ${p.pK} 在原表中是近似值。`,
  'system-note': (p) => `${p.system}：${p.textZh ?? p.text}`,
  'polyborate': (p) => `总硼 ${p.m} mol/kg；超过约 0.025 mol/kg 会生成多硼酸根，本模型未计入。`,
  'carbon-dioxide': () => 'pH 高于 9 时溶液会吸收空气中的 CO₂，请密闭保存。',
  'weak-buffering': (p) => `${p.system} 最接近的 pKa 是 ${p.pKa}，与目标相差超过 1，缓冲能力很弱。`,
  'cationic-acid-offset': (p) => `${p.system} 以阳离子酸方式缓冲（BH⁺ ⇌ B + H⁺）。同类中唯一的认证标准 Tris 被预测偏低约 0.02 pH；其他同类缓冲剂是否有同样偏差尚不清楚。`,
  'metal-complexation': (p) => `Mg²⁺/Ca²⁺ 会与 ${p.system} 结合，络合（及可能的沉淀）未计入模型。`,
  'stock-pH-unpredictable': (p) => `储液离子强度 ${p.I} mol/kg 超出模型范围，无法预测它的 pH 读数。请按下表用量直接加入，不要把储液滴定到某个读数，稀释后再测工作液。`,
  'stock-dilution-shift': (p) => `${p.factor}× 储液读数为 pH ${p.stock}，稀释后为 ${p.work}。`,
  'stock-ionic-strength': (p) => `储液离子强度 ${p.I} mol/kg，高于验证范围，它的读数不如工作液可靠。`,
  'adjust-at-prep-temperature': (p) => `这里温度影响明显：配好的缓冲液在 ${p.tPrep} °C 读数为 pH ${p.prep}，到 ${p.tUse} °C 时为 pH ${p.use}。`,
  'titrant-volume-large': (p) => `每升约需 ${p.mL} mL 滴定液：换更浓的储液，或定容前留够体积。`,
  'liquid-reagent': (p) => `${p.name} 是液体：直接称量，或按瓶上标注的密度换算体积。`,
  'ionic-strength-too-high': (p) => `离子强度 ${p.I} mol/kg 超过 ${p.limit}，超出本工具所用活度模型的范围，不给出 pH。`,
  'temperature-out-of-range': (p) => `${p.t} °C 超出 ${p.min}–${p.max} °C。`,
  'target-unreachable': (p) => p.a ? `pH ${p.pH} 不在 ${p.a}（${p.lo}）与 ${p.b}（${p.hi}）之间。` : p.start ? `单用 ${p.start} 已是 pH ${p.solo}，请反向滴定或换一种起始形式。` : `用这种方法达不到 pH ${p.pH}。`,
  'invalid-input': (p) => `${p.field} 必须是正数。`,
  'no-reagents': (p) => `没有定义 ${p.system} 的可称量形式。`,
  'bad-start': (p) => `${p.start} 不是 ${p.system} 的一种形式。`,
  'bad-forms': (p) => `两种形式都必须属于 ${p.system}。`,
  'bad-titrant': (p) => `${p.titrant} 不是强酸或强碱。`,
  'no-start': () => '这种缓冲剂没有哪种形式能滴定到该 pH。',
};

const TIER: Record<Lang, Record<Tier, string>> = {
  en: {
    checked: `Checked: the buffering step, temperature and pH are inside what NIST certified pH standards cover; the model reproduces all ${CHECKED_POINTS} certified values of ${CHECKED_STANDARDS} standards within ${CHECKED_MAX_DEVIATION} pH (I ≤ 0.1).`,
    model: 'Model: same equations and NIST-evaluated constants, but no certified standard exists for this buffer.',
    extrapolated: 'Extrapolated: outside the conditions the certified standards cover; see the notes.',
  },
  zh: {
    checked: `已核对：起缓冲作用的电离步骤、温度和 pH 都在 NIST 认证 pH 标准覆盖范围内；${CHECKED_STANDARDS} 种标准的全部 ${CHECKED_POINTS} 个认证值（I ≤ 0.1），模型偏差都不超过 ${CHECKED_MAX_DEVIATION}。`,
    model: '模型：同一套方程和 NIST 评估的常数，但这种缓冲剂没有认证标准。',
    extrapolated: '外推：超出认证标准覆盖的条件，详见提示。',
  },
};

export function noteText(n: Pick<Note, 'code' | 'params'>, lang: Lang = 'en'): string {
  const table = lang === 'zh' ? ZH : EN;
  const f = table[n.code] ?? EN[n.code];
  return f ? f(n.params ?? {}) : n.code;
}

export function tierText(t: Tier, lang: Lang = 'en'): string {
  return TIER[lang][t];
}

export const MESSAGE_CODES: readonly string[] = Object.keys(EN);
export const MESSAGE_CODES_ZH: readonly string[] = Object.keys(ZH);
