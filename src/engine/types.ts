export type AssetType =
  | 'Savings account' | 'FD / RD' | 'EPF' | 'PPF' | 'NPS'
  | 'Mutual funds' | 'Shares' | 'Gold' | 'Property' | 'Other';
export type Access = 'Immediate' | 'Within a week' | 'Lock-in period' | 'At retirement' | 'Not for sale';
export type GoalType = 'Education' | 'Home' | 'Car' | 'Travel' | 'Parents’ care' | 'Wedding' | 'Other';
export type Priority = 'Essential' | 'Important' | 'Nice to have';
/** 'emergency' | 'ret' | a goal id | 'unassigned' | 'excluded' */
export type Earmark = string;

/** Numeric fields may hold '' while the user is typing. */
export type Num = number | '';

export interface Person { name: string; age: Num }
export interface Kid { id: string; name: string; age: Num }
export interface Row { id: string; label: string; amt: number }
export interface Loan { id: string; label: string; emi: number; out: number; rate: Num }
export interface Asset { id: string; type: AssetType; label: string; value: number; access: Access; earmark: Earmark }
export interface Goal { id: string; name: string; type: GoalType; cost: number; year: Num; inf: Num; priority: Priority }

export interface Assumptions { ret: Num; retPost: Num; inf: Num; eduInf: Num; healthInf: Num; epf: Num }

export interface Plan {
  schemaVersion: 1;
  sample: boolean;
  household: { family: string; you: Person; hasPartner: boolean; partner: Person; kids: Kid[]; parents: number; pattern: 'Steady' | 'Variable' };
  income: { you: number; partner: number; other: number };
  essentials: Row[];
  loans: Loan[];
  annual: Row[];
  assets: Asset[];
  goals: Goal[];
  retirement: { age: Num; lifeExp: Num; expense: number; pension: number; ongoing: number };
  emergency: { months: number; monthly: number };
  a: Assumptions;
}

export interface Item {
  id: string; name: string; type: string; priority: Priority;
  year: number; n: number; today: number | null;
  fv: number; grown: number; gap: number; sip: number; factor: number;
  alloc: number; projected: number; pct: number; short: number; funded: boolean;
}

export interface Stress { dRet?: number; dInf?: number; incomeCut?: number; retShift?: number }
