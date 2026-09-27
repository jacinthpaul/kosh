import type { ReactNode } from 'react';
import { premiumMonthly, type CalcResult } from './engine/calc';
import { ACCESS, ASSET_TYPES, FREQS, GOAL_TYPES, INVEST_TYPES, POLICY_TYPES, PRIS, TYPE_LABEL, defaultInflation, newId } from './engine/data';
import { N, cmp, inr } from './engine/format';
import type { Access, Asset, AssetType, Freq, GoalType, Item, Plan, PolicyType, Priority, Row } from './engine/types';
import { CodeKey, Field, MoneyInput, NumInput, PriorityTag, Segmented, Select, TextInput } from './ui';

export interface StepProps { plan: Plan; update: (fn: (p: Plan) => void) => void; c: CalcResult }

const typeOpts = (list: AssetType[]) => list.map(v => ({ v, l: TYPE_LABEL[v] ?? v }));
const goalOpts = (plan: Plan) => [{ v: 'ret', l: 'Retirement' }].concat(plan.goals.map(g => ({ v: g.id, l: g.name || 'Untitled goal' })));

function Remove({ onClick }: { onClick: () => void }) {
  return <button className="btn-remove" onClick={onClick}>Remove</button>;
}

/** Editable list of label + amount rows. */
function RowList({ rows, set, addLabel, amtLabel, placeholder, note }: {
  rows: Row[]; set: (fn: (rows: Row[]) => Row[]) => void; addLabel: string; amtLabel: string; placeholder: string; note?: (r: Row) => ReactNode;
}) {
  return (
    <>
      <div className="list">
        {rows.map(r => (
          <div className="lrow" key={r.id}>
            <div className="lrow-fields">
              <TextInput ariaLabel="Description" value={r.label} placeholder={placeholder} onChange={v => set(rs => rs.map(x => (x.id === r.id ? { ...x, label: v } : x)))} />
              <span>
                <MoneyInput ariaLabel={amtLabel + ' for ' + (r.label || 'this item')} value={r.amt} showWords={false} onChange={v => set(rs => rs.map(x => (x.id === r.id ? { ...x, amt: v } : x)))} />
                {note?.(r)}
              </span>
            </div>
            <Remove onClick={() => set(rs => rs.filter(x => x.id !== r.id))} />
          </div>
        ))}
      </div>
      <button className="btn-add" onClick={() => set(rs => [...rs, { id: newId('r'), label: '', amt: 0 }])}>{addLabel}</button>
    </>
  );
}

// ================= Step 1: You and your goals =================

function FutureStrip({ today, todayLabel, future, futureLabel, extra }: { today: number; todayLabel: string; future: number; futureLabel: string; extra?: { label: string; v: number } }) {
  return (
    <div className={'result' + (extra ? '' : ' two')}>
      <div className="rt"><small>{todayLabel}</small><b>{cmp(today)}</b></div>
      <div className="rf"><small>{futureLabel}</small><b>{cmp(future)}</b></div>
      {extra && <div className="rf"><small>{extra.label}</small><b>{cmp(extra.v)}</b></div>}
    </div>
  );
}

