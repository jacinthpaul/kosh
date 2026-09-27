import { describe, expect, it } from 'vitest';
import { toPlan } from '../storage/validate';
import { calc, sipFactor } from './calc';
import { blank, sample } from './data';
import { findings, options } from './insights';

// The design prototype's sample family, in the v0.1 (schema 1) shape.
const v1Sample = {
  household: { family: 'Rao', you: { name: 'Arjun', age: 36 }, hasPartner: true, partner: { name: 'Meera', age: 34 }, kids: [{ id: 'k1', name: 'Anaya', age: 5 }], parents: 1, pattern: 'Steady' },
  income: { you: 110000, partner: 65000, other: 0 },
  essentials: [{ id: 'e1', label: 'Rent', amt: 32000 }, { id: 'e2', label: 'Groceries', amt: 18000 }, { id: 'e3', label: 'Utilities', amt: 6000 }, { id: 'e4', label: 'Transport', amt: 7000 }, { id: 'e5', label: 'Care', amt: 9000 }, { id: 'e6', label: 'Other', amt: 10000 }],
  loans: [{ id: 'l1', label: 'Car loan', emi: 12000, out: 420000, rate: 9.2 }],
  annual: [{ id: 'n1', label: 'School fees', amt: 120000 }, { id: 'n2', label: 'Insurance premiums', amt: 62000 }, { id: 'n3', label: 'Festivals', amt: 60000 }, { id: 'n4', label: 'Travel', amt: 80000 }],
  assets: [
    { id: 'a1', type: 'Savings account', label: 'Savings', value: 240000, access: 'Immediate', earmark: 'emergency' },
    { id: 'a2', type: 'FD / RD', label: 'FDs', value: 150000, access: 'Immediate', earmark: 'emergency' },
    { id: 'a3', type: 'EPF', label: 'EPF', value: 950000, access: 'At retirement', earmark: 'ret' },
    { id: 'a4', type: 'NPS', label: 'NPS', value: 210000, access: 'At retirement', earmark: 'ret' },
    { id: 'a5', type: 'PPF', label: 'PPF', value: 420000, access: 'Lock-in period', earmark: 'g1' },
    { id: 'a6', type: 'Mutual funds', label: 'MFs', value: 850000, access: 'Within a week', earmark: 'g2' },
    { id: 'a7', type: 'Shares', label: 'Shares', value: 180000, access: 'Within a week', earmark: 'unassigned' },
    { id: 'a8', type: 'Gold', label: 'Gold', value: 350000, access: 'Not for sale', earmark: 'excluded' }],
  goals: [
    { id: 'g1', name: 'Education', type: 'Education', cost: 2000000, year: 2039, inf: 8, priority: 'Essential' },
    { id: 'g2', name: 'Home', type: 'Home', cost: 2000000, year: 2033, inf: 6, priority: 'Important' },
    { id: 'g3', name: 'Japan', type: 'Travel', cost: 300000, year: 2029, inf: 6, priority: 'Nice to have' }],
  retirement: { age: 60, lifeExp: 85, expense: 50000, pension: 0, ongoing: 18000 },
  emergency: { months: 6, monthly: 8000 },
  a: { ret: 10, retPost: 7, inf: 6, eduInf: 8, healthInf: 9, epf: 8.25 },
};

// Reference values produced by the design prototype's calc() on that plan (year 2026).
const golden = {
  balance: 54166.66666666667, emTarget: 564000, emGap: 174000, emContrib: 8000,
  available: 46166.66666666667, required: 60646.189822197906, gapM: 14479.523155531235,
  corpus: 54386632.97409015, lastsTo: 85, netWorth: 2930000, forGoals: 2610000,
};
const goldenItems = {
  ret: { year: 2050, fv: 54386632.97409015, sip: 27503.386860892726, alloc: 27503.386860892726 },
  g1: { year: 2039, fv: 5439247.452328999, sip: 14242.025183887863, alloc: 14242.025183887863 },
  g2: { year: 2033, fv: 3007260.5179827213, sip: 10361.02406303186, alloc: 4421.254621886084 },
  g3: { year: 2029, fv: 357304.80000000005, sip: 8539.753714385459, alloc: 0 },
};

