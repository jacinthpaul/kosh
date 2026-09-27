import { describe, expect, it } from 'vitest';
import { sample } from '../engine/data';
import { buildBackup, decryptBackup, parseBackup } from './storage';
import { toPlan } from './validate';

describe('backup file', () => {
  const plan = sample(2026);

  it('plain backup round-trips', async () => {
    const r = parseBackup(JSON.stringify(await buildBackup(plan, '')));
    expect(r.kind).toBe('plan');
    if (r.kind === 'plan') expect(r.plan.goals.map(g => g.name)).toEqual(plan.goals.map(g => g.name));
  });

  it('encrypted backup round-trips and hides the contents', async () => {
    const text = JSON.stringify(await buildBackup(plan, 'correct horse'));
    expect(text).not.toContain('Arjun');
    const r = parseBackup(text);
    expect(r.kind).toBe('encrypted');
    if (r.kind !== 'encrypted') return;
    const restored = await decryptBackup(r.file, 'correct horse');
    expect(restored?.income).toEqual(plan.income);
    await expect(decryptBackup(r.file, 'wrong')).rejects.toBeTruthy();
  });

  it('rejects files that are not Kosh backups', () => {
    expect(parseBackup('not json').kind).toBe('invalid');
    expect(parseBackup('{"hello":1}').kind).toBe('invalid');
  });
});

describe('toPlan sanitises untrusted input', () => {
  it('migrates a v0.1 plan: income object to rows, EPF contributions to a payroll investment', () => {
    const p = toPlan({ household: { hasPartner: true }, income: { you: 100000, partner: 50000, other: 0 }, retirement: { age: 60, ongoing: 12000 }, a: { epf: 8.1 } })!;
    expect(p.income.map(r => r.amt)).toEqual([100000, 50000]);
    expect(p.investments).toMatchObject([{ type: 'EPF', amt: 12000, earmark: 'ret', payroll: true }]);
    expect(p.rates.EPF).toBe(8.1);
  });

  it('drops bad values and dangling earmarks', () => {
    const p = toPlan({
      household: { you: { name: 42, age: 'abc' }, parents: 9 },
      income: [{ id: 'i1', label: 'Salary', amt: -5 }, { id: 'i2', label: 'Rent', amt: '1000' }],
      assets: [{ id: 'x', type: 'Bitcoin', value: 'NaN', earmark: 'g-missing' }],
      goals: [{ id: '<script>', priority: 'Urgent' }],
    })!;
    expect(p.household.you.name).toBe('');
    expect(p.household.you.age).toBe('');
    expect(p.household.parents).toBe(0);
    expect(p.income[0].amt).toBe(0);
    expect(p.income[1].amt).toBe(1000);
    expect(p.assets[0].type).toBe('Other');
    expect(p.assets[0].value).toBe(0);
    expect(p.assets[0].earmark).toBe('unassigned');
    expect(p.goals[0].id).not.toBe('<script>');
    expect(p.goals[0].priority).toBe('Important');
  });
});
