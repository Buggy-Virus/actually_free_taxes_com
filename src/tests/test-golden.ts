/**
 * Golden returns: worked examples with outcomes computed by hand from IRS / state forms,
 * worksheets and instructions (sources cited per case).
 *
 * A case marked `knownGap` documents a rule the engine does not implement correctly yet.
 * Known gaps are reported but do not fail the build; when a gap is fixed the case starts
 * passing and the suite FAILS until the `knownGap` marker is removed — so the list stays honest.
 */

import assert from 'assert';
import { calculateTaxes } from '../tax-engine.js';
import { TaxAppState, TaxCalculationSummary, W2Data, IncomeSource, TaxYear, FilingStatus } from '../types.js';
import { tokensToText } from '../graph/graph.js';

type Getter = (r: TaxCalculationSummary) => number;
interface Golden {
  name: string;
  source: string;
  state: TaxAppState;
  expect: Array<[string, Getter, number, number?]>;
  knownGap?: string;
}

let nextId = 0;
function w2(wages: number, opts: { state?: string; stateWithheld?: number; fedWithheld?: number; ssWageBase?: number; employer?: string; localWithheld?: number; locality?: string } = {}): W2Data {
  const base = opts.ssWageBase ?? 168600;
  const ssWages = Math.min(wages, base);
  const addlMed = Math.max(0, wages - 200000) * 0.009;
  const id = nextId++;
  return {
    id, employer: opts.employer || `Employer ${id}`, ein: '',
    box1: wages, box2: opts.fedWithheld ?? 0, box3: ssWages, box4: Math.round(ssWages * 0.062 * 100) / 100,
    box5: wages, box6: Math.round((wages * 0.0145 + addlMed) * 100) / 100,
    states: opts.state ? [{ id: 0, state: opts.state, stateId: '', stateWages: wages, stateTaxWithheld: opts.stateWithheld ?? 0,
      localWages: opts.localWithheld ? wages : 0, localTaxWithheld: opts.localWithheld ?? 0, localityName: opts.locality || '' }] : []
  };
}
function ret(p: Partial<TaxAppState> & { year?: TaxYear; filingStatus?: FilingStatus }): TaxAppState {
  nextId = 0;
  return {
    year: 2024, filingStatus: 'single', residentState: 'TX', w2s: [],
    otherIncome: { interest: 0, sources: [] }, adjustments: { studentLoan: 0, ira: 0, hsa: 0 }, dependents: { childrenCount: 0 },
    showAllArrows: true, ...p
  } as TaxAppState;
}
const src = (id: number, type: IncomeSource['type'], amount: number, extra: Partial<IncomeSource> = {}): IncomeSource => ({ id, type, payer: type, amount, ...extra });

const fed = (id: string): Getter => r => r.federalEval!.value(id);
const st = (code: string, slot: string): Getter => r => r.federalEval!.value(`st.${code.toLowerCase()}.${slot}`);

