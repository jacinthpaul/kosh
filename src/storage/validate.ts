import { ACCESS, ASSET_TYPES, GOAL_TYPES, PRIS, SCHEMA_VERSION, blank, newId } from '../engine/data';
import type { Access, AssetType, GoalType, Num, Plan, Priority } from '../engine/types';

/*
 * Rebuilds a Plan from untrusted JSON (backup file or localStorage).
 * Unknown fields are dropped and wrong types fall back to defaults, so a malformed
 * or hand-edited file can never put the app into a broken state.
 */

type U = Record<string, unknown>;
const obj = (v: unknown): U => (v && typeof v === 'object' && !Array.isArray(v) ? (v as U) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');
const money = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 1e13) : 0; };
const num = (v: unknown): Num => { if (v === '' || v == null) return ''; const n = Number(v); return Number.isFinite(n) ? n : ''; };
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const id = (v: unknown, prefix: string) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : newId(prefix));

export function toPlan(raw: unknown): Plan | null {
  const r = obj(raw);
  if (!('household' in r) && !('income' in r)) return null;
  const d = blank();
  const h = obj(r.household), you = obj(h.you), partner = obj(h.partner);
  const inc = obj(r.income), ret = obj(r.retirement), em = obj(r.emergency), a = obj(r.a);

  const goals = arr(r.goals).slice(0, 50).map(x => {
    const g = obj(x);
    return {
      id: id(g.id, 'g'), name: str(g.name), type: oneOf<GoalType>(g.type, GOAL_TYPES, 'Other'),
      cost: money(g.cost), year: num(g.year), inf: num(g.inf), priority: oneOf<Priority>(g.priority, PRIS, 'Important'),
    };
  });
  const goalIds = new Set(goals.map(g => g.id));
  const validEarmark = (e: unknown) =>
    typeof e === 'string' && (['emergency', 'ret', 'unassigned', 'excluded'].includes(e) || goalIds.has(e)) ? e : 'unassigned';

  const rows = (v: unknown, prefix: string) => arr(v).slice(0, 100).map(x => { const o = obj(x); return { id: id(o.id, prefix), label: str(o.label), amt: money(o.amt) }; });

  return {
    schemaVersion: SCHEMA_VERSION,
    sample: false,
    household: {
      family: str(h.family), you: { name: str(you.name), age: num(you.age) },
      hasPartner: h.hasPartner === true, partner: { name: str(partner.name), age: num(partner.age) },
      kids: arr(h.kids).slice(0, 20).map(x => { const k = obj(x); return { id: id(k.id, 'k'), name: str(k.name), age: num(k.age) }; }),
      parents: [0, 1, 2].includes(Number(h.parents)) ? Number(h.parents) : 0,
      pattern: h.pattern === 'Variable' ? 'Variable' : 'Steady',
    },
    income: { you: money(inc.you), partner: money(inc.partner), other: money(inc.other) },
    essentials: 'essentials' in r ? rows(r.essentials, 'e') : d.essentials,
    annual: 'annual' in r ? rows(r.annual, 'n') : d.annual,
    loans: arr(r.loans).slice(0, 50).map(x => { const l = obj(x); return { id: id(l.id, 'l'), label: str(l.label), emi: money(l.emi), out: money(l.out), rate: num(l.rate) }; }),
    assets: arr(r.assets).slice(0, 100).map(x => {
      const s = obj(x);
      return {
        id: id(s.id, 'a'), type: oneOf<AssetType>(s.type, ASSET_TYPES, 'Other'), label: str(s.label), value: money(s.value),
        access: oneOf<Access>(s.access, ACCESS, 'Within a week'), earmark: validEarmark(s.earmark),
      };
    }),
    goals,
    retirement: {
      age: 'age' in ret ? num(ret.age) : d.retirement.age, lifeExp: 'lifeExp' in ret ? num(ret.lifeExp) : d.retirement.lifeExp,
      expense: money(ret.expense), pension: money(ret.pension), ongoing: money(ret.ongoing),
    },
    emergency: { months: [3, 6, 9, 12].includes(Number(em.months)) ? Number(em.months) : 6, monthly: money(em.monthly) },
    a: {
      ret: 'ret' in a ? num(a.ret) : d.a.ret, retPost: 'retPost' in a ? num(a.retPost) : d.a.retPost,
      inf: 'inf' in a ? num(a.inf) : d.a.inf, eduInf: 'eduInf' in a ? num(a.eduInf) : d.a.eduInf,
      healthInf: 'healthInf' in a ? num(a.healthInf) : d.a.healthInf, epf: 'epf' in a ? num(a.epf) : d.a.epf,
    },
  };
}
