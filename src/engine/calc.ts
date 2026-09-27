import { MARKET, RANK, RATES } from './data';
import { N, sum } from './format';
import type { Asset, Item, Plan, Stress } from './types';

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

export interface CalcOptions {
  /** Current calendar year. All goal horizons are measured from it. */
  year: number;
  stress?: Stress;
}

export type CalcResult = ReturnType<typeof calc>;

/**
 * The whole plan model. Pure: same inputs, same outputs.
 * All figures are before tax, fees and exit loads.
 */
export function calc(p: Plan, { year: Y0, stress }: CalcOptions) {
  const S = { dRet: 0, dInf: 0, incomeCut: 0, retShift: 0, ...stress };
  const A = {
    ret: N(p.a.ret), retPost: N(p.a.retPost), inf: N(p.a.inf),
    eduInf: N(p.a.eduInf), healthInf: N(p.a.healthInf), epf: N(p.a.epf),
  };
  const r = (A.ret + S.dRet) / 100, inf = (A.inf + S.dInf) / 100;
  const h = p.household;

  // Monthly cash flow
  const income = (N(p.income.you) + (h.hasPartner ? N(p.income.partner) : 0) + N(p.income.other)) * (1 - S.incomeCut);
  const ess = sum(p.essentials, 'amt'), emi = sum(p.loans, 'emi'), ann = sum(p.annual, 'amt') / 12;
  const surplus = income - ess - emi - ann;

  // Emergency fund. Simplification: the monthly set-aside is treated as ongoing,
  // so it isn't released to goals once the target is reached.
  const monthCost = ess + emi;
  const emTarget = N(p.emergency.months) * monthCost;
  const emHave = sum(p.assets.filter(a => a.earmark === 'emergency'), 'value');
  const emGap = Math.max(0, emTarget - emHave);
  const emContrib = emGap > 0 ? Math.min(N(p.emergency.monthly), Math.max(0, surplus)) : 0;
  const emMonths = emContrib > 0 ? Math.ceil(emGap / emContrib) : null;
  const available = Math.max(0, surplus - emContrib);

  const aRate = (a: Asset) => (RATES[a.type] ?? 6) / 100 + (MARKET[a.type] ? S.dRet / 100 : 0);
  const grownFor = (id: string, n: number) =>
    p.assets.filter(a => a.earmark === id).reduce((t, a) => t + N(a.value) * Math.pow(1 + aRate(a), n), 0);

  // Retirement (based on the primary earner's age)
  const youAge = N(h.you.age) || 35;
  const R = p.retirement;
  const retAge = (N(R.age) || 60) + S.retShift;
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
  const retGrown = grownFor('ret', yrsRet);
  const epfFV = N(R.ongoing) * sipFactor(yrsRet, A.epf / 100);
  const retF = sipFactor(yrsRet, r);
  const retGap = Math.max(0, corpus - retGrown - epfFV);

  const base = { alloc: 0, projected: 0, pct: 0, short: 0, funded: false };
  const items: Item[] = [{
    ...base, id: 'ret', name: 'Retirement', type: 'Retirement', priority: 'Essential',
    year: Y0 + yrsRet, n: yrsRet, today: null, fv: corpus, grown: retGrown + epfFV, gap: retGap,
    sip: retF ? retGap / retF : 0, factor: retF,
  }];
  for (const g of p.goals) {
    const year = N(g.year) || Y0 + 1;
    const n = Math.max(1, year - Y0);
    const cost = N(g.cost);
    const fv = cost * Math.pow(1 + (N(g.inf) + S.dInf) / 100, n);
    const grown = grownFor(g.id, n);
    const gap = Math.max(0, fv - grown);
    const f = sipFactor(n, r);
    items.push({ ...base, id: g.id, name: g.name || 'Untitled goal', type: g.type, priority: g.priority, year, n, today: cost, fv, grown, gap, sip: f ? gap / f : 0, factor: f });
  }

  // Fund goals from the monthly surplus in priority order, then by date.
  const ordered = items.slice().sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.year - b.year);
  let rem = available;
  for (const it of ordered) {
    it.alloc = Math.min(it.sip, rem);
    rem -= it.alloc;
    it.projected = it.grown + it.alloc * it.factor;
    it.pct = it.fv > 0 ? Math.min(1, it.projected / it.fv) : 1;
    it.short = Math.max(0, it.fv - it.projected);
    it.funded = it.sip - it.alloc < 1;
  }
  const required = sum(items, 'sip');
  const gapM = Math.max(0, required - available);
  const ret = items[0];

  // Retirement balance: build-up, then year-by-year drawdown.
  const series: { age: number; bal: number }[] = [];
  for (let t = 0; t <= yrsRet; t++) {
    series.push({ age: youAge + t, bal: grownFor('ret', t) + N(R.ongoing) * sipFactor(t, A.epf / 100) + ret.alloc * sipFactor(t, r) });
  }
  let bal = series[series.length - 1].bal;
  let lastsTo: number | null = null;
  for (let k = 0; retAge + k < lifeExp + 5; k++) {
    const w = E0 * Math.pow(1 + inf, k);
    if (bal < w && lastsTo === null) lastsTo = retAge + k;
    bal = Math.max(0, bal - w) * (1 + rp);
    series.push({ age: retAge + k + 1, bal });
  }

  const assetsTotal = sum(p.assets, 'value'), liab = sum(p.loans, 'out');
  const forGoals = sum(p.assets.filter(a => a.earmark !== 'excluded' && a.earmark !== 'emergency'), 'value');

  return {
    year: Y0, income, ess, emi, ann, surplus, monthCost, emTarget, emHave, emGap, emContrib, emMonths, available,
    items, ordered, required, gapM, unallocated: Math.max(0, rem), ret, series, lastsTo, corpus, retAge, alreadyRetired,
    youAge, yrsRet, lifeExp, E0, assetsTotal, liab, netWorth: assetsTotal - liab, forGoals,
  };
}

/** Key inputs still missing; results are provisional until these are filled. */
export function missingItems(p: Plan) {
  const m: string[] = [];
  if (!N(p.household.you.age)) m.push('Your age');
  if (!(N(p.income.you) + N(p.income.partner) + N(p.income.other))) m.push('Take-home income');
  if (!sum(p.essentials, 'amt')) m.push('Regular expenses');
  if (!p.assets.length) m.push('Savings and investments');
  if (!N(p.retirement.expense)) m.push('Spending in retirement');
  if (!p.goals.length) m.push('At least one goal besides retirement');
  return m;
}
