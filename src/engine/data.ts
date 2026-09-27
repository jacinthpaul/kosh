import type { Access, AssetType, Freq, GoalType, Plan, PolicyType, Priority } from './types';

export const CALC_VERSION = 'v0.2';
export const SCHEMA_VERSION = 2 as const;

/** Default yearly growth (%) by type, before tax. Users can change these. */
export const DEFAULT_RATES: Record<AssetType, number> = {
  'Savings account': 3, 'FD / RD': 6.5, 'EPF': 8.25, 'PPF': 7.1, 'NPS': 9,
  'Mutual funds': 11, 'Shares': 11, 'Crypto': 8, 'Gold': 7, 'Property': 5, 'Other': 6,
};
/** Types whose growth follows market returns (affected by return stress). */
export const MARKET: Partial<Record<AssetType, true>> = { 'NPS': true, 'Mutual funds': true, 'Shares': true, 'Crypto': true };
export const ASSET_TYPES = Object.keys(DEFAULT_RATES) as AssetType[];
/** Types that make sense as a monthly investment. */
export const INVEST_TYPES: AssetType[] = ['Mutual funds', 'Shares', 'Crypto', 'EPF', 'NPS', 'PPF', 'FD / RD', 'Gold', 'Other'];
export const TYPE_LABEL: Partial<Record<AssetType, string>> = { 'Mutual funds': 'Mutual funds / SIP', 'Shares': 'Stocks / shares' };
export const ACCESS: Access[] = ['Immediate', 'Within a week', 'Lock-in period', 'At retirement', 'Not for sale'];
export const GOAL_TYPES: GoalType[] = ['Education', 'Home', 'Car', 'Travel', 'Parents’ care', 'Wedding', 'Other'];
export const PRIS: Priority[] = ['Essential', 'Important', 'Nice to have'];
export const RANK: Record<Priority, number> = { 'Essential': 0, 'Important': 1, 'Nice to have': 2 };
export const POLICY_TYPES: PolicyType[] = ['Health', 'Term life', 'Life (savings plan)'];
export const FREQS: Freq[] = ['Monthly', 'Yearly'];

export const newId = (prefix: string) =>
  prefix + '-' + (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));

export const defaultInflation = (type: GoalType, a: Plan['a']) =>
  type === 'Education' ? a.eduInf : type === 'Parents’ care' ? a.healthInf : a.inf;

