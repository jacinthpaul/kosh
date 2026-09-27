import { describe, expect, it } from 'vitest';
import { calc, sipFactor } from './calc';
import { blank, sample } from './data';

// Reference values produced by the design prototype's calc() on its sample family (year 2026).
const golden = {
  income: 175000, surplus: 54166.66666666667, emTarget: 564000, emGap: 174000, emContrib: 8000,
  available: 46166.66666666667, required: 60646.189822197906, gapM: 14479.523155531235,
  corpus: 54386632.97409015, lastsTo: 85, netWorth: 2930000, forGoals: 2610000,
};
const goldenItems = {
  ret: { year: 2050, fv: 54386632.97409015, sip: 27503.386860892726, alloc: 27503.386860892726 },
  g1: { year: 2039, fv: 5439247.452328999, sip: 14242.025183887863, alloc: 14242.025183887863 },
  g2: { year: 2033, fv: 3007260.5179827213, sip: 10361.02406303186, alloc: 4421.254621886084 },
  g3: { year: 2029, fv: 357304.80000000005, sip: 8539.753714385459, alloc: 0 },
};

describe('calc matches the prototype on the sample family', () => {
  const c = calc(sample(2026), { year: 2026 });
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

describe('edge cases', () => {
  it('blank plan does not produce NaN', () => {
    const c = calc(blank(), { year: 2026 });
    for (const v of [c.surplus, c.required, c.available, c.corpus, c.netWorth]) expect(Number.isFinite(v)).toBe(true);
  });
  it('negative surplus leaves nothing available', () => {
    const p = sample(2026); p.income = { you: 10000, partner: 0, other: 0 };
    const c = calc(p, { year: 2026 });
    expect(c.surplus).toBeLessThan(0);
    expect(c.available).toBe(0);
    expect(c.ordered.every(i => i.alloc === 0)).toBe(true);
  });
  it('flags a user already past retirement age', () => {
    const p = sample(2026); p.household.you.age = 62;
    expect(calc(p, { year: 2026 }).alreadyRetired).toBe(true);
  });
  it('goal due this year is treated as one year away', () => {
    const p = sample(2026); p.goals[2].year = 2026;
    expect(calc(p, { year: 2026 }).items.find(i => i.id === 'g3')!.n).toBe(1);
  });
  it('sipFactor of zero years is zero', () => expect(sipFactor(0, 0.1)).toBe(0));
});