export function YouAndGoals({ plan, update, c }: StepProps) {
  const h = plan.household, R = plan.retirement;
  const itemById = Object.fromEntries(c.items.map(i => [i.id, i]));
  const Y = c.year;
  const presets: [string, GoalType, number, number, Priority][] = [
    ['Child’s education', 'Education', 2000000, Y + 12, 'Essential'], ['Home down payment', 'Home', 2500000, Y + 6, 'Important'],
    ['Car', 'Car', 800000, Y + 4, 'Nice to have'], ['Travel', 'Travel', 300000, Y + 2, 'Nice to have'],
    ['Parents’ care', 'Parents’ care', 600000, Y + 8, 'Important'], ['Wedding', 'Wedding', 1500000, Y + 10, 'Important'],
  ];
  return (
    <>
      <section className="card">
        <h3>About you</h3>
        <div className="fields">
          <Field label="Family name" hint="Optional"><TextInput value={h.family} placeholder="e.g. Rao" onChange={v => update(p => { p.household.family = v; })} /></Field>
          <Field label="Your first name" hint="Optional"><TextInput value={h.you.name} placeholder="e.g. Arjun" onChange={v => update(p => { p.household.you.name = v; })} /></Field>
          <Field label="Your age"><NumInput value={h.you.age} placeholder="e.g. 36" onChange={v => update(p => { p.household.you.age = v; })} /></Field>
        </div>
        <Field label="Do you have a partner or spouse?">
          <Segmented label="Partner" value={h.hasPartner} options={[{ v: true, l: 'Yes' }, { v: false, l: 'No' }]} onChange={v => update(p => { p.household.hasPartner = v; })} />
        </Field>
        {h.hasPartner && (
          <div className="fields">
            <Field label="Partner’s first name" hint="Optional"><TextInput value={h.partner.name} placeholder="e.g. Meera" onChange={v => update(p => { p.household.partner.name = v; })} /></Field>
            <Field label="Partner’s age"><NumInput value={h.partner.age} onChange={v => update(p => { p.household.partner.age = v; })} /></Field>
          </div>
        )}
        <div className="list">
          {h.kids.map((k, i) => (
            <div className="lrow" key={k.id}>
              <div className="lrow-fields">
                <TextInput ariaLabel={'Child ' + (i + 1) + ' name'} value={k.name} placeholder="Child’s name (optional)" onChange={v => update(p => { p.household.kids[i].name = v; })} />
                <NumInput ariaLabel={'Child ' + (i + 1) + ' age'} value={k.age} placeholder="Age" onChange={v => update(p => { p.household.kids[i].age = v; })} />
              </div>
              <Remove onClick={() => update(p => { p.household.kids.splice(i, 1); })} />
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.household.kids.push({ id: newId('k'), name: '', age: '' }); })}>+ Add a child</button>
        <Field label="Parents you support">
          <Segmented label="Parents supported" value={h.parents} options={[0, 1, 2].map(n => ({ v: n, l: String(n) }))} onChange={v => update(p => { p.household.parents = v; })} />
        </Field>
      </section>

      <CodeKey />

      <section className="card">
        <div className="card-title"><h3>Retirement</h3><PriorityTag p="Essential" /></div>
        {c.alreadyRetired && <div className="warn">Your age is at or above the retirement age, so retirement figures aren’t meaningful yet. Support for people already retired is coming later.</div>}
        <div className="fields">
          <Field label="Age you’d like to retire"><NumInput value={R.age} onChange={v => update(p => { p.retirement.age = v; })} /></Field>
          <Field label="Plan until age" hint="How long the money should last"><NumInput value={R.lifeExp} onChange={v => update(p => { p.retirement.lifeExp = v; })} /></Field>
          <Field label="Monthly spending in retirement" hint="In today’s prices"><MoneyInput value={R.expense} onChange={v => update(p => { p.retirement.expense = v; })} /></Field>
          <Field label="Pension or rent in retirement" hint="Monthly, today’s prices"><MoneyInput value={R.pension} onChange={v => update(p => { p.retirement.pension = v; })} /></Field>
        </div>
        <FutureStrip
          today={Math.max(0, R.expense - R.pension)} todayLabel="Monthly need today"
          future={c.E0 / 12} futureLabel={'Monthly need at ' + c.retAge}
          extra={{ label: 'Total needed at ' + c.retAge, v: c.corpus }} />
        <p className="hint">Retirement uses your age. Monthly contributions like EPF and NPS go in the next step.</p>
      </section>

      {plan.goals.map((g, i) => {
        const it = itemById[g.id];
        return (
          <section className="card" key={g.id}>
            <div className="item-head">
              <TextInput ariaLabel="Goal name" value={g.name} placeholder="Goal name" onChange={v => update(p => { p.goals[i].name = v; })} />
              <Remove onClick={() => update(p => {
                p.goals = p.goals.filter(x => x.id !== g.id);
                for (const list of [p.assets, p.investments, p.oneTime]) list.forEach(a => { if (a.earmark === g.id) a.earmark = 'unassigned'; });
              })} />
            </div>
            <div className="fields">
              <Field label="Type"><Select<GoalType> value={g.type} options={GOAL_TYPES} onChange={v => update(p => { p.goals[i].type = v; p.goals[i].inf = defaultInflation(v, p.a); })} /></Field>
              <Field label="Cost in today’s prices"><MoneyInput value={g.cost} onChange={v => update(p => { p.goals[i].cost = v; })} /></Field>
              <Field label="Target year"><NumInput value={g.year} onChange={v => update(p => { p.goals[i].year = v; })} /></Field>
              <Field label="Price rise"><NumInput decimals suffix="% a year" value={g.inf} onChange={v => update(p => { p.goals[i].inf = v; })} /></Field>
            </div>
            <Field label="Priority" hint="Sets the order goals are funded in">
              <Segmented label="Priority" value={g.priority} options={PRIS.map(v => ({ v, l: v }))} onChange={v => update(p => { p.goals[i].priority = v; })} />
            </Field>
            {it && <FutureStrip today={N(g.cost)} todayLabel="Cost today" future={it.fv} futureLabel={'Cost in ' + it.year} />}
          </section>
        );
      })}

      <section className="card card-muted">
        <h3>Add a goal</h3>
        <div className="presets">
          {presets.map(([label, type, cost, year, priority]) => (
            <button key={label} onClick={() => update(p => { p.goals.push({ id: newId('g'), name: label, type, cost, year, inf: defaultInflation(type, p.a), priority }); })}>+ {label}</button>
          ))}
        </div>
        <p className="hint">Preset costs and dates are placeholders. Change them to your own.</p>
      </section>
    </>
  );
}

