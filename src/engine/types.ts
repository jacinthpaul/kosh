export type AssetType =
  | 'Savings account' | 'FD / RD' | 'EPF' | 'PPF' | 'NPS'
  | 'Mutual funds' | 'Shares' | 'Crypto' | 'Gold' | 'Property' | 'Other';
export type Access = 'Immediate' | 'Within a week' | 'Lock-in period' | 'At retirement' | 'Not for sale';
export type GoalType = 'Education' | 'Home' | 'Car' | 'Travel' | 'Parents’ care' | 'Wedding' | 'Other';
export type Priority = 'Essential' | 'Important' | 'Nice to have';
export type PolicyType = 'Health' | 'Term life' | 'Life (savings plan)';
export type Freq = 'Monthly' | 'Yearly';
/** 'emergency' | 'ret' | a goal id | 'unassigned' | 'excluded' */
export type Earmark = string;

/** Numeric fields may hold '' while the user is typing. */
export type Num = number | '';

export interface Person { name: string; age: Num }
export interface Kid { id: string; name: string; age: Num }
export interface Row { id: string; label: string; amt: number; /** Regular spends only: a want rather than a need. */ want?: boolean }
export interface Loan { id: string; label: string; emi: number; out: number; rate: Num; /** Year of the last EMI. Optional. */ endYear?: Num }
export interface Asset { id: string; type: AssetType; label: string; value: number; access: Access; earmark: Earmark }
/** An amount invested every month (SIP, EPF, NPS, stocks, crypto…). */
export interface Investment {
  id: string; type: AssetType; label: string; amt: number; earmark: Earmark;
  /** Already deducted before take-home pay (e.g. EPF), so not subtracted from the balance again. */
  payroll: boolean;
}
export interface Policy {
  id: string; type: PolicyType; label: string; cover: number; premium: number; freq: Freq;
  /** Life policies: whose life is covered. */
  person?: 'you' | 'partner' | '';
  /** Health policies: provided by an employer. */
  employer?: boolean;
  /** Savings plans: amount paid out at maturity, when, and what it's for. */
  maturity?: number; maturityYear?: Num; earmark?: Earmark;
}
/** A one-off amount in a given year. Income can be earmarked; spends are funded like goals. */
export interface OneTime { id: string; kind: 'income' | 'spend'; label: string; amt: number; year: Num; earmark: Earmark }
export interface Goal { id: string; name: string; type: GoalType; cost: number; year: Num; inf: Num; priority: Priority }

export interface Assumptions {
  /** Return on new monthly amounts for goals 7+ years away. */
  ret: Num;
  /** Return on new monthly amounts for goals up to 3 years away (safer, debt-like). Blends in between. */
  safe: Num;
  retPost: Num; inf: Num; eduInf: Num; healthInf: Num;
}

export interface Plan {
  schemaVersion: 2;
  sample: boolean;
  household: { family: string; you: Person; hasPartner: boolean; partner: Person; kids: Kid[]; parents: number; pattern: 'Steady' | 'Variable' };
  retirement: { age: Num; lifeExp: Num; expense: number; pension: number };
  goals: Goal[];
  /** Monthly */
  income: Row[];
  /** Expected yearly increase in income (%). Optional; used by options. */
  incomeGrowth: Num;
  essentials: Row[];
  loans: Loan[];
  investments: Investment[];
  insurance: Policy[];
  /** Yearly */
  annualIncome: Row[];
  annual: Row[];
  oneTime: OneTime[];
  assets: Asset[];
  emergency: { months: number; monthly: number };
  a: Assumptions;
  /** Yearly growth (%) of savings and investments, by type. */
  rates: Record<AssetType, Num>;
}

export interface Item {
  id: string; name: string; type: string; priority: Priority; kind: 'ret' | 'goal' | 'oneTime';
  year: number; n: number; today: number | null;
  fv: number; grown: number; gap: number; sip: number; factor: number; paused: boolean;
  alloc: number; projected: number; pct: number; short: number; funded: boolean;
  /** Yearly return assumed for new monthly amounts toward this item (depends on how far away it is). */
  rate: number;
  /** Value arriving from other items' surplus savings, at this item's date. */
  carried: number; carriedFrom: string[];
  /** Surplus (today's linked value at this item's date) passed on to later items. */
  moved: number;
  /** Monthly amount from EMIs that end before this item's date, and its value by then. */
  allocLater: number; laterValue: number;
}

export interface Stress { dRet?: number; dInf?: number; incomeCut?: number; retShift?: number }

/** Changes explored on the results screen. Never saved into the plan. */
export interface Levers {
  retDelta?: number;
  delay?: Record<string, number>;
  scale?: Record<string, number>;
  pauseNice?: boolean;
  /** Yearly % increase in the new monthly amounts. */
  stepUp?: number;
  /** Fraction cut from regular monthly spends. */
  spendCut?: number;
  /** Fraction cut from spends marked as wants. */
  wantCut?: number;
  /** Treat unassigned savings and investments as earmarked to this item. */
  assignUnassigned?: string;
}
