import { Document, Font, Line, Page, Path, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import caslon400 from '@fontsource/libre-caslon-text/files/libre-caslon-text-latin-400-normal.woff?inline';
import caslon700 from '@fontsource/libre-caslon-text/files/libre-caslon-text-latin-700-normal.woff?inline';
import fig400 from '@fontsource/figtree/files/figtree-latin-400-normal.woff?inline';
import fig600 from '@fontsource/figtree/files/figtree-latin-600-normal.woff?inline';
import fig700 from '@fontsource/figtree/files/figtree-latin-700-normal.woff?inline';
import figExt400 from '@fontsource/figtree/files/figtree-latin-ext-400-normal.woff?inline';
import figExt600 from '@fontsource/figtree/files/figtree-latin-ext-600-normal.woff?inline';
import figExt700 from '@fontsource/figtree/files/figtree-latin-ext-700-normal.woff?inline';
import { cmp, inr } from '../engine/format';
import type { Report } from './model';

// Fonts are embedded (data URLs), so generating the PDF makes no network requests.
// Figtree's extended subset is the fallback that carries the ₹ sign.
Font.register({ family: 'Figtree', fonts: [{ src: fig400, fontWeight: 400 }, { src: fig600, fontWeight: 600 }, { src: fig700, fontWeight: 700 }] });
Font.register({ family: 'FigtreeExt', fonts: [{ src: figExt400, fontWeight: 400 }, { src: figExt600, fontWeight: 600 }, { src: figExt700, fontWeight: 700 }] });
Font.register({ family: 'Caslon', fonts: [{ src: caslon400, fontWeight: 400 }, { src: caslon700, fontWeight: 700 }] });
Font.registerHyphenationCallback(word => [word]);

const SANS = ['Figtree', 'FigtreeExt'];
const SERIF = ['Caslon', 'FigtreeExt'];
const C = {
  bg: '#F6F4EE', card: '#FFFEFB', muted: '#F1EEE6', ink: '#1E2A22', body: '#3F4A43', sec: '#5E6A61', ter: '#6B766E',
  border: '#E4E0D5', divider: '#EFECE4', green: '#2E5C3E', important: '#7FA68A', nice: '#C7D6C5', okBg: '#E6EFE7',
  warnBg: '#FBF1DC', warnFg: '#7A5210', amber: '#C98A1B', status: '#A0621A', hatch: '#F1D9A6', danger: '#B4462E',
  today: '#2B6A8F', todayBg: '#E7F0F5', future: '#7B4FA0', futureBg: '#F1EAF6',
};
const PRI: Record<string, string> = { 'Essential': C.green, 'Important': C.important, 'Nice to have': C.nice };
const PRI_TAG: Record<string, [string, string]> = { 'Essential': ['#E6EFE7', '#22452F'], 'Important': ['#F3ECDC', '#6B5226'], 'Nice to have': ['#EEEDE8', '#555E57'] };

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, paddingTop: 70, paddingBottom: 56, paddingHorizontal: 40, fontFamily: SANS as unknown as string, fontSize: 9.5, color: C.ink, lineHeight: 1.45 },
  header: { position: 'absolute', top: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  brand: { fontFamily: SERIF as unknown as string, fontWeight: 700, fontSize: 16 },
  brandSub: { fontSize: 8, color: C.sec, marginLeft: 6, marginBottom: 2 },
  headerRight: { fontSize: 8, color: C.sec },
  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.ter, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  eyebrow: { fontSize: 8, fontWeight: 700, letterSpacing: 1, color: C.green, textTransform: 'uppercase', marginBottom: 4 },
  h1: { fontFamily: SERIF as unknown as string, fontSize: 26, lineHeight: 1.15, marginBottom: 6 },
  h2: { fontFamily: SERIF as unknown as string, fontSize: 19, lineHeight: 1.2, marginBottom: 4 },
  h3: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  lead: { fontSize: 10.5, color: C.body, lineHeight: 1.5 },
  p: { color: C.body, marginBottom: 4 },
  small: { fontSize: 8.5, color: C.sec, lineHeight: 1.45 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 10 },
  muted: { backgroundColor: C.muted, borderRadius: 8, padding: 10, marginBottom: 10 },
  explain: { backgroundColor: C.muted, borderRadius: 8, padding: 10, marginBottom: 10 },
  explainTitle: { fontSize: 8, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  row: { flexDirection: 'row' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  big: { fontFamily: SERIF as unknown as string, fontSize: 18, lineHeight: 1.2 },
  headline: { fontFamily: SERIF as unknown as string, fontSize: 15, lineHeight: 1.3, marginBottom: 4 },
  th: { fontSize: 7.5, fontWeight: 700, color: C.ter, textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { flexDirection: 'row', paddingVertical: 5, borderTopWidth: 1, borderTopColor: C.divider },
  tag: { fontSize: 7.5, fontWeight: 700, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#ECE9E0', overflow: 'hidden', flexDirection: 'row' },
});

const T = ({ v, children }: { v?: 'today' | 'future' | 'ok' | 'warn' | 'bad'; children: ReactNode }) =>
  <Text style={{ color: v === 'today' ? C.today : v === 'future' ? C.future : v === 'ok' ? C.green : v === 'warn' ? C.status : v === 'bad' ? C.danger : C.ink }}>{children}</Text>;

function Chrome({ r, section }: { r: Report; section: string }) {
  return (
    <>
      <View style={s.header} fixed>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}><Text style={s.brand}>Kosh</Text><Text style={s.brandSub}>Personal Wealth Calculator</Text></View>
        <Text style={s.headerRight}>{section}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text>Generated on {r.generated} · Calculation {r.calcVersion} · Estimates before tax · Not financial advice</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

function Explain({ title = 'What this means', children }: { title?: string; children: ReactNode }) {
  return <View style={s.explain} wrap={false}><Text style={s.explainTitle}>{title}</Text>{children}</View>;
}

function Swatch({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 5, marginTop: 2.5 }} />;
}

function Bar({ parts, total, height = 14 }: { parts: { v: number; color: string }[]; total: number; height?: number }) {
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: 4, overflow: 'hidden', backgroundColor: C.muted }}>
      {parts.filter(p => p.v > 0).map((p, i) => <View key={i} style={{ width: `${Math.min(100, (p.v / Math.max(total, 1)) * 100)}%`, backgroundColor: p.color, borderRightWidth: 1.5, borderRightColor: C.card }} />)}
    </View>
  );
}