// ================= Step 2: Monthly money =================

function BalanceCard({ c, withYearly }: { c: CalcResult; withYearly?: boolean }) {
  const line = (k: string, v: number, sign: '+' | '−') => v > 0 && <div className="kv"><span>{sign} {k}</span><span>{inr(v)}</span></div>;
  const b = withYearly ? c.balance : c.balanceM;
  return (
    <section className="card">
      <h3>{withYearly ? 'Balance each month, including yearly items' : 'Your monthly balance'}</h3>
      <div className="balance">
        {line('Income', c.incomeM, '+')}
        {line('Regular spends', c.ess, '−')}
        {line('Loan EMIs', c.emi, '−')}
        {line('Investments from take-home', c.invest, '−')}
        {line('Insurance premiums (monthly share)', c.premiums, '−')}
        {withYearly && line('Yearly income (monthly share)', c.incomeY / 12, '+')}
        {withYearly && line('Yearly spends (monthly share)', c.spendY / 12, '−')}
        <div className="kv sum"><span>Balance</span><span className={b < 0 ? '' : 't'} style={b < 0 ? { color: 'var(--danger)' } : undefined}>{inr(b)}</span></div>
      </div>
      {c.investPayroll > 0 && <p className="hint">{inr(c.investPayroll)} a month in EPF / NPS is deducted before take-home, so it isn’t subtracted again.</p>}
      <p className="hint">{withYearly ? 'This is what’s free each month for the emergency fund and goals.' : 'Yearly and one-time items come next.'}</p>
    </section>
  );
}

