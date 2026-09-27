import { LONG_YEARS, SHORT_YEARS, type CalcResult } from '../engine/calc';
import { ASSET_CLASS, CALC_VERSION, CLASS_COLOR, TYPE_LABEL } from '../engine/data';
import { N, cmp, inr } from '../engine/format';
import { findings, options } from '../engine/insights';
import type { Plan } from '../engine/types';

/*
 * Everything the PDF says, as plain data. Kept separate from the layout so it can be tested,
 * and so every figure matches what the app shows.
 */

export interface ReportOptions { now: Date; names: boolean }

export function buildReport(plan: Plan, c: CalcResult, { now, names }: ReportOptions) {
  const h = plan.household;

  // Replace real names with neutral ones when names are hidden. Whole words, longest first.
  const swaps: [string, string][] = [];
  if (!names) {
    if (h.you.name) swaps.push([h.you.name, 'You']);
    if (h.hasPartner && h.partner.name) swaps.push([h.partner.name, 'Partner']);
    h.kids.forEach((k, i) => { if (k.name) swaps.push([k.name, h.kids.length > 1 ? 'Child ' + (i + 1) : 'Child']); });
    if (h.family) swaps.push([h.family, 'Family']);
    swaps.sort((a, b) => b[0].length - a[0].length);
  }
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // The PDF fonts have no arrow glyph, so arrows become words.
  const R = (t: string) => swaps.reduce((o, [from, to]) => o.replace(new RegExp('(^|[^\\p{L}])' + esc(from) + '(?=$|[^\\p{L}])', 'gu'), '$1' + to), t).replace(/\s*→\s*/g, ' to ').replace(/(^|[^\p{L}])You[’']s(?=[^\p{L}]|$)/gu, '$1Your');

  const title = names && h.family ? `The ${h.family} family’s wealth plan` : names && h.you.name ? `${h.you.name}’s wealth plan` : 'Your family’s wealth plan';
  const generated = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const people = 1 + (h.hasPartner ? 1 : 0) + h.kids.length + N(h.parents);
  const monthsCovered = c.monthCost > 0 ? c.emHave / c.monthCost : 0;
  const futureShort = c.ordered.reduce((t, it) => t + it.short, 0);

  const linked = (e: string) => e === 'ret' ? 'Retirement' : e === 'emergency' ? 'Emergency fund' : e === 'excluded' ? 'Not for goals'
    : e === 'unassigned' || !e ? 'Not linked to a goal' : R(plan.goals.find(g => g.id === e)?.name || 'Untitled goal');

  const kpis = [
    { label: 'Monthly balance', value: inr(c.balance), code: 'today' as const, bad: c.balance < 0,
      explain: 'What is left each month after spends, loan EMIs, investments, insurance and your share of yearly costs. This is the money available for goals.' },
    { label: 'Net worth', value: cmp(c.netWorth), code: 'today' as const,
      explain: 'Everything you own (savings, investments, property) minus everything you owe (loans), at today’s value.' },
    { label: 'Goals need more', value: c.gapM > 0 ? inr(c.gapM) + ' a month' : 'Nothing', code: c.gapM > 0 ? 'today' as const : 'ok' as const,
      explain: c.gapM > 0 ? 'The extra amount you would need to put away every month, from now, for every goal to be fully funded.' : 'Your balance and savings cover every goal under these assumptions.' },
    { label: 'Emergency buffer', value: monthsCovered.toFixed(1) + ' of ' + N(plan.emergency.months) + ' months', code: c.emGap > 0 ? 'warn' as const : 'ok' as const,
      explain: 'How many months of essential costs your emergency savings would cover if income stopped, against the target you set.' },
  ];

  const headline = c.required <= 0 ? 'No goals have been added yet.'
    : c.gapM > 0 ? `To meet every goal, you need ${inr(c.gapM)} more a month.`
      : 'Every goal is funded under these assumptions.';
  const headlineDetail = c.required <= 0 ? '' : c.gapM > 0
    ? `That is about ${cmp(c.lumpToday)} if it were invested as one amount today. Without it, your goals would fall ${cmp(futureShort)} short in future money, in the years they are due.`
    : c.unallocated >= 1 ? `${inr(c.unallocated)} a month is left over after all goals.` : '';

  const cash = [
    { k: 'Income', v: c.incomeM, sign: '+', explain: 'Take-home pay and other regular income, after tax and salary deductions.' },
    { k: 'Regular spends', v: c.ess, sign: '−', explain: `Household costs every month. ${inr(c.needs)} are needs and ${inr(c.wants)} are wants.` },
    { k: 'Loan EMIs', v: c.emi, sign: '−', explain: 'EMI (equated monthly instalment): the fixed monthly repayment on a loan.' },
    { k: 'Investments from take-home', v: c.invest, sign: '−', explain: 'Money you invest every month, such as a SIP (systematic investment plan) in mutual funds. EPF or NPS taken from salary before take-home is not counted again.' },
    { k: 'Insurance premiums', v: c.premiums, sign: '−', explain: 'The monthly share of what you pay for health and life insurance.' },
    { k: 'Yearly income, monthly share', v: c.incomeY / 12, sign: '+', explain: 'Bonuses and other yearly income, divided by 12.' },
    { k: 'Yearly spends, monthly share', v: c.spendY / 12, sign: '−', explain: 'School fees, festivals and other yearly costs, divided by 12.' },
  ].filter(r => r.v > 0);

  const goals = c.ordered.map(it => ({
    name: R(it.name), priority: it.priority, year: it.year, kind: it.kind,
    today: it.today, fv: it.fv, working: it.grown - it.moved, carried: it.carried, carriedFrom: [...new Set(it.carriedFrom)].map(R),
    sip: it.sip, alloc: it.alloc, later: it.allocLater, pct: it.pct, projected: it.projected, rate: it.rate,
    status: it.paused ? 'Paused' : it.sip < 1 ? 'Covered by savings' : it.funded ? 'Fully funded' : 'Short ' + inr(it.factor ? it.short / it.factor : 0) + ' a month',
    statusCode: it.paused ? 'muted' as const : it.funded ? 'ok' as const : 'warn' as const,
  }));

  const assets = plan.assets.map(a => ({ name: R(a.label || TYPE_LABEL[a.type] || a.type), type: TYPE_LABEL[a.type] ?? a.type, cls: ASSET_CLASS[a.type], linked: linked(a.earmark), value: N(a.value) }));
  const loans = plan.loans.map(l => ({ name: R(l.label || 'Loan'), out: N(l.out), emi: N(l.emi), ends: N(l.endYear) ? String(N(l.endYear)) : 'Not given', rate: N(l.rate) ? N(l.rate) + '%' : '—' }));
  const mix = [...c.mix.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v, pct: c.assetsTotal ? v / c.assetsTotal : 0, color: CLASS_COLOR[k] }));
  const investments = plan.investments.map(v => ({ name: R(v.label || TYPE_LABEL[v.type] || v.type), amt: N(v.amt), linked: linked(v.earmark), payroll: v.payroll }));
  const insurance = plan.insurance.map(x => ({
    name: R(x.label || x.type), type: x.type, cover: N(x.cover),
    premium: N(x.premium) ? inr(N(x.premium)) + (x.freq === 'Yearly' ? ' a year' : ' a month') : '—',
    note: [x.employer ? 'Through employer' : '', x.type !== 'Health' && h.hasPartner ? 'Covers ' + (x.person === 'partner' ? R(h.partner.name || 'Partner') : R(h.you.name || 'You')) : ''].filter(Boolean).join(' · '),
  }));

  const facts = findings(plan, c).map(f => ({ ...f, title: R(f.title), detail: f.detail ? R(f.detail) : '' }));
  const opts = options(plan, c).map(o => ({ ...o, title: R(o.title), detail: R(o.detail) }));

  const a = plan.a;
  const assumptions = [
    { k: `Return on new amounts, goals ${LONG_YEARS}+ years away`, v: N(a.ret) + '% a year' },
    { k: `Return on new amounts, goals up to ${SHORT_YEARS} years away`, v: N(a.safe) + '% a year' },
    { k: 'Return after retirement', v: N(a.retPost) + '% a year' },
    { k: 'General inflation (price rise)', v: N(a.inf) + '% a year' },
    { k: 'Education inflation', v: N(a.eduInf) + '% a year' },
    { k: 'Healthcare inflation', v: N(a.healthInf) + '% a year' },
    { k: 'Emergency fund target', v: N(plan.emergency.months) + ' months of essential costs' },
    { k: 'Tax', v: 'Not included (open assumption)' },
    { k: 'Calculation version', v: CALC_VERSION },
  ];

  return {
    title, generated, people, names, calcVersion: CALC_VERSION, year: c.year,
    kpis, headline, headlineDetail, required: c.required, available: c.available, gapM: c.gapM,
    needBars: c.ordered.filter(it => it.sip > 0).map(it => ({ name: R(it.name), v: it.sip, priority: it.priority })),
    emContrib: c.emContrib, balance: c.balance, balanceM: c.balanceM,
    cash, investments, investPayroll: c.investPayroll, insurance,
    emergency: { months: N(plan.emergency.months), have: c.emHave, target: c.emTarget, gap: c.emGap, monthCost: c.monthCost, covered: monthsCovered, monthly: c.emContrib, time: c.emGap <= 0 ? 'Target reached' : c.emMonths ? `About ${c.emMonths} months at ${inr(c.emContrib)} a month` : 'No monthly amount set aside' },
    goals, freed: c.freed.map(f => ({ ...f, label: R(f.label) })),
    retirement: {
      age: c.retAge, year: c.ret.year, years: c.yrsRet, lifeExp: c.lifeExp,
      needToday: Math.max(0, N(plan.retirement.expense) - N(plan.retirement.pension)), needThen: c.E0 / 12, corpus: c.corpus,
      sip: c.ret.sip, alloc: c.ret.alloc, lastsTo: c.lastsTo, series: c.series, youAge: c.youAge, pension: N(plan.retirement.pension), alreadyRetired: c.alreadyRetired,
    },
    assets, loans, assetsTotal: c.assetsTotal, liab: c.liab, netWorth: c.netWorth, mix,
    facts, opts, assumptions,
  };
}

export type Report = ReturnType<typeof buildReport>;
