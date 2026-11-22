/**
 * State & local returns as formula-graph modules.
 *
 * A return graph = the federal graph + one module per state the return touches. Which modules
 * exist (resident state, nonresident states, the tax year's rules, the resident locality) is a
 * structural choice made when the graph is built, so formulas shown to the user contain only the
 * rules that apply to them — no "if state is CA" conditions at evaluation time.
 *
 * Every income-tax state fills the same template of quantities (st.<code>.<slot>):
 *   startingPoint → additions/subtractions → agi → baseStdDeduction / itemized → deduction
 *   → exemptions → adjustedIncome → taxable → tentativeTax (brackets/flat + surtaxes − built-in credits)
 *   → localTax → otherStateCredit → stateEitc → exemptionCredit → netStateTax → totalTax
 *   → withholding → net
 *
 * Rules intentionally mirror the previous engine (including known simplifications) so this port is
 * behavior-neutral; corrections land as separate, tested changes.
 */

import { TaxAppState, PanelSectionCategory } from '../types.js';
import { CoreFilingStatus, normalizeFilingStatus } from '../tax-constants.js';
import { NYC_LOCAL_BRACKETS, getStateTaxRule, StateTaxRuleDefinition, stateExemptionForYear } from '../state-rules.js';
import { STATE_PANEL_CATALOG } from '../state-panel-catalog.js';
import {
  Expr, Cond, add, and, atLeast0, brackets, ceil, div, each, field, gt, gte, lit, lt, lte, max, min, mul, neg, not, num,
  or, param, quietly, rate, ref, round, statusIs, sub, sumOver, when, flag
} from './expr.js';
import { BlockSpec, CollectionItem, FormulaGraph, GraphContext, QuantityDef } from './graph.js';
import { defineFederal, federalContext, federalGraph } from './federal.js';

export interface ReturnPlan {
  year: number;
  resident: string;
  nonresidents: string[];
  /** State where the Schedule E rental property is located ('' if none). */
  rentalState: string;
  /** Local income tax computed from statute for the resident (NYC brackets / Yonkers surcharge). */
  residentLocality: 'nyc' | 'yonkers' | '';
  /** Part-year: the state lived in before moving to `resident` during the year ('' if none). */
  priorState: string;
}

const R = ref, P = param;
const MFJ = statusIs('married_joint');
const sid = (code: string, slot: string) => `st.${code.toLowerCase()}.${slot}`;
const PANEL_SECTIONS: PanelSectionCategory[] = ['other-income', 'adjustments', 'credits', 'itemized'];
const SECTION_SLOT: Record<PanelSectionCategory, string> = { 'other-income': 'Other', adjustments: 'Adj', credits: 'Cred', itemized: 'Item' };

// ---------- plan & context (structure + data copying only; no tax math) ----------

function residentOf(state: TaxAppState): string {
  if (state.residentState && state.residentState.trim()) return state.residentState.toUpperCase().trim();
  const first = state.w2s?.[0]?.states?.[0]?.state;
  // No resident state chosen and no W-2 state: no resident state return (never silently assume one).
  return first && first.trim() ? first.toUpperCase().trim() : '';
}

export function planFromState(state: TaxAppState): ReturnPlan {
  const resident = residentOf(state);
  const codes = new Set<string>(resident ? [resident] : []);
  (state.w2s || []).forEach(w => (w.states || []).forEach(s => { const c = (s.state || '').toUpperCase().trim(); if (c) codes.add(c); }));
  (state.otherIncome?.sources || []).forEach(s => { const c = (s.state || '').toUpperCase().trim(); if (c) codes.add(c); });
  const rental = state.otherIncome?.scheduleERental;
  const rentalState = (rental?.propertyState || '').toUpperCase().trim();
  // A rental state joins the return when there are rents or an allowed (non-zero) rental result.
  const hasRental = Boolean(rental) && ((Number(rental!.grossRents) || 0) > 0
    || federalGraph(state.year || 2024).evaluate(federalContext(state)).value('fed.rentalAllowed') !== 0);
  if (rentalState && hasRental) codes.add(rentalState);
  const prior = (state.partYear?.priorState || '').toUpperCase().trim();
  const moveMonth = Number(state.partYear?.moveMonth) || 0;
  const priorState = resident && prior && prior !== resident && moveMonth >= 2 && moveMonth <= 12 ? prior : '';
  if (priorState) codes.add(priorState);

  let nyc = false, yonkers = false;
  (state.w2s || []).forEach(w => (w.states || []).forEach(s => {
    const code = (s.state || resident).toUpperCase().trim();
    if (code !== resident) return;
    const loc = (s.localityName || '').toUpperCase().trim();
    if (loc.includes('YONKERS')) yonkers = true;
    else if (loc.includes('NYC') || loc.includes('NEW YORK') || (code === 'NY' && (Number(s.localTaxWithheld) || 0) > 0)) nyc = true;
  }));
  return {
    year: state.year || 2024,
    resident,
    nonresidents: [...codes].filter(c => c !== resident).sort(),
    rentalState: rentalState && hasRental ? rentalState : '',
    residentLocality: resident === 'NY' ? (nyc ? 'nyc' : yonkers ? 'yonkers' : '') : '',
    priorState
  };
}

const planKey = (p: ReturnPlan) => `${p.year}|${p.resident}|${p.nonresidents.join(',')}|${p.rentalState}|${p.residentLocality}|${p.priorState}`;
const graphCache = new Map<string, FormulaGraph>();

/** The full return graph for a plan (federal + state modules), cached per plan. */
export function returnGraph(plan: ReturnPlan): FormulaGraph {
  const key = planKey(plan);
  let g = graphCache.get(key);
  if (!g) {
    g = new FormulaGraph();
    defineFederal(g, plan.year);
    defineShared(g);
    if (plan.resident) defineResident(g, plan);
    plan.nonresidents.forEach(code => defineNonresident(g!, plan, code));
    defineReturnTotals(g, plan);
    graphCache.set(key, g);
  }
  return g;
}

function catalogKeyFor(code: string, itemKey: string): string | undefined {
  const entry = STATE_PANEL_CATALOG.find(e => e.key === itemKey && (e.states === '*' || e.states.includes(code)));
  return entry?.key;
}

/** Graph inputs for a whole return: federal inputs + per-state documents and panels. */
export function returnContext(state: TaxAppState, plan: ReturnPlan): GraphContext {
  const ctx = federalContext(state);
  const n = (v: unknown) => Number(v) || 0;
  ctx.inputs['in.priorStateMonths'] = plan.priorState ? Math.max(0, Math.min(11, (Number(state.partYear?.moveMonth) || 1) - 1)) : 0;
  const codes = [plan.resident, ...plan.nonresidents].filter(Boolean);
  codes.forEach(code => {
    const lc = code.toLowerCase();
    ctx.collections[`st.${lc}.w2`] = (state.w2s || []).flatMap(w => (w.states || [])
      .filter(s => (s.state || plan.resident).toUpperCase().trim() === code)
      .map(s => ({ id: w.id * 1000 + s.id, name: w.employer, values: { stateWages: n(s.stateWages), withheld: n(s.stateTaxWithheld), localWages: n(s.localWages), localWithheld: n(s.localTaxWithheld),
        daysIn: n(s.daysWorkedInState), daysTotal: n(s.totalWorkDays) } })));
    const srcs = (state.otherIncome?.sources || []).filter(s => (s.state || plan.resident).toUpperCase().trim() === code);
    ctx.collections[`st.${lc}.srcInt`] = srcs.filter(s => s.type === '1099-INT').map(s => ({ id: s.id, name: s.payer, values: { amount: n(s.amount), accrued: n(s.accruedInterestPaid) } }));
    ctx.collections[`st.${lc}.srcOther`] = srcs.filter(s => s.type !== '1099-INT').map(s => ({ id: s.id, name: `${s.type} (${s.payer || 'Payer'})`, values: { amount: n(s.amount) } }));
    const allPanels = (state.statePanels || []).filter(p => p.state.toUpperCase() === code);
    // Estimated / extension payments are payments, not credits.
    ctx.collections[`st.${lc}.estpay`] = allPanels.filter(p => p.itemKey === 'state-estimated-payments').map(p => ({ id: p.id, name: 'Estimated payments', values: { amount: n(p.amount) } }));
    const panels = allPanels.filter(p => p.itemKey !== 'state-estimated-payments');
    PANEL_SECTIONS.forEach(section => {
      const inSection = panels.filter(p => p.section === section);
      if (code === plan.resident) {
        const byKey = new Map<string, CollectionItem[]>();
        inSection.forEach(p => {
          const key = catalogKeyFor(code, p.itemKey) || 'misc';
          if (!byKey.has(key)) byKey.set(key, []);
          byKey.get(key)!.push({ id: p.id, name: p.itemKey, values: { amount: n(p.amount) } });
        });
        residentPanelKeys(code).forEach(key => { ctx.collections[`st.${lc}.panel.${SECTION_SLOT[section]}.${key}`] = byKey.get(key) || []; });
      } else {
        ctx.collections[`st.${lc}.nrpanel.${section}`] = inSection.map(p => ({ id: p.id, name: p.itemKey, values: { amount: n(p.amount) } }));
      }
    });
    const sp = state.stateSpecific?.[code];
    ctx.inputs[`in.st.${lc}.otherIncome`] = n(sp?.otherIncome);
    ctx.inputs[`in.st.${lc}.adjustments`] = n(sp?.adjustments);
    ctx.inputs[`in.st.${lc}.credits`] = n(sp?.credits);
    ctx.inputs[`in.st.${lc}.itemized`] = n(sp?.itemizedDeductions);
  });
  return ctx;
}

/** Panel item keys available to a state (items are capped by key, whatever section they sit in). */
function residentPanelKeys(code: string): string[] {
  const keys = STATE_PANEL_CATALOG.filter(e => (e.states === '*' || e.states.includes(code)) && e.key !== 'state-estimated-payments').map(e => e.key);
  return [...Array.from(new Set(keys)), 'misc'];
}

// ---------- shared quantities ----------

