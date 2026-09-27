import { DEFAULT_RATES, MARKET, RANK } from './data';
import { N, sum } from './format';
import type { AssetType, Item, Levers, Plan, Policy, Stress } from './types';

/**
 * Future value of investing 1 rupee a month for `years`, compounding monthly at yearly rate `r`,
 * with the monthly amount raised by `stepUp` once a year.
 */
export function sipFactor(years: number, r: number, stepUp = 0) {
  const M = Math.round(years * 12);
  if (M <= 0) return 0;
  const rm = Math.pow(1 + r, 1 / 12) - 1;
  let f = 0;
  for (let m = 0; m < M; m++) f += Math.pow(1 + stepUp, Math.floor(m / 12)) * Math.pow(1 + rm, M - m);
  return f;
}

export const premiumMonthly = (p: Policy) => (p.freq === 'Yearly' ? N(p.premium) / 12 : N(p.premium));

export interface CalcOptions {
  /** Current calendar year. All horizons are measured from it. */
  year: number;
  stress?: Stress;
  levers?: Levers;
}

export type CalcResult = ReturnType<typeof calc>;

/**
 * The whole plan model. Pure: same inputs, same outputs.
 * All figures are before tax, fees and exit loads.
 */
export function calc(p: Plan, { year: Y0, stress, levers }: CalcOptions) {
  const S = { dRet: 0, dInf: 0, incomeCut: 0, retShift: 0, ...stress };
  const L = { retDelta: 0, delay: {}, scale: {}, pauseNice: false, stepUp: 0, spendCut: 0, assignUnassigned: '', ...levers } as Required<Levers>;
  const A = { ret: N(p.a.ret), retPost: N(p.a.retPost), inf: N(p.a.inf) };
  const r = (A.ret + S.dRet) / 100, inf = (A.inf + S.dInf) / 100, s = N(L.stepUp) / 100;
  const h = p.household;
  const earmarkOf = (e: string) => (L.assignUnassigned && e === 'unassigned' ? L.assignUnassigned : e);

  // ---- Monthly and yearly cash flow ----
  const incomeM = sum(p.income, 'amt') * (1 - S.incomeCut);
  const incomeY = sum(p.annualIncome, 'amt') * (1 - S.incomeCut);
  const ess = sum(p.essentials, 'amt') * (1 - N(L.spendCut));
  const emi = sum(p.loans, 'emi');
  /** Investments paid from take-home pay. Payroll deductions (EPF etc.) are already out of take-home. */
  const invest = sum(p.investments.filter(v => !v.payroll), 'amt');
  const investPayroll = sum(p.investments.filter(v => v.payroll), 'amt');
  const premiums = p.insurance.reduce((t, x) => t + premiumMonthly(x), 0);
  const spendY = sum(p.annual, 'amt');
  /** Balance from monthly items only. */
  const balanceM = incomeM - ess - emi - invest - premiums;
  /** Balance including the monthly share of yearly items: what's actually free each month. */
  const balance = balanceM + (incomeY - spendY) / 12;
  const income = incomeM + incomeY / 12;
  const ann = spendY / 12;

  // ---- Emergency fund ----
  // Simplification: the monthly set-aside is treated as ongoing, not released once the target is reached.
  const monthCost = ess + emi + premiums;
  const emTarget = N(p.emergency.months) * monthCost;
  const emHave = sum(p.assets.filter(a => a.earmark === 'emergency'), 'value');
  const emGap = Math.max(0, emTarget - emHave);
  const emContrib = emGap > 0 ? Math.min(N(p.emergency.monthly), Math.max(0, balance)) : 0;
  const emMonths = emContrib > 0 ? Math.ceil(emGap / emContrib) : null;
  const available = Math.max(0, balance - emContrib);

  // ---- What's already working toward each item ----
  const rate = (t: AssetType) => (p.rates?.[t] === '' || p.rates?.[t] == null ? DEFAULT_RATES[t] ?? 6 : N(p.rates[t])) / 100 + (MARKET[t] ? S.dRet / 100 : 0);
  const assetsFor = (id: string, n: number) =>
    p.assets.filter(a => earmarkOf(a.earmark) === id).reduce((t, a) => t + N(a.value) * Math.pow(1 + rate(a.type), n), 0);
  const investFor = (id: string, n: number) =>
    p.investments.filter(v => earmarkOf(v.earmark) === id).reduce((t, v) => t + N(v.amt) * sipFactor(n, rate(v.type)), 0);
  const oneTimeFor = (id: string, n: number) =>
    p.oneTime.filter(o => o.kind === 'income' && earmarkOf(o.earmark) === id).reduce((t, o) => {
      const at = (N(o.year) || Y0) - Y0; // years from now until it arrives
      return at <= n ? t + N(o.amt) * Math.pow(1 + r, n - Math.max(0, at)) : t;
    }, 0);
  const workingFor = (id: string, n: number) => assetsFor(id, n) + investFor(id, n) + oneTimeFor(id, n);

  // ---- Retirement (based on the primary earner's age) ----
  const youAge = N(h.you.age) || 35;
  const R = p.retirement;
  const retAge = (N(R.age) || 60) + N(L.retDelta) + S.retShift;
  const alreadyRetired = N(h.you.age) > 0 && N(h.you.age) >= retAge;
  const yrsRet = Math.max(1, retAge - youAge);
  const lifeExp = N(R.lifeExp) || 85;
  const NR = Math.max(1, lifeExp - retAge);
  const rp = (A.retPost + S.dRet) / 100;
  /** Yearly spending in the first year of retirement, net of pension. */
  const E0 = Math.max(0, N(R.expense) - N(R.pension)) * 12 * Math.pow(1 + inf, yrsRet);
  const q = (1 + inf) / (1 + rp);
  let pv = 0;
  for (let k = 0; k < NR; k++) pv += Math.pow(q, k);
  const corpus = E0 * pv;
  const retF = sipFactor(yrsRet, r, s);
  const retGrown = workingFor('ret', yrsRet);
  const retGap = Math.max(0, corpus - retGrown);

  const base = { alloc: 0, projected: 0, pct: 0, short: 0, funded: false, paused: false };
  const items: Item[] = [{
    ...base, id: 'ret', name: 'Retirement', type: 'Retirement', priority: 'Essential', kind: 'ret',
    year: Y0 + yrsRet, n: yrsRet, today: Math.max(0, N(R.expense) - N(R.pension)) * 12, fv: corpus, grown: retGrown, gap: retGap,
    sip: retF ? retGap / retF : 0, factor: retF,
  }];
  const addItem = (id: string, name: string, type: string, priority: Item['priority'], kind: Item['kind'], year0: number, cost0: number, infPct: number) => {
    const year = year0 + N((L.delay as Record<string, number>)[id]);
    const n = Math.max(1, year - Y0);
    const scale = (L.scale as Record<string, number>)[id];
    const cost = cost0 * (scale == null ? 1 : scale);
    const fv = cost * Math.pow(1 + (infPct + S.dInf) / 100, n);
    const grown = workingFor(id, n);
    const gap = Math.max(0, fv - grown);
    const f = sipFactor(n, r, s);
    const paused = !!L.pauseNice && priority === 'Nice to have';
    items.push({ ...base, id, name, type, priority, kind, year, n, today: cost, fv, grown, gap, sip: paused || !f ? 0 : gap / f, factor: f, paused });
  };
  for (const g of p.goals) addItem(g.id, g.name || 'Untitled goal', g.type, g.priority, 'goal', N(g.year) || Y0 + 1, N(g.cost), N(g.inf));
  for (const o of p.oneTime) if (o.kind === 'spend') addItem(o.id, o.label || 'One-time spend', 'One-time', 'Essential', 'oneTime', N(o.year) || Y0 + 1, N(o.amt), A.inf);

  // Fund from the monthly balance in priority order, then by date.
  const ordered = items.slice().sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.year - b.year);
  let rem = available;
  for (const it of ordered) {
    it.alloc = Math.min(it.sip, rem);
    rem -= it.alloc;
    it.projected = it.grown + it.alloc * it.factor;
    it.pct = it.fv > 0 ? Math.min(1, it.projected / it.fv) : 1;
    it.short = it.paused ? 0 : Math.max(0, it.fv - it.projected);
    it.funded = !it.paused && it.sip - it.alloc < 1;
  }
  const required = sum(items, 'sip');
  const gapM = Math.max(0, required - available);
  /** The monthly gap expressed as one amount invested today. */
  const lumpToday = ordered.reduce((t, it) => t + (it.short > 1 ? it.short / Math.pow(1 + r, it.n) : 0), 0);
  const ret = items[0];

  // ---- Retirement balance: build-up, then year-by-year drawdown ----
  const series: { age: number; bal: number }[] = [];
  for (let t = 0; t <= yrsRet; t++) series.push({ age: youAge + t, bal: workingFor('ret', t) + ret.alloc * sipFactor(t, r, s) });
  let bal = series[series.length - 1].bal;
  let lastsTo: number | null = null;
  for (let k = 0; retAge + k < lifeExp + 5; k++) {
    const w = E0 * Math.pow(1 + inf, k);
    if (bal < w && lastsTo === null) lastsTo = retAge + k;
    bal = Math.max(0, bal - w) * (1 + rp);
    series.push({ age: retAge + k + 1, bal });
  }

  // ---- Position today ----
  const assetsTotal = sum(p.assets, 'value'), liab = sum(p.loans, 'out');
  const forGoals = sum(p.assets.filter(a => a.earmark !== 'excluded' && a.earmark !== 'emergency'), 'value');
  const unassignedAssets = sum(p.assets.filter(a => a.earmark === 'unassigned'), 'value');
  const unassignedInvest = sum(p.investments.filter(v => v.earmark === 'unassigned'), 'amt');
  const healthCover = sum(p.insurance.filter(x => x.type === 'Health'), 'cover');
  const lifeCover = sum(p.insurance.filter(x => x.type !== 'Health'), 'cover');

  return {
    year: Y0, income, incomeM, incomeY, ess, emi, invest, investPayroll, premiums, ann, spendY, balanceM, balance,
    monthCost, emTarget, emHave, emGap, emContrib, emMonths, available,
    items, ordered, required, gapM, lumpToday, unallocated: Math.max(0, rem), ret, series, lastsTo, corpus, retAge, alreadyRetired,
    youAge, yrsRet, lifeExp, E0, assetsTotal, liab, netWorth: assetsTotal - liab, forGoals,
    unassignedAssets, unassignedInvest, healthCover, lifeCover, rate,
  };
}

/** Key inputs still missing; results are provisional until these are filled. */
export function missingItems(p: Plan) {
  const m: string[] = [];
  if (!N(p.household.you.age)) m.push('Your age');
  if (!N(p.retirement.expense)) m.push('Spending in retirement');
  if (!sum(p.income, 'amt')) m.push('Monthly income');
  if (!sum(p.essentials, 'amt')) m.push('Monthly spends');
  if (!p.assets.length) m.push('Savings and investments you have');
  if (!p.goals.length) m.push('At least one goal besides retirement');
  return m;
}
