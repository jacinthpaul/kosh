import type { ReactNode } from 'react';
import { SHORT_YEARS, premiumMonthly, type CalcResult } from './engine/calc';
import { ACCESS, ASSET_TYPES, FREQS, GOAL_TYPES, INVEST_TYPES, MARKET, POLICY_TYPES, PRIS, TYPE_LABEL, defaultInflation, newId } from './engine/data';
import { N, cmp, inr } from './engine/format';
import type { Access, Asset, AssetType, Freq, GoalType, Item, Plan, PolicyType, Priority, Row } from './engine/types';
import { CodeKey, Field, ItemCard, MoneyInput, NeedWant, NumInput, PriorityTag, Segmented, Select, TextInput, useOpenSet } from './ui';

export interface StepProps { plan: Plan; update: (fn: (p: Plan) => void) => void; c: CalcResult }

const typeOpts = (list: AssetType[]) => list.map(v => ({ v, l: TYPE_LABEL[v] ?? v }));
const goalOpts = (plan: Plan) => [{ v: 'ret', l: 'Retirement' }].concat(plan.goals.map(g => ({ v: g.id, l: g.name || 'Untitled goal' })));
const linkedName = (plan: Plan, e: string) => e === 'ret' ? 'Retirement' : e === 'emergency' ? 'Emergency fund' : e === 'excluded' ? 'Not for goals'
  : e === 'unassigned' || !e ? 'Not linked' : plan.goals.find(g => g.id === e)?.name || 'Untitled goal';

function Remove({ onClick }: { onClick: () => void }) {
  return <button className="btn-remove" onClick={onClick}>Remove</button>;
}