function defineShared(g: FormulaGraph): void {
  g.param({ id: 'st.taxpayerCount', label: 'Taxpayers on Return', unit: 'count', domSources: ['select-filing-status'],
    resolve: c => (c.status === 'married_joint' ? 2 : 1) });
  // Part-year residency: income other than W-2 wages is allocated by months of residence in each state.
  g.input({ id: 'in.priorStateMonths', label: 'Months in Previous State', unit: 'count', domId: 'select-move-month', max: 11 });
  g.quantity({ id: 'ret.nonWageIncome', label: 'Income Other Than W-2 Wages', unit: 'usd', category: 'state', expr: sub(R('fed.totalIncome'), R('fed.wages')) });
  g.quantity({ id: 'ret.priorShare', label: 'Share of Year in Previous State', unit: 'rate', display: 'inline', expr: div(R('in.priorStateMonths'), num(12)) });
  g.quantity({ id: 'ret.dependents', label: 'Dependents', unit: 'count', display: 'inline', expr: add(R('fed.ctcChildren'), R('fed.odcDependents')) });
  g.quantity({ id: 'ret.netLtcg', label: 'Net Long-Term Capital Gain (State)', unit: 'usd', category: 'capital',
    expr: atLeast0(add(R('fed.longTermGain'), min(lit(0), R('fed.shortTermGain')))) });
  g.quantity({ id: 'ret.outOfStateMuniInterest', label: 'Tax-Exempt Interest From Other States\' Bonds', unit: 'usd', category: 'state', optional: true,
    expr: atLeast0(sub(each('src.int', 'taxExempt'), each('src.int', 'inStateExempt'))) });
  g.quantity({ id: 'ret.interestDividends', label: 'Interest & Dividends', unit: 'usd', category: 'wages',
    expr: add(R('in.interest'), R('fed.interest1099'), R('fed.dividends')) });
}

// ---------- per-state documents ----------

function defineStateDocuments(g: FormulaGraph, plan: ReturnPlan, code: string): void {
  const lc = code.toLowerCase();
  const S = (slot: string) => sid(code, slot);
  const lineDom = (suffix: string) => (it: CollectionItem) => `w2-${Math.floor(it.id / 1000)}-state-${it.id % 1000}-${suffix}`;
  g.collection({
    id: `st.${lc}.w2`,
    itemLabel: (_i, it) => `${it.name || 'Employer'} (${code})`,
    fields: {
      stateWages: { label: 'Box 16 State Wages', unit: 'usd', domId: lineDom('box16') },
      withheld: { label: 'Box 17 State Tax Withheld', unit: 'usd', domId: lineDom('box17') },
      localWages: { label: 'Box 18 Local Wages', unit: 'usd', domId: it => `w2-${Math.floor(it.id / 1000)}-state-card-${it.id % 1000}` },
      localWithheld: { label: 'Box 19 Local Tax Withheld', unit: 'usd', domId: it => `w2-${Math.floor(it.id / 1000)}-state-card-${it.id % 1000}` },
      daysIn: { label: 'Days Worked in State', unit: 'count', optional: true, domId: lineDom('days-in') },
      daysTotal: { label: 'Total Work Days', unit: 'count', optional: true, domId: lineDom('days-total') }
    }
  });
  const srcDom = (it: CollectionItem) => `input-source-${it.id}-amount`;
  g.collection({ id: `st.${lc}.srcInt`, itemLabel: (_i, it) => `1099-INT (${it.name || 'Payer'})`,
    fields: { amount: { label: 'Interest', unit: 'usd', domId: srcDom, allowNegative: true }, accrued: { label: 'Accrued Interest Paid', unit: 'usd', domId: srcDom } } });
  g.collection({ id: `st.${lc}.srcOther`, itemLabel: (_i, it) => it.name || 'Income',
    fields: { amount: { label: 'Amount', unit: 'usd', domId: srcDom, allowNegative: true } } });

  g.collection({ id: `st.${lc}.estpay`, itemLabel: () => `${code} estimated payments`,
    fields: { amount: { label: 'Amount', unit: 'usd', domId: it => `input-state-panel-${it.id}`, panelKey: 'state-estimated-payments', panelSection: 'credits' } } });
  g.quantity({ id: S('estimatedPayments'), label: `${code} Estimated & Extension Payments`, unit: 'usd', category: 'withholding', optional: true,
    expr: each(`st.${lc}.estpay`, 'amount') });
  g.quantity({ id: S('w2Wages'), label: `${code} W-2 Wages (Box 16)`, unit: 'usd', category: 'state', expr: each(`st.${lc}.w2`, 'stateWages') });
  // Nonresident wage sourcing: with work days entered, wages are allocated by days physically worked in the state — except in
  // convenience-of-the-employer states, where days worked at home for the employee's convenience count as in-state days.
  const convenience = CONVENIENCE_STATES.includes(code) || (RETALIATORY_CONVENIENCE.includes(code) && CONVENIENCE_STATES.concat(RETALIATORY_CONVENIENCE).includes(plan.resident));
  g.quantity({ id: S('sourcedWages'), label: convenience ? `${code} Wages (convenience-of-employer rule)` : `${code} Wages Sourced by Days Worked`, unit: 'usd', category: 'state',
    expr: convenience ? R(S('w2Wages')) : round(sumOver(`st.${lc}.w2`, when(gt(field('daysTotal'), num(0)), mul(field('stateWages'), min(num(1), div(field('daysIn'), field('daysTotal')))), field('stateWages')))) });
  g.quantity({ id: S('w2Withheld'), label: `${code} Tax Withheld (Box 17)`, unit: 'usd', category: 'withholding', expr: each(`st.${lc}.w2`, 'withheld') });
  g.quantity({ id: S('localWages'), label: `${code} Local Wages`, unit: 'usd', display: 'inline', expr: each(`st.${lc}.w2`, 'localWages') });
  g.quantity({ id: S('localWithheld'), label: `${code} Local Tax Withheld`, unit: 'usd', category: 'withholding', optional: true, expr: each(`st.${lc}.w2`, 'localWithheld') });
  g.quantity({ id: S('documentIncome'), label: `${code}-Sourced 1099 Income`, unit: 'usd', category: 'state', optional: true,
    expr: add(sumOver(`st.${lc}.srcInt`, atLeast0(sub(field('amount'), field('accrued')))), each(`st.${lc}.srcOther`, 'amount')) });
  if (plan.rentalState === code) {
    g.quantity({ id: S('rentalNet'), label: `${code} Rental Income`, unit: 'usd', category: 'state', expr: R('fed.rentalAllowed') });
    g.quantity({ id: S('rentalGross'), label: `${code} Gross Rents`, unit: 'usd', display: 'inline', expr: R('in.rents') });
  } else {
    g.quantity({ id: S('rentalNet'), label: `${code} Rental Income`, unit: 'usd', optional: true, expr: lit(0) });
    g.quantity({ id: S('rentalGross'), label: `${code} Gross Rents`, unit: 'usd', display: 'inline', optional: true, expr: lit(0) });
  }

  const rule = getStateTaxRule(code, plan.year);
  g.param({ id: S('stdBase'), label: `${code} Standard Deduction`, unit: 'usd', domSources: ['select-filing-status'],
    source: rule.formResident, resolve: c => rule.standardDeduction[c.status as CoreFilingStatus] || 0 });
  if (rule.brackets) {
    g.param({ id: S('brackets'), label: `${code} Tax Brackets`, unit: 'usd', domSources: ['select-filing-status', 'select-tax-year'], source: rule.formResident,
      resolve: c => rule.brackets![c.status as CoreFilingStatus] || rule.brackets!.single || [] });
  }
  g.param({ id: S('flatRate'), label: `${code} Flat Rate`, unit: 'rate', source: rule.formResident, domSources: ['select-tax-year'], resolve: () => rule.flatRate || 0 });
  ['otherIncome', 'adjustments', 'credits', 'itemized'].forEach(k => {
    g.input({ id: `in.st.${lc}.${k}`, label: `${code} Other ${k === 'itemized' ? 'Itemized Deductions' : k.replace(/([A-Z])/g, ' $1')}`, unit: 'usd',
      domId: 'section-state-inputs', optional: true });
  });
}

/** Tax from brackets or a flat rate, per the state's rule table. */
function ruleTax(code: string, rule: StateTaxRuleDefinition, taxable: Expr): Expr {
  return rule.isFlat || !rule.brackets ? mul(taxable, P(sid(code, 'flatRate'))) : brackets(taxable, sid(code, 'brackets'));
}

// ---------- resident panel items (state-specific caps per item) ----------

function panelItemExpr(key: string, code: string): Expr {
  const amt = field('amount');
  const agi = R(sid(code, 'agi'));
  const byMfj = (mfj: number, other: number) => when(MFJ, lit(mfj), lit(other));
  switch (key) {
    case 'ma-rent-deduction': return min(lit(4000), round(mul(amt, rate(0.5))));
    case 'ma-commuter-deduction': return min(lit(750), atLeast0(sub(amt, lit(150))));
    case 'ny-529-deduction': return min(byMfj(10000, 5000), amt);
    case 'ny-tuition-credit': return min(lit(400), round(mul(amt, rate(0.04))));
    case 'nj-property-tax-deduction': return min(lit(15000), amt);
    case 'dc-529-deduction': return min(byMfj(8000, 4000), amt);
    case 'pa-529-deduction': return min(lit(18000), amt);
    case 'oh-bid': return min(lit(250000), amt);
    case 'in-renters-deduction': return min(lit(3000), amt);
    case 'in-529-credit': return min(lit(1500), round(mul(amt, rate(0.2))));
    case 'wi-school-prop-credit': return min(lit(300), round(mul(amt, rate(0.12))));
    case 'ct-property-tax-credit': return min(lit(300), amt);
    case 'va-529-deduction': return min(lit(4000), amt);
    case 'ut-my529-credit': return round(mul(amt, rate(0.0455)));
    case 'al-529-deduction': case 'ar-529-deduction': case 'ct-529-deduction': case 'mi-529-deduction': return min(byMfj(10000, 5000), amt);
    case 'az-529-deduction': return min(byMfj(4000, 2000), amt);
    case 'ga-529-deduction': return min(byMfj(8000, 4000), amt);
    case 'id-529-deduction': return min(byMfj(12000, 6000), amt);
    case 'il-529-deduction': case 'ok-529-deduction': return min(byMfj(20000, 10000), amt);
    case 'ks-529-deduction': case 'mt-529-deduction': return min(byMfj(6000, 3000), amt);
    case 'md-529-deduction': return min(lit(2500), amt);
    case 'mo-529-deduction': return min(byMfj(16000, 8000), amt);
    case 'ne-529-deduction': return min(when(statusIs('married_separate'), lit(5000), lit(10000)), amt);
    case 'nj-529-deduction': return when(lte(agi, lit(200000)), min(lit(10000), amt), lit(0));
    case 'nj-child-credit': return when(lte(agi, lit(80000)), min(mul(max(num(1), R('fed.ctcChildren')), lit(1000)), amt), lit(0));
    case 'nj-medical-2pct': return atLeast0(round(sub(amt, mul(agi, rate(0.02)))));
    case 'ga-child-care-credit': return round(mul(amt, rate(0.3)));
    case 'ok-child-care-credit': return round(mul(amt, rate(0.2)));
    case 'mt-elderly-homeowner-credit': return min(lit(1150), amt);
    case 'or-529-credit': return min(byMfj(340, 170), amt);
    case 'ca-renters-credit': return min(byMfj(120, 60), amt);
    case 'sc-two-wage-earner-credit': return min(lit(350), amt);
    default: return amt;
  }
}