/** Sample family. Years are relative to `year` so the sample never goes stale. */
export function sample(year: number): Plan {
  return {
    schemaVersion: SCHEMA_VERSION,
    sample: true,
    household: { family: 'Rao', you: { name: 'Arjun', age: 36 }, hasPartner: true, partner: { name: 'Meera', age: 34 }, kids: [{ id: 'k1', name: 'Anaya', age: 5 }], parents: 1, pattern: 'Steady' },
    retirement: { age: 60, lifeExp: 85, expense: 50000, pension: 0 },
    goals: [
      { id: 'g1', name: 'Anaya’s higher education', type: 'Education', cost: 2000000, year: year + 13, inf: 8, priority: 'Essential' },
      { id: 'g2', name: 'Home down payment', type: 'Home', cost: 2000000, year: year + 7, inf: 6, priority: 'Important' },
      { id: 'g3', name: 'Family trip to Japan', type: 'Travel', cost: 300000, year: year + 3, inf: 6, priority: 'Nice to have' },
    ],
    income: [
      { id: 'i1', label: 'Arjun’s take-home salary', amt: 110000 },
      { id: 'i2', label: 'Meera’s take-home salary', amt: 65000 },
    ],
    essentials: [
      { id: 'e1', label: 'Rent and maintenance', amt: 32000 },
      { id: 'e2', label: 'Groceries and household', amt: 18000 },
      { id: 'e3', label: 'Utilities, phone, internet', amt: 6000 },
      { id: 'e4', label: 'Transport and fuel', amt: 7000 },
      { id: 'e5', label: 'Mother’s care and medicines', amt: 9000 },
      { id: 'e6', label: 'Other regular spending', amt: 10000 },
    ],
    loans: [{ id: 'l1', label: 'Car loan', emi: 12000, out: 420000, rate: 9.2 }],
    investments: [
      { id: 'v1', type: 'EPF', label: 'EPF (employee + employer)', amt: 18000, earmark: 'ret', payroll: true },
      { id: 'v2', type: 'NPS', label: 'Meera’s NPS', amt: 5000, earmark: 'ret', payroll: true },
      { id: 'v3', type: 'Mutual funds', label: 'Equity SIP', amt: 10000, earmark: 'g2', payroll: false },
      { id: 'v4', type: 'Shares', label: 'Monthly stock buying', amt: 3000, earmark: 'unassigned', payroll: false },
      { id: 'v5', type: 'Crypto', label: 'Crypto', amt: 2000, earmark: 'unassigned', payroll: false },
    ],
    insurance: [
      { id: 'p1', type: 'Health', label: 'Family floater', cover: 1000000, premium: 28000, freq: 'Yearly' },
      { id: 'p2', type: 'Term life', label: 'Arjun’s term plan', cover: 10000000, premium: 1500, freq: 'Monthly' },
    ],
    annualIncome: [{ id: 'y1', label: 'Annual bonus', amt: 150000 }],
    annual: [
      { id: 'n1', label: 'School fees', amt: 120000 },
      { id: 'n3', label: 'Festivals and gifts', amt: 60000 },
      { id: 'n4', label: 'Family travel', amt: 80000 },
    ],
    oneTime: [
      { id: 'o1', kind: 'income', label: 'PPF maturity', amt: 600000, year: year + 5, earmark: 'g1' },
      { id: 'o2', kind: 'spend', label: 'Home renovation', amt: 400000, year: year + 2, earmark: '' },
    ],
    assets: [
      { id: 'a1', type: 'Savings account', label: 'Joint savings account', value: 240000, access: 'Immediate', earmark: 'emergency' },
      { id: 'a2', type: 'FD / RD', label: 'Fixed deposits', value: 150000, access: 'Immediate', earmark: 'emergency' },
      { id: 'a3', type: 'EPF', label: 'Arjun’s EPF', value: 950000, access: 'At retirement', earmark: 'ret' },
      { id: 'a4', type: 'NPS', label: 'Meera’s NPS', value: 210000, access: 'At retirement', earmark: 'ret' },
      { id: 'a6', type: 'Mutual funds', label: 'Equity mutual funds', value: 850000, access: 'Within a week', earmark: 'g2' },
      { id: 'a7', type: 'Shares', label: 'Direct shares', value: 180000, access: 'Within a week', earmark: 'unassigned' },
      { id: 'a8', type: 'Gold', label: 'Gold jewellery', value: 350000, access: 'Not for sale', earmark: 'excluded' },
    ],
    emergency: { months: 6, monthly: 5000 },
    a: { ret: 10, retPost: 7, inf: 6, eduInf: 8, healthInf: 9 },
    rates: { ...DEFAULT_RATES },
  };
}

export function blank(): Plan {
  return {
    schemaVersion: SCHEMA_VERSION,
    sample: false,
    household: { family: '', you: { name: '', age: '' }, hasPartner: false, partner: { name: '', age: '' }, kids: [], parents: 0, pattern: 'Steady' },
    retirement: { age: 60, lifeExp: 85, expense: 0, pension: 0 },
    goals: [],
    income: ['Your take-home salary', 'Other income (rent, interest)'].map(label => ({ id: newId('i'), label, amt: 0 })),
    essentials: ['Rent or home maintenance', 'Groceries and household', 'Utilities, phone, internet', 'Transport and fuel', 'Other regular spending']
      .map(label => ({ id: newId('e'), label, amt: 0 })),
    loans: [],
    investments: [],
    insurance: [],
    annualIncome: [],
    annual: ['School fees', 'Festivals and gifts'].map(label => ({ id: newId('n'), label, amt: 0 })),
    oneTime: [],
    assets: [],
    emergency: { months: 6, monthly: 0 },
    a: { ret: 10, retPost: 7, inf: 6, eduInf: 8, healthInf: 9 },
    rates: { ...DEFAULT_RATES },
  };
}
