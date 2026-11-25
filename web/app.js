// bufferbench web app: plain ES module over the compiled library in ./lib/.
import * as bb from './lib/index.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- language ----------
const TEXT = {
  en: {
    title: 'Buffer recipes, corrected for temperature and ionic strength',
    lede: 'Constants evaluated by NIST and water properties from IAPWS. The model is tested against NIST certified pH standards, and every result says how far it has been checked.',
    privacy: 'Everything is computed in this page. Nothing you enter leaves your device.',
    proof: (p) => `Against <b>${p.n}</b> certified values of <b>${p.s}</b> NIST pH standards (0–50 °C) the largest deviation is <b>${p.max}</b> pH. Leaving out activity coefficients, as an ideal-solution calculation does, is off by up to <b>${p.ideal}</b>.`,
    tabRecipe: 'Recipe', tabPredict: 'Predict pH', tabChoose: 'Choose a buffer', tabValidation: 'Validation',
    buffer: 'Buffer', concentration: 'Concentration', targetPH: 'Target pH', useAt: 'Used at (°C)', prepAt: 'Prepared at (°C)', volume: 'Volume', stock: 'Make as',
    method: 'Method', methodTitrate: 'One form, titrated with strong acid or base', methodMix: 'Two forms mixed, no titration',
    startForm: 'Start from', titrant: 'Titrant', titrantStock: 'Titrant stock (M)', auto: 'automatic', formA: 'Acidic form', formB: 'Basic form',
    additives: 'Also in the solution (mM)', advanced: 'Activity model', model: 'Activity model', ideal: 'Ideal solution (no activity correction)',
    modelHelp: 'Davies is the default: it is meant for ionic strengths up to about 0.5 mol/kg. Bates–Guggenheim is the convention that defines the pH of the standards (I ≤ 0.1). The ideal solution leaves activity coefficients out, as a Henderson–Hasselbalch calculation with thermodynamic pK values does.',
    predictHelp: 'Enter what is in the solution (final concentrations). Titrants count as what was added: 20 mM HCl means 20 mmol per litre of final solution.',
    addRow: '+ Add substance', measureAt: 'pH at (°C)', ionicStrength: 'Ionic strength (mol/kg)',
    methods: 'Methods', validationReport: 'Validation report',
    common: 'Common buffers', all: 'All systems',
    readsAt: (p) => `Reads pH ${p.pH} at ${p.t} °C`, becomes: (p) => `→ pH ${p.pH} at ${p.t} °C`, phAt: (p) => `pH ${p.pH} at ${p.t} °C`,
    addAmounts: 'Add the amounts below; do not titrate the stock to a reading',
    substance: 'Substance', mw: 'g/mol', finalConc: 'Final', amountFor: (v) => `For ${v}`,
    steps: 'Steps', properties: 'At the temperature of use', notes: 'Notes',
    propI: 'Ionic strength', propBeta: 'Buffer capacity', propDT: 'Temperature coefficient', propPKa: 'Apparent pKa',
    perC: 'pH/°C', mmPerPH: 'mM per pH',
    stepDissolve: (p) => `Dissolve ${p.list} in about ${p.v80} of water.`,
    stepTitrate: (p) => `At ${p.t} °C, add ${p.name} (${p.M} M) while stirring until the meter reads pH ${p.pH}. Expect about ${p.mL}. (This reading is for the solution at about 80 % of its final volume.)`,
    stepAddTitrant: (p) => `Add ${p.mL} of ${p.name} (${p.M} M).`,
    stepVolume: (p) => `Make up to ${p.v} with water at ${p.t} °C and mix.`,
    stepFinal: (p) => `Check: the meter should now read pH ${p.pH} at ${p.t} °C.`,
    stepCheckMix: (p) => `The meter should read pH ${p.pH} at ${p.t} °C; correct small differences with a little HCl or NaOH.`,
    stepDilute: (p) => `Dilute ${p.f}× with water before use. The working solution is pH ${p.pH} at ${p.t} °C.`,
    stepUse: (p) => `At ${p.t} °C the pH is ${p.pH}.`,
    and: ' and ',
    print: 'Print', copyLink: 'Copy link', copyText: 'Copy as text', copied: 'Copied',
    chartTitle: 'pH of this solution from 0 to 50 °C', prepMark: 'prepared', useMark: 'used',
    pH: 'pH', species: 'Species', fraction: 'Fraction', remove: 'Remove',
    chooseHead: ['Buffer', 'pKa at T', 'ΔpKa/°C', 'From target', ''], certified: 'certified chemistry', use: 'Use',
    noEnthalpy: 'no ΔH', approximate: 'approximate pK', hazard: 'hazardous',
    chooseNone: 'No buffer has a pKa within one unit of this pH at this temperature.',
    chooseHelp: 'Buffers whose apparent pKa (at this temperature and ionic strength) is within one pH unit of the target, nearest first. A buffer works best within about ±0.5 of its pKa.',
    valIntro: (p) => `The model predicts the pH of ${p.s} NIST certified buffer standards at every temperature on their certificates (${p.n} points). Nothing was fitted to them.`,
    valModels: 'Activity model', valPoints: 'Points', valMax: 'Max |Δ|', valMedian: 'Median |Δ|', valWithin: 'Within certificate U',
    valStandard: 'Standard', valMean: 'Mean Δ', valSource: 'Certificate',
    valChart: 'Computed − certified pH, default model. The band is ±0.010, the certificates\' stated uncertainty.',
    valLoading: 'Loading results…', valMissing: 'Results are not available in this build.',
  },
  zh: {
    title: '缓冲液配方计算：考虑温度与离子强度',
    lede: '常数取自 NIST 的评估数据，水的性质取自 IAPWS。模型对照 NIST 认证 pH 标准检验，每个结果都标明核对到了什么程度。',
    privacy: '全部计算都在本页完成，输入的内容不会离开你的设备。',
    proof: (p) => `对照 <b>${p.s}</b> 种 NIST pH 标准缓冲液的 <b>${p.n}</b> 个认证值（0–50 °C），最大偏差 <b>${p.max}</b> pH。不计活度系数的理想溶液算法最多偏 <b>${p.ideal}</b>。`,
    tabRecipe: '配方', tabPredict: '预测 pH', tabChoose: '选缓冲剂', tabValidation: '验证',
    buffer: '缓冲剂', concentration: '浓度', targetPH: '目标 pH', useAt: '使用温度（°C）', prepAt: '配制温度（°C）', volume: '体积', stock: '配成',
    method: '方法', methodTitrate: '一种形式，用强酸或强碱滴定', methodMix: '两种形式混合，不滴定',
    startForm: '起始形式', titrant: '滴定剂', titrantStock: '滴定液浓度（M）', auto: '自动', formA: '偏酸的形式', formB: '偏碱的形式',
    additives: '溶液中还含有（mM）', advanced: '活度模型', model: '活度模型', ideal: '理想溶液（不计活度）',
    modelHelp: '默认用 Davies 方程，适用于离子强度约 0.5 mol/kg 以下。Bates–Guggenheim 是定义标准缓冲液 pH 的约定（I ≤ 0.1）。理想溶液不计活度系数，相当于用热力学 pK 的 Henderson–Hasselbalch 计算。',
    predictHelp: '填写溶液中的成分（最终浓度）。滴定剂按加入量计：20 mM HCl 表示每升最终溶液加了 20 mmol。',
    addRow: '+ 添加成分', measureAt: '求 pH 的温度（°C）', ionicStrength: '离子强度（mol/kg）',
    methods: '计算方法', validationReport: '验证报告',
    common: '常用缓冲剂', all: '全部体系',
    readsAt: (p) => `${p.t} °C 时读数 pH ${p.pH}`, becomes: (p) => `→ ${p.t} °C 时 pH ${p.pH}`, phAt: (p) => `${p.t} °C 时 pH ${p.pH}`,
    addAmounts: '按下表用量直接加入，不要把储液滴定到某个读数',
    substance: '物质', mw: 'g/mol', finalConc: '最终浓度', amountFor: (v) => `配 ${v} 用量`,
    steps: '步骤', properties: '使用温度下', notes: '提示',
    propI: '离子强度', propBeta: '缓冲容量', propDT: '温度系数', propPKa: '表观 pKa',
    perC: 'pH/°C', mmPerPH: 'mM/pH',
    stepDissolve: (p) => `把 ${p.list} 溶于约 ${p.v80} 水中。`,
    stepTitrate: (p) => `在 ${p.t} °C 边搅拌边加 ${p.name}（${p.M} M），直到 pH 计读数为 ${p.pH}，预计约 ${p.mL}。（这是溶液约为最终体积 80% 时的读数。）`,
    stepAddTitrant: (p) => `加入 ${p.mL} ${p.name}（${p.M} M）。`,
    stepVolume: (p) => `在 ${p.t} °C 用水定容至 ${p.v}，混匀。`,
    stepFinal: (p) => `复核：此时 ${p.t} °C 下读数应为 pH ${p.pH}。`,
    stepCheckMix: (p) => `在 ${p.t} °C 时读数应为 pH ${p.pH}；小偏差用少量 HCl 或 NaOH 校正。`,
    stepDilute: (p) => `使用前用水稀释 ${p.f} 倍。工作液在 ${p.t} °C 时 pH ${p.pH}。`,
    stepUse: (p) => `${p.t} °C 时 pH 为 ${p.pH}。`,
    and: '和',
    print: '打印', copyLink: '复制链接', copyText: '复制为文本', copied: '已复制',
    chartTitle: '这份溶液在 0–50 °C 的 pH', prepMark: '配制', useMark: '使用',
    pH: 'pH', species: '物种', fraction: '比例', remove: '删除',
    chooseHead: ['缓冲剂', '该温度下 pKa', 'ΔpKa/°C', '与目标差', ''], certified: '有认证标准', use: '使用',
    noEnthalpy: '无 ΔH', approximate: 'pK 为近似值', hazard: '有毒或受管制',
    chooseNone: '在这个温度下，没有 pKa 与该 pH 相差一个单位以内的缓冲剂。',
    chooseHelp: '列出在该温度和离子强度下表观 pKa 与目标相差一个单位以内的缓冲剂，最接近的在前。缓冲剂在 pKa ±0.5 内效果最好。',
    valIntro: (p) => `模型预测 ${p.s} 种 NIST 认证标准缓冲液在证书所列各温度下的 pH，共 ${p.n} 个点，没有任何参数是对着这些数据拟合的。`,
    valModels: '活度模型', valPoints: '点数', valMax: '最大 |Δ|', valMedian: '|Δ| 中位数', valWithin: '在证书不确定度内',
    valStandard: '标准', valMean: '平均 Δ', valSource: '证书',
    valChart: '默认模型的 计算值 − 认证值。阴影带为 ±0.010，即证书给出的不确定度。',
    valLoading: '正在载入结果……', valMissing: '这个版本没有附带验证结果。',
  },
};

