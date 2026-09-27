import type { CalcResult } from './engine/calc';
import { ACCESS, ASSET_TYPES, GOAL_TYPES, PRIS, defaultInflation, newId } from './engine/data';
import { N, cmp, inr, sum } from './engine/format';
import type { Access, Asset, AssetType, GoalType, Item, Plan, Priority } from './engine/types';
import { Field, MoneyInput, NumInput, PreTax, PriorityTag, Segmented, Select, TextInput } from './ui';

export interface StepProps { plan: Plan; update: (fn: (p: Plan) => void) => void; c: CalcResult }

// ---------------- Step 1 ----------------
export function Household({ plan, update }: StepProps) {
  const h = plan.household;
  return (
    <>
      <section className="card">
        <h3>Household</h3>
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
      </section>

      <section className="card">
        <h3>Children</h3>
        {h.kids.length === 0 && <p className="hint">No children added.</p>}
        <div className="list">
          {h.kids.map((k, i) => (
            <div className="lrow" key={k.id}>
              <div className="lrow-fields">
                <TextInput ariaLabel={'Child ' + (i + 1) + ' name'} value={k.name} placeholder="Name (optional)" onChange={v => update(p => { p.household.kids[i].name = v; })} />
                <NumInput ariaLabel={'Child ' + (i + 1) + ' age'} value={k.age} placeholder="Age" onChange={v => update(p => { p.household.kids[i].age = v; })} />
              </div>
              <button className="btn-remove" onClick={() => update(p => { p.household.kids.splice(i, 1); })}>Remove</button>
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.household.kids.push({ id: newId('k'), name: '', age: '' }); })}>+ Add a child</button>
        <Field label="Parents you support">
          <Segmented label="Parents supported" value={h.parents} options={[0, 1, 2].map(n => ({ v: n, l: String(n) }))} onChange={v => update(p => { p.household.parents = v; })} />
        </Field>
      </section>

      <section className="card">
        <h3>Income and timeline</h3>
        <Field label="How does income arrive?" hint={h.pattern === 'Variable' ? 'Business, freelance or commission income' : 'Salary or regular monthly income'}>
          <Segmented label="Income pattern" value={h.pattern} options={[{ v: 'Steady', l: 'Steady' }, { v: 'Variable', l: 'Variable' }]} onChange={v => update(p => { p.household.pattern = v; })} />
        </Field>
        <div className="fields">
          <Field label="Age you’d like to retire"><NumInput value={plan.retirement.age} onChange={v => update(p => { p.retirement.age = v; })} /></Field>
          <Field label="Plan until age" hint="How long the money should last"><NumInput value={plan.retirement.lifeExp} onChange={v => update(p => { p.retirement.lifeExp = v; })} /></Field>
        </div>
        <p className="hint">Retirement figures use your age. A partner’s separate retirement timeline is coming in a later version.</p>
      </section>
    </>
  );
}

// ---------------- Step 2 ----------------
function RowList({ list, field, amtLabel, addLabel, update, monthlyShare }: { list: Plan['essentials']; field: 'essentials' | 'annual'; amtLabel: string; addLabel: string; update: StepProps['update']; monthlyShare?: boolean }) {
  return (
    <>
      <div className="list">
        {list.map((r, i) => (
          <div className="lrow" key={r.id}>
            <div className="lrow-fields">
              <TextInput ariaLabel="Description" value={r.label} placeholder="Description" onChange={v => update(p => { p[field][i].label = v; })} />
              <span>
                <MoneyInput ariaLabel={amtLabel + ' for ' + (r.label || 'this item')} value={r.amt} showWords={false} onChange={v => update(p => { p[field][i].amt = v; })} />
                {monthlyShare && N(r.amt) > 0 && <span className="words">{inr(N(r.amt) / 12)} a month</span>}
              </span>
            </div>
            <button className="btn-remove" onClick={() => update(p => { p[field] = p[field].filter(x => x.id !== r.id); })}>Remove</button>
          </div>
        ))}
      </div>
      <button className="btn-add" onClick={() => update(p => { p[field].push({ id: newId(field[0]), label: '', amt: 0 }); })}>{addLabel}</button>
    </>
  );
}