function definePanels(g: FormulaGraph, code: string, resident: boolean): void {
  const lc = code.toLowerCase();
  PANEL_SECTIONS.forEach(section => {
    const slot = SECTION_SLOT[section];
    const terms: Expr[] = [];
    if (resident) {
      residentPanelKeys(code).forEach(key => {
        const entry = STATE_PANEL_CATALOG.find(e => e.key === key);
        const collId = `st.${lc}.panel.${slot}.${key}`;
        g.collection({ id: collId, itemLabel: () => entry?.title || 'State Item',
          fields: { amount: { label: entry ? '' : 'Amount', unit: 'usd', domId: it => `input-state-panel-${it.id}` } } });
        terms.push(sumOver(collId, panelItemExpr(key, code)));
      });
    } else {
      const collId = `st.${lc}.nrpanel.${section}`;
      g.collection({ id: collId, itemLabel: (_i, it) => it.name || 'State Item',
        fields: { amount: { label: 'Amount', unit: 'usd', domId: it => `input-state-panel-${it.id}` } } });
      terms.push(each(collId, 'amount'));
    }
    const inputKey = section === 'other-income' ? 'otherIncome' : section === 'adjustments' ? 'adjustments' : section === 'credits' ? 'credits' : 'itemized';
    terms.push(R(`in.st.${lc}.${inputKey}`));
    const label = { 'other-income': 'Other Income', adjustments: 'Adjustments', credits: 'Credits', itemized: 'Itemized Deductions' }[section];
    g.quantity({ id: sid(code, `panel${slot}`), label: `${code} State ${label} (Your Entries)`, unit: 'usd', category: 'state', optional: true, expr: add(...terms) });
  });
}

// ---------- resident return ----------

const STATE_PERSONAL_EXEMPTION: Record<string, number> = {
  AL: 1500, CT: 15000, HI: 1144, IL: 2775, IN: 1000, KS: 9160, MD: 3200, ME: 5000, MI: 5600, MS: 6000, NJ: 1000, OH: 2400,
  OK: 1000, RI: 4900, VA: 930, VT: 5100, WI: 700, WV: 2000
};
const STATE_DEPENDENT_EXEMPTION: Record<string, number> = {
  NY: 1000, NJ: 1500, IL: 2775, MA: 1000, MI: 5600, MD: 3200, GA: 4000, IN: 1500, MN: 5050, SC: 4610, VA: 930, WV: 2000, OH: 2400,
  OK: 1000, RI: 4900, VT: 5100, WI: 700, KS: 2320
};
const STATE_EITC_MULTIPLIERS: Record<string, number> = {
  NY: 0.30, NJ: 0.40, DC: 0.70, MI: 0.30, IL: 0.20, MA: 0.40, CT: 0.40, MD: 0.45, VA: 0.20, ME: 0.25, NM: 0.25, RI: 0.16, IA: 0.15,
  KS: 0.17, IN: 0.10, NE: 0.10, LA: 0.05, SC: 1.25, VT: 0.38, CO: 0.38, OR: 0.09, CA: 0.45
};
const LTCG_EXCLUSION: Record<string, number> = { SC: 0.44, NM: 0.40, ND: 0.40, WI: 0.30, AR: 0.50, AZ: 0.25, VT: 0.40 };
const LOCAL_PASSTHROUGH = ['PA', 'OH', 'IN', 'KY', 'MI', 'MO', 'DE', 'AL', 'OR'];
/** States that do not add back (all) other states' municipal bond interest — simplified: IN taxes only bonds bought after 2011, UT only bonds of states that tax UT bonds. */
const MUNI_ADDBACK_EXEMPT = ['IN', 'UT'];
/** States that compute nonresident tax as (tax on all income as a resident) × (state-source share). */
const NONRESIDENT_RATIO_METHOD = ['AR', 'CA', 'CO', 'CT', 'IA', 'KS', 'ME', 'MN', 'MO', 'MT', 'NE', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'RI', 'UT', 'VT', 'WV'];
/** States that tax some Social Security benefits (each with its own exemptions — not yet modeled). */
const MFS = statusIs('married_separate');
/** States whose itemized deductions start from federal Schedule A (state income taxes removed); KY and NC have their own lists. */
const STATE_SCHEDULE_A = ['AL', 'AZ', 'AR', 'DE', 'GA', 'HI', 'ID', 'KS', 'KY', 'ME', 'MN', 'MS', 'MO', 'NE', 'NC', 'OK', 'OR'];
/** Convenience-of-the-employer rule (NY, DE, NE, PA); CT and NJ apply it only to residents of states that have such a rule. */
const CONVENIENCE_STATES = ['NY', 'DE', 'NE', 'PA'];
const RETALIATORY_CONVENIENCE = ['CT', 'NJ'];
/** Active-duty military pay: excluded for residents wherever stationed, or only while stationed outside the state. */
const MILITARY_EXEMPT = ['AR', 'AZ', 'IA', 'IL', 'IN', 'KY', 'MI', 'MN', 'MO', 'MT', 'ND', 'NM', 'OK', 'WI'];
const MILITARY_EXEMPT_OUT_OF_STATE = ['CA', 'ID', 'ME', 'NJ', 'NY', 'OH', 'OR', 'PA', 'VT'];
const taxpayerAgeKnown = quietly(gt(R('in.taxpayerBirthYear'), num(0)));

const spouseAgeKnown = quietly(and(MFJ, gt(R('in.spouseBirthYear'), num(0))));
/** A per-person amount by age tier: tiers are [minimum age, amount], highest first; `base` applies below every tier or when the age is unknown. */
function byAge(age: Expr, known: Cond, tiers: Array<[number, number]>, base: number): Expr {
  return tiers.reduceRight<Expr>((rest, [minAge, amount]) => when(and(known, gte(age, num(minAge))), lit(amount), rest), lit(base));
}
/** Taxpayer's amount plus the spouse's on a joint return. */
function perPerson(tiers: Array<[number, number]>, base = 0): Expr {
  return add(byAge(R('fed.taxpayerAge'), taxpayerAgeKnown, tiers, base), when(MFJ, byAge(R('fed.spouseAge'), spouseAgeKnown, tiers, base), lit(0)));
}
const nonEarlyRetirement = (): Expr => atLeast0(sub(R('fed.retirement'), R('fed.earlyDistributions')));

interface RetirementRule {
  label: string;
  /** Set when the exclusion depends on state income before the exclusion (computed as its own line). */
  incomeTest?: string;
  expr: (incomeTest: Expr) => Expr;
  ageDeduction?: { label: string; expr: (retirementDeduction: Expr) => Expr };
}

/**
 * State retirement-income exclusions and age deductions (2024/2025 law):
 *  IL, MS, IA (55+), PA — qualified retirement income fully excluded.
 *  NY IT-201 line 29: $20,000 per person 59½+ (age 60+ by year end used: no birth month is collected).
 *  NJ-1040 line 28a: 62+; NJ gross income ≤ $100,000 → up to $100,000 MFJ / $75,000 / $50,000 MFS;
 *    $100,001–$125,000 → 50% / 37.5% / 25% of pension income; $125,001–$150,000 → 25% / 18.75% / 12.5%; above → none.
 *  GA IT-RET: $35,000 at 62–64, $65,000 at 65+, per person (retirement, interest, dividends, net capital gain).
 *  SC §12-6-1170: retirement deduction $3,000 (under 65) / $10,000 (65+) per person; age-65 deduction $15,000 less the retirement deduction.
 *  CO §39-22-104(4)(f): pension/annuity subtraction $20,000 at 55–64, $24,000 at 65+, per person (includes SS not already subtracted).
 *  KY §141.010(10): $31,110 per person.   AR §26-51-307: $6,000 per person.   AL §40-18-19: first $6,000 per person 65+.
 *  DE §1106(b)(4): pension exclusion $12,500 at 60+, $2,000 under 60, per person.
 *  VA §58.1-322.03: age deduction $12,000 per person 65+, less $1 per $1 of AGI (excluding SS) over $50,000 single / $75,000 married.
 */