export function Monthly({ plan, update, c }: StepProps) {
  const h = plan.household;
  const goals = goalOpts(plan).concat([{ v: 'unassigned', l: 'Not linked to a goal' }]);
  return (
    <>
      <section className="card">
        <div className="card-title"><h3>Income</h3><span className="hint">Total <span className="t">{inr(c.incomeM)}</span></span></div>
        <RowList rows={plan.income} set={fn => update(p => { p.income = fn(p.income); })} addLabel="+ Add income" amtLabel="Monthly amount" placeholder="e.g. Take-home salary" />
        <Field label="How does income arrive?" hint={h.pattern === 'Variable' ? 'Business, freelance or commission income' : 'Salary or regular monthly income'}>
          <Segmented label="Income pattern" value={h.pattern} options={[{ v: 'Steady', l: 'Steady' }, { v: 'Variable', l: 'Variable' }]} onChange={v => update(p => { p.household.pattern = v; })} />
        </Field>
      </section>

      <section className="card">
        <div className="card-title"><h3>Regular spends</h3><span className="hint">Total <span className="t">{inr(c.ess)}</span></span></div>
        <RowList rows={plan.essentials} set={fn => update(p => { p.essentials = fn(p.essentials); })} addLabel="+ Add a spend" amtLabel="Monthly amount" placeholder="e.g. Groceries" />
      </section>

      <section className="card">
        <div className="card-title"><h3>Loan EMIs</h3><span className="hint">Total <span className="t">{inr(c.emi)}</span></span></div>
        <div className="list">
          {plan.loans.map((l, i) => (
            <div className="lrow" key={l.id}>
              <div className="lrow-fields">
                <TextInput ariaLabel="Loan name" value={l.label} placeholder="e.g. Car loan" onChange={v => update(p => { p.loans[i].label = v; })} />
                <MoneyInput ariaLabel={'EMI for ' + (l.label || 'this loan')} value={l.emi} showWords={false} onChange={v => update(p => { p.loans[i].emi = v; })} />
              </div>
              <Remove onClick={() => update(p => { p.loans = p.loans.filter(x => x.id !== l.id); })} />
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.loans.push({ id: newId('l'), label: '', emi: 0, out: 0, rate: '' }); })}>+ Add a loan EMI</button>
      </section>

      <section className="card">
        <div className="card-title"><h3>Monthly investments and savings</h3><span className="hint">Total <span className="t">{inr(c.invest + c.investPayroll)}</span></span></div>
        <p className="hint">SIPs, stocks, crypto, EPF, NPS, PPF, RDs: anything you put away every month. Link each one to the goal it’s for.</p>
        <div className="list">
          {plan.investments.map((v, i) => (
            <div className="item" key={v.id}>
              <div className="item-head"><b>{v.label || TYPE_LABEL[v.type] || v.type}</b><Remove onClick={() => update(p => { p.investments = p.investments.filter(x => x.id !== v.id); })} /></div>
              <div className="fields">
                <Field label="Type"><Select<AssetType> value={v.type} options={typeOpts(INVEST_TYPES)} onChange={t => update(p => { p.investments[i].type = t; p.investments[i].payroll = t === 'EPF'; })} /></Field>
                <Field label="Description"><TextInput value={v.label} placeholder="e.g. Index fund SIP" onChange={t => update(p => { p.investments[i].label = t; })} /></Field>
                <Field label="Monthly amount"><MoneyInput value={v.amt} onChange={t => update(p => { p.investments[i].amt = t; })} /></Field>
                <Field label="For which goal?"><Select value={v.earmark} options={goals} className={v.earmark === 'unassigned' ? 'unassigned' : ''} onChange={t => update(p => { p.investments[i].earmark = t; })} /></Field>
              </div>
              <label className="check"><input type="checkbox" checked={v.payroll} onChange={e => update(p => { p.investments[i].payroll = e.target.checked; })} />Deducted from salary before take-home</label>
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.investments.push({ id: newId('v'), type: 'Mutual funds', label: '', amt: 0, earmark: 'unassigned', payroll: false }); })}>+ Add a monthly investment</button>
      </section>

      <section className="card">
        <div className="card-title"><h3>Insurance</h3><span className="hint">Premiums <span className="t">{inr(c.premiums)}</span>/mo</span></div>
        <p className="hint">Health and life policies. Yearly premiums are spread across 12 months.</p>
        <div className="list">
          {plan.insurance.map((x, i) => (
            <div className="item" key={x.id}>
              <div className="item-head"><b>{x.label || x.type}</b><Remove onClick={() => update(p => { p.insurance = p.insurance.filter(y => y.id !== x.id); })} /></div>
              <div className="fields">
                <Field label="Type"><Select<PolicyType> value={x.type} options={POLICY_TYPES} onChange={t => update(p => { p.insurance[i].type = t; })} /></Field>
                <Field label="Who it covers" hint="Optional"><TextInput value={x.label} placeholder="e.g. Family floater" onChange={t => update(p => { p.insurance[i].label = t; })} /></Field>
                <Field label="Cover amount"><MoneyInput value={x.cover} onChange={t => update(p => { p.insurance[i].cover = t; })} /></Field>
                <Field label="Premium"><MoneyInput value={x.premium} showWords={false} onChange={t => update(p => { p.insurance[i].premium = t; })} /></Field>
              </div>
              <Field label="Premium is paid">
                <Segmented<Freq> label="Premium frequency" value={x.freq} options={FREQS.map(v => ({ v, l: v }))} onChange={t => update(p => { p.insurance[i].freq = t; })} />
              </Field>
              {x.freq === 'Yearly' && N(x.premium) > 0 && <p className="hint">{inr(premiumMonthly(x))} a month</p>}
            </div>
          ))}
        </div>
        <div className="row">
          <button className="btn-add" style={{ flex: 1 }} onClick={() => update(p => { p.insurance.push({ id: newId('p'), type: 'Health', label: '', cover: 0, premium: 0, freq: 'Yearly' }); })}>+ Health insurance</button>
          <button className="btn-add" style={{ flex: 1 }} onClick={() => update(p => { p.insurance.push({ id: newId('p'), type: 'Term life', label: '', cover: 0, premium: 0, freq: 'Yearly' }); })}>+ Life insurance</button>
        </div>
      </section>

      <BalanceCard c={c} />
    </>
  );
}