describe('a migrated v0.1 plan matches the prototype exactly (with one flat return rate)', () => {
  const migrated = toPlan(v1Sample)!;
  migrated.a.safe = migrated.a.ret; // the prototype used one rate for every horizon
  const c = calc(migrated, { year: 2026 });
  for (const [k, v] of Object.entries(golden)) {
    it(k, () => expect(c[k as keyof typeof golden] as number).toBeCloseTo(v, 4));
  }
  for (const [id, exp] of Object.entries(goldenItems)) {
    it('item ' + id, () => {
      const it = c.items.find(i => i.id === id)!;
      expect(it.year).toBe(exp.year);
      expect(it.fv).toBeCloseTo(exp.fv, 4);
      expect(it.sip).toBeCloseTo(exp.sip, 4);
      expect(it.alloc).toBeCloseTo(exp.alloc, 4);
    });
  }
});

describe('monthly investments, insurance, yearly and one-time items', () => {
  const Y = 2026;
  it('payroll deductions are not subtracted from the balance again', () => {
    const p = sample(Y);
    const c = calc(p, { year: Y });
    const paid = p.investments.filter(v => !v.payroll).reduce((t, v) => t + v.amt, 0);
    expect(c.invest).toBe(paid);
    expect(c.investPayroll).toBe(23000);
  });
  it('balance = income − spends − EMIs − investments − premiums ± yearly items', () => {
    const c = calc(sample(Y), { year: Y });
    const expected = 175000 - 82000 - 12000 - 15000 - (28000 / 12 + 1500) + (150000 - 260000) / 12;
    expect(c.balance).toBeCloseTo(expected, 6);
  });
  it('a monthly investment linked to a goal lowers what that goal still needs', () => {
    const p = sample(Y);
    const before = calc(p, { year: Y }).items.find(i => i.id === 'g1')!.sip;
    p.investments.push({ id: 'x', type: 'Mutual funds', label: 'SIP', amt: 5000, earmark: 'g1', payroll: false });
    expect(calc(p, { year: Y }).items.find(i => i.id === 'g1')!.sip).toBeLessThan(before);
  });
  it('one-time income counts toward its goal only if it arrives in time', () => {
    const p = sample(Y);
    const g1 = (q: typeof p) => calc(q, { year: Y }).items.find(i => i.id === 'g1')!.grown;
    const withIt = g1(p);
    p.oneTime[0].year = Y + 20; // after the goal date
    expect(g1(p)).toBeLessThan(withIt);
  });
  it('a one-time spend is funded like a goal', () => {
    const c = calc(sample(Y), { year: Y });
    const o = c.items.find(i => i.id === 'o2')!;
    expect(o.kind).toBe('oneTime');
    expect(o.fv).toBeCloseTo(400000 * 1.06 ** 2, 4);
  });
  it('insurance totals are split into health and life', () => {
    const c = calc(sample(Y), { year: Y });
    expect(c.healthCover).toBe(1500000);
    expect(c.employerHealth).toBe(500000);
    expect(c.lifeCover).toBe(10000000);
  });
});