function retirementExclusion(code: string, year = 2024): RetirementRule | null {
  const ret = nonEarlyRetirement();
  const capped = (cap: Expr, income: Expr = ret) => min(income, cap);
  switch (code) {
    case 'IL': case 'MS':
      return { label: `${code} Retirement Income Exclusion`, expr: () => R('fed.retirement') };
    case 'PA':
      return { label: 'PA Retirement Income Exclusion (non-early distributions)', expr: () => ret };
    case 'RI': { // pension & annuity modification: $20,000 (2024) / $50,000 (2025+) per person at full retirement age, same AGI limit
      const cap = year >= 2025 ? 50000 : 20000;
      return { label: `RI Pension & Annuity Modification (${cap === 50000 ? '$50,000' : '$20,000'} per person)`,
        expr: () => when(lte(R('fed.agi'), riAgiLimit(year)), capped(mul(riFraPeople(), lit(cap))), lit(0)) };
    }
    case 'IA':
      return { label: 'IA Retirement Income Exclusion (age 55+)', expr: () => when(gt(perPerson([[55, 1]]), num(0)), ret, lit(0)) };
    case 'NY':
      return { label: 'NY Pension & Annuity Exclusion ($20,000 per person 59½+)', expr: () => capped(perPerson([[60, 20000]])) };
    case 'NJ': {
      const eligible = gt(perPerson([[62, 1]]), num(0));
      const pick3 = (mfj: number, single: number, mfs: number) => when(MFJ, lit(mfj), when(MFS, lit(mfs), lit(single)));
      return {
        label: 'NJ Pension Exclusion (age 62+)', incomeTest: 'NJ Gross Income Before Pension Exclusion',
        expr: (gross) => when(eligible,
          when(lte(gross, lit(100000)), capped(pick3(100000, 75000, 50000)),
            when(lte(gross, lit(125000)), round(mul(ret, pick3(0.5, 0.375, 0.25))),
              when(lte(gross, lit(150000)), round(mul(ret, pick3(0.25, 0.1875, 0.125))), lit(0)))), lit(0))
      };
    }
    case 'GA':
      return { label: 'GA Retirement Income Exclusion (62–64: $35,000 · 65+: $65,000)',
        expr: () => capped(perPerson([[65, 65000], [62, 35000]]), add(ret, R('fed.interestTotal'), R('fed.dividends'), atLeast0(R('fed.capNet')))) };
    case 'SC':
      return { label: 'SC Retirement Deduction ($3,000 · 65+: $10,000)', expr: () => capped(perPerson([[65, 10000]], 3000)),
        ageDeduction: { label: 'SC Age 65+ Deduction ($15,000 less retirement deduction)',
          expr: (retDed) => atLeast0(sub(perPerson([[65, 15000]]), min(retDed, perPerson([[65, 10000]])))) } };
    case 'CO':
      return { label: 'CO Pension & Annuity Subtraction (55–64: $20,000 · 65+: $24,000)',
        expr: () => capped(perPerson([[65, 24000], [55, 20000]]), add(ret, atLeast0(sub(R('fed.taxableSS'), R(sid(code, 'ssSubtraction')))))) };
    case 'KY':
      return { label: 'KY Pension Income Exclusion ($31,110 per person)', expr: () => capped(perPerson([], 31110)) };
    case 'AR':
      return { label: 'AR Retirement Income Exclusion ($6,000 per person)', expr: () => capped(perPerson([], 6000)) };
    case 'AL':
      return { label: 'AL Retirement Income Exclusion ($6,000 per person 65+)', expr: () => capped(perPerson([[65, 6000]])) };
    case 'DE':
      return { label: 'DE Pension Exclusion (under 60: $2,000 · 60+: $12,500)', expr: () => capped(perPerson([[60, 12500]], 2000)) };
    case 'VA':
      return { label: 'VA Age Deduction ($12,000 per person 65+, income-tested)',
        expr: () => atLeast0(sub(perPerson([[65, 12000]]), atLeast0(sub(sub(R('fed.agi'), R('fed.taxableSS')), when(MFJ, lit(75000), lit(50000)))))) };
    default:
      return null;
  }
}

/**
 * Subtraction for federally taxable Social Security (null = fully taxed, i.e. no subtraction line).
 * Sources: CT Schedule 1 SS worksheet; NM §7-2-5.14 (2022+); MN §290.0132 subd. 26 (House Research 2024/2025
 * thresholds); VT Dept. of Taxes SS exemption page (2025 +$5,000); WV §11-21-12 (2024 35%, 2025 65% above the limits);
 * CO §39-22-104(4)(f) (65+ full SS subtraction; 2025+ ages 55–64 with AGI ≤ $75,000 / $95,000).
 * UT taxes SS but gives a credit (see ssCredit). MT (2024+) and RI are taxed as federal — RI's modification is not yet modeled.
 */
/** Rhode Island modification AGI limits (2026 reuses 2025 until published). */
const riAgiLimit = (year: number): Expr => year >= 2025
  ? when(MFJ, lit(133500), lit(107000))
  : when(MFJ, lit(130250), when(MFS, lit(104225), lit(104200)));
/** Reached Social Security full retirement age by year end (66 if born 1954 or earlier, 67 if born 1960 or later; the
 *  1955-1959 cohorts reach it at 66 and 2-10 months, so with only a birth year they count once they turn 67). */
const fraReached = (age: Expr, birthYear: Expr, known: Cond): Cond => and(known, or(gte(age, num(67)), and(gte(age, num(66)), lte(birthYear, num(1954)))));
const riFraPeople = (): Expr => add(when(fraReached(R('fed.taxpayerAge'), R('in.taxpayerBirthYear'), taxpayerAgeKnown), num(1), num(0)),
  when(fraReached(R('fed.spouseAge'), R('in.spouseBirthYear'), quietly(and(MFJ, gt(R('in.spouseBirthYear'), num(0))))), num(1), num(0)));
const riReachedFra = (): Cond => gt(riFraPeople(), num(0));

function ssSubtractionExpr(code: string, year: number): Expr | null {
  const tss = R('fed.taxableSS');
  const agi = R('fed.agi');
  const y25 = year >= 2025;
  switch (code) {
    case 'CT': // full if AGI < $75k ($100k joint/HOH); otherwise taxable SS above 25% of benefits is subtracted
      return when(lt(agi, when(statusIs('single', 'married_separate'), lit(75000), lit(100000))), tss,
        atLeast0(sub(tss, round(mul(R('fed.ssaGross'), rate(0.25))))));
    case 'NM':
      return when(lte(agi, when(MFS, lit(75000), when(statusIs('single'), lit(100000), lit(150000)))), tss, lit(0));
    case 'MN': { // 10% less per $4,000 ($2,000 MFS) of AGI (or part) above the threshold
      const thr = when(MFJ, lit(y25 ? 108320 : 105380), when(MFS, lit(y25 ? 54160 : 52690), lit(y25 ? 84490 : 82190)));
      const steps = ceil(div(atLeast0(sub(agi, thr)), when(MFS, lit(2000), lit(4000))));
      return round(mul(tss, max(num(0), sub(num(1), mul(steps, rate(0.1))))));
    }
    case 'VT': { // full to the threshold, then phased out over $10,000
      const top = add(when(MFJ, lit(y25 ? 70000 : 65000), lit(y25 ? 55000 : 50000)), lit(10000));
      return round(mul(tss, min(num(1), max(num(0), div(sub(top, agi), lit(10000))))));
    }
    case 'WV':
      // WV §11-21-12: 35% (2024), 65% (2025), 100% (2026+) above the income limits.
      if (year >= 2026) return tss;
      return when(lte(agi, when(MFJ, lit(100000), lit(50000))), tss, round(mul(tss, rate(y25 ? 0.65 : 0.35))));
    case 'CO': {
      const age = R('fed.taxpayerAge');
      const eligible = y25 ? or(gte(age, num(65)), and(gte(age, num(55)), lte(agi, when(MFJ, lit(95000), lit(75000))))) : gte(age, num(65));
      return when(and(taxpayerAgeKnown, eligible), tss, lit(0));
    }
    case 'RI': // all or nothing: full retirement age and federal AGI at or under the limit (RI Pub. 2025-01 / 2026-01)
      return when(and(riReachedFra(), lte(agi, riAgiLimit(year))), tss, lit(0));
    case 'MT': case 'UT':
      return null;
    default:
      return tss;
  }
}
/** States that exempt unemployment compensation. */
const UI_EXEMPT_STATES = ['CA', 'NJ', 'PA', 'VA'];
/** States whose starting point is federal taxable income. */
const FTI_STATES = ['CO', 'ND', 'SC'];
/** State EITCs that can only offset tax (all other modeled state EITCs are refundable). */
const NONREFUNDABLE_EITC = ['SC', 'VA'];
/** States whose modeled exemption/child credit is refundable (NY Empire State, MN, NM, VT child credits; MA Child & Family). */
const REFUNDABLE_EXEMPTION_CREDIT = ['NY', 'MN', 'NM', 'VT', 'MA'];