// ================= Step 3: Yearly and one-time =================

export function Yearly({ plan, update, c }: StepProps) {
  const goals = goalOpts(plan).concat([{ v: 'unassigned', l: 'Not linked to a goal' }]);
  const monthlyShare = (r: Row) => N(r.amt) > 0 && <span className="words">{inr(N(r.amt) / 12)} a month</span>;
  return (
    <>
      <section className="card">
        <div className="card-title"><h3>Yearly income</h3><span className="hint">Total <span className="t">{inr(c.incomeY)}</span>/yr</span></div>
        <p className="hint">Bonuses, incentives, yearly rent or interest. Enter the amount you receive in a year.</p>
        <RowList rows={plan.annualIncome} set={fn => update(p => { p.annualIncome = fn(p.annualIncome); })} addLabel="+ Add yearly income" amtLabel="Yearly amount" placeholder="e.g. Annual bonus" note={monthlyShare} />
      </section>

      <section className="card">
        <div className="card-title"><h3>Yearly spends</h3><span className="hint">Total <span className="t">{inr(c.spendY)}</span>/yr</span></div>
        <p className="hint">School fees, festivals, travel, vehicle insurance, property tax.</p>
        <RowList rows={plan.annual} set={fn => update(p => { p.annual = fn(p.annual); })} addLabel="+ Add a yearly spend" amtLabel="Yearly amount" placeholder="e.g. School fees" note={monthlyShare} />
      </section>

      <section className="card">
        <h3>One-time income and spends</h3>
        <p className="hint">Amounts that happen once in a known year: a maturity, inheritance or property sale coming in, or a renovation going out. One-time spends are funded like goals.</p>
        <div className="list">
          {plan.oneTime.map((o, i) => (
            <div className="item" key={o.id}>
              <div className="item-head">
                <Segmented label="Income or spend" value={o.kind} options={[{ v: 'income', l: 'Income' }, { v: 'spend', l: 'Spend' }]}
                  onChange={k => update(p => { p.oneTime[i].kind = k; p.oneTime[i].earmark = k === 'income' ? 'unassigned' : ''; })} />
                <Remove onClick={() => update(p => { p.oneTime = p.oneTime.filter(x => x.id !== o.id); })} />
              </div>
              <div className="fields">
                <Field label="Description"><TextInput value={o.label} placeholder={o.kind === 'income' ? 'e.g. PPF maturity' : 'e.g. Home renovation'} onChange={t => update(p => { p.oneTime[i].label = t; })} /></Field>
                <Field label={o.kind === 'income' ? 'Amount' : 'Cost in today’s prices'}><MoneyInput value={o.amt} onChange={t => update(p => { p.oneTime[i].amt = t; })} /></Field>
                <Field label="Year"><NumInput value={o.year} placeholder={String(c.year + 1)} onChange={t => update(p => { p.oneTime[i].year = t; })} /></Field>
                {o.kind === 'income' && <Field label="Use it for"><Select value={o.earmark} options={goals} className={o.earmark === 'unassigned' ? 'unassigned' : ''} onChange={t => update(p => { p.oneTime[i].earmark = t; })} /></Field>}
              </div>
              {o.kind === 'spend' && (() => {
                const it = c.items.find(x => x.id === o.id);
                return it ? <FutureStrip today={N(o.amt)} todayLabel="Cost today" future={it.fv} futureLabel={'Cost in ' + it.year} /> : null;
              })()}
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.oneTime.push({ id: newId('o'), kind: 'income', label: '', amt: 0, year: c.year + 1, earmark: 'unassigned' }); })}>+ Add a one-time item</button>
      </section>

      <BalanceCard c={c} withYearly />
    </>
  );
}

// ================= Step 4: What I have and owe =================

