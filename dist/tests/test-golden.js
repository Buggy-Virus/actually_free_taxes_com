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
import { tokensToText } from '../graph/graph.js';
let nextId = 0;
function w2(wages, opts = {}) {
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
function ret(p) {
    nextId = 0;
    return {
        year: 2024, filingStatus: 'single', residentState: 'TX', w2s: [],
        otherIncome: { interest: 0, sources: [] }, adjustments: { studentLoan: 0, ira: 0, hsa: 0 }, dependents: { childrenCount: 0 },
        showAllArrows: true, ...p
    };
}
const src = (id, type, amount, extra = {}) => ({ id, type, payer: type, amount, ...extra });
const fed = (id) => r => r.federalEval.value(id);
const st = (code, slot) => r => r.federalEval.value(`st.${code.toLowerCase()}.${slot}`);
const CASES = [
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
        state: ret({ filingStatus: 'married_joint', w2s: [w2(150000, { employer: 'Spouse A Co' }), w2(150000, { employer: 'Spouse B Co' })] }),
        expect: [['excess SS credit', fed('fed.excessSS'), 0]],
        knownGap: 'Excess SS is computed on both spouses combined (engine claims $8,146.80)'
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
        expect: [['IL tax', st('IL', 'totalTax'), 2832.64]],
        knownGap: 'IL exemption is applied twice (rule table standard deduction + personal exemption)'
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
        expect: [['CA AGI', st('CA', 'agi'), 73000], ['CA taxable income', st('CA', 'taxable'), 67460]],
        knownGap: 'State starting point is max(state wages, AGI, federal wages), which ignores federal adjustments'
    },
    {
        name: 'Pennsylvania resident working in New Jersey — reciprocity',
        source: 'NJ-PA Reciprocal Income Tax Agreement: NJ wages of a PA resident are taxable only in PA',
        state: ret({ residentState: 'PA', w2s: [w2(70000, { state: 'NJ', stateWithheld: 1200 })] }),
        expect: [['NJ tax', st('NJ', 'totalTax'), 0], ['NJ refund', st('NJ', 'net'), 1200], ['PA tax', st('PA', 'totalTax'), 2149]]
    },
    {
        name: 'Texas resident — no state income tax',
        source: 'Texas has no personal income tax',
        state: ret({ residentState: 'TX', w2s: [w2(90000, { state: 'TX' })] }),
        expect: [['TX tax', st('TX', 'totalTax'), 0]]
    }
];
let passed = 0, gaps = 0;
const failures = [];
for (const c of CASES) {
    const r = calculateTaxes(c.state);
    const misses = c.expect.filter(([, get, want, tol]) => Math.abs(get(r) - want) > (tol ?? 0.005))
        .map(([label, get, want]) => `${label}: expected ${want}, got ${Math.round(get(r) * 100) / 100}`);
    if (c.knownGap) {
        if (misses.length === 0)
            failures.push(`"${c.name}" now passes — remove its knownGap marker (${c.knownGap})`);
        else {
            gaps++;
            console.log(`  ◌ known gap: ${c.name}\n      ${c.knownGap}\n      ${misses.join('; ')}`);
        }
    }
    else if (misses.length) {
        failures.push(`"${c.name}" (${c.source}): ${misses.join('; ')}`);
    }
    else {
        passed++;
    }
}
// Invariant on every golden return: each displayed formula line ends with its own result.
for (const c of CASES) {
    const ev = calculateTaxes(c.state).federalEval;
    for (const [id, q] of ev.graph.quantities) {
        if (q.display === 'inline')
            continue;
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