function defineResident(g: FormulaGraph, plan: ReturnPlan): void {
  const code = plan.resident;
  const year = plan.year;
  const S = (slot: string) => sid(code, slot);
  const q = (slot: string, def: Omit<QuantityDef, 'id'>) => g.quantity({ id: S(slot), ...def });
  const rule = getStateTaxRule(code, year);
  defineStateDocuments(g, plan, code);
  definePanels(g, code, true);

  q('withholding', { label: `${code} Tax Withheld & Paid`, unit: 'usd', category: 'withholding', expr: add(R(S('w2Withheld')), R(S('estimatedPayments'))) });

  // ---------- states without a wage income tax ----------
  if (!rule.hasIncomeTax || (code === 'NH')) {
    if (code === 'WA') {
      const thr = year === 2025 ? 278000 : 270000;
      q('ltcgExciseTax', { label: 'WA Capital Gains Excise Tax', unit: 'usd', form: 'WA Capital Gains Excise Tax Return', category: 'state', optional: true,
        expr: when(gt(R('ret.netLtcg'), lit(thr)), round(mul(sub(R('ret.netLtcg'), lit(thr)), rate(0.07))), lit(0)) });
      q('wftc', { label: 'Working Families Tax Credit', unit: 'usd', form: 'WA WFTC', category: 'state_credit', optional: true,
        expr: when(gt(R('fed.eitc'), lit(0)), min(lit(1290), add(lit(325), mul(R('fed.ctcChildren'), lit(325)))), lit(0)) });
      q('totalTax', { label: 'WA Total Tax', unit: 'usd', category: 'state', expr: R(S('ltcgExciseTax')) });
      q('net', { label: 'WA Refund / (Owed)', unit: 'usd', category: 'state',
        expr: when(gt(R(S('ltcgExciseTax')), lit(0)), sub(R(S('withholding')), R(S('ltcgExciseTax'))), add(R(S('withholding')), R(S('wftc')))) });
      return;
    }
    if (code === 'NH' && year === 2024) {
      g.param({ id: S('idExemption'), label: 'NH I&D Exemption', unit: 'usd', domSources: ['select-filing-status'], source: 'Form DP-10',
        resolve: c => (c.status === 'married_joint' ? 4800 : 2400) });
      q('idTax', { label: 'NH Interest & Dividends Tax', unit: 'usd', form: 'Form DP-10', category: 'state', optional: true,
        expr: when(gt(R('ret.interestDividends'), P(S('idExemption'))), round(mul(sub(R('ret.interestDividends'), P(S('idExemption'))), rate(0.03))), lit(0)) });
      q('totalTax', { label: 'NH Total Tax', unit: 'usd', category: 'state', expr: R(S('idTax')) });
    } else {
      q('totalTax', { label: `${code} Income Tax (${rule.name} has no wage income tax)`, unit: 'usd', category: 'state', expr: lit(0) });
    }
    q('net', { label: `${code} Refund / (Owed)`, unit: 'usd', category: 'state', expr: sub(R(S('withholding')), R(S('totalTax'))) });
    return;
  }

  // ---------- starting point & modifications ----------
  // Starting point: federal taxable income for FTI states, otherwise federal AGI (own-income states
  // reach their base through the additions/subtractions below).
  const startsFromFti = FTI_STATES.includes(code) || (code === 'MT' && year >= 2024);
  q('startingPoint', { label: startsFromFti ? `${code} Starting Income (Federal Taxable Income)` : `${code} Starting Income (Federal AGI)`,
    unit: 'usd', category: 'state', expr: startsFromFti ? R('fed.taxableIncome') : R('fed.agi') });
  const additions: Expr[] = [];
  const subtractions: Expr[] = [];
  // Municipal bond interest from other states is federally exempt but taxable on most state returns.
  if (!MUNI_ADDBACK_EXEMPT.includes(code)) {
    q('muniAddBack', { label: `${code} Addition: Other States' Municipal Bond Interest`, unit: 'usd', category: 'state', optional: true, expr: R('ret.outOfStateMuniInterest') });
    additions.push(R(S('muniAddBack')));
  }
  if (code === 'CA' || code === 'NJ') {
    q('hsaAddBack', { label: `${code} HSA Add-Back`, unit: 'usd', category: 'state', optional: true, expr: R('fed.hsaDeduction') });
    additions.push(R(S('hsaAddBack')));
  }
  if (code === 'NJ') {
    // NJ gross income allows no deduction for IRA contributions or student loan interest.
    q('adjustmentAddBack', { label: 'NJ Add-Back of IRA & Student Loan Deductions', unit: 'usd', category: 'state', optional: true,
      expr: add(R('fed.iraDeduction'), R('fed.studentLoanDeduction')) });
    additions.push(R(S('adjustmentAddBack')));
  }
  if (code === 'PA') {
    q('paAddBack', { label: 'PA Non-Conformity Add-Back (IRA/HSA/Student Loan/Capital Loss)', unit: 'usd', category: 'state', optional: true,
      expr: add(R('fed.iraDeduction'), R('fed.hsaDeduction'), R('fed.studentLoanDeduction'),
        when(lt(add(R('fed.shortTermGain'), R('fed.longTermGain')), lit(0)), neg(max(lit(-3000), add(R('fed.shortTermGain'), R('fed.longTermGain')))), lit(0))) });
    additions.push(R(S('paAddBack')));
  }
  if (code === 'CO') {
    q('saltAddBack', { label: 'CO State Income Tax Add-Back', unit: 'usd', category: 'state', optional: true,
      expr: when(gt(R('fed.itemizing'), num(0)), atLeast0(round(sub(R('fed.salt'), R('in.realEstateTax')))), lit(0)) });
    additions.push(R(S('saltAddBack')));
  }
  if (LTCG_EXCLUSION[code]) {
    const base = round(mul(R('ret.netLtcg'), rate(LTCG_EXCLUSION[code])));
    q('ltcgExclusion', { label: `${code} Capital Gain Exclusion (${LTCG_EXCLUSION[code] * 100}%)`, unit: 'usd', category: 'capital', optional: true,
      expr: code === 'VT' ? min(lit(5000), base) : base });
    subtractions.push(R(S('ltcgExclusion')));
  }
  // Social Security: exempt in every income-tax state except those below, which exempt part or all of it by income or age.
  const ssExempt = ssSubtractionExpr(code, year);
  if (ssExempt) {
    q('ssSubtraction', { label: `${code} Social Security Exemption`, unit: 'usd', category: 'state', optional: true, expr: ssExempt });
    subtractions.push(R(S('ssSubtraction')));
  }
  // Retirement income exclusions (C6). Pension income is pooled across spouses until 1099-R ownership exists (A4),
  // so a joint return gets each qualifying spouse's cap against the combined amount.
  const retirement = retirementExclusion(code, year);
  if (retirement) {
    if (retirement.incomeTest) q('retirementIncomeTest', { label: retirement.incomeTest, unit: 'usd', display: 'inline',
      expr: atLeast0(sub(add(R(S('startingPoint')), ...additions), ...subtractions)) });
    q('retirementSubtraction', { label: retirement.label, unit: 'usd', category: 'state', optional: true, expr: retirement.expr(R(S('retirementIncomeTest'))) });
    subtractions.push(R(S('retirementSubtraction')));
    if (retirement.ageDeduction) {
      q('ageDeduction', { label: retirement.ageDeduction.label, unit: 'usd', category: 'state', optional: true, expr: retirement.ageDeduction.expr(R(S('retirementSubtraction'))) });
      subtractions.push(R(S('ageDeduction')));
    }
  }
  // Active-duty military pay (resident returns).
  if (MILITARY_EXEMPT.includes(code) || MILITARY_EXEMPT_OUT_OF_STATE.includes(code)) {
    const militaryWages = each('w2', 'box1', 'military');
    q('militarySubtraction', { label: MILITARY_EXEMPT.includes(code) ? `${code} Active-Duty Military Pay Exclusion` : `${code} Military Pay Exclusion (stationed outside ${code})`,
      unit: 'usd', category: 'state', optional: true,
      expr: MILITARY_EXEMPT.includes(code) ? militaryWages
        : when(flag('ret.militaryHome', `stationed in ${code}`, `stationed outside ${code}`, 'check-military-home'), lit(0), militaryWages) });
    subtractions.push(R(S('militarySubtraction')));
  }
  // Unemployment compensation (1099-G) is not taxed by CA, NJ, PA or VA.
  if (UI_EXEMPT_STATES.includes(code)) {
    q('unemploymentSubtraction', { label: `${code} Unemployment Compensation Exclusion`, unit: 'usd', category: 'state', optional: true, expr: each('src.g', 'amount') });
    subtractions.push(R(S('unemploymentSubtraction')));
  }
  // A state income tax refund taxed federally is not income on the state return.
  q('refundSubtraction', { label: `${code} State Tax Refund Subtraction`, unit: 'usd', category: 'state', optional: true, expr: R('fed.taxableStateRefund') });
  subtractions.push(R(S('refundSubtraction')));
  // Interest on US obligations (Treasury bills/notes/bonds, savings bonds) is exempt from state income tax everywhere.
  q('treasurySubtraction', { label: 'US Government Interest Subtraction', unit: 'usd', category: 'state', optional: true, expr: R('fed.treasuryInterest') });
  subtractions.push(R(S('treasurySubtraction')));
  if (code === 'AL' || code === 'OR' || code === 'MO') {
    q('fedTaxDeduction', { label: `${code} Federal Income Tax Deduction`, unit: 'usd', category: 'state', optional: true,
      expr: code === 'AL' ? R('fed.totalTax')
        : code === 'OR' ? min(lit(8250), R('fed.totalTax'))
        : min(when(MFJ, lit(10000), lit(5000)), mul(R('fed.totalTax'), rate(0.35))) });
    subtractions.push(R(S('fedTaxDeduction')));
  }
  if (code === 'NJ') {
    q('propertyTaxDeduction', { label: 'NJ Property Tax Deduction', unit: 'usd', category: 'itemized', optional: true, expr: min(lit(15000), R('in.realEstateTax')) });
    subtractions.push(R(S('propertyTaxDeduction')));
  }
  q('agi', { label: `${code} Adjusted Income`, unit: 'usd', category: 'state',
    expr: atLeast0(sub(add(R(S('startingPoint')), ...additions), ...subtractions)) });

  // ---------- deductions ----------
  let baseStd: Expr = P(S('stdBase'));
  if (startsFromFti) baseStd = lit(0); // the federal deduction is already in federal taxable income
  else if (code === 'MD' && year < 2025) baseStd = min(when(MFJ, lit(5450), lit(2700)), max(when(MFJ, lit(3650), lit(1800)), round(mul(R(S('agi')), rate(0.15)), 'dollar')));
  else if (code === 'DE') baseStd = add(P(S('stdBase')), mul(min(num(2), R('fed.age65BlindBoxes')), lit(2500)));
  else if (code === 'WI') baseStd = atLeast0(round(sub(P(S('stdBase')), mul(atLeast0(sub(R(S('agi')), when(MFJ, lit(26360), lit(18220)))), when(MFJ, rate(0.19778), rate(0.12)))), 'dollar'));
  q('baseStdDeduction', { label: `${code} Standard Deduction`, unit: 'usd', category: 'state', expr: baseStd });

  const itemizes = ['NY', 'CA', 'DC', 'MD', 'VA'].includes(code) || STATE_SCHEDULE_A.includes(code);
  if (itemizes) {
    if (code === 'KY') {
      // KRS 141.019: itemized deductions limited to home mortgage interest, charitable contributions and investment interest.
      q('itemized', { label: 'KY Itemized Deductions (mortgage, charity, investment interest)', unit: 'usd', category: 'itemized', optional: true,
        expr: add(R('fed.mortgageDeduction'), R('fed.charityDeduction'), R('fed.investmentInterestDeduction')) });
    } else if (code === 'NC') {
      // N.C.G.S. 105-153.5(a)(2): mortgage interest plus property tax capped at $20,000 combined, charity, medical.
      q('itemized', { label: 'NC Itemized Deductions', unit: 'usd', category: 'itemized', optional: true,
        expr: add(min(lit(20000), add(R('fed.mortgageDeduction'), R('in.realEstateTax'))), R('fed.charityDeduction'), R('fed.medicalDeduction')) });
    } else if (STATE_SCHEDULE_A.includes(code)) {
      // Federal Schedule A without state and local income (or sales) taxes; property taxes kept within the federal cap.
      q('propertyTax', { label: `${code} Property Taxes Allowed`, unit: 'usd', display: 'inline',
        expr: min(R('fed.saltCap'), add(R('in.realEstateTax'), R('in.personalPropertyTax'))) });
      q('itemized', { label: `${code} Itemized Deductions (federal Schedule A less income taxes)`, unit: 'usd', category: 'itemized', optional: true,
        expr: add(R('fed.medicalDeduction'), R(S('propertyTax')), R('fed.mortgageDeduction'), R('fed.charityDeduction'), R('fed.casualtyDeduction'),
          R('fed.gamblingLossDeduction'), R('fed.investmentInterestDeduction')) });
    } else {
      q('propertyTax', { label: `${code} Property Tax Allowed`, unit: 'usd', display: 'inline', expr: code === 'CA' ? R('in.realEstateTax') : min(lit(10000), R('in.realEstateTax')) });
      q('itemized', { label: `${code} Itemized Deductions`, unit: 'usd', category: 'itemized', optional: true,
        expr: add(R('fed.medicalDeduction'), R(S('propertyTax')), R('fed.mortgageDeduction'), R('fed.charityDeduction')) });
    }
    const forceStandard = flag('fed.forceStandard', 'you chose the standard deduction', 'you did not force the standard deduction', 'select-deduction-method');
    q('deductionBase', { label: `${code} Deduction Used`, unit: 'usd', display: 'inline',
      expr: when(and(not(forceStandard), gt(R(S('itemized')), R(S('baseStdDeduction')))), R(S('itemized')), R(S('baseStdDeduction'))) });
  } else {
    q('deductionBase', { label: `${code} Deduction Used`, unit: 'usd', display: 'inline', expr: R(S('baseStdDeduction')) });
  }
  q('deduction', { label: `${code} Deduction`, unit: 'usd', category: 'state', expr: add(R(S('deductionBase')), R(S('panelItem'))) });

  // ---------- exemptions ----------
  const exTerms: Expr[] = [];
  if (code === 'CT') {
    q('personalExemption', { label: 'CT Personal Exemption', unit: 'usd', category: 'state', optional: true,
      expr: atLeast0(sub(when(MFJ, lit(24000), lit(15000)), atLeast0(sub(R(S('agi')), when(MFJ, lit(48000), lit(30000)))))) });
    exTerms.push(R(S('personalExemption')));
  } else if (code === 'IL') {
    q('personalExemption', { label: 'IL Personal Exemption', unit: 'usd', category: 'state', optional: true,
      expr: when(gt(R(S('agi')), when(MFJ, lit(500000), lit(250000))), lit(0), mul(P('st.taxpayerCount'), lit(stateExemptionForYear('IL', year, 'personal', 2775)))) });
    exTerms.push(R(S('personalExemption')));
  } else if (STATE_PERSONAL_EXEMPTION[code]) {
    q('personalExemption', { label: `${code} Personal Exemption`, unit: 'usd', category: 'state', optional: true,
      expr: mul(P('st.taxpayerCount'), lit(stateExemptionForYear(code, year, 'personal', STATE_PERSONAL_EXEMPTION[code]))) });
    exTerms.push(R(S('personalExemption')));
  }
  if (STATE_DEPENDENT_EXEMPTION[code]) {
    q('dependentExemption', { label: `${code} Dependent Exemption`, unit: 'usd', category: 'state', optional: true,
      expr: mul(R('ret.dependents'), lit(stateExemptionForYear(code, year, 'dependent', STATE_DEPENDENT_EXEMPTION[code]))) });
    exTerms.push(R(S('dependentExemption')));
  }
  if (code === 'NC') {
    q('childDeduction', { label: 'NC Child Deduction', unit: 'usd', category: 'state', optional: true,
      expr: mul(R('fed.ctcChildren'), when(lte(R(S('agi')), when(MFJ, lit(40000), lit(20000))), lit(3000),
        when(lte(R(S('agi')), when(MFJ, lit(100000), lit(50000))), lit(1500), lit(500)))) });
    exTerms.push(R(S('childDeduction')));
  }
  q('exemptions', { label: `${code} Exemptions`, unit: 'usd', category: 'state', optional: true, expr: exTerms.length ? add(...exTerms) : lit(0) });

  q('adjustedIncome', { label: `${code} Income After State Adjustments`, unit: 'usd', category: 'state',
    expr: atLeast0(sub(add(R(S('agi')), R(S('panelOther'))), R(S('panelAdj')))) });
  q('taxable', { label: `${code} Taxable Income`, unit: 'usd', category: 'state',
    expr: atLeast0(sub(R(S('adjustedIncome')), R(S('deduction')), R(S('exemptions')))) });

  // ---------- tax ----------
  let base: Expr;
  base = ruleTax(code, rule, R(S('taxable')));
  q('bracketTax', { label: `${code} Tax on Taxable Income`, unit: 'usd', category: 'state', expr: base });
  const taxTerms: Expr[] = [R(S('bracketTax'))];
  if (code === 'MA') {
    q('stcgSurtax', { label: 'MA Short-Term Gains Surtax (+3.5%)', unit: 'usd', category: 'state', optional: true,
      expr: when(and(gt(R('fed.shortTermGain'), lit(0)), gt(R(S('taxable')), lit(0))), round(mul(min(R('fed.shortTermGain'), R(S('taxable'))), rate(0.035))), lit(0)) });
    q('millionaireSurtax', { label: 'MA 4% Millionaire Surtax', unit: 'usd', category: 'state', optional: true,
      expr: when(gt(R(S('taxable')), lit(year >= 2025 ? 1083150 : 1053750)), round(mul(sub(R(S('taxable')), lit(year >= 2025 ? 1083150 : 1053750)), rate(0.04))), lit(0)) });
    taxTerms.push(R(S('stcgSurtax')), R(S('millionaireSurtax')));
  }
  if (code === 'CA') {
    q('mentalHealthTax', { label: 'CA 1% Mental Health Services Tax', unit: 'usd', category: 'state', optional: true,
      expr: when(gt(R(S('taxable')), lit(1000000)), round(mul(sub(R(S('taxable')), lit(1000000)), rate(0.01))), lit(0)) });
    taxTerms.push(R(S('mentalHealthTax')));
  }
  let tentative: Expr = add(...taxTerms);
  if (code === 'IL') {
    q('propertyTaxCredit', { label: 'IL 5% Property Tax Credit', unit: 'usd', category: 'state_credit', optional: true,
      expr: round(mul(R('in.realEstateTax'), rate(0.05))) });
    tentative = atLeast0(sub(tentative, R(S('propertyTaxCredit'))));
  }
  if (plan.priorState) {
    // Part-year resident: tax as a full-year resident × share of income received while a resident.
    q('residencyIncome', { label: `${code} Income While a Resident`, unit: 'usd', category: 'state',
      expr: add(R(S('w2Wages')), mul(R('ret.nonWageIncome'), sub(rate(1), R('ret.priorShare')))) });
    q('residencyRatio', { label: `${code} Part-Year Residency Ratio`, unit: 'rate', category: 'state',
      expr: when(gt(R('fed.agi'), lit(0)), min(rate(1), max(rate(0), div(R(S('residencyIncome')), R('fed.agi')))), rate(1)) });
    q('fullYearTax', { label: `${code} Tax as a Full-Year Resident`, unit: 'usd', category: 'state', expr: round(tentative) });
    q('tentativeTax', { label: `${code} Part-Year Tax`, unit: 'usd', category: 'state', expr: round(mul(R(S('fullYearTax')), R(S('residencyRatio')))) });
  } else {
    q('tentativeTax', { label: `${code} Tentative Tax`, unit: 'usd', category: 'state', expr: round(tentative) });
  }

  // ---------- local tax ----------
  let local: Expr = lit(0);
  if (plan.residentLocality === 'nyc') {
    g.param({ id: 'st.ny.nycBrackets', label: 'NYC Resident Tax Brackets', unit: 'usd', domSources: ['select-filing-status'], source: 'Form IT-201',
      resolve: c => NYC_LOCAL_BRACKETS[c.status as CoreFilingStatus] || NYC_LOCAL_BRACKETS.single });
    local = round(brackets(R(S('taxable')), 'st.ny.nycBrackets'));
  } else if (plan.residentLocality === 'yonkers') {
    local = round(mul(R(S('tentativeTax')), rate(0.1675)));
  } else if (code === 'MD') {
    local = when(or(gt(R(S('localWithheld')), lit(0)), gt(R(S('localWages')), lit(0))), round(mul(R(S('taxable')), rate(0.032))), lit(0));
  } else if (LOCAL_PASSTHROUGH.includes(code)) {
    local = R(S('localWithheld'));
  }
  const localLabel = plan.residentLocality === 'nyc' ? 'NYC Resident Income Tax' : plan.residentLocality === 'yonkers' ? 'Yonkers Resident Surcharge'
    : code === 'MD' ? 'MD County Income Tax (3.20%)' : `${code} Local Tax (W-2 Box 19)`;
  q('localTax', { label: localLabel, unit: 'usd', form: plan.residentLocality ? 'Form IT-201' : undefined, category: 'state', optional: true, expr: local });

  // ---------- credits ----------
  const ostcTerms: Expr[] = [];
  plan.nonresidents.forEach(nr => {
    const nrRule = getStateTaxRule(nr);
    // The previous state's part-year income is outside this state's residency share, so no credit applies.
    if (!nrRule.hasIncomeTax || nr === plan.priorState) return;
    const N = (slot: string) => sid(nr, slot);
    q(`ostcRatio.${nr.toLowerCase()}`, { label: `${nr} Share of ${code} Income`, unit: 'rate', display: 'inline',
      expr: when(gt(R(S('agi')), lit(0)), min(rate(1), div(R(N('incomeForCredit')), R(S('agi')))), rate(0)) });
    q(`ostc.${nr.toLowerCase()}`, { label: `Credit for Tax Paid to ${nr}`, unit: 'usd', category: 'state_credit', optional: true,
      expr: atLeast0(min(R(N('totalTax')), round(mul(R(S('tentativeTax')), R(S(`ostcRatio.${nr.toLowerCase()}`)))))) });
    ostcTerms.push(R(S(`ostc.${nr.toLowerCase()}`)));
  });
  q('otherStateCredit', { label: 'Credit for Taxes Paid to Other States', unit: 'usd', category: 'state_credit', optional: true,
    expr: ostcTerms.length ? add(...ostcTerms) : lit(0) });

  const eitcRate = STATE_EITC_MULTIPLIERS[code] || 0;
  q('stateEitc', { label: `${code} Earned Income Credit (${Math.round(eitcRate * 100)}% of Federal)`, unit: 'usd', category: 'state_credit', optional: true,
    expr: eitcRate === 0 ? lit(0)
      : code === 'CA' ? when(lte(R(S('adjustedIncome')), lit(31950)), round(mul(R('fed.eitc'), rate(eitcRate))), lit(0))
      : round(mul(R('fed.eitc'), rate(eitcRate))) });

  const tp = P('st.taxpayerCount');
  const deps = R('ret.dependents');
  const kids = R('fed.ctcChildren');
  const adj = R(S('adjustedIncome'));
  const perPerson = (amount: number) => mul(add(tp, deps), lit(amount));
  let exCredit: Expr = lit(0);
  let exLabel = `${code} Exemption Credits`;
  switch (code) {
    case 'CA':
      exLabel = 'CA Personal & Dependent Exemption Credits';
      exCredit = atLeast0(sub(add(mul(tp, lit(144)), mul(deps, lit(446))),
        when(gt(adj, when(MFJ, lit(474075), lit(237035))), mul(mul(ceil(div(sub(adj, when(MFJ, lit(474075), lit(237035))), lit(2500))), lit(6)), add(tp, deps)), lit(0))));
      break;
    case 'AZ': exLabel = 'AZ Dependent Credit'; exCredit = add(mul(kids, lit(100)), mul(R('fed.odcDependents'), lit(25))); break;
    case 'AR': exCredit = perPerson(29); break;
    case 'DE': exCredit = perPerson(110); break;
    case 'ID': exCredit = add(perPerson(120), mul(kids, lit(205))); break;
    case 'IA': exCredit = perPerson(40); break;
    case 'NE': exCredit = perPerson(157); break;
    case 'OR': exCredit = add(perPerson(249), when(and(gt(kids, num(0)), lte(adj, lit(30000))), mul(kids, lit(1000)), lit(0))); break;
    case 'UT':
      exLabel = 'UT Taxpayer Tax Credit';
      exCredit = atLeast0(round(sub(round(mul(add(R('fed.deduction'), mul(deps, lit(2000))), rate(0.06))),
        atLeast0(mul(sub(adj, when(MFJ, lit(33364), lit(16682))), rate(0.013))))));
      break;
    case 'MA': exLabel = 'MA Child & Family Credit'; exCredit = mul(deps, lit(440)); break;
    case 'NY': exLabel = 'NY Empire State Child Credit'; exCredit = when(lte(adj, when(MFJ, lit(110000), lit(75000))), mul(kids, lit(330)), lit(0)); break;
    case 'MN': exLabel = 'MN Child Tax Credit'; exCredit = when(lte(adj, lit(35000)), mul(kids, lit(1750)), lit(0)); break;
    case 'NM': exLabel = 'NM Child Income Tax Credit'; exCredit = when(lte(adj, lit(75000)), mul(kids, lit(600)), lit(0)); break;
    case 'VT': exLabel = 'VT Child Tax Credit'; exCredit = when(lte(adj, lit(125000)), mul(kids, lit(1000)), lit(0)); break;
    case 'PA':
      exLabel = 'PA Schedule SP Tax Forgiveness';
      exCredit = when(and(gt(adj, lit(0)), lte(adj, add(when(MFJ, lit(13000), lit(6500)), mul(deps, lit(9500))))), R(S('tentativeTax')), lit(0));
      break;
    case 'KY':
      exLabel = 'KY Family Size Tax Credit';
      exCredit = when(and(gt(adj, lit(0)), lte(adj, add(lit(15060), mul(deps, lit(5380))))), R(S('tentativeTax')), lit(0));
      break;
  }
  q('exemptionCredit', { label: exLabel, unit: 'usd', category: 'state_credit', optional: true, expr: exCredit });
  if (code === 'UT') {
    // TC-40 Social Security Benefits Credit: rate × taxable SS, less 25¢ per $1 of income above the threshold.
    // 2024: modified AGI (federal AGI + tax-exempt interest), $45,000 / $75,000 joint & HOH / $37,500 MFS.
    // 2025 (SB 71): state taxable income, $54,000 / $90,000 / $45,000.
    const y25 = year >= 2025;
    const thr = when(MFS, lit(y25 ? 45000 : 37500), when(statusIs('single'), lit(y25 ? 54000 : 45000), lit(y25 ? 90000 : 75000)));
    const income = y25 ? R(S('taxable')) : add(R('fed.agi'), R('fed.taxExemptInterest'));
    q('ssCredit', { label: 'UT Social Security Benefits Credit', unit: 'usd', form: 'TC-40A code AH', category: 'state_credit', optional: true,
      expr: atLeast0(round(sub(mul(R('fed.taxableSS'), P(S('flatRate'))), mul(atLeast0(sub(income, thr)), rate(0.25))))) });
  }
  if (plan.residentLocality === 'nyc') {
    // NYC school tax credit (fixed amount): $63, or $125 on joint returns, for income of $250,000 or less; refundable.
    q('nycSchoolTaxCredit', { label: 'NYC School Tax Credit', unit: 'usd', form: 'IT-201 Line 69', category: 'state_credit', optional: true,
      expr: when(lte(R(S('agi')), lit(250000)), when(MFJ, lit(125), lit(63)), lit(0)) });
  }

  // Nonrefundable credits can only reduce tax to $0; refundable credits are paid out like withholding.
  const eitcRefundable = eitcRate > 0 && !NONREFUNDABLE_EITC.includes(code);
  const exRefundable = REFUNDABLE_EXEMPTION_CREDIT.includes(code);
  const nonref: Expr[] = [R(S('otherStateCredit')), R(S('panelCred'))];
  if (code === 'UT') nonref.push(R(S('ssCredit')));
  const refundable: Expr[] = [];
  (eitcRefundable ? refundable : nonref).push(R(S('stateEitc')));
  (exRefundable ? refundable : nonref).push(R(S('exemptionCredit')));
  if (plan.residentLocality === 'nyc') refundable.push(R(S('nycSchoolTaxCredit')));
  q('nonrefundableCredits', { label: `${code} Nonrefundable Credits`, unit: 'usd', category: 'state_credit', optional: true, expr: add(...nonref) });
  q('refundableCredits', { label: `${code} Refundable Credits`, unit: 'usd', category: 'state_credit', optional: true, expr: refundable.length ? add(...refundable) : lit(0) });
  q('netStateTax', { label: `${code} Net State Tax`, unit: 'usd', category: 'state',
    expr: atLeast0(round(sub(R(S('tentativeTax')), R(S('nonrefundableCredits'))))) });
  q('totalTax', { label: `${code} Total Tax`, unit: 'usd', category: 'state', expr: round(add(R(S('netStateTax')), R(S('localTax')))) });
  q('totalWithholding', { label: `${code} Total Withholding`, unit: 'usd', category: 'withholding',
    expr: add(when(gt(R(S('localTax')), lit(0)), add(R(S('w2Withheld')), R(S('localWithheld'))), R(S('w2Withheld'))), R(S('estimatedPayments'))) });
  q('net', { label: `${code} Refund / (Owed)`, unit: 'usd', category: 'state',
    expr: round(sub(add(R(S('totalWithholding')), R(S('refundableCredits'))), R(S('totalTax')))) });
}

