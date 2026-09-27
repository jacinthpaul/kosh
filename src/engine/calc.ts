import { ASSET_CLASS, DEFAULT_RATES, MARKET, RANK, type AssetClass } from './data';
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

/** Goals this close are assumed to be funded at the safer rate; from LONG years away, at the full rate. */
export const SHORT_YEARS = 3, LONG_YEARS = 7;

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
  const L = { retDelta: 0, delay: {}, scale: {}, pauseNice: false, stepUp: 0, spendCut: 0, wantCut: 0, assignUnassigned: '', ...levers } as Required<Levers>;
  const A = { ret: N(p.a.ret), retPost: N(p.a.retPost), inf: N(p.a.inf), safe: p.a.safe === '' || p.a.safe == null ? N(p.a.ret) : N(p.a.safe) };
  const rLong = (A.ret + S.dRet) / 100, rSafe = (A.safe + S.dRet) / 100;
  /** Return on new monthly amounts for something `n` years away: safer when near, full rate when far. */
  const rFor = (n: number) => (n <= SHORT_YEARS ? rSafe : n >= LONG_YEARS ? rLong : rSafe + ((rLong - rSafe) * (n - SHORT_YEARS)) / (LONG_YEARS - SHORT_YEARS));
  const inf = (A.inf + S.dInf) / 100, s = N(L.stepUp) / 100;
  const h = p.household;
  const earmarkOf = (e: string | undefined) => (L.assignUnassigned && e === 'unassigned' ? L.assignUnassigned : e ?? '');

  // ---- Monthly and yearly cash flow ----
  const incomeM = sum(p.income, 'amt') * (1 - S.incomeCut);
  const incomeY = sum(p.annualIncome, 'amt') * (1 - S.incomeCut);
  const needs = sum(p.essentials.filter(e => !e.want), 'amt');
  const wants = sum(p.essentials.filter(e => e.want), 'amt') * (1 - N(L.wantCut));
  const ess = (needs + wants) * (1 - N(L.spendCut));
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

  // ---- Emergency fund: months of needs (not wants), EMIs and premiums ----
  // Simplification: the monthly set-aside is treated as ongoing, not released once the target is reached.
  const monthCost = needs * (1 - N(L.spendCut)) + emi + premiums;
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
  /** One-off amounts arriving later: one-time income and savings-plan maturities. */
  const inflows = [
    ...p.oneTime.filter(o => o.kind === 'income').map(o => ({ amt: N(o.amt), year: N(o.year) || Y0, earmark: o.earmark })),
    ...p.insurance.filter(x => x.type === 'Life (savings plan)' && N(x.maturity) > 0).map(x => ({ amt: N(x.maturity), year: N(x.maturityYear) || Y0, earmark: x.earmark })),
  ];
  const inflowsFor = (id: string, n: number) =>
    inflows.filter(o => earmarkOf(o.earmark) === id).reduce((t, o) => {
      const at = Math.max(0, o.year - Y0); // years from now until it arrives
      return at <= n ? t + o.amt * Math.pow(1 + rFor(n - at), n - at) : t;
    }, 0);
  const workingFor = (id: string, n: number) => assetsFor(id, n) + investFor(id, n) + inflowsFor(id, n);

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

  const base = { alloc: 0, projected: 0, pct: 0, short: 0, funded: false, paused: false, gap: 0, sip: 0, carried: 0, carriedFrom: [] as string[], moved: 0, allocLater: 0, laterValue: 0 };
  const items: Item[] = [];
  const addItem = (id: string, name: string, type: string, priority: Item['priority'], kind: Item['kind'], year: number, today: number, fv: number) => {
    const n = Math.max(1, year - Y0);
    const rt = rFor(n);
    items.push({
      ...base, carriedFrom: [], id, name, type, priority, kind, year, n, today, fv, rate: rt,
      grown: workingFor(id, n), factor: sipFactor(n, rt, s), paused: !!L.pauseNice && priority === 'Nice to have',
    });
  };
  addItem('ret', 'Retirement', 'Retirement', 'Essential', 'ret', Y0 + yrsRet, Math.max(0, N(R.expense) - N(R.pension)) * 12, corpus);
  const goalItem = (id: string, name: string, type: string, priority: Item['priority'], kind: Item['kind'], year0: number, cost0: number, infPct: number) => {
    const year = year0 + N((L.delay as Record<string, number>)[id]);
    const scale = (L.scale as Record<string, number>)[id];
    const cost = cost0 * (scale == null ? 1 : scale);
    addItem(id, name, type, priority, kind, year, cost, cost * Math.pow(1 + (infPct + S.dInf) / 100, Math.max(1, year - Y0)));
  };
  for (const g of p.goals) goalItem(g.id, g.name || 'Untitled goal', g.type, g.priority, 'goal', N(g.year) || Y0 + 1, N(g.cost), N(g.inf));
  for (const o of p.oneTime) if (o.kind === 'spend') goalItem(o.id, o.label || 'One-time spend', 'One-time', 'Essential', 'oneTime', N(o.year) || Y0 + 1, N(o.amt), A.inf);

  const ordered = items.slice().sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.year - b.year);
  /** When extra money reaches each item: carried surplus (lump at `at` years) and freed EMIs (monthly from `at`). */
  const parts = new Map<string, { kind: 'lump' | 'monthly'; amt: number; at: number; rate: number }[]>();
  const addPart = (id: string, part: { kind: 'lump' | 'monthly'; amt: number; at: number; rate: number }) => parts.set(id, [...(parts.get(id) ?? []), part]);
  const needOf = (it: Item) => Math.max(0, it.fv - it.grown - it.carried);

  // Surplus on one item carries forward to later items, in funding order.
  for (const src of items.slice().sort((a, b) => a.year - b.year)) {
    let excess = src.grown - src.fv;
    if (excess <= 1) continue;
    for (const tgt of ordered) {
      if (tgt === src || tgt.year < src.year || excess <= 1) continue;
      const need = needOf(tgt);
      if (need <= 1) continue;
      const dn = tgt.n - src.n, g = Math.pow(1 + rFor(dn), dn);
      const take = Math.min(excess, need / g);
      tgt.carried += take * g;
      tgt.carriedFrom.push(src.name);
      addPart(tgt.id, { kind: 'lump', amt: take, at: src.n, rate: rFor(dn) });
      src.moved += take;
      excess -= take;
    }
  }
  for (const it of items) {
    it.gap = needOf(it);
    it.sip = it.paused || !it.factor ? 0 : it.gap / it.factor;
  }

  // EMIs that end before a goal's date free money from then on. It can only help goals due after the loan ends,
  // so it is placed first (in funding order); today's balance then covers whatever is still short.
  const freed = p.loans.filter(l => N(l.endYear) > Y0 && N(l.emi) > 0).map(l => ({ amt: N(l.emi), from: N(l.endYear) - Y0, label: l.label || 'Loan', year: N(l.endYear) }))
    .sort((a, b) => a.from - b.from);
  for (const pool of freed) {
    let left = pool.amt;
    for (const it of ordered) {
      if (left <= 0) break;
      if (it.paused || it.n <= pool.from) continue;
      const short = it.gap - it.laterValue;
      if (short <= 1) continue;
      const fL = sipFactor(it.n - pool.from, it.rate, s);
      if (!fL) continue;
      const a = Math.min(left, short / fL);
      it.allocLater += a; it.laterValue += a * fL; left -= a;
      addPart(it.id, { kind: 'monthly', amt: a, at: pool.from, rate: it.rate });
    }
  }

  // Fund the rest from the monthly balance in priority order, then by date.
  let rem = available;
  for (const it of ordered) {
    const need = it.paused || !it.factor ? 0 : Math.max(0, it.gap - it.laterValue) / it.factor;
    it.alloc = Math.min(need, rem);
    rem -= it.alloc;
  }

  for (const it of ordered) {
    it.projected = it.grown - it.moved + it.carried + it.alloc * it.factor + it.laterValue;
    it.pct = it.fv > 0 ? Math.min(1, it.projected / it.fv) : 1;
    it.short = it.paused ? 0 : Math.max(0, it.fv - it.projected);
    it.funded = !it.paused && it.short < 1;
  }
  const required = sum(items, 'sip');
  /** Extra needed each month, from today, to close every remaining shortfall. */
  const gapM = ordered.reduce((t, it) => t + (it.short > 1 && it.factor ? it.short / it.factor : 0), 0);
  /** The same gap expressed as one amount invested today. */
  const lumpToday = ordered.reduce((t, it) => t + (it.short > 1 ? it.short / Math.pow(1 + it.rate, it.n) : 0), 0);
  const ret = items[0];

  // ---- Retirement balance: build-up, then year-by-year drawdown ----
  const series: { age: number; bal: number }[] = [];
  const extraAt = (t: number) => (parts.get('ret') ?? []).reduce((x, pt) =>
    x + (t < pt.at ? 0 : pt.kind === 'lump' ? pt.amt * Math.pow(1 + pt.rate, t - pt.at) : pt.amt * sipFactor(t - pt.at, pt.rate, s)), 0);
  for (let t = 0; t <= yrsRet; t++) {
    series.push({ age: youAge + t, bal: workingFor('ret', t) + ret.alloc * sipFactor(t, ret.rate, s) + extraAt(t) - (ret.moved > 0 && t === yrsRet ? ret.moved : 0) });
  }
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
  const employerHealth = sum(p.insurance.filter(x => x.type === 'Health' && x.employer), 'cover');
  const lifeCover = sum(p.insurance.filter(x => x.type !== 'Health'), 'cover');
  const lifeCoverOf = (who: 'you' | 'partner') => sum(p.insurance.filter(x => x.type !== 'Health' && (x.person || 'you') === who), 'cover');
  const mix = new Map<AssetClass, number>();
  for (const a of p.assets) mix.set(ASSET_CLASS[a.type] ?? 'Other', (mix.get(ASSET_CLASS[a.type] ?? 'Other') ?? 0) + N(a.value));

  return {
    year: Y0, income, incomeM, incomeY, needs, wants, ess, emi, invest, investPayroll, premiums, ann, spendY, balanceM, balance,
    monthCost, emTarget, emHave, emGap, emContrib, emMonths, available,
    items, ordered, required, gapM, lumpToday, unallocated: Math.max(0, rem), freed, ret, series, lastsTo, corpus, retAge, alreadyRetired,
    youAge, yrsRet, lifeExp, E0, assetsTotal, liab, netWorth: assetsTotal - liab, forGoals,
    unassignedAssets, unassignedInvest, healthCover, employerHealth, lifeCover, lifeCoverOf, mix, rate, rFor,
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