const CASES: Golden[] = [
  // ---------------- Federal: brackets & the Tax Table ----------------
  {
    name: 'Single, $50,000 wages — 2024 tax from the Tax Table',
    source: '2024 Form 1040 instructions, Tax Table: taxable income under $100,000 uses the $50-row table (row $35,400–$35,450 → $4,019)',
    state: ret({ w2s: [w2(50000)] }),
    expect: [['taxable income', fed('fed.taxableIncome'), 35400], ['income tax (Line 16)', fed('fed.tax'), 4019]]
  },
  {
    name: 'Single, $150,000 wages — Tax Computation Worksheet (≥ $100,000)',
    source: '2024 Form 1040 Tax Computation Worksheet Section A: taxable $135,400 × 24% − $6,957.50 = $25,538.50',
    state: ret({ w2s: [w2(150000)] }),
    expect: [['taxable income', fed('fed.taxableIncome'), 135400], ['income tax', fed('fed.tax'), 25538.5]]
  },
  {
    name: 'MFJ, $100,000 wages, 2 children — Child Tax Credit',
    source: 'Schedule 8812: 2 × $2,000 (AGI under $400,000); Tax Table row $70,800–$70,850 → $8,035',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(100000)], dependents: { childrenCount: 2 } }),
    expect: [['taxable income', fed('fed.taxableIncome'), 70800], ['child tax credit', r => r.creditsCalc.childTaxCredit, 4000],
      ['income tax', fed('fed.tax'), 8035]]
  },
  {
    name: 'Single, $150,000 wages, 2025 — standard deduction after the 2025 reconciliation act',
    source: 'P.L. 119-21 §70102: 2025 standard deduction $15,750 single',
    state: ret({ year: 2025, w2s: [w2(150000)] }),
    expect: [['standard deduction', fed('fed.stdDeduction'), 15750], ['taxable income', fed('fed.taxableIncome'), 134250]]
  },
  {
    name: 'MFJ 2025, 1 child — $2,200 Child Tax Credit',
    source: 'P.L. 119-21 §70104: CTC $2,200 per child for 2025',
    state: ret({ year: 2025, filingStatus: 'married_joint', w2s: [w2(120000)], dependents: { childrenCount: 1 } }),
    expect: [['child tax credit', r => r.creditsCalc.childTaxCredit, 2200]]
  },
  {
    name: 'Single age 65+ — additional standard deduction',
    source: '2024 Form 1040 instructions: $14,600 + $1,950',
    state: ret({ w2s: [w2(40000)], dependents: { childrenCount: 0, age65OrBlindCount: 1 } }),
    expect: [['standard deduction', fed('fed.stdDeduction'), 16550]]
  },

  // ---------------- Federal: dependents of others, AMT, carryovers ----------------
  {
    name: 'Teen with a $5,000 summer job, claimed as a dependent',
    source: 'IRC §63(c)(5): standard deduction = greater of $1,300 or earned income + $450 = $5,450; no EITC',
    state: ret({ w2s: [w2(5000)], claimedAsDependent: true }),
    expect: [['standard deduction', fed('fed.stdDeduction'), 5450], ['EITC', fed('fed.eitc'), 0]]
  },
  {
    name: 'Dependent with $20,000 wages — limited deduction capped at the normal amount',
    source: 'IRC §63(c)(5): min($14,600, $20,000 + $450)',
    state: ret({ w2s: [w2(20000)], claimedAsDependent: true }),
    expect: [['standard deduction', fed('fed.stdDeduction'), 14600]]
  },
  {
    name: 'Standard-deduction filer with mortgage and charity entered — no AMT deduction',
    source: 'Form 6251 line 1: taxable income + standard deduction → AMTI equals AGI when not itemizing',
    state: ret({ w2s: [w2(80000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 4000, charity: 2000 } }),
    expect: [['AMTI', fed('fed.amti'), 80000]]
  },
  {
    name: 'Capital loss carryforward',
    source: 'Capital Loss Carryover Worksheet: $10,000 net loss − $3,000 allowed = $7,000 to next year',
    state: ret({ w2s: [w2(60000)], otherIncome: { interest: 0, sources: [], capitalGains: { shortTerm: -10000, longTerm: 0 } } }),
    expect: [['carryforward', fed('fed.capLossCarryforward'), 7000]]
  },
  {
    name: 'MFJ child care credit limited to the lower-earning spouse',
    source: 'Form 2441 lines 4–6: spouse earned $2,000 → eligible expenses $2,000 × 20% = $400',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(90000), { ...w2(2000), owner: 'spouse' }], dependents: { childrenCount: 1, childCareExpenses: 3000 } }),
    expect: [['earned income limit', fed('fed.careEarnedIncomeLimit'), 2000], ['child care credit', fed('fed.childCareCredit'), 400]]
  },

  // ---------------- People & dependents (records) ----------------
  {
    name: 'Dependent records — CTC under 17, ODC for an 18-year-old and a 20-year-old student, all three EITC children',
    source: 'IRC §152(c), §24(c): CTC needs age < 17 at year end; qualifying child for EITC is < 19, or < 24 and a full-time student',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(100000)], dependents: { childrenCount: 0, list: [
      { id: 1, name: 'Ann', birthYear: 2016, relationship: 'child', monthsLived: 12, hasSsn: true },
      { id: 2, name: 'Ben', birthYear: 2006, relationship: 'child', monthsLived: 12, hasSsn: true },
      { id: 3, name: 'Cara', birthYear: 2004, relationship: 'child', monthsLived: 12, student: true, hasSsn: true }] } }),
    expect: [['CTC children', fed('fed.ctcChildren'), 1], ['ODC dependents', fed('fed.odcDependents'), 2], ['EITC children', fed('fed.eitcChildren'), 3],
      ['child credits', fed('fed.childCreditsAfterPhaseout'), 3000]]
  },
  {
    name: 'Child care credit requires a qualifying person under 13',
    source: 'Form 2441 instructions: qualifying person is under 13 (or disabled); a 14-year-old does not qualify',
    state: ret({ filingStatus: 'head_of_household', w2s: [w2(40000)], dependents: { childrenCount: 0, childCareExpenses: 3000, list: [
      { id: 1, name: 'Teen', birthYear: 2010, relationship: 'child', monthsLived: 12, hasSsn: true }] } }),
    expect: [['qualifying persons', fed('fed.careQualifyingPersons'), 0], ['child care credit', fed('fed.childCareCredit'), 0]]
  },
  {
    name: 'EITC with no qualifying child — age 22 does not qualify',
    source: 'IRC §32(c)(1)(A)(ii): taxpayer without a qualifying child must be at least 25 and under 65',
    state: ret({ w2s: [w2(10000)], taxpayer: { birthYear: 2002 } }),
    expect: [['EITC', fed('fed.eitc'), 0]]
  },
  {
    name: 'EITC with no qualifying child — age 30 qualifies',
    source: '2024 EIC Table, no children, row $10,000–$10,050: $632',
    state: ret({ w2s: [w2(10000)], taxpayer: { birthYear: 1994 } }),
    expect: [['EITC', fed('fed.eitc'), 632]]
  },
  {
    name: 'Age 65+ from birth year',
    source: 'Form 1040: born before January 2, 1960 → 65 at end of 2024; $14,600 + $1,950',
    state: ret({ w2s: [w2(40000)], taxpayer: { birthYear: 1958 } }),
    expect: [['65+/blind boxes', fed('fed.age65BlindBoxes'), 1], ['standard deduction', fed('fed.stdDeduction'), 16550]]
  },
  {
    name: 'MFJ, both 65+ and spouse blind — three boxes',
    source: 'Form 1040: $29,200 + 3 × $1,550 = $33,850',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(40000)], taxpayer: { birthYear: 1955 }, spouse: { birthYear: 1956, blind: true } }),
    expect: [['65+/blind boxes', fed('fed.age65BlindBoxes'), 3], ['standard deduction', fed('fed.stdDeduction'), 33850]]
  },
  {
    name: 'Senior deduction from birth year (2025)',
    source: 'IRC §151(d)(5): $6,000 for a taxpayer 65+ with MAGI under $75,000',
    state: ret({ year: 2025, w2s: [w2(50000)], taxpayer: { birthYear: 1955 } }),
    expect: [['senior deduction', fed('fed.seniorDeduction'), 6000]]
  },
  {
    name: 'HSA catch-up from birth year',
    source: 'Form 8889: age 55+ at year end adds $1,000 → 2024 self-only $5,150',
    state: ret({ w2s: [w2(80000)], taxpayer: { birthYear: 1965 }, adjustments: { studentLoan: 0, ira: 0, hsa: 5150 } }),
    expect: [['HSA deduction', fed('fed.hsaDeduction'), 5150]]
  },

  // ---------------- Federal: refundable credits ----------------
  {
    name: 'HOH, $20,000 wages, 1 child — EITC plateau + refundable ACTC',
    source: '2024 EIC: 1 child max $4,213 (plateau $12,390–$22,720); Schedule 8812: ACTC min($1,700, 15% × ($20,000 − $2,500))',
    state: ret({ filingStatus: 'head_of_household', w2s: [w2(20000)], dependents: { childrenCount: 1 } }),
    expect: [['taxable income', fed('fed.taxableIncome'), 0], ['EITC', fed('fed.eitc'), 4213], ['ACTC', fed('fed.actc'), 1700],
      ['refundable credits', fed('fed.refundableCredits'), 5913]]
  },
  {
    name: 'Single, no children, $10,000 wages, 2025 — EITC',
    source: 'Rev. Proc. 2024-40: 2025 EITC with no qualifying children, max $649',
    state: ret({ year: 2025, w2s: [w2(10000)] }),
    expect: [['EITC', fed('fed.eitc'), 649]]
  },
  {
    name: 'Child & dependent care credit at $30,000 AGI',
    source: 'Form 2441: rate 35% − 1% per $2,000 over $15,000 → 27% × $3,000',
    state: ret({ filingStatus: 'head_of_household', w2s: [w2(30000)], dependents: { childrenCount: 1, childCareExpenses: 3000 } }),
    expect: [['child care credit', fed('fed.childCareCredit'), 810]]
  },
  {
    name: 'Child Tax Credit phaseout, MFJ AGI $420,500',
    source: 'Schedule 8812: $50 per $1,000 (or part) over $400,000 → 21 × $50 = $1,050 → $950',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(420500, { ssWageBase: 168600 })], dependents: { childrenCount: 1 } }),
    expect: [['CTC after phaseout', fed('fed.ctcAfterPhaseout'), 950]]
  },

  // ---------------- Federal: self-employment & QBI ----------------
  {
    name: 'Single, $50,000 1099-NEC — Schedule SE, ½ SE deduction, QBI',
    source: 'Schedule SE: $50,000 × 92.35% = $46,175; × 15.3% = $7,064.78; ½ = $3,532.39. Form 8995: 20% of taxable income before QBI ($31,867.61)',
    state: ret({ otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 50000)] } }),
    expect: [['SE tax', fed('fed.seTax'), 7064.78], ['½ SE tax', fed('fed.halfSeTax'), 3532.39], ['AGI', fed('fed.agi'), 46467.61],
      ['QBI deduction', fed('fed.qbi'), 6373.52]]
  },

  // ---------------- Federal: Social Security benefits ----------------
  {
    name: 'MFJ, $24,000 Social Security + $30,000 pension + $5,000 interest',
    source: 'Form 1040 Social Security Benefits Worksheet (Pub. 915): lines 1–18 → $8,550 taxable',
    state: ret({ filingStatus: 'married_joint', otherIncome: { interest: 5000, sources: [src(1, 'SSA-1099', 24000), src(2, '1099-R', 30000)] } }),
    expect: [['provisional income', fed('fed.provisionalIncome'), 47000], ['taxable Social Security', fed('fed.taxableSS'), 8550]]
  },

  // ---------------- Federal: income documents ----------------
  {
    name: '1099-R direct rollover (code G) is not taxable',
    source: 'Form 1040 line 5a/5b instructions: rollovers are reported in 5a and excluded from 5b',
    state: ret({ w2s: [w2(50000)], otherIncome: { interest: 0, sources: [src(1, '1099-R', 40000, { rollover: true, earlyDistributionPenalty: true })] } }),
    expect: [['taxable retirement income', fed('fed.retirement'), 0], ['AGI', fed('fed.agi'), 50000], ['early distribution penalty', fed('fed.earlyDistributionPenalty'), 0]]
  },
  {
    name: '1099-R uses the box 2a taxable amount',
    source: '1099-R box 2a: $20,000 gross distribution with $15,000 basis recovered → $5,000 taxable',
    state: ret({ w2s: [w2(50000)], otherIncome: { interest: 0, sources: [src(1, '1099-R', 20000, { taxableAmount: 5000 })] } }),
    expect: [['taxable retirement income', fed('fed.retirement'), 5000], ['AGI', fed('fed.agi'), 55000]]
  },
  {
    name: '1099-DIV capital gain distributions are long-term gains',
    source: 'Schedule D line 13 / QDCG worksheet: $3,000 box 2a taxed at 0% for taxable income below $47,025',
    state: ret({ w2s: [w2(30000)], otherIncome: { interest: 0, sources: [src(1, '1099-DIV', 2000, { qualifiedDividends: 2000, capitalGainDistributions: 3000 })] } }),
    expect: [['net capital gain', fed('fed.capNet'), 3000], ['total income', fed('fed.totalIncome'), 35000], ['preferential-rate tax', fed('fed.standardPrefTax'), 0]]
  },
  {
    name: 'US Treasury interest: federally taxable, state-exempt',
    source: '1099-INT box 3 is included on Form 1040 line 2b; 31 U.S.C. §3124 exempts it from state tax (Schedule CA subtraction)',
    state: ret({ residentState: 'CA', w2s: [w2(60000, { state: 'CA' })], otherIncome: { interest: 0, sources: [src(1, '1099-INT', 0, { usTreasuryInterest: 2000 })] } }),
    expect: [['federal taxable interest', fed('fed.interestTotal'), 2000], ['AGI', fed('fed.agi'), 62000], ['CA income', st('CA', 'agi'), 60000]]
  },

  {
    name: 'MFS, lived apart all year — Social Security uses the $25,000 base',
    source: 'Pub. 915: MFS who lived apart all year use $25,000/$34,000 → min($10,000, 50% × ($30,000 − $25,000)) = $2,500 (vs $17,000 if living together)',
    state: ret({ filingStatus: 'married_separate', livedApartFromSpouse: true, otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000), src(2, '1099-R', 20000)] } }),
    expect: [['taxable Social Security', fed('fed.taxableSS'), 2500]]
  },
  {
    name: 'MFS, lived with spouse — $0 base amount',
    source: 'Pub. 915: MFS living with spouse at any time: base $0 → 85% × $20,000 = $17,000',
    state: ret({ filingStatus: 'married_separate', otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000), src(2, '1099-R', 20000)] } }),
    expect: [['taxable Social Security', fed('fed.taxableSS'), 17000]]
  },

  // ---------------- Federal: capital gains ----------------
  {
    name: 'Single, $30,000 wages + $20,000 long-term gain — 0% capital gains rate',
    source: 'Qualified Dividends and Capital Gain Tax Worksheet: gain stacked $15,400–$35,400, all below $47,025',
    state: ret({ w2s: [w2(30000)], otherIncome: { interest: 0, sources: [], capitalGains: { shortTerm: 0, longTerm: 20000 } } }),
    expect: [['preferential-rate tax', fed('fed.standardPrefTax'), 0], ['ordinary taxable income', fed('fed.ordinaryTaxable'), 15400]]
  },
  {
    name: 'Single, $60,000 wages, $10,000 short-term loss — $3,000 loss limit',
    source: 'Schedule D line 21: loss limited to $3,000',
    state: ret({ w2s: [w2(60000)], otherIncome: { interest: 0, sources: [], capitalGains: { shortTerm: -10000, longTerm: 0 } } }),
    expect: [['capital loss allowed', fed('fed.capAllowed'), -3000], ['AGI', fed('fed.agi'), 57000]]
  },
  {
    name: 'Low income with unrecaptured §1250 gain — 25% is a maximum rate',
    source: 'Schedule D Tax Worksheet line 47: smaller of the worksheet result ($400 × 25% = $100) and regular tax on all income (Tax Table row $400–$425 → $41)',
    state: ret({ w2s: [w2(10000)], otherIncome: { interest: 0, sources: [], capitalGains: { shortTerm: 0, longTerm: 5000, unrecaptured1250Gain: 5000 } } }),
    expect: [['income tax', fed('fed.tax'), 41]]
  },

  // ---------------- Federal: payroll taxes & withholding credits ----------------
  {
    name: 'Single, two employers — excess Social Security credit',
    source: 'Schedule 3 line 11: $13,640 withheld − 2024 max $10,453.20 = $3,186.80',
    state: ret({ w2s: [w2(120000), w2(100000)] }),
    expect: [['excess SS credit', fed('fed.excessSS'), 3186.8]]
  },
  {
    name: 'MFJ, each spouse $150,000 from one employer — no excess Social Security',
    source: 'Schedule 3 line 11 instructions: computed separately for each spouse; neither exceeded $10,453.20',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(150000, { employer: 'Spouse A Co' }), { ...w2(150000, { employer: 'Spouse B Co' }), owner: 'spouse' }] }),
    expect: [['excess SS credit', fed('fed.excessSS'), 0]]
  },
  {
    name: 'MFJ, spouse had two employers — excess credit only for that spouse',
    source: 'Schedule 3 line 11: spouse withheld $7,440 + $6,200 = $13,640 − $10,453.20 = $3,186.80; taxpayer one employer → $0',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(150000), { ...w2(120000), owner: 'spouse' }, { ...w2(100000), owner: 'spouse' }] }),
    expect: [['excess SS credit', fed('fed.excessSS'), 3186.8]]
  },
  {
    name: 'MFJ, spouse W-2 $170,000 + taxpayer self-employed $50,000 — SE wage base is per person',
    source: 'Schedule SE line 8a counts only the self-employed person\'s own SS wages: full 12.4% applies → SE tax $7,064.78',
    state: ret({ filingStatus: 'married_joint', w2s: [{ ...w2(170000), owner: 'spouse' }], otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 50000)] } }),
    expect: [['SE tax', fed('fed.seTax'), 7064.78]]
  },
  {
    name: 'Single, $250,000 wages — Additional Medicare Tax and its withholding credit',
    source: 'Form 8959: 0.9% × $50,000 = $450 tax (line 18) and $450 employer withholding credited on Form 1040 line 25c',
    state: ret({ w2s: [w2(250000, { fedWithheld: 50000 })] }),
    expect: [['additional Medicare tax', fed('fed.additionalMedicareTax'), 450], ['total payments', fed('fed.payments'), 50450]]
  },
  {
    name: 'Single, $180,000 wages + $40,000 interest — Net Investment Income Tax',
    source: 'Form 8960: 3.8% × min($40,000 NII, $20,000 MAGI over $200,000) = $760',
    state: ret({ w2s: [w2(180000)], otherIncome: { interest: 40000, sources: [] } }),
    expect: [['NIIT', fed('fed.niit'), 760]]
  },
  {
    name: 'Single, $300,000 wages taking the standard deduction — no AMT',
    source: 'Form 6251: AMTI $300,000 − $85,700 exemption = $214,300 × 26% = $55,718 < regular tax',
    state: ret({ w2s: [w2(300000)] }),
    expect: [['AMT', fed('fed.amt'), 0]]
  },

  // ---------------- Federal: SALT cap (P.L. 119-21) ----------------
  {
    name: 'MFJ 2025, $200,000 wages, $30,000 state & local taxes — $40,000 cap',
    source: 'IRC §164(b)(6) as amended by P.L. 119-21 §70120: 2025 cap $40,000 (MAGI under $500,000)',
    state: ret({ year: 2025, filingStatus: 'married_joint', residentState: 'NJ', w2s: [w2(200000, { state: 'NJ', stateWithheld: 12000 })],
      itemizedDeductions: { medicalExpenses: 0, realEstateTax: 18000, mortgageInterest: 20000, charity: 0 } }),
    expect: [['SALT deduction', fed('fed.salt'), 30000], ['itemized deductions', fed('fed.itemized'), 50000]]
  },
  {
    name: 'MFJ 2025, $550,000 wages — SALT cap phase-down',
    source: 'IRC §164(b)(7): $40,000 − 30% × ($550,000 − $500,000) = $25,000 (floor $10,000)',
    state: ret({ year: 2025, filingStatus: 'married_joint', w2s: [w2(550000)],
      itemizedDeductions: { medicalExpenses: 0, realEstateTax: 50000, mortgageInterest: 0, charity: 0 } }),
    expect: [['SALT cap', fed('fed.saltCap'), 25000], ['SALT deduction', fed('fed.salt'), 25000]]
  },
  {
    name: 'Single 2024, $40,000 state & local taxes — $10,000 cap',
    source: 'IRC §164(b)(6): 2024 cap $10,000',
    state: ret({ w2s: [w2(300000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 40000, mortgageInterest: 0, charity: 0 } }),
    expect: [['SALT deduction', fed('fed.salt'), 10000]]
  },

  // ---------------- Federal: Schedule 1-A (P.L. 119-21, 2025–2028) ----------------
  {
    name: 'Single 2025, $60,000 wages incl. $10,000 qualified tips',
    source: 'IRC §224 (P.L. 119-21): tips deduction up to $25,000, MAGI under $150,000 → taxable $60,000 − $15,750 − $10,000 = $34,250',
    state: ret({ year: 2025, w2s: [w2(60000)], adjustments: { studentLoan: 0, ira: 0, hsa: 0, qualifiedTips: 10000 } }),
    expect: [['tips deduction', fed('fed.tipsDeduction'), 10000], ['taxable income', fed('fed.taxableIncome'), 34250]]
  },
  {
    name: 'Single 2025, MAGI $170,000 — tips deduction phase-out',
    source: 'IRC §224(b)(2): $25,000 − 10% × ($170,000 − $150,000) = $23,000',
    state: ret({ year: 2025, w2s: [w2(170000)], adjustments: { studentLoan: 0, ira: 0, hsa: 0, qualifiedTips: 30000 } }),
    expect: [['tips deduction', fed('fed.tipsDeduction'), 23000]]
  },
  {
    name: 'MFJ 2025, $30,000 overtime premium — $25,000 joint cap',
    source: 'IRC §225 (P.L. 119-21): overtime deduction up to $25,000 on a joint return (MAGI under $300,000)',
    state: ret({ year: 2025, filingStatus: 'married_joint', w2s: [w2(120000)], adjustments: { studentLoan: 0, ira: 0, hsa: 0, qualifiedOvertime: 30000 } }),
    expect: [['overtime deduction', fed('fed.overtimeDeduction'), 25000]]
  },
  {
    name: 'Single 2025, MAGI $110,000 — car loan interest phase-out',
    source: 'IRC §163(h)(4) (P.L. 119-21): $3,000 − $200 per $1,000 over $100,000 = $1,000',
    state: ret({ year: 2025, w2s: [w2(110000)], adjustments: { studentLoan: 0, ira: 0, hsa: 0, carLoanInterest: 3000 } }),
    expect: [['car loan interest deduction', fed('fed.carLoanDeduction'), 1000]]
  },
  {
    name: 'MFJ 2025, both 65+, MAGI $160,000 — senior deduction',
    source: 'IRC §151(d)(5) (P.L. 119-21): 2 × ($6,000 − 6% × ($160,000 − $150,000)) = $10,800',
    state: ret({ year: 2025, filingStatus: 'married_joint', w2s: [w2(160000)], dependents: { childrenCount: 0, seniorsCount: 2 } }),
    expect: [['senior deduction', fed('fed.seniorDeduction'), 10800]]
  },
  {
    name: 'Single 2024 — Schedule 1-A deductions do not exist before 2025',
    source: 'P.L. 119-21 deductions apply to tax years 2025–2028',
    state: ret({ w2s: [w2(60000)], adjustments: { studentLoan: 0, ira: 0, hsa: 0, qualifiedTips: 10000 }, dependents: { childrenCount: 0, seniorsCount: 1 } }),
    expect: [['Schedule 1-A total', fed('fed.sched1a'), 0], ['taxable income', fed('fed.taxableIncome'), 45400]]
  },
  {
    name: 'Single, $60,000 wages, Schedule C loss of $5,000',
    source: 'Schedule 1 line 3: a business loss offsets other income; no SE tax on a loss',
    state: ret({ w2s: [w2(60000)], otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 10000)], scheduleCExpenses: 15000 } }),
    expect: [['business profit (loss)', fed('fed.businessProfit'), -5000], ['AGI', fed('fed.agi'), 55000], ['SE tax', fed('fed.seTax'), 0]]
  },

  // ---------------- Federal: retirement & HSA limits ----------------
  {
    name: 'IRA deduction phase-out — covered by a workplace plan',
    source: 'Pub. 590-A: 2024 single covered $77,000–$87,000; MAGI $82,000 → $7,000 × (1 − 5,000/10,000) = $3,500',
    state: ret({ w2s: [{ ...w2(82000), box13Retirement: true }], adjustments: { studentLoan: 0, ira: 7000, hsa: 0 } }),
    expect: [['IRA MAGI', fed('fed.iraMagi'), 82000], ['IRA deduction', fed('fed.iraDeduction'), 3500]]
  },
  {
    name: 'IRA deduction — not covered by any plan, no phase-out',
    source: 'Pub. 590-A: full deduction when neither spouse is covered',
    state: ret({ w2s: [w2(150000)], adjustments: { studentLoan: 0, ira: 7000, hsa: 0 } }),
    expect: [['IRA deduction', fed('fed.iraDeduction'), 7000]]
  },
  {
    name: 'IRA deduction — spouse covered, taxpayer not covered',
    source: 'Pub. 590-A: 2024 $230,000–$240,000; MAGI $235,000 → $3,500',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(100000), { ...w2(135000), box13Retirement: true, owner: 'spouse' }], adjustments: { studentLoan: 0, ira: 7000, hsa: 0 } }),
    expect: [['IRA deduction', fed('fed.iraDeduction'), 3500]]
  },
  {
    name: 'HSA limit reduced by employer contributions; 6% excise on the excess',
    source: 'Form 8889: 2024 self-only $4,150 − $1,000 box 12 W = $3,150 deductible; Form 5329: 6% × $1,850 excess = $111',
    state: ret({ w2s: [{ ...w2(60000), box12aCode: 'W', box12aAmount: 1000 }], adjustments: { studentLoan: 0, ira: 0, hsa: 5000 } }),
    expect: [['HSA deduction', fed('fed.hsaDeduction'), 3150], ['excess contributions', fed('fed.hsaExcess'), 1850], ['excise', fed('fed.hsaExcise'), 111]]
  },
  {
    name: 'HSA family coverage with age-55 catch-up',
    source: 'Form 8889: 2024 family $8,300 + $1,000 catch-up = $9,300',
    state: ret({ w2s: [w2(90000)], adjustments: { studentLoan: 0, ira: 0, hsa: 9300, hsaCoverage: 'family', hsaCatchUp: true } }),
    expect: [['HSA deduction', fed('fed.hsaDeduction'), 9300], ['excess contributions', fed('fed.hsaExcess'), 0]]
  },
  {
    name: "Saver's Credit counts 401(k) deferrals (W-2 box 12 D)",
    source: 'Form 8880: $1,000 IRA + $1,500 401(k) → $2,000 cap × 50% (AGI $19,000 ≤ $23,000) = $1,000',
    state: ret({ w2s: [{ ...w2(20000), box12aCode: 'D', box12aAmount: 1500 }], adjustments: { studentLoan: 0, ira: 1000, hsa: 0 } }),
    expect: [["Saver's contributions", fed('fed.saversContributions'), 2000], ["Saver's Credit", fed('fed.saversCredit'), 1000]]
  },

  {
    name: 'Estimated tax safe harbor (Form 2210)',
    source: 'Form 2210 line 9: smaller of 90% of 2024 tax or 100% of 2023 tax ($10,000, prior AGI ≤ $150,000); $5,000 withheld → $5,000 short',
    state: ret({ w2s: [w2(100000, { fedWithheld: 5000 })], priorYearTax: 10000, priorYearAgi: 90000 }),
    expect: [['required annual payment', fed('fed.requiredAnnualPayment'), 10000], ['shortfall', fed('fed.estimatedTaxShortfall'), 5000]]
  },

  {
    name: 'W-2 box 10 dependent care benefits over $5,000 are taxable and reduce the Form 2441 limit',
    source: 'Form 2441 Part III: $6,000 benefits, $7,000 expenses → $5,000 excluded, $1,000 taxable (line 1e); $3,000 − $5,000 → no credit',
    state: ret({ filingStatus: 'head_of_household', w2s: [{ ...w2(60000), box10: 6000 }], dependents: { childrenCount: 1, childCareExpenses: 7000 } }),
    expect: [['taxable benefits', fed('fed.depCareTaxable'), 1000], ['total income', fed('fed.totalIncome'), 61000], ['child care credit', fed('fed.childCareCredit'), 0]]
  },
  {
    name: 'Form 5329 exception reduces the 10% early-distribution tax',
    source: 'Form 5329 lines 1–4: $20,000 early distribution − $8,000 meeting an exception → 10% × $12,000 = $1,200',
    state: ret({ w2s: [w2(40000)], otherIncome: { interest: 0, sources: [src(1, '1099-R', 20000, { earlyDistributionPenalty: true, penaltyExceptionAmount: 8000 })] } }),
    expect: [['early distribution tax', fed('fed.earlyDistributionPenalty'), 1200]]
  },
  {
    name: '1099-R code 1 is an early distribution subject to 10%',
    source: 'Form 5329 line 1 / 1099-R instructions box 7 code 1: $10,000 × 10% = $1,000',
    state: ret({ w2s: [w2(40000)], otherIncome: { interest: 0, sources: [src(1, '1099-R', 10000, { distributionCode: '1' })] } }),
    expect: [['taxable retirement income', fed('fed.retirement'), 10000], ['early distribution tax', fed('fed.earlyDistributionPenalty'), 1000]]
  },
  {
    name: '1099-R code 2 (exception applies) and code 7 (normal) have no additional tax',
    source: '1099-R box 7 codes 2 and 7: taxable, but not subject to the Form 5329 additional tax',
    state: ret({ w2s: [w2(40000)], otherIncome: { interest: 0, sources: [src(1, '1099-R', 10000, { distributionCode: '2', earlyDistributionPenalty: true }), src(2, '1099-R', 6000, { distributionCode: '7' })] } }),
    expect: [['taxable retirement income', fed('fed.retirement'), 16000], ['early distribution tax', fed('fed.earlyDistributionPenalty'), 0]]
  },
  {
    name: '1099-R code S: SIMPLE IRA in first 2 years is taxed at 25%',
    source: 'Form 5329 line 4 instructions: 25% instead of 10% for SIMPLE IRA distributions within 2 years — $8,000 × 25% = $2,000',
    state: ret({ w2s: [w2(40000)], otherIncome: { interest: 0, sources: [src(1, '1099-R', 8000, { distributionCode: 'S' })] } }),
    expect: [['early distribution tax', fed('fed.earlyDistributionPenalty'), 2000]]
  },
  {
    name: '1099-R code Q (qualified Roth) and code H (rollover to Roth) are not taxable',
    source: '1099-R box 7 code Q: qualified distribution from a Roth IRA; code H: direct rollover of a designated Roth account',
    state: ret({ w2s: [w2(40000)], otherIncome: { interest: 0, sources: [src(1, '1099-R', 25000, { distributionCode: 'Q' }), src(2, '1099-R', 15000, { distributionCode: 'H' })] } }),
    expect: [['taxable retirement income', fed('fed.retirement'), 0], ['AGI', fed('fed.agi'), 40000]]
  },
  {
    name: '1099-R two-character code 1B (early designated Roth) uses box 2a',
    source: '1099-R box 7 "1B": early nonqualified distribution from a designated Roth account; only box 2a earnings are taxable — 10% × $3,000',
    state: ret({ w2s: [w2(40000)], otherIncome: { interest: 0, sources: [src(1, '1099-R', 12000, { distributionCode: '1B', taxableAmount: 3000 })] } }),
    expect: [['taxable retirement income', fed('fed.retirement'), 3000], ['early distribution tax', fed('fed.earlyDistributionPenalty'), 300]]
  },
  {
    name: 'Casualty loss reduced by $100 and 10% of AGI',
    source: 'Form 4684: $12,000 − $100 − 10% × $50,000 = $6,900',
    state: ret({ w2s: [w2(50000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 0, casualtyLoss: 12000 } }),
    expect: [['casualty deduction', fed('fed.casualtyDeduction'), 6900]]
  },
  {
    name: 'Educator expenses — $300 unless both spouses are educators',
    source: 'IRC §62(a)(2)(D): $300 per eligible educator',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(80000)], adjustments: { studentLoan: 0, ira: 0, hsa: 0, educatorExpenses: 600 } }),
    expect: [['educator deduction', fed('fed.educatorDeduction'), 300]]
  },
  {
    name: 'Educator expenses — both spouses educators',
    source: 'IRC §62(a)(2)(D): 2 × $300',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(80000)], adjustments: { studentLoan: 0, ira: 0, hsa: 0, educatorExpenses: 600, bothEducators: true } }),
    expect: [['educator deduction', fed('fed.educatorDeduction'), 600]]
  },
  {
    name: 'Self-employed retirement contribution limit',
    source: 'Pub. 560: $23,000 deferral + 20% × ($50,000 − $3,532.39 ½ SE tax) = $32,293.52',
    state: ret({ otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 50000)] }, adjustments: { studentLoan: 0, ira: 0, hsa: 0, seRetirement: 40000 } }),
    expect: [['SE retirement deduction', fed('fed.seRetirementDeduction'), 32293.52]]
  },
  {
    name: 'Self-employed health insurance limited to net profit',
    source: 'Form 7206: $10,000 profit − $706.48 ½ SE tax = $9,293.52 limit',
    state: ret({ otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 10000)] }, adjustments: { studentLoan: 0, ira: 0, hsa: 0, seHealthInsurance: 12000 } }),
    expect: [['SE health deduction', fed('fed.seHealthDeduction'), 9293.52]]
  },
  {
    name: 'MFS, spouse itemizes — standard deduction not allowed',
    source: 'IRC §63(c)(6)(A): must itemize when the spouse itemizes ($3,000 mortgage interest)',
    state: ret({ filingStatus: 'married_separate', spouseItemizes: true, w2s: [w2(60000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 3000, charity: 0 } }),
    expect: [['deduction', fed('fed.deduction'), 3000]]
  },

  {
    name: 'Charitable cash gifts limited to 60% of AGI; excess carries forward',
    source: 'IRC §170(b)(1)(G), Pub. 526: $40,000 cash on $50,000 AGI → $30,000 allowed, $10,000 carryover',
    state: ret({ w2s: [w2(50000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 40000 } }),
    expect: [['charitable deduction', fed('fed.charityDeduction'), 30000], ['carryforward', fed('fed.charityCarryforward'), 10000]]
  },
  {
    name: 'Gifts of appreciated property limited to 30% of AGI',
    source: 'IRC §170(b)(1)(C): $40,000 property on $100,000 AGI → $30,000; cash $35,000 limited to 60% − $30,000 = $30,000',
    state: ret({ w2s: [w2(100000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 35000, charityNoncash: 40000 } }),
    expect: [['charitable deduction', fed('fed.charityDeduction'), 60000], ['carryforward', fed('fed.charityCarryforward'), 15000]]
  },
  {
    name: 'Mortgage interest on debt over $750,000',
    source: 'Pub. 936 Table 1: $45,000 × ($750,000 ÷ $1,000,000) = $33,750',
    state: ret({ w2s: [w2(300000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 45000, charity: 0, mortgageBalance: 1000000 } }),
    expect: [['mortgage deduction', fed('fed.mortgageDeduction'), 33750]]
  },
  {
    name: 'Mortgage grandfathered $1M limit (loan before Dec 16, 2017)',
    source: 'Pub. 936: $1,000,000 balance on a pre-12/16/2017 loan is fully deductible',
    state: ret({ w2s: [w2(300000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 45000, charity: 0, mortgageBalance: 1000000, mortgageGrandfathered: true } }),
    expect: [['mortgage deduction', fed('fed.mortgageDeduction'), 45000]]
  },
  {
    name: 'SALT: general sales tax election in a no-income-tax state',
    source: 'Schedule A line 5a (box checked for sales tax): $2,500 sales tax + $5,000 real estate',
    state: ret({ residentState: 'TX', w2s: [w2(60000, { state: 'TX' })], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 5000, mortgageInterest: 0, charity: 0, salesTax: 2500 } }),
    expect: [['SALT', fed('fed.salt'), 7500]]
  },
  {
    name: 'State tax refund taxable only to the extent of last year\'s benefit',
    source: 'State and Local Income Tax Refund Worksheet: $1,000 refund, last year itemized $600 above standard → $600 taxable; state subtracts it',
    state: ret({ residentState: 'CA', w2s: [w2(50000, { state: 'CA' })], otherIncome: { interest: 0, sources: [src(1, '1099-G', 0, { stateRefund: 1000, priorItemizedExcess: 600 })] } }),
    expect: [['taxable refund', fed('fed.taxableStateRefund'), 600], ['AGI', fed('fed.agi'), 50600], ['CA income', st('CA', 'agi'), 50000]]
  },

  // ---------------- Federal: adjustment limits ----------------
  {
    name: 'Student loan interest phaseout, single MAGI $87,500',
    source: 'Pub. 970 ch. 4: 2024 phaseout $80,000–$95,000 → $2,500 × (1 − 7,500/15,000) = $1,250',
    state: ret({ w2s: [w2(87500)], adjustments: { studentLoan: 2500, ira: 0, hsa: 0 } }),
    expect: [['adjustments', fed('fed.adjustments'), 1250]]
  },

  // ---------------- States ----------------
  {
    name: 'Pennsylvania resident, $60,000 wages — flat 3.07%',
    source: 'PA-40: 3.07% of taxable compensation, no standard deduction',
    state: ret({ residentState: 'PA', w2s: [w2(60000, { state: 'PA' })] }),
    expect: [['PA tax', st('PA', 'totalTax'), 1842]]
  },
  {
    name: 'Illinois resident, $60,000 wages — 4.95% after one $2,775 exemption',
    source: 'IL-1040 2024: ($60,000 − $2,775) × 4.95% = $2,832.64',
    state: ret({ residentState: 'IL', w2s: [w2(60000, { state: 'IL' })] }),
    expect: [['IL tax', st('IL', 'totalTax'), 2832.64]]
  },
  {
    name: 'Massachusetts resident, $60,000 wages — 5% after $4,400 exemption',
    source: 'Form 1: ($60,000 − $4,400) × 5% = $2,780',
    state: ret({ residentState: 'MA', w2s: [w2(60000, { state: 'MA' })] }),
    expect: [['MA tax', st('MA', 'totalTax'), 2780]]
  },
  {
    name: 'North Carolina resident 2025, $60,000 wages — 4.25%',
    source: 'D-400 2025: ($60,000 − $12,750) × 4.25% = $2,008.13',
    state: ret({ year: 2025, residentState: 'NC', w2s: [w2(60000, { state: 'NC' })] }),
    expect: [['NC tax', st('NC', 'totalTax'), 2008.13]]
  },
  {
    name: 'California resident, IRA deduction reduces CA income',
    source: 'Schedule CA (540): CA conforms to the federal IRA deduction → CA AGI $73,000; taxable $73,000 − $5,540',
    state: ret({ residentState: 'CA', w2s: [w2(80000, { state: 'CA' })], adjustments: { studentLoan: 0, ira: 7000, hsa: 0 } }),
    expect: [['CA AGI', st('CA', 'agi'), 73000], ['CA taxable income', st('CA', 'taxable'), 67460]]
  },
  {
    name: 'Pennsylvania resident working in New Jersey — reciprocity',
    source: 'NJ-PA Reciprocal Income Tax Agreement: NJ wages of a PA resident are taxable only in PA',
    state: ret({ residentState: 'PA', w2s: [w2(70000, { state: 'NJ', stateWithheld: 1200 })] }),
    expect: [['NJ tax', st('NJ', 'totalTax'), 0], ['NJ refund', st('NJ', 'net'), 1200], ['PA tax', st('PA', 'totalTax'), 2149]]
  },
  {
    name: 'Indiana resident, $50,000 wages — 3.05% after one $1,000 exemption',
    source: 'IT-40 2024: ($50,000 − $1,000) × 3.05% = $1,494.50 (county tax not included)',
    state: ret({ residentState: 'IN', w2s: [w2(50000, { state: 'IN' })] }),
    expect: [['IN state tax', st('IN', 'netStateTax'), 1494.5]]
  },
  {
    name: 'Michigan resident, $50,000 wages — 4.25% after $5,600 exemption',
    source: 'MI-1040 2024: ($50,000 − $5,600) × 4.25% = $1,887',
    state: ret({ residentState: 'MI', w2s: [w2(50000, { state: 'MI' })] }),
    expect: [['MI state tax', st('MI', 'netStateTax'), 1887]]
  },
  {
    name: 'Colorado resident — starts from federal taxable income',
    source: 'DR 0104 line 1: federal taxable income ($60,000 − $14,600 = $45,400)',
    state: ret({ residentState: 'CO', w2s: [w2(60000, { state: 'CO' })] }),
    expect: [['CO income', st('CO', 'agi'), 45400], ['CO taxable income', st('CO', 'taxable'), 45400]]
  },
  {
    name: 'Colorado resident 2024 — temporary 4.25% rate',
    source: 'Colorado 2024 rate reduced to 4.25% (SB24-228 TABOR mechanism): $45,400 × 4.25% = $1,929.50',
    state: ret({ residentState: 'CO', w2s: [w2(60000, { state: 'CO' })] }),
    expect: [['CO tax', st('CO', 'totalTax'), 1929.5]]
  },
  {
    name: 'New Jersey resident — IRA contributions are not deductible',
    source: 'NJ-1040 instructions: no deduction for IRA contributions; NJ income $80,000 − $1,000 exemption',
    state: ret({ residentState: 'NJ', w2s: [w2(80000, { state: 'NJ' })], adjustments: { studentLoan: 0, ira: 7000, hsa: 0 } }),
    expect: [['NJ income', st('NJ', 'agi'), 80000], ['NJ taxable income', st('NJ', 'taxable'), 79000]]
  },
  {
    name: 'Massachusetts HOH, 1 child — Child & Family Credit is refundable',
    source: 'Form 1 2024: ($30,000 − $6,800 HOH exemption − $1,000 dependent) × 5% = $1,110; $440 Child and Family Credit is refundable',
    state: ret({ filingStatus: 'head_of_household', residentState: 'MA', w2s: [w2(30000, { state: 'MA' })], dependents: { childrenCount: 1 } }),
    expect: [['MA tax before credits', st('MA', 'tentativeTax'), 1110], ['Child & Family Credit', st('MA', 'exemptionCredit'), 440],
      ['MA tax after nonrefundable credits', st('MA', 'netStateTax'), 1110]]
  },
  {
    name: 'HOH, $30,000 wages, 1 child — EITC from the EIC Table',
    source: '2024 EIC Table row $30,000–$30,050 (midpoint $30,025): $4,213 − 15.98% × ($30,025 − $22,720) = $3,046',
    state: ret({ filingStatus: 'head_of_household', w2s: [w2(30000)], dependents: { childrenCount: 1 } }),
    expect: [['EITC', fed('fed.eitc'), 3046]]
  },
  {
    name: 'Georgia resident 2025, $60,000 wages — flat 5.19%',
    source: 'GA HB 111: 2025 rate 5.19%; ($60,000 − $12,000 standard deduction) × 5.19% = $2,491.20',
    state: ret({ year: 2025, residentState: 'GA', w2s: [w2(60000, { state: 'GA' })] }),
    expect: [['GA tax', st('GA', 'totalTax'), 2491.2]]
  },
  {
    name: 'New York retiree — Social Security is exempt from NY tax',
    source: 'IT-201 line 27: taxable Social Security included in federal AGI is subtracted in full',
    state: ret({ filingStatus: 'married_joint', residentState: 'NY', otherIncome: { interest: 5000, sources: [src(1, 'SSA-1099', 24000), src(2, '1099-R', 30000)] } }),
    expect: [['taxable Social Security (federal)', fed('fed.taxableSS'), 8550], ['NY income', st('NY', 'agi'), 35000]]
  },
  {
    name: 'Illinois retiree — retirement income and Social Security are exempt',
    source: 'IL-1040 line 5: federally taxed retirement income and Social Security subtracted',
    state: ret({ filingStatus: 'married_joint', residentState: 'IL', otherIncome: { interest: 5000, sources: [src(1, 'SSA-1099', 24000), src(2, '1099-R', 30000)] } }),
    expect: [['IL income', st('IL', 'agi'), 5000]]
  },
  {
    name: 'California — unemployment compensation is exempt',
    source: 'Schedule CA (540) line 7: unemployment compensation subtracted',
    state: ret({ residentState: 'CA', w2s: [w2(30000, { state: 'CA' })], otherIncome: { interest: 0, sources: [src(1, '1099-G', 8000)] } }),
    expect: [['AGI', fed('fed.agi'), 38000], ['CA income', st('CA', 'agi'), 30000]]
  },
  {
    name: 'NJ resident working in NY — NY nonresident tax uses the IT-203 income percentage',
    source: 'IT-203: tax on all federal AGI as if a resident × (NY-source income ÷ federal AGI). AGI $100,000, NY wages $60,000 → 60% of resident tax',
    state: ret({ residentState: 'NJ', w2s: [w2(60000, { state: 'NY', stateWithheld: 3000 }), w2(40000, { state: 'NJ' })] }),
    expect: [['NY income percentage', st('NY', 'incomeRatio'), 0.6], ['NY taxable income (as resident)', st('NY', 'taxableIfResident'), 92000]]
  },
  {
    name: 'Arizona nonresident — standard deduction prorated',
    source: 'Form 140NR: standard deduction × (AZ income ÷ federal AGI); AZ wages $30,000 of $100,000 AGI → $14,600 × 30% = $4,380; ($30,000 − $4,380) × 2.5%',
    state: ret({ residentState: 'TX', w2s: [w2(30000, { state: 'AZ' }), w2(70000, { state: 'TX' })] }),
    expect: [['AZ prorated deduction', st('AZ', 'deduction'), 4380], ['AZ tax', st('AZ', 'totalTax'), 640.5]]
  },
  {
    name: 'NYC resident — NYC school tax credit',
    source: 'IT-201 line 69: $63 for single filers with income of $250,000 or less (refundable)',
    state: ret({ residentState: 'NY', w2s: [w2(60000, { state: 'NY', localWithheld: 2000, locality: 'NYC' })] }),
    expect: [['NYC school tax credit', st('NY', 'nycSchoolTaxCredit'), 63]]
  },
  {
    name: 'State estimated payments count as payments',
    source: 'Form 540 line 72 (estimated tax payments): $3,000 withheld + $1,000 estimated',
    state: ret({ residentState: 'CA', w2s: [w2(60000, { state: 'CA', stateWithheld: 3000 })],
      statePanels: [{ id: 9, state: 'CA', section: 'credits', itemKey: 'state-estimated-payments', amount: 1000 }] }),
    expect: [['CA payments', st('CA', 'totalWithholding'), 4000]]
  },
  {
    name: 'NY resident — other states\' municipal bond interest is added back',
    source: 'IT-225 A-101: $5,000 box 8 tax-exempt interest, $2,000 from NY bonds → $3,000 NY addition',
    state: ret({ residentState: 'NY', w2s: [w2(60000, { state: 'NY' })], otherIncome: { interest: 0, sources: [src(1, '1099-INT', 0, { taxExemptInterest: 5000, inStateTaxExemptInterest: 2000 })] } }),
    expect: [['AGI', fed('fed.agi'), 60000], ['NY addition', st('NY', 'muniAddBack'), 3000], ['NY income', st('NY', 'agi'), 63000]]
  },
  {
    name: 'Moved from Illinois to Pennsylvania in July — part-year returns in both states',
    source: 'IL-1040 Schedule NR: IL income $30,000 wages + 6/12 of $1,200 interest = $30,600; exemption $2,775 × 50% → ($30,600 − $1,387.50) × 4.95% = $1,446.02. PA-40: income while a PA resident $30,600 × 3.07% = $939.42',
    state: ret({ residentState: 'PA', partYear: { priorState: 'IL', moveMonth: 7 }, otherIncome: { interest: 1200, sources: [] },
      w2s: [w2(30000, { state: 'IL' }), w2(30000, { state: 'PA' })] }),
    expect: [['IL part-year income', st('IL', 'income'), 30600], ['IL tax', st('IL', 'totalTax'), 1446.02],
      ['PA residency ratio', st('PA', 'residencyRatio'), 0.5], ['PA tax', st('PA', 'totalTax'), 939.42]]
  },
  {
    name: 'Illinois nonresident — exemption prorated',
    source: 'IL-1040 Schedule NR: $2,775 × (IL income ÷ federal AGI); IL wages $20,000 of $80,000 → ($20,000 − $693.75) × 4.95% = $955.66',
    state: ret({ residentState: 'IN', w2s: [w2(20000, { state: 'IL' }), w2(60000, { state: 'IN' })] }),
    expect: [['IL exemptions', st('IL', 'exemptions'), 693.75]]
  },
  {
    name: 'Texas resident — no state income tax',
    source: 'Texas has no personal income tax',
    state: ret({ residentState: 'TX', w2s: [w2(90000, { state: 'TX' })] }),
    expect: [['TX tax', st('TX', 'totalTax'), 0]]
  },
  // ---------------- State: Social Security (C5) ----------------
  {
    name: 'CT: Social Security fully exempt below $75,000 AGI',
    source: 'CT Schedule 1 Social Security Benefit Adjustment Worksheet: AGI $67,000 < $75,000 single → subtract all $17,000 federally taxable',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'CT', w2s: [w2(50000, { state: 'CT' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['federal taxable SS', fed('fed.taxableSS'), 17000], ['CT subtraction', st('CT', 'ssSubtraction'), 17000]]
  },
  {
    name: 'CT: above the threshold, at most 25% of benefits is taxed',
    source: 'CT SS worksheet: AGI $107,000 ≥ $75,000 → $17,000 taxable − 25% × $20,000 = $12,000 subtraction',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'CT', w2s: [w2(90000, { state: 'CT' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['CT subtraction', st('CT', 'ssSubtraction'), 12000]]
  },
  {
    name: 'NM: Social Security exemption is a cliff at $100,000 single / $150,000 joint',
    source: 'NM §7-2-5.14 (2022+): single AGI $107,000 > $100,000 → no exemption',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'NM', w2s: [w2(90000, { state: 'NM' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['NM subtraction', st('NM', 'ssSubtraction'), 0]]
  },
  {
    name: 'NM: married filing jointly under $150,000 exempts all taxable benefits',
    source: 'NM §7-2-5.14: MFJ AGI $107,000 ≤ $150,000 → $17,000',
    state: ret({ year: 2024, filingStatus: 'married_joint', residentState: 'NM', w2s: [w2(90000, { state: 'NM' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['NM subtraction', st('NM', 'ssSubtraction'), 17000]]
  },
  {
    name: 'MN: subtraction falls 10% per $4,000 above the 2024 threshold',
    source: 'MN House Research (2024): single threshold $82,190; AGI $87,000 is 2 increments over → 80% × $17,000 = $13,600',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'MN', w2s: [w2(70000, { state: 'MN' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['MN subtraction', st('MN', 'ssSubtraction'), 13600]]
  },
  {
    name: 'VT: partial exemption between $50,000 and $60,000 (2024)',
    source: 'VT Dept. of Taxes worksheet: ($60,000 − $57,000) ÷ $10,000 = 30% × $17,000 = $5,100',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'VT', w2s: [w2(40000, { state: 'VT' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['VT subtraction', st('VT', 'ssSubtraction'), 5100]]
  },
  {
    name: 'VT: 2025 thresholds are $5,000 higher',
    source: 'VT Dept. of Taxes (2025): single full exemption to $55,000 — AGI $57,000 → ($65,000 − $57,000) ÷ $10,000 = 80% × $17,000 = $13,600',
    state: ret({ year: 2025, filingStatus: 'single', residentState: 'VT', w2s: [w2(40000, { state: 'VT' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['VT subtraction', st('VT', 'ssSubtraction'), 13600]]
  },
  {
    name: 'WV: above the income limits, 35% (2024) / 65% (2025) of taxable benefits is exempt',
    source: 'WV §11-21-12 as amended 2024: AGI $107,000 > $50,000 → 35% × $17,000 = $5,950',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'WV', w2s: [w2(90000, { state: 'WV' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['WV subtraction', st('WV', 'ssSubtraction'), 5950]]
  },
  {
    name: 'WV 2025: 65% of taxable benefits exempt above the limits',
    source: 'WV §11-21-12: 65% for 2025 → 65% × $17,000 = $11,050',
    state: ret({ year: 2025, filingStatus: 'single', residentState: 'WV', w2s: [w2(90000, { state: 'WV' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['WV subtraction', st('WV', 'ssSubtraction'), 11050]]
  },
  {
    name: 'CO: age 65+ subtracts all federally taxable Social Security',
    source: 'CO §39-22-104(4)(f)(III): taxpayers 65+ may subtract all federally taxable SS (age 70 in 2024)',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'CO', w2s: [w2(90000, { state: 'CO' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] }, taxpayer: { birthYear: 1954 } }),
    expect: [['CO subtraction', st('CO', 'ssSubtraction'), 17000]]
  },
  {
    name: 'CO: age 60 in 2024 gets no separate SS subtraction',
    source: 'CO §39-22-104(4)(f): the full SS subtraction for ages 55–64 starts in 2025',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'CO', w2s: [w2(90000, { state: 'CO' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] }, taxpayer: { birthYear: 1964 } }),
    expect: [['CO subtraction', st('CO', 'ssSubtraction'), 0]]
  },
  {
    name: 'CO 2025: ages 55–64 with AGI ≤ $75,000 subtract all taxable SS',
    source: 'CO HB24-1142: 2025+ full SS subtraction for ages 55–64 if AGI ≤ $75,000 single — AGI $67,000',
    state: ret({ year: 2025, filingStatus: 'single', residentState: 'CO', w2s: [w2(50000, { state: 'CO' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] }, taxpayer: { birthYear: 1965 } }),
    expect: [['CO subtraction', st('CO', 'ssSubtraction'), 17000]]
  },
  {
    name: 'UT 2025: Social Security Benefits Credit below the $90,000 joint threshold',
    source: 'TC-40 (SB 71): MFJ, UT taxable income $85,500 < $90,000 → 4.5% × $25,500 taxable SS = $1,147.50',
    state: ret({ year: 2025, filingStatus: 'married_joint', residentState: 'UT', w2s: [w2(60000, { state: 'UT' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 30000)] } }),
    expect: [['federal taxable SS', fed('fed.taxableSS'), 25500], ['UT SS credit', st('UT', 'ssCredit'), 1147.5]]
  },
  {
    name: 'UT 2024: credit phased out 25¢ per dollar above $45,000 single',
    source: 'TC-40 2024: 4.55% × $17,000 = $773.50 − 25% × ($67,000 − $45,000) → $0',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'UT', w2s: [w2(50000, { state: 'UT' })], otherIncome: { interest: 0, sources: [src(1, 'SSA-1099', 20000)] } }),
    expect: [['UT SS credit', st('UT', 'ssCredit'), 0]]
  },
  // ---------------- State: retirement income exclusions (C6) ----------------
  {
    name: 'NY: $20,000 pension exclusion for a taxpayer over 59½',
    source: 'IT-201 line 29 instructions: up to $20,000 of private pension income for those 59½ or older (age 66 in 2024)',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'NY', w2s: [w2(40000, { state: 'NY' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1958 } }),
    expect: [['NY exclusion', st('NY', 'retirementSubtraction'), 20000]]
  },
  {
    name: 'NY: no pension exclusion under 59½',
    source: 'IT-201 line 29: the exclusion starts at 59½ (age 50 in 2024)',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'NY', w2s: [w2(40000, { state: 'NY' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1974 } }),
    expect: [['NY exclusion', st('NY', 'retirementSubtraction'), 0]]
  },
  {
    name: 'NJ: full pension exclusion up to $75,000 single when gross income ≤ $100,000',
    source: 'NJ-1040 line 28a worksheet: age 62+, NJ gross income $70,000 → exclude all $30,000',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'NJ', w2s: [w2(40000, { state: 'NJ' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1958 } }),
    expect: [['NJ exclusion', st('NJ', 'retirementSubtraction'), 30000]]
  },
  {
    name: 'NJ: 37.5% of pension income excluded at $100,001–$125,000 (single)',
    source: 'NJ-1040 line 28a: gross income $110,000 single → 37.5% × $30,000 = $11,250',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'NJ', w2s: [w2(80000, { state: 'NJ' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1958 } }),
    expect: [['NJ gross income', st('NJ', 'retirementIncomeTest'), 110000], ['NJ exclusion', st('NJ', 'retirementSubtraction'), 11250]]
  },
  {
    name: 'GA: $65,000 retirement exclusion at 65+ covers pension and interest',
    source: 'GA IT-RET: 65+ exclusion up to $65,000 of retirement income incl. interest — $30,000 pension + $5,000 interest',
    state: ret({ residentState: 'GA', w2s: [w2(40000, { state: 'GA' })], taxpayer: { birthYear: 1955 }, otherIncome: { interest: 5000, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] } }),
    expect: [['GA exclusion', st('GA', 'retirementSubtraction'), 35000]]
  },
  {
    name: 'GA: $35,000 cap at ages 62–64',
    source: 'GA IT-RET: ages 62–64 up to $35,000 — $50,000 pension → $35,000',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'GA', w2s: [w2(40000, { state: 'GA' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 50000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1961 } }),
    expect: [['GA exclusion', st('GA', 'retirementSubtraction'), 35000]]
  },
  {
    name: 'SC: 65+ gets the $10,000 retirement deduction and $5,000 of the age deduction',
    source: 'SC1040 lines w/x: retirement deduction $10,000 (65+); age-65 deduction $15,000 − $10,000 = $5,000',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'SC', w2s: [w2(40000, { state: 'SC' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1955 } }),
    expect: [['SC retirement deduction', st('SC', 'retirementSubtraction'), 10000], ['SC age deduction', st('SC', 'ageDeduction'), 5000]]
  },
  {
    name: 'SC: under 65, $3,000 per person (MFJ, both with pensions pooled)',
    source: 'SC1040 line w: $3,000 each under 65 → $6,000',
    state: ret({ year: 2024, filingStatus: 'married_joint', residentState: 'SC', w2s: [w2(40000, { state: 'SC' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] } }),
    expect: [['SC retirement deduction', st('SC', 'retirementSubtraction'), 6000], ['SC age deduction', st('SC', 'ageDeduction'), 0]]
  },
  {
    name: 'CO: $24,000 pension subtraction at 65+',
    source: 'CO DR 0104AD: 65+ pension/annuity subtraction up to $24,000 — $30,000 pension',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'CO', w2s: [w2(40000, { state: 'CO' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1955 } }),
    expect: [['CO pension subtraction', st('CO', 'retirementSubtraction'), 24000]]
  },
  {
    name: 'KY: $31,110 pension exclusion per person regardless of age',
    source: 'KY Schedule P: up to $31,110 — $40,000 pension',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'KY', w2s: [w2(40000, { state: 'KY' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 40000, { distributionCode: '7' })] } }),
    expect: [['KY exclusion', st('KY', 'retirementSubtraction'), 31110]]
  },
  {
    name: 'VA: age deduction reduced dollar-for-dollar over $50,000',
    source: 'VA age deduction worksheet: $12,000 − ($55,000 AGI − $50,000) = $7,000 (age 70, born after 1/1/1939)',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'VA', w2s: [w2(25000, { state: 'VA' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1954 } }),
    expect: [['VA age deduction', st('VA', 'retirementSubtraction'), 7000]]
  },
  {
    name: 'DE: $12,500 pension exclusion at 60+',
    source: 'DE PIT-RES pension exclusion: $12,500 for age 60+',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'DE', w2s: [w2(40000, { state: 'DE' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1960 } }),
    expect: [['DE exclusion', st('DE', 'retirementSubtraction'), 12500]]
  },
  {
    name: 'IA: retirement income fully excluded at 55+',
    source: 'IA 2023+ retirement income exclusion for those 55 or older',
    state: ret({ year: 2024, filingStatus: 'single', residentState: 'IA', w2s: [w2(40000, { state: 'IA' })], otherIncome: { interest: 0, sources: [src(1, '1099-R', 30000, { distributionCode: '7' })] }, taxpayer: { birthYear: 1965 } }),
    expect: [['IA exclusion', st('IA', 'retirementSubtraction'), 30000]]
  },
  // ---------------- Federal: per-person ownership (A4) ----------------
  {
    name: "Spouse's Schedule SE uses the spouse's own wage base",
    source: "Schedule SE (one per spouse): taxpayer's W-2 at the wage base doesn't reduce the spouse's — $40,000 × 92.35% = $36,940 × 15.3% = $5,651.82",
    state: ret({ filingStatus: 'married_joint', w2s: [w2(170000)], otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 40000, { owner: 'spouse' })] } }),
    expect: [['SE tax', fed('fed.seTax'), 5651.82]]
  },
  {
    name: "The same 1099-NEC owned by the taxpayer only owes the Medicare part",
    source: 'Schedule SE line 8: the taxpayer\'s $168,600 SS wages use up the wage base → 2.9% × $36,940 = $1,071.26',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(170000)], otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 40000)] } }),
    expect: [['SE tax', fed('fed.seTax'), 1071.26]]
  },
  {
    name: 'Each spouse under $400 of SE earnings owes no SE tax',
    source: 'Schedule SE: the $400 test applies per person — $300 each',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(30000)], otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 300), src(2, '1099-NEC', 300, { owner: 'spouse' })] } }),
    expect: [['SE tax', fed('fed.seTax'), 0]]
  },
  {
    name: 'Spousal IRA: a non-working spouse gets their own limit (catch-up at 50+)',
    source: 'Pub. 590-A Kay Bailey Hutchison Spousal IRA: $7,000 + spouse age 52 $8,000 = $15,000 deduction (neither covered by a plan)',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(60000)], spouse: { birthYear: 1972 }, adjustments: { studentLoan: 0, ira: 7000, hsa: 0, spouseIra: 8000 } }),
    expect: [['IRA deduction', fed('fed.iraDeduction'), 15000]]
  },
  {
    name: "Spousal IRA: the covered taxpayer is phased out, the uncovered spouse uses the $230,000 range",
    source: 'Pub. 590-A Table 1-2 (2024): covered MFJ phase-out $123,000–$143,000 → $0; spouse not covered, MAGI $150,000 < $230,000 → $7,000',
    state: ret({ filingStatus: 'married_joint', w2s: [{ ...w2(150000), box13Retirement: true }], adjustments: { studentLoan: 0, ira: 7000, hsa: 0, spouseIra: 7000 } }),
    expect: [['IRA deduction', fed('fed.iraDeduction'), 7000]]
  },
  {
    name: 'Spousal IRA: combined contributions are limited to combined compensation',
    source: 'IRC §219(c): $10,000 compensation − $7,000 taxpayer contribution → spouse limit $3,000',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(10000)], adjustments: { studentLoan: 0, ira: 7000, hsa: 0, spouseIra: 7000 } }),
    expect: [['IRA deduction', fed('fed.iraDeduction'), 10000]]
  },
  // ---------------- Federal: home sale (B28) ----------------
  {
    name: '§121: $300,000 home gain, single — $250,000 excluded, $50,000 long-term gain',
    source: 'Pub. 523 worksheet 3: gain $300,000 − $250,000 exclusion = $50,000 taxable (Form 8949 code H)',
    state: ret({ w2s: [w2(80000)], otherIncome: { interest: 0, sources: [], capitalGains: { shortTerm: 0, longTerm: 0, homeSaleGain: 300000, homeSaleQualifies: true } } }),
    expect: [['exclusion', fed('fed.homeSaleExclusion'), 250000], ['net capital gain', fed('fed.capNet'), 50000]]
  },
  {
    name: '§121: joint return where both spouses meet the use test excludes up to $500,000',
    source: 'Pub. 523: MFJ, both lived there 2 of 5 years — $420,000 gain fully excluded',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(80000)], otherIncome: { interest: 0, sources: [], capitalGains: { shortTerm: 0, longTerm: 0, homeSaleGain: 420000, homeSaleQualifies: true, homeSaleSpouseQualifies: true } } }),
    expect: [['exclusion', fed('fed.homeSaleExclusion'), 420000], ['AGI', fed('fed.agi'), 80000]]
  },
  {
    name: '§121: joint return, only one spouse meets the use test — $250,000 limit',
    source: 'Pub. 523 "Married persons": if only one spouse meets the use test, the maximum exclusion is $250,000',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(80000)], otherIncome: { interest: 0, sources: [], capitalGains: { shortTerm: 0, longTerm: 0, homeSaleGain: 420000, homeSaleQualifies: true } } }),
    expect: [['exclusion', fed('fed.homeSaleExclusion'), 250000], ['taxable gain', fed('fed.homeSaleTaxableGain'), 170000]]
  },
  {
    name: '§121: without the 2-of-5-year test, the whole gain is taxable',
    source: 'IRC §121(a): ownership and use for 2 of the 5 years before the sale (partial exclusions not modeled)',
    state: ret({ w2s: [w2(80000)], otherIncome: { interest: 0, sources: [], capitalGains: { shortTerm: 0, longTerm: 0, homeSaleGain: 60000 } } }),
    expect: [['exclusion', fed('fed.homeSaleExclusion'), 0], ['net capital gain', fed('fed.capNet'), 60000]]
  },
  // ---------------- Federal: adoption credit (B33) ----------------
  {
    name: 'Adoption credit phase-out: MAGI $10,000 over the 2024 start keeps 75%',
    source: 'Form 8839 lines 7–12 (2024): ($262,150 − $252,150) ÷ $40,000 = 0.25 → $16,810 × 0.75 = $12,607.50',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(262150)], dependents: { childrenCount: 0, adoptionCredit: 20000 } }),
    expect: [['adoption credit', fed('fed.adoptionAllowed'), 12607.5], ['refundable part (2024)', fed('fed.adoptionRefundable'), 0]]
  },
  {
    name: 'Adoption credit fully phased out at the top of the range',
    source: 'Form 8839 (2024): MAGI $292,150 or more → $0',
    state: ret({ filingStatus: 'married_joint', w2s: [w2(300000)], dependents: { childrenCount: 0, adoptionCredit: 20000 } }),
    expect: [['adoption credit', fed('fed.adoptionAllowed'), 0]]
  },
  {
    name: '2025: up to $5,000 of the adoption credit is refundable',
    source: 'P.L. 119-21 §70402; 2025 limit $17,280 — $40,000 wages, $17,280 credit: $5,000 refundable, $12,280 nonrefundable (limited by tax)',
    state: ret({ year: 2025, w2s: [w2(40000)], dependents: { childrenCount: 0, adoptionCredit: 25000 } }),
    expect: [['adoption credit', fed('fed.adoptionAllowed'), 17280], ['refundable part', fed('fed.adoptionRefundable'), 5000], ['nonrefundable part', fed('fed.adoptionCredit'), 12280]]
  },
  // ---------------- Federal: Schedule R (B34) ----------------
  {
    name: 'Schedule R: single age 70, $10,000 pension, no Social Security',
    source: 'Schedule R Part III: $5,000 − ½ × ($10,000 − $7,500) = $3,750 × 15% = $562.50',
    state: ret({ taxpayer: { birthYear: 1954 }, otherIncome: { interest: 0, sources: [src(1, '1099-R', 10000, { distributionCode: '7' })] } }),
    expect: [['Schedule R credit', fed('fed.elderlyCredit'), 562.5]]
  },
  {
    name: 'Schedule R: MFJ both 65+, nontaxable Social Security reduces the $7,500',
    source: 'Schedule R: $7,500 − $4,000 nontaxable SS − ½ × ($12,000 − $10,000) = $2,500 × 15% = $375',
    state: ret({ filingStatus: 'married_joint', taxpayer: { birthYear: 1950 }, spouse: { birthYear: 1952 }, otherIncome: { interest: 0, sources: [src(1, '1099-R', 12000, { distributionCode: '7' }), src(2, 'SSA-1099', 4000)] } }),
    expect: [['taxable SS', fed('fed.taxableSS'), 0], ['Schedule R credit', fed('fed.elderlyCredit'), 375]]
  },
  {
    name: 'Schedule R: married filing separately while living together gets no credit',
    source: 'Schedule R instructions: MFS filers qualify only if they lived apart all year',
    state: ret({ filingStatus: 'married_separate', taxpayer: { birthYear: 1950 }, otherIncome: { interest: 0, sources: [src(1, '1099-R', 6000, { distributionCode: '7' })] } }),
    expect: [['Schedule R credit', fed('fed.elderlyCredit'), 0]]
  },
  // ---------------- Federal: Schedule H (B36) ----------------
  {
    name: 'Schedule H: $20,000 nanny wages — 15.3% FICA and 0.6% FUTA on $7,000',
    source: 'Schedule H (2024): $20,000 ≥ $2,700 → 15.3% × $20,000 = $3,060; FUTA 0.6% × $7,000 = $42; total $3,102',
    state: ret({ w2s: [w2(90000)], dependents: { childrenCount: 0, householdWages: 20000 } }),
    expect: [['FICA', fed('fed.householdFica'), 3060], ['FUTA', fed('fed.householdFuta'), 42], ['household tax', fed('fed.householdTax'), 3102]]
  },
  {
    name: 'Schedule H: wages under the FICA threshold still owe FUTA if $1,000+ in a quarter',
    source: 'Schedule H (2024): $2,500 < $2,700 → no FICA; FUTA 0.6% × $2,500 = $15',
    state: ret({ w2s: [w2(90000)], dependents: { childrenCount: 0, householdWages: 2500 } }),
    expect: [['household tax', fed('fed.householdTax'), 15]]
  },
  {
    name: 'Schedule H 2025: FICA threshold is $2,800',
    source: 'SSA 2025 domestic employee coverage threshold $2,800: $2,750 → FUTA only, $16.50',
    state: ret({ year: 2025, w2s: [w2(90000)], dependents: { childrenCount: 0, householdWages: 2750 } }),
    expect: [['household tax', fed('fed.householdTax'), 16.5]]
  },
  // ---------------- Federal: foreign tax credit (B31) ----------------
  {
    name: 'Foreign tax credit: $250 of foreign tax is allowed in full without Form 1116',
    source: 'Form 1116 instructions, "Exemption from filing Form 1116": $300 or less ($600 joint) of passive foreign taxes',
    state: ret({ w2s: [w2(80000)], dependents: { childrenCount: 0, foreignTaxCredit: 250 } }),
    expect: [['foreign tax credit', fed('fed.foreignTaxCreditAllowed'), 250]]
  },
  {
    name: 'Foreign tax credit limited to tax x foreign income / taxable income',
    source: 'Form 1116 Part III: $65,400 taxable, $6,540 foreign income (10%) -> Tax Table $9,447 x 10% = $944.70 (of $5,000 paid)',
    state: ret({ w2s: [w2(80000)], dependents: { childrenCount: 0, foreignTaxCredit: 5000, foreignSourceIncome: 6540 } }),
    expect: [['taxable income', fed('fed.taxableIncome'), 65400], ['income tax', fed('fed.tax'), 9447], ['foreign tax credit', fed('fed.foreignTaxCreditAllowed'), 944.7]]
  },
  // ---------------- Federal: tax year 2026 (A3, B9–B13) ----------------
  {
    name: '2026: single, $60,000 wages — Rev. Proc. 2025-32 brackets and $16,100 standard deduction',
    source: 'Rev. Proc. 2025-32 §4.01 Table 3 / §4.14: taxable $43,900, Tax Table row midpoint $43,925 → $1,240 + 12% × $31,525 = $5,023',
    state: ret({ year: 2026, w2s: [w2(60000, { ssWageBase: 184500 })] }),
    expect: [['standard deduction', fed('fed.stdDeduction'), 16100], ['taxable income', fed('fed.taxableIncome'), 43900], ['income tax', fed('fed.tax'), 5023]]
  },
  {
    name: '2026: MFJ, $150,000 wages, 2 children — $2,200 Child Tax Credit',
    source: 'Rev. Proc. 2025-32 §4.01 Table 1 / §4.05: taxable $117,800 → $11,600 + 22% × $17,000 = $15,340; CTC 2 × $2,200',
    state: ret({ year: 2026, filingStatus: 'married_joint', w2s: [w2(150000, { ssWageBase: 184500 })], dependents: { childrenCount: 2 } }),
    expect: [['taxable income', fed('fed.taxableIncome'), 117800], ['income tax', fed('fed.tax'), 15340], ['child tax credit', r => r.creditsCalc.childTaxCredit, 4400]]
  },
  {
    name: '2026: non-itemizer charitable deduction capped at $1,000 single',
    source: 'IRC §170(p) (P.L. 119-21 §70424): $1,500 cash gifts → $1,000; taxable $42,900 → row $42,925 → $4,903',
    state: ret({ year: 2026, w2s: [w2(60000, { ssWageBase: 184500 })], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 1500 } }),
    expect: [['non-itemizer charity', fed('fed.nonItemizerCharity'), 1000], ['taxable income', fed('fed.taxableIncome'), 42900], ['income tax', fed('fed.tax'), 4903]]
  },
  {
    name: '2026: itemized charity counts only above 0.5% of AGI',
    source: 'IRC §170(b)(1)(I) (P.L. 119-21 §70425): $10,000 gifts − 0.5% × $200,000 = $9,000',
    state: ret({ year: 2026, w2s: [w2(200000, { ssWageBase: 184500 })], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 20000, charity: 10000 } }),
    expect: [['charity deduction', fed('fed.charityDeduction'), 9000], ['itemized deductions', fed('fed.itemized'), 29000]]
  },
  {
    name: '2026: 2/37 limitation on itemized deductions in the 37% bracket',
    source: 'IRC §68 (P.L. 119-21 §70111): min($30,000, $800,000 − $640,600) × 2/37 = $1,621.62',
    state: ret({ year: 2026, w2s: [w2(800000, { ssWageBase: 184500 })], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 30000, charity: 0 } }),
    expect: [['limitation', fed('fed.itemizedLimitation'), 1621.62], ['itemized deductions', fed('fed.itemized'), 28378.38]]
  },
  {
    name: '2026: dependent care credit rate starts at 50%',
    source: 'IRC §21(a)(2) (P.L. 119-21 §70405): MFJ AGI $25,000 → 50% − 5 points = 45% × $6,000 = $2,700',
    state: ret({ year: 2026, filingStatus: 'married_joint', w2s: [w2(12500), { ...w2(12500), owner: 'spouse' }], dependents: { childrenCount: 2, childCareExpenses: 6000 } }),
    expect: [['care rate', fed('fed.careRate'), 0.45], ['credit before tax limit', fed('fed.childCareCredit'), 2700]]
  },
  {
    name: '2026: dependent care rate falls below 35% above $75,000 single',
    source: 'IRC §21(a)(2): AGI $90,000 → 35% − ceil($15,000 ÷ $2,000) = 8 points → 27% × $3,000 = $810',
    state: ret({ year: 2026, filingStatus: 'head_of_household', w2s: [w2(90000)], dependents: { childrenCount: 1, childCareExpenses: 3000 } }),
    expect: [['care rate', fed('fed.careRate'), 0.27], ['credit', fed('fed.childCareCredit'), 810]]
  },
  {
    name: '2026: only 90% of gambling losses are deductible',
    source: 'IRC §165(d) (P.L. 119-21 §70114): $10,000 winnings, $10,000 losses → $9,000',
    state: ret({ year: 2026, w2s: [w2(80000)], otherIncome: { interest: 0, sources: [src(1, 'W-2G', 10000)] }, itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 0, gamblingLosses: 10000 } }),
    expect: [['gambling loss deduction', fed('fed.gamblingLossDeduction'), 9000]]
  },
  {
    name: '2026: AMT exemption phases out at 50% above $500,000',
    source: 'Rev. Proc. 2025-32 §4.10 / IRC §55(d)(3): $90,100 − 50% × ($600,000 − $500,000) = $40,100',
    state: ret({ year: 2026, w2s: [w2(600000, { ssWageBase: 184500 })] }),
    expect: [['AMT exemption', fed('fed.amtExemptionAllowed'), 40100]]
  },
  {
    name: '2026: $400 minimum QBI deduction with $1,000+ of QBI',
    source: 'IRC §199A(i) (P.L. 119-21 §70105): $1,200 net profit → 20% of QBI ≈ $223, raised to $400',
    state: ret({ year: 2026, w2s: [w2(50000)], otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 1200)] } }),
    expect: [['QBI deduction', fed('fed.qbi'), 400]]
  },
  {
    name: '2026: EITC maximum with one child',
    source: 'Rev. Proc. 2025-32 §4.06: earned income $15,000 ≥ $13,020 and below the $23,890 phase-out → $4,427',
    state: ret({ year: 2026, filingStatus: 'head_of_household', w2s: [w2(15000)], dependents: { childrenCount: 1 } }),
    expect: [['EITC', fed('fed.eitc'), 4427]]
  },
  {
    name: '2026: SALT cap rises to $40,400',
    source: 'IRC §164(b)(6) (P.L. 119-21 §70120): 101% of $40,000 for 2026',
    state: ret({ year: 2026, w2s: [w2(100000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 50000, mortgageInterest: 0, charity: 0 } }),
    expect: [['SALT deduction', fed('fed.salt'), 40400]]
  },
  {
    name: '2026: Social Security wage base $184,500',
    source: 'SSA 2026 contribution and benefit base: SE earnings $100,000 × 92.35% with $150,000 W-2 SS wages → 12.4% × $34,500 + 2.9% × $92,350',
    state: ret({ year: 2026, w2s: [w2(150000, { ssWageBase: 184500 })], otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 100000)] } }),
    expect: [['SE Social Security tax', fed('fed.seSsTax'), 4278], ['SE Medicare tax', fed('fed.seMedTax'), 2678.15]]
  },
  // ---------------- Federal: businesses (B20) ----------------
  {
    name: 'Schedule C: expense categories, 50% meals, standard mileage and simplified home office',
    source: 'Schedule C (2024): $50,000 − $5,000 supplies − 50% × $2,000 meals − 10,000 mi × $0.67 − 200 sq ft × $5 = $36,300',
    state: ret({ businesses: [{ id: 1, name: 'Studio', receipts: 50000, supplies: 5000, meals: 2000, vehicleMiles: 10000, homeOfficeSqFt: 200 }] }),
    expect: [['business expenses', fed('fed.bizExpenses'), 12700], ['home office', fed('fed.homeOffice'), 1000], ['net profit', fed('fed.businessProfit'), 36300]]
  },
  {
    name: 'Simplified home office cannot create a loss',
    source: 'Rev. Proc. 2013-13 §4.03: limited to gross income less other business expenses — $3,000 − $2,500 = $500 (of $1,500)',
    state: ret({ businesses: [{ id: 1, name: 'Side', receipts: 3000, otherExpenses: 2500, homeOfficeSqFt: 300 }] }),
    expect: [['home office', fed('fed.homeOffice'), 500], ['net profit', fed('fed.businessProfit'), 0]]
  },
  {
    name: "Spouse's own business gets its own Schedule SE",
    source: 'Schedule SE per spouse: $30,000 and $10,000 profits → 92.35% each → 12.4% × $36,940 + 2.9% × $36,940 = $5,651.82',
    state: ret({ filingStatus: 'married_joint', businesses: [{ id: 1, name: 'A', receipts: 30000 }, { id: 2, name: 'B', owner: 'spouse', receipts: 10000 }] }),
    expect: [["spouse's SE earnings", fed('fed.spouseSeEarnings'), 9235], ['SE tax', fed('fed.seTax'), 5651.82]]
  },
  // ---------------- Federal: Form 8949 (B21) ----------------
  {
    name: 'Form 8949 sales flow to Schedule D, wash-sale loss disallowed',
    source: 'Form 8949: ST $10,000 − $12,000 = −$2,000; ST $5,000 − $7,000 + $2,000 code W = $0; LT $20,000 − $5,000 = $15,000 → net $13,000',
    state: ret({ w2s: [w2(60000)], capitalTransactions: [
      { id: 1, description: 'A', term: 'short', proceeds: 10000, basis: 12000 },
      { id: 2, description: 'B', term: 'short', proceeds: 5000, basis: 7000, adjustment: 2000 },
      { id: 3, description: 'C', term: 'long', proceeds: 20000, basis: 5000 }] }),
    expect: [['short-term', fed('fed.txShortTerm'), -2000], ['long-term', fed('fed.txLongTerm'), 15000], ['net capital gain', fed('fed.capNet'), 13000]]
  },
  {
    name: 'Long-term capital loss carryover reduces long-term gain',
    source: 'Schedule D line 14: $10,000 LT gain − $4,000 LT carryover = $6,000',
    state: ret({ w2s: [w2(60000)], capitalTransactions: [{ id: 1, description: 'X', term: 'long', proceeds: 15000, basis: 5000 }], carryovers: { longTermCapitalLoss: 4000 } }),
    expect: [['long-term gain', fed('fed.longTermGain'), 6000], ['net LTCG', fed('fed.netLtcg'), 6000]]
  },
  // ---------------- Federal: Premium Tax Credit (B22) ----------------
  {
    name: 'Form 8962 (2024): household income 205% of poverty line',
    source: 'Form 8962: $30,000 ÷ $14,580 = 205% → applicable figure 0.0220 → $660; min($6,000, $5,000 − $660) = $4,340 − $4,000 APTC = $340 net PTC',
    state: ret({ w2s: [w2(30000)], marketplacePolicies: [{ id: 1, premiums: 6000, slcsp: 5000, advancePtc: 4000 }] }),
    expect: [['FPL %', fed('fed.ptcFplPercent'), 205], ['applicable figure', fed('fed.ptcApplicableFigure'), 0.022], ['PTC', fed('fed.ptcAllowed'), 4340], ['net PTC', fed('fed.netPtc'), 340]]
  },
  {
    name: 'Form 8962 (2024): excess advance PTC repayment is capped',
    source: 'Form 8962 Table 5 (2024): $40,000 → 274%, figure 0.0496, PTC $3,016; $5,000 APTC → $1,984 excess, single cap $950',
    state: ret({ w2s: [w2(40000)], marketplacePolicies: [{ id: 1, premiums: 6000, slcsp: 5000, advancePtc: 5000 }] }),
    expect: [['applicable figure', fed('fed.ptcApplicableFigure'), 0.0496], ['PTC', fed('fed.ptcAllowed'), 3016], ['repayment', fed('fed.excessAptcRepayment'), 950]]
  },
  {
    name: 'Form 8962 (2026): Rev. Proc. 2025-25 table and no repayment cap',
    source: 'Rev. Proc. 2025-25: $40,000 ÷ $15,650 = 255% → 8.44% + 5/50 × 1.52% = 0.0859 → $3,436; PTC $1,564; full $3,436 excess repaid',
    state: ret({ year: 2026, w2s: [w2(40000)], marketplacePolicies: [{ id: 1, premiums: 6000, slcsp: 5000, advancePtc: 5000 }] }),
    expect: [['applicable figure', fed('fed.ptcApplicableFigure'), 0.0859], ['PTC', fed('fed.ptcAllowed'), 1564], ['repayment', fed('fed.excessAptcRepayment'), 3436]]
  },
  {
    name: 'Form 8962 (2026): no credit above 400% of the poverty line',
    source: '§36B(c)(1)(A) after the enhanced credit expired: $70,000 = 447% → $0; all $2,000 APTC repaid',
    state: ret({ year: 2026, w2s: [w2(70000)], marketplacePolicies: [{ id: 1, premiums: 8000, slcsp: 7000, advancePtc: 2000 }] }),
    expect: [['PTC', fed('fed.ptcAllowed'), 0], ['repayment', fed('fed.excessAptcRepayment'), 2000]]
  },
  // ---------------- Federal: Schedule K-1 boxes (B23) ----------------
  {
    name: 'K-1 boxes flow to their own lines',
    source: 'Schedule K-1 (1065): box 1 $20,000 → Sch. E; box 5 $1,000 → interest; box 6a/6b $500 → dividends; box 9a $3,000 → Sch. D',
    state: ret({ w2s: [w2(50000)], otherIncome: { interest: 0, sources: [src(1, 'Schedule K-1', 20000, { k1Interest: 1000, k1Dividends: 500, k1QualifiedDividends: 500, k1LongTermGain: 3000 })] } }),
    expect: [['K-1 income', fed('fed.k1Income'), 20000], ['interest', fed('fed.interestTotal'), 1000], ['qualified dividends', fed('fed.qualifiedDividends'), 500], ['net capital gain', fed('fed.capNet'), 3000]]
  },
  {
    name: 'Passive K-1 loss is suspended without passive income',
    source: 'Form 8582: a $10,000 passive loss with no passive income is not allowed this year',
    state: ret({ w2s: [w2(50000)], otherIncome: { interest: 0, sources: [src(1, 'Schedule K-1', -10000, { passive: true })] } }),
    expect: [['K-1 income', fed('fed.k1Income'), 0], ['AGI', fed('fed.agi'), 50000]]
  },
  {
    name: 'Guaranteed payments are SE income but not QBI',
    source: 'K-1 box 4 $40,000 / box 14A $40,000: SE tax 15.3% × $36,940 = $5,651.82; §199A(c)(4) excludes guaranteed payments',
    state: ret({ otherIncome: { interest: 0, sources: [src(1, 'Schedule K-1', 0, { k1Guaranteed: 40000, k1SeEarnings: 40000 })] } }),
    expect: [['K-1 income', fed('fed.k1Income'), 40000], ['SE tax', fed('fed.seTax'), 5651.82], ['QBI deduction', fed('fed.qbi'), 0]]
  },
  // ---------------- Federal: rental properties (B24) ----------------
  {
    name: 'Rental depreciation: 27.5-year straight line',
    source: 'Pub. 527 Table 2-2d: $275,000 basis placed in service 2020 → $10,000 a year; $24,000 − $8,000 − $10,000 = $6,000',
    state: ret({ w2s: [w2(60000)], rentalProperties: [{ id: 1, name: 'Duplex', rents: 24000, expenses: 8000, buildingBasis: 275000, placedInServiceYear: 2020, placedInServiceMonth: 3 }] }),
    expect: [['depreciation', fed('fed.rentalPropertiesDepreciation'), 10000], ['net rental', fed('fed.rentalPropertiesNet'), 6000]]
  },
  {
    name: 'Rental depreciation: first year uses the mid-month convention',
    source: 'Pub. 527 Table 2-2d: placed in service July → 5.5 months ÷ 12 × $10,000 = $4,583.33',
    state: ret({ w2s: [w2(60000)], rentalProperties: [{ id: 1, name: 'Condo', rents: 0, expenses: 0, buildingBasis: 275000, placedInServiceYear: 2024, placedInServiceMonth: 7 }] }),
    expect: [['depreciation', fed('fed.rentalPropertiesDepreciation'), 4583.33]]
  },
  {
    name: 'Vacation home: expenses allocated by rental days, no loss',
    source: 'IRC §280A(c)(5) / Pub. 527 ch. 5: 30 personal days > 14 → $12,000 × 100/130 = $9,230.77; $10,000 − $9,230.77 = $769.23',
    state: ret({ w2s: [w2(60000)], rentalProperties: [{ id: 1, name: 'Cabin', rents: 10000, expenses: 9000, depreciation: 3000, rentalDays: 100, personalDays: 30 }] }),
    expect: [['net rental', fed('fed.rentalPropertiesNet'), 769.23]]
  },
  {
    name: 'Home rented under 15 days: rent is not reported',
    source: 'IRC §280A(g): rented fewer than 15 days → income excluded and no expenses deducted',
    state: ret({ w2s: [w2(60000)], rentalProperties: [{ id: 1, name: 'Home', rents: 5000, expenses: 500, rentalDays: 10, personalDays: 200 }] }),
    expect: [['net rental', fed('fed.rentalPropertiesNet'), 0], ['AGI', fed('fed.agi'), 60000]]
  },
  // ---------------- Federal: carryovers (A5) ----------------
  {
    name: 'Prior-year unallowed passive loss reduces rental income',
    source: 'Form 8582: $8,000 net rental income − $5,000 prior-year unallowed loss = $3,000',
    state: ret({ w2s: [w2(60000)], rentalProperties: [{ id: 1, name: 'R', rents: 20000, expenses: 10000, depreciation: 2000 }], carryovers: { passiveLoss: 5000 } }),
    expect: [['rental income', fed('fed.rentalAllowed'), 3000]]
  },
  {
    name: 'Charitable contribution carryover is deducted with current gifts',
    source: 'Pub. 526: $2,000 current + $5,000 carryover, under 60% of AGI → $7,000',
    state: ret({ w2s: [w2(100000)], itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 20000, charity: 2000 }, carryovers: { charity: 5000 } }),
    expect: [['charity deduction', fed('fed.charityDeduction'), 7000]]
  },
  {
    name: 'Post-2017 NOL deduction limited to 80% of taxable income',
    source: 'IRC §172(a)(2): $100,000 NOL; 80% × ($50,000 − $14,600) = $28,320 → AGI $21,680',
    state: ret({ w2s: [w2(50000)], carryovers: { nol: 100000 } }),
    expect: [['NOL deduction', fed('fed.nolDeduction'), 28320], ['AGI', fed('fed.agi'), 21680]]
  },
  {
    name: 'Form 8801 minimum tax credit used against regular tax above tentative minimum tax',
    source: 'Form 8801: regular tax far above TMT ($3,718) → full $3,000 credit',
    state: ret({ w2s: [w2(100000)], carryovers: { amtCredit: 3000 } }),
    expect: [['AMT credit', fed('fed.amtCredit'), 3000]]
  },
  {
    name: 'Qualified business loss carryforward reduces QBI',
    source: 'Form 8995 line 3: $10,000 profit − ½ SE tax − $20,000 carryforward → QBI $0',
    state: ret({ w2s: [w2(40000)], otherIncome: { interest: 0, sources: [src(1, '1099-NEC', 10000)] }, carryovers: { qbiLoss: 20000 } }),
    expect: [['QBI deduction', fed('fed.qbi'), 0]]
  },
  // ---------------- State: year-specific rate tables (C2) ----------------
  {
    name: 'NY 2026: lower middle-class rates',
    source: 'NY Tax Law §601 as amended (FY2026 budget) / Tax Foundation 2026 table: $92,000 taxable → 3.9%/4.4%/5.15%/5.4%/5.9% = $4,859.75',
    state: ret({ year: 2026, residentState: 'NY', w2s: [w2(100000, { state: 'NY', ssWageBase: 184500 })] }),
    expect: [['NY taxable', st('NY', 'taxable'), 92000], ['NY tax', st('NY', 'bracketTax'), 4859.75]]
  },
  {
    name: 'NC 2026: 3.99% flat rate',
    source: 'N.C.G.S. §105-153.7 schedule / Tax Foundation 2026 table: ($52,750 − $12,750) × 3.99% = $1,596',
    state: ret({ year: 2026, residentState: 'NC', w2s: [w2(52750, { state: 'NC' })] }),
    expect: [['NC tax', st('NC', 'bracketTax'), 1596]]
  },
  {
    name: 'MS 2026: 4% above $10,000',
    source: 'Miss. Code §27-7-5 (HB 1 of 2025) / Tax Foundation 2026 table: $30,000 − $2,300 − $6,000 = $21,700 → 4% × $11,700 = $468',
    state: ret({ year: 2026, residentState: 'MS', w2s: [w2(30000, { state: 'MS' })] }),
    expect: [['MS tax', st('MS', 'bracketTax'), 468]]
  },
  {
    name: 'GA 2025: 5.19% (HB 111, retroactive to January 1, 2025)',
    source: 'O.C.G.A. §48-7-20 as amended by HB 111: ($50,000 − $12,000) × 5.19% = $1,972.20',
    state: ret({ year: 2025, residentState: 'GA', w2s: [w2(50000, { state: 'GA' })] }),
    expect: [['GA tax', st('GA', 'bracketTax'), 1972.2]]
  },
];