// ---------- nonresident returns ----------

function defineNonresident(g: FormulaGraph, plan: ReturnPlan, code: string): void {
  const S = (slot: string) => sid(code, slot);
  const q = (slot: string, def: Omit<QuantityDef, 'id'>) => g.quantity({ id: S(slot), ...def });
  const rule = getStateTaxRule(code, plan.year);
  const resRule = getStateTaxRule(plan.resident, plan.year);
  defineStateDocuments(g, plan, code);
  definePanels(g, code, false);

  q('withholding', { label: `${code} Tax Withheld & Paid`, unit: 'usd', category: 'withholding', expr: add(R(S('w2Withheld')), R(S('estimatedPayments'))) });
  const partYear = code === plan.priorState;
  if (partYear) {
    // Part-year resident of this state: W-2 wages earned here plus a months-based share of all other income.
    q('residentPeriodIncome', { label: `${code} Share of Other Income (months as a resident)`, unit: 'usd', category: 'state',
      expr: mul(R('ret.nonWageIncome'), R('ret.priorShare')) });
    q('income', { label: `${code} Part-Year Income`, unit: 'usd', category: 'state', expr: add(R(S('w2Wages')), R(S('residentPeriodIncome'))) });
  } else {
    q('income', { label: `${code}-Source Income`, unit: 'usd', category: 'state',
      expr: add(R(S('sourcedWages')), R(S('documentIncome')), atLeast0(R(S('rentalNet')))) });
  }

  const reciprocalByRule = !partYear && Boolean(rule.reciprocalWith?.includes(plan.resident) || resRule.reciprocalWith?.includes(code));
  const reciprocal: Cond = reciprocalByRule ? lte(R(S('rentalNet')), lit(0)) : gt(lit(0), lit(1));

  // Nonresident computation. Most states use one of two methods (see docs/state_local_tax_logic.md §2):
  //   ratio method   — tax all federal AGI as if a resident, then multiply by the state-source share;
  //   prorate method — tax only state-source income, with the standard deduction prorated by that share.
  q('adjustedIncome', { label: `${code}-Source Income After State Adjustments`, unit: 'usd', category: 'state',
    expr: atLeast0(sub(add(R(S('income')), R(S('panelOther'))), R(S('panelAdj')))) });
  q('incomeRatio', { label: `${code}-Source Share of Federal AGI`, unit: 'rate', category: 'state',
    expr: when(gt(R('fed.agi'), lit(0)), min(rate(1), div(R(S('adjustedIncome')), R('fed.agi'))), rate(1)) });
  // Personal and dependent exemptions (same amounts as for residents).
  const nrExTerms: Expr[] = [];
  if (STATE_PERSONAL_EXEMPTION[code]) nrExTerms.push(mul(P('st.taxpayerCount'), lit(stateExemptionForYear(code, plan.year, 'personal', STATE_PERSONAL_EXEMPTION[code]))));
  if (STATE_DEPENDENT_EXEMPTION[code]) nrExTerms.push(mul(R('ret.dependents'), lit(STATE_DEPENDENT_EXEMPTION[code])));
  const fullExemptions: Expr = nrExTerms.length ? add(...nrExTerms) : lit(0);
  if (NONRESIDENT_RATIO_METHOD.includes(code)) {
    q('deduction', { label: `${code} Standard Deduction`, unit: 'usd', category: 'state', expr: add(P(S('stdBase')), R(S('panelItem'))) });
    q('exemptions', { label: `${code} Exemptions`, unit: 'usd', category: 'state', optional: true, expr: fullExemptions });
    q('taxableIfResident', { label: `${code} Taxable Income as if Resident (all federal AGI)`, unit: 'usd', category: 'state',
      expr: atLeast0(sub(R('fed.agi'), R(S('deduction')), R(S('exemptions')))) });
    q('taxIfResident', { label: `${code} Tax as if Resident`, unit: 'usd', category: 'state', expr: ruleTax(code, rule, R(S('taxableIfResident'))) });
    q('taxable', { label: `${code} Taxable Income`, unit: 'usd', category: 'state', expr: R(S('taxableIfResident')) });
    q('tentativeTax', { label: `${code} Nonresident Tax (resident tax × ${code} share)`, unit: 'usd', category: 'state',
      expr: mul(R(S('taxIfResident')), R(S('incomeRatio'))) });
  } else {
    q('deduction', { label: `${code} Prorated Standard Deduction`, unit: 'usd', category: 'state',
      expr: add(mul(P(S('stdBase')), R(S('incomeRatio'))), R(S('panelItem'))) });
    q('exemptions', { label: `${code} Prorated Exemptions`, unit: 'usd', category: 'state', optional: true, expr: mul(fullExemptions, R(S('incomeRatio'))) });
    q('taxable', { label: `${code} Taxable Income`, unit: 'usd', category: 'state', expr: atLeast0(sub(R(S('adjustedIncome')), R(S('deduction')), R(S('exemptions')))) });
    q('tentativeTax', { label: `${code} Tax on Taxable Income`, unit: 'usd', category: 'state', expr: ruleTax(code, rule, R(S('taxable'))) });
  }
  const standard: Expr = atLeast0(round(sub(R(S('tentativeTax')), R(S('panelCred')))));
  let liability: Expr = !rule.hasIncomeTax ? lit(0) : when(reciprocal, lit(0), standard);
  let incomeForCredit: Expr = R(S('income'));

  if (code === 'DC') {
    // DC taxes nonresident unincorporated business / rental income on Form D-30.
    q('d30Receipts', { label: 'DC Gross Receipts', unit: 'usd', category: 'state', expr: when(gt(R(S('rentalGross')), lit(0)), R(S('rentalGross')), R(S('documentIncome'))) });
    q('d30Net', { label: 'DC Net Business Income', unit: 'usd', category: 'state',
      expr: when(gt(R(S('rentalGross')), lit(0)), atLeast0(R(S('rentalNet'))), R(S('documentIncome'))) });
    q('d30SalaryAllowance', { label: 'D-30 Salary Allowance (30%)', unit: 'usd', category: 'state', expr: round(mul(R(S('d30Net')), rate(0.3))) });
    q('d30Taxable', { label: 'D-30 Taxable Income', unit: 'usd', category: 'state', expr: atLeast0(sub(R(S('d30Net')), R(S('d30SalaryAllowance')), lit(5000))) });
    q('d30Tax', { label: 'D-30 Tax (8.25%, $250 minimum over $12,000 receipts)', unit: 'usd', form: 'Form D-30', category: 'state',
      expr: when(gt(R(S('d30Receipts')), lit(12000)), max(lit(250), round(mul(R(S('d30Taxable')), rate(0.0825)))), lit(0)) });
    const d30: Cond = and(lte(R(S('w2Wages')), lit(0)), or(gt(R(S('rentalGross')), lit(0)), gt(R(S('documentIncome')), lit(0))));
    liability = when(d30, R(S('d30Tax')), liability);
    incomeForCredit = when(d30, R(S('d30Net')), incomeForCredit);
  }
  q('incomeForCredit', { label: `${code} Income Taxed`, unit: 'usd', display: 'inline', expr: incomeForCredit });
  q('totalTax', { label: `${code} Total Tax`, unit: 'usd', category: 'state', expr: liability });
  q('totalWithholding', { label: `${code} Total Withholding`, unit: 'usd', category: 'withholding', expr: R(S('withholding')) });
  q('net', { label: `${code} Refund / (Owed)`, unit: 'usd', category: 'state', expr: sub(R(S('withholding')), R(S('totalTax'))) });
}