let lang = null;
try { lang = localStorage.getItem('bufferbench-lang'); } catch { /* storage blocked */ }
if (lang !== 'en' && lang !== 'zh') lang = (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
const t = (key, p) => { const v = TEXT[lang][key] ?? TEXT.en[key]; return typeof v === 'function' ? v(p ?? {}) : v; };
const nameOf = (x) => (lang === 'zh' ? x.zh || x.name : x.name);

function applyStatic() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  if (lang === 'zh') document.querySelector('[data-i18n-html=footer]').innerHTML = '数据：Goldberg, Kishore &amp; Lennen, <i>J. Phys. Chem. Ref. Data</i> 31, 231 (2002)；NIST 标准物质证书 185i、186-g、187e、191d、922/923；IAPWS SR6-08 与 R11-24；CIAAW 2024 原子量。';
  else document.querySelector('[data-i18n-html=footer]').innerHTML = 'Data: Goldberg, Kishore &amp; Lennen, <i>J. Phys. Chem. Ref. Data</i> 31, 231 (2002); NIST SRM certificates 185i, 186-g, 187e, 191d, 922/923; IAPWS SR6-08 and R11-24; CIAAW 2024 atomic weights.';
  $('lang').textContent = lang === 'zh' ? 'English' : '中文';
  $('ver').textContent = 'v' + bb.VERSION;
  $('foot-ver').textContent = 'bufferbench ' + bb.VERSION;
}