let passed = 0, gaps = 0;
const failures: string[] = [];
for (const c of CASES) {
  const r = calculateTaxes(c.state);
  const misses = c.expect.filter(([, get, want, tol]) => Math.abs(get(r) - want) > (tol ?? 0.005))
    .map(([label, get, want]) => `${label}: expected ${want}, got ${Math.round(get(r) * 100) / 100}`);
  if (c.knownGap) {
    if (misses.length === 0) failures.push(`"${c.name}" now passes — remove its knownGap marker (${c.knownGap})`);
    else { gaps++; console.log(`  ◌ known gap: ${c.name}\n      ${c.knownGap}\n      ${misses.join('; ')}`); }
  } else if (misses.length) {
    failures.push(`"${c.name}" (${c.source}): ${misses.join('; ')}`);
  } else {
    passed++;
  }
}

// Invariant on every golden return: each displayed formula line ends with its own result.
for (const c of CASES) {
  const ev = calculateTaxes(c.state).federalEval!;
  for (const [id, q] of ev.graph.quantities) {
    if (q.display === 'inline') continue;
    const lines = ev.lines(id);
    const main = lines[lines.length - 1];
    assert.ok(tokensToText(main.pluggedTokens).endsWith(main.resultFormatted), `${c.name}: ${id} formula shows its result`);
  }
}

if (failures.length) {
  failures.forEach(f => console.error(`  ✗ ${f}`));
  throw new Error(`${failures.length} golden case(s) failed`);
}
console.log(`✓ Golden returns: ${passed} IRS/state worked examples match; ${gaps} known gaps tracked`);
