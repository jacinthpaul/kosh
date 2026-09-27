import type { Access, AssetType, GoalType, Plan, Priority } from './types';

export const CALC_VERSION = 'v0.1';
export const SCHEMA_VERSION = 1 as const;

/** Assumed yearly growth (%) of existing assets, by type. Before tax. */
export const RATES: Record<AssetType, number> = {
  'Savings account': 3, 'FD / RD': 6.5, 'EPF': 8.25, 'PPF': 7.1, 'NPS': 9,
  'Mutual funds': 11, 'Shares': 11, 'Gold': 7, 'Property': 5, 'Other': 6,
};
/** Types whose growth follows market returns (affected by return stress). */
export const MARKET: Partial<Record<AssetType, true>> = { 'NPS': true, 'Mutual funds': true, 'Shares': true };
export const ASSET_TYPES = Object.keys(RATES) as AssetType[];
export const ACCESS: Access[] = ['Immediate', 'Within a week', 'Lock-in period', 'At retirement', 'Not for sale'];
export const GOAL_TYPES: GoalType[] = ['Education', 'Home', 'Car', 'Travel', 'Parents’ care', 'Wedding', 'Other'];
export const PRIS: Priority[] = ['Essential', 'Important', 'Nice to have'];
export const RANK: Record<Priority, number> = { 'Essential': 0, 'Important': 1, 'Nice to have': 2 };

export const newId = (prefix: string) =>
  prefix + '-' + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

export const defaultInflation = (type: GoalType, a: Plan['a']) =>
  type === 'Education' ? a.eduInf : type === 'Parents’ care' ? a.healthInf : a.inf;

/** Sample family. Goal years are relative to `year` so the sample never goes stale. */
export function sample(year: number): Plan {
  return {
    schemaVersion: SCHEMA_VERSION,
    sample: true,
    household: { family: 'Rao', you: { name: 'Arjun', age: 36 }, hasPartner: true, partner: { name: 'Meera', age: 34 }, kids: [{ id: 'k1', name: 'Anaya', age: 5 }], parents: 1, pattern: 'Steady' },
    income: { you: 110000, partner: 65000, other: 0 },
    essentials: [
      { id: 'e1', label: 'Rent and maintenance', amt: 32000 },
      { id: 'e2', label: 'Groceries and household', amt: 18000 },
      { id: 'e3', label: 'Utilities, phone, internet', amt: 6000 },
      { id: 'e4', label: 'Transport and fuel', amt: 7000 },
      { id: 'e5', label: 'Mother’s care and medicines', amt: 9000 },
      { id: 'e6', label: 'Other regular spending', amt: 10000 },
    ],
    loans: [{ id: 'l1', label: 'Car loan', emi: 12000, out: 420000, rate: 9.2 }],
    annual: [
      { id: 'n1', label: 'School fees', amt: 120000 },
      { id: 'n2', label: 'Insurance premiums', amt: 62000 },
      { id: 'n3', label: 'Festivals and gifts', amt: 60000 },
      { id: 'n4', label: 'Family travel', amt: 80000 },
    ],
    assets: [
      { id: 'a1', type: 'Savings account', label: 'Joint savings account', value: 240000, access: 'Immediate', earmark: 'emergency' },
      { id: 'a2', type: 'FD / RD', label: 'Fixed deposits', value: 150000, access: 'Immediate', earmark: 'emergency' },
      { id: 'a3', type: 'EPF', label: 'Arjun’s EPF', value: 950000, access: 'At retirement', earmark: 'ret' },
      { id: 'a4', type: 'NPS', label: 'Meera’s NPS', value: 210000, access: 'At retirement', earmark: 'ret' },
      { id: 'a5', type: 'PPF', label: 'PPF account', value: 420000, access: 'Lock-in period', earmark: 'g1' },
      { id: 'a6', type: 'Mutual funds', label: 'Equity mutual funds', value: 850000, access: 'Within a week', earmark: 'g2' },
      { id: 'a7', type: 'Shares', label: 'Direct shares', value: 180000, access: 'Within a week', earmark: 'unassigned' },
      { id: 'a8', type: 'Gold', label: 'Gold jewellery', value: 350000, access: 'Not for sale', earmark: 'excluded' },
    ],
    goals: [
      { id: 'g1', name: 'Anaya’s higher education', type: 'Education', cost: 2000000, year: year + 13, inf: 8, priority: 'Essential' },
      { id: 'g2', name: 'Home down payment', type: 'Home', cost: 2000000, year: year + 7, inf: 6, priority: 'Important' },
      { id: 'g3', name: 'Family trip to Japan', type: 'Travel', cost: 300000, year: year + 3, inf: 6, priority: 'Nice to have' },
    ],
    retirement: { age: 60, lifeExp: 85, expense: 50000, pension: 0, ongoing: 18000 },
    emergency: { months: 6, monthly: 8000 },
    a: { ret: 10, retPost: 7, inf: 6, eduInf: 8, healthInf: 9, epf: 8.25 },
  };
}

export function blank(): Plan {
  return {
    schemaVersion: SCHEMA_VERSION,
    sample: false,
    household: { family: '', you: { name: '', age: '' }, hasPartner: false, partner: { name: '', age: '' }, kids: [], parents: 0, pattern: 'Steady' },
    income: { you: 0, partner: 0, other: 0 },
    essentials: ['Rent or home maintenance', 'Groceries and household', 'Utilities, phone, internet', 'Transport and fuel', 'Other regular spending']
      .map(label => ({ id: newId('e'), label, amt: 0 })),
    loans: [],
    annual: ['School fees', 'Insurance premiums', 'Festivals and gifts'].map(label => ({ id: newId('n'), label, amt: 0 })),
    assets: [],
    goals: [],
    retirement: { age: 60, lifeExp: 85, expense: 0, pension: 0, ongoing: 0 },
    emergency: { months: 6, monthly: 0 },
    a: { ret: 10, retPost: 7, inf: 6, eduInf: 8, healthInf: 9, epf: 8.25 },
  };
}