// ---------- unified totals ----------

function defineReturnTotals(g: FormulaGraph, plan: ReturnPlan): void {
  const codes = [plan.resident, ...plan.nonresidents].filter(Boolean);
  g.quantity({ id: 'ret.stateNet', label: 'All States Refund / (Owed)', unit: 'usd', category: 'state', expr: codes.length ? round(add(...codes.map(c => R(sid(c, 'net'))))) : lit(0) });
  g.quantity({ id: 'ret.grandTotal', label: 'Total Refund / (Owed)', unit: 'usd', category: 'refund', expr: round(add(R('fed.netResult'), R('ret.stateNet'))) });
}

// ---------- presentation: state calculation cards ----------

/** Cards for one state's calculations (presentation only — lists quantity ids). */
export function stateBlocks(plan: ReturnPlan, code: string, g: FormulaGraph): BlockSpec[] {
  const lc = code.toLowerCase();
  const S = (slot: string) => sid(code, slot);
  const has = (slot: string) => g.quantities.has(S(slot));
  const pick = (...slots: string[]) => slots.filter(has).map(S);
  const rule = getStateTaxRule(code);
  const name = rule.name;
  if (code === plan.resident) {
    if (!has('agi')) {
      return [{ id: `calc-state-${lc}-card`, stepLabel: `${name} • Resident Return`, title: rule.formResident, isOutput: true,
        quantities: [...pick('ltcgExciseTax', 'idTax', 'wftc'), ...pick('withholding', 'totalTax').map(id => ({ id, show: 'always' as const })),
          { id: S('net'), show: 'always' }] }];
    }
    const blocks: BlockSpec[] = [
      { id: `calc-state-${lc}-taxable`, stepLabel: `${name} • Step 1: Income, Deductions & Taxable Income`, title: `${code} Deductions & Taxable Income`,
        quantities: [S('w2Wages'), S('documentIncome'), { id: S('startingPoint'), show: 'always' },
          ...pick('muniAddBack', 'refundSubtraction', 'hsaAddBack', 'adjustmentAddBack', 'paAddBack', 'saltAddBack', 'ssSubtraction', 'retirementIncomeTest', 'retirementSubtraction', 'ageDeduction', 'militarySubtraction', 'unemploymentSubtraction', 'treasurySubtraction', 'ltcgExclusion', 'fedTaxDeduction', 'propertyTaxDeduction'),
          { id: S('agi'), show: 'always' }, S('panelOther'), S('panelAdj'), S('adjustedIncome'), { id: S('baseStdDeduction'), show: 'always' },
          ...pick('itemized'), S('panelItem'), S('deduction'), ...pick('personalExemption', 'dependentExemption', 'childDeduction'), S('exemptions'),
          { id: S('taxable'), show: 'always' }] },
      { id: `calc-state-${lc}-tentative`, stepLabel: `${name} • Step 2: Tax Brackets`, title: `${code} Tax Brackets & Tentative Tax`,
        quantities: [S('bracketTax'), ...pick('stcgSurtax', 'millionaireSurtax', 'mentalHealthTax', 'propertyTaxCredit', 'fullYearTax', 'residencyIncome', 'residencyRatio'),
          { id: S('tentativeTax'), show: 'always' }] }
    ];
    blocks.push({ id: `calc-state-${lc}-local`, stepLabel: `${name} • Step 3: Local / Municipal Tax`, title: g.quantities.get(S('localTax'))!.label,
      quantities: [S('localTax')] });
    const ostc = plan.nonresidents.filter(nr => has(`ostc.${nr.toLowerCase()}`)).map(nr => S(`ostc.${nr.toLowerCase()}`));
    blocks.push({ id: `calc-state-${lc}-card`, stepLabel: `${name} • Credits, Total Tax & Net Outcome`, title: `${rule.formResident} • Bottom Line`, isOutput: true,
      quantities: [...ostc, S('otherStateCredit'), S('stateEitc'), S('exemptionCredit'), ...pick('ssCredit', 'nycSchoolTaxCredit'), S('panelCred'), S('nonrefundableCredits'), { id: S('netStateTax'), show: 'always' },
        { id: S('totalTax'), show: 'always' }, { id: S('totalWithholding'), show: 'always' }, S('refundableCredits'), { id: S('net'), show: 'always' }] });
    return blocks;
  }
  const out: BlockSpec[] = [];
  if (has('d30Tax')) {
    out.push({ id: `calc-state-${lc}-d30`, stepLabel: `${name} • Form D-30 Unincorporated Business Tax`, title: 'DC Form D-30',
      quantities: [S('d30Receipts'), S('d30Net'), S('d30SalaryAllowance'), S('d30Taxable'), S('d30Tax')] });
  }
  const py = code === plan.priorState;
  out.push({ id: `calc-state-${lc}-taxable`, stepLabel: `${name} • ${py ? 'Part-Year Resident' : 'Nonresident'} Income & Taxable Income`, title: `${code} ${py ? 'Part-Year' : 'Nonresident'} Taxable Income`,
    quantities: [S('w2Wages'), ...pick('sourcedWages', 'residentPeriodIncome'), S('documentIncome'), S('rentalNet'), { id: S('income'), show: 'always' }, S('panelOther'), S('panelAdj'), S('adjustedIncome'),
      S('incomeRatio'), S('deduction'), S('exemptions'), ...pick('taxableIfResident', 'taxIfResident'), ...(has('taxableIfResident') ? [] : [S('taxable')]), S('tentativeTax')] });
  out.push({ id: `calc-state-${lc}-card`, stepLabel: `${name} • Nonresident Return`, title: rule.formNonResident, isOutput: true,
    quantities: [S('panelCred'), { id: S('totalTax'), show: 'always' }, { id: S('totalWithholding'), show: 'always' }, { id: S('net'), show: 'always' }] });
  return out;
}

export { STATE_EITC_MULTIPLIERS };
export const stateId = sid;
export type { CoreFilingStatus };
export const normalizeStatus = normalizeFilingStatus;