function Tag({ p }: { p: string }) {
  const [bg, fg] = PRI_TAG[p] ?? PRI_TAG['Important'];
  return <Text style={[s.tag, { backgroundColor: bg, color: fg }]}>{p}</Text>;
}

function Cell({ label, value, code, explain, flex = 1, plain }: { label: string; value: string; code?: 'today' | 'future'; explain?: string; flex?: number; plain?: boolean }) {
  return (
    <View style={{ flex, backgroundColor: code === 'today' ? C.todayBg : code === 'future' ? C.futureBg : C.muted, padding: 8, marginRight: 4, borderRadius: 6 }}>
      <Text style={{ fontSize: 7.5, color: C.ter }}>{label}</Text>
      <Text style={plain ? { fontSize: 9, fontWeight: 600, marginTop: 2 } : { fontFamily: SERIF as unknown as string, fontSize: 13, color: code === 'today' ? C.today : code === 'future' ? C.future : C.ink }}>{value}</Text>
      {explain && <Text style={{ fontSize: 7, color: C.sec, marginTop: 2 }}>{explain}</Text>}
    </View>
  );
}

function CodeKey() {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', marginRight: 14 }}><Swatch color={C.today} /><Text style={s.small}>Today’s money</Text></View>
      <View style={{ flexDirection: 'row' }}><Swatch color={C.future} /><Text style={s.small}>Future money, after price rises or growth</Text></View>
    </View>
  );
}

// ---------------- pages ----------------