// ---------- formatting ----------
const fx = (x, d) => (Number.isFinite(x) ? x.toFixed(d) : '—');
function grams(g) {
  if (g >= 100) return `${fx(g, 1)} g`;
  if (g >= 1) return `${fx(g, 3)} g`;
  if (g >= 0.01) return `${fx(g * 1000, 1)} mg`;
  return `${fx(g * 1000, 2)} mg`;
}
function mL(v) { return v >= 100 ? `${fx(v, 0)} mL` : v >= 10 ? `${fx(v, 1)} mL` : `${fx(v, 2)} mL`; }
function volume(L) { return L >= 1 ? `${+L.toFixed(3)} L` : `${+(L * 1000).toFixed(1)} mL`; }
function conc(M) { return M >= 1 ? `${+M.toFixed(3)} M` : M >= 0.001 ? `${+(M * 1000).toFixed(2)} mM` : `${+(M * 1e6).toFixed(1)} µM`; }
const sub = (f) => esc(f).replace(/(\d+(?:\.\d+)?)/g, (m, d, off, s) => (s[off - 1] === '·' || off === 0 ? m : `<sub>${m}</sub>`));

// ---------- data ----------
const COMMON = ['tris', 'hepes', 'phosphate', 'mops', 'mes', 'pipes', 'acetate', 'citrate', 'glycine', 'bicine', 'tricine', 'imidazole', 'bistris', 'tes', 'taps', 'ches', 'caps', 'carbonate', 'borate', 'succinate'];
const formsOf = (id) => bb.REAGENTS.filter((r) => r.role === 'buffer' && r.system === id && (r.perUnit ?? 1) === 1);
const weighable = bb.SYSTEMS.filter((s) => formsOf(s.id).length > 0);

