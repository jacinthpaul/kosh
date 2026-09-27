import { calc, type CalcResult } from './calc';
import { N, cmp, inr } from './format';
import type { Levers, Plan } from './types';

/*
 * Facts and calculated what-ifs for the results screen.
 * Wording states what the numbers are; it never tells the user what to do.
 */

export type Tone = 'short' | 'info' | 'ok';
export interface Finding { tone: Tone; title: string; detail?: string }

export function findings(p: Plan, c: CalcResult): Finding[] {
  const out: Finding[] = [];
  const h = p.household;

  if (c.balance < 0) out.push({ tone: 'short', title: `Spends and investments are ${inr(-c.balance)} a month more than income`, detail: 'Including the monthly share of yearly items.' });

  for (const it of c.ordered) {
    if (it.paused || it.funded) continue;
    out.push({
      tone: 'short',
      title: `${it.name}: ${inr(it.sip - it.alloc)} a month short`,
      detail: `Projected ${cmp(it.projected)} against a future cost of ${cmp(it.fv)} in ${it.year}.`,
    });
  }

  if (c.emGap > 0) out.push({ tone: 'short', title: `Emergency fund is ${cmp(c.emGap)} below ${N(p.emergency.months)} months of costs`, detail: `${(c.monthCost > 0 ? c.emHave / c.monthCost : 0).toFixed(1)} months covered today.` });

  const people = 1 + (h.hasPartner ? 1 : 0) + h.kids.length + N(h.parents);
  if (c.healthCover <= 0) out.push({ tone: 'short', title: 'No health insurance entered', detail: `${people} ${people === 1 ? 'person' : 'people'} in the household.` });
  else out.push({ tone: 'info', title: `Health cover: ${cmp(c.healthCover)} in total`, detail: `${people} ${people === 1 ? 'person' : 'people'} in the household.` });

  const dependants = (h.hasPartner ? 1 : 0) + h.kids.length + N(h.parents);
  const yearlyIncome = c.incomeM * 12 + c.incomeY;
  if (c.lifeCover <= 0 && dependants > 0) out.push({ tone: 'short', title: 'No life cover entered', detail: `${dependants} ${dependants === 1 ? 'person depends' : 'people depend'} on the household income. Outstanding loans: ${cmp(c.liab)}.` });
  else if (c.lifeCover > 0) out.push({
    tone: 'info', title: `Life cover: ${cmp(c.lifeCover)}`,
    detail: `${yearlyIncome > 0 ? (c.lifeCover / yearlyIncome).toFixed(1) + '× yearly income. ' : ''}Outstanding loans: ${cmp(c.liab)}.`,
  });

  if (c.unassignedAssets > 0 || c.unassignedInvest > 0) {
    const parts = [c.unassignedAssets > 0 ? cmp(c.unassignedAssets) + ' in savings' : '', c.unassignedInvest > 0 ? inr(c.unassignedInvest) + ' a month in investments' : ''].filter(Boolean);
    out.push({ tone: 'info', title: 'Not linked to any goal: ' + parts.join(' and '), detail: 'These aren’t counted toward any goal yet.' });
  }

  if (!out.some(f => f.tone === 'short')) out.unshift({ tone: 'ok', title: 'No shortfalls under these assumptions' });
  return out;
}

export interface Option { id: string; title: string; detail: string; gap: number; saves: number; funded: number; levers: Levers }

export function options(p: Plan, c: CalcResult): Option[] {
  if (c.gapM < 1) return [];
  const year = c.year;
  const cand: { id: string; title: string; detail: string; levers: Levers }[] = [];

  cand.push({ id: 'ret2', title: `Retire 2 years later, at ${c.retAge + 2}`, detail: 'More years to save and fewer years to fund.', levers: { retDelta: 2 } });
  const short = c.ordered.filter(it => it.kind !== 'ret' && !it.funded && !it.paused).sort((a, b) => b.short - a.short).slice(0, 3);
  for (const it of short) {
    cand.push({ id: 'delay-' + it.id, title: `Move ${it.name} to ${it.year + 2}`, detail: 'Two more years to save for it.', levers: { delay: { [it.id]: 2 } } });
    if (it.today) cand.push({ id: 'scale-' + it.id, title: `Lower the ${it.name} budget by 20%`, detail: `${cmp(it.today)} → ${cmp(it.today * 0.8)} in today’s prices.`, levers: { scale: { [it.id]: 0.8 } } });
  }
  if (c.items.some(it => it.priority === 'Nice to have')) cand.push({ id: 'pause', title: 'Pause nice-to-have goals', detail: 'Frees their monthly amounts for other goals.', levers: { pauseNice: true } });
  cand.push({ id: 'step', title: 'Raise the monthly amounts 5% each year', detail: 'Monthly amounts start lower and rise 5% every year.', levers: { stepUp: 5 } });
  if (c.ess > 0) cand.push({ id: 'spend', title: 'Spend 10% less on regular monthly spends', detail: `${inr(c.ess)} → ${inr(c.ess * 0.9)} a month.`, levers: { spendCut: 0.1 } });
  if ((c.unassignedAssets > 0 || c.unassignedInvest > 0) && short[0]) {
    cand.push({ id: 'assign', title: `Link unassigned savings to ${short[0].name}`, detail: `${cmp(c.unassignedAssets)} saved${c.unassignedInvest ? ' and ' + inr(c.unassignedInvest) + ' a month' : ''}, currently not linked to a goal.`, levers: { assignUnassigned: short[0].id } });
  }

  return cand
    .map(o => {
      const x = calc(p, { year, levers: o.levers });
      return { ...o, gap: x.gapM, saves: c.gapM - x.gapM, funded: x.items.filter(i => i.funded).length };
    })
    .filter(o => o.saves >= 1)
    .sort((a, b) => b.saves - a.saves);
}