export function Money({ plan, update, c }: StepProps) {
  const h = plan.household;
  return (
    <>
      <section className="card">
        <h3>Take-home income each month</h3>
        <div className="fields">
          <Field label={(h.you.name ? h.you.name + '’s' : 'Your') + ' take-home'}><MoneyInput value={plan.income.you} onChange={v => update(p => { p.income.you = v; })} /></Field>
          {h.hasPartner && <Field label={(h.partner.name ? h.partner.name + '’s' : 'Partner’s') + ' take-home'}><MoneyInput value={plan.income.partner} onChange={v => update(p => { p.income.partner = v; })} /></Field>}
          <Field label="Other income" hint="Rent, interest"><MoneyInput value={plan.income.other} onChange={v => update(p => { p.income.other = v; })} /></Field>
        </div>
      </section>

      <section className="card">
        <div className="card-title"><h3>Regular monthly expenses</h3><span className="hint">Total {inr(c.ess)}</span></div>
        <RowList list={plan.essentials} field="essentials" amtLabel="Monthly amount" addLabel="+ Add an expense" update={update} />
      </section>

      <section className="card">
        <div className="card-title"><h3>Loan EMIs</h3><span className="hint">Total {inr(c.emi)} a month</span></div>
        <div className="list">
          {plan.loans.map((l, i) => (
            <div className="lrow" key={l.id}>
              <div className="lrow-fields">
                <TextInput ariaLabel="Loan name" value={l.label} placeholder="e.g. Car loan" onChange={v => update(p => { p.loans[i].label = v; })} />
                <MoneyInput ariaLabel={'EMI for ' + (l.label || 'this loan')} value={l.emi} showWords={false} onChange={v => update(p => { p.loans[i].emi = v; })} />
              </div>
              <button className="btn-remove" onClick={() => update(p => { p.loans = p.loans.filter(x => x.id !== l.id); })}>Remove</button>
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.loans.push({ id: newId('l'), label: '', emi: 0, out: 0, rate: '' }); })}>+ Add a loan EMI</button>
        <p className="hint">Outstanding amounts and interest rates go in the next step.</p>
      </section>

      <section className="card">
        <div className="card-title"><h3>Once-a-year expenses</h3><span className="hint">{inr(c.ann)} a month</span></div>
        <p className="hint">Enter the yearly amount. It’s spread across 12 months.</p>
        <RowList list={plan.annual} field="annual" amtLabel="Yearly amount" addLabel="+ Add a yearly expense" update={update} monthlyShare />
      </section>
    </>
  );
}

// ---------------- Step 3 ----------------
function assetNote(a: Asset, it: Item | undefined): string {
  if (a.access === 'At retirement' && !['ret', 'excluded', 'unassigned'].includes(a.earmark))
    return 'Access is set to “At retirement”, and this is assigned to ' + (it ? it.name + ' (' + it.year + ')' : 'a goal') + '.';
  if (a.earmark === 'emergency' && a.access !== 'Immediate' && a.access !== 'Within a week')
    return 'Access is set to “' + a.access + '”, and this is assigned to the emergency fund.';
  if (it && a.access === 'Lock-in period' && it.n < 3)
    return 'Access is set to “Lock-in period”, and ' + it.name + ' is due in ' + it.year + '.';
  return '';
}

export function Assets({ plan, update, c }: StepProps) {
  const itemById = Object.fromEntries(c.items.map(i => [i.id, i]));
  const earmarks = [{ v: 'emergency', l: 'Emergency fund' }, { v: 'ret', l: 'Retirement' }]
    .concat(plan.goals.map(g => ({ v: g.id, l: g.name || 'Untitled goal' })))
    .concat([{ v: 'unassigned', l: 'Unassigned' }, { v: 'excluded', l: 'Not for goals' }]);
  return (
    <>
      <section className="card">
        <div className="card-title"><h3>Savings, investments and property</h3><span className="hint">Total {cmp(c.assetsTotal)}</span></div>
        {plan.goals.length === 0 && <p className="note">Tip: add goals in the next step, then come back to assign savings to them.</p>}
        <div className="list">
          {plan.assets.map((a, i) => {
            const note = assetNote(a, itemById[a.earmark]);
            return (
              <div className="item" key={a.id}>
                <div className="item-head"><b>{a.label || a.type}</b><button className="btn-remove" onClick={() => update(p => { p.assets = p.assets.filter(x => x.id !== a.id); })}>Remove</button></div>
                <div className="fields">
                  <Field label="Type"><Select<AssetType> value={a.type} options={ASSET_TYPES} onChange={v => update(p => { p.assets[i].type = v; })} /></Field>
                  <Field label="Description"><TextInput value={a.label} placeholder="e.g. Joint savings" onChange={v => update(p => { p.assets[i].label = v; })} /></Field>
                  <Field label="Current value"><MoneyInput value={a.value} onChange={v => update(p => { p.assets[i].value = v; })} /></Field>
                  <Field label="When can you access it?"><Select<Access> value={a.access} options={ACCESS} onChange={v => update(p => { p.assets[i].access = v; })} /></Field>
                  <Field label="Earmarked for"><Select value={a.earmark} options={earmarks} className={a.earmark === 'unassigned' ? 'unassigned' : ''} onChange={v => update(p => { p.assets[i].earmark = v; })} /></Field>
                </div>
                {note && <div className="warn">{note}</div>}
              </div>
            );
          })}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.assets.push({ id: newId('a'), type: 'Mutual funds', label: '', value: 0, access: 'Within a week', earmark: 'unassigned' }); })}>+ Add a saving or investment</button>
      </section>

      <section className="card">
        <div className="card-title"><h3>Loans</h3><span className="hint">Outstanding {cmp(c.liab)}</span></div>
        <div className="list">
          {plan.loans.map((l, i) => (
            <div className="item" key={l.id}>
              <div className="item-head"><b>{l.label || 'Loan'}</b><button className="btn-remove" onClick={() => update(p => { p.loans = p.loans.filter(x => x.id !== l.id); })}>Remove</button></div>
              <div className="fields">
                <Field label="Name"><TextInput value={l.label} placeholder="e.g. Home loan" onChange={v => update(p => { p.loans[i].label = v; })} /></Field>
                <Field label="Outstanding"><MoneyInput value={l.out} onChange={v => update(p => { p.loans[i].out = v; })} /></Field>
                <Field label="Interest rate"><NumInput decimals suffix="% a year" value={l.rate} onChange={v => update(p => { p.loans[i].rate = v; })} /></Field>
                <Field label="Monthly EMI"><MoneyInput value={l.emi} onChange={v => update(p => { p.loans[i].emi = v; })} /></Field>
              </div>
            </div>
          ))}
        </div>
        <button className="btn-add" onClick={() => update(p => { p.loans.push({ id: newId('l'), label: '', emi: 0, out: 0, rate: '' }); })}>+ Add a loan</button>
      </section>
    </>
  );
}