function fillSystems() {
  const sel = $('r-system');
  const cur = sel.value || 'hepes';
  const common = COMMON.map((id) => bb.SYSTEM_BY_ID.get(id)).filter(Boolean);
  const rest = weighable.filter((s) => !COMMON.includes(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  sel.innerHTML = `<optgroup label="${esc(t('common'))}">${common.map((s) => `<option value="${s.id}">${esc(nameOf(s))}</option>`).join('')}</optgroup>`
    + `<optgroup label="${esc(t('all'))}">${rest.map((s) => `<option value="${s.id}">${esc(nameOf(s))}</option>`).join('')}</optgroup>`;
  sel.value = cur;
}

function fillForms(keep = true) {
  const id = $('r-system').value;
  const forms = formsOf(id);
  const opt = (r) => `<option value="${r.id}">${esc(nameOf(r))} (${esc(r.formula)})</option>`;
  for (const [sel, autoFirst] of [[$('r-start'), true], [$('r-formA'), true], [$('r-formB'), true]]) {
    const prev = sel.value;
    sel.innerHTML = (autoFirst ? `<option value="">${esc(t('auto'))}</option>` : '') + forms.map(opt).join('');
    if (keep && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  }
}

// ---------- recipe ----------
function num(id) { const v = parseFloat($(id).value); return Number.isFinite(v) ? v : NaN; }
function readRecipe() {
  const concUnit = $('r-conc-unit').value === 'M' ? 1 : 1e-3;
  const volUnit = $('r-vol-unit').value === 'L' ? 1 : 1e-3;
  const method = document.querySelector('input[name=r-method]:checked').value;
  const additives = {};
  for (const [id, key] of [['r-nacl', 'nacl'], ['r-kcl', 'kcl'], ['r-mgcl2', 'mgcl2-6h2o'], ['r-cacl2', 'cacl2-2h2o']]) {
    const v = num(id); if (v > 0) additives[key] = v / 1000;
  }
  const req = {
    system: $('r-system').value,
    concentration: num('r-conc') * concUnit,
    pH: num('r-ph'),
    tUse: num('r-tuse'),
    tPrep: num('r-tprep'),
    volume: num('r-vol') * volUnit,
    method,
    additives,
    stockFactor: Number($('r-stock').value),
    model: $('r-model').value,
    titrantMolarity: num('r-tstock') > 0 ? num('r-tstock') : 1,
  };
  if (method === 'titrate') {
    if ($('r-start').value) req.start = $('r-start').value;
    if ($('r-titrant').value) req.titrant = $('r-titrant').value;
  } else if ($('r-formA').value && $('r-formB').value) req.forms = [$('r-formA').value, $('r-formB').value];
  return req;
}

function errorBox(e) {
  if (e && e.code) return `<div class="error">${esc(bb.noteText({ code: e.code, params: e.params }, lang))}</div>`;
  return `<div class="error">${esc(e && e.message ? e.message : String(e))}</div>`;
}

function notesList(notes) {
  if (!notes.length) return '';
  const sorted = [...notes].sort((a, b) => (a.level === b.level ? 0 : a.level === 'warning' ? -1 : 1));
  return `<div class="card"><h2>${esc(t('notes'))}</h2><ul class="notes">${sorted.map((n) => `<li class="${n.level}">${esc(bb.noteText(n, lang))}</li>`).join('')}</ul></div>`;
}

function tierBadge(tier) {
  return `<div><span class="tier ${tier}">${esc({ checked: lang === 'zh' ? '已核对' : 'Checked', model: lang === 'zh' ? '模型' : 'Model', extrapolated: lang === 'zh' ? '外推' : 'Extrapolated' }[tier])}</span><p class="tierline">${esc(bb.tierText(tier, lang))}</p></div>`;
}

function phCurve(amounts, tPrep, model, marks) {
  const pts = [];
  for (let T = 0; T <= 50; T += 1) {
    try { pts.push([T, bb.predict({ amounts, tPrep, t: T, model }).pH]); } catch { /* outside the model */ }
  }
  if (pts.length < 2) return '';
  const W = 640, H = 220, L = 44, R = 28, TP = 14, B = 30;
  const ys = pts.map((p) => p[1]).concat(marks.map((m) => m.pH));
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 0.2) { const mid = (hi + lo) / 2; lo = mid - 0.1; hi = mid + 0.1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const X = (T) => L + (T / 50) * (W - L - R);
  const Y = (v) => TP + (1 - (v - lo) / (hi - lo)) * (H - TP - B);
  const step = (hi - lo) > 1.2 ? 0.5 : (hi - lo) > 0.6 ? 0.2 : 0.1;
  let ticks = '';
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks += `<line class="axis" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v.toFixed(step < 0.2 ? 1 : step < 0.5 ? 1 : 1)}</text>`;
  for (let T = 0; T <= 50; T += 10) ticks += `<text x="${X(T)}" y="${H - 10}" text-anchor="middle">${T} °C</text>`;
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
  const mk = marks.map((m) => `<circle class="mark ${m.kind}" cx="${X(m.t)}" cy="${Y(m.pH)}" r="5"><title>${esc(m.label)}: pH ${m.pH.toFixed(2)} @ ${m.t} °C</title></circle><text x="${X(m.t) + (m.t > 40 ? -8 : 8)}" y="${Y(m.pH) - 9}" text-anchor="${m.t > 40 ? 'end' : 'start'}">${esc(m.label)}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('chartTitle'))}">${ticks}<path class="curve" d="${path}"/>${mk}</svg>`;
}

let lastRecipe = null;
function renderRecipe() {
  const out = $('recipe-result');
  let r;
  const req = readRecipe();
  try { r = bb.recipe(req); } catch (e) { lastRecipe = null; out.innerHTML = errorBox(e); return; }
  lastRecipe = r;
  const f = r.request.stockFactor;
  const V = r.request.volume;
  const pH2 = (x) => x.toFixed(2);
  let head;
  if (r.prep.pH === null) head = `<span class="big">${esc(t('addAmounts'))}</span>`;
  else if (Math.abs(r.prep.pH - r.use.pH) < 0.005 && f === 1) head = `<span class="big">${esc(t('phAt', { pH: pH2(r.use.pH), t: r.request.tUse }))}</span>`;
  else head = `<span class="big">${esc(t('readsAt', { pH: pH2(r.prep.pH), t: r.request.tPrep }))}</span><span class="then">${esc(t('becomes', { pH: pH2(r.use.pH), t: r.request.tUse }))}${f > 1 ? ` (${f}× → 1×)` : ''}</span>`;

  const rows = r.ingredients.map((i) => `<tr class="${i.role === 'titrant' ? 'titrant' : ''}"><td>${esc(nameOf(i))}<br><span class="formula">${sub(i.formula)}</span></td><td class="num col-mw">${fx(i.molarMass, 2)}</td><td class="num">${conc(i.molarity)}</td><td class="num">${i.role === 'titrant' && i.stockML ? `${mL(i.stockML)}<br><span class="muted">${i.stockMolarity} M</span>` : grams(i.grams)}</td></tr>`).join('');

  const solids = r.ingredients.filter((i) => i.role !== 'titrant');
  const titr = r.ingredients.find((i) => i.role === 'titrant');
  const inSentence = (n) => (lang === 'en' && /^(Sodium|Potassium|Magnesium|Calcium|Ammonium|Disodium|Dipotassium|Trisodium|Hydrochloric|Acetic|Citric|Succinic|Maleic|Boric|Glycine|Glycylglycine|Imidazole|Ethanolamine|Diethanolamine|Triethanolamine)\b/.test(n) ? n[0].toLowerCase() + n.slice(1) : n);
  const list = solids.map((i) => `${grams(i.grams)} ${inSentence(nameOf(i))}`).join(lang === 'zh' ? '、' : ', ');
  const steps = [t('stepDissolve', { list, v80: volume(V * 0.8) })];
  if (titr) {
    const tn = inSentence(nameOf(titr));
    if (r.prep.pHAdjust === null) steps.push(t('stepAddTitrant', { mL: mL(titr.stockML), name: tn, M: titr.stockMolarity }));
    else steps.push(t('stepTitrate', { t: r.request.tPrep, name: tn, M: titr.stockMolarity, pH: pH2(r.prep.pHAdjust), mL: mL(titr.stockML) }));
    steps.push(t('stepVolume', { v: volume(V), t: r.request.tPrep }));
    if (r.prep.pH !== null) steps.push(t('stepFinal', { pH: pH2(r.prep.pH), t: r.request.tPrep }));
  } else {
    steps.push(t('stepVolume', { v: volume(V), t: r.request.tPrep }));
    if (r.prep.pH !== null) steps.push(t('stepCheckMix', { pH: pH2(r.prep.pH), t: r.request.tPrep }));
  }
  if (f > 1) steps.push(t('stepDilute', { f, pH: pH2(r.use.pH), t: r.request.tUse }));
  else if (r.request.tUse !== r.request.tPrep) steps.push(t('stepUse', { pH: pH2(r.use.pH), t: r.request.tUse }));

  const working = {};
  for (const i of r.ingredients) working[i.reagent] = i.molarity / f;
  const chart = phCurve(working, r.request.tPrep, r.request.model, [
    ...(f === 1 && r.prep.pH !== null && r.request.tPrep !== r.request.tUse ? [{ t: r.request.tPrep, pH: r.prep.pH, kind: 'prep', label: t('prepMark') }] : []),
    { t: r.request.tUse, pH: r.use.pH, kind: 'use', label: t('useMark') },
  ]);

  out.innerHTML = `
    <div class="card" id="recipe-card">
      <div class="headline">${head}</div>
      ${tierBadge(r.tier)}
    </div>
    <div class="card"><div class="scroll"><table>
      <thead><tr><th>${esc(t('substance'))}</th><th class="num col-mw">${esc(t('mw'))}</th><th class="num">${esc(t('finalConc'))}${f > 1 ? ` (${f}×)` : ''}</th><th class="num">${esc(t('amountFor', volume(V)))}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <h2 style="margin-top:16px">${esc(t('steps'))}</h2>
      <ol class="steps">${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="actions"><button type="button" id="act-print">${esc(t('print'))}</button><button type="button" id="act-link">${esc(t('copyLink'))}</button><button type="button" id="act-text">${esc(t('copyText'))}</button></div>
    </div>
    <div class="card"><h2>${esc(t('properties'))} (${r.request.tUse} °C)</h2>
      <dl class="props">
        <div><dt>${esc(t('propI'))}</dt><dd>${fx(r.use.ionicStrength, 3)} mol/kg</dd></div>
        <div><dt>${esc(t('propBeta'))}</dt><dd>${fx(r.use.bufferCapacity, 1)} ${esc(t('mmPerPH'))}</dd></div>
        <div><dt>${esc(t('propDT'))}</dt><dd>${r.use.dpHdT >= 0 ? '+' : '−'}${fx(Math.abs(r.use.dpHdT), 4)} ${esc(t('perC'))}</dd></div>
        <div><dt>${esc(t('propPKa'))}</dt><dd>${fx(r.pKa, 2)}</dd></div>
      </dl>
      ${chart ? `<p class="muted" style="margin:14px 0 4px">${esc(t('chartTitle'))}</p>${chart}` : ''}
    </div>
    ${notesList(r.notes)}`;
  $('act-print').onclick = () => window.print();
  $('act-link').onclick = (ev) => copy(location.href, ev.target);
  $('act-text').onclick = (ev) => copy(recipeText(r, steps), ev.target);
}

function recipeText(r, steps) {
  const lines = [`${nameOf(r.system)} ${conc(r.request.concentration)}, pH ${r.request.pH} @ ${r.request.tUse} °C — bufferbench ${bb.VERSION}`];
  for (const i of r.ingredients) lines.push(`  ${nameOf(i)} (${i.formula}): ${i.role === 'titrant' && i.stockML ? `${mL(i.stockML)} of ${i.stockMolarity} M` : grams(i.grams)}`);
  lines.push('');
  steps.forEach((s, k) => lines.push(`${k + 1}. ${s}`));
  for (const n of r.notes) lines.push(`- ${bb.noteText(n, lang)}`);
  return lines.join('\n');
}

async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); const old = btn.textContent; btn.textContent = t('copied'); setTimeout(() => (btn.textContent = old), 1200); } catch { /* clipboard blocked */ }
}

// ---------- URL state ----------
const RECIPE_FIELDS = ['r-system', 'r-conc', 'r-conc-unit', 'r-ph', 'r-tuse', 'r-tprep', 'r-vol', 'r-vol-unit', 'r-stock', 'r-start', 'r-titrant', 'r-tstock', 'r-formA', 'r-formB', 'r-nacl', 'r-kcl', 'r-mgcl2', 'r-cacl2', 'r-model'];
function saveHash() {
  const p = new URLSearchParams();
  p.set('tab', currentTab);
  if (currentTab === 'recipe') {
    for (const id of RECIPE_FIELDS) if ($(id).value !== '') p.set(id.slice(2), $(id).value);
    p.set('method', document.querySelector('input[name=r-method]:checked').value);
  }
  history.replaceState(null, '', '#' + p.toString());
}
function loadHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('system') && bb.SYSTEM_BY_ID.has(p.get('system'))) $('r-system').value = p.get('system');
  fillForms(false);
  for (const id of RECIPE_FIELDS) { const v = p.get(id.slice(2)); if (v !== null && id !== 'r-system') $(id).value = v; }
  const m = p.get('method');
  if (m === 'mix' || m === 'titrate') document.querySelector(`input[name=r-method][value=${m}]`).checked = true;
  return p.get('tab');
}