/** Editable list of label + amount rows. */
function RowList({ rows, set, addLabel, amtLabel, placeholder, note, needWant }: {
  rows: Row[]; set: (fn: (rows: Row[]) => Row[]) => void; addLabel: string; amtLabel: string; placeholder: string; note?: (r: Row) => ReactNode; needWant?: boolean;
}) {
  return (
    <>
      <div className="list">
        {rows.map(r => (
          <div className="lrow" key={r.id}>
            <div className={'lrow-fields' + (needWant ? ' nwrow' : '')}>
              <TextInput ariaLabel="Description" value={r.label} placeholder={placeholder} onChange={v => set(rs => rs.map(x => (x.id === r.id ? { ...x, label: v } : x)))} />
              {needWant && <NeedWant want={!!r.want} onChange={w => set(rs => rs.map(x => (x.id === r.id ? { ...x, want: w || undefined } : x)))} />}
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

function FutureStrip({ today, todayLabel, future, futureLabel, extra }: { today: number; todayLabel: string; future: number; futureLabel: string; extra?: { label: string; v: number } }) {
  return (
    <div className={'result' + (extra ? '' : ' two')}>
      <div className="rt"><small>{todayLabel}</small><b>{cmp(today)}</b></div>
      <div className="rf"><small>{futureLabel}</small><b>{cmp(future)}</b></div>
      {extra && <div className="rf"><small>{extra.label}</small><b>{cmp(extra.v)}</b></div>}
    </div>
  );
}

// ================= Step 1: You and your goals =================

export function YouAndGoals({ plan, update, c }: StepProps) {
  const h = plan.household, R = plan.retirement;
  const itemById = Object.fromEntries(c.items.map(i => [i.id, i]));
  const open = useOpenSet();
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
          <Field label="Monthly spending in retirement" hint="In today’s prices"><MoneyInput value={R.expense} onChange={v => update(p => { p.retirement.expense = v; })} /></Field>
        </div>
        <FutureStrip
          today={Math.max(0, R.expense - R.pension)} todayLabel="Monthly need today"
          future={c.E0 / 12} futureLabel={'Monthly need at ' + c.retAge}
          extra={{ label: 'Total needed at ' + c.retAge, v: c.corpus }} />
        <details className="more">
          <summary>More: plan-until age, pension</summary>
          <div className="fields">
            <Field label="Plan until age" hint="How long the money should last"><NumInput value={R.lifeExp} onChange={v => update(p => { p.retirement.lifeExp = v; })} /></Field>
            <Field label="Pension or rent in retirement" hint="Monthly, today’s prices"><MoneyInput value={R.pension} onChange={v => update(p => { p.retirement.pension = v; })} /></Field>
          </div>
        </details>
      </section>

      <section className="card">
        <h3>Other goals</h3>
        {plan.goals.length === 0 && <p className="hint">Tap a goal below to add it, then adjust the cost and year.</p>}
        <div className="list">
          {plan.goals.map((g, i) => {
            const it = itemById[g.id];
            return (
              <ItemCard key={g.id} open={open.isOpen(g.id)} onToggle={() => open.toggle(g.id)}
                title={g.name || 'Untitled goal'}
                summary={it && <><span className="t">{cmp(N(g.cost))}</span> today → <span className="f">{cmp(it.fv)}</span> in {it.year} · {g.priority}</>}
                onRemove={() => update(p => {
                  p.goals = p.goals.filter(x => x.id !== g.id);
                  for (const list of [p.assets, p.investments, p.oneTime]) list.forEach(a => { if (a.earmark === g.id) a.earmark = 'unassigned'; });
                  p.insurance.forEach(x => { if (x.earmark === g.id) x.earmark = 'unassigned'; });
                })}>
                <div className="fields">
                  <Field label="Goal name"><TextInput value={g.name} placeholder="Goal name" onChange={v => update(p => { p.goals[i].name = v; })} /></Field>
                  <Field label="Cost in today’s prices"><MoneyInput value={g.cost} onChange={v => update(p => { p.goals[i].cost = v; })} /></Field>
                  <Field label="Target year"><NumInput value={g.year} onChange={v => update(p => { p.goals[i].year = v; })} /></Field>
                </div>
                <Field label="Priority" hint="Sets the order goals are funded in">
                  <Segmented label="Priority" value={g.priority} options={PRIS.map(v => ({ v, l: v }))} onChange={v => update(p => { p.goals[i].priority = v; })} />
                </Field>
                <details className="more">
                  <summary>More: type, price rise ({N(g.inf)}% a year)</summary>
                  <div className="fields">
                    <Field label="Type"><Select<GoalType> value={g.type} options={GOAL_TYPES} onChange={v => update(p => { p.goals[i].type = v; p.goals[i].inf = defaultInflation(v, p.a); })} /></Field>
                    <Field label="Price rise"><NumInput decimals suffix="% a year" value={g.inf} onChange={v => update(p => { p.goals[i].inf = v; })} /></Field>
                  </div>
                </details>
                {it && <FutureStrip today={N(g.cost)} todayLabel="Cost today" future={it.fv} futureLabel={'Cost in ' + it.year} />}
              </ItemCard>
            );
          })}
        </div>
        <div className="presets">
          {presets.map(([label, type, cost, year, priority]) => (
            <button key={label} onClick={() => { const id = newId('g'); update(p => { p.goals.push({ id, name: label, type, cost, year, inf: defaultInflation(type, p.a), priority }); }); open.openNew(id); }}>+ {label}</button>
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
  const inv = useOpenSet(), ins = useOpenSet();
  const addPolicy = (type: PolicyType) => { const id = newId('p'); update(p => { p.insurance.push({ id, type, label: '', cover: 0, premium: 0, freq: 'Yearly' }); }); ins.openNew(id); };
  return (
    <>
      <section className="card">
        <div className="card-title"><h3>Income</h3><span className="hint">Total <span className="t">{inr(c.incomeM)}</span></span></div>
        <RowList rows={plan.income} set={fn => update(p => { p.income = fn(p.income); })} addLabel="+ Add income" amtLabel="Monthly amount" placeholder="e.g. Take-home salary" />
        <details className="more">
          <summary>More: income pattern, expected growth</summary>
          <Field label="How does income arrive?" hint={h.pattern === 'Variable' ? 'Business, freelance or commission income' : 'Salary or regular monthly income'}>
            <Segmented label="Income pattern" value={h.pattern} options={[{ v: 'Steady', l: 'Steady' }, { v: 'Variable', l: 'Variable' }]} onChange={v => update(p => { p.household.pattern = v; })} />
          </Field>
          <Field label="Expected yearly increase in income" hint="Optional. Used when exploring options.">
            <NumInput decimals suffix="% a year" value={plan.incomeGrowth} placeholder="e.g. 6" onChange={v => update(p => { p.incomeGrowth = v; })} />
          </Field>
        </details>
      </section>

      <section className="card">
        <div className="card-title"><h3>Regular spends</h3><span className="hint">Total <span className="t">{inr(c.ess)}</span></span></div>
        <p className="hint">Tap <b>Need</b> to mark a spend as a <b>Want</b>, such as eating out. The emergency fund covers needs only.</p>
        <RowList needWant rows={plan.essentials} set={fn => update(p => { p.essentials = fn(p.essentials); })} addLabel="+ Add a spend" amtLabel="Monthly amount" placeholder="e.g. Groceries" />
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
        <button className="btn-add" onClick={() => update(p => { p.loans.push({ id: newId('l'), label: '', emi: 0, out: 0, rate: '', endYear: '' }); })}>+ Add a loan EMI</button>
        {plan.loans.length > 0 && <p className="hint">When each loan ends goes in step 4.</p>}
      </section>

      <section className="card">
        <div className="card-title"><h3>Monthly investments</h3><span className="hint">Total <span className="t">{inr(c.invest + c.investPayroll)}</span></span></div>
        <p className="hint">SIPs, stocks, crypto, EPF, NPS, PPF, RDs: anything you put away every month, and the goal it’s for.</p>
        <div className="list">
          {plan.investments.map((v, i) => (
            <ItemCard key={v.id} open={inv.isOpen(v.id)} onToggle={() => inv.toggle(v.id)}
              title={v.label || TYPE_LABEL[v.type] || v.type}
              summary={<><span className="t">{inr(N(v.amt))}</span>/mo · {linkedName(plan, v.earmark)}{v.type === 'Crypto' ? ' · speculative' : ''}</>}
              onRemove={() => update(p => { p.investments = p.investments.filter(x => x.id !== v.id); })}>
              <div className="fields">
                <Field label="Type"><Select<AssetType> value={v.type} options={typeOpts(INVEST_TYPES)} onChange={t => update(p => { p.investments[i].type = t; p.investments[i].payroll = t === 'EPF'; })} /></Field>
                <Field label="Monthly amount"><MoneyInput value={v.amt} onChange={t => update(p => { p.investments[i].amt = t; })} /></Field>
                <Field label="For which goal?"><Select value={v.earmark} options={goals} className={v.earmark === 'unassigned' ? 'unassigned' : ''} onChange={t => update(p => { p.investments[i].earmark = t; })} /></Field>
                <Field label="Name" hint="Optional"><TextInput value={v.label} placeholder="e.g. Index fund SIP" onChange={t => update(p => { p.investments[i].label = t; })} /></Field>
              </div>
              {(v.type === 'EPF' || v.type === 'NPS') && (
                <label className="check"><input type="checkbox" checked={v.payroll} onChange={e => update(p => { p.investments[i].payroll = e.target.checked; })} />Deducted from salary before take-home</label>
              )}
              {v.type === 'Crypto' && <p className="hint">Crypto is shown as speculative. Its growth rate is an assumption you can change in step 5.</p>}
            </ItemCard>
          ))}
        </div>
        <button className="btn-add" onClick={() => { const id = newId('v'); update(p => { p.investments.push({ id, type: 'Mutual funds', label: '', amt: 0, earmark: 'unassigned', payroll: false }); }); inv.openNew(id); }}>+ Add a monthly investment</button>
      </section>

      <section className="card">
        <div className="card-title"><h3>Insurance</h3><span className="hint">Premiums <span className="t">{inr(c.premiums)}</span>/mo</span></div>
        <div className="list">
          {plan.insurance.map((x, i) => {
            const life = x.type !== 'Health';
            return (
              <ItemCard key={x.id} open={ins.isOpen(x.id)} onToggle={() => ins.toggle(x.id)}
                title={x.label || x.type}
                summary={<>{x.type} · cover <span className="t">{cmp(N(x.cover))}</span>{x.employer ? ' · employer' : ''}{N(x.premium) ? <> · {inr(N(x.premium))}/{x.freq === 'Yearly' ? 'yr' : 'mo'}</> : ''}</>}
                onRemove={() => update(p => { p.insurance = p.insurance.filter(y => y.id !== x.id); })}>
                <div className="fields">
                  <Field label="Type"><Select<PolicyType> value={x.type} options={POLICY_TYPES} onChange={t => update(p => { p.insurance[i].type = t; })} /></Field>
                  <Field label="Cover amount"><MoneyInput value={x.cover} onChange={t => update(p => { p.insurance[i].cover = t; })} /></Field>
                  <Field label={'Premium, ' + x.freq.toLowerCase()}><MoneyInput value={x.premium} showWords={false} onChange={t => update(p => { p.insurance[i].premium = t; })} /></Field>
                  {life && h.hasPartner && (
                    <Field label="Whose life?">
                      <Segmented label="Whose life" value={x.person || 'you'} options={[{ v: 'you', l: h.you.name || 'You' }, { v: 'partner', l: h.partner.name || 'Partner' }]} onChange={t => update(p => { p.insurance[i].person = t as 'you' | 'partner'; })} />
                    </Field>
                  )}
                </div>
                <Field label="Premium is paid">
                  <Segmented<Freq> label="Premium frequency" value={x.freq} options={FREQS.map(v => ({ v, l: v }))} onChange={t => update(p => { p.insurance[i].freq = t; })} />
                </Field>
                {x.freq === 'Yearly' && N(x.premium) > 0 && <p className="hint">{inr(premiumMonthly(x))} a month, counted in your balance.</p>}
                {x.type === 'Health' && (
                  <label className="check"><input type="checkbox" checked={!!x.employer} onChange={e => update(p => { p.insurance[i].employer = e.target.checked; })} />Provided by an employer</label>
                )}
                {x.type === 'Life (savings plan)' && (
                  <details className="more" open={N(x.maturity) > 0}>
                    <summary>More: amount paid out at maturity</summary>
                    <div className="fields">
                      <Field label="Maturity amount"><MoneyInput value={x.maturity ?? 0} onChange={t => update(p => { p.insurance[i].maturity = t; })} /></Field>
                      <Field label="Maturity year"><NumInput value={x.maturityYear ?? ''} placeholder={String(c.year + 10)} onChange={t => update(p => { p.insurance[i].maturityYear = t; })} /></Field>
                      <Field label="Use it for"><Select value={x.earmark || 'unassigned'} options={goals} onChange={t => update(p => { p.insurance[i].earmark = t; })} /></Field>
                    </div>
                  </details>
                )}
                <Field label="Name" hint="Optional"><TextInput value={x.label} placeholder={x.type === 'Health' ? 'e.g. Family floater' : 'e.g. Term plan'} onChange={t => update(p => { p.insurance[i].label = t; })} /></Field>
              </ItemCard>
            );
          })}
        </div>
        <div className="row">
          <button className="btn-add" style={{ flex: 1 }} onClick={() => addPolicy('Health')}>+ Health insurance</button>
          <button className="btn-add" style={{ flex: 1 }} onClick={() => addPolicy('Term life')}>+ Life insurance</button>
        </div>
      </section>

      <BalanceCard c={c} />
    </>
  );
}

// ================= Step 3: Yearly and one-time =================

export function Yearly({ plan, update, c }: StepProps) {
  const goals = goalOpts(plan).concat([{ v: 'unassigned', l: 'Not linked to a goal' }]);
  const open = useOpenSet();
  const monthlyShare = (r: Row) => N(r.amt) > 0 && <span className="words">{inr(N(r.amt) / 12)} a month</span>;
  const addOne = (kind: 'income' | 'spend') => { const id = newId('o'); update(p => { p.oneTime.push({ id, kind, label: '', amt: 0, year: c.year + 1, earmark: kind === 'income' ? 'unassigned' : '' }); }); open.openNew(id); };
  return (
    <>
      <section className="card">
        <div className="card-title"><h3>Yearly income</h3><span className="hint">Total <span className="t">{inr(c.incomeY)}</span>/yr</span></div>
        <p className="hint">Bonuses, incentives, yearly rent or interest.</p>
        <RowList rows={plan.annualIncome} set={fn => update(p => { p.annualIncome = fn(p.annualIncome); })} addLabel="+ Add yearly income" amtLabel="Yearly amount" placeholder="e.g. Annual bonus" note={monthlyShare} />
      </section>

      <section className="card">
        <div className="card-title"><h3>Yearly spends</h3><span className="hint">Total <span className="t">{inr(c.spendY)}</span>/yr</span></div>
        <p className="hint">School fees, festivals, travel, vehicle insurance, property tax.</p>
        <RowList rows={plan.annual} set={fn => update(p => { p.annual = fn(p.annual); })} addLabel="+ Add a yearly spend" amtLabel="Yearly amount" placeholder="e.g. School fees" note={monthlyShare} />
      </section>

      <section className="card">
        <h3>One-time income and spends</h3>
        <p className="hint">Things that happen once in a known year: a maturity, inheritance or sale coming in, or a renovation going out.</p>
        <div className="list">
          {plan.oneTime.map((o, i) => {
            const it = o.kind === 'spend' ? c.items.find(x => x.id === o.id) : undefined;
            return (
              <ItemCard key={o.id} open={open.isOpen(o.id)} onToggle={() => open.toggle(o.id)}
                title={o.label || (o.kind === 'income' ? 'One-time income' : 'One-time spend')}
                summary={<>{o.kind === 'income' ? '+' : '−'} <span className="t">{cmp(N(o.amt))}</span> in {N(o.year) || c.year + 1}{o.kind === 'income' ? ' · ' + linkedName(plan, o.earmark) : it ? <> · <span className="f">{cmp(it.fv)}</span> then</> : ''}</>}
                onRemove={() => update(p => { p.oneTime = p.oneTime.filter(x => x.id !== o.id); })}>
                <Segmented label="Income or spend" value={o.kind} options={[{ v: 'income', l: 'Income' }, { v: 'spend', l: 'Spend' }]}
                  onChange={k => update(p => { p.oneTime[i].kind = k; p.oneTime[i].earmark = k === 'income' ? 'unassigned' : ''; })} />
                <div className="fields">
                  <Field label="Description"><TextInput value={o.label} placeholder={o.kind === 'income' ? 'e.g. PPF maturity' : 'e.g. Home renovation'} onChange={t => update(p => { p.oneTime[i].label = t; })} /></Field>
                  <Field label={o.kind === 'income' ? 'Amount' : 'Cost in today’s prices'}><MoneyInput value={o.amt} onChange={t => update(p => { p.oneTime[i].amt = t; })} /></Field>
                  <Field label="Year"><NumInput value={o.year} placeholder={String(c.year + 1)} onChange={t => update(p => { p.oneTime[i].year = t; })} /></Field>
                  {o.kind === 'income' && <Field label="Use it for"><Select value={o.earmark} options={goals} className={o.earmark === 'unassigned' ? 'unassigned' : ''} onChange={t => update(p => { p.oneTime[i].earmark = t; })} /></Field>}
                </div>
                {it && <FutureStrip today={N(o.amt)} todayLabel="Cost today" future={it.fv} futureLabel={'Cost in ' + it.year} />}
                {o.kind === 'spend' && <p className="hint">Funded like an essential goal.</p>}
              </ItemCard>
            );
          })}
        </div>
        <div className="row">
          <button className="btn-add" style={{ flex: 1 }} onClick={() => addOne('income')}>+ One-time income</button>
          <button className="btn-add" style={{ flex: 1 }} onClick={() => addOne('spend')}>+ One-time spend</button>
        </div>
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
  if (it && it.kind !== 'ret' && it.n <= SHORT_YEARS && MARKET[a.type])
    return 'This is market-linked, and ' + it.name + ' is due in ' + it.year + '. Market-linked values can fall in the short term.';
  return '';
}

export function HaveOwe({ plan, update, c }: StepProps) {
  const itemById = Object.fromEntries(c.items.map(i => [i.id, i]));
  const earmarks = [{ v: 'emergency', l: 'Emergency fund' }].concat(goalOpts(plan))
    .concat([{ v: 'unassigned', l: 'Not linked to a goal' }, { v: 'excluded', l: 'Not for goals' }]);
  const assets = useOpenSet(), loans = useOpenSet();
  return (
    <>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="kpi"><small>You have</small><b className="t">{cmp(c.assetsTotal)}</b></div>
        <div className="kpi"><small>You owe</small><b className="t">{cmp(c.liab)}</b></div>
        <div className="kpi"><small>Net worth</small><b className="t">{cmp(c.netWorth)}</b></div>
      </div>

      <section className="card">
        <h3>What I have</h3>
        <p className="hint">Savings, investments and property, at today’s value, and what each one is for.</p>
        <div className="list">
          {plan.assets.map((a, i) => {
            const note = assetNote(a, itemById[a.earmark]);
            return (
              <ItemCard key={a.id} open={assets.isOpen(a.id)} onToggle={() => assets.toggle(a.id)}
                title={a.label || TYPE_LABEL[a.type] || a.type}
                summary={<><span className="t">{cmp(N(a.value))}</span> · {linkedName(plan, a.earmark)}{note ? ' · ⚠' : ''}</>}
                onRemove={() => update(p => { p.assets = p.assets.filter(x => x.id !== a.id); })}>
                <div className="fields">
                  <Field label="Type"><Select<AssetType> value={a.type} options={typeOpts(ASSET_TYPES)} onChange={v => update(p => { p.assets[i].type = v; })} /></Field>
                  <Field label="Value today"><MoneyInput value={a.value} onChange={v => update(p => { p.assets[i].value = v; })} /></Field>
                  <Field label="Linked to"><Select value={a.earmark} options={earmarks} className={a.earmark === 'unassigned' ? 'unassigned' : ''} onChange={v => update(p => { p.assets[i].earmark = v; })} /></Field>
                  <Field label="Name" hint="Optional"><TextInput value={a.label} placeholder="e.g. Joint savings" onChange={v => update(p => { p.assets[i].label = v; })} /></Field>
                </div>
                <details className="more">
                  <summary>More: when you can access it ({a.access.toLowerCase()})</summary>
                  <Field label="When can you access it?"><Select<Access> value={a.access} options={ACCESS} onChange={v => update(p => { p.assets[i].access = v; })} /></Field>
                </details>
                {note && <div className="warn">{note}</div>}
              </ItemCard>
            );
          })}
        </div>
        <button className="btn-add" onClick={() => { const id = newId('a'); update(p => { p.assets.push({ id, type: 'Mutual funds', label: '', value: 0, access: 'Within a week', earmark: 'unassigned' }); }); assets.openNew(id); }}>+ Add a saving or investment</button>
      </section>

      <section className="card">
        <h3>What I owe</h3>
        <div className="list">
          {plan.loans.map((l, i) => (
            <ItemCard key={l.id} open={loans.isOpen(l.id)} onToggle={() => loans.toggle(l.id)}
              title={l.label || 'Loan'}
              summary={<><span className="t">{cmp(N(l.out))}</span> left · {inr(N(l.emi))}/mo{N(l.endYear) ? ' · ends ' + N(l.endYear) : ''}</>}
              onRemove={() => update(p => { p.loans = p.loans.filter(x => x.id !== l.id); })}>
              <div className="fields">
                <Field label="Outstanding today"><MoneyInput value={l.out} onChange={v => update(p => { p.loans[i].out = v; })} /></Field>
                <Field label="Monthly EMI"><MoneyInput value={l.emi} onChange={v => update(p => { p.loans[i].emi = v; })} /></Field>
                <Field label="Last EMI in year" hint="Optional. The EMI is then counted toward goals."><NumInput value={l.endYear ?? ''} placeholder={String(c.year + 5)} onChange={v => update(p => { p.loans[i].endYear = v; })} /></Field>
              </div>
              <details className="more">
                <summary>More: name, interest rate</summary>
                <div className="fields">
                  <Field label="Name"><TextInput value={l.label} placeholder="e.g. Home loan" onChange={v => update(p => { p.loans[i].label = v; })} /></Field>
                  <Field label="Interest rate"><NumInput decimals suffix="% a year" value={l.rate} onChange={v => update(p => { p.loans[i].rate = v; })} /></Field>
                </div>
              </details>
            </ItemCard>
          ))}
        </div>
        <button className="btn-add" onClick={() => { const id = newId('l'); update(p => { p.loans.push({ id, label: '', emi: 0, out: 0, rate: '', endYear: '' }); }); loans.openNew(id); }}>+ Add a loan</button>
      </section>
      <p className="hint">Insurance cover is entered in step 2, with its premium.</p>
    </>
  );
}