function Summary({ r }: { r: Report }) {
  const scale = Math.max(r.required, r.available, 1);
  return (
    <Page size="A4" style={s.page}>
      <Chrome r={r} section="1 · Summary" />
      <Text style={s.eyebrow}>Personal Wealth Calculator · {r.names ? 'Plan report' : 'Plan report, names hidden'}</Text>
      <Text style={s.h1}>{r.title}</Text>
      <Text style={[s.lead, { marginBottom: 12 }]}>A snapshot of where your money stands today, what your goals will cost, and how much more they need. Generated on {r.generated}.</Text>

      <Explain title="How to read this report">
        <View style={{ flexDirection: 'row', marginBottom: 3 }}><Swatch color={C.today} /><Text style={[s.small, { flex: 1 }]}><Text style={{ fontWeight: 700, color: C.today }}>Blue</Text> amounts are in <Text style={{ fontWeight: 700 }}>today’s money</Text>: what things cost or are worth now.</Text></View>
        <View style={{ flexDirection: 'row', marginBottom: 3 }}><Swatch color={C.future} /><Text style={[s.small, { flex: 1 }]}><Text style={{ fontWeight: 700, color: C.future }}>Purple</Text> amounts are <Text style={{ fontWeight: 700 }}>future money</Text>: what something will cost in the year it happens, after prices rise, or what savings may grow to by then.</Text></View>
        <Text style={s.small}>• <Text style={{ fontWeight: 700 }}>L</Text> means lakh (₹1,00,000) and <Text style={{ fontWeight: 700 }}>Cr</Text> means crore (₹1,00,00,000).</Text>
        <Text style={s.small}>• All figures are <Text style={{ fontWeight: 700 }}>estimates before tax</Text>, based on the numbers you entered and the assumptions on the last page. They are calculations, not financial advice.</Text>
      </Explain>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
        {r.kpis.map(k => (
          <View key={k.label} style={{ width: '50%', paddingHorizontal: 4 }} wrap={false}>
            <View style={[s.card, { minHeight: 86 }]}>
              <Text style={{ fontSize: 8.5, fontWeight: 600, color: C.sec }}>{k.label}</Text>
              <Text style={[s.big, { color: k.bad ? C.danger : k.code === 'today' ? C.today : k.code === 'ok' ? C.green : C.status }]}>{k.value}</Text>
              <Text style={[s.small, { marginTop: 2 }]}>{k.explain}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={s.card} wrap={false}>
        <Text style={s.h3}>How much more is needed</Text>
        <Text style={s.headline}>{r.headline}</Text>
        {r.headlineDetail ? <Text style={[s.p, { marginBottom: 8 }]}>{r.headlineDetail}</Text> : null}
        {r.required > 0 && (
          <>
            <View style={[s.kv, { paddingVertical: 1 }]}><Text style={{ fontWeight: 600 }}>What goals need each month</Text><T v="today">{inr(r.required)}</T></View>
            <Bar total={scale} parts={r.needBars.map(b => ({ v: b.v, color: PRI[b.priority] }))} />
            <View style={[s.kv, { paddingVertical: 1, marginTop: 6 }]}><Text style={{ fontWeight: 600 }}>What is available each month</Text><T v="today">{inr(r.available)}</T></View>
            <Bar total={scale} parts={[{ v: r.available, color: C.green }, { v: Math.max(0, r.required - r.available), color: C.hatch }]} />
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {[['Essential', C.green], ['Important', C.important], ['Nice to have', C.nice], ['Not covered today', C.hatch]].map(([l, col]) => (
                <View key={l} style={{ flexDirection: 'row', marginRight: 10 }}><Swatch color={col} /><Text style={s.small}>{l}</Text></View>
              ))}
            </View>
            {r.freed.length > 0 && <Text style={[s.small, { marginTop: 4 }]}>Some of the difference is covered later by loan EMIs that end ({r.freed.map(f => f.label + ' in ' + f.year).join(', ')}).</Text>}
          </>
        )}
      </View>

      <Text style={[s.small, { marginTop: 2 }]}>Inside: 2 · Your money each month  ·  3 · Your goals  ·  4 · Retirement  ·  5 · What you have and owe  ·  6 · What’s missing and options  ·  7 · Assumptions and words explained</Text>
    </Page>
  );
}

function Money({ r }: { r: Report }) {
  const em = r.emergency;
  return (
    <Page size="A4" style={s.page}>
      <Chrome r={r} section="2 · Your money each month" />
      <Text style={s.eyebrow}>Section 2</Text>
      <Text style={s.h2}>Your money each month</Text>
      <Text style={[s.lead, { marginBottom: 10 }]}>Where your money comes from and where it goes in a typical month. Yearly items are spread across 12 months so the balance is realistic.</Text>

      <View style={s.card}>
        <View style={[s.row, { marginBottom: 2 }]}><Text style={[s.th, { flex: 1.1 }]}>Item</Text><Text style={[s.th, { width: 80, textAlign: 'right' }]}>Per month</Text><Text style={[s.th, { flex: 2, marginLeft: 14 }]}>What it means</Text></View>
        {r.cash.map(x => (
          <View key={x.k} style={s.tr} wrap={false}>
            <Text style={{ flex: 1.1, fontWeight: 600 }}>{x.sign} {x.k}</Text>
            <Text style={{ width: 80, textAlign: 'right', color: C.today }}>{inr(x.v)}</Text>
            <Text style={[s.small, { flex: 2, marginLeft: 14 }]}>{x.explain}</Text>
          </View>
        ))}
        <View style={[s.tr, { borderTopColor: C.border, borderTopWidth: 1.5 }]}>
          <Text style={{ flex: 1.1, fontWeight: 700 }}>= Monthly balance</Text>
          <Text style={{ width: 80, textAlign: 'right', fontWeight: 700, color: r.balance < 0 ? C.danger : C.today }}>{inr(r.balance)}</Text>
          <Text style={[s.small, { flex: 2, marginLeft: 14 }]}>What is free each month. It goes first to the emergency fund (if you set an amount), then to your goals.</Text>
        </View>
        {r.investPayroll > 0 && <Text style={[s.small, { marginTop: 6 }]}>{inr(r.investPayroll)} a month in EPF / NPS is deducted from salary before take-home pay, so it is already out of your income above. It still counts toward the goals it is linked to.</Text>}
      </View>

      {r.investments.length > 0 && (
        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Monthly investments</Text>
          <Text style={[s.small, { marginBottom: 4 }]}>Money you put away every month, and the goal each amount is for. These keep growing toward that goal.</Text>
          {r.investments.map((v, i) => (
            <View key={i} style={s.tr}><Text style={{ flex: 1.3 }}>{v.name}{v.payroll ? '  (from salary)' : ''}</Text><Text style={{ flex: 1, color: C.sec }}>{v.linked}</Text><Text style={{ width: 80, textAlign: 'right', color: C.today }}>{inr(v.amt)}</Text></View>
          ))}
        </View>
      )}

      {r.insurance.length > 0 && (
        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Insurance</Text>
          <Text style={[s.small, { marginBottom: 4 }]}>Cover is the most the insurer would pay. The premium is what you pay to keep the policy.</Text>
          <View style={s.row}><Text style={[s.th, { flex: 1.3 }]}>Policy</Text><Text style={[s.th, { flex: 1 }]}>Type</Text><Text style={[s.th, { width: 70, textAlign: 'right' }]}>Cover</Text><Text style={[s.th, { width: 100, textAlign: 'right' }]}>Premium</Text></View>
          {r.insurance.map((x, i) => (
            <View key={i} style={s.tr}>
              <View style={{ flex: 1.3 }}><Text>{x.name}</Text>{x.note ? <Text style={s.small}>{x.note}</Text> : null}</View>
              <Text style={{ flex: 1, color: C.sec }}>{x.type}</Text>
              <Text style={{ width: 70, textAlign: 'right', color: C.today }}>{cmp(x.cover)}</Text>
              <Text style={{ width: 100, textAlign: 'right' }}>{x.premium}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.card} wrap={false}>
        <Text style={s.h3}>Emergency fund</Text>
        <Text style={s.headline}>{em.gap > 0 ? `${em.covered.toFixed(1)} months covered. The target is ${em.months}.` : `Your emergency fund covers ${em.covered.toFixed(1)} months.`}</Text>
        <View style={[s.bar, { height: 8, marginBottom: 8 }]}><View style={{ width: `${Math.min(100, (em.have / Math.max(em.target, 1)) * 100)}%`, backgroundColor: C.green }} /></View>
        <View style={s.row}>
          <Cell label="Saved for emergencies" value={cmp(em.have)} code="today" />
          <Cell label={`Target (${em.months} months)`} value={cmp(em.target)} code="today" />
          <Cell label="One month of essentials" value={inr(em.monthCost)} code="today" />
          <Cell label="Time to reach target" value={em.time} plain />
        </View>
        <Text style={[s.small, { marginTop: 6 }]}>An emergency fund is money kept easy to reach for surprises such as a job loss or medical bill. The target counts needs, loan EMIs and insurance premiums only, not wants.</Text>
      </View>
    </Page>
  );
}

function Goals({ r }: { r: Report }) {
  return (
    <Page size="A4" style={s.page}>
      <Chrome r={r} section="3 · Your goals" />
      <Text style={s.eyebrow}>Section 3</Text>
      <Text style={s.h2}>Your goals</Text>
      <Text style={[s.lead, { marginBottom: 8 }]}>Each goal is shown with what it costs today, what it will cost when it is due, and how it is being funded. Goals are funded in priority order (Essential first), then by date.</Text>
      <CodeKey />
      <Explain title="How to read each goal">
        <Text style={s.small}><Text style={{ fontWeight: 700, color: C.today }}>Cost today</Text>: what the goal would cost if you paid for it now.  <Text style={{ fontWeight: 700, color: C.future }}>Cost when due</Text>: the same goal in the year it happens, after prices rise.</Text>
        <Text style={s.small}><Text style={{ fontWeight: 700, color: C.future }}>Already working toward it</Text>: what the savings, monthly investments and one-off amounts linked to this goal may grow to by then.</Text>
        <Text style={s.small}><Text style={{ fontWeight: 700, color: C.today }}>Still needs each month</Text>: the extra you would need to invest every month, from now, to close the rest.  <Text style={{ fontWeight: 700, color: C.today }}>Covered by your balance</Text>: how much of that your monthly balance can pay for.</Text>
      </Explain>
      {r.goals.map((g, i) => (
        <View key={i} style={s.card} wrap={false}>
          <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }]}>
            <View style={[s.row, { alignItems: 'center' }]}>
              <Text style={{ fontSize: 11.5, fontWeight: 700, marginRight: 8 }}>{g.name}</Text><Tag p={g.priority} />
              {g.kind === 'oneTime' && <Text style={[s.small, { marginLeft: 6 }]}>one-time spend</Text>}
            </View>
            <Text style={{ color: C.sec }}>Due {g.year}</Text>
          </View>
          <View style={[s.row, { marginBottom: 6 }]}>
            {g.today != null && <Cell label={g.kind === 'ret' ? 'Yearly need today' : 'Cost today'} value={cmp(g.today)} code="today" />}
            <Cell label={g.kind === 'ret' ? 'Total needed at retirement' : 'Cost when due'} value={cmp(g.fv)} code="future" />
            <Cell label="Already working toward it" value={cmp(g.working + g.carried)} code="future" />
            <Cell label="Still needs each month" value={inr(g.sip)} code="today" />
            <Cell label="Covered by your balance" value={inr(g.alloc)} code="today" />
          </View>
          <View style={[s.bar, { marginBottom: 4 }]}><View style={{ width: `${(g.pct * 100).toFixed(1)}%`, backgroundColor: g.statusCode === 'ok' ? C.green : C.amber }} /></View>
          <View style={s.kv}>
            <Text style={s.small}>Projected <Text style={{ color: C.future }}>{cmp(g.projected)}</Text> of <Text style={{ color: C.future }}>{cmp(g.fv)}</Text> by {g.year} · assumes {(g.rate * 100).toFixed(1)}% a year on new amounts</Text>
            <Text style={{ fontWeight: 700, color: g.statusCode === 'ok' ? C.green : g.statusCode === 'warn' ? C.status : C.ter }}>{g.status}</Text>
          </View>
          {g.carried > 1 && <Text style={s.small}>Includes <Text style={{ color: C.future }}>{cmp(g.carried)}</Text> of extra savings carried over from {g.carriedFrom.join(', ')}.</Text>}
          {g.later > 1 && <Text style={s.small}>Also receives <Text style={{ color: C.today }}>{inr(g.later)}</Text> a month later, from loan EMIs that end.</Text>}
        </View>
      ))}
    </Page>
  );
}

function Retirement({ r }: { r: Report }) {
  const t = r.retirement;
  const a0 = t.youAge, a1 = t.lifeExp + 5;
  const W = 515, H = 190, L = 50, TOP = 10, B = H - 22;
  const ymax = Math.max(t.corpus, ...t.series.map(x => x.bal), 1) * 1.1;
  const cx = (a: number) => L + ((a - a0) / Math.max(1, a1 - a0)) * (W - L - 8);
  const cy = (v: number) => TOP + (1 - v / ymax) * (B - TOP);
  const pts = t.series.filter(x => x.age <= a1).map(x => `${cx(x.age).toFixed(1)},${cy(x.bal).toFixed(1)}`);
  const line = 'M' + pts.join(' L');
  const last = Math.min(a1, t.series[t.series.length - 1].age);
  const area = `${line} L${cx(last).toFixed(1)},${B} L${L},${B} Z`;
  const ticks: number[] = []; for (let a = Math.ceil(a0 / 10) * 10; a <= a1; a += 10) ticks.push(a);
  const rx = cx(t.age);
  return (
    <Page size="A4" style={s.page}>
      <Chrome r={r} section="4 · Retirement" />
      <Text style={s.eyebrow}>Section 4</Text>
      <Text style={s.h2}>Retirement</Text>
      <Text style={[s.lead, { marginBottom: 8 }]}>After you stop working, your savings have to pay for living costs every year. This section estimates how much you may need by then, and how long the money may last.</Text>
      <CodeKey />
      {t.alreadyRetired && <View style={[s.muted, { backgroundColor: C.warnBg }]}><Text style={{ color: C.warnFg }}>Your age is at or above the retirement age entered, so these figures are not meaningful yet.</Text></View>}
      <View style={[s.row, { marginBottom: 10 }]}>
        <Cell label="Retire in" value={`${t.year} (age ${t.age})`} explain={`${t.years} years from now`} />
        <Cell label="Monthly need today" value={inr(t.needToday)} code="today" explain={t.pension ? 'After your pension or rent' : 'In today’s prices'} />
        <Cell label={`Monthly need at ${t.age}`} value={cmp(t.needThen)} code="future" explain="The same lifestyle, after prices rise" />
        <Cell label={`Total needed at ${t.age}`} value={cmp(t.corpus)} code="future" explain={`To last until age ${t.lifeExp}`} />
      </View>
      <View style={s.card} wrap={false}>
        <Text style={s.headline}>{t.lastsTo ? `With what is set aside today, money is projected to last until age ${t.lastsTo}.` : `Money is projected to last beyond age ${t.lifeExp}.`}</Text>
        <Svg width={W - 28} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Rect x={rx} y={TOP} width={Math.max(0, W - 8 - rx)} height={B - TOP} fill={C.muted} />
          {[0, 0.5, 1].map(f => <Line key={f} x1={L} x2={W - 8} y1={cy((ymax / 1.1) * f)} y2={cy((ymax / 1.1) * f)} stroke={C.divider} strokeWidth={1} />)}
          <Path d={area} fill={C.futureBg} />
          <Path d={line} fill="none" stroke={C.future} strokeWidth={2} />
          <Line x1={L} x2={W - 8} y1={cy(t.corpus)} y2={cy(t.corpus)} stroke={C.ink} strokeWidth={1} strokeDasharray="4 3" />
          <Line x1={rx} x2={rx} y1={TOP} y2={B} stroke={C.ink} strokeWidth={1} strokeDasharray="3 3" />
          <Line x1={L} x2={W - 8} y1={B} y2={B} stroke="#D3CEC0" strokeWidth={1} />
        </Svg>
        {/* Axis labels as normal text so they use the embedded fonts */}
        <View style={{ position: 'relative', height: 12, marginLeft: 0 }}>
          {ticks.map(a => <Text key={a} style={{ position: 'absolute', left: (cx(a) / W) * (W - 28) - 8, fontSize: 7.5, color: C.ter, width: 16, textAlign: 'center' }}>{a}</Text>)}
        </View>
        <View style={[s.row, { marginTop: 4, flexWrap: 'wrap' }]}>
          <View style={[s.row, { marginRight: 12 }]}><Swatch color={C.future} /><Text style={s.small}>Projected savings for retirement, by age (future money)</Text></View>
          <View style={[s.row, { marginRight: 12 }]}><Text style={[s.small, { color: C.ink }]}>- - -  Total needed at {t.age}: <Text style={{ color: C.future }}>{cmp(t.corpus)}</Text></Text></View>
          <View style={s.row}><Text style={s.small}>Shaded: years in retirement. Top of chart: about {cmp(ymax / 1.1)}</Text></View>
        </View>
      </View>
      <View style={[s.row, { marginBottom: 10 }]}>
        <Cell label="Still needs each month" value={inr(t.sip)} code="today" explain="Extra to invest monthly, from now, for retirement" />
        <Cell label="Covered by your balance" value={inr(t.alloc)} code="today" explain="How much of that your monthly balance can pay" />
      </View>
      <Explain title="How this is worked out">
        <Text style={s.small}>1. Your monthly spending in retirement is entered in today’s prices. It is grown by inflation until you retire, which gives the monthly need at {t.age}.</Text>
        <Text style={s.small}>2. The total needed is the amount that, while still invested at the “return after retirement” rate, can pay that need every year until age {t.lifeExp}, with the need itself rising each year.</Text>
        <Text style={s.small}>3. The chart builds up savings linked to retirement (including EPF / NPS contributions and what your balance covers), then takes out one year of spending at a time from age {t.age}. Where the line reaches zero is when money is projected to run out.</Text>
        <Text style={s.small}>Retirement uses the age of the first person entered. A partner’s separate retirement timeline is not included yet.</Text>
      </Explain>
    </Page>
  );
}

function HaveOwe({ r }: { r: Report }) {
  return (
    <Page size="A4" style={s.page}>
      <Chrome r={r} section="5 · What you have and owe" />
      <Text style={s.eyebrow}>Section 5</Text>
      <Text style={s.h2}>What you have and what you owe</Text>
      <Text style={[s.lead, { marginBottom: 10 }]}>Your savings, investments and property at today’s value, what each one is for, and the loans against them.</Text>
      <View style={[s.row, { marginBottom: 10 }]}>
        <Cell label="You have" value={cmp(r.assetsTotal)} code="today" />
        <Cell label="You owe" value={cmp(r.liab)} code="today" />
        <Cell label="Net worth (have minus owe)" value={cmp(r.netWorth)} code="today" />
      </View>
      {r.assets.length > 0 && (
        <View style={s.card}>
          <Text style={s.h3}>What you have</Text>
          <View style={s.row}><Text style={[s.th, { flex: 1.4 }]}>Item</Text><Text style={[s.th, { flex: 1 }]}>Type</Text><Text style={[s.th, { flex: 1.2 }]}>Linked to</Text><Text style={[s.th, { width: 70, textAlign: 'right' }]}>Value today</Text></View>
          {r.assets.map((a, i) => (
            <View key={i} style={s.tr} wrap={false}><Text style={{ flex: 1.4 }}>{a.name}</Text><Text style={{ flex: 1, color: C.sec }}>{a.type}</Text><Text style={{ flex: 1.2, color: C.sec }}>{a.linked}</Text><Text style={{ width: 70, textAlign: 'right', color: C.today }}>{cmp(a.value)}</Text></View>
          ))}
          <Text style={[s.small, { marginTop: 6 }]}>“Linked to” shows which goal each item is set aside for, so nothing is counted twice. “Not for goals” means items you don’t plan to sell, like jewellery or your home.</Text>
        </View>
      )}
      {r.loans.length > 0 && (
        <View style={s.card} wrap={false}>
          <Text style={s.h3}>What you owe</Text>
          <View style={s.row}><Text style={[s.th, { flex: 1.4 }]}>Loan</Text><Text style={[s.th, { width: 70, textAlign: 'right' }]}>Outstanding</Text><Text style={[s.th, { width: 70, textAlign: 'right' }]}>EMI</Text><Text style={[s.th, { width: 60, textAlign: 'right' }]}>Interest</Text><Text style={[s.th, { width: 60, textAlign: 'right' }]}>Last EMI</Text></View>
          {r.loans.map((l, i) => (
            <View key={i} style={s.tr}><Text style={{ flex: 1.4 }}>{l.name}</Text><Text style={{ width: 70, textAlign: 'right', color: C.today }}>{cmp(l.out)}</Text><Text style={{ width: 70, textAlign: 'right', color: C.today }}>{inr(l.emi)}</Text><Text style={{ width: 60, textAlign: 'right' }}>{l.rate}</Text><Text style={{ width: 60, textAlign: 'right' }}>{l.ends}</Text></View>
          ))}
          <Text style={[s.small, { marginTop: 6 }]}>Outstanding is what is still to be repaid. When a loan’s last EMI year is given, that EMI is counted toward goals from then on.</Text>
        </View>
      )}
      {r.mix.length > 0 && (
        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Your current mix</Text>
          <Text style={[s.small, { marginBottom: 6 }]}>What you have today, grouped by asset class.</Text>
          <Bar total={r.assetsTotal} parts={r.mix.map(m => ({ v: m.v, color: m.color }))} />
          {r.mix.map(m => (
            <View key={m.k} style={s.kv}><View style={s.row}><Swatch color={m.color} /><Text>{m.k}</Text></View><Text><T v="today">{cmp(m.v)}</T>  ·  {Math.round(m.pct * 100)}%</Text></View>
          ))}
          <Explain title="Asset classes, in plain words">
            <Text style={s.small}><Text style={{ fontWeight: 700 }}>Equity</Text>: shares, equity mutual funds and NPS. Can grow faster over many years but can rise and fall sharply along the way.</Text>
            <Text style={s.small}><Text style={{ fontWeight: 700 }}>Debt</Text>: bank savings, fixed deposits, PPF, EPF. Steadier, with more predictable but usually lower growth.</Text>
            <Text style={s.small}><Text style={{ fontWeight: 700 }}>Gold</Text>: jewellery, coins, gold funds or bonds. Often holds value when other things fall.</Text>
            <Text style={s.small}><Text style={{ fontWeight: 700 }}>Real estate</Text>: land and property. Can grow and earn rent, but is slow and costly to sell.</Text>
            <Text style={s.small}><Text style={{ fontWeight: 700 }}>Speculative</Text>: crypto. Prices can swing very widely.</Text>
          </Explain>
        </View>
      )}
    </Page>
  );
}

function Missing({ r }: { r: Report }) {
  const icon = (t: string) => t === 'short' ? ['!', C.warnBg, C.status] : t === 'ok' ? ['✓', C.okBg, C.green] : ['i', C.todayBg, C.today];
  return (
    <Page size="A4" style={s.page}>
      <Chrome r={r} section="6 · What’s missing and options" />
      <Text style={s.eyebrow}>Section 6</Text>
      <Text style={s.h2}>What’s missing</Text>
      <Text style={[s.lead, { marginBottom: 10 }]}>Facts from your numbers that are worth a look: shortfalls, gaps in protection, and money not yet linked to a goal.</Text>
      <View style={s.card}>
        {r.facts.map((f, i) => {
          const [, bg, fg] = icon(f.tone);
          return (
            <View key={i} style={[s.row, { paddingVertical: 5, borderTopWidth: i ? 1 : 0, borderTopColor: C.divider }]} wrap={false}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: bg, marginRight: 8, marginTop: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 8, fontWeight: 700, color: fg, lineHeight: 1 }}>{f.tone === 'short' ? '!' : f.tone === 'ok' ? '•' : 'i'}</Text>
              </View>
              <View style={{ flex: 1 }}><Text style={{ fontWeight: 700 }}>{f.title}</Text>{f.detail ? <Text style={s.small}>{f.detail}</Text> : null}</View>
            </View>
          );
        })}
        <View style={[s.row, { marginTop: 8 }]}>
          {[['!', 'A shortfall or gap', C.warnBg, C.status], ['i', 'Information', C.todayBg, C.today]].map(([ch, l, bg, fg]) => (
            <View key={l} style={[s.row, { marginRight: 14, alignItems: 'center' }]}>
              <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: bg, marginRight: 4, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 7.5, fontWeight: 700, color: fg, lineHeight: 1 }}>{ch}</Text></View>
              <Text style={s.small}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[s.h2, { marginTop: 6 }]}>Options to explore</Text>
      {r.opts.length === 0
        ? <Text style={s.lead}>There is no monthly gap to close, so no options are shown.</Text>
        : (
          <>
            <Text style={[s.lead, { marginBottom: 8 }]}>Changes that would reduce the monthly gap of {inr(r.gapM)}, largest effect first. Each one is worked out on its own. These are calculations to help you think it through, not recommendations.</Text>
            {r.opts.map(o => (
              <View key={o.id} style={[s.card, { paddingVertical: 10 }]} wrap={false}>
                <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={{ fontWeight: 700, flex: 1, marginRight: 10 }}>{o.title}</Text><Text style={{ fontWeight: 700, color: C.green }}>Gap falls by {inr(o.saves)} a month</Text></View>
                <Text style={s.small}>{o.detail}</Text>
                <Text style={s.small}>{o.gap < 1 ? 'This alone would close the gap: every goal funded.' : `The gap would become ${inr(o.gap)} a month, with ${o.funded} goals fully funded.`}</Text>
              </View>
            ))}
          </>
        )}
    </Page>
  );
}

const GLOSSARY: [string, string][] = [
  ['Take-home pay', 'Salary received in your bank account, after tax, PF and other deductions.'],
  ['Inflation', 'The rate at which prices rise each year. At 6%, something costing ₹1,00,000 today costs about ₹1,79,000 in 10 years.'],
  ['Return', 'How much savings or investments grow each year, as a percentage.'],
  ['Today’s money / future money', 'The same goal expressed at today’s prices, or at the prices expected in the year it happens.'],
  ['SIP', 'Systematic investment plan: investing a fixed amount every month, usually in a mutual fund.'],
  ['EMI', 'Equated monthly instalment: the fixed monthly repayment on a loan.'],
  ['EPF / PPF / NPS', 'Employees’ Provident Fund, Public Provident Fund and National Pension System: long-term savings schemes, mostly for retirement.'],
  ['Net worth', 'Everything you own minus everything you owe.'],
  ['Emergency fund', 'Money kept easy to reach for surprises, sized in months of essential costs.'],
  ['Needs and wants', 'Needs are essential costs (rent, food, bills). Wants are nice-to-have spends (eating out, shopping).'],
  ['Term insurance', 'Life insurance that pays only if the insured person dies during the policy term. It has no savings part.'],
  ['Health cover', 'The most a health insurance policy will pay for hospital treatment in a year.'],
  ['Retirement corpus', 'The total savings needed on the day you retire to pay for the rest of retirement.'],
  ['Before tax', 'Tax on interest, gains and withdrawals is not taken off. Real amounts after tax may be lower.'],
];

function Notes({ r }: { r: Report }) {
  const half = Math.ceil(GLOSSARY.length / 2);
  const col = (items: [string, string][]) => (
    <View style={{ flex: 1, marginRight: 10 }}>
      {items.map(([k, v]) => <View key={k} style={{ marginBottom: 3 }} wrap={false}><Text style={{ fontWeight: 700, fontSize: 8.5, lineHeight: 1.3 }}>{k}</Text><Text style={[s.small, { fontSize: 8, lineHeight: 1.35 }]}>{v}</Text></View>)}
    </View>
  );
  return (
    <Page size="A4" style={s.page}>
      <Chrome r={r} section="7 · Assumptions and notes" />
      <Text style={s.eyebrow}>Section 7</Text>
      <Text style={s.h2}>Assumptions, words explained, and notes</Text>
      <View style={[s.row, { alignItems: 'flex-start' }]} wrap={false}>
        <View style={[s.card, { flex: 1.1, marginRight: 8 }]}>
          <Text style={s.h3}>Assumptions used</Text>
          <Text style={[s.small, { marginBottom: 2 }]}>Every result depends on these. They are estimates, not predictions, and can be changed in the app.</Text>
          {r.assumptions.map(a => <View key={a.k} style={[s.kv, { paddingVertical: 2, borderTopWidth: 1, borderTopColor: C.divider }]}><Text style={[s.small, { flex: 1, color: C.body }]}>{a.k}</Text><Text style={{ fontSize: 8.5, fontWeight: 600, marginLeft: 6 }}>{a.v}</Text></View>)}
          <Text style={[s.small, { marginTop: 4 }]}>Goals 3 to 7 years away use a return between the first two rates. Existing savings grow at a rate set for each type.</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={[s.muted, { backgroundColor: C.warnBg }]}>
            <Text style={{ fontWeight: 700, color: C.warnFg, marginBottom: 2 }}>Open assumption: tax</Text>
            <Text style={[s.small, { color: C.warnFg }]}>All returns and results are before tax. Tax on interest, capital gains and withdrawals is not included, so real amounts may be lower than shown.</Text>
          </View>
          <View style={s.card}>
            <Text style={s.h3}>Simplifications</Text>
            {['Incomes and monthly investments stay flat, unless an option explores raising them.', 'The emergency set-aside continues even after its target is reached.', 'Retirement uses the first person’s age only.', 'Market returns vary from year to year; these figures use steady average rates.'].map(t => <Text key={t} style={s.small}>• {t}</Text>)}
          </View>
          <View style={s.muted}>
            <Text style={{ fontWeight: 700, marginBottom: 2 }}>About this report</Text>
            <Text style={s.small}>Kosh is a calculator. It does not provide investment, tax or financial advice, and does not recommend any product. Created on your own device on {r.generated}; none of your numbers were sent anywhere. Update it whenever your income, family, loans or goals change.</Text>
          </View>
        </View>
      </View>
      <View style={[s.card, { marginBottom: 0, paddingBottom: 8 }]}>
        <Text style={s.h3}>Words explained</Text>
        <View style={s.row}>{col(GLOSSARY.slice(0, half))}{col(GLOSSARY.slice(half))}</View>
      </View>
    </Page>
  );
}

export function ReportPdf({ r }: { r: Report }) {
  return (
    <Document title={r.title} author="Kosh" subject="Personal wealth plan" creator="Kosh · Personal Wealth Calculator" producer="Kosh">
      <Summary r={r} />
      <Money r={r} />
      <Goals r={r} />
      <Retirement r={r} />
      <HaveOwe r={r} />
      <Missing r={r} />
      <Notes r={r} />
    </Document>
  );
}