// ---------- predict ----------
const PREDICT_REAGENTS = bb.REAGENTS.slice().sort((a, b) => (a.role === b.role ? nameOf(a).localeCompare(nameOf(b)) : a.role === 'buffer' ? -1 : b.role === 'buffer' ? 1 : a.role.localeCompare(b.role)));
function addRow(id = 'tris', mM = 50) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<select aria-label="${esc(t('substance'))}">${PREDICT_REAGENTS.map((r) => `<option value="${r.id}">${esc(nameOf(r))} — ${esc(r.formula)}</option>`).join('')}</select><span class="unit-input"><input type="number" inputmode="decimal" min="0" step="any" value="${mM}" aria-label="mM"></span><button type="button" aria-label="${esc(t('remove'))}">×</button>`;
  row.querySelector('select').value = id;
  row.querySelector('button').onclick = () => { row.remove(); renderPredict(); };
  row.addEventListener('input', renderPredict);
  $('p-rows').appendChild(row);
}
function renderPredict() {
  const amounts = {};
  for (const row of $('p-rows').children) {
    const id = row.querySelector('select').value;
    const v = parseFloat(row.querySelector('input').value);
    if (v > 0) amounts[id] = (amounts[id] ?? 0) + v / 1000;
  }
  const out = $('predict-result');
  let p;
  try { p = bb.predict({ amounts, tPrep: num('p-tprep'), t: num('p-t'), model: $('p-model').value }); } catch (e) { out.innerHTML = errorBox(e); return; }
  const sp = p.equilibrium.species.filter((s) => s.fraction > 0.001).map((s) => {
    const sys = bb.getSystem(s.system);
    const z = s.charge === 0 ? '0' : s.charge > 0 ? `${s.charge > 1 ? s.charge : ''}+` : `${s.charge < -1 ? -s.charge : ''}−`;
    return `<tr><td>${esc(nameOf(sys))} <span class="muted">(${z})</span></td><td class="num">${fx(s.fraction * 100, 1)} %</td></tr>`;
  }).join('');
  out.innerHTML = `<div class="card"><div class="headline"><span class="big">${esc(t('phAt', { pH: p.pH.toFixed(2), t: p.tC }))}</span></div>${tierBadge(p.tier)}</div>
    <div class="card"><dl class="props">
      <div><dt>${esc(t('propI'))}</dt><dd>${fx(p.ionicStrength, 3)} mol/kg</dd></div>
      <div><dt>${esc(t('propBeta'))}</dt><dd>${fx(p.bufferCapacity, 1)} ${esc(t('mmPerPH'))}</dd></div>
      <div><dt>${esc(t('propDT'))}</dt><dd>${p.dpHdT >= 0 ? '+' : '−'}${fx(Math.abs(p.dpHdT), 4)} ${esc(t('perC'))}</dd></div>
    </dl>${sp ? `<div class="scroll" style="margin-top:12px"><table><thead><tr><th>${esc(t('species'))}</th><th class="num">${esc(t('fraction'))}</th></tr></thead><tbody>${sp}</tbody></table></div>` : ''}</div>
    ${notesList(p.notes)}`;
}

// ---------- choose ----------
function renderChoose() {
  const out = $('choose-result');
  let list;
  try { list = bb.suggest({ pH: num('c-ph'), t: num('c-t'), I: Math.max(0, num('c-i')) }); } catch (e) { out.innerHTML = errorBox(e); return; }
  if (!list.length) { out.innerHTML = `<p class="muted">${esc(t('chooseNone'))}</p>`; return; }
  const H = t('chooseHead');
  const flag = (f) => ({ 'no-enthalpy': t('noEnthalpy'), 'approximate-pK': t('approximate'), hazard: t('hazard') })[f] ?? f;
  out.innerHTML = `<p class="muted">${esc(t('chooseHelp'))}</p><div class="card scroll"><table><thead><tr>${H.map((h, i) => `<th class="${i && i < 4 ? 'num' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${list.map((s) => `<tr><td>${esc(nameOf(s))}${s.certified ? `<span class="badge">${esc(t('certified'))}</span>` : ''}${s.flags.map((f) => `<span class="badge warn">${esc(flag(f))}</span>`).join('')}</td><td class="num">${fx(s.pKa, 2)}</td><td class="num">${s.dpKadT === null ? '—' : (s.dpKadT >= 0 ? '+' : '−') + fx(Math.abs(s.dpKadT), 4)}</td><td class="num">${fx(s.distance, 2)}</td><td class="num"><button type="button" class="use" data-id="${s.system}">${esc(t('use'))}</button></td></tr>`).join('')}</tbody></table></div>`;
  for (const b of out.querySelectorAll('button.use')) b.onclick = () => {
    $('r-system').value = b.dataset.id; fillForms(false);
    $('r-ph').value = $('c-ph').value; $('r-tuse').value = $('c-t').value;
    showTab('recipe'); renderRecipe(); saveHash();
  };
}

// ---------- validation ----------
let results = null;
const PALETTE = ['#2a5d8f', '#c0392b', '#1f8a5b', '#8e44ad', '#d68910', '#5d6d7e'];
async function renderValidation() {
  const box = $('validation');
  if (!results) {
    box.innerHTML = `<p class="muted">${esc(t('valLoading'))}</p>`;
    try { results = await (await fetch('results.json')).json(); } catch { box.innerHTML = `<p class="muted">${esc(t('valMissing'))}</p>`; return; }
  }
  const def = results.models.find((m) => m.model === results.defaultModel);
  const modelName = (m) => (m === 'ideal' ? t('ideal') : m === 'davies' ? 'Davies' : 'Bates–Guggenheim');
  const W = 640, H = 240, L = 48, R = 28, TP = 12, B = 30, lim = 0.03;
  const X = (T) => L + (T / 50) * (W - L - R), Y = (d) => TP + (1 - (d + lim) / (2 * lim)) * (H - TP - B);
  let g = `<rect class="band" x="${L}" y="${Y(0.01)}" width="${W - L - R}" height="${Y(-0.01) - Y(0.01)}"/><line class="zero" x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}"/>`;
  for (const d of [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03]) g += `<text x="${L - 6}" y="${Y(d) + 4}" text-anchor="end">${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(2)}</text>`;
  for (let T = 0; T <= 50; T += 10) g += `<text x="${X(T)}" y="${H - 10}" text-anchor="middle">${T} °C</text>`;
  def.standards.forEach((s, k) => {
    const c = PALETTE[k % PALETTE.length];
    g += `<path d="${s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.delta).toFixed(1)}`).join('')}" fill="none" stroke="${c}" stroke-width="1.5"/>`;
    for (const p of s.points) g += `<circle class="pt" cx="${X(p.t)}" cy="${Y(p.delta)}" r="3.5" fill="${c}"><title>${esc(s.name)} ${p.t} °C: ${p.delta > 0 ? '+' : ''}${p.delta.toFixed(3)}</title></circle>`;
  });
  const legend = def.standards.map((s, k) => `<span style="white-space:nowrap;margin-right:12px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${PALETTE[k % PALETTE.length]};margin-right:5px"></span>${esc(s.name)}</span>`).join('');
  box.innerHTML = `<p>${esc(t('valIntro', { s: def.standards.length, n: def.n }))}</p>
    <div class="card scroll"><table><thead><tr><th>${esc(t('valModels'))}</th><th class="num">${esc(t('valPoints'))}</th><th class="num">${esc(t('valMax'))}</th><th class="num">${esc(t('valMedian'))}</th><th class="num">${esc(t('valWithin'))}</th></tr></thead><tbody>
    ${results.models.map((m) => `<tr><td>${esc(modelName(m.model))}${m.model === results.defaultModel ? ' ★' : ''}</td><td class="num">${m.n}</td><td class="num">${m.maxAbs.toFixed(3)}</td><td class="num">${m.medianAbs.toFixed(3)}</td><td class="num">${m.withinUncertainty} / ${m.n}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="card"><p class="muted" style="margin-top:0">${esc(t('valChart'))}</p><svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${g}</svg><p class="muted">${legend}</p></div>
    <div class="card scroll"><table><thead><tr><th>${esc(t('valStandard'))}</th><th class="num">I</th><th class="num">${esc(t('valMax'))}</th><th class="num">${esc(t('valMean'))}</th><th>${esc(t('valSource'))}</th></tr></thead><tbody>
    ${def.standards.map((s) => `<tr><td>${esc(s.name)}</td><td class="num">${s.ionicStrength.toFixed(3)}</td><td class="num">${s.maxAbs.toFixed(3)}</td><td class="num">${s.mean > 0 ? '+' : s.mean < 0 ? '−' : ''}${Math.abs(s.mean).toFixed(3)}</td><td class="muted">${esc(s.source)}</td></tr>`).join('')}
    </tbody></table></div>`;
}

async function renderProof() {
  try {
    if (!results) results = await (await fetch('results.json')).json();
    const def = results.models.find((m) => m.model === results.defaultModel);
    const ideal = results.models.find((m) => m.model === 'ideal');
    $('proof').innerHTML = t('proof', { n: def.n, s: def.standards.length, max: def.maxAbs.toFixed(3), ideal: ideal.maxAbs.toFixed(2) });
  } catch { $('proof').textContent = ''; }
}

// ---------- tabs ----------
let currentTab = 'recipe';
function showTab(name) {
  currentTab = name;
  for (const n of ['recipe', 'predict', 'choose', 'validation']) {
    $('tab-' + n).setAttribute('aria-selected', String(n === name));
    $('panel-' + n).hidden = n !== name;
  }
  if (name === 'predict') renderPredict();
  if (name === 'choose') renderChoose();
  if (name === 'validation') renderValidation();
}

function rerenderAll() {
  applyStatic(); fillSystems(); fillForms(); renderProof();
  const prevRows = [...$('p-rows').children].map((r) => [r.querySelector('select').value, r.querySelector('input').value]);
  $('p-rows').innerHTML = ''; for (const [id, v] of prevRows) addRow(id, v);
  renderRecipe(); if (currentTab !== 'recipe') showTab(currentTab);
}

// ---------- wiring ----------
function init() {
  applyStatic();
  fillSystems();
  const tab = loadHash();
  for (const n of ['recipe', 'predict', 'choose', 'validation']) $('tab-' + n).onclick = () => { showTab(n); saveHash(); };
  const syncMethod = () => {
    const m = document.querySelector('input[name=r-method]:checked').value;
    $('titrate-opts').hidden = m !== 'titrate'; $('mix-opts').hidden = m !== 'mix';
  };
  $('recipe-form').addEventListener('input', (e) => {
    if (e.target.id === 'r-system') fillForms(false);
    syncMethod(); renderRecipe(); saveHash();
  });
  $('recipe-form').addEventListener('submit', (e) => e.preventDefault());
  $('r-system').addEventListener('change', () => { fillForms(false); renderRecipe(); saveHash(); });
  $('p-add').onclick = () => { addRow('nacl', 0); };
  for (const id of ['p-tprep', 'p-t', 'p-model']) $(id).addEventListener('input', renderPredict);
  for (const id of ['c-ph', 'c-t', 'c-i']) $(id).addEventListener('input', renderChoose);
  $('lang').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; try { localStorage.setItem('bufferbench-lang', lang); } catch { /* private mode */ } rerenderAll(); };
  addRow('tris', 50); addRow('hcl', 40);
  syncMethod();
  renderProof();
  renderRecipe();
  showTab(tab && ['recipe', 'predict', 'choose', 'validation'].includes(tab) ? tab : 'recipe');
}
init();
window.addEventListener('hashchange', () => {
  const tab = loadHash();
  renderRecipe();
  showTab(tab && ['recipe', 'predict', 'choose', 'validation'].includes(tab) ? tab : currentTab);
});