function assetNote(a: Asset, it: Item | undefined): string {
  if (a.access === 'At retirement' && !['ret', 'excluded', 'unassigned'].includes(a.earmark))
    return 'Access is set to “At retirement”, and this is linked to ' + (it ? it.name + ' (' + it.year + ')' : 'a goal') + '.';
  if (a.earmark === 'emergency' && a.access !== 'Immediate' && a.access !== 'Within a week')
    return 'Access is set to “' + a.access + '”, and this is linked to the emergency fund.';
  if (it && a.access === 'Lock-in period' && it.n < 3)
    return 'Access is set to “Lock-in period”, and ' + it.name + ' is due in ' + it.year + '.';
  return '';
}

export function HaveOwe({ plan, update, c }: StepProps) {
  const itemById = Object.fromEntries(c.items.map(i => [i.id, i]));
  const earmarks = [{ v: 'emergency', l: 'Emergency fund' }].concat(goalOpts(plan))
    .concat([{ v: 'unassigned', l: 'Not linked to a goal' }, { v: 'excluded', l: 'Not for goals' }]);
  return (
    <>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="kpi"><small>You have</small><b className="t">{cmp(c.assetsTotal)}</b></div>
        <div className="kpi"><small>You owe</small><b className="t">{cmp(c.liab)}</b></div>
        <div className="kpi"><small>Net worth</small><b className="t">{cmp(c.netWorth)}</b></div>
      </div>

      <section className="card">
        <h3>What I have</h3>
        <p className="hint">Savings, investments and property, at today’s value. Link each one to the goal it’s for, so nothing is counted twice.</p>
        <div className="list">
          {plan.assets.map((a, i) => {
            const note = assetNote(a, itemById[a.earmark]);
            return (
              <div className="item" key={a.id}>
                <div className="item-head"><b>{a.label || a.type}</b><Remove onClick={() => update(p => { p.assets = p.assets.filter(x => x.id !== a.id); })} /></div>
                <div className="fields">
                  <Field label="Type"><Select<AssetType> value={a.type} options={typeOpts(ASSET_TYPES)} onChange={v => update(p => { p.assets[i].type = v; })} /></Field>
                  <Field label="Description"><TextInput value={a.label} placeholder="e.g. Joint savings" onChange={v => update(p => { p.assets[i].label = v; })} /></Field>
                  <Field label="Value today"><MoneyInput value={a.value} onChange={v => update(p => { p.assets[i].value = v; })} /></Field>
                  <Field label="When can you access it?"><Select<Access> value={a.access} options={ACCESS} onChange={v => update(p => { p.assets[i].access = v; })} /></Field>
                  <Field label="Linked to"><Select value={a.earmark} options={earmarks} className={a.earmark === 'unassigned' ? 'unassigned' : ''} onChange={v => update(p => { p.assets[i].earmark = v; })} /></Field>
                </div>
                {note && <div className="warn">{note}</div>}
              </div>
            );
          })}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.assets.push({ id: newId('a'), type: 'Mutual funds', label: '', value: 0, access: 'Within a week', earmark: 'unassigned' }); })}>+ Add a saving or investment</button>
      </section>

      <section className="card">
        <h3>What I owe</h3>
        <div className="list">
          {plan.loans.map((l, i) => (
            <div className="item" key={l.id}>
              <div className="item-head"><b>{l.label || 'Loan'}</b><Remove onClick={() => update(p => { p.loans = p.loans.filter(x => x.id !== l.id); })} /></div>
              <div className="fields">
                <Field label="Name"><TextInput value={l.label} placeholder="e.g. Home loan" onChange={v => update(p => { p.loans[i].label = v; })} /></Field>
                <Field label="Outstanding today"><MoneyInput value={l.out} onChange={v => update(p => { p.loans[i].out = v; })} /></Field>
                <Field label="Interest rate"><NumInput decimals suffix="% a year" value={l.rate} onChange={v => update(p => { p.loans[i].rate = v; })} /></Field>
                <Field label="Monthly EMI"><MoneyInput value={l.emi} onChange={v => update(p => { p.loans[i].emi = v; })} /></Field>
              </div>
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.loans.push({ id: newId('l'), label: '', emi: 0, out: 0, rate: '' }); })}>+ Add a loan</button>
      </section>
      <p className="hint">Insurance cover is entered in step 2, with its premium.</p>
    </>
  );
}