// ---------------- Step 4 ----------------
function ResultStrip({ it, assigned }: { it?: Item; assigned: string }) {
  if (!it) return null;
  return (
    <>
      <div className="result">
        <div><small>Future cost · {it.year}</small><b>{cmp(it.fv)}</b></div>
        <div><small>From savings assigned</small><b>{cmp(it.grown)}</b></div>
        <div><small>Monthly amount needed</small><b>{inr(it.sip)}</b></div>
      </div>
      <p className="hint">{assigned} <PreTax /></p>
    </>
  );
}

export function Goals({ plan, update, c }: StepProps) {
  const itemById = Object.fromEntries(c.items.map(i => [i.id, i]));
  const assignedNote = (id: string) => {
    const list = plan.assets.filter(a => a.earmark === id);
    return list.length ? 'Includes ' + list.map(a => a.label || a.type).join(', ') + ', projected forward.' : 'No savings assigned yet. You can assign them in step 3.';
  };
  const R = plan.retirement;
  const Y = c.year;
  const presets: [string, GoalType, number, number, Priority][] = [
    ['Child’s education', 'Education', 2000000, Y + 12, 'Essential'], ['Home down payment', 'Home', 2500000, Y + 6, 'Important'],
    ['Car', 'Car', 800000, Y + 4, 'Nice to have'], ['Travel', 'Travel', 300000, Y + 2, 'Nice to have'],
    ['Parents’ care', 'Parents’ care', 600000, Y + 8, 'Important'], ['Wedding', 'Wedding', 1500000, Y + 10, 'Important'],
  ];
  return (
    <>
      <section className="card">
        <div className="card-title"><h3>Retirement</h3><PriorityTag p="Essential" /></div>
        {c.alreadyRetired && <div className="warn">Your age is at or above the retirement age, so retirement figures below aren’t meaningful yet. A plan for people already retired is coming in a later version.</div>}
        <div className="fields">
          <Field label="Monthly spending in retirement" hint="In today’s prices"><MoneyInput value={R.expense} onChange={v => update(p => { p.retirement.expense = v; })} /></Field>
          <Field label="Pension or rent in retirement" hint="Monthly, today’s prices"><MoneyInput value={R.pension} onChange={v => update(p => { p.retirement.pension = v; })} /></Field>
          <Field label="EPF / NPS contributions" hint="Monthly, ongoing"><MoneyInput value={R.ongoing} onChange={v => update(p => { p.retirement.ongoing = v; })} /></Field>
        </div>
        <ResultStrip it={c.ret} assigned={plan.assets.some(a => a.earmark === 'ret') ? assignedNote('ret').replace('.', ', plus ongoing contributions.') : 'Ongoing EPF / NPS contributions only.'} />
      </section>

      {plan.goals.map((g, i) => (
        <section className="card" key={g.id}>
          <div className="item-head">
            <TextInput ariaLabel="Goal name" value={g.name} placeholder="Goal name" onChange={v => update(p => { p.goals[i].name = v; })} />
            <button className="btn-remove" onClick={() => update(p => { p.goals = p.goals.filter(x => x.id !== g.id); p.assets.forEach(a => { if (a.earmark === g.id) a.earmark = 'unassigned'; }); })}>Remove</button>
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
          <ResultStrip it={itemById[g.id]} assigned={assignedNote(g.id)} />
        </section>
      ))}

      <section className="card card-muted">
        <h3>Add a goal</h3>
        <div className="presets">
          {presets.map(([label, type, cost, year, priority]) => (
            <button key={label} onClick={() => update(p => { p.goals.push({ id: newId('g'), name: label, type, cost, year, inf: defaultInflation(type, p.a), priority }); })}>+ {label}</button>
          ))}
        </div>
        <p className="hint">Preset costs and dates are placeholders. Change them to your own.</p>
      </section>
      <p className="hint">Total needed across all goals: {inr(sum(c.items, 'sip'))} a month.</p>
    </>
  );
}