describe('reference-driven rules (NCFM review)', () => {
  const Y = 2026;
  const one = (years: number) => {
    const p = blank(); p.household.you.age = 35;
    p.goals = [{ id: 'g', name: 'G', type: 'Other', cost: 1000000, year: Y + years, inf: 6, priority: 'Essential' }];
    return calc(p, { year: Y }).items.find(i => i.id === 'g')!;
  };
  it('#1 near goals use the safer rate, far goals the full rate, blended between', () => {
    expect(one(2).rate).toBeCloseTo(0.065, 10);
    expect(one(10).rate).toBeCloseTo(0.10, 10);
    expect(one(5).rate).toBeCloseTo(0.0825, 10);
  });
  it('#1 a near goal needs more each month than it would at the full rate', () => {
    const p = blank(); p.household.you.age = 35; p.a.safe = 10;
    p.goals = [{ id: 'g', name: 'G', type: 'Other', cost: 1000000, year: Y + 2, inf: 6, priority: 'Essential' }];
    const flat = calc(p, { year: Y }).items.find(i => i.id === 'g')!.sip;
    expect(one(2).sip).toBeGreaterThan(flat);
  });
  it('#2 an EMI that ends frees money for goals that are still short', () => {
    const p = sample(Y);
    const without = calc({ ...p, loans: p.loans.map(l => ({ ...l, endYear: '' as const })) }, { year: Y });
    const withEnd = calc(p, { year: Y });
    expect(withEnd.gapM).toBeLessThan(without.gapM);
    expect(withEnd.items.some(i => i.allocLater > 0)).toBe(true);
  });
  it('#3 surplus savings on one goal carry forward to a later goal', () => {
    const p = sample(Y);
    p.assets.push({ id: 'big', type: 'FD / RD', label: 'Big FD', value: 5000000, access: 'Immediate', earmark: 'g3' });
    const c = calc(p, { year: Y });
    const g3 = c.items.find(i => i.id === 'g3')!;
    expect(g3.moved).toBeGreaterThan(0);
    expect(c.items.some(i => i.carried > 0 && i.carriedFrom.includes(g3.name))).toBe(true);
    // Nothing is created from thin air: carried value equals what left g3, grown to each target's date.
    expect(g3.projected).toBeCloseTo(g3.grown - g3.moved, 4);
  });
  it('#2 extra monthly balance always reduces the gap, rupee for rupee, while one remains', () => {
    const p = sample(Y);
    const before = calc(p, { year: Y }).gapM;
    p.income[0].amt += 1000;
    const after = calc(p, { year: Y }).gapM;
    expect(before).toBeGreaterThan(1000);
    expect(before - after).toBeCloseTo(1000, 0);
  });
  it('#4 cutting wants reduces the gap', () => {
    const p = sample(Y);
    expect(calc(p, { year: Y, levers: { wantCut: 0.25 } }).gapM).toBeLessThan(calc(p, { year: Y }).gapM);
  });
  it('#4 the emergency target counts needs, not wants', () => {
    const c = calc(sample(Y), { year: Y });
    expect(c.monthCost).toBeCloseTo(c.needs + c.emi + c.premiums, 6);
    expect(c.wants).toBe(10000);
  });
  it('#10 a savings-plan maturity counts toward its linked goal', () => {
    const p = sample(Y);
    const before = calc(p, { year: Y }).items.find(i => i.id === 'g1')!.grown;
    p.insurance.push({ id: 'sp', type: 'Life (savings plan)', label: 'Endowment', cover: 500000, premium: 20000, freq: 'Yearly', maturity: 700000, maturityYear: Y + 8, earmark: 'g1' });
    expect(calc(p, { year: Y }).items.find(i => i.id === 'g1')!.grown).toBeGreaterThan(before);
  });
  it('#12a the current mix adds up to everything you have', () => {
    const c = calc(sample(Y), { year: Y });
    expect([...c.mix.values()].reduce((a, b) => a + b, 0)).toBe(c.assetsTotal);
  });
});

describe('findings and options', () => {
  const Y = 2026;
  it('lists missing health insurance as a fact', () => {
    const p = sample(Y); p.insurance = p.insurance.filter(x => x.type !== 'Health');
    expect(findings(p, calc(p, { year: Y })).some(f => f.title === 'No health insurance entered')).toBe(true);
  });
  it('every option reduces the monthly gap, largest first', () => {
    const p = sample(Y);
    const c = calc(p, { year: Y });
    expect(c.gapM).toBeGreaterThan(0);
    const o = options(p, c);
    expect(o.length).toBeGreaterThan(0);
    for (const x of o) expect(x.gap).toBeLessThan(c.gapM);
    for (let i = 1; i < o.length; i++) expect(o[i - 1].saves).toBeGreaterThanOrEqual(o[i].saves);
  });
  it('no options when there is no gap', () => {
    const p = sample(Y); p.income[0].amt = 1000000;
    const c = calc(p, { year: Y });
    expect(c.gapM).toBe(0);
    expect(options(p, c)).toEqual([]);
  });
});

describe('edge cases', () => {
  it('blank plan does not produce NaN', () => {
    const c = calc(blank(), { year: 2026 });
    for (const v of [c.balance, c.required, c.available, c.corpus, c.netWorth, c.lumpToday]) expect(Number.isFinite(v)).toBe(true);
  });
  it('negative balance leaves nothing available', () => {
    const p = sample(2026); p.income = [{ id: 'i', label: 'x', amt: 10000 }];
    const c = calc(p, { year: 2026 });
    expect(c.balance).toBeLessThan(0);
    expect(c.available).toBe(0);
    expect(c.ordered.every(i => i.alloc === 0)).toBe(true);
  });
  it('flags a user already past retirement age', () => {
    const p = sample(2026); p.household.you.age = 62;
    expect(calc(p, { year: 2026 }).alreadyRetired).toBe(true);
  });
  it('sipFactor of zero years is zero', () => expect(sipFactor(0, 0.1)).toBe(0));
});
