import { describe, expect, it } from 'vitest';
import { calc } from '../engine/calc';
import { blank, sample } from '../engine/data';
import { buildReport } from './model';

const Y = 2026;
const now = new Date(2026, 8, 27, 19, 5);
const text = (o: unknown) => JSON.stringify(o);

describe('PDF report content', () => {
  const p = sample(Y);
  const c = calc(p, { year: Y });

  it('carries the generation date and calculation version', () => {
    const r = buildReport(p, c, { now, names: true });
    expect(r.generated).toContain('27 September 2026');
    expect(r.calcVersion).toMatch(/^v\d/);
    expect(r.title).toBe('The Rao family’s wealth plan');
  });

  it('hides every name when names are off, with natural wording', () => {
    const t = text(buildReport(p, c, { now, names: false }));
    for (const n of ['Arjun', 'Meera', 'Anaya', 'Rao']) expect(t).not.toContain(n);
    expect(t).not.toMatch(/You[’']s/);
    expect(t).toContain('Your EPF');
  });

  it('has no arrows (not in the PDF fonts) and no broken numbers', () => {
    const t = text(buildReport(p, c, { now, names: true }));
    expect(t).not.toContain('→');
    expect(t).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('works for an empty plan', () => {
    const b = blank();
    const t = text(buildReport(b, calc(b, { year: Y }), { now, names: true }));
    expect(t).not.toMatch(/NaN|Infinity/);
  });

  it('explains every line of the monthly balance', () => {
    const r = buildReport(p, c, { now, names: true });
    for (const row of r.cash) expect(row.explain.length).toBeGreaterThan(20);
  });
});
